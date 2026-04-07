import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import {
  hashPassword,
  verifyPassword,
  generatePasswordResetToken,
  hashResetToken,
  validatePasswordStrength,
} from "./_core/password";
import { sendPasswordResetEmail } from "./_core/email";
import { ENV } from "./_core/env";
import { createAuthToken } from "./_core/authToken";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION_MINUTES = 15;

export const authRouter = router({
  // LOGIN COM SENHA
  bootstrapAdminPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email("Informe um e-mail válido."),
        cpf: z.string().min(11, "Informe o CPF."),
        newPassword: z.string().min(1, "Informe a nova senha."),
      })
    )
    .mutation(async ({ input }) => {
      throw new TRPCError({
  code: "FORBIDDEN",
  message: "Fluxo de ativação inicial desabilitado por segurança.",
});
      
      const normalizedEmail = input.email.trim();
      const normalizedCpf = input.cpf.replace(/\D/g, "");

      const user = await db.getUserByEmail(normalizedEmail);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Administrador não encontrado.",
        });
      }

      if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem usar esta ativação inicial.",
        });
      }

      if ((user.cpf || "").replace(/\D/g, "") !== normalizedCpf) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou CPF inválidos.",
        });
      }

      if (user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este administrador já possui senha cadastrada.",
        });
      }

      const passwordValidation = validatePasswordStrength(input.newPassword);

      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.message || "Senha inválida.",
        });
      }

      const newPasswordHash = hashPassword(input.newPassword);

      await db.updateUserPassword(user.id, newPasswordHash, false);

      return {
        success: true,
        message: "Senha inicial do administrador cadastrada com sucesso.",
      };
    }),

 login: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(1, "Informe sua senha."),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const normalizedEmail = input.email.trim();

    const user = await db.getUserByEmail(normalizedEmail);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "E-mail ou senha inválidos.",
      });
    }

    if (user.status !== "ativo") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Usuário inativo.",
      });
    }

    if (!user.passwordHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "E-mail ou senha inválidos.",
      });
    }

    if (user.loginBlockedUntil) {
      const blockedUntil = new Date(user.loginBlockedUntil);

      if (!Number.isNaN(blockedUntil.getTime()) && blockedUntil.getTime() > Date.now()) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Muitas tentativas de login. Tente novamente em ${LOGIN_BLOCK_DURATION_MINUTES} minutos.`,
        });
      }

      if (!Number.isNaN(blockedUntil.getTime()) && blockedUntil.getTime() <= Date.now()) {
        await db.resetLoginAttempts(user.id);
        user.failedLoginAttempts = 0;
        user.loginBlockedUntil = null;
      }
    }

    const senhaValida = verifyPassword(input.password, user.passwordHash);

    if (!senhaValida) {
      const nextFailedAttempts = (user.failedLoginAttempts || 0) + 1;

      if (nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        const loginBlockedUntil = new Date(
          Date.now() + LOGIN_BLOCK_DURATION_MINUTES * 60 * 1000
        );

        await db.registerFailedLoginAttempt(user.id, nextFailedAttempts, loginBlockedUntil);

        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Muitas tentativas de login. Tente novamente em ${LOGIN_BLOCK_DURATION_MINUTES} minutos.`,
        });
      }

      await db.registerFailedLoginAttempt(user.id, nextFailedAttempts, null);

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "E-mail ou senha inválidos.",
      });
    }

    await db.resetLoginAttempts(user.id);

    const tokenPayload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      departmentId: user.departamentoId ?? null,
      authTokenVersion: user.authTokenVersion ?? 0,
    };

    const token = await createAuthToken(tokenPayload);

    ctx.res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        departmentId: user.departamentoId ?? null,
      },
      mustChangePassword: !!user.mustChangePassword,
    };
  }),


  // ESQUECI MINHA SENHA
  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email("Informe um e-mail válido."),
      })
    )
    .mutation(async ({ input }) => {
      const normalizedEmail = input.email.trim();
      const user = await db.getUserByEmail(normalizedEmail);

      // Resposta genérica para não revelar se o e-mail existe ou não
      if (!user || !user.email || user.status !== "ativo") {
        return {
          success: true,
          message:
            "Se existir uma conta ativa com este e-mail, enviaremos um link de redefinição.",
        };
      }

      const { token, tokenHash } = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

      await db.setPasswordResetToken(user.id, tokenHash, expiresAt);

      const baseUrl = ENV.appBaseUrl.replace(/\/$/, "");
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink,
      });

      return {
        success: true,
        message:
          "Se existir uma conta ativa com este e-mail, enviaremos um link de redefinição.",
      };
    }),

  // REDEFINIR SENHA PELO LINK
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token inválido."),
        newPassword: z.string().min(1, "Informe a nova senha."),
      })
    )
    .mutation(async ({ input }) => {
      const tokenHash = hashResetToken(input.token);
      const user = await db.getUserByPasswordResetTokenHash(tokenHash);

      if (!user || !user.passwordResetExpiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Link de redefinição inválido ou expirado.",
        });
      }

      const expiresAt = new Date(user.passwordResetExpiresAt);

      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Link de redefinição inválido ou expirado.",
        });
      }

      const passwordValidation = validatePasswordStrength(input.newPassword);

      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.message || "Senha inválida.",
        });
      }

      const newPasswordHash = hashPassword(input.newPassword);

      await db.updateUserPassword(user.id, newPasswordHash, false);
      await db.clearPasswordResetToken(user.id);
      await db.clearMustChangePassword(user.id);

      return { success: true };
    }),

  // TROCAR A PRÓPRIA SENHA
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Informe a senha atual."),
        newPassword: z.string().min(1, "Informe a nova senha."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário não encontrado.",
        });
      }

      if (!user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este usuário ainda não possui senha configurada.",
        });
      }

      const senhaAtualValida = verifyPassword(input.currentPassword, user.passwordHash);

      if (!senhaAtualValida) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Senha atual inválida.",
        });
      }

      const currentNormalized = input.currentPassword.normalize("NFKC").trim();
      const newNormalized = input.newPassword.normalize("NFKC").trim();

      if (currentNormalized === newNormalized) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A nova senha deve ser diferente da senha atual.",
        });
      }

      const passwordValidation = validatePasswordStrength(input.newPassword);

      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.message || "Senha inválida.",
        });
      }

      const newPasswordHash = hashPassword(input.newPassword);

      await db.updateUserPassword(user.id, newPasswordHash, false);
      await db.clearMustChangePassword(user.id);

      return { success: true };
    }),

  // ME
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return user;
  }),

  // LOGOUT
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await db.incrementAuthTokenVersion(ctx.user.id);

    ctx.res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return { success: true };
  }),
});

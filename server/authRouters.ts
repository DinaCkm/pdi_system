import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import {
  hashPassword,
  verifyPassword,
  generatePasswordResetToken,
  hashResetToken,
} from "./_core/password";
import { sendPasswordResetEmail } from "./_core/email";
import { ENV } from "./_core/env";

export const authRouter = router({
  // LOGIN COM SENHA
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Informe sua senha."),
      })
    )
    .mutation(async ({ input }) => {
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

      const senhaValida = verifyPassword(input.password, user.passwordHash);

      if (!senhaValida) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou senha inválidos.",
        });
      }

      const payload = {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        departmentId: user.departamentoId,
      };

      const token = Buffer.from(JSON.stringify(payload)).toString("base64");

      return {
        success: true,
        token,
        user: payload,
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
        newPassword: z
          .string()
          .min(8, "A nova senha deve ter pelo menos 8 caracteres."),
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
        currentPassword: z.string().min(8, "Informe a senha atual."),
        newPassword: z
          .string()
          .min(8, "A nova senha deve ter pelo menos 8 caracteres."),
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
  logout: publicProcedure.mutation(() => {
    return { success: true };
  }),
});

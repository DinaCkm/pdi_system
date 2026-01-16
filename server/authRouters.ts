import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateUser, createSessionToken } from "./_core/customAuth";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

const CUSTOM_AUTH_COOKIE = "pdi_session";

export const authRouter = router({
  /**
   * Verificar se sistema precisa de setup inicial
   */
  needsSetup: publicProcedure.query(async () => {
    const userCount = await db.countUsers();
    return { needsSetup: userCount === 0 };
  }),

  /**
   * Setup inicial - criar primeiro admin
   */
  setup: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido"),
        cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
        cargo: z.string().min(1, "Cargo é obrigatório"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verificar se já existe algum usuário
      const userCount = await db.countUsers();
      if (userCount > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Setup já foi realizado. Sistema já possui usuários cadastrados.",
        });
      }

      // Remover formatação do CPF
      const cpfLimpo = input.cpf.replace(/[^\d]/g, "");

      // Criar primeiro admin
      await db.createUser({
        openId: `setup-admin-${Date.now()}`,
        name: input.name,
        email: input.email,
        cpf: cpfLimpo,
        role: "admin",
        cargo: input.cargo,
        status: "ativo",
      });

      // Buscar usuário criado
      const user = await db.getUserByEmailAndCpf(input.email, cpfLimpo);
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar usuário administrador",
        });
      }

      // Criar token de sessão
      const token = await createSessionToken({
        userId: user.id,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
      });

      // Definir cookie de sessão
      ctx.res.cookie(CUSTOM_AUTH_COOKIE, token, {
        httpOnly: true,
        secure: ctx.req.protocol === "https",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });

      return { success: true, user };
    }),

  /**
   * Login com Email + CPF
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Remover formatação do CPF (pontos e traços)
      const cpfLimpo = input.cpf.replace(/[^\d]/g, "");
      
      // DEBUG: Log de tentativa de login
      console.log("[LOGIN DEBUG] Email:", input.email, "| CPF Original:", input.cpf, "| CPF Limpo:", cpfLimpo);

      // Autenticar usuário
      const user = await authenticateUser(input.email, cpfLimpo);
      console.log("[LOGIN DEBUG] Resultado da autenticação:", user ? "Usuário encontrado" : "Usuário não encontrado");

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou CPF incorretos",
        });
      }

      // Verificar se usuário está ativo
      if (user.status === "inativo") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário inativo. Entre em contato com o administrador.",
        });
      }

      // Criar token de sessão
      const token = await createSessionToken({
        userId: user.id,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
      });

      // Definir cookie de sessão
      ctx.res.cookie(CUSTOM_AUTH_COOKIE, token, {
        httpOnly: true,
        secure: ctx.req.protocol === "https",
        sameSite: ctx.req.protocol === "https" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        path: "/",
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          role: user.role,
          cargo: user.cargo,
        },
      };
    }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(CUSTOM_AUTH_COOKIE, {
      httpOnly: true,
      secure: ctx.req.protocol === "https",
      sameSite: ctx.req.protocol === "https" ? "none" : "lax",
      path: "/",
    });

    return { success: true };
  }),

  /**
   * Obter usuário atual
   */
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user || null;
  }),
});

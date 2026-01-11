import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateUser, createSessionToken } from "./_core/customAuth";
import { TRPCError } from "@trpc/server";

const CUSTOM_AUTH_COOKIE = "pdi_session";

export const authRouter = router({
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

      // Autenticar usuário
      const user = await authenticateUser(input.email, cpfLimpo);

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

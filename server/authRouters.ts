import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

export const authRouter = router({
  // 1. LOGIN: Gera o token compatível (Base64)
  login: publicProcedure
    .input(z.object({ email: z.string().email(), cpf: z.string() }))
    .mutation(async ({ input }) => {
      // Busca usuário
      const cpfLimpo = input.cpf.replace(/\D/g, "");
      const user = await db.getUserByEmailAndCpf(input.email, cpfLimpo);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou CPF inválidos.",
        });
      }

      if (user.status !== 'ativo') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário inativo.",
        });
      }

      // CRIAÇÃO DO TOKEN (O SEGREDO ESTÁ AQUI)
      // Cria um objeto simples com os dados do usuário
      const payload = {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        departmentId: user.departamentoId
      };

      // Converte para Base64 (sem usar bibliotecas externas como JWT)
      const token = Buffer.from(JSON.stringify(payload)).toString('base64');

      return {
        success: true,
        token, // Envia esse token 'legível' para o frontend
        user: payload,
      };
    }),

  // 2. ME: Verifica quem é o usuário atual
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return user;
  }),

  // 3. LOGOUT: Apenas confirma a saída
  logout: publicProcedure.mutation(() => {
    return { success: true };
  }),
});

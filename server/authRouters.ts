import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

export const authRouter = router({
  // 1. LOGIN: Gera o token compatível (Base64)
  login: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      loginType: z.enum(["cpf", "studentId"]),
      cpf: z.string().optional(),
      studentId: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    let user = null;

    if (input.loginType === "cpf") {
      const cpfLimpo = (input.cpf || "").replace(/\D/g, "");

      if (!cpfLimpo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CPF é obrigatório para este tipo de login.",
        });
      }

      user = await db.getUserByEmailAndCpf(input.email, cpfLimpo);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou CPF inválidos.",
        });
      }
    }

    if (input.loginType === "studentId") {
      const studentId = (input.studentId || "").trim();

      if (!studentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ID do aluno é obrigatório para este tipo de login.",
        });
      }

      user = await db.getUserByEmailAndStudentId(input.email, studentId);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou ID do aluno inválidos.",
        });
      }
    }

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Usuário não encontrado.",
      });
    }

    if (user.status !== "ativo") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Usuário inativo.",
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

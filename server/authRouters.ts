import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/customTrpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "segredo-super-secreto-do-pdi";

export const authRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email("E-mail inválido"),
      cpf: z.string().min(1, "CPF é obrigatório"),
    }))
    .mutation(async ({ input }) => {
      const cpfLimpo = input.cpf.replace(/\D/g, "");
      
      const user = await db.getUserByEmailAndCpf(input.email, cpfLimpo);

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
      }
      if (user.status !== 'ativo') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Usuário inativo." });
      }

      const token = sign(
        { id: user.id, role: user.role, name: user.name, departmentId: user.departamentoId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          cargo: user.cargo,
        }
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return user;
  }),
});

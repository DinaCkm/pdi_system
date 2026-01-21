import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/customTrpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

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

      const payload = JSON.stringify({ 
        id: user.id, 
        role: user.role, 
        name: user.name, 
        departmentId: user.departamentoId 
      });
      
      const token = Buffer.from(payload).toString('base64');

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

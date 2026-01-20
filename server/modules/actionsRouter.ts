import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { acoes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Router de Ações Simplificado
export const actionsRouter = router({
  
  // Lista todas as ações (com controle de permissão)
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    
    if (user.role === "admin") {
      // Admin vê todas as ações
      return await db.getAllActions();
    } else {
      // Colaborador vê apenas suas próprias ações
      return await db.getActionsByColaboradorId(user.id);
    }
  }),

  // Obter ação por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionById(input.id);
    }),

  // Obter ações por PDI
  getByPDI: protectedProcedure
    .input(z.object({ pdiId: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionsByPDIId(input.pdiId);
    }),

  // Minhas ações
  myActions: protectedProcedure.query(async ({ ctx }) => {
    return await db.getActionsByColaboradorId(ctx.user!.id);
  }),

  // Criar ação
  create: protectedProcedure
    .input(z.object({
      pdiId: z.number(),
      macroId: z.number(),
      titulo: z.string().min(3, "Título é obrigatório"),
      descricao: z.string().optional(),
      prazo: z.coerce.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar PDI existe
      const pdi = await db.getPDIById(input.pdiId);
      if (!pdi) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI não encontrado' });
      }

      // Criar ação
      await db.createAction({
        pdiId: input.pdiId,
        macroId: input.macroId,
        titulo: input.titulo,
        descricao: input.descricao || '',
        prazo: input.prazo,
        status: 'nao_iniciada',
      });

      return { success: true };
    }),

  // Atualizar ação
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      prazo: z.coerce.date().optional(),
      status: z.string().optional(),
      macroId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const userId = ctx.user?.id || 1;

      // Validar que a ação existe
      const action = await db.getActionById(id);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }

      // Atualizar ação (com histórico gravado automaticamente em db.ts)
      await db.updateAction(id, updateData, userId);
      return { success: true };
    }),

  // Deletar ação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const action = await db.getActionById(input.id);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }

      await db.deleteAction(input.id);
      return { success: true };
    }),

  // Obter histórico de alterações
  getHistory: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionHistory(input.actionId);
    }),
});

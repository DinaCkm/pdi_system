import { z } from "zod";
import { router, protectedProcedure } from "../_core/customTrpc";
import * as db from "../db";
import { acoes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Router de Ações Simplificado
export const actionsRouter = router({
  
  // Lista todas as ações (com controle de permissão)
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    
    // LOG PARA DIAGNÓSTICO
    console.log("[actions.list] Usuário:", { id: user.id, role: user.role, tipo: typeof user.id });
    
    if (user.role === "admin") {
      // Admin vê todas as ações
      const allActions = await db.getAllActions();
      console.log("[actions.list] Admin vendo todas as ações:", allActions.length);
      return allActions;
    } else {
      // Colaborador vê apenas suas próprias ações
      const userActions = await db.getActionsByColaboradorId(user.id);
      console.log("[actions.list] Ações do colaborador", user.id, ":", userActions.length);
      if (userActions.length === 0) {
        // Tenta buscar todas e filtrar manualmente
        const allActions = await db.getAllActions();
        console.log("[actions.list] Total de ações no banco:", allActions.length);
        console.log("[actions.list] Primeiras ações:", allActions.slice(0, 2).map((a: any) => ({ id: a.id, responsavelId: a.responsavelId, usuarioId: a.usuarioId })));
        
        // Comparação flexível
        const filtered = allActions.filter((acao: any) => {
          const acaoUserId = String(acao.responsavelId || acao.usuarioId);
          const ctxUserId = String(user.id);
          return acaoUserId === ctxUserId;
        });
        console.log("[actions.list] Ações filtradas manualmente:", filtered.length);
        return filtered;
      }
      return userActions;
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
      macroId: z.number().optional(),
      microcompetencia: z.string().optional(),
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

      // Se macroId não foi fornecido, usar um ID padrão (ex: 1 para "Outros")
      const macroIdFinal = input.macroId || 1;

      // Criar ação
      await db.createAction({
        pdiId: input.pdiId,
        macroId: macroIdFinal,
        microcompetencia: input.microcompetencia || null,
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

  // Obter ajustes pendentes (para colaborador)
  getPendingAdjustments: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustments?.() || [];
    return allAdjustments.filter((adj: any) => String(adj.solicitantId) === String(ctx.user.id));
  }),

  // Obter ajustes pendentes com detalhes (para admin)
  getPendingAdjustmentsWithDetails: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustments?.() || [];
    if (ctx.user.role === 'admin') {
      return allAdjustments;
    }
    return allAdjustments.filter((adj: any) => String(adj.solicitantId) === String(ctx.user.id));
  }),

  // Obter ajustes pendentes por líder
  getPendingAdjustmentsByLeader: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustments?.() || [];
    return allAdjustments.filter((adj: any) => String(adj.liderId) === String(ctx.user.id));
  }),

  // Obter histórico de ajustes
  getHistorico: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionHistory(input.actionId);
    }),

  // Aprovar ajuste
  aprovarAjuste: protectedProcedure
    .input(z.object({ adjustmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admin pode aprovar' });
      }
      return { success: true };
    }),
});

import { z } from "zod";
import { router, protectedProcedure } from "../_core/customTrpc";
import * as db from "../db";
import { actions as acoes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Router de Ações Simplificado
export const actionsRouter = router({
  
  // Lista todas as ações (com controle de permissão)
  list: protectedProcedure
    .input(z.object({ pdiId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const user = ctx.user!;
    const pdiId = input?.pdiId;
    
    // LOG PARA DIAGNÓSTICO
    console.log("[actions.list] Usuário:", { id: user.id, role: user.role, tipo: typeof user.id, pdiId });
    
    if (pdiId) {
      // Se pdiId foi fornecido, buscar ações desse PDI
      const allActions = await db.getAllActions();
      return allActions.filter((a: any) => a.pdiId === pdiId);
    }
    
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

  // Obter ação por ID (sem autenticação para testes)
  getByIdPublic: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionById(input.id);
    }),

  // Minhas ações (ações do usuário logado)
  myActions: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    console.log("[actions.myActions] Buscando ações para usuário:", user.id);
    
    const actions = await db.getActionsByColaboradorId(user.id);
    console.log("[actions.myActions] Encontradas", actions.length, "ações");
    return actions;
  }),

  // Criar ação
  create: protectedProcedure
    .input(z.object({
      titulo: z.string(),
      descricao: z.string().optional(),
      pdiId: z.number(),
      prazo: z.string(),
      macroId: z.number().optional(),
      microcompetencia: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'lider') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      
      let prazoDate: Date;
      if (typeof input.prazo === 'string') {
        prazoDate = new Date(input.prazo);
      } else {
        prazoDate = input.prazo as Date;
      }
      
      const actionId = await db.createAction({
        pdiId: input.pdiId,
        macroId: input.macroId || 1,
        microcompetencia: input.microcompetencia,
        titulo: input.titulo,
        descricao: input.descricao,
        prazo: prazoDate,
        status: 'nao_iniciada',
      });
      
      console.log('[actions.create] Ação criada com ID:', actionId);
      return { success: true, id: actionId };
    }),

  // Atualizar ação
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      status: z.string().optional(),
      prazo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'lider') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      
      const { id, ...data } = input;
      await db.updateAction(id, data, Number(ctx.user.id));
      
      console.log('[actions.update] Ação atualizada:', id);
      return { success: true };
    }),

  // Deletar ação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admin' });
      }
      
      await db.deleteAction(input.id);
      
      console.log('[actions.delete] Ação deletada:', input.id);
      return { success: true };
    }),

  // Obter ação por ID com detalhes completos
  getWithDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionById(input.id);
    }),

  // Obter ajustes pendentes
  getPendingAdjustments: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustmentRequests?.() || [];
    return allAdjustments.filter((adj: any) => adj.status === 'pendente');
  }),

  // Obter ajustes pendentes com detalhes
  getPendingAdjustmentsWithDetails: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustmentRequests?.() || [];
    return allAdjustments.filter((adj: any) => adj.status === 'pendente');
  }),

  // Obter ajustes pendentes por líder
  getPendingAdjustmentsByLeader: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustmentRequests?.() || [];
    return allAdjustments.filter((adj: any) => String(adj.liderId) === String(ctx.user.id));
  }),

  // Obter histórico de ajustes
  getHistorico: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionHistory(input.actionId);
    }),

  // Obter histórico de uma ação
  getHistory: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      const history = await db.getActionHistory(input.actionId);
      return history.map((entry: any) => ({
        id: entry.id,
        actionId: entry.actionId,
        campoAlterado: entry.campo,
        valorAntigo: entry.valorAnterior,
        valorNovo: entry.valorNovo,
        motivo: entry.motivoAlteracao,
        mudadoPor: entry.alteradoPor ? "usuario" : "sistema",
        usuarioNome: entry.userName,
        dataMudanca: entry.createdAt
      }));
    }),

  // Ações da equipe do líder
  teamActions: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    
    if (user.role !== 'lider') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas líderes podem acessar ações da equipe' });
    }

    const subordinates = await db.getSubordinates(Number(user.id));
    const subIds = subordinates.map((s: { id: number }) => s.id);

    if (subIds.length === 0) return [];

    const allActions = await db.getAllActions();
    const filtered = allActions.filter((acao: any) => {
      const acaoColabId = Number(acao.responsavelId || acao.usuarioId || acao.colaboradorId);
      return subIds.includes(acaoColabId);
    });
    
    // Enriquecer com nome da macrocompetência
    const enriched = await Promise.all(filtered.map(async (acao: any) => {
      if (acao.macroId) {
        const macro = await db.getMacroById(acao.macroId);
        return { ...acao, macroNome: macro?.nome || 'Sem competência' };
      }
      return { ...acao, macroNome: 'Sem competência' };
    }));
    
    return enriched;
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

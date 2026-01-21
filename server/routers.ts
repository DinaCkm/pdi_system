import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure } from "./_core/customTrpc"; // <--- IMPORT CORRIGIDO
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { authRouter } from "./authRouters"; // <--- CONECTANDO O NOVO LOGIN
import { actionsRouter } from "./modules/actionsRouter";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { pdiAjustesRouter } from "./routers/pdi-ajustes.router";

// Mantendo os roteadores que já existiam
import { systemRouter } from "./_core/systemRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter, // <--- AQUI ESTÁ A MÁGICA DO LOGIN
  pdiAjustes: pdiAjustesRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  actions: actionsRouter,

  // MANTENDO A ESTRUTURA ORIGINAL DE DEPARTAMENTOS
  departamentos: router({
    list: adminProcedure.query(async () => {
      return await db.getAllDepartamentos();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getDepartamentoById(input.id);
    }),
    create: adminProcedure.input(z.object({ nome: z.string(), descricao: z.string().optional(), leaderId: z.number().optional() })).mutation(async ({ input }) => {
      await db.createDepartamento(input);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({ id: z.number(), nome: z.string().optional(), leaderId: z.number().optional().nullable() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDepartamento(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDepartamento(input.id);
      return { success: true };
    }),
  }),

  // MANTENDO USUÁRIOS
  users: router({
    list: adminProcedure.query(async () => await db.getAllUsers()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => await db.getUserById(input.id)),
    create: adminProcedure.input(z.object({ name: z.string(), email: z.string().email(), cpf: z.string(), role: z.enum(["admin", "lider", "colaborador"]), cargo: z.string(), departamentoId: z.number().optional() })).mutation(async ({ input }) => {
      const cpf = input.cpf.replace(/\D/g, "");
      await db.createUser({ ...input, cpf, openId: `local_${cpf}`, status: "ativo" });
      return { success: true };
    }),
    // Endpoint simplificado para não quebrar a tipagem antiga
    buscarPorCpf: publicProcedure.input(z.object({ cpf: z.string() })).query(async ({ input }) => {
       const users = await db.getAllUsers();
       return users.find(u => u.cpf?.replace(/\D/g, "") === input.cpf.replace(/\D/g, "")) || null;
    }),
  }),

  // MANTENDO COMPETÊNCIAS E CICLOS (SIMPLIFICADO PARA O TESTE)
  competencias: router({
    listAllMacros: publicProcedure.query(async () => await db.getAllMacros()),
  }),
  
  ciclos: router({
    list: protectedProcedure.query(async () => await db.getAllCiclos()),
  }),

  pdis: router({
    list: adminProcedure.query(async () => await db.getAllPDIs()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => await db.getPDIById(input.id)),
    myPDIs: protectedProcedure.query(async ({ ctx }) => {
      const allPDIs = await db.getAllPDIs();
      
      return allPDIs.filter((pdi: any) => {
        const pdiUserId = String(pdi.colaboradorId || pdi.usuarioId);
        const ctxUserId = String(ctx.user.id);
        return pdiUserId === ctxUserId;
      });
    }),
    teamPDIs: protectedProcedure.query(async () => await db.getAllPDIs()),
    validate: adminProcedure.input(z.object({ pdiId: z.number() })).mutation(async ({ input }) => {
      await db.updatePDI(input.pdiId, { status: 'em_andamento' });
      return { success: true };
    }),
  }),

  // ============= EVIDÊNCIAS (JÁ ATUALIZADO ANTERIORMENTE) =============
  evidences: router({
    create: protectedProcedure.input(z.object({ actionId: z.number(), descricao: z.string(), files: z.any().optional() })).mutation(async ({ ctx, input }) => {
        try {
            const action = await db.getActionById(input.actionId);
            if(!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
            await db.createEvidence({ 
                actionId: input.actionId, 
                colaboradorId: Number(ctx.user!.id), 
                descricao: input.descricao,
                arquivo: input.files?.[0]?.name || ""
            });
            await db.updateAction(action.id, { status: 'aguardando_avaliacao' });
            return { success: true };
        } catch (error) {
            console.error('[evidences.create] Erro ao criar evidência:', error);
            throw error;
        }
    }),
    listByAction: protectedProcedure.input(z.object({ actionId: z.number() })).query(async ({ input }) => await db.getEvidencesByActionId(input.actionId)),
    aprovar: adminProcedure.input(z.object({ evidenceId: z.number() })).mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.evidenceId);
        if(ev) {
            await db.updateEvidenceStatus(input.evidenceId, { status: 'aprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
            await db.updateAction(ev.actionId, { status: 'concluida' });
        }
        return { success: true };
    }),
    reprovar: adminProcedure.input(z.object({ evidenceId: z.number() })).mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.evidenceId);
        if(ev) {
            await db.updateEvidenceStatus(input.evidenceId, { status: 'reprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
            await db.updateAction(ev.actionId, { status: 'em_andamento' });
        }
        return { success: true };
    }),
  })
});

export type AppRouter = typeof appRouter;

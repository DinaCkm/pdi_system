import { z } from "zod";
import { sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { router, publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { authRouter } from "./authRouters";
import { actionsRouter } from "./modules/actionsRouter";
import { adjustmentRequestsRouter } from "./modules/adjustmentRequestsRouter";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { pdiAjustesRouter } from "./routers/pdi-ajustes.router";
import { systemRouter } from "./_core/systemRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  pdiAjustes: pdiAjustesRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  actions: actionsRouter,
  adjustmentRequests: adjustmentRequestsRouter,

  departamentos: router({
    list: adminProcedure.query(async () => {
      return await db.getAllDepartamentos();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getDepartamentoById(input.id);
    }),
  }),

  competencias: router({
    list: adminProcedure.query(async () => {
      return await db.getAllCompetencias();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getCompetenciaById(input.id);
    }),
  }),

  usuarios: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getUserById(input.id);
    }),
  }),

  pdis: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllPDIs(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getPDIById(input.id);
    }),
  }),

  evidences: router({
    getPending: adminProcedure.query(async () => {
      return await db.getPendingEvidences();
    }),

    listPending: adminProcedure.query(async () => {
      try {
        const rawEvidences = await db.getPendingEvidences();
        console.log(`listPending: Retornou ${rawEvidences.length} evidências`);
        
        // Para cada evidência, buscamos os arquivos e textos vinculados
        return await Promise.all(
          rawEvidences.map(async (ev: any) => {
            try {
              const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
              const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
              return { 
                ...ev, 
                files: filesRows || [], 
                texts: textsRows || [] 
              };
            } catch (error) {
              console.error(`Erro ao buscar arquivos/textos da evidência ${ev.id}:`, error);
              return { ...ev, files: [], texts: [] };
            }
          })
        );
      } catch (error) {
        console.error(`Erro em listPending:`, error);
        throw error;
      }
    }),

    create: protectedProcedure
      .input(
        z.object({
          actionId: z.number(),
          descricao: z.string(),
          arquivo: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const evidence = await db.createEvidence({
          actionId: input.actionId,
          colaboradorId: ctx.user.id,
          descricao: input.descricao,
          arquivo: input.arquivo,
          status: "aguardando_avaliacao",
        });

        await db.updateAction(input.actionId, {
          status: "aguardando_avaliacao",
          evidence_status: "aguardando_analise",
        });

        return evidence;
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number(), satisfactionScore: z.number().optional() }))
      .mutation(async ({ input }) => {
        const evidence = await db.approveEvidence(input.id, input.satisfactionScore);
        await notifyOwner({
          title: "Evidência Aprovada",
          content: `Evidência #${input.id} foi aprovada.`,
        });
        return evidence;
      }),

    reject: adminProcedure
      .input(z.object({ id: z.number(), justificativaAdmin: z.string() }))
      .mutation(async ({ input }) => {
        const evidence = await db.rejectEvidence(input.id, input.justificativaAdmin);
        await notifyOwner({
          title: "Evidência Rejeitada",
          content: `Evidência #${input.id} foi rejeitada.`,
        });
        return evidence;
      }),

    aprovar: adminProcedure
      .input(z.object({ id: z.number(), satisfactionScore: z.number().optional() }))
      .mutation(async ({ input }) => {
        return await db.approveEvidence(input.id, input.satisfactionScore);
      }),

    reprovar: adminProcedure
      .input(z.object({ id: z.number(), justificativaAdmin: z.string() }))
      .mutation(async ({ input }) => {
        return await db.rejectEvidence(input.id, input.justificativaAdmin);
      }),
  }),
});

export type AppRouter = typeof appRouter;

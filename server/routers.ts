import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { actionsRouter } from "./modules/actionsRouter";

export const appRouter = router({
  // ============= USUÁRIOS =============
  users: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserById(input.id);
      }),

    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        cpf: z.string(),
        departamentoId: z.number().optional(),
        leaderId: z.number().optional(),
        role: z.enum(['user', 'admin']).optional(),
      }))
      .mutation(async ({ input }) => {
        const userId = await db.createUser({
          name: input.name,
          email: input.email,
          cpf: input.cpf,
          departamentoId: input.departamentoId,
          leaderId: input.leaderId,
          role: input.role || 'user',
        });
        return { success: true, userId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        cpf: z.string().optional(),
        departamentoId: z.number().optional(),
        leaderId: z.number().optional(),
        role: z.enum(['user', 'admin']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateUser(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.id);
        return { success: true };
      }),
  }),

  // ============= COMPETÊNCIAS MACROS =============
  competencias: router({
    listAllMacros: protectedProcedure.query(async () => {
      return await db.getAllMacros();
    }),

    createMacro: adminProcedure
      .input(z.object({
        nome: z.string(),
        descricao: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createMacro(input);
        return { success: true, id };
      }),
  }),

  // ============= DEPARTAMENTOS =============
  departamentos: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDepartamentos();
    }),

    create: adminProcedure
      .input(z.object({ nome: z.string() }))
      .mutation(async ({ input }) => {
        const id = await db.createDepartamento(input.nome);
        return { success: true, id };
      }),
  }),

  // ============= CICLOS =============
  ciclos: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllCiclos();
    }),

    create: adminProcedure
      .input(z.object({
        nome: z.string(),
        dataInicio: z.coerce.date(),
        dataFim: z.coerce.date(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCiclo(input);
        return { success: true, id };
      }),
  }),

  // ============= PDIs =============
  pdis: router({
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPDIById(input.id);
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role === 'admin') {
        return await db.getAllPDIs();
      }
      return await db.getPDIsByColaboradorId(ctx.user!.id);
    }),

    create: protectedProcedure
      .input(z.object({
        cicloId: z.number(),
        colaboradorId: z.number(),
        titulo: z.string(),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin' && ctx.user?.id !== input.colaboradorId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const id = await db.createPDI(input);
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const pdi = await db.getPDIById(input.id);
        if (!pdi) throw new TRPCError({ code: 'NOT_FOUND' });
        if (ctx.user?.role !== 'admin' && ctx.user?.id !== pdi.colaboradorId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.updatePDI(input.id, input);
        return { success: true };
      }),
  }),

  // ============= GESTÃO DE AÇÕES =============
  actions: actionsRouter,

  // ============= EVIDÊNCIAS (SIMPLIFICADO) =============
  evidences: router({
    create: protectedProcedure
      .input(z.object({
        actionId: z.number(),
        descricao: z.string(),
        files: z.array(z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
          fileUrl: z.string(),
          fileKey: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const action = await db.getActionById(input.actionId);
        if (!action) throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });

        const evidenceId = await db.createEvidence({
          actionId: input.actionId,
          colaboradorId: ctx.user!.id,
          descricao: input.descricao,
        });

        if (input.files && input.files.length > 0) {
          const { storagePut } = await import('server/storage');
          for (const file of input.files) {
            const { url: s3Url } = await storagePut(file.fileKey, file.fileUrl, file.fileType);
            await db.addEvidenceFile({
              evidenceId,
              fileName: file.fileName,
              fileType: file.fileType,
              fileSize: file.fileSize,
              fileUrl: s3Url,
              fileKey: file.fileKey,
            });
          }
        }

        await db.updateAction(action.id, { status: 'aguardando_avaliacao' });

        return { success: true };
      }),

    listByAction: protectedProcedure
      .input(z.object({ actionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEvidencesByActionId(input.actionId);
      }),

    aprovar: adminProcedure
      .input(z.object({ evidenceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const evidence = await db.getEvidenceById(input.evidenceId);
        if (!evidence) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.updateEvidenceStatus(input.evidenceId, {
          status: 'aprovada',
          evaluatedBy: ctx.user!.id,
          evaluatedAt: new Date(),
        });

        await db.updateAction(evidence.actionId, { status: 'concluida' });

        return { success: true };
      }),

    reprovar: adminProcedure
      .input(z.object({ evidenceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const evidence = await db.getEvidenceById(input.evidenceId);
        if (!evidence) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.updateEvidenceStatus(input.evidenceId, {
          status: 'reprovada',
          evaluatedBy: ctx.user!.id,
          evaluatedAt: new Date(),
        });

        await db.updateAction(evidence.actionId, { status: 'em_andamento' });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

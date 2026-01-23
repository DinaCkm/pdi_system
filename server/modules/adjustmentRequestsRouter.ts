import { z } from "zod";
import { router, protectedProcedure } from "../_core/customTrpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";

export const adjustmentRequestsRouter = router({
  // Criar solicitação de ajuste
  create: protectedProcedure
    .input(
      z.object({
        actionId: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
        camposAjustar: z.string(),
        tipoSolicitante: z.enum(["colaborador", "lider"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;

      // Verificar se a ação existe
      const action = await db.getActionById(input.actionId);
      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Criar solicitação de ajuste
      const result = await db.createAdjustmentRequest({
        actionId: input.actionId,
        solicitanteId: user.id,
        tipoSolicitante: input.tipoSolicitante,
        justificativa: input.justificativa,
        camposAjustar: input.camposAjustar,
      });

      return result;
    }),

  // Listar solicitações de ajuste (para admin avaliar)
  listPending: protectedProcedure.query(async ({ ctx }) => {
    console.log('[adjustmentRequests.listPending] User:', user.id, 'Role:', user.role);
    const user = ctx.user!;

    // Apenas admin pode ver todas as solicitações pendentes
    if (user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas administradores podem listar solicitações",
      });
    }

    console.log('[adjustmentRequests.listPending] Chamando getPendingAdjustmentRequests...');
    return await db.getPendingAdjustmentRequests();
  }),

  // Listar minhas solicitações de ajuste
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    return await db.getAdjustmentRequestsByUser(user.id);
  }),

  // Listar todas as solicitações do usuário (para verificar pendências)
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    return await db.getAdjustmentRequestsByUser(user.id);
  }),

  // Obter detalhes de uma solicitação
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const user = ctx.user!;
      const request = await db.getAdjustmentRequestById(input.id);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      // Verificar permissão: apenas admin ou o solicitante pode ver
      if (user.role !== "admin" && request.solicitanteId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para ver esta solicitação",
        });
      }

      return request;
    }),

  // Aprovar solicitação de ajuste
  approve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        justificativa: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;

      // Apenas admin pode aprovar
      if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem aprovar",
        });
      }

      const result = await db.updateAdjustmentRequest(input.id, {
        status: "aprovada",
        justificativa: input.justificativa,
        evaluatedBy: user.id,
        evaluatedAt: new Date().toISOString(),
      });

      // Notificar o proprietário sobre aprovação
      const request = await db.getAdjustmentRequestById(input.id);
      if(request) {
        const action = await db.getActionById(request.actionId);
        if(action) {
          await notifyOwner({
            title: '✅ Solicitação de Ajuste Aprovada',
            content: `Sua solicitação de ajuste para a ação "${action.titulo}" foi aprovada pelo administrador.`
          });
        }
      }

      return result;
    }),

  // Reprovar solicitação de ajuste
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;

      // Apenas admin pode reprovar
      if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem reprovar",
        });
      }

      const result = await db.updateAdjustmentRequest(input.id, {
        status: "reprovada",
        justificativaAdmin: input.justificativa,
        evaluatedBy: user.id,
        evaluatedAt: new Date().toISOString(),
      });

      // Notificar o proprietário sobre reprovação
      const request = await db.getAdjustmentRequestById(input.id);
      if(request) {
        const action = await db.getActionById(request.actionId);
        if(action) {
          await notifyOwner({
            title: '❌ Solicitação de Ajuste Reprovada',
            content: `Sua solicitação de ajuste para a ação "${action.titulo}" foi reprovada. Motivo: ${input.justificativa}`
          });
        }
      }

      return result;
    }),

  // Solicitar mais informações
  requestMoreInfo: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;

      // Apenas admin pode solicitar mais informações
      if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem solicitar mais informações",
        });
      }

      const result = await db.updateAdjustmentRequest(input.id, {
        status: "mais_informacoes",
        justificativaAdmin: input.justificativa,
        evaluatedBy: user.id,
        evaluatedAt: new Date().toISOString(),
      });

      // Notificar o proprietário sobre solicitação de mais informações
      const request = await db.getAdjustmentRequestById(input.id);
      if(request) {
        const action = await db.getActionById(request.actionId);
        if(action) {
          await notifyOwner({
            title: '❓ Mais Informações Solicitadas',
            content: `O administrador solicitou mais informações sobre sua solicitação de ajuste para a ação "${action.titulo}". Motivo: ${input.justificativa}`
          });
        }
      }

      return result;
    }),

  // Adicionar comentário
  addComment: protectedProcedure
    .input(
      z.object({
        adjustmentRequestId: z.number(),
        comentario: z.string().min(1, "Comentário não pode estar vazio"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;

      // Verificar se a solicitação existe
      const request = await db.getAdjustmentRequestById(input.adjustmentRequestId);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      return await db.addAdjustmentComment({
        adjustmentRequestId: input.adjustmentRequestId,
        autorId: user.id,
        comentario: input.comentario,
      });
    }),

  // Listar comentários
  getComments: protectedProcedure
    .input(z.object({ adjustmentRequestId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAdjustmentComments(input.adjustmentRequestId);
    }),
});

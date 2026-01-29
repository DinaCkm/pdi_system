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

      // Salvar dados atuais da ação para histórico (De -> Para)
      let competenciaNome = null;
      if (action.macroId) {
        const macro = await db.getMacroById(action.macroId);
        competenciaNome = macro?.nome || null;
      }
      
      const dadosAntesAjuste = JSON.stringify({
        titulo: action.titulo,
        descricao: action.descricao,
        prazo: action.prazo,
        competencia: competenciaNome,
      });

      // Criar solicitação de ajuste com dados anteriores
      const result = await db.createAdjustmentRequest({
        actionId: input.actionId,
        solicitanteId: user.id,
        tipoSolicitante: input.tipoSolicitante,
        justificativa: input.justificativa,
        camposAjustar: input.camposAjustar,
        dadosAntesAjuste: dadosAntesAjuste,
      });

      return result;
    }),

  // Listar solicitações de ajuste (para admin avaliar)
  listPending: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    console.log('[adjustmentRequests.listPending] User:', user.id, 'Role:', user.role);

    // Apenas admin pode ver todas as solicitações pendentes
    if (user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas administradores podem listar solicitações",
      });
    }

    console.log('[adjustmentRequests.listPending] Chamando getPendingAdjustmentRequests...');
    const result = await db.getPendingAdjustmentRequests();
    console.log('[adjustmentRequests.listPending] Resultado:', result?.length || 0, 'solicitações');
    return result;
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

  // Listar solicitações de ajuste da equipe do líder (somente visualização)
  listByTeam: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;

    // Apenas líder ou admin pode ver solicitações da equipe
    if (user.role !== "lider" && user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas líderes podem visualizar solicitações da equipe",
      });
    }

    return await db.getAdjustmentRequestsByLeader(user.id);
  }),

  // Listar TODAS as solicitações de ajuste (para admin e gerente)
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;

    // Admin e Gerente podem ver todas as solicitações
    if (user.role !== "admin" && user.role !== "gerente") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Apenas administradores e gerentes podem listar todas as solicitações",
      });
    }

    return await db.getAllAdjustmentRequests();
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

      // Buscar a solicitação
      const request = await db.getAdjustmentRequestById(input.id);
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      // IMPORTANTE: NÃO aplicar alterações automaticamente!
      // O admin deve usar o botão "Editar" para fazer as alterações manualmente
      // e depois clicar em "Aceitar" para aprovar a solicitação.
      // Isso garante que o admin tenha controle total sobre o que é alterado.

      // Atualizar status da solicitação
      const result = await db.updateAdjustmentRequest(input.id, {
        status: "aprovada",
        justificativaAdmin: input.justificativa,
        evaluatedBy: user.id,
        evaluatedAt: new Date().toISOString(),
      });

      // Notificar o proprietário sobre aprovação
      const action = await db.getActionById(request.actionId);
      if(action) {
        await notifyOwner({
          title: '✅ Solicitação de Ajuste Aprovada',
          content: `Sua solicitação de ajuste para a ação "${action.titulo}" foi aprovada pelo administrador.`
        });
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

import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { adjustmentRequests, actions, pdis, users, departamentos, ciclos } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * REGRA CRÍTICA #10 REFINADA: Fluxo de Solicitação de Ajuste com Precedência do Líder
 * 
 * FASE 1: PROPOSTA (pendente_aprovacao_lider)
 * - Dina é autoridade principal
 * - Colaborador solicita ajustes (limite 5)
 * - Dina pode editar DIRETO
 * - Status: pendente_admin
 * 
 * FASE 2: COMPROMISSO (aprovada_lider+)
 * - Líder é "dono" da prioridade
 * - Colaborador solicita ajuste
 * - BLOQUEIO: Botão de editar desabilitado para Dina
 * - Status: aguardando_autorizacao_lider_para_ajuste
 * - LIBERAÇÃO: Após Líder "De Acordo" → lider_de_acordo
 * - CONCLUSÃO: Dina edita (botão habilitado)
 */

export const pdiAjustesRouter = router({
  /**
   * Solicitar alteração de ação (COLABORADOR ou LÍDER)
   * Detecta fase da ação e define status inicial apropriado
   */
  solicitarAlteracao: protectedProcedure
    .input(
      z.object({
        acaoId: z.number(),
        tipoSolicitacao: z.enum([
          "alteracao_descricao",
          "alteracao_prazo",
          "alteracao_competencia",
          "cancelamento",
        ]),
        descricaoSolicitacao: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que ação existe
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, input.acaoId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Validar que usuário é dono ou líder da ação
      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, acao[0].pdiId))
        .limit(1);

      if (!pdi.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PDI não encontrado",
        });
      }

      // Validar permissão: Colaborador (dono) ou Líder (seu líder)
      if (user.role === "colaborador") {
        if (pdi[0].colaboradorId !== user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas o colaborador dono da ação pode solicitar alteração",
          });
        }
      } else if (user.role === "lider") {
        // Líder pode solicitar para si mesmo ou para subordinados
        const colaborador = await db
          .select()
          .from(users)
          .where(eq(users.id, pdi[0].colaboradorId))
          .limit(1);

        if (!colaborador.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Colaborador não encontrado",
          });
        }

        // Verificar se é seu próprio PDI ou de subordinado
        if (
          pdi[0].colaboradorId !== user.id &&
          colaborador[0].leaderId !== user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para solicitar alteração nesta ação",
          });
        }
      } else if (user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas colaboradores, líderes e admins podem solicitar alterações",
        });
      }

      // Validar limite de 5 solicitações
      const totalSolicitacoes = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.actionId, input.acaoId))
        .where(eq(adjustmentRequests.solicitanteId, user.id));

      if (totalSolicitacoes.length >= 5) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Limite de 5 solicitações de ajuste atingido para esta ação",
        });
      }

      // ARQUITETURA DE PRECEDÊNCIA DO LÍDER
      // Determinar status inicial baseado na fase da ação
      let statusInicial: "pendente_admin" | "aguardando_autorizacao_lider_para_ajuste";

      if (acao[0].status === "pendente_aprovacao_lider") {
        // FASE 1: PROPOSTA - Dina é autoridade principal
        statusInicial = "pendente_admin";
      } else if (
        acao[0].status === "aprovada_lider" ||
        acao[0].status === "em_andamento" ||
        acao[0].status === "evidencia_enviada" ||
        acao[0].status === "concluida"
      ) {
        // FASE 2: COMPROMISSO - Líder é "dono"
        // Requer autorização do Líder antes de Dina editar
        statusInicial = "aguardando_autorizacao_lider_para_ajuste";
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ação não pode ter alterações solicitadas neste status",
        });
      }

      // Criar solicitação de alteração
      const result = await db.insert(adjustmentRequests).values({
        actionId: input.acaoId,
        solicitanteId: user.id,
        tipoSolicitacao: input.tipoSolicitacao,
        descricaoSolicitacao: input.descricaoSolicitacao,
        status: statusInicial,
      });

      const mensagem =
        statusInicial === "pendente_admin"
          ? "Solicitação enviada para o administrador (ação ainda não foi validada pelo líder)"
          : "Solicitação enviada. Aguardando autorização do seu líder para o RH proceder com a alteração";

      return {
        id: result.insertId,
        acaoId: input.acaoId,
        status: statusInicial,
        mensagem,
      };
    }),

  /**
   * Autorizar alteração (LÍDER)
   * Apenas para FASE 2: Ação já validada pelo Líder
   * Libera o botão de edição para Admin
   */
  autorizarAlteracao: protectedProcedure
    .input(
      z.object({
        solicitacaoId: z.number(),
        autoriza: z.boolean(),
        feedback_lider: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que usuário é Líder
      if (user.role !== "lider" && user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas líderes podem autorizar alterações",
        });
      }

      // Validar que solicitação existe
      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.solicitacaoId))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação de alteração não encontrada",
        });
      }

      // Validar que solicitação está aguardando autorização do líder
      if (
        solicitacao[0].status !== "aguardando_autorizacao_lider_para_ajuste"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação não está aguardando autorização do líder",
        });
      }

      // Validar que líder é o líder do colaborador
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, solicitacao[0].actionId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, acao[0].pdiId))
        .limit(1);

      if (!pdi.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "PDI não encontrado",
        });
      }

      const colaborador = await db
        .select()
        .from(users)
        .where(eq(users.id, pdi[0].colaboradorId))
        .limit(1);

      if (!colaborador.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      // Validar que líder é o líder do colaborador (ou é admin)
      if (user.role !== "admin" && colaborador[0].leaderId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não é o líder deste colaborador",
        });
      }

      // Atualizar solicitação com autorização do líder
      const novoStatus = input.autoriza ? "lider_de_acordo" : "rejeitada";
      await db
        .update(adjustmentRequests)
        .set({
          liderConfirmacao: input.autoriza,
          liderConfirmadoPor: user.id,
          feedback_lider: input.feedback_lider,
          liderConfirmadoAt: new Date(),
          status: novoStatus,
        })
        .where(eq(adjustmentRequests.id, input.solicitacaoId));

      return {
        id: input.solicitacaoId,
        status: novoStatus,
        autoriza: input.autoriza,
        mensagem: input.autoriza
          ? "Alteração autorizada. Enviada para o administrador"
          : "Solicitação rejeitada",
      };
    }),

  /**
   * Aprovar e fazer alteração (ADMIN)
   * ARQUITETURA DE PRECEDÊNCIA: Valida se Líder já aprovou a ação
   */
  aprovarAlteracao: adminProcedure
    .input(
      z.object({
        solicitacaoId: z.number(),
        aprovada: z.boolean(),
        justificativa: z.string().optional(),
        novaDescricao: z.string().optional(),
        novoPrazo: z.date().optional(),
        novoMicroId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que solicitação existe
      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.solicitacaoId))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação de alteração não encontrada",
        });
      }

      // Validar que solicitação está aguardando aprovação do admin
      if (solicitacao[0].status !== "pendente_admin" && solicitacao[0].status !== "lider_de_acordo") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação não está aguardando aprovação do admin",
        });
      }

      // TRAVA DE PRECEDÊNCIA DO LÍDER
      // Se a solicitação estava em "aguardando_autorizacao_lider_para_ajuste"
      // ela DEVE estar em "lider_de_acordo" para Admin poder editar
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, solicitacao[0].actionId))
        .limit(1);

      if (!acao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ação não encontrada",
        });
      }

      // Se ação foi aprovada pelo líder anteriormente
      if (acao[0].status !== "pendente_aprovacao_lider") {
        // Requer que solicitação esteja com lider_de_acordo
        if (solicitacao[0].status !== "lider_de_acordo") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Ação bloqueada: Este ajuste requer autorização prévia do Líder, pois a ação já havia sido validada por ele",
          });
        }
      }

      // Se aprovada, fazer o ajuste na ação
      if (input.aprovada) {
        const pdi = await db
          .select()
          .from(pdis)
          .where(eq(pdis.id, acao[0].pdiId))
          .limit(1);

        if (pdi.length) {
          // Validar que novo prazo está dentro do ciclo (Regra #9)
          if (input.novoPrazo) {
            const ciclo = await db
              .select()
              .from(ciclos)
              .where(eq(ciclos.id, pdi[0].cicloId))
              .limit(1);

            if (ciclo.length) {
              if (
                input.novoPrazo < ciclo[0].dataInicio ||
                input.novoPrazo > ciclo[0].dataFim
              ) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Novo prazo deve estar entre ${ciclo[0].dataInicio.toLocaleDateString()} e ${ciclo[0].dataFim.toLocaleDateString()}`,
                });
              }
            }
          }
        }

        // Fazer o ajuste na ação
        const updateData: any = { updatedAt: new Date() };
        if (input.novaDescricao) updateData.descricao = input.novaDescricao;
        if (input.novoPrazo) updateData.prazo = input.novoPrazo;
        if (input.novoMicroId) updateData.microId = input.novoMicroId;

        await db
          .update(actions)
          .set(updateData)
          .where(eq(actions.id, solicitacao[0].actionId));
      }

      // Atualizar solicitação
      const novoStatus = input.aprovada ? "aprovada" : "rejeitada";
      await db
        .update(adjustmentRequests)
        .set({
          status: novoStatus,
          respondidoPor: user.id,
          justificativaResposta: input.justificativa || null,
          respondidoAt: new Date(),
        })
        .where(eq(adjustmentRequests.id, input.solicitacaoId));

      return {
        id: input.solicitacaoId,
        status: novoStatus,
        acao: input.aprovada ? "Alteração realizada" : "Solicitação rejeitada",
        mensagem: input.aprovada
          ? "Alteração foi aplicada à ação"
          : "Solicitação foi rejeitada",
      };
    }),

  /**
   * Listar solicitações de alteração (LÍDER e ADMIN)
   */
  listarSolicitacoes: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "pendente_admin",
            "aguardando_autorizacao_lider_para_ajuste",
            "lider_de_acordo",
            "aprovada",
            "rejeitada",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      if (user.role !== "lider" && user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas líderes e admins podem listar solicitações",
        });
      }

      let query = db.select().from(adjustmentRequests);

      if (input.status) {
        query = query.where(eq(adjustmentRequests.status, input.status));
      }

      if (user.role === "lider") {
        // Líder vê apenas solicitações que aguardam sua autorização
        return await query.where(
          eq(adjustmentRequests.status, "aguardando_autorizacao_lider_para_ajuste")
        );
      }

      // Admin vê todas
      return await query;
    }),

  /**
   * Obter detalhes de uma solicitação
   */
  obterSolicitacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;

      const solicitacao = await db
        .select()
        .from(adjustmentRequests)
        .where(eq(adjustmentRequests.id, input.id))
        .limit(1);

      if (!solicitacao.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      // Validar acesso
      if (user.role !== "admin" && solicitacao[0].solicitanteId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar esta solicitação",
        });
      }

      return solicitacao[0];
    }),
});

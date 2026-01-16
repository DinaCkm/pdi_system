import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { adjustmentRequests, actions, pdis, users, departamentos, ciclos } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * REGRA CRÍTICA #10: Fluxo de Solicitação de Ajuste (REFINADO)
 * 
 * CENÁRIO 1: Ação AINDA NÃO validada pelo Líder (status: pendente_aprovacao_lider)
 * - Colaborador pode solicitar alterações
 * - Admin faz alterações DIRETO (sem validação do Líder)
 * - Colaborador pode solicitar quantas vezes quiser
 * - Líder não precisa confirmar (ação ainda não foi aprovada)
 * 
 * CENÁRIO 2: Ação JÁ validada pelo Líder (status: aprovada_lider)
 * - Colaborador solicita alteração
 * - Líder DEVE confirmar concordância
 * - Admin só faz alteração após Líder confirmar SIM
 * - Sequência obrigatória: Colaborador → Líder → Admin
 */

export const pdiAjustesRouter = router({
  /**
   * Solicitar alteração de ação (COLABORADOR)
   * Funciona em ambos os cenários (antes e depois da validação do Líder)
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

      // Validar que colaborador é o dono da ação
      const pdi = await db
        .select()
        .from(pdis)
        .where(eq(pdis.id, acao[0].pdiId))
        .limit(1);

      if (!pdi.length || pdi[0].colaboradorId !== user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas o colaborador dono da ação pode solicitar alteração",
        });
      }

      // Determinar status inicial da solicitação baseado no status da ação
      let statusInicial: "pendente_admin" | "pendente_confirmacao_lider";

      if (acao[0].status === "pendente_aprovacao_lider") {
        // CENÁRIO 1: Ação ainda não foi validada pelo Líder
        // Admin pode fazer alteração DIRETO
        statusInicial = "pendente_admin";
      } else if (acao[0].status === "aprovada_lider") {
        // CENÁRIO 2: Ação já foi validada pelo Líder
        // Líder precisa confirmar a alteração
        statusInicial = "pendente_confirmacao_lider";
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
          : "Solicitação enviada para confirmação do líder";

      return {
        id: result.insertId,
        acaoId: input.acaoId,
        status: statusInicial,
        mensagem,
      };
    }),

  /**
   * Confirmar alteração (LÍDER)
   * Apenas para CENÁRIO 2: Ação já validada pelo Líder
   */
  confirmarAlteracao: protectedProcedure
    .input(
      z.object({
        solicitacaoId: z.number(),
        confirmacao: z.boolean(),
        justificativa: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;

      // Validar que usuário é Líder
      if (user.role !== "lider" && user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas líderes podem confirmar alterações",
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

      // Validar que solicitação está aguardando confirmação do líder
      if (solicitacao[0].status !== "pendente_confirmacao_lider") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação não está aguardando confirmação do líder",
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

      // Atualizar solicitação com confirmação do líder
      const novoStatus = input.confirmacao ? "pendente_admin" : "rejeitada";
      await db
        .update(adjustmentRequests)
        .set({
          liderConfirmacao: input.confirmacao,
          liderConfirmadoPor: user.id,
          liderJustificativa: input.justificativa || null,
          liderConfirmadoAt: new Date(),
          status: novoStatus,
        })
        .where(eq(adjustmentRequests.id, input.solicitacaoId));

      return {
        id: input.solicitacaoId,
        status: novoStatus,
        confirmacao: input.confirmacao,
        mensagem: input.confirmacao
          ? "Confirmação enviada para o administrador"
          : "Solicitação rejeitada",
      };
    }),

  /**
   * Aprovar e fazer alteração (ADMIN)
   * Funciona em ambos os cenários:
   * - CENÁRIO 1: Admin faz alteração DIRETO (sem validação do Líder)
   * - CENÁRIO 2: Admin faz alteração após Líder confirmar SIM
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
      if (solicitacao[0].status !== "pendente_admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitação não está aguardando aprovação do admin",
        });
      }

      // REGRA CRÍTICA #10 REFINADA:
      // Se a solicitação veio de "pendente_confirmacao_lider", validar que Líder confirmou SIM
      if (
        solicitacao[0].liderConfirmacao === false ||
        (solicitacao[0].liderConfirmacao === null &&
          solicitacao[0].liderConfirmadoPor !== null)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Líder não confirmou concordância com a alteração. Admin não pode proceder.",
        });
      }

      // Se aprovada, fazer o ajuste na ação
      if (input.aprovada) {
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

        // Validar que novo prazo está dentro do ciclo (Regra #9)
        if (input.novoPrazo) {
          const pdi = await db
            .select()
            .from(pdis)
            .where(eq(pdis.id, acao[0].pdiId))
            .limit(1);

          if (pdi.length) {
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
            "pendente_confirmacao_lider",
            "pendente_admin",
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
        // Líder vê apenas solicitações que aguardam sua confirmação
        return await query.where(
          eq(adjustmentRequests.status, "pendente_confirmacao_lider")
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

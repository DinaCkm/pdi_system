import { router, protectedProcedure } from "../_core/customTrpc";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { pdis, actions, users, departamentos, adjustmentRequests, notifications } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Notifications Router
 * Procedures para contar pendências e exibir badges de notificação
 */
export const notificationsRouter = router({
  /**
   * Contar PDIs aguardando aprovação do Líder
   * Usado para exibir badge de notificação no menu
   */
  countPdisAwaitingLeaderApproval: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;

      if (user.role !== "lider") {
        return 0;
      }

      try {
        // Contar PDIs com status "em_andamento" que pertencem à equipe do líder
        const departamentoLiderado = await db
          .select()
          .from(departamentos)
          .where(eq(departamentos.leaderId, user.id))
          .limit(1);

        if (!departamentoLiderado.length) {
          return 0;
        }

        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(pdis)
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              eq(pdis.status, "em_andamento"),
              eq(users.departamentoId, departamentoLiderado[0].id)
            )
          );

        return Number(result[0]?.count) || 0;
      } catch (error) {
        console.error("Erro ao contar PDIs aguardando aprovação:", error);
        return 0;
      }
    }),

  /**
   * Contar ações com evidência pendente (para Admin)
   * Usado para exibir badge de notificação no menu
   */
  countActionsWithPendingEvidence: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;

      if (user.role !== "admin") {
        return 0;
      }

      try {
        // Contar ações com status "evidencia_enviada"
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(actions)
          .where(eq(actions.status, "evidencia_enviada"));

        return Number(result[0]?.count) || 0;
      } catch (error) {
        console.error("Erro ao contar ações com evidência pendente:", error);
        return 0;
      }
    }),

  /**
   * Contar solicitações de ajuste pendentes (para Admin)
   * Usado para exibir badge de notificação no menu
   */
  countPendingAdjustmentRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;

      if (user.role !== "admin") {
        return 0;
      }

      try {
        // Contar solicitações com status "pendente"
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(adjustmentRequests)
          .where(eq(adjustmentRequests.status, "pendente"));

        return Number(result[0]?.count) || 0;
      } catch (error) {
        console.error("Erro ao contar solicitações de ajuste pendentes:", error);
        return 0;
      }
    }),

  /**
   * Obter todas as pendências do usuário (resumo)
   * Usado para exibir notificações gerais
   */
  getPendenciesSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;

      const summary = {
        pdisAwaitingApproval: 0,
        actionsWithPendingEvidence: 0,
        pendingAdjustmentRequests: 0,
        total: 0,
      };

      try {
        if (user.role === "lider") {
          const departamentoLiderado = await db
            .select()
            .from(departamentos)
            .where(eq(departamentos.leaderId, user.id))
            .limit(1);

          if (departamentoLiderado.length) {
            const result = await db
              .select({ count: sql<number>`count(*)` })
              .from(pdis)
              .innerJoin(users, eq(pdis.colaboradorId, users.id))
              .where(
                and(
                  eq(pdis.status, "em_andamento"),
                  eq(users.departamentoId, departamentoLiderado[0].id)
                )
              );

            summary.pdisAwaitingApproval = Number(result[0]?.count) || 0;
          }
        }

        if (user.role === "admin") {
          const actionsResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(actions)
            .where(eq(actions.status, "evidencia_enviada"));

          summary.actionsWithPendingEvidence = Number(actionsResult[0]?.count) || 0;

          const adjustmentsResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(adjustmentRequests)
            .where(eq(adjustmentRequests.status, "pendente"));

          summary.pendingAdjustmentRequests = Number(adjustmentsResult[0]?.count) || 0;
        }

        summary.total = 
          summary.pdisAwaitingApproval + 
          summary.actionsWithPendingEvidence + 
          summary.pendingAdjustmentRequests;

        return summary;
      } catch (error) {
        console.error("Erro ao obter resumo de pendências:", error);
        return summary;
      }
    }),

  /**
   * Obter contadores de itens não lidos/pendentes específicos por role
   * Usado para exibir badges no menu lateral
   * 
   * Admin (Dina): Evidências com status 'evidencia_enviada'
   * Líder: Ajustes com status 'aguardando_lider'
   * Colaborador: Mensagens não lidas em notifications
   */
  getUnreadCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;

      const counts = {
        evidenciasPendentes: 0,
        ajustesPendentes: 0,
        mensagensNaoLidas: 0,
        total: 0,
      };

      try {
        // Admin: Contar evidências com status 'evidencia_enviada'
        if (user.role === "admin") {
          const evidenciasResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(actions)
            .where(eq(actions.status, "evidencia_enviada"));

          counts.evidenciasPendentes = Number(evidenciasResult[0]?.count) || 0;
        }

        // Líder: Contar ajustes com status 'aguardando_lider'
        if (user.role === "lider") {
          const ajustesResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(adjustmentRequests)
            .where(eq(adjustmentRequests.status, "aguardando_lider"));

          counts.ajustesPendentes = Number(ajustesResult[0]?.count) || 0;
        }

        // Colaborador: Contar mensagens não lidas
        if (user.role === "colaborador") {
          try {
            const notificationsResult = await db
              .select({ count: sql<number>`count(*)` })
              .from(notifications)
              .where(
                and(
                  eq(notifications.destinatarioId, user.id),
                  eq(notifications.lida, false)
                )
              );

            counts.mensagensNaoLidas = Number(notificationsResult[0]?.count) || 0;
          } catch (e) {
            // Tabela notifications pode não existir, ignorar erro
            counts.mensagensNaoLidas = 0;
          }
        }

        counts.total = 
          counts.evidenciasPendentes + 
          counts.ajustesPendentes + 
          counts.mensagensNaoLidas;

        return counts;
      } catch (error) {
        console.error("Erro ao obter contadores não lidos:", error);
        return counts;
      }
    }),
});

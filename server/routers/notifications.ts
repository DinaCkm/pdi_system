import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { pdis, actions, users, departamentos, adjustmentRequests } from "../../drizzle/schema";
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
        // Contar PDIs com status "aguardando_aprovacao" que pertencem à equipe do líder
        const departamentoLiderado = await db
          .select()
          .from(departamentos)
          .where(eq(departamentos.leaderId, user.id))
          .limit(1);

        if (!departamentoLiderado.length) {
          return 0;
        }

        const result = await db
          .select({ count: db.fn.count() })
          .from(pdis)
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              eq(pdis.status, "aguardando_aprovacao"),
              eq(users.departamentoId, departamentoLiderado[0].id)
            )
          );

        return result[0]?.count || 0;
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
        // Contar ações com status "aguardando_evidencia"
        const result = await db
          .select({ count: db.fn.count() })
          .from(actions)
          .where(eq(actions.status, "aguardando_evidencia"));

        return result[0]?.count || 0;
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
          .select({ count: db.fn.count() })
          .from(adjustmentRequests)
          .where(eq(adjustmentRequests.status, "pendente"));

        return result[0]?.count || 0;
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
              .select({ count: db.fn.count() })
              .from(pdis)
              .innerJoin(users, eq(pdis.colaboradorId, users.id))
              .where(
                and(
                  eq(pdis.status, "aguardando_aprovacao"),
                  eq(users.departamentoId, departamentoLiderado[0].id)
                )
              );

            summary.pdisAwaitingApproval = result[0]?.count || 0;
          }
        }

        if (user.role === "admin") {
          const actionsResult = await db
            .select({ count: db.fn.count() })
            .from(actions)
            .where(eq(actions.status, "aguardando_evidencia"));

          summary.actionsWithPendingEvidence = actionsResult[0]?.count || 0;

          const adjustmentsResult = await db
            .select({ count: db.fn.count() })
            .from(adjustmentRequests)
            .where(eq(adjustmentRequests.status, "pendente"));

          summary.pendingAdjustmentRequests = adjustmentsResult[0]?.count || 0;
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
});

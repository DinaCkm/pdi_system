import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { pdis, actions, users, departamentos } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Dashboard Router
 * Procedures para retornar estatísticas e métricas do sistema
 */
export const dashboardRouter = router({
  /**
   * Obter estatísticas gerais do dashboard
   * Retorna 4 blocos de informação com hierarquia de acesso
   */
  getStats: protectedProcedure
    .input(
      z.object({
        departamentoId: z.number().optional(), // Filtro opcional para Admin
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { user } = ctx;
      const stats = {
        blocoA: {
          totalColaboradores: 0,
          totalLideres: 0,
          taxaEngajamento: 0, // PDIs ativos / Total colaboradores
        },
        blocoB: {
          pendente: 0,
          emAndamento: 0,
          concluida: 0,
          percentualPendente: 0,
          percentualEmAndamento: 0,
          percentualConcluida: 0,
        },
        blocoC: {
          top5Departamentos: [] as Array<{
            departamentoId: number;
            departamentoNome: string;
            taxaConclusao: number;
            acoesConcluidas: number;
            acoesTotal: number;
          }>,
        },
        blocoD: {
          top10Colaboradores: [] as Array<{
            colaboradorId: number;
            colaboradorNome: string;
            acoesConcluidasTotal: number;
            posicao: number;
            medalha?: "ouro" | "prata" | "bronze";
          }>,
        },
      };

      try {
        // Determinar filtro de departamento baseado no role
        let departamentoFilter: number | null = null;

        if (user.role === "lider") {
          // Líder vê apenas sua equipe
          const departamentoLiderado = await db
            .select()
            .from(departamentos)
            .where(eq(departamentos.leaderId, user.id))
            .limit(1);

          if (departamentoLiderado.length > 0) {
            departamentoFilter = departamentoLiderado[0].id;
          }
        } else if (user.role === "colaborador") {
          // Colaborador vê apenas sua equipe (seu departamento)
          const userData = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (userData.length > 0 && userData[0].departamentoId) {
            departamentoFilter = userData[0].departamentoId;
          }
        } else if (user.role === "admin" && input.departamentoId) {
          // Admin pode filtrar por departamento específico
          departamentoFilter = input.departamentoId;
        }

        // ============= BLOCO A: KPIs GERAIS =============
        if (departamentoFilter) {
          // Filtrado por departamento
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.departamentoId, departamentoFilter),
                eq(users.role, "colaborador")
              )
            );

          const lideresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.departamentoId, departamentoFilter),
                eq(users.role, "lider")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = lideresResult[0]?.count || 0;
        } else if (user.role === "admin") {
          // Admin vendo tudo
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.role, "colaborador"));

          const lideresResult = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.role, "lider"));

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = lideresResult[0]?.count || 0;
        }

        // Taxa de engajamento: PDIs ativos / Total colaboradores
        if (stats.blocoA.totalColaboradores > 0) {
          const pdisAtivosResult = await db
            .select({ count: count() })
            .from(pdis)
            .where(
              departamentoFilter
                ? and(
                    eq(pdis.status, "ativo"),
                    eq(pdis.departamentoId, departamentoFilter)
                  )
                : eq(pdis.status, "ativo")
            );

          const pdisAtivos = pdisAtivosResult[0]?.count || 0;
          stats.blocoA.taxaEngajamento =
            Math.round((pdisAtivos / stats.blocoA.totalColaboradores) * 100) ||
            0;
        }

        // ============= BLOCO B: FUNIL DE EXECUÇÃO =============
        const statusCounts = await db
          .select({
            status: actions.status,
            count: count(),
          })
          .from(actions)
          .where(
            departamentoFilter
              ? eq(actions.departamentoId, departamentoFilter)
              : undefined
          )
          .groupBy(actions.status);

        const totalAcoes = statusCounts.reduce((sum, item) => sum + item.count, 0);

        statusCounts.forEach((item) => {
          if (item.status === "pendente") {
            stats.blocoB.pendente = item.count;
          } else if (item.status === "em_andamento") {
            stats.blocoB.emAndamento = item.count;
          } else if (item.status === "concluida") {
            stats.blocoB.concluida = item.count;
          }
        });

        if (totalAcoes > 0) {
          stats.blocoB.percentualPendente = Math.round(
            (stats.blocoB.pendente / totalAcoes) * 100
          );
          stats.blocoB.percentualEmAndamento = Math.round(
            (stats.blocoB.emAndamento / totalAcoes) * 100
          );
          stats.blocoB.percentualConcluida = Math.round(
            (stats.blocoB.concluida / totalAcoes) * 100
          );
        }

        // ============= BLOCO C: TOP 5 DEPARTAMENTOS =============
        if (user.role === "admin" || user.role === "lider") {
          const departamentosStats = await db
            .select({
              departamentoId: departamentos.id,
              departamentoNome: departamentos.nome,
              acoesConcluidas: count(
                sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`
              ),
              acoesTotal: count(),
            })
            .from(departamentos)
            .leftJoin(actions, eq(actions.departamentoId, departamentos.id))
            .groupBy(departamentos.id, departamentos.nome)
            .orderBy(desc(sql`acoesConcluidas / NULLIF(COUNT(*), 0)`))
            .limit(5);

          stats.blocoC.top5Departamentos = departamentosStats
            .map((item) => ({
              departamentoId: item.departamentoId,
              departamentoNome: item.departamentoNome,
              acoesConcluidas: item.acoesConcluidas || 0,
              acoesTotal: item.acoesTotal || 0,
              taxaConclusao:
                item.acoesTotal > 0
                  ? Math.round(
                      ((item.acoesConcluidas || 0) / item.acoesTotal) * 100
                    )
                  : 0,
            }))
            .sort((a, b) => b.taxaConclusao - a.taxaConclusao);
        }

        // ============= BLOCO D: TOP 10 COLABORADORES =============
        const colaboradoresStats = await db
          .select({
            colaboradorId: users.id,
            colaboradorNome: users.name,
            acoesConcluidasTotal: count(
              sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`
            ),
          })
          .from(users)
          .leftJoin(actions, eq(actions.colaboradorId, users.id))
          .where(
            departamentoFilter
              ? and(
                  eq(users.role, "colaborador"),
                  eq(users.departamentoId, departamentoFilter)
                )
              : eq(users.role, "colaborador")
          )
          .groupBy(users.id, users.name)
          .orderBy(desc(sql`COUNT(CASE WHEN ${actions.status} = 'concluida' THEN 1 END)`))
          .limit(11); // Pegar 11 para verificar empate no 10º

        // Aplicar regra de empate
        let posicao = 1;
        let ultimoValor = -1;
        const top10Final = [];

        for (const item of colaboradoresStats) {
          if (item.acoesConcluidasTotal !== ultimoValor) {
            if (top10Final.length >= 10 && item.acoesConcluidasTotal !== ultimoValor) {
              break;
            }
            posicao = top10Final.length + 1;
            ultimoValor = item.acoesConcluidasTotal;
          }

          top10Final.push({
            colaboradorId: item.colaboradorId,
            colaboradorNome: item.colaboradorNome || "Sem nome",
            acoesConcluidasTotal: item.acoesConcluidasTotal || 0,
            posicao,
            medalha:
              posicao === 1 ? "ouro" : posicao === 2 ? "prata" : posicao === 3 ? "bronze" : undefined,
          });
        }

        stats.blocoD.top10Colaboradores = top10Final;

        return stats;
      } catch (error) {
        console.error("Erro ao obter estatísticas do dashboard:", error);
        return stats;
      }
    }),
});

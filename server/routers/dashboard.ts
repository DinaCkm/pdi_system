import { router, protectedProcedure } from "../_core/customTrpc";
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
            acoesTotal: number;
            taxaConclusao: number;
            posicao: number;
            medalha?: "ouro" | "prata" | "bronze";
          }>,
        },
        // Bloco E: Estatísticas pessoais do colaborador
        blocoE: {
          minhasAcoesTotal: 0,
          minhasAcoesConcluidas: 0,
          minhaTaxaConclusao: 0,
          minhaPosicaoRanking: 0,
        },
      };

      try {
        // Determinar filtro baseado no role
        let departamentoFilter: number | null = null;
        let leaderFilter: number | null = null; // Novo filtro para líderes

        if (user.role === "lider") {
          // Líder vê apenas sua equipe (colaboradores que têm ele como líder)
          leaderFilter = user.id;
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
        if (leaderFilter) {
          // Líder: contar colaboradores que têm ele como líder
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.leaderId, leaderFilter),
                eq(users.status, "ativo")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = 1; // O próprio líder
        } else if (departamentoFilter) {
          // Filtrado por departamento
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.departamentoId, departamentoFilter),
                eq(users.role, "colaborador"),
                eq(users.status, "ativo")
              )
            );

          const lideresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.departamentoId, departamentoFilter),
                eq(users.role, "lider"),
                eq(users.status, "ativo")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = lideresResult[0]?.count || 0;
        } else if (user.role === "admin") {
          // Admin vendo tudo - CONTAR LÍDERES E COLABORADORES SEPARADAMENTE
          const colaboradoresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.role, "colaborador"),
                eq(users.status, "ativo")
              )
            );

          const lideresResult = await db
            .select({ count: count() })
            .from(users)
            .where(
              and(
                eq(users.role, "lider"),
                eq(users.status, "ativo")
              )
            );

          stats.blocoA.totalColaboradores = colaboradoresResult[0]?.count || 0;
          stats.blocoA.totalLideres = lideresResult[0]?.count || 0;
        }

        // Taxa de engajamento: Ações Concluídas / Total de Ações
        let acoesQuery = db
          .select({
            total: count(),
            concluidas: count(sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`),
          })
          .from(actions)
          .leftJoin(pdis, eq(actions.pdiId, pdis.id))
          .leftJoin(users, eq(pdis.colaboradorId, users.id));
        
        if (leaderFilter) {
          acoesQuery = acoesQuery.where(eq(users.leaderId, leaderFilter));
        } else if (departamentoFilter) {
          acoesQuery = acoesQuery.where(eq(users.departamentoId, departamentoFilter));
        }
        
        const acoesResult = await acoesQuery;
        const totalAcoesEngajamento = acoesResult[0]?.total || 0;
        const acoesConcluidasEngajamento = acoesResult[0]?.concluidas || 0;
        
        if (totalAcoesEngajamento > 0) {
          stats.blocoA.taxaEngajamento = Math.round((acoesConcluidasEngajamento / totalAcoesEngajamento) * 100);
        }

        // ============= BLOCO B: FUNIL DE EXECUÇÃO =============
        let statusCountsQuery = db
          .select({
            status: actions.status,
            count: count(),
          })
          .from(actions)
          .leftJoin(pdis, eq(actions.pdiId, pdis.id))
          .leftJoin(users, eq(pdis.colaboradorId, users.id));

        if (leaderFilter) {
          statusCountsQuery = statusCountsQuery.where(eq(users.leaderId, leaderFilter));
        } else if (departamentoFilter) {
          statusCountsQuery = statusCountsQuery.where(
            eq(users.departamentoId, departamentoFilter)
          );
        }

        const statusCounts = await statusCountsQuery.groupBy(actions.status);

        const totalAcoes = statusCounts.reduce((sum: number, item: { status: string | null; count: number }) => sum + item.count, 0);

        statusCounts.forEach((item: { status: string | null; count: number }) => {
          if (item.status === "nao_iniciada" || item.status === "pendente") {
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
        // Só mostra para admin (para líder não faz sentido ver ranking de departamentos)
        if (user.role === "admin") {
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
            .leftJoin(users, eq(users.departamentoId, departamentos.id))
            .leftJoin(pdis, eq(pdis.colaboradorId, users.id))
            .leftJoin(actions, eq(actions.pdiId, pdis.id))
            .groupBy(departamentos.id, departamentos.nome)
            .orderBy(desc(sql`COUNT(CASE WHEN ${actions.status} = 'concluida' THEN 1 END)`))
            .limit(5);

          stats.blocoC.top5Departamentos = departamentosStats
            .map((item: { departamentoId: number; departamentoNome: string | null; acoesConcluidas: number; acoesTotal: number }) => ({
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
            .sort((a: { departamentoId: number; departamentoNome: string | null; acoesConcluidas: number; acoesTotal: number; taxaConclusao: number }, b: { departamentoId: number; departamentoNome: string | null; acoesConcluidas: number; acoesTotal: number; taxaConclusao: number }) => b.taxaConclusao - a.taxaConclusao);
        }

        // ============= BLOCO D: TOP 10 COLABORADORES =============
        // Para líder: mostrar apenas colaboradores da sua equipe
        // Para admin/colaborador: mostrar todos (ou filtrado por departamento)
        let colaboradoresStatsQuery = db
          .select({
            colaboradorId: users.id,
            colaboradorNome: users.name,
            acoesConcluidasTotal: count(
              sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`
            ),
            acoesTotal: count(actions.id),
          })
          .from(users)
          .leftJoin(pdis, eq(pdis.colaboradorId, users.id))
          .leftJoin(actions, eq(actions.pdiId, pdis.id));

        if (leaderFilter) {
          // Líder vê apenas seus colaboradores diretos
          colaboradoresStatsQuery = colaboradoresStatsQuery.where(
            and(
              eq(users.leaderId, leaderFilter),
              eq(users.status, "ativo")
            )
          );
        } else if (departamentoFilter) {
          // Filtrado por departamento
          colaboradoresStatsQuery = colaboradoresStatsQuery.where(
            and(
              eq(users.departamentoId, departamentoFilter),
              eq(users.role, "colaborador"),
              eq(users.status, "ativo")
            )
          );
        } else {
          // Admin vendo todos
          colaboradoresStatsQuery = colaboradoresStatsQuery.where(
            and(
              eq(users.role, "colaborador"),
              eq(users.status, "ativo")
            )
          );
        }

        const colaboradoresStats = await colaboradoresStatsQuery.groupBy(users.id, users.name);

        // Calcular taxa de conclusão e filtrar quem tem ações concluídas
        const colaboradoresComTaxa = colaboradoresStats
          .map((item: { colaboradorId: number | null; colaboradorNome: string | null; acoesConcluidasTotal: number; acoesTotal: number }) => ({
            colaboradorId: item.colaboradorId as number,
            colaboradorNome: (item.colaboradorNome || "Sem nome") as string,
            acoesConcluidasTotal: (item.acoesConcluidasTotal || 0) as number,
            acoesTotal: (item.acoesTotal || 0) as number,
            taxaConclusao: item.acoesTotal > 0 
              ? Math.round(((item.acoesConcluidasTotal || 0) / item.acoesTotal) * 100) 
              : 0,
          }))
          // Filtrar apenas quem tem ações concluídas (> 0)
          .filter((item: { colaboradorId: number; colaboradorNome: string; acoesConcluidasTotal: number; acoesTotal: number; taxaConclusao: number }) => item.acoesConcluidasTotal > 0)
          // Ordenar por taxa de conclusão (desc), depois por quantidade (desc) como desempate
          .sort((a: { colaboradorId: number; colaboradorNome: string; acoesConcluidasTotal: number; acoesTotal: number; taxaConclusao: number }, b: { colaboradorId: number; colaboradorNome: string; acoesConcluidasTotal: number; acoesTotal: number; taxaConclusao: number }) => {
            if (b.taxaConclusao !== a.taxaConclusao) {
              return b.taxaConclusao - a.taxaConclusao;
            }
            return b.acoesConcluidasTotal - a.acoesConcluidasTotal;
          })
          .slice(0, 10); // Pegar top 10

        // Aplicar posição e medalhas
        let posicao = 1;
        let ultimaTaxa = -1;
        const top10Final: Array<{
          colaboradorId: number;
          colaboradorNome: string;
          acoesConcluidasTotal: number;
          acoesTotal: number;
          taxaConclusao: number;
          posicao: number;
          medalha?: "ouro" | "prata" | "bronze";
        }> = [];

        for (const item of colaboradoresComTaxa) {
          // Se a taxa for diferente da anterior, atualiza a posição
          if (item.taxaConclusao !== ultimaTaxa) {
            posicao = top10Final.length + 1;
            ultimaTaxa = item.taxaConclusao;
          }

          top10Final.push({
            ...item,
            posicao,
            medalha:
              posicao === 1 ? "ouro" : posicao === 2 ? "prata" : posicao === 3 ? "bronze" : undefined,
          });
        }

        stats.blocoD.top10Colaboradores = top10Final;

        // ============= BLOCO E: ESTATÍSTICAS PESSOAIS DO COLABORADOR =============
        if (user.role === "colaborador") {
          // Buscar PDIs do colaborador logado
          const meusPDIs = await db
            .select({ id: pdis.id })
            .from(pdis)
            .where(eq(pdis.colaboradorId, user.id));
          
          const meusPDIIds = meusPDIs.map((p: { id: number }) => p.id);
          
          if (meusPDIIds.length > 0) {
            // Contar minhas ações
            const minhasAcoesResult = await db
              .select({
                total: count(),
                concluidas: count(sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`),
              })
              .from(actions)
              .where(sql`${actions.pdiId} IN (${sql.join(meusPDIIds.map((id: number) => sql`${id}`), sql`, `)})`);
            
            stats.blocoE.minhasAcoesTotal = minhasAcoesResult[0]?.total || 0;
            stats.blocoE.minhasAcoesConcluidas = minhasAcoesResult[0]?.concluidas || 0;
            stats.blocoE.minhaTaxaConclusao = stats.blocoE.minhasAcoesTotal > 0
              ? Math.round((stats.blocoE.minhasAcoesConcluidas / stats.blocoE.minhasAcoesTotal) * 100)
              : 0;
          }
          
          // Encontrar minha posição no ranking geral
          const minhaEntrada = colaboradoresComTaxa.find(
            (c: { colaboradorId: number }) => c.colaboradorId === user.id
          );
          if (minhaEntrada) {
            const minhaPosicao = colaboradoresComTaxa.findIndex(
              (c: { colaboradorId: number }) => c.colaboradorId === user.id
            ) + 1;
            stats.blocoE.minhaPosicaoRanking = minhaPosicao;
          }
        }

        return stats;
      } catch (error) {
        console.error("Erro ao obter estatísticas do dashboard:", error);
        return stats;
      }
    }),
});

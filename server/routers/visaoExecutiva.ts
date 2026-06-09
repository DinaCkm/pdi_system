import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes } from "../../drizzle/schema";
import { eq, and, sql, count, avg } from "drizzle-orm";

export const visaoExecutivaRouter = router({
  /**
   * Bloco 1: Progresso Geral de Execução do PDI no Sebrae TO
   */
  getProgressoGeral: adminOrGerenteProcedure
    .input((val: any) => ({
      departamentoId: val?.departamentoId as number | undefined,
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { departamentoId } = input;

        // Construir a query base com filtro de departamento se fornecido
        let query = db
          .select({
            totalAcoes: count(actions.id),
            acoesConcluidas: count(
              sql`CASE WHEN ${actions.status} = 'concluido' THEN 1 END`
            ),
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (departamentoId) {
          query = query.where(eq(users.departamentoId, departamentoId));
        }

        const progressoGeral = await query;

        // Progresso por tipo de PDI
        const progressoPorTipo = await db
          .select({
            tipo: sql`'certificacao'`,
            totalAcoes: count(actions.id),
            acoesConcluidas: count(
              sql`CASE WHEN ${actions.status} = 'concluido' THEN 1 END`
            ),
            acoesEmAberto: count(
              sql`CASE WHEN ${actions.status} != 'concluido' THEN 1 END`
            ),
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            departamentoId
              ? and(
                  eq(users.departamentoId, departamentoId),
                  eq(pdis.titulo, sql`'PDI 01/2026 — Base: Certificação'`)
                )
              : eq(pdis.titulo, sql`'PDI 01/2026 — Base: Certificação'`)
          );

        return {
          progressoGeral: progressoGeral[0] || {
            totalAcoes: 0,
            acoesConcluidas: 0,
          },
          progressoPorTipo: progressoPorTipo || [],
        };
      } catch (error) {
        console.error("Erro ao buscar progresso geral:", error);
        throw error;
      }
    }),

  /**
   * Bloco 2: Média de Ações por Empregado
   */
  getMediaAcoesPorEmpregado: adminOrGerenteProcedure
    .input((val: any) => ({
      departamentoId: val?.departamentoId as number | undefined,
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { departamentoId } = input;

        // Total de empregados
        let queryEmpregados = db
          .select({
            total: count(users.id),
          })
          .from(users)
          .where(eq(users.role, "colaborador"));

        if (departamentoId) {
          queryEmpregados = queryEmpregados.where(
            eq(users.departamentoId, departamentoId)
          );
        }

        const empregados = await queryEmpregados;

        // Total de ações
        let queryAcoes = db
          .select({
            total: count(actions.id),
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (departamentoId) {
          queryAcoes = queryAcoes.where(eq(users.departamentoId, departamentoId));
        }

        const acoes = await queryAcoes;

        const totalEmpregados = empregados[0]?.total || 0;
        const totalAcoes = acoes[0]?.total || 0;
        const mediaGeral = totalEmpregados > 0 ? totalAcoes / totalEmpregados : 0;

        return {
          totalEmpregados,
          mediaGeral: parseFloat(mediaGeral.toFixed(1)),
          totalAcoes,
        };
      } catch (error) {
        console.error("Erro ao buscar média de ações por empregado:", error);
        throw error;
      }
    }),

  /**
   * Bloco 3: Situação Atual das Ações
   */
  getSituacaoAtualAcoes: adminOrGerenteProcedure
    .input((val: any) => ({
      departamentoId: val?.departamentoId as number | undefined,
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { departamentoId } = input;

        // Ações aprovadas pelo líder
        let queryAprovadas = db
          .select({
            total: count(actions.id),
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              sql`${actions.status} IN ('concluido', 'em_andamento')`,
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const aprovadas = await queryAprovadas;

        // Ações executadas e concluídas
        let queryExecutadas = db
          .select({
            total: count(actions.id),
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              eq(actions.status, "concluido"),
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const executadas = await queryExecutadas;

        // Ações com prazo vencido
        let queryVencidas = db
          .select({
            total: count(actions.id),
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              sql`${actions.prazo} < CURDATE()`,
              sql`${actions.status} != 'concluido'`,
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const vencidas = await queryVencidas;

        return {
          acoesAprovadas: aprovadas[0]?.total || 0,
          acoesExecutadas: executadas[0]?.total || 0,
          acoesVencidas: vencidas[0]?.total || 0,
        };
      } catch (error) {
        console.error("Erro ao buscar situação atual das ações:", error);
        throw error;
      }
    }),

  /**
   * Bloco 4: Situação das Comprovações e Impacto Prático
   */
  getSituacaoComprovacoes: adminOrGerenteProcedure
    .input((val: any) => ({
      departamentoId: val?.departamentoId as number | undefined,
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { departamentoId } = input;

        // Comprovações aguardando avaliação
        let queryAguardando = db
          .select({
            total: count(evidences.id),
          })
          .from(evidences)
          .innerJoin(actions, eq(evidences.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              eq(evidences.status, "aguardando_avaliacao"),
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const aguardando = await queryAguardando;

        // Comprovações devolvidas
        let queryDevolvidas = db
          .select({
            total: count(evidences.id),
          })
          .from(evidences)
          .innerJoin(actions, eq(evidences.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              eq(evidences.status, "correcao_solicitada"),
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const devolvidas = await queryDevolvidas;

        // Impacto prático das ações (média de impactoPercentual)
        let queryImpacto = db
          .select({
            mediaImpacto: avg(evidences.impactoPercentual),
          })
          .from(evidences)
          .innerJoin(actions, eq(evidences.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id))
          .where(
            and(
              eq(evidences.status, "aprovada"),
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const impacto = await queryImpacto;

        return {
          comprovacoeAguardando: aguardando[0]?.total || 0,
          comprovacoeDevolvidas: devolvidas[0]?.total || 0,
          impactoPratico: impacto[0]?.mediaImpacto
            ? parseFloat(Number(impacto[0].mediaImpacto).toFixed(2))
            : 0,
        };
      } catch (error) {
        console.error("Erro ao buscar situação de comprovações:", error);
        throw error;
      }
    }),

  /**
   * Bloco 5: Solicitações de Inserção de Novas Ações no PDI
   */
  getSolicitacoesInsercao: adminOrGerenteProcedure
    .input((val: any) => ({
      departamentoId: val?.departamentoId as number | undefined,
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { departamentoId } = input;

        // Total de solicitações
        let queryTotal = db
          .select({
            total: count(solicitacoesAcoes.id),
          })
          .from(solicitacoesAcoes)
          .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));

        if (departamentoId) {
          queryTotal = queryTotal.where(eq(users.departamentoId, departamentoId));
        }

        const total = await queryTotal;

        // Solicitações aprovadas
        let queryAprovadas = db
          .select({
            total: count(solicitacoesAcoes.id),
          })
          .from(solicitacoesAcoes)
          .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id))
          .where(
            and(
              eq(solicitacoesAcoes.statusGeral, "aprovada"),
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const aprovadas = await queryAprovadas;

        // Solicitações reprovadas
        let queryReprovadas = db
          .select({
            total: count(solicitacoesAcoes.id),
          })
          .from(solicitacoesAcoes)
          .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id))
          .where(
            and(
              sql`${solicitacoesAcoes.statusGeral} IN ('vetada_gestor', 'vetada_rh')`,
              departamentoId ? eq(users.departamentoId, departamentoId) : undefined
            )
          );

        const reprovadas = await queryReprovadas;

        return {
          totalSolicitacoes: total[0]?.total || 0,
          solicitacoesAprovadas: aprovadas[0]?.total || 0,
          solicitacoesReprovadas: reprovadas[0]?.total || 0,
        };
      } catch (error) {
        console.error("Erro ao buscar solicitações de inserção:", error);
        throw error;
      }
    }),

  /**
   * Endpoint consolidado que retorna todos os dados da Visão Executiva
   */
  getVisaoExecutivaCompleta: adminOrGerenteProcedure
    .input((val: any) => ({
      departamentoId: val?.departamentoId as number | undefined,
    }))
    .query(async ({ input, ctx }) => {
      try {
        // @ts-ignore
        const caller = ctx.createCaller({});
        
        const [progresso, media, situacao, comprovacoes, solicitacoes] =
          await Promise.all([
            // @ts-ignore
            caller.visaoExecutiva.getProgressoGeral(input),
            // @ts-ignore
            caller.visaoExecutiva.getMediaAcoesPorEmpregado(input),
            // @ts-ignore
            caller.visaoExecutiva.getSituacaoAtualAcoes(input),
            // @ts-ignore
            caller.visaoExecutiva.getSituacaoComprovacoes(input),
            // @ts-ignore
            caller.visaoExecutiva.getSolicitacoesInsercao(input),
          ]);

        return {
          progresso,
          media,
          situacao,
          comprovacoes,
          solicitacoes,
        };
      } catch (error) {
        console.error("Erro ao buscar Visão Executiva completa:", error);
        throw error;
      }
    }),
});

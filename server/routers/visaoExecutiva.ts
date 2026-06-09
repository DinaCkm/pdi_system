import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes } from "../../drizzle/schema";
import { eq, and, sql, count, avg } from "drizzle-orm";

// Funções auxiliares para buscar os dados (evita o uso de createCaller)
async function fetchProgressoGeral(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  const progressoPorTipo = await db
    .select({
      tipo: pdis.type,
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
    .where(departamentoId ? eq(users.departamentoId, departamentoId) : undefined)
    .groupBy(pdis.type);

  return {
    progressoGeral: progressoGeral[0] || { totalAcoes: 0, acoesConcluidas: 0 },
    progressoPorTipo: progressoPorTipo || [],
  };
}

async function fetchMediaAcoesPorEmpregado(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let queryEmpregados = db
    .select({ total: count(users.id) })
    .from(users)
    .where(and(eq(users.role, "colaborador"), eq(users.status, "ativo")));

  if (departamentoId) {
    queryEmpregados = queryEmpregados.where(eq(users.departamentoId, departamentoId));
  }

  const empregados = await queryEmpregados;

  let queryAcoes = db
    .select({ total: count(actions.id) })
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
}

async function fetchSituacaoAtualAcoes(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let queryAprovadas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(
      and(
        sql`${actions.status} IN ('concluido', 'em_andamento')`,
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const aprovadas = await queryAprovadas;

  let queryExecutadas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(
      and(
        eq(actions.status, "concluido"),
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const executadas = await queryExecutadas;

  let queryVencidas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(
      and(
        sql`${actions.prazo} < CURDATE()`,
        sql`${actions.status} != 'concluido'`,
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const vencidas = await queryVencidas;

  return {
    acoesAprovadas: aprovadas[0]?.total || 0,
    acoesExecutadas: executadas[0]?.total || 0,
    acoesVencidas: vencidas[0]?.total || 0,
  };
}

async function fetchSituacaoComprovacoes(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let queryAguardando = db
    .select({ total: count(evidences.id) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(
      and(
        eq(evidences.status, "aguardando_avaliacao"),
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const aguardando = await queryAguardando;

  let queryDevolvidas = db
    .select({ total: count(evidences.id) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(
      and(
        eq(evidences.status, "correcao_solicitada"),
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const devolvidas = await queryDevolvidas;

  let queryImpacto = db
    .select({ mediaImpacto: avg(evidences.impactoPercentual) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(
      and(
        eq(evidences.status, "aprovada"),
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const impacto = await queryImpacto;

  return {
    comprovacoeAguardando: aguardando[0]?.total || 0,
    comprovacoeDevolvidas: devolvidas[0]?.total || 0,
    impactoPratico: impacto[0]?.mediaImpacto
      ? parseFloat(Number(impacto[0].mediaImpacto).toFixed(1))
      : 0,
  };
}

async function fetchSolicitacoesInsercao(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let queryTotal = db
    .select({ total: count(solicitacoesAcoes.id) })
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));

  if (departamentoId) {
    queryTotal = queryTotal.where(eq(users.departamentoId, departamentoId));
  }

  const total = await queryTotal;

  let queryAprovadas = db
    .select({ total: count(solicitacoesAcoes.id) })
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id))
    .where(
      and(
        eq(solicitacoesAcoes.statusGeral, "aprovada"),
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const aprovadas = await queryAprovadas;

  let queryReprovadas = db
    .select({ total: count(solicitacoesAcoes.id) })
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id))
    .where(
      and(
        sql`${solicitacoesAcoes.statusGeral} IN ('vetada_gestor', 'vetada_rh')`,
        departamentoId ? eq(users.departamentoId, departamentoId) : sql`1=1`
      )
    );

  const reprovadas = await queryReprovadas;

  return {
    totalSolicitacoes: total[0]?.total || 0,
    solicitacoesAprovadas: aprovadas[0]?.total || 0,
    solicitacoesReprovadas: reprovadas[0]?.total || 0,
  };
}

export const visaoExecutivaRouter = router({
  getProgressoGeral: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => await fetchProgressoGeral(input.departamentoId)),

  getMediaAcoesPorEmpregado: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => await fetchMediaAcoesPorEmpregado(input.departamentoId)),

  getSituacaoAtualAcoes: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => await fetchSituacaoAtualAcoes(input.departamentoId)),

  getSituacaoComprovacoes: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => await fetchSituacaoComprovacoes(input.departamentoId)),

  getSolicitacoesInsercao: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => await fetchSolicitacoesInsercao(input.departamentoId)),

  getVisaoExecutivaCompleta: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => {
      const [progresso, media, situacao, comprovacoes, solicitacoes] = await Promise.all([
        fetchProgressoGeral(input.departamentoId),
        fetchMediaAcoesPorEmpregado(input.departamentoId),
        fetchSituacaoAtualAcoes(input.departamentoId),
        fetchSituacaoComprovacoes(input.departamentoId),
        fetchSolicitacoesInsercao(input.departamentoId),
      ]);

      return { progresso, media, situacao, comprovacoes, solicitacoes };
    }),
});

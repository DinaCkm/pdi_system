import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes, adjustmentRequests } from "../../drizzle/schema";
import { eq, and, sql, count, avg, inArray, lt, ne, or } from "drizzle-orm";

// Funções auxiliares para buscar os dados
async function fetchProgressoGeral(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditionsGeral = [];
  if (departamentoId) {
    conditionsGeral.push(eq(users.departamentoId, departamentoId));
  }

  let queryGeral = db
    .select({
      totalAcoes: count(actions.id),
      acoesConcluidas: count(
        sql`CASE WHEN ${actions.status} = 'concluida' THEN 1 END`
      ),
    })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  if (conditionsGeral.length > 0) {
    queryGeral = queryGeral.where(and(...conditionsGeral));
  }

  const progressoGeralResult = await queryGeral;

  let queryCategorizacao = db
    .select({
      tituloPdi: pdis.titulo,
      statusAcao: actions.status,
    })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  if (conditionsGeral.length > 0) {
    queryCategorizacao = queryCategorizacao.where(and(...conditionsGeral));
  }

  const acoesParaCategorizar = await queryCategorizacao;

  const categorias = {
    certificacao: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
    herdeiras: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
    onboarding: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
  };

  acoesParaCategorizar.forEach((item) => {
    const titulo = (item.tituloPdi || "").toLowerCase();
    const concluida = item.statusAcao === "concluida";
    
    let cat: "certificacao" | "herdeiras" | "onboarding";
    
    if (titulo.includes("certificacao") || titulo.includes("certificação") || titulo.includes("01/2026")) {
      cat = "certificacao";
    } else if (titulo.includes("herdeiras") || titulo.includes("2025") || titulo.includes("pendentes") || titulo.includes("consolidação")) {
      cat = "herdeiras";
    } else if (titulo.includes("onboarding") || titulo.includes("integração") || titulo.includes("novos")) {
      cat = "onboarding";
    } else {
      cat = "certificacao";
    }

    categorias[cat].totalAcoes++;
    if (concluida) {
      categorias[cat].acoesConcluidas++;
    } else {
      categorias[cat].acoesEmAberto++;
    }
  });

  const progressoPorTipo = Object.entries(categorias).map(([tipo, dados]) => ({
    tipo,
    ...dados
  }));

  return {
    progressoGeral: progressoGeralResult[0] || { totalAcoes: 0, acoesConcluidas: 0 },
    progressoPorTipo,
  };
}

async function fetchSituacaoAtualAcoes(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filtro de Departamento base
  const deptFilter = departamentoId ? eq(users.departamentoId, departamentoId) : undefined;

  // Ações Aprovadas: Todas as ações da unidade (já que para estar no PDI devem estar aprovadas ou em fluxo, mas aqui consideramos o total planejado/validado)
  let queryAprovadas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  if (deptFilter) queryAprovadas = queryAprovadas.where(deptFilter);
  const aprovadas = await queryAprovadas;

  // Ações Executadas: Somente as concluídas
  let queryExecutadas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  
  const execConditions = [eq(actions.status, "concluida")];
  if (departamentoId) execConditions.push(eq(users.departamentoId, departamentoId));
  queryExecutadas = queryExecutadas.where(and(...execConditions));
  const executadas = await queryExecutadas;

  // Ações Vencidas: Prazo menor que hoje E não concluída
  let queryVencidas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  const vencConditions = [
    lt(actions.prazo, sql`CURDATE()`),
    ne(actions.status, "concluida")
  ];
  if (departamentoId) vencConditions.push(eq(users.departamentoId, departamentoId));
  queryVencidas = queryVencidas.where(and(...vencConditions));
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

  // Aguardando
  let queryAguardando = db
    .select({ total: count(evidences.id) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  const aguardandoCond = [eq(evidences.status, "aguardando_avaliacao")];
  if (departamentoId) aguardandoCond.push(eq(users.departamentoId, departamentoId));
  queryAguardando = queryAguardando.where(and(...aguardandoCond));
  const aguardando = await queryAguardando;

  // Devolvidas
  let queryDevolvidas = db
    .select({ total: count(evidences.id) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  const devolvidasCond = [eq(evidences.status, "correcao_solicitada")];
  if (departamentoId) devolvidasCond.push(eq(users.departamentoId, departamentoId));
  queryDevolvidas = queryDevolvidas.where(and(...devolvidasCond));
  const devolvidas = await queryDevolvidas;

  // Impacto
  let queryImpacto = db
    .select({ mediaImpacto: avg(evidences.impactoPercentual) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  const impactoCond = [eq(evidences.status, "aprovada")];
  if (departamentoId) impactoCond.push(eq(users.departamentoId, departamentoId));
  queryImpacto = queryImpacto.where(and(...impactoCond));
  const impacto = await queryImpacto;

  return {
    comprovacoesAguardando: aguardando[0]?.total || 0,
    comprovacoesDevolvidas: devolvidas[0]?.total || 0,
    impactoPratico: impacto[0]?.mediaImpacto
      ? parseFloat(Number(impacto[0].mediaImpacto).toFixed(2))
      : 0,
  };
}

async function fetchSolicitacoesInsercao(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let queryBase = db
    .select({ 
      total: count(solicitacoesAcoes.id),
      aprovadas: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aprovada' THEN 1 END`),
      emAnalise: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} IN ('aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante') THEN 1 END`),
      reprovadas: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} IN ('vetada_gestor', 'vetada_rh', 'encerrada_lider') THEN 1 END`)
    })
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));

  if (departamentoId) {
    queryBase = queryBase.where(eq(users.departamentoId, departamentoId));
  }

  const result = await queryBase;
  const total = result[0]?.total || 0;
  const aprovadas = Number(result[0]?.aprovadas || 0);
  const emAnalise = Number(result[0]?.emAnalise || 0);
  const reprovadas = total - aprovadas - emAnalise;

  return {
    totalSolicitacoes: total,
    solicitacoesAprovadas: aprovadas,
    solicitacoesReprovadas: reprovadas,
    solicitacoesEmAndamento: emAnalise,
  };
}

async function fetchPendencias(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Vencidas
  let queryVencidas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  const vencCond = [lt(actions.prazo, sql`CURDATE()`), ne(actions.status, "concluida")];
  if (departamentoId) vencCond.push(eq(users.departamentoId, departamentoId));
  queryVencidas = queryVencidas.where(and(...vencCond));
  const vencidas = await queryVencidas;

  // Em andamento
  let querySolicitacoesAndamento = db
    .select({ 
      total: count(solicitacoesAcoes.id),
      aguardandoCkm: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aguardando_ckm' THEN 1 END`),
      aguardandoGestor: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aguardando_gestor' THEN 1 END`),
      aguardandoRh: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aguardando_rh' THEN 1 END`),
      outros: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} IN ('em_revisao', 'aguardando_solicitante') THEN 1 END`)
    })
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));
  const andamentoCond = [inArray(solicitacoesAcoes.statusGeral, ["aguardando_ckm", "aguardando_gestor", "aguardando_rh", "em_revisao", "aguardando_solicitante"])];
  if (departamentoId) andamentoCond.push(eq(users.departamentoId, departamentoId));
  querySolicitacoesAndamento = querySolicitacoesAndamento.where(and(...andamentoCond));
  const solicitacoesAndamento = await querySolicitacoesAndamento;

  // Ajustes
  let queryAjustes = db
    .select({ 
      total: count(adjustmentRequests.id),
      aguardandoLider: count(sql`CASE WHEN ${adjustmentRequests.status} = 'aguardando_lider' THEN 1 END`),
      aguardandoAdmin: count(sql`CASE WHEN ${adjustmentRequests.status} = 'pendente' THEN 1 END`),
      maisInformacoes: count(sql`CASE WHEN ${adjustmentRequests.status} = 'mais_informacoes' THEN 1 END`)
    })
    .from(adjustmentRequests)
    .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  const ajustesCond = [inArray(adjustmentRequests.status, ["pendente", "aguardando_lider", "mais_informacoes"])];
  if (departamentoId) ajustesCond.push(eq(users.departamentoId, departamentoId));
  queryAjustes = queryAjustes.where(and(...ajustesCond));
  const ajustes = await queryAjustes;

  return {
    acoesVencidas: vencidas[0]?.total || 0,
    solicitacoesAndamento: {
      total: solicitacoesAndamento[0]?.total || 0,
      aguardandoCkm: Number(solicitacoesAndamento[0]?.aguardandoCkm || 0),
      aguardandoGestor: Number(solicitacoesAndamento[0]?.aguardandoGestor || 0),
      aguardandoRh: Number(solicitacoesAndamento[0]?.aguardandoRh || 0),
      outros: Number(solicitacoesAndamento[0]?.outros || 0),
    },
    ajustesPendentes: {
      total: ajustes[0]?.total || 0,
      aguardandoLider: Number(ajustes[0]?.aguardandoLider || 0),
      aguardandoAdmin: Number(ajustes[0]?.aguardandoAdmin || 0),
      maisInformacoes: Number(ajustes[0]?.maisInformacoes || 0),
    },
  };
}

export const visaoExecutivaRouter = router({
  getVisaoExecutivaCompleta: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => {
      const [progresso, situacao, comprovacoes, solicitacoes, pendencias] = await Promise.all([
        fetchProgressoGeral(input.departamentoId),
        fetchSituacaoAtualAcoes(input.departamentoId),
        fetchSituacaoComprovacoes(input.departamentoId),
        fetchSolicitacoesInsercao(input.departamentoId),
        fetchPendencias(input.departamentoId),
      ]);

      return { progresso, situacao, comprovacoes, solicitacoes, pendencias };
    }),
});

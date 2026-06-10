import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes, adjustmentRequests } from "../../drizzle/schema";
import { eq, and, sql, count, avg, inArray, lt, ne, or } from "drizzle-orm";

// Funções auxiliares para buscar os dados
async function fetchProgressoGeral(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

  if (departamentoId) {
    queryGeral = queryGeral.where(eq(users.departamentoId, departamentoId));
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

  if (departamentoId) {
    queryCategorizacao = queryCategorizacao.where(eq(users.departamentoId, departamentoId));
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
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  if (departamentoId) {
    queryAprovadas = queryAprovadas.where(eq(users.departamentoId, departamentoId));
  }

  const aprovadas = await queryAprovadas;

  let queryExecutadas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(eq(actions.status, "concluida"));

  if (departamentoId) {
    queryExecutadas = queryExecutadas.where(eq(users.departamentoId, departamentoId));
  }

  const executadas = await queryExecutadas;

  let queryVencidas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(and(
      lt(actions.prazo, sql`CURDATE()`),
      ne(actions.status, "concluida")
    ));

  if (departamentoId) {
    queryVencidas = queryVencidas.where(eq(users.departamentoId, departamentoId));
  }

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
    .where(eq(evidences.status, "aguardando_avaliacao"));

  if (departamentoId) {
    queryAguardando = queryAguardando.where(eq(users.departamentoId, departamentoId));
  }

  const aguardando = await queryAguardando;

  let queryDevolvidas = db
    .select({ total: count(evidences.id) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(eq(evidences.status, "correcao_solicitada"));

  if (departamentoId) {
    queryDevolvidas = queryDevolvidas.where(eq(users.departamentoId, departamentoId));
  }

  const devolvidas = await queryDevolvidas;

  let queryImpacto = db
    .select({ mediaImpacto: avg(evidences.impactoPercentual) })
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(eq(evidences.status, "aprovada"));

  if (departamentoId) {
    queryImpacto = queryImpacto.where(eq(users.departamentoId, departamentoId));
  }

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

  // Reconciliação Total de Solicitações:
  // 1. Aprovadas: 'aprovada'
  // 2. Em Análise: 'aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante'
  // 3. Reprovadas / Outros: 'vetada_gestor', 'vetada_rh', 'encerrada_lider'

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
  
  // Para fechar a conta exatamente, o que não é aprovado nem está em análise, é reprovado/outros
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

  let queryVencidas = db
    .select({ total: count(actions.id) })
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(and(
      lt(actions.prazo, sql`CURDATE()`),
      ne(actions.status, "concluida")
    ));

  if (departamentoId) {
    queryVencidas = queryVencidas.where(eq(users.departamentoId, departamentoId));
  }

  const vencidas = await queryVencidas;

  let querySolicitacoesAndamento = db
    .select({ 
      total: count(solicitacoesAcoes.id),
      aguardandoCkm: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aguardando_ckm' THEN 1 END`),
      aguardandoGestor: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aguardando_gestor' THEN 1 END`),
      aguardandoRh: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} = 'aguardando_rh' THEN 1 END`),
      outros: count(sql`CASE WHEN ${solicitacoesAcoes.statusGeral} IN ('em_revisao', 'aguardando_solicitante') THEN 1 END`)
    })
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id))
    .where(inArray(solicitacoesAcoes.statusGeral, ["aguardando_ckm", "aguardando_gestor", "aguardando_rh", "em_revisao", "aguardando_solicitante"]));

  if (departamentoId) {
    querySolicitacoesAndamento = querySolicitacoesAndamento.where(eq(users.departamentoId, departamentoId));
  }

  const solicitacoesAndamento = await querySolicitacoesAndamento;

  let queryAjustes = db
    .select({ total: count(adjustmentRequests.id) })
    .from(adjustmentRequests)
    .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id))
    .where(eq(adjustmentRequests.status, "pendente"));

  if (departamentoId) {
    queryAjustes = queryAjustes.where(eq(users.departamentoId, departamentoId));
  }

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
    ajustesPendentes: ajustes[0]?.total || 0,
  };
}

export const visaoExecutivaRouter = router({
  getVisaoExecutivaCompleta: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => {
      const [progresso, media, situacao, comprovacoes, solicitacoes, pendencias] = await Promise.all([
        fetchProgressoGeral(input.departamentoId),
        fetchMediaAcoesPorEmpregado(input.departamentoId),
        fetchSituacaoAtualAcoes(input.departamentoId),
        fetchSituacaoComprovacoes(input.departamentoId),
        fetchSolicitacoesInsercao(input.departamentoId),
        fetchPendencias(input.departamentoId),
      ]);

      return { progresso, media, situacao, comprovacoes, solicitacoes, pendencias };
    }),
});

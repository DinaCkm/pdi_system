import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes, adjustmentRequests } from "../../drizzle/schema";
import { eq, and, sql, count, avg, inArray, lt, ne, or } from "drizzle-orm";

/**
 * REVISÃO ESTRUTURAL DOS CÁLCULOS DO DASHBOARD
 * Esta versão utiliza queries independentes e explícitas para garantir que os filtros de departamento
 * não interfiram indevidamente nos status das ações.
 */

async function fetchProgressoGeral(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Base para todas as queries de ações
  const baseQuery = () => db
    .select()
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  // 1. Total de Ações
  let qTotal = baseQuery();
  if (departamentoId) qTotal = qTotal.where(eq(users.departamentoId, departamentoId));
  const totalRes = await qTotal;
  const totalAcoes = totalRes.length;

  // 2. Ações Concluídas
  let qConcluidas = baseQuery();
  const condConcluidas = [eq(actions.status, "concluida")];
  if (departamentoId) condConcluidas.push(eq(users.departamentoId, departamentoId));
  qConcluidas = qConcluidas.where(and(...condConcluidas));
  const concluidasRes = await qConcluidas;
  const acoesConcluidas = concluidasRes.length;

  // 3. Categorização por Tipo de PDI
  const categorias = {
    certificacao: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
    herdeiras: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
    onboarding: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
  };

  totalRes.forEach((row) => {
    const item = row.actions;
    const pdi = row.pdis;
    const titulo = (pdi.titulo || "").toLowerCase();
    const concluida = item.status === "concluida";
    
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
    if (concluida) categorias[cat].acoesConcluidas++;
    else categorias[cat].acoesEmAberto++;
  });

  return {
    progressoGeral: { totalAcoes, acoesConcluidas },
    progressoPorTipo: Object.entries(categorias).map(([tipo, dados]) => ({ tipo, ...dados })),
  };
}

async function fetchSituacaoAtualAcoes(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const baseQuery = () => db
    .select()
    .from(actions)
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  // Aprovadas (Total no PDI)
  let qAprovadas = baseQuery();
  if (departamentoId) qAprovadas = qAprovadas.where(eq(users.departamentoId, departamentoId));
  const aprovadas = (await qAprovadas).length;

  // Executadas (Concluídas)
  let qExec = baseQuery();
  const condExec = [eq(actions.status, "concluida")];
  if (departamentoId) condExec.push(eq(users.departamentoId, departamentoId));
  qExec = qExec.where(and(...condExec));
  const executadas = (await qExec).length;

  // Vencidas (Prazo < Hoje AND status != concluida)
  let qVenc = baseQuery();
  const condVenc = [lt(actions.prazo, sql`CURDATE()`), ne(actions.status, "concluida")];
  if (departamentoId) condVenc.push(eq(users.departamentoId, departamentoId));
  qVenc = qVenc.where(and(...condVenc));
  const vencidas = (await qVenc).length;

  return { acoesAprovadas: aprovadas, acoesExecutadas: executadas, acoesVencidas: vencidas };
}

async function fetchSituacaoComprovacoes(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const baseQuery = () => db
    .select()
    .from(evidences)
    .innerJoin(actions, eq(evidences.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));

  // Aguardando
  let qAg = baseQuery();
  const condAg = [eq(evidences.status, "aguardando_avaliacao")];
  if (departamentoId) condAg.push(eq(users.departamentoId, departamentoId));
  const aguardando = (await qAg.where(and(...condAg))).length;

  // Devolvidas
  let qDev = baseQuery();
  const condDev = [eq(evidences.status, "correcao_solicitada")];
  if (departamentoId) condDev.push(eq(users.departamentoId, departamentoId));
  const devolvidas = (await qDev.where(and(...condDev))).length;

  // Impacto
  let qImp = baseQuery();
  const condImp = [eq(evidences.status, "aprovada")];
  if (departamentoId) condImp.push(eq(users.departamentoId, departamentoId));
  const impRes = await qImp.where(and(...condImp));
  const mediaImpacto = impRes.length > 0 
    ? impRes.reduce((acc, curr) => acc + (Number(curr.evidences.impactoPercentual) || 0), 0) / impRes.length 
    : 0;

  return {
    comprovacoesAguardando: aguardando,
    comprovacoesDevolvidas: devolvidas,
    impactoPratico: parseFloat(mediaImpacto.toFixed(2)),
  };
}

async function fetchSolicitacoesInsercao(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let qBase = db
    .select()
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));
  
  if (departamentoId) qBase = qBase.where(eq(users.departamentoId, departamentoId));
  const allSolicitacoes = await qBase;

  const total = allSolicitacoes.length;
  const aprovadas = allSolicitacoes.filter(s => s.solicitacoes_acoes.statusGeral === 'aprovada').length;
  const emAndamento = allSolicitacoes.filter(s => ['aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante'].includes(s.solicitacoes_acoes.statusGeral || '')).length;
  const reprovadas = total - aprovadas - emAndamento;

  return {
    totalSolicitacoes: total,
    solicitacoesAprovadas: aprovadas,
    solicitacoesReprovadas: reprovadas,
    solicitacoesEmAndamento: emAndamento,
  };
}

async function fetchPendencias(departamentoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Vencidas (reuso da lógica anterior para consistência)
  const situacao = await fetchSituacaoAtualAcoes(departamentoId);

  // Solicitações em andamento detalhadas
  let qSol = db
    .select()
    .from(solicitacoesAcoes)
    .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));
  if (departamentoId) qSol = qSol.where(eq(users.departamentoId, departamentoId));
  const sols = await qSol;
  const andamento = sols.filter(s => ['aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante'].includes(s.solicitacoes_acoes.statusGeral || ''));

  // Ajustes detalhados
  let qAj = db
    .select()
    .from(adjustmentRequests)
    .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(pdis.colaboradorId, users.id));
  if (departamentoId) qAj = qAj.where(eq(users.departamentoId, departamentoId));
  const ajustes = (await qAj).filter(a => ['pendente', 'aguardando_lider', 'mais_informacoes'].includes(a.adjustment_requests.status || ''));

  return {
    acoesVencidas: situacao.acoesVencidas,
    solicitacoesAndamento: {
      total: andamento.length,
      aguardandoCkm: andamento.filter(s => s.solicitacoes_acoes.statusGeral === 'aguardando_ckm').length,
      aguardandoGestor: andamento.filter(s => s.solicitacoes_acoes.statusGeral === 'aguardando_gestor').length,
      aguardandoRh: andamento.filter(s => s.solicitacoes_acoes.statusGeral === 'aguardando_rh').length,
      outros: andamento.filter(s => ['em_revisao', 'aguardando_solicitante'].includes(s.solicitacoes_acoes.statusGeral || '')).length,
    },
    ajustesPendentes: {
      total: ajustes.length,
      aguardandoLider: ajustes.filter(a => a.adjustment_requests.status === 'aguardando_lider').length,
      aguardandoAdmin: ajustes.filter(a => a.adjustment_requests.status === 'pendente').length,
      maisInformacoes: ajustes.filter(a => a.adjustment_requests.status === 'mais_informacoes').length,
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

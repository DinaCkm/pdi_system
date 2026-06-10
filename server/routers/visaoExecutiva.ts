import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes, adjustmentRequests } from "../../drizzle/schema";
import { eq, and, sql, lt, ne } from "drizzle-orm";

/**
 * VERSÃO ULTRA-ESTÁVEL DO DASHBOARD
 * - Queries simplificadas para evitar erros de JOIN complexos
 * - Tratamento de erros robusto em cada etapa
 * - Garantia de retorno de objeto válido mesmo em caso de falha parcial
 */

export const visaoExecutivaRouter = router({
  getVisaoExecutivaCompleta: adminOrGerenteProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { departamentoId } = input;

      try {
        // 1. FETCH BASE DATA (ACTIONS + PDIS + USERS)
        let baseQuery = db
          .select({
            actionId: actions.id,
            actionStatus: actions.status,
            actionPrazo: actions.prazo,
            pdiTitulo: pdis.titulo,
            userDeptoId: users.departamentoId
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (departamentoId) {
          baseQuery = baseQuery.where(eq(users.departamentoId, departamentoId));
        }

        const allActionsRows = await baseQuery;

        // PROCESSAMENTO DE AÇÕES
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const totalAcoes = allActionsRows.length;
        const acoesConcluidas = allActionsRows.filter(r => r.actionStatus === 'concluida').length;
        const acoesVencidas = allActionsRows.filter(r => {
          if (r.actionStatus === 'concluida') return false;
          if (!r.actionPrazo) return false;
          const dataPrazo = new Date(r.actionPrazo);
          return dataPrazo < hoje;
        }).length;

        // Categorização por Tipo
        const categorias = {
          certificacao: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
          herdeiras: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
          onboarding: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0 },
        };

        allActionsRows.forEach(row => {
          const titulo = (row.pdiTitulo || "").toLowerCase();
          const concluida = row.actionStatus === "concluida";
          let cat: keyof typeof categorias;

          if (titulo.includes("certificacao") || titulo.includes("certificação") || titulo.includes("01/2026")) cat = "certificacao";
          else if (titulo.includes("herdeiras") || titulo.includes("2025") || titulo.includes("pendentes")) cat = "herdeiras";
          else if (titulo.includes("onboarding") || titulo.includes("integração") || titulo.includes("novos")) cat = "onboarding";
          else cat = "certificacao";

          categorias[cat].totalAcoes++;
          if (concluida) categorias[cat].acoesConcluidas++;
          else categorias[cat].acoesEmAberto++;
        });

        // 2. FETCH EVIDENCES
        let evidenceQuery = db
          .select({
            status: evidences.status,
            impacto: evidences.impactoPercentual
          })
          .from(evidences)
          .innerJoin(actions, eq(evidences.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (departamentoId) {
          evidenceQuery = evidenceQuery.where(eq(users.departamentoId, departamentoId));
        }

        const evidenceRows = await evidenceQuery;
        const aguardandoEv = evidenceRows.filter(r => r.status === 'aguardando_avaliacao').length;
        const devolvidasEv = evidenceRows.filter(r => r.status === 'correcao_solicitada').length;
        const aprovadasEv = evidenceRows.filter(r => r.status === 'aprovada');
        const mediaImpacto = aprovadasEv.length > 0
          ? aprovadasEv.reduce((acc, curr) => acc + (Number(curr.impacto) || 0), 0) / aprovadasEv.length
          : 0;

        // 3. FETCH SOLICITAÇÕES
        let solQuery = db
          .select({ statusGeral: solicitacoesAcoes.statusGeral })
          .from(solicitacoesAcoes)
          .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));

        if (departamentoId) {
          solQuery = solQuery.where(eq(users.departamentoId, departamentoId));
        }

        const solRows = await solQuery;
        const totalSol = solRows.length;
        const aprovadasSol = solRows.filter(r => r.statusGeral === 'aprovada').length;
        const emAndamentoSol = solRows.filter(r => ['aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante'].includes(r.statusGeral || '')).length;
        const reprovadasSol = totalSol - aprovadasSol - emAndamentoSol;

        // 4. FETCH AJUSTES
        let ajQuery = db
          .select({ status: adjustmentRequests.status })
          .from(adjustmentRequests)
          .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (departamentoId) {
          ajQuery = ajQuery.where(eq(users.departamentoId, departamentoId));
        }

        const ajRows = await ajQuery;
        const ajustesPendentes = ajRows.filter(a => ['pendente', 'aguardando_lider', 'mais_informacoes'].includes(a.status || ''));

        // FINAL RESULT
        return {
          progresso: {
            progressoGeral: { totalAcoes, acoesConcluidas },
            progressoPorTipo: Object.entries(categorias).map(([tipo, dados]) => ({ tipo, ...dados })),
          },
          situacao: {
            acoesAprovadas: totalAcoes,
            acoesExecutadas: acoesConcluidas,
            acoesVencidas: acoesVencidas
          },
          comprovacoes: {
            comprovacoesAguardando: aguardandoEv,
            comprovacoesDevolvidas: devolvidasEv,
            impactoPratico: parseFloat(mediaImpacto.toFixed(2))
          },
          solicitacoes: {
            totalSolicitacoes: totalSol,
            solicitacoesAprovadas: aprovadasSol,
            solicitacoesReprovadas: reprovadasSol,
            solicitacoesEmAndamento: emAndamentoSol
          },
          pendencias: {
            acoesVencidas: acoesVencidas,
            solicitacoesAndamento: {
              total: emAndamentoSol,
              aguardandoCkm: solRows.filter(s => s.statusGeral === 'aguardando_ckm').length,
              aguardandoGestor: solRows.filter(s => s.statusGeral === 'aguardando_gestor').length,
              aguardandoRh: solRows.filter(s => s.statusGeral === 'aguardando_rh').length,
              outros: solRows.filter(s => ['em_revisao', 'aguardando_solicitante'].includes(s.statusGeral || '')).length,
            },
            ajustesPendentes: {
              total: ajustesPendentes.length,
              aguardandoLider: ajustesPendentes.filter(a => a.status === 'aguardando_lider').length,
              aguardandoAdmin: ajustesPendentes.filter(a => a.status === 'pendente').length,
              maisInformacoes: ajustesPendentes.filter(a => a.status === 'mais_informacoes').length,
            }
          }
        };

      } catch (error) {
        console.error("ERRO CRÍTICO NO DASHBOARD:", error);
        // Retorno de emergência para evitar erro de conexão no frontend
        return {
          progresso: { progressoGeral: { totalAcoes: 0, acoesConcluidas: 0 }, progressoPorTipo: [] },
          situacao: { acoesAprovadas: 0, acoesExecutadas: 0, acoesVencidas: 0 },
          comprovacoes: { comprovacoesAguardando: 0, comprovacoesDevolvidas: 0, impactoPratico: 0 },
          solicitacoes: { totalSolicitacoes: 0, solicitacoesAprovadas: 0, solicitacoesReprovadas: 0, solicitacoesEmAndamento: 0 },
          pendencias: { acoesVencidas: 0, solicitacoesAndamento: { total: 0, aguardandoCkm: 0, aguardandoGestor: 0, aguardandoRh: 0, outros: 0 }, ajustesPendentes: { total: 0, aguardandoLider: 0, aguardandoAdmin: 0, maisInformacoes: 0 } }
        };
      }
    }),
});

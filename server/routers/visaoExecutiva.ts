import { router, adminOrGerenteProcedure } from "../_core/customTrpc";
import { getDb } from "../db";
import { pdis, actions, users, evidences, solicitacoesAcoes, adjustmentRequests, departamentos } from "../../drizzle/schema";
import { eq, and, sql, lt, ne } from "drizzle-orm";
import { sendEmail } from "../_core/email";

/**
 * VERSÃO DIAGNÓSTICO E CORREÇÃO
 * - Restaurando contagem de evidências (Aguardando/Devolvidas)
 * - Restaurando contagem de solicitações
 * - Ajustando IIP para ignorar nulos
 */

export const visaoExecutivaRouter = router({
  getVisaoExecutivaCompleta: adminOrLeaderProcedure
    .input((val: any) => ({ departamentoId: val?.departamentoId as number | undefined }))
    .query(async ({ input, ctx }) => {
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
            userId: users.id,
            userDeptoId: users.departamentoId
          })
          .from(actions)
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        // Se for líder e não tiver departamentoId selecionado, filtrar pelo departamento dele
        let finalDeptoId = departamentoId;
        if (!finalDeptoId && ctx.user.role === 'lider') {
          finalDeptoId = ctx.user.departmentId;
        }

        if (finalDeptoId) {
          baseQuery = baseQuery.where(eq(users.departamentoId, finalDeptoId));
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

        const acoesEmAndamentoNoPrazo = totalAcoes - acoesConcluidas - acoesVencidas;

        const uniqueUsers = new Set(allActionsRows.map(r => r.userId));
        const totalEmpregados = uniqueUsers.size;
        const mediaAcoesPorEmpregado = totalEmpregados > 0 ? parseFloat((totalAcoes / totalEmpregados).toFixed(1)) : 0;

        // Categorização por Tipo com Média por Empregado
        const categorias = {
          certificacao: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0, empregados: new Set<number>() },
          herdeiras: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0, empregados: new Set<number>() },
          onboarding: { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0, empregados: new Set<number>() },
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
          
          if (row.userId) {
            categorias[cat].empregados.add(row.userId);
          }
        });

        const categoriasFinal = Object.entries(categorias).map(([tipo, dados]) => {
          const totalEmp = dados.empregados.size;
          return {
            tipo,
            totalAcoes: dados.totalAcoes,
            acoesConcluidas: dados.acoesConcluidas,
            acoesEmAberto: dados.acoesEmAberto,
            mediaAcoes: totalEmp > 0 ? parseFloat((dados.totalAcoes / totalEmp).toFixed(1)) : 0
          };
        });

        // 2. FETCH EVIDENCES (CORRIGIDO)
        let evidenceQuery = db
          .select({
            status: evidences.status,
            impacto: evidences.impactoPercentual
          })
          .from(evidences)
          .innerJoin(actions, eq(evidences.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (finalDeptoId) {
          evidenceQuery = evidenceQuery.where(eq(users.departamentoId, finalDeptoId));
        }

        const evidenceRows = await evidenceQuery;
        
        // Status reais observados em logs anteriores: 'aguardando_avaliacao' ou 'aguardando_rh'
        const aguardandoEv = evidenceRows.filter(r => 
          r.status === 'aguardando_avaliacao' || r.status === 'aguardando_rh'
        ).length;
        
        const devolvidasEv = evidenceRows.filter(r => 
          r.status === 'correcao_solicitada' || r.status === 'devolvida'
        ).length;

        const aprovadasComNota = evidenceRows.filter(r => 
          r.status === 'aprovada' && r.impacto !== null && Number(r.impacto) > 0
        );
        
        const mediaImpacto = aprovadasComNota.length > 0
          ? aprovadasComNota.reduce((acc, curr) => acc + (Number(curr.impacto) || 0), 0) / aprovadasComNota.length
          : 0;

        // 3. FETCH SOLICITAÇÕES (CORRIGIDO)
        let solQuery = db
          .select({ statusGeral: solicitacoesAcoes.statusGeral })
          .from(solicitacoesAcoes)
          .innerJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id));

        if (finalDeptoId) {
          solQuery = solQuery.where(eq(users.departamentoId, finalDeptoId));
        }

        const solRows = await solQuery;
        const totalSol = solRows.length;
        const aprovadasSol = solRows.filter(r => r.statusGeral === 'aprovada').length;
        const emAndamentoSol = solRows.filter(r => 
          ['aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante', 'pendente'].includes(r.statusGeral || '')
        ).length;
        const reprovadasSol = totalSol - aprovadasSol - emAndamentoSol;

        // 4. FETCH AJUSTES
        let ajQuery = db
          .select({ status: adjustmentRequests.status })
          .from(adjustmentRequests)
          .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
          .innerJoin(pdis, eq(actions.pdiId, pdis.id))
          .innerJoin(users, eq(pdis.colaboradorId, users.id));

        if (finalDeptoId) {
          ajQuery = ajQuery.where(eq(users.departamentoId, finalDeptoId));
        }

        const ajRows = await ajQuery;
        const ajustesPendentes = ajRows.filter(a => ['pendente', 'aguardando_lider', 'mais_informacoes', 'aguardando_admin'].includes(a.status || ''));

        return {
          progresso: {
            progressoGeral: { totalAcoes, acoesConcluidas, totalEmpregados, mediaAcoesPorEmpregado },
            progressoPorTipo: categoriasFinal,
          },
          situacao: {
            acoesAprovadas: totalAcoes,
            acoesExecutadas: acoesConcluidas,
            acoesVencidas: acoesVencidas,
            acoesEmAndamento: acoesEmAndamentoNoPrazo
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
              outros: solRows.filter(s => ['em_revisao', 'aguardando_solicitante', 'pendente'].includes(s.statusGeral || '')).length,
            },
            ajustesPendentes: {
              total: ajustesPendentes.length,
              aguardandoLider: ajustesPendentes.filter(a => a.status === 'aguardando_lider').length,
              aguardandoAdmin: ajustesPendentes.filter(a => a.status === 'pendente' || a.status === 'aguardando_admin').length,
              maisInformacoes: ajustesPendentes.filter(a => a.status === 'mais_informacoes').length,
            }
          }
        };

      } catch (error) {
        console.error("ERRO NO DASHBOARD:", error);
        return {
          progresso: { progressoGeral: { totalAcoes: 0, acoesConcluidas: 0, totalEmpregados: 0, mediaAcoesPorEmpregado: 0 }, progressoPorTipo: [] },
          situacao: { acoesAprovadas: 0, acoesExecutadas: 0, acoesVencidas: 0 },
          comprovacoes: { comprovacoesAguardando: 0, comprovacoesDevolvidas: 0, impactoPratico: 0 },
          solicitacoes: { totalSolicitacoes: 0, solicitacoesAprovadas: 0, solicitacoesReprovadas: 0, solicitacoesEmAndamento: 0 },
          pendencias: { acoesVencidas: 0, solicitacoesAndamento: { total: 0, aguardandoCkm: 0, aguardandoGestor: 0, aguardandoRh: 0, outros: 0 }, ajustesPendentes: { total: 0, aguardandoLider: 0, aguardandoAdmin: 0, maisInformacoes: 0 } }
        };
      }
    }),
  enviarRelatorioLider: adminOrGerenteProcedure
    .input((val: any) => ({ 
      departamentoId: val?.departamentoId as number,
      dashboardImage: val?.dashboardImage as string // Base64 da imagem
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { departamentoId } = input;
      if (!departamentoId) throw new Error("Departamento não selecionado");

      // 1. Buscar o Líder do Departamento
      const [deptInfo] = await db
        .select({
          deptNome: departamentos.nome,
          leaderName: users.name,
          leaderEmail: users.email
        })
        .from(departamentos)
        .leftJoin(users, eq(departamentos.leaderId, users.id))
        .where(eq(departamentos.id, departamentoId));

      if (!deptInfo || !deptInfo.leaderEmail) {
        throw new Error("Líder do departamento não encontrado ou sem e-mail cadastrado.");
      }

      // 2. Buscar dados para o relatório (reutilizando lógica simplificada)
      const actionsRows = await db
        .select({ status: actions.status, prazo: actions.prazo })
        .from(actions)
        .innerJoin(pdis, eq(actions.pdiId, pdis.id))
        .innerJoin(users, eq(pdis.colaboradorId, users.id))
        .where(eq(users.departamentoId, departamentoId));

      const total = actionsRows.length;
      const concluidas = actionsRows.filter(r => r.status === 'concluida').length;
      const percent = total > 0 ? Math.round((concluidas / total) * 100) : 0;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencidas = actionsRows.filter(r => r.status !== 'concluida' && r.prazo && new Date(r.prazo) < hoje).length;

      // 3. Montar e Enviar E-mail
      const html = `
        <div style="font-family: sans-serif; color: #334155; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background-color: #ffffff;">
          <div style="background-image: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 900;">Relatório Estratégico de PDI</h2>
            <p style="margin: 5px 0 0; opacity: 0.9; font-weight: 600;">Unidade: ${deptInfo.deptNome}</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Olá <strong>${deptInfo.leaderName}</strong>,</p>
            <p style="color: #64748b; line-height: 1.6;">Este é o dashboard estratégico atualizado da sua área. Veja abaixo o status completo das ações e indicadores:</p>
            
            <div style="margin: 25px 0; border: 1px solid #f1f5f9; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <img src="${input.dashboardImage}" alt="Dashboard Estratégico" style="width: 100%; display: block;" />
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://pdi.ecodobem.com/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">ACESSAR SISTEMA PDI</a>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 600;">
              Este e-mail foi gerado pelo Administrador via Visão Executiva.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: deptInfo.leaderEmail,
        subject: `[ESTRATÉGICO] Resumo do PDI - ${deptInfo.deptNome}`,
        body: `Olá ${deptInfo.leaderName}, o progresso do PDI da sua área está em ${percent}%. Acesse o sistema para detalhes.`,
        html: html
      });

      return { success: true };
    }),
});

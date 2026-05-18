import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp, Printer } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface CardProps {
  icon: string;
  pergunta: string;
  titulo: string;
  numero: number | string;
  descricao: string;
  detalhe?: string;
  cor: "roxo" | "ciano" | "verde" | "vermelho" | "amarelo" | "laranja" | "teal";
}

// ─── Card individual ─────────────────────────────────────────────────────────
function KpiCard({ icon, pergunta, titulo, numero, descricao, detalhe, cor }: CardProps) {
  const cores: Record<string, { bg: string; border: string; num: string; label: string }> = {
    roxo:     { bg: "bg-violet-50",   border: "border-violet-200", num: "text-violet-700", label: "text-violet-500" },
    ciano:    { bg: "bg-cyan-50",     border: "border-cyan-200",   num: "text-cyan-700",   label: "text-cyan-500"   },
    verde:    { bg: "bg-green-50",    border: "border-green-200",  num: "text-green-700",  label: "text-green-500"  },
    vermelho: { bg: "bg-rose-50",     border: "border-rose-200",   num: "text-rose-700",   label: "text-rose-500"   },
    amarelo:  { bg: "bg-amber-50",    border: "border-amber-200",  num: "text-amber-700",  label: "text-amber-500"  },
    laranja:  { bg: "bg-orange-50",   border: "border-orange-200", num: "text-orange-700", label: "text-orange-500" },
    teal:     { bg: "bg-teal-50",     border: "border-teal-200",   num: "text-teal-700",   label: "text-teal-500"   },
  };
  const c = cores[cor];
  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col gap-1 ${c.bg} ${c.border}`}>
      <span className="text-2xl mb-1">{icon}</span>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${c.label}`}>{pergunta}</span>
      <span className="text-sm font-bold text-slate-700 leading-tight">{titulo}</span>
      <span className={`text-4xl font-black leading-none my-1.5 ${c.num}`}>{numero}</span>
      <span className="text-xs text-slate-500 leading-relaxed">{descricao}</span>
      {detalhe && (
        <span className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-black/5 leading-relaxed">
          {detalhe}
        </span>
      )}
    </div>
  );
}

// ─── Card de atenção (vermelho mais intenso) ──────────────────────────────────
function AlertCard({
  icon, pergunta, titulo, numero, descricao, detalhe,
}: {
  icon: string; pergunta: string; titulo: string;
  numero: number | string; descricao: string; detalhe?: string;
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-rose-200 p-4 flex flex-col gap-1">
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">{pergunta}</span>
      <span className="text-sm font-bold text-slate-700 leading-tight">{titulo}</span>
      <span className="text-[34px] font-black leading-none my-1 text-rose-600">{numero}</span>
      <span className="text-xs text-slate-500 leading-relaxed">{descricao}</span>
      {detalhe && (
        <span
          className="text-[10.5px] text-slate-400 mt-2 pt-2 border-t border-black/7 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: detalhe }}
        />
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function VisaoExecutiva() {
  const [aberto, setAberto] = useState(true);
  const { data, isLoading } = trpc.dashboard.getVisaoExecutiva.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // cache 5 min
  });

  const pct = data?.percentualConcluido ?? 0;
  const ano2025 = data?.porAno?.find((a: { ano: number; total: number }) => a.ano === 2025)?.total ?? 0;
  const ano2026 = data?.porAno?.find((a: { ano: number; total: number }) => a.ano === 2026)?.total ?? 0;

  const handlePrint = () => {
    const el = document.getElementById("visao-executiva-print");
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Painel Executivo PDI</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
        body { padding: 24px; background: white; color: #1e293b; }
      </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="mb-6">
      {/* ── Cabeçalho colapsável ── */}
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-white font-bold text-sm shadow-md"
        style={{ background: "linear-gradient(135deg, #3b0764 0%, #6d28d9 55%, #06b6d4 100%)" }}
      >
        <span className="flex items-center gap-2 text-base">
          📊 Visão Executiva — Painel de Gestão do PDI
        </span>
        <span className="flex items-center gap-2 text-xs font-normal opacity-80">
          {aberto ? "Clique para fechar" : "Clique para abrir"}
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* ── Conteúdo ── */}
      {aberto && (
        <div
          id="visao-executiva-print"
          className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-6"
        >
          {isLoading ? (
            <div className="text-center text-slate-400 py-10 text-sm">Carregando dados...</div>
          ) : (
            <>
              {/* ── Barra de progresso ── */}
              <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-cyan-50 p-5">
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-violet-500 mb-1">
                  📌 Quanto do PDI já foi executado?
                </p>
                <h3 className="text-base font-bold text-slate-800 mb-4">
                  Progresso Geral de Execução do PDI no Sebrae TO
                </h3>
                <div className="w-full bg-violet-100 rounded-full h-9 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-4 transition-all duration-700"
                    style={{
                      width: `${Math.max(pct, 5)}%`,
                      background: "linear-gradient(90deg, #3b0764, #6d28d9, #06b6d4)",
                    }}
                  >
                    <span className="text-white font-black text-sm">{pct}% concluído</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                  <p className="text-sm text-slate-600">
                    De cada <strong className="text-violet-700">10 ações planejadas</strong>,{" "}
                    <strong className="text-violet-700">
                      {Math.round(pct / 10)} já foram concluídas
                    </strong>{" "}
                    com sucesso pelos empregados.
                  </p>
                  <span className="text-xs bg-white border-2 border-violet-200 text-violet-600 font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                    {data?.acoesConcluidas ?? 0} concluídas &nbsp;/&nbsp; {data?.totalAcoes ?? 0} planejadas
                  </span>
                </div>
              </div>

              {/* ── Volume de ações ── */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  📋 Volume de ações planejadas
                  <span className="flex-1 h-px bg-slate-200" />
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard
                    icon="📋" cor="roxo"
                    pergunta="Quantas ações foram propostas no total?"
                    titulo="Total de Ações Propostas para Todos os Empregados"
                    numero={data?.totalAcoes ?? 0}
                    descricao="São todas as atividades de desenvolvimento planejadas para os empregados do Sebrae TO."
                    detalhe="Inclui ações de todos os ciclos, departamentos e situações — desde as que ainda não foram iniciadas até as já concluídas."
                  />
                  <KpiCard
                    icon="📅" cor="roxo"
                    pergunta="Quantas ações são do ciclo de 2025?"
                    titulo="Ações Planejadas no Ciclo 2025"
                    numero={ano2025}
                    descricao="Atividades de desenvolvimento planejadas e vinculadas ao ciclo de 2025."
                    detalhe="Estas ações são remanescentes do ciclo do PDI de 2025."
                  />
                  <KpiCard
                    icon="🗓️" cor="ciano"
                    pergunta="Quantas ações são do ciclo de 2026?"
                    titulo="Ações Planejadas no Ciclo 2026"
                    numero={ano2026}
                    descricao="Atividades de desenvolvimento planejadas e vinculadas ao ciclo de 2026."
                    detalhe="Estas ações foram planejadas com foco nos Relatórios da Certificação realizada em 12/2025."
                  />
                </div>
              </div>

              {/* ── Situação das ações ── */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  ✅ Situação atual das ações
                  <span className="flex-1 h-px bg-slate-200" />
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard
                    icon="✅" cor="teal"
                    pergunta="Quantas ações foram aprovadas?"
                    titulo="Ações Aprovadas pelo Líder"
                    numero={data?.acoesAprovadas ?? 0}
                    descricao="O líder já avaliou e aprovou estas ações. O empregado está autorizado a executá-las."
                    detalhe="Antes de iniciar qualquer ação, o líder precisa aprovar. Isso garante que o desenvolvimento está alinhado com as necessidades da equipe."
                  />
                  <KpiCard
                    icon="🏆" cor="verde"
                    pergunta="Quantas ações foram executadas?"
                    titulo="Ações Executadas e Concluídas com Sucesso"
                    numero={data?.acoesConcluidas ?? 0}
                    descricao="O empregado realizou a ação, enviou a comprovação e o avaliador confirmou a conclusão."
                    detalhe="Uma ação só é considerada concluída quando o empregado envia o comprovante (certificado, relatório, etc.) e o avaliador aprova."
                  />
                  <KpiCard
                    icon="⏰" cor="vermelho"
                    pergunta="Quantas ações estão vencidas?"
                    titulo="Ações com Prazo Vencido — Requerem Atenção"
                    numero={data?.acoesVencidas ?? 0}
                    descricao="O prazo dessas ações já passou e elas ainda não foram concluídas pelos empregados."
                    detalhe="Ações vencidas precisam de uma decisão: prorrogar o prazo para o empregado concluir, ou cancelar a ação."
                  />
                </div>
              </div>

              {/* ── Comprovações e impacto ── */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  📎 Situação das comprovações e impacto prático
                  <span className="flex-1 h-px bg-slate-200" />
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard
                    icon="⏳" cor="amarelo"
                    pergunta="Quantas comprovações aguardam avaliação?"
                    titulo="Comprovações Enviadas — Aguardando Avaliação do RH"
                    numero={data?.evidenciasPendentes ?? 0}
                    descricao="O empregado já enviou o comprovante de que realizou a ação, mas o avaliador ainda não analisou."
                    detalhe="Comprovante pode ser um certificado de curso, relatório de projeto, foto de evento, entre outros."
                  />
                  <KpiCard
                    icon="↩️" cor="laranja"
                    pergunta="Quantas comprovações foram devolvidas?"
                    titulo="Comprovações Devolvidas — Empregado Precisa Refazer"
                    numero={data?.evidenciasDevolvidas ?? 0}
                    descricao="O avaliador analisou e devolveu porque a comprovação não estava adequada. O empregado precisa enviar novamente."
                    detalhe="Isso não significa que a ação foi cancelada. O empregado ainda pode concluir enviando uma comprovação melhor."
                  />
                  <KpiCard
                    icon="📈" cor="ciano"
                    pergunta="As ações estão gerando resultado prático?"
                    titulo="Impacto Prático das Ações no Trabalho Diário"
                    numero={`${data?.iip ?? 0}%`}
                    descricao={`Classificado como ${(data?.iip ?? 0) >= 70 ? "BOM ✅" : (data?.iip ?? 0) >= 50 ? "REGULAR ⚠️" : "ATENÇÃO ❌"}`}
                    detalhe="Mede o quanto as ações realizadas estão gerando resultado real no trabalho diário. Calculado com base na avaliação do próprio empregado e do avaliador. Quanto mais próximo de 100%, melhor."
                  />
                </div>
              </div>

              {/* ── Solicitações de inserção ── */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  📨 Solicitações de inserção de novas ações no PDI
                  <span className="flex-1 h-px bg-slate-200" />
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <KpiCard
                    icon="📨" cor="ciano"
                    pergunta="Quantas solicitações foram feitas?"
                    titulo="Solicitações de Inserção de Novas Ações"
                    numero={data?.solicitacoesTotal ?? 0}
                    descricao="Empregados solicitaram a inclusão de novas ações no seu plano de desenvolvimento."
                    detalhe="Quando o empregado quer incluir uma nova ação no PDI que não estava prevista originalmente, ele faz uma solicitação que passa por um fluxo de aprovação."
                  />
                  <KpiCard
                    icon="✔️" cor="verde"
                    pergunta="Quantas foram validadas e incluídas?"
                    titulo="Solicitações Aprovadas e Incluídas no PDI"
                    numero={data?.solicitacoesAprovadas ?? 0}
                    descricao="Estas solicitações passaram por todo o fluxo de aprovação e a nova ação foi incluída no PDI do empregado."
                    detalhe="Para ser aprovada, a solicitação precisa ser validada pelo CKM (análise técnica), pelo líder e pelo RH."
                  />
                  <KpiCard
                    icon="🚫" cor="vermelho"
                    pergunta="Quantas foram reprovadas?"
                    titulo="Solicitações Reprovadas — Não Incluídas no PDI"
                    numero={data?.solicitacoesReprovadas ?? 0}
                    descricao="Estas solicitações foram analisadas e não foram aprovadas pelo líder ou pelo RH."
                    detalhe="A reprovação pode ocorrer por falta de aderência com as competências do cargo, justificativa inadequada ou decisão do gestor responsável."
                  />
                </div>
              </div>

              {/* ── Pendências urgentes ── */}
              <div className="rounded-xl border-2 border-l-4 border-rose-200 border-l-rose-600 bg-gradient-to-r from-orange-50 to-rose-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-3 flex items-center gap-2">
                  ⚠️ Pendências que requerem ação imediata
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <AlertCard
                    icon="🔔"
                    pergunta="Ações aguardando aprovação do líder"
                    titulo="Ações Criadas — Aguardando o Líder Aprovar"
                    numero={data?.aguardandoLider ?? 0}
                    descricao="O administrador criou estas ações no PDI do empregado, mas o líder ainda não deu a aprovação para que o empregado possa iniciar."
                    detalhe="Enquanto o líder não aprovar, o empregado não consegue visualizar nem executar a ação."
                  />
                  <AlertCard
                    icon="🔄"
                    pergunta="Solicitações de inserção em andamento"
                    titulo="Solicitações de Novas Ações Ainda em Análise"
                    numero={data?.solicitacoesEmAndamento ?? 0}
                    descricao="Estas solicitações foram feitas pelos empregados mas ainda estão percorrendo o fluxo de aprovação."
                    detalhe={`Distribuição atual:<br/>• Aguardando análise técnica (CKM): <strong>${data?.aguardandoCkm ?? 0}</strong><br/>• Aguardando decisão do líder: <strong>${data?.aguardandoGestor ?? 0}</strong><br/>• Aguardando decisão do RH: <strong>${data?.aguardandoRh ?? 0}</strong>`}
                  />
                  <AlertCard
                    icon="✏️"
                    pergunta="Solicitações de ajuste pendentes"
                    titulo="Pedidos de Alteração de Ações Aguardando Análise"
                    numero={data?.ajustesPendentes ?? 0}
                    descricao="Empregados ou líderes solicitaram alterações em ações já existentes (mudança de prazo, descrição, etc.) e aguardam análise do administrador."
                    detalhe="Enquanto o pedido de ajuste não for analisado, a ação permanece como está."
                  />
                </div>
              </div>

              {/* ── Rodapé + botão imprimir ── */}
              <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 leading-relaxed flex-1">
                  <strong className="text-slate-500">ℹ️ Como interpretar este painel:</strong>{" "}
                  Todos os números refletem a situação atual de <strong>todos os empregados do Sebrae TO</strong> dentro do Programa de Desenvolvimento Individual (PDI).
                  Os dados são atualizados automaticamente a cada acesso ao sistema.
                </p>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-xs font-semibold text-white px-4 py-2 rounded-lg whitespace-nowrap shadow"
                  style={{ background: "linear-gradient(90deg, #6d28d9, #06b6d4)" }}
                >
                  <Printer size={14} /> Imprimir / Salvar PDF
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

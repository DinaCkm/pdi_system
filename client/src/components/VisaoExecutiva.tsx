import React from "react";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Target,
  GraduationCap,
  RefreshCw,
  UserPlus,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Mail,
  CheckCircle,
  Ban,
  Bell,
  Edit3,
  Undo2,
  Presentation
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

interface VisaoExecutivaProps {
  departamentoId?: number;
}

export const VisaoExecutiva: React.FC<VisaoExecutivaProps> = ({ departamentoId }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  
  const { data, isLoading, error } = trpc.visaoExecutiva.getVisaoExecutivaCompleta.useQuery(
    { departamentoId },
    { 
      refetchOnWindowFocus: false,
      retry: 1
    }
  );

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse text-sm">Carregando indicadores estratégicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center text-center gap-3">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-bold text-red-900">Erro ao Carregar Visão Executiva</h3>
        <p className="text-red-700 max-w-md">Não foi possível carregar os dados da Visão Executiva. Por favor, tente novamente.</p>
      </div>
    );
  }

  const { progresso, media, situacao, comprovacoes, solicitacoes, pendencias } = data!;

  const pdiLabels: Record<string, { title: string; subtitle: string; icon: any; color: string; bgColor: string; borderColor: string }> = {
    certificacao: { 
      title: "PDI DA CERTIFICAÇÃO 2026", 
      subtitle: "PDI 01/2026 — Base: Certificação", 
      icon: GraduationCap,
      color: "text-purple-600",
      bgColor: "bg-white",
      borderColor: "border-purple-200"
    },
    herdeiras: { 
      title: "AÇÕES HERDADAS DE 2025", 
      subtitle: "PDI — Consolidação de Ações Pendentes de 2025", 
      icon: RefreshCw,
      color: "text-blue-600",
      bgColor: "bg-white",
      borderColor: "border-blue-200"
    },
    onboarding: { 
      title: "PDI DE INTEGRAÇÃO (ONBOARDING / CROSSBOARDING)", 
      subtitle: "PDI Integração — Novos Empregados", 
      icon: UserPlus,
      color: "text-teal-600",
      bgColor: "bg-white",
      borderColor: "border-teal-200"
    }
  };

  const totalAcoesGeral = progresso.progressoGeral.totalAcoes;
  const concluidasGeral = progresso.progressoGeral.acoesConcluidas;
  const percentualGeral = totalAcoesGeral > 0 ? Math.round((concluidasGeral / totalAcoesGeral) * 100) : 0;

  return (
    <div className="space-y-6 mb-8">
      {/* Header com Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gradient-to-r from-purple-700 to-indigo-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between cursor-pointer hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Visão Executiva — Painel de Gestão do PDI</h2>
        </div>
        <div className="flex items-center gap-2 text-white/90 font-medium">
          <span>{isOpen ? "Clique para fechar" : "Clique para expandir"}</span>
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
          
          {/* BLOCO 1: PROGRESSO GERAL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Quanto do PDI já foi executado?</span>
            </div>
            <Card className="border-purple-100 shadow-sm overflow-hidden bg-gradient-to-br from-purple-50/30 to-blue-50/30">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                      <TrendingUp className="w-4 h-4" />
                      <span>Situação de Evolução das Ações</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-800">
                      Progresso Geral de Execução do PDI no Sebrae TO
                    </h3>
                    
                    <div className="relative pt-6">
                      <div className="h-10 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-700 to-blue-500 flex items-center justify-center transition-all duration-1000 ease-out relative"
                          style={{ width: `${percentualGeral}%` }}
                        >
                          <span className="text-white font-black text-sm drop-shadow-md z-10">
                            {percentualGeral}% concluído
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <p className="text-sm">
                        De cada <span className="font-bold text-purple-700">{totalAcoesGeral} ações planejadas</span>, 
                        <span className="font-bold text-purple-700"> {concluidasGeral} já foram concluídas</span> com sucesso pelos empregados.
                      </p>
                      <div className="text-purple-700 font-bold text-sm">
                        <span className="text-purple-600">{concluidasGeral} concluídas</span> / <span className="text-slate-400">{totalAcoesGeral} planejadas</span>
                      </div>
                    </div>
                  </div>

                  {/* Cards por Tipo de PDI */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {progresso.progressoPorTipo.map((pdi: any) => {
                      const info = pdiLabels[pdi.tipo] || pdiLabels.certificacao;
                      const Icon = info.icon;
                      const percent = pdi.totalAcoes > 0 ? Math.round((pdi.acoesConcluidas / pdi.totalAcoes) * 100) : 0;
                      
                      return (
                        <Card key={pdi.tipo} className={cn("p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-md", info.bgColor, info.borderColor)}>
                          <div className="flex items-start gap-3 mb-4">
                            <div className={cn("p-2 rounded-lg bg-slate-50", info.color)}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <p className={cn("text-[10px] font-black uppercase tracking-tight", info.color)}>
                                {info.title}
                              </p>
                              <h4 className="text-xs font-bold text-slate-500 line-clamp-1">
                                {info.subtitle}
                              </h4>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex flex-col">
                              <span className={cn("text-4xl font-black", info.color)}>{pdi.totalAcoes}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">ações planejadas</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-1000", info.color.replace('text', 'bg'))}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className={cn(info.color)}>{percent}%</span>
                                <div className="flex gap-3 text-slate-400">
                                  <span>{pdi.acoesConcluidas} concluídas</span>
                                  <span>{pdi.acoesEmAberto} em aberto</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BLOCO 2: SITUAÇÃO ATUAL DAS AÇÕES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Situação Atual das Ações</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-teal-100 bg-teal-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-teal-600 uppercase">Quantas ações foram aprovadas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Ações Aprovadas pelo Líder</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-slate-800">{situacao.acoesAprovadas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    O líder já avaliou e aprovou estas ações. O empregado está autorizado a executá-las.
                  </p>
                  <div className="pt-4 border-t border-teal-100 text-[9px] text-slate-400 italic">
                    Antes de iniciar qualquer ação, o líder precisa aprovar. Isso garante que o desenvolvimento está alinhado com as necessidades da equipe.
                  </div>
                </div>
              </Card>

              <Card className="border-emerald-100 bg-emerald-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Quantas ações foram executadas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Ações Executadas e Concluídas com Sucesso</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-emerald-600">{situacao.acoesExecutadas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    O empregado realizou a ação, enviou a comprovação e o avaliador confirmou a conclusão.
                  </p>
                  <div className="pt-4 border-t border-emerald-100 text-[9px] text-slate-400 italic">
                    Uma ação só é considerada concluída quando o empregado envia o comprovante (certificado, relatório, etc.) e o avaliador aprova.
                  </div>
                </div>
              </Card>

              <Card className="border-rose-100 bg-rose-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-rose-100 text-rose-500 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-500 uppercase">Quantas ações estão vencidas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Ações com Prazo Vencido — Requerem Atenção</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-rose-600">{situacao.acoesVencidas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    O prazo dessas ações já passou e elas ainda não foram concluídas pelos empregados.
                  </p>
                  <div className="pt-4 border-t border-rose-100 text-[9px] text-slate-400 italic">
                    Ações vencidas precisam de uma decisão: prorrogar o prazo para o empregado concluir, ou cancelar a ação.
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO 3: SITUAÇÃO DAS COMPROVAÇÕES E IMPACTO PRÁTICO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Situação das Comprovações e Impacto Prático</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-amber-100 bg-amber-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-amber-600 uppercase">Quantas comprovações aguardam avaliação?</p>
                    <h4 className="text-xs font-bold text-slate-700">Comprovações Enviadas — Aguardando Avaliação do RH</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-slate-800">{comprovacoes.comprovacoesAguardando}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    O empregado já enviou o comprovante de que realizou a ação, mas o avaliador ainda não analisou.
                  </p>
                  <div className="pt-4 border-t border-amber-100 text-[9px] text-slate-400 italic">
                    Comprovante pode ser um certificado de curso, relatório de projeto, foto de evento, entre outros.
                  </div>
                </div>
              </Card>

              <Card className="border-orange-100 bg-orange-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Undo2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-orange-600 uppercase">Quantas comprovações foram devolvidas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Comprovações Devolvidas — Empregado Precisa Refazer</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-orange-700">{comprovacoes.comprovacoesDevolvidas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    O avaliador analisou e devolveu porque a comprovação não estava adequada. O empregado precisa enviar novamente.
                  </p>
                  <div className="pt-4 border-t border-orange-100 text-[9px] text-slate-400 italic">
                    Isso não significa que a ação foi cancelada. O empregado ainda pode concluir enviando uma comprovação melhor.
                  </div>
                </div>
              </Card>

              <Card className="border-cyan-100 bg-cyan-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                    <Presentation className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-cyan-600 uppercase">As ações estão gerando resultado prático?</p>
                    <h4 className="text-xs font-bold text-slate-700">Impacto Prático das Ações no Trabalho Diário</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-cyan-700">{comprovacoes.impactoPratico}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                    Classificado como BOM <CheckCircle className="w-3 h-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mede o quanto as ações realizadas estão gerando resultado real no trabalho diário. Calculado com base na avaliação do próprio empregado e do avaliador. Quanto mais próximo de 100%, melhor.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO 4: SOLICITAÇÕES DE INSERÇÃO DE NOVAS AÇÕES NO PDI */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Solicitações de Inserção de Novas Ações no PDI</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-sky-100 bg-sky-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-sky-600 uppercase">Quantas solicitações foram feitas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Solicitações de Inserção de Novas Ações</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-sky-800">{solicitacoes.totalSolicitacoes}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Empregados solicitaram a inclusão de novas ações no seu plano de desenvolvimento.
                  </p>
                  <div className="pt-4 border-t border-sky-100 text-[9px] text-slate-400 italic">
                    Quando o empregado quer incluir uma nova ação no PDI que não estava prevista originalmente, ele precisa solicitar ao administrador.
                  </div>
                </div>
              </Card>

              <Card className="border-green-100 bg-green-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-green-600 uppercase">Quantas foram validadas e incluídas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Solicitações Aprovadas e Incluídas no PDI</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-green-700">{solicitacoes.solicitacoesAprovadas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Estas solicitações passaram por todo o fluxo de aprovação e a nova ação foi incluída no PDI do empregado.
                  </p>
                  <div className="pt-4 border-t border-green-100 text-[9px] text-slate-400 italic">
                    Para ser aprovada, a solicitação precisa ser validada pelo CKM (análise técnica), pelo líder e pelo RH.
                  </div>
                </div>
              </Card>

              <Card className="border-pink-100 bg-pink-50/20 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-100 text-pink-500 rounded-lg">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-pink-500 uppercase">Quantas foram reprovadas?</p>
                    <h4 className="text-xs font-bold text-slate-700">Solicitações Reprovadas — Não Incluídas no PDI</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-pink-600">{solicitacoes.solicitacoesReprovadas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Estas solicitações foram analisadas e não foram aprovadas pelo líder ou pelo RH.
                  </p>
                  <div className="pt-4 border-t border-pink-100 text-[9px] text-slate-400 italic">
                    A reprovação pode ocorrer por falta de aderência com as competências do cargo, justificativa inadequada ou decisão do gestor responsável.
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO 5: PENDÊNCIAS QUE REQUEREM AÇÃO IMEDIATA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Pendências que Requerem Ação Imediata</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-rose-200 bg-rose-50/10 p-6 rounded-2xl border-l-4 border-l-rose-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-600 uppercase">Ações com prazo vencido sem conclusão</p>
                    <h4 className="text-xs font-bold text-slate-700">Ações Vencidas — Prazo Passou Sem Conclusão</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-slate-800">{pendencias.acoesVencidas}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Estas ações tiveram o prazo encerrado e ainda não foram concluídas. Precisam de atenção imediata do líder.
                  </p>
                  <div className="pt-4 border-t border-rose-100 text-[9px] text-slate-400 italic">
                    O líder deve decidir: prorrogar o prazo ou registrar como não realizada.
                  </div>
                </div>
              </Card>

              <Card className="border-rose-200 bg-rose-50/10 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-600 uppercase">Solicitações de inserção em andamento</p>
                    <h4 className="text-xs font-bold text-slate-700">Solicitações de Novas Ações Ainda em Análise</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-rose-600">{pendencias.solicitacoesAndamento.total}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Estas solicitações foram feitas pelos empregados mas ainda estão percorrendo o fluxo de aprovação.
                  </p>
                  <div className="space-y-1 py-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Distribuição atual:</p>
                    <div className="grid grid-cols-1 gap-1 text-[10px] font-medium text-slate-500">
                      <div className="flex justify-between"><span>• Aguardando análise técnica (CKM):</span> <span className="font-bold text-slate-700">{pendencias.solicitacoesAndamento.aguardandoCkm}</span></div>
                      <div className="flex justify-between"><span>• Aguardando decisão do líder:</span> <span className="font-bold text-slate-700">{pendencias.solicitacoesAndamento.aguardandoGestor}</span></div>
                      <div className="flex justify-between"><span>• Aguardando decisão do RH:</span> <span className="font-bold text-slate-700">{pendencias.solicitacoesAndamento.aguardandoRh}</span></div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-rose-200 bg-rose-50/10 p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-600 uppercase">Solicitações de ajuste pendentes</p>
                    <h4 className="text-xs font-bold text-slate-700">Pedidos de Alteração de Ações Aguardando Análise</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-5xl font-black text-rose-600">{pendencias.ajustesPendentes}</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Empregados ou líderes solicitaram alterações em ações já existentes (mudança de prazo, descrição, etc.) e aguardam análise do administrador.
                  </p>
                  <div className="pt-4 border-t border-rose-100 text-[9px] text-slate-400 italic">
                    Enquanto o pedido de ajuste não for analisado, a ação permanece como está.
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Rodapé Informativo Geral */}
          <div className="pt-8 border-t border-slate-100 text-[10px] text-slate-400 text-center italic">
            Dashboard atualizado em tempo real com base nos dados do sistema PDI.
          </div>
        </div>
      )}
    </div>
  );
};

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
  TrendingUp
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

  const { progresso, media, situacao, comprovacoes, solicitacoes } = data!;

  // Mapeamento de nomes para os cards de PDI
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
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
          {/* BLOCO 1: PROGRESSO GERAL */}
          <Card className="border-purple-100 shadow-sm overflow-hidden bg-gradient-to-br from-purple-50/50 to-blue-50/50">
            <CardContent className="p-8">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                    <TrendingUp className="w-4 h-4" />
                    <span>Quanto do PDI já foi executado?</span>
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

                {/* Rodapé Informativo */}
                <div className="pt-6 border-t border-purple-100 text-[10px] text-slate-500 leading-relaxed">
                  <p>
                    <span className="font-bold text-slate-700">ℹ️ Entenda os PDIs:</span> O PDI da Certificação contém ações novas planejadas com base nos Relatórios da Certificação realizada em 12/2025. O PDI de Consolidação reúne ações que foram iniciadas em 2025 e transferidas para conclusão em 2026. O PDI de Integração é destinado a empregados que ingressaram recentemente na organização.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OUTROS BLOCOS EM GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* BLOCO 2: MÉDIA DE AÇÕES */}
            <Card className="border-blue-100 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Média de Ações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-800">{media.mediaGeral}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">ações / emp.</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 font-medium leading-tight">
                  Baseado em <span className="font-bold">{media.totalEmpregados}</span> empregados ativos e <span className="font-bold">{media.totalAcoes}</span> ações totais.
                </p>
              </CardContent>
            </Card>

            {/* BLOCO 3: SITUAÇÃO ATUAL */}
            <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Situação das Ações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Aprovadas</span>
                  <span className="text-sm font-black text-emerald-600">{situacao.acoesAprovadas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Executadas</span>
                  <span className="text-sm font-black text-blue-600">{situacao.acoesExecutadas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Vencidas</span>
                  <span className="text-sm font-black text-red-600">{situacao.acoesVencidas}</span>
                </div>
              </CardContent>
            </Card>

            {/* BLOCO 4: COMPROVAÇÕES */}
            <Card className="border-amber-100 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-amber-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Comprovações e IIP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Aguardando</span>
                  <span className="text-sm font-black text-amber-600">{comprovacoes.comprovacoeAguardando}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Devolvidas</span>
                  <span className="text-sm font-black text-orange-600">{comprovacoes.comprovacoeDevolvidas}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-amber-100">
                  <span className="text-xs font-bold text-slate-800">Impacto Prático (IIP)</span>
                  <span className="text-sm font-black text-indigo-700">{comprovacoes.impactoPratico}%</span>
                </div>
              </CardContent>
            </Card>

            {/* BLOCO 5: SOLICITAÇÕES */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-slate-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Novas Solicitações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Total Solicitadas</span>
                  <span className="text-sm font-black text-slate-800">{solicitacoes.totalSolicitacoes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Aprovadas</span>
                  <span className="text-sm font-black text-teal-600">{solicitacoes.solicitacoesAprovadas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Reprovadas</span>
                  <span className="text-sm font-black text-red-500">{solicitacoes.solicitacoesReprovadas}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

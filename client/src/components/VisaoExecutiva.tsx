import React, { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toPng } from "html-to-image";
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
  Activity as ActivityIcon,
  AlertTriangle,
  Mail,
  CheckCircle,
  Ban,
  Bell,
  Edit3,
  Undo2,
  Presentation,
  Search,
  Eye,
  Info,
  HelpCircle,
  Send,
  Loader2,
  FileDown,
  ImageDown
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { cn } from "../lib/utils";

interface VisaoExecutivaProps {
  departamentoId?: number;
}

const InfoTooltip = ({ title, content }: { title: string, content: string }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600">
          <Eye className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-slate-900 text-white border-slate-800 shadow-xl rounded-xl">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">{title}</p>
          <p className="text-xs leading-relaxed font-medium">{content}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const VisaoExecutiva: React.FC<VisaoExecutivaProps> = ({ departamentoId }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleBaixarPDF = async () => {
    if (!dashboardRef.current) return;
    setIsDownloading(true);
    try {
      // Capturar o painel exatamente como está na tela, em alta resolução
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
        pixelRatio: 2,
      });

      // Descobrir dimensões reais da imagem capturada
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });

      const imgWidthPx = img.naturalWidth;
      const imgHeightPx = img.naturalHeight;

      // Converter px → mm (96 dpi: 1mm = 3.7795px; com pixelRatio=2 → 7.559px/mm)
      const PX_PER_MM = 7.559;
      const widthMm  = Math.round(imgWidthPx  / PX_PER_MM);
      const heightMm = Math.round(imgHeightPx / PX_PER_MM);

      const nomeArquivo = `visao-executiva-pdi-${new Date().toISOString().slice(0, 10)}`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        // Fallback se pop-ups bloqueados: baixar como PNG
        const link = document.createElement("a");
        link.download = `${nomeArquivo}.png`;
        link.href = dataUrl;
        link.click();
        setIsDownloading(false);
        return;
      }

      // Página com o tamanho exato da imagem → sem cortes, sem margens, fiel ao visual
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${nomeArquivo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      background: #f8fafc;
      overflow: hidden;
    }
    img {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      display: block;
      object-fit: contain;
    }
    @media print {
      @page {
        size: ${widthMm}mm ${heightMm}mm;
        margin: 0;
      }
      html, body { width: ${widthMm}mm; height: ${heightMm}mm; }
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="Visão Executiva PDI"/>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 600);
    };
  <\/script>
</body>
</html>`);
      printWindow.document.close();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };
  
  const { data, isLoading, error } = trpc.visaoExecutiva.getVisaoExecutivaCompleta.useQuery(
    { departamentoId },
    { 
      refetchOnWindowFocus: false,
      retry: 1
    }
  );

  const enviarRelatorioMutation = trpc.visaoExecutiva.enviarRelatorioLider.useMutation({
    onSuccess: () => {
      alert("Relatório enviado com sucesso para o líder do departamento!");
      setIsSending(false);
    },
    onError: (err) => {
      alert("Erro ao enviar relatório: " + err.message);
      setIsSending(false);
    }
  });

  const handleEnviarRelatorio = async () => {
    if (!dashboardRef.current || !departamentoId) {
      alert("Por favor, selecione um departamento primeiro.");
      return;
    }

    setIsSending(true);
    try {
      // Capturar o dashboard como imagem
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
        style: {
          padding: "20px",
          borderRadius: "0"
        }
      });

      // Enviar para o backend
      enviarRelatorioMutation.mutate({
        departamentoId,
        dashboardImage: dataUrl
      });
    } catch (err) {
      console.error("Erro ao capturar dashboard:", err);
      alert("Erro ao gerar imagem do dashboard.");
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse text-sm">Carregando indicadores estratégicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-10 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-red-100 rounded-full">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-red-900">Erro de Conexão</h3>
          <p className="text-red-700 max-w-md font-medium text-sm">Não foi possível carregar os dados da Visão Executiva. Verifique sua conexão e tente novamente.</p>
        </div>
      </div>
    );
  }

  const { progresso, situacao, comprovacoes, solicitacoes, pendencias } = data!;

  const pdiLabels: Record<string, { title: string; subtitle: string; icon: any; color: string; bgColor: string; borderColor: string; rule: string }> = {
    certificacao: { 
      title: "PDI DA CERTIFICAÇÃO 2026", 
      subtitle: "PDI 01/2026 — Base: Certificação", 
      icon: GraduationCap,
      color: "text-purple-600",
      bgColor: "bg-white",
      borderColor: "border-purple-100",
      rule: "Soma todas as ações de PDIs cujo título contém 'Certificação' ou '01/2026'."
    },
    herdeiras: { 
      title: "AÇÕES HERDADAS DE 2025", 
      subtitle: "PDI — Consolidação de Ações Pendentes de 2025", 
      icon: RefreshCw,
      color: "text-blue-600",
      bgColor: "bg-white",
      borderColor: "border-blue-100",
      rule: "Soma ações de PDIs que mencionam '2025', 'Herdeiras' ou 'Pendentes'."
    },
    onboarding: { 
      title: "PDI DE INTEGRAÇÃO (ONBOARDING)", 
      subtitle: "PDI Integração — Novos Empregados", 
      icon: UserPlus,
      color: "text-teal-600",
      bgColor: "bg-white",
      borderColor: "border-teal-100",
      rule: "Soma ações de PDIs com termos 'Onboarding', 'Integração' ou 'Novos'."
    }
  };

  const totalAcoesGeral = progresso.progressoGeral.totalAcoes;
  const concluidasGeral = progresso.progressoGeral.acoesConcluidas;
  const percentualGeral = totalAcoesGeral > 0 ? Math.round((concluidasGeral / totalAcoesGeral) * 100) : 0;

  return (
    <div className="space-y-8 mb-12">
      {/* Header com Toggle - Estilo Premium */}
      <div 
        className="group w-full bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700/50"
      >
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-4 cursor-pointer flex-1"
        >
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tight leading-none">Visão Executiva</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Painel de Gestão Estratégica do PDI</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão Baixar PDF */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) setIsOpen(true);
              setTimeout(() => handleBaixarPDF(), 300);
            }}
            disabled={isDownloading}
            title="Baixar Visão Executiva como PDF"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-300 border no-print",
              isDownloading
                ? "bg-white/5 text-slate-400 cursor-not-allowed border-white/5"
                : "bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 active:scale-95 border-emerald-500/50 shadow-lg shadow-emerald-900/30"
            )}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Baixar PDF</span>
              </>
            )}
          </button>
          {/* Toggle Recolher/Expandir */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-black uppercase tracking-wider">{isOpen ? "Recolher Painel" : "Expandir Painel"}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div ref={dashboardRef} className="animate-in fade-in slide-in-from-top-4 duration-700 space-y-10 bg-slate-50 p-4 rounded-3xl">
          
          {/* BOTÃO DE ENVIO - Visível apenas quando há departamento filtrado */}
          {departamentoId && (
            <div className="flex justify-end mb-2 no-print">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnviarRelatorio();
                }}
                disabled={isSending}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg",
                  isSending 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-500/20"
                )}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Dashboard para o Líder</span>
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* BLOCO 1: PROGRESSO GERAL */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.15em]">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                <span>Status de Execução Global</span>
              </div>
              <InfoTooltip title="Regra de Cálculo" content="Percentual de ações com status 'Concluída' em relação ao total de ações planejadas em todos os PDIs ativos." />
            </div>
            
            <Card className="border-slate-100 shadow-2xl shadow-indigo-500/5 overflow-hidden bg-white rounded-3xl">
              <CardContent className="p-10">
                <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                        <TrendingUp className="w-4 h-4" />
                        <span>Evolução Consolidada</span>
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        Progresso de Execução do PDI
                      </h3>
                    </div>
                    
                    <div className="relative">
                      <div className="h-14 w-full bg-slate-100 rounded-2xl overflow-hidden p-1.5 border border-slate-200/50 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center transition-all duration-1000 ease-out relative rounded-xl shadow-lg"
                          style={{ width: `${percentualGeral}%` }}
                        >
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                          <span className="text-white font-black text-sm drop-shadow-md z-10 tracking-wider">
                            {percentualGeral}% CONCLUÍDO
                          </span>
                        </div>
                      </div>
                      <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xl animate-bounce">
                        META 100%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col justify-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status de Conclusão</p>
                        <p className="text-sm text-slate-600 font-medium">
                          <span className="font-black text-indigo-600">{percentualGeral}% das ações</span> já foram finalizadas com sucesso.
                        </p>
                      </div>
                      
                      <div className="flex flex-col justify-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Ações</p>
                        <p className="text-sm text-slate-600 font-medium">
                          Total de <span className="font-black text-slate-900">{totalAcoesGeral} ações</span> planejadas para <span className="font-black text-slate-900">{progresso.progressoGeral.totalEmpregados} empregados</span>.
                        </p>
                      </div>

                      <div className="flex flex-col justify-center bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Média de Engajamento por PDI</p>
                        <div className="space-y-1.5">
                          {progresso.progressoPorTipo.map((cat: any) => (
                            <div key={cat.tipo} className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                              <span className="capitalize">{cat.tipo}:</span>
                              <span className="font-black text-indigo-600">{cat.mediaAcoes} ações/emp</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cards por Tipo de PDI */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {progresso.progressoPorTipo.map((pdi: any) => {
                      const info = pdiLabels[pdi.tipo] || pdiLabels.certificacao;
                      const Icon = info.icon;
                      const percent = pdi.totalAcoes > 0 ? Math.round((pdi.acoesConcluidas / pdi.totalAcoes) * 100) : 0;
                      
                      return (
                        <div key={pdi.tipo} className={cn("group p-7 rounded-3xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative", info.bgColor, info.borderColor)}>
                          <div className="absolute top-4 right-4">
                            <InfoTooltip title="Critério de Filtro" content={info.rule} />
                          </div>
                          
                          <div className="flex items-center gap-4 mb-6">
                            <div className={cn("p-3 rounded-2xl bg-slate-50 group-hover:scale-110 transition-transform duration-300 shadow-sm", info.color)}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <p className={cn("text-[10px] font-black uppercase tracking-tight leading-none", info.color)}>
                                {info.title}
                              </p>
                              <h4 className="text-[11px] font-bold text-slate-400 line-clamp-1 uppercase">
                                {info.subtitle}
                              </h4>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-2">
                                <span className={cn("text-3xl font-black tracking-tighter", info.color)}>{pdi.totalAcoes}</span>
                                <span className={cn("text-[10px] font-black bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-100", info.color)}>
                                  Média: {pdi.mediaAcoes}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ações planejadas</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div 
                                  className={cn("h-full transition-all duration-1000 shadow-lg rounded-full", info.color.replace('text', 'bg'))}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={cn("text-xs font-black", info.color)}>{percent}%</span>
                                <div className="flex gap-4 text-[10px] font-black uppercase tracking-tighter">
                                  <span className="text-slate-900">{pdi.acoesConcluidas} concluídas</span>
                                  <span className="text-slate-300">{pdi.acoesEmAberto} abertas</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BLOCO 2: SITUAÇÃO ATUAL DAS AÇÕES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.15em]">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Status das Ações no Fluxo</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-slate-100 bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Total de ações que já passaram pela validação do líder e estão autorizadas para execução." />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl shadow-sm">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest leading-none mb-1">Validadas</p>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase">Aprovadas pelo Líder</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{situacao.acoesAprovadas}</span>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed border-l-2 border-teal-200 pl-3 italic">
                    Total de ações autorizadas.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Ações que tiveram evidência enviada pelo colaborador e aprovada pelo avaliador final." />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Finalizadas</p>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase">Executadas e Concluídas</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-3xl font-black text-emerald-600 tracking-tighter">{situacao.acoesExecutadas}</span>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed border-l-2 border-emerald-200 pl-3 italic">
                    Ciclo de desenvolvimento fechado.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Ações que estão dentro do prazo de execução e ainda não foram finalizadas." />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
                    <ActivityIcon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Execução</p>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase">Em Andamento (No Prazo)</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-3xl font-black text-blue-600 tracking-tighter">{situacao.acoesEmAndamento}</span>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed border-l-2 border-blue-200 pl-3 italic">
                    Ações sendo realizadas dentro do cronograma.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-shadow relative border-b-4 border-b-rose-500">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Ações cujo prazo final de execução é anterior à data de hoje e que ainda não possuem status 'Concluída'." />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Atrasadas</p>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase">Prazo Vencido</h4>
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="text-3xl font-black text-rose-600 tracking-tighter">{situacao.acoesVencidas}</span>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed border-l-2 border-rose-200 pl-3 italic">
                    Requerem decisão: prorrogar ou cancelar.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO 3: SITUAÇÃO DAS COMPROVAÇÕES E IMPACTO PRÁTICO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.15em]">
              <FileCheck className="w-4 h-4 text-amber-500" />
              <span>Evidências e Resultados</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-slate-100 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Evidências enviadas pelo colaborador que aguardam análise técnica do Administrador." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Triagem</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Aguardando Avaliação do Administrador</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{comprovacoes.comprovacoesAguardando}</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed border-l-2 border-amber-200 pl-4 italic">
                    Comprovantes em fila para análise de conformidade.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Evidências que foram analisadas e devolvidas para o colaborador realizar correções ou melhorias." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-sm">
                    <Undo2 className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Revisão</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Devolvidas para Ajuste</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-4xl font-black text-orange-700 tracking-tighter">{comprovacoes.comprovacoesDevolvidas}</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed border-l-2 border-orange-200 pl-4 italic">
                    O colaborador precisa reenviar o comprovante adequado.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full -mr-8 -mt-8" />
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Média percentual da autoavaliação do colaborador e avaliação do gestor sobre a aplicação prática do aprendizado no dia a dia." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl shadow-sm">
                    <Presentation className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest leading-none mb-1">Qualidade</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Índice de Impacto Prático (IIP)</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-cyan-700 tracking-tighter">{comprovacoes.impactoPratico}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-full w-fit uppercase tracking-wider">
                    Desempenho: BOM <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO 4: SOLICITAÇÕES DE INSERÇÃO DE NOVAS AÇÕES NO PDI */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.15em]">
              <PlusCircle className="w-4 h-4 text-sky-500" />
              <span>Gestão de Novas Demandas</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-slate-100 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Total bruto de pedidos de inclusão de novas ações que não estavam no planejamento original." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl shadow-sm">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1">Demanda</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Solicitações de Inserção</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{solicitacoes.totalSolicitacoes}</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed border-l-2 border-sky-200 pl-4 italic">
                    Pedidos de novos cursos ou treinamentos.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Solicitações que já percorreram todo o fluxo (CKM, Líder e RH) e foram transformadas em ações no PDI." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-green-50 text-green-600 rounded-2xl shadow-sm">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none mb-1">Efetivado</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Aprovadas e Incluídas</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-4xl font-black text-green-700 tracking-tighter">{solicitacoes.solicitacoesAprovadas}</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed border-l-2 border-green-200 pl-4 italic">
                    Já incorporadas ao plano de desenvolvimento.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-100 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Diferença entre o Total e as Aprovadas. Inclui pedidos vetados e pedidos que ainda estão em análise." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl shadow-sm">
                    <Ban className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Conciliação</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Reprovadas ou em Fluxo</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-4xl font-black text-pink-600 tracking-tighter">{solicitacoes.totalSolicitacoes - solicitacoes.solicitacoesAprovadas}</span>
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase bg-pink-50/50 p-2 rounded-lg">
                      <span className="text-pink-600">Reprovadas/Outras:</span>
                      <span className="text-slate-900">{solicitacoes.solicitacoesReprovadas}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-500">Em Andamento:</span>
                      <span className="text-slate-900">{solicitacoes.solicitacoesEmAndamento}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* BLOCO 5: PENDÊNCIAS QUE REQUEREM AÇÃO IMEDIATA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-[0.15em]">
              <AlertTriangle className="w-4 h-4" />
              <span>Gargalos que Exigem Decisão</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-rose-200 bg-rose-50/5 p-8 rounded-3xl border-l-8 border-l-rose-600 relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Mesma métrica do Bloco 2, destacada aqui para reforçar a necessidade de cobrança dos líderes." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shadow-sm">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">Crítico</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Ações Vencidas</h4>
                  </div>
                </div>
                <div className="space-y-6">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{pendencias.acoesVencidas}</span>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                    O líder deve decidir o destino destas ações agora.
                  </p>
                </div>
              </Card>

              <Card className="border-slate-200 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Solicitações de novas ações detalhadas pela etapa exata onde se encontram no fluxo." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl shadow-sm">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest leading-none mb-1">Processo</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Novas Ações em Análise</h4>
                  </div>
                </div>
                <div className="space-y-5">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{pendencias.solicitacoesAndamento.total}</span>
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Análise Técnica (CKM):</span> <span className="text-slate-900 font-black">{pendencias.solicitacoesAndamento.aguardandoCkm}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Decisão do Líder:</span> <span className="text-slate-900 font-black">{pendencias.solicitacoesAndamento.aguardandoGestor}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Decisão do RH:</span> <span className="text-slate-900 font-black">{pendencias.solicitacoesAndamento.aguardandoRh}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-slate-200 bg-white p-8 rounded-3xl shadow-lg relative">
                <div className="absolute top-4 right-4">
                  <InfoTooltip title="Cálculo" content="Pedidos de alteração em ações existentes que aguardam autorização do Líder direto ou análise final do Administrador." />
                </div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-sm">
                    <Edit3 className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Ajustes</p>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Alterações Pendentes</h4>
                  </div>
                </div>
                <div className="space-y-5">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{pendencias.ajustesPendentes.total}</span>
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Com o Líder:</span> <span className="text-orange-600 font-black">{pendencias.ajustesPendentes.aguardandoLider}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Com o Administrador:</span> <span className="text-indigo-600 font-black">{pendencias.ajustesPendentes.aguardandoAdmin}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Rodapé Informativo Geral */}
          <div className="pt-10 border-t border-slate-100 text-[10px] text-slate-400 text-center font-bold uppercase tracking-[0.2em]">
            Dashboard PDI • Dados atualizados em tempo real • Sebrae Tocantins
          </div>
        </div>
      )}
    </div>
  );
};

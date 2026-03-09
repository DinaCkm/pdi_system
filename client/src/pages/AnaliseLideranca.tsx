import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  ArrowLeft,
  BarChart3,
  Award,
  UserCheck,
} from "lucide-react";
import { Link } from "wouter";

interface LeaderData {
  liderId: number;
  liderNome: string;
  liderEmail: string;
  departamentoId: number;
  departamentoNome: string;
  liderTotalAcoes: number;
  liderAcoesConcluidas: number;
  liderTaxaConclusao: number;
  equipeTotalColaboradores: number;
  equipeTotalAcoes: number;
  equipeAcoesConcluidas: number;
  equipeTaxaConclusao: number;
  totalPdisSubordinados: number;
  pdisValidados: number;
  pdisPendentesValidacao: number;
  competenciasLider: Array<{
    macroId: number;
    nome: string;
    quantidade: number;
  }>;
  competenciasEquipe: Array<{
    macroId: number;
    nome: string;
    quantidade: number;
    concluidas: number;
    taxaConclusao: number;
  }>;
  colaboradores: Array<{
    id: number;
    nome: string;
    email: string;
    totalAcoes: number;
    acoesConcluidas: number;
    taxaConclusao: number;
  }>;
  insights: Array<{
    tipo: string;
    mensagem: string;
  }>;
}

function ProgressBar({ value, color = "bg-blue-500", height = "h-3" }: { value: number; color?: string; height?: string }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} overflow-hidden`}>
      <div
        className={`h-full ${color} transition-all duration-500 rounded-full`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function InsightIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case "atencao":
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case "destaque":
      return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    case "alinhamento":
      return <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />;
    case "oportunidade":
      return <Target className="h-4 w-4 text-purple-500 shrink-0" />;
    default:
      return <Lightbulb className="h-4 w-4 text-gray-500 shrink-0" />;
  }
}

function InsightBadgeColor(tipo: string) {
  switch (tipo) {
    case "atencao":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "destaque":
      return "bg-green-50 text-green-800 border-green-200";
    case "alinhamento":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "oportunidade":
      return "bg-purple-50 text-purple-800 border-purple-200";
    default:
      return "bg-gray-50 text-gray-800 border-gray-200";
  }
}

function getPerformanceColor(value: number) {
  if (value >= 70) return "text-green-600";
  if (value >= 40) return "text-amber-600";
  return "text-red-600";
}

function getPerformanceBg(value: number) {
  if (value >= 70) return "bg-green-500";
  if (value >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function getPerformanceBadge(value: number) {
  if (value >= 70) return "bg-green-100 text-green-700 border-green-200";
  if (value >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function LeaderCard({ leader, index, isExpanded, onToggle }: { 
  leader: LeaderData; 
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors py-4 px-5">
            <div className="flex items-center gap-4">
              {/* Posição no ranking */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold ${
                index === 0 ? "bg-amber-100 text-amber-700" :
                index === 1 ? "bg-gray-200 text-gray-700" :
                index === 2 ? "bg-orange-100 text-orange-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {index + 1}
              </div>

              {/* Chevron */}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}

              {/* Nome e departamento */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{leader.liderNome}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {leader.departamentoNome} &middot; {leader.equipeTotalColaboradores} colaborador{leader.equipeTotalColaboradores !== 1 ? "es" : ""}
                </p>
              </div>

              {/* Métricas resumidas */}
              <div className="hidden md:flex items-center gap-6">
                {/* PDIs */}
                {leader.totalPdisSubordinados > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">PDIs</p>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm font-medium">{leader.pdisValidados}/{leader.totalPdisSubordinados}</span>
                      {leader.pdisPendentesValidacao > 0 && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 ml-1">
                          {leader.pdisPendentesValidacao} pend.
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Líder pessoal */}
                <div className="text-center min-w-[70px]">
                  <p className="text-xs text-muted-foreground">Líder</p>
                  <p className={`text-lg font-bold ${getPerformanceColor(leader.liderTaxaConclusao)}`}>
                    {leader.liderTaxaConclusao}%
                  </p>
                </div>

                {/* Equipe */}
                <div className="text-center min-w-[70px]">
                  <p className="text-xs text-muted-foreground">Equipe</p>
                  <p className={`text-lg font-bold ${getPerformanceColor(leader.equipeTaxaConclusao)}`}>
                    {leader.equipeTaxaConclusao}%
                  </p>
                </div>
              </div>

              {/* Barras de progresso compactas (visíveis em mobile) */}
              <div className="flex md:hidden flex-col gap-1 min-w-[80px]">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] w-6 text-blue-600">L</span>
                  <div className="flex-1">
                    <ProgressBar value={leader.liderTaxaConclusao} color="bg-blue-500" height="h-2" />
                  </div>
                  <span className="text-[10px] w-8 text-right">{leader.liderTaxaConclusao}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] w-6 text-emerald-600">E</span>
                  <div className="flex-1">
                    <ProgressBar value={leader.equipeTaxaConclusao} color="bg-emerald-500" height="h-2" />
                  </div>
                  <span className="text-[10px] w-8 text-right">{leader.equipeTaxaConclusao}%</span>
                </div>
              </div>
            </div>

            {/* Barras de progresso desktop */}
            <div className="hidden md:block mt-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs w-12 text-right text-blue-600 font-medium shrink-0">Líder</span>
                  <div className="flex-1">
                    <ProgressBar value={leader.liderTaxaConclusao} color="bg-blue-500" height="h-2.5" />
                  </div>
                  <span className="text-xs w-16 text-right text-muted-foreground shrink-0">
                    {leader.liderAcoesConcluidas}/{leader.liderTotalAcoes} ações
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs w-12 text-right text-emerald-600 font-medium shrink-0">Equipe</span>
                  <div className="flex-1">
                    <ProgressBar value={leader.equipeTaxaConclusao} color="bg-emerald-500" height="h-2.5" />
                  </div>
                  <span className="text-xs w-16 text-right text-muted-foreground shrink-0">
                    {leader.equipeAcoesConcluidas}/{leader.equipeTotalAcoes} ações
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="border-t bg-gray-50/30 pt-6 px-5 pb-6">
            {/* Grid de 3 colunas no desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Coluna 1: Competências do Líder */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-blue-700">
                  <Target className="h-4 w-4" />
                  Foco do Líder
                </h4>
                <div className="bg-white rounded-lg border p-4 space-y-2">
                  {leader.competenciasLider.length > 0 ? (
                    leader.competenciasLider.map((comp, idx) => (
                      <div key={comp.macroId} className="flex items-center justify-between gap-2 py-1">
                        <span className="text-sm text-gray-700 leading-tight flex-1 min-w-0 break-words">
                          {idx + 1}. {comp.nome}
                        </span>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {comp.quantidade} {comp.quantidade === 1 ? "ação" : "ações"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Sem ações registradas</p>
                  )}
                </div>
              </div>

              {/* Coluna 2: Competências da Equipe */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-emerald-700">
                  <BarChart3 className="h-4 w-4" />
                  Foco da Equipe
                </h4>
                <div className="bg-white rounded-lg border p-4 space-y-3">
                  {leader.competenciasEquipe.length > 0 ? (
                    leader.competenciasEquipe.map((comp, idx) => (
                      <div key={comp.macroId}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm text-gray-700 leading-tight flex-1 min-w-0 break-words">
                            {idx + 1}. {comp.nome}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`shrink-0 text-xs ${getPerformanceBadge(comp.taxaConclusao)}`}
                          >
                            {comp.taxaConclusao}%
                          </Badge>
                        </div>
                        <ProgressBar 
                          value={comp.taxaConclusao} 
                          color={getPerformanceBg(comp.taxaConclusao)} 
                          height="h-1.5"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Sem ações registradas</p>
                  )}
                </div>
              </div>

              {/* Coluna 3: Colaboradores */}
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700">
                  <Users className="h-4 w-4" />
                  Colaboradores ({leader.colaboradores.length})
                </h4>
                <div className="bg-white rounded-lg border p-4 max-h-72 overflow-y-auto space-y-2">
                  {leader.colaboradores.length > 0 ? (
                    leader.colaboradores.map((colab) => (
                      <div key={colab.id} className="flex items-center gap-3 py-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{colab.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {colab.acoesConcluidas}/{colab.totalAcoes} ações concluídas
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16">
                            <ProgressBar 
                              value={colab.taxaConclusao} 
                              color={getPerformanceBg(colab.taxaConclusao)} 
                              height="h-1.5"
                            />
                          </div>
                          <span className={`text-xs font-medium w-8 text-right ${getPerformanceColor(colab.taxaConclusao)}`}>
                            {colab.taxaConclusao}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Nenhum colaborador encontrado</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Insights - largura total abaixo das 3 colunas */}
            {leader.insights.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-700">
                  <Lightbulb className="h-4 w-4" />
                  Insights e Recomendações
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {leader.insights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${InsightBadgeColor(insight.tipo)}`}
                    >
                      <InsightIcon tipo={insight.tipo} />
                      <p className="leading-snug">{insight.mensagem}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function AnaliseLideranca() {
  const [expandedLeader, setExpandedLeader] = useState<number | null>(null);
  
  const { data: leadershipData, isLoading } = trpc.dashboard.getLeadershipAnalysis.useQuery();
  
  const rankingData = leadershipData || [];
  
  // Calcular média geral
  const mediaGeral = rankingData.length > 0
    ? Math.round(rankingData.reduce((sum: number, l: LeaderData) => sum + l.equipeTaxaConclusao, 0) / rankingData.length)
    : 0;

  // Calcular média pessoal dos líderes
  const mediaLideres = rankingData.length > 0
    ? Math.round(rankingData.reduce((sum: number, l: LeaderData) => sum + l.liderTaxaConclusao, 0) / rankingData.length)
    : 0;

  // Total de colaboradores
  const totalColaboradores = rankingData.reduce((sum: number, l: LeaderData) => sum + l.equipeTotalColaboradores, 0);
  
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto p-2 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Análise de Liderança</h1>
            <p className="text-muted-foreground">
              Ranking de engajamento: desempenho do líder vs equipe
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Líderes</p>
                  <p className="text-2xl font-bold text-gray-900">{rankingData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Colaboradores</p>
                  <p className="text-2xl font-bold text-gray-900">{totalColaboradores}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média Líderes</p>
                  <p className={`text-2xl font-bold ${getPerformanceColor(mediaLideres)}`}>{mediaLideres}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média Equipes</p>
                  <p className={`text-2xl font-bold ${getPerformanceColor(mediaGeral)}`}>{mediaGeral}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground bg-white rounded-lg border py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span>Conclusão do Líder (pessoal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>Conclusão da Equipe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>&ge;70% Meta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-400" />
            <span>40-69%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span>&lt;40%</span>
          </div>
        </div>

        {/* Dica */}
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg py-2.5 px-4 border border-blue-200">
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span><strong>Dica:</strong> Clique em um líder para ver detalhes das competências focais, lista de colaboradores e insights automáticos.</span>
        </div>
        
        {/* Lista de Líderes */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="mt-3 flex gap-4">
                    <Skeleton className="h-2.5 flex-1 rounded-full" />
                    <Skeleton className="h-2.5 flex-1 rounded-full" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : rankingData.length > 0 ? (
          <div className="space-y-3">
            {rankingData.map((leader: LeaderData, index: number) => (
              <LeaderCard
                key={leader.liderId}
                leader={leader}
                index={index}
                isExpanded={expandedLeader === leader.liderId}
                onToggle={() => setExpandedLeader(
                  expandedLeader === leader.liderId ? null : leader.liderId
                )}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum líder encontrado</h3>
              <p className="text-muted-foreground">
                Não há líderes com equipes cadastradas no sistema.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

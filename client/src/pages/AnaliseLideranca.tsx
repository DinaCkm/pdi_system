import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// Select removido - filtro por departamento desativado
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

function ProgressBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function InsightIcon({ tipo }: { tipo: string }) {
  switch (tipo) {
    case "atencao":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "destaque":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "alinhamento":
      return <Sparkles className="h-5 w-5 text-blue-500" />;
    case "oportunidade":
      return <Target className="h-5 w-5 text-purple-500" />;
    default:
      return <Lightbulb className="h-5 w-5 text-gray-500" />;
  }
}

function InsightBadgeColor(tipo: string) {
  switch (tipo) {
    case "atencao":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "destaque":
      return "bg-green-100 text-green-800 border-green-200";
    case "alinhamento":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "oportunidade":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function LeaderCard({ leader, isExpanded, onToggle }: { 
  leader: LeaderData; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="mb-4 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <CardTitle className="text-lg">{leader.liderNome}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {leader.departamentoNome} • {leader.equipeTotalColaboradores} colaboradores
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Líder</p>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {leader.liderTaxaConclusao}%
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Equipe</p>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {leader.equipeTaxaConclusao}%
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Barras de progresso lado a lado */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 text-right text-blue-600 font-medium">Líder</span>
                <div className="flex-1">
                  <ProgressBar value={leader.liderTaxaConclusao} color="bg-blue-500" />
                </div>
                <span className="text-xs w-12 text-right">{leader.liderAcoesConcluidas}/{leader.liderTotalAcoes}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 text-right text-emerald-600 font-medium">Equipe</span>
                <div className="flex-1">
                  <ProgressBar value={leader.equipeTaxaConclusao} color="bg-emerald-500" />
                </div>
                <span className="text-xs w-12 text-right">{leader.equipeAcoesConcluidas}/{leader.equipeTotalAcoes}</span>
              </div>
            </div>
            
            {/* Validação de PDIs */}
            {leader.totalPdisSubordinados > 0 && (
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-700 font-medium">{leader.pdisValidados} PDIs validados</span>
                </div>
                {leader.pdisPendentesValidacao > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-amber-700 font-medium">{leader.pdisPendentesValidacao} PDIs pendentes de validação</span>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="border-t bg-gray-50/50 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Competências Focais */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Competências Focais
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Foco do Líder */}
                  <div className="bg-white rounded-lg p-4 border">
                    <h5 className="text-sm font-medium text-blue-600 mb-3">Foco do Líder</h5>
                    {leader.competenciasLider.length > 0 ? (
                      <ul className="space-y-2">
                        {leader.competenciasLider.map((comp, idx) => (
                          <li key={comp.macroId} className="text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <span className="leading-tight break-words" style={{ wordBreak: 'break-word' }}>{idx + 1}. {comp.nome}</span>
                              <Badge variant="secondary" className="ml-1 shrink-0">{comp.quantidade}</Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem ações registradas</p>
                    )}
                  </div>
                  
                  {/* Foco da Equipe */}
                  <div className="bg-white rounded-lg p-4 border">
                    <h5 className="text-sm font-medium text-emerald-600 mb-3">Foco da Equipe</h5>
                    {leader.competenciasEquipe.length > 0 ? (
                      <ul className="space-y-2">
                        {leader.competenciasEquipe.map((comp, idx) => (
                          <li key={comp.macroId} className="text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <span className="leading-tight break-words" style={{ wordBreak: 'break-word' }}>{idx + 1}. {comp.nome}</span>
                              <Badge 
                                variant="secondary" 
                                className={`shrink-0 ${comp.taxaConclusao >= 70 ? "bg-green-100 text-green-700" : comp.taxaConclusao < 50 ? "bg-red-100 text-red-700" : ""}`}
                              >
                                {comp.taxaConclusao}%
                              </Badge>
                            </div>
                            <div className="mt-1">
                              <ProgressBar 
                                value={comp.taxaConclusao} 
                                color={comp.taxaConclusao >= 70 ? "bg-green-500" : comp.taxaConclusao < 50 ? "bg-red-400" : "bg-amber-400"} 
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem ações registradas</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Colaboradores da Equipe */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Colaboradores da Equipe
                </h4>
                
                <div className="bg-white rounded-lg p-4 border max-h-64 overflow-y-auto">
                  {leader.colaboradores.length > 0 ? (
                    <ul className="space-y-3">
                      {leader.colaboradores.map((colab) => (
                        <li key={colab.id} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{colab.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {colab.acoesConcluidas}/{colab.totalAcoes} ações
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="w-20">
                              <ProgressBar 
                                value={colab.taxaConclusao} 
                                color={colab.taxaConclusao >= 70 ? "bg-green-500" : colab.taxaConclusao < 50 ? "bg-red-400" : "bg-amber-400"} 
                              />
                            </div>
                            <Badge 
                              variant="outline"
                              className={
                                colab.taxaConclusao >= 70 
                                  ? "bg-green-50 text-green-700 border-green-200" 
                                  : colab.taxaConclusao < 50 
                                    ? "bg-red-50 text-red-700 border-red-200" 
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              }
                            >
                              {colab.taxaConclusao}%
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador encontrado</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Insights */}
            {leader.insights.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Insights e Recomendações
                </h4>
                
                <div className="space-y-2">
                  {leader.insights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 p-3 rounded-lg border ${InsightBadgeColor(insight.tipo)}`}
                    >
                      <InsightIcon tipo={insight.tipo} />
                      <p className="text-sm">{insight.mensagem}</p>
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
  
  // Usar dados diretamente sem filtro - já vem ordenado por ranking do backend
  const rankingData = leadershipData || [];
  
  // Calcular média geral
  const mediaGeral = rankingData.length > 0
    ? Math.round(rankingData.reduce((sum: number, l: LeaderData) => sum + l.equipeTaxaConclusao, 0) / rankingData.length)
    : 0;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">Análise de Liderança</h1>
            <p className="text-muted-foreground">
              Ranking de engajamento: desempenho do líder vs equipe
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Média Geral das Equipes</p>
            <p className="text-2xl font-bold text-emerald-600">{mediaGeral}%</p>
          </div>
        </div>
        
        {/* Legenda */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-sm">Taxa de Conclusão do Líder (pessoal)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <span className="text-sm">Taxa de Conclusão da Equipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-300" />
                  <span className="text-sm">Linha de meta: 70%</span>
                </div>
              </div>
              
              {/* Instrução para o usuário */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-blue-50 rounded-lg py-2 px-4 border border-blue-200">
                <ChevronRight className="h-4 w-4 text-blue-500" />
                <span><strong>Dica:</strong> Clique em um líder para ver detalhes das competências focais, lista de colaboradores e insights automáticos.</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Lista de Líderes */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32 mt-2" />
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : rankingData.length > 0 ? (
          <div>
            {rankingData.map((leader: LeaderData, index: number) => (
              <div key={leader.liderId} className="relative">
                {/* Indicador de posição */}
                <div className="absolute -left-8 top-6 flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold">
                  {index + 1}
                </div>
                
                <LeaderCard
                  leader={leader}
                  isExpanded={expandedLeader === leader.liderId}
                  onToggle={() => setExpandedLeader(
                    expandedLeader === leader.liderId ? null : leader.liderId
                  )}
                />
              </div>
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

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Gauge, TrendingUp, Users, Award, Target, Info, Eye, X, FileText, ExternalLink, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface IIPDashboardProps {
  /** Papel do usuário: admin, gerente, lider, colaborador */
  userRole?: string;
  /** ID do colaborador (para visão individual) */
  colaboradorId?: number;
  /** ID do departamento (para filtro) */
  departamentoId?: number;
  /** Mostrar versão compacta (card único) */
  compact?: boolean;
}

function getIIPColor(iip: number): string {
  if (iip >= 80) return "#10b981"; // verde
  if (iip >= 60) return "#3b82f6"; // azul
  if (iip >= 40) return "#f59e0b"; // amarelo
  if (iip >= 20) return "#f97316"; // laranja
  return "#ef4444"; // vermelho
}

function getIIPLabel(iip: number): string {
  if (iip >= 80) return "Excelente";
  if (iip >= 60) return "Bom";
  if (iip >= 40) return "Regular";
  if (iip >= 20) return "Baixo";
  return "Crítico";
}

function IIPGauge({ value, size = "lg" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const color = getIIPColor(value);
  const label = getIIPLabel(value);
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-36 h-36",
  };
  const textSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const radius = size === "lg" ? 60 : size === "md" ? 48 : 34;
  const circumference = Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        <svg viewBox={`0 0 ${radius * 2 + 20} ${radius + 20}`} className="w-full h-full">
          <path
            d={`M 10 ${radius + 10} A ${radius} ${radius} 0 0 1 ${radius * 2 + 10} ${radius + 10}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={`M 10 ${radius + 10} A ${radius} ${radius} 0 0 1 ${radius * 2 + 10} ${radius + 10}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`${textSize[size]} font-bold`} style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

export function IIPDashboard({ userRole, colaboradorId, departamentoId, compact }: IIPDashboardProps) {
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<number | null>(null);
  const [showEvidenciasDialog, setShowEvidenciasDialog] = useState(false);

  const { data: iipData, isLoading } = trpc.evidences.getIIP.useQuery({
    colaboradorId,
    departamentoId,
  });

  // Buscar evidências do colaborador selecionado (para o dialog de detalhes)
  const { data: evidenciasColaborador, isLoading: loadingEvidencias } = (trpc.evidences as any).listByColaborador.useQuery(
    { colaboradorId: selectedColaboradorId! },
    { enabled: !!selectedColaboradorId && showEvidenciasDialog }
  );

  const canViewDetails = userRole === "admin" || userRole === "gerente" || userRole === "lider";

  if (isLoading) {
    return (
      <Card className="border-indigo-200">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Skeleton className="h-36 w-36 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!iipData || iipData.totalEvidencias === 0) {
    return (
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <Gauge className="h-5 w-5" />
            IIP - Índice de Impacto Prático
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-white/60 rounded-lg">
            <Info className="h-5 w-5 text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Ainda não há evidências aprovadas com impacto validado para calcular o IIP.
              O índice será exibido quando o administrador avaliar evidências e validar o impacto prático.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dados para o gráfico de barras (ranking por colaborador)
  const rankingData = (iipData.porColaborador || [])
    .slice(0, 10)
    .map((c: any, idx: number) => ({
      name: c.colaboradorNome?.split(" ").slice(0, 2).join(" ") || `Col. ${c.colaboradorId}`,
      iip: c.iip,
      evidencias: c.totalEvidencias,
      fill: getIIPColor(c.iip),
    }));

  const handleClickColaborador = (colaboradorId: number) => {
    if (!canViewDetails) return;
    setSelectedColaboradorId(colaboradorId);
    setShowEvidenciasDialog(true);
  };

  const closeDialog = () => {
    setShowEvidenciasDialog(false);
    setSelectedColaboradorId(null);
  };

  // Empregado não vê ranking por colaborador individual (privacidade)
  const showRanking = userRole !== "colaborador";

  if (compact) {
    return (
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
            <Gauge className="h-5 w-5" />
            IIP - Índice de Impacto Prático
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <IIPGauge value={iipData.iipGeral} size="md" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-indigo-500" />
                <span className="text-gray-600">Evidências avaliadas:</span>
                <span className="font-semibold">{iipData.totalEvidencias}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="text-gray-600">Colaboradores:</span>
                <span className="font-semibold">{iipData.totalColaboradores}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card Principal - IIP Geral */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <Gauge className="h-5 w-5" />
            IIP - Índice de Impacto Prático
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gauge principal */}
            <div className="flex flex-col items-center justify-center">
              <IIPGauge value={iipData.iipGeral} size="lg" />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Impacto prático das ações entregues no dia a dia
              </p>
            </div>

            {/* KPIs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm text-gray-700">Evidências Avaliadas</span>
                </div>
                <span className="text-lg font-bold text-indigo-700">{iipData.totalEvidencias}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm text-gray-700">Colaboradores com IIP</span>
                </div>
                <span className="text-lg font-bold text-indigo-700">{iipData.totalColaboradores}</span>
              </div>
              {iipData.porColaborador && iipData.porColaborador.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-700">Maior IIP Individual</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: getIIPColor(iipData.porColaborador[0].iip) }}>
                    {iipData.porColaborador[0].iip}%
                  </span>
                </div>
              )}
            </div>

            {/* Médias separadas: Empregado vs Admin */}
            <div className="space-y-3">
              {iipData.mediaEmpregado != null && (
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-700">Média Empregado</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{iipData.mediaEmpregado}%</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-700">Média Admin</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{iipData.mediaAdmin}%</span>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <h4 className="text-xs font-semibold text-indigo-800 mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> O que é o IIP?
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Este indicador mede o <strong>impacto prático das ações entregues</strong> no dia a dia do empregado.
                  O <strong>IIP</strong> é a média entre o impacto declarado pelo empregado e o validado pelo administrador.
                  Quando o empregado não declara impacto, este cálculo não é considerado na entrega da ação concluída.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranking por Colaborador - visível para admin, gerente e líder (com clique) e empregado (sem clique, sem nomes) */}
      {rankingData.length > 0 && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
              <TrendingUp className="h-5 w-5" />
              {showRanking ? "Ranking IIP por Colaborador" : "Visão Geral do IIP na Empresa"}
              {canViewDetails && (
                <span className="text-xs font-normal text-gray-500 ml-2">(clique no colaborador para ver evidências)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showRanking && (
              <ResponsiveContainer width="100%" height={Math.max(200, rankingData.length * 40)}>
                <BarChart
                  data={rankingData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, "IIP"]}
                    labelFormatter={(label) => `Colaborador: ${label}`}
                  />
                  <Bar dataKey="iip" radius={[0, 6, 6, 0]}>
                    {rankingData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Lista detalhada */}
            <div className={`${showRanking ? 'mt-4' : ''} space-y-2`}>
              {(iipData.porColaborador || []).slice(0, showRanking ? 10 : 5).map((c: any, idx: number) => (
                <div 
                  key={c.colaboradorId} 
                  className={`flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm ${canViewDetails ? 'cursor-pointer hover:bg-indigo-50 hover:shadow-sm transition-all' : ''}`}
                  onClick={() => canViewDetails && handleClickColaborador(c.colaboradorId)}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: getIIPColor(c.iip) }}>
                      {idx + 1}
                    </span>
                    <span className="font-medium">{showRanking ? c.colaboradorNome : `Colaborador ${idx + 1}`}</span>
                    {canViewDetails && (
                      <Eye className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{c.totalEvidencias} evid.</span>
                    {c.mediaEmpregado != null && (
                      <span className="text-xs text-blue-500" title="Média empregado">E: {c.mediaEmpregado}%</span>
                    )}
                    <span className="text-xs text-purple-500" title="Média admin">A: {c.mediaAdmin}%</span>
                    <span className="font-bold" style={{ color: getIIPColor(c.iip) }}>{c.iip}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo para empregado */}
            {userRole === "colaborador" && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                <p className="text-xs text-indigo-700">
                  Este é o panorama geral do IIP da empresa. Quanto maior o impacto prático declarado e validado, melhor o índice.
                  Continue registrando suas evidências com detalhes sobre como aplicou o aprendizado no dia a dia.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Evidências do Colaborador */}
      <Dialog open={showEvidenciasDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-800">
              <FileText className="h-5 w-5" />
              Evidências com Aplicabilidade Prática
            </DialogTitle>
          </DialogHeader>
          
          {loadingEvidencias ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : evidenciasColaborador && evidenciasColaborador.length > 0 ? (
            <div className="space-y-4">
              {evidenciasColaborador.map((ev: any) => (
                <Card key={ev.id} className="border-gray-200">
                  <CardContent className="pt-4 space-y-3">
                    {/* Cabeçalho da evidência */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{ev.acaoTitulo || 'Ação'}</h4>
                        <p className="text-xs text-gray-500">
                          {ev.colaboradorNome} - {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>
                      <Badge variant={ev.status === 'aprovada' ? 'default' : 'secondary'} className={ev.status === 'aprovada' ? 'bg-green-100 text-green-700' : ''}>
                        {ev.status}
                      </Badge>
                    </div>

                    {/* Tipo e Carga Horária */}
                    {(ev.tipoEvidencia || ev.cargaHoraria) && (
                      <div className="flex gap-4 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                        {ev.tipoEvidencia && <span><strong>Tipo:</strong> {ev.tipoEvidencia}</span>}
                        {ev.cargaHoraria && <span><strong>Carga Horária:</strong> {ev.cargaHoraria}h</span>}
                      </div>
                    )}

                    {/* O que realizou */}
                    {ev.oQueRealizou && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">O que realizou:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{ev.oQueRealizou}</p>
                      </div>
                    )}

                    {/* Como aplicou na prática */}
                    {ev.comoAplicou && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Como aplicou na prática:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{ev.comoAplicou}</p>
                      </div>
                    )}

                    {/* Resultado prático */}
                    {ev.resultadoPratico && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Resultado prático:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{ev.resultadoPratico}</p>
                      </div>
                    )}

                    {/* Impacto declarado pelo empregado */}
                    {ev.impactoPercentual != null && ev.impactoPercentual > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">Impacto declarado:</span>
                        <Badge className="bg-blue-100 text-blue-700">{ev.impactoPercentual}%</Badge>
                      </div>
                    )}

                    {/* Principal aprendizado */}
                    {ev.principalAprendizado && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Principal aprendizado:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{ev.principalAprendizado}</p>
                      </div>
                    )}

                    {/* Avaliação do Admin */}
                    {ev.impactoValidadoAdmin != null && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs font-semibold text-purple-700 mb-2">Avaliação do Administrador:</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Evidência comprova:</span>
                            <Badge className={ev.evidenciaComprova === 'sim' ? 'bg-green-100 text-green-700' : ev.evidenciaComprova === 'insuficiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                              {ev.evidenciaComprova === 'sim' ? 'Sim' : ev.evidenciaComprova === 'insuficiente' ? 'Insuficiente' : 'Não'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Impacto validado:</span>
                            <Badge className="bg-purple-100 text-purple-700">{ev.impactoValidadoAdmin}%</Badge>
                          </div>
                        </div>
                        {ev.parecerImpacto && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Parecer: <span className="italic">{ev.parecerImpacto}</span></p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Link externo */}
                    {ev.linkExterno && (
                      <a href={ev.linkExterno} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Link externo
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma evidência encontrada para este colaborador.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

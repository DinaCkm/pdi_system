import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock, FileText, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VisaoExecutivaProps {
  departamentoId?: number;
}

export function VisaoExecutiva({ departamentoId }: VisaoExecutivaProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Buscar dados da Visão Executiva
  const { data, isLoading, isError } = trpc.visaoExecutiva.getVisaoExecutivaCompleta.useQuery(
    { departamentoId },
    { 
      enabled: true,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Erro ao Carregar Visão Executiva</CardTitle>
        </CardHeader>
        <CardContent className="text-red-700">
          Não foi possível carregar os dados da Visão Executiva. Por favor, tente novamente.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const progressoPercentual = data.progresso.progressoGeral.totalAcoes > 0
    ? Math.round((data.progresso.progressoGeral.acoesConcluidas / data.progresso.progressoGeral.totalAcoes) * 100)
    : 0;

  // Função para buscar dados de um tipo específico de PDI
  const getDadosTipo = (tipo: string) => {
    const item = data.progresso.progressoPorTipo.find((p: any) => p.tipo === tipo);
    if (!item) return { totalAcoes: 0, acoesConcluidas: 0, acoesEmAberto: 0, percentual: 0 };
    
    const percentual = item.totalAcoes > 0 
      ? Math.round((item.acoesConcluidas / item.totalAcoes) * 1000) / 10 
      : 0;
      
    return { ...item, percentual };
  };

  const certificacao = getDadosTipo('certificacao');
  const herdeiras = getDadosTipo('herdeiras');
  const onboarding = getDadosTipo('onboarding');

  return (
    <div className="space-y-6">
      {/* Cabeçalho Expansível */}
      <div
        className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg">Visão Executiva — Painel de Gestão do PDI</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">Clique para {isExpanded ? "fechar" : "abrir"}</span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-white" />
            ) : (
              <ChevronDown className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* BLOCO 1: Progresso Geral de Execução do PDI */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-600 uppercase">QUANTO DO PDI JÁ FOI EXECUTADO?</span>
              </div>
              <CardTitle className="text-xl text-gray-800 mt-2">Progresso Geral de Execução do PDI no Sebrae TO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de Progresso */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-500 h-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
                      style={{ width: `${progressoPercentual}%` }}
                    >
                      {progressoPercentual}% concluído
                    </div>
                  </div>
                </div>
              </div>

              {/* Texto Explicativo */}
              <p className="text-sm text-gray-700">
                De cada <span className="font-bold text-purple-600">{data.progresso.progressoGeral.totalAcoes} ações planejadas</span>, <span className="font-bold text-purple-600">{data.progresso.progressoGeral.acoesConcluidas} já foram concluídas</span> com sucesso pelos empregados.
              </p>

              {/* Resumo à Direita */}
              <div className="text-right">
                <p className="text-xs text-gray-600">
                  <span className="font-bold text-purple-600">{data.progresso.progressoGeral.acoesConcluidas} concluídas</span> / <span className="font-bold text-purple-600">{data.progresso.progressoGeral.totalAcoes} planejadas</span>
                </p>
              </div>

              {/* Cards por Tipo de PDI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Card Certificação */}
                <Card className="border-purple-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📚</span>
                      <div>
                        <p className="text-xs font-semibold text-purple-600 uppercase">PDI DA CERTIFICAÇÃO 2026</p>
                        <p className="text-sm text-gray-600">PDI 01/2026 — Base: Certificação</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-purple-600">{certificacao.totalAcoes}</p>
                    <p className="text-xs text-gray-600">ações planejadas</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${certificacao.percentual}%` }}></div>
                    </div>
                    <p className="text-xs font-semibold text-purple-600">{certificacao.percentual}%</p>
                    <div className="flex justify-between text-xs text-gray-600 pt-2">
                      <span>{certificacao.acoesConcluidas} concluídas</span>
                      <span>{certificacao.acoesEmAberto} em aberto</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Ações Herdadas */}
                <Card className="border-cyan-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔄</span>
                      <div>
                        <p className="text-xs font-semibold text-cyan-600 uppercase">AÇÕES HERDADAS DE 2025</p>
                        <p className="text-sm text-gray-600">PDI — Consolidação de Ações Pendentes de 2025</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-cyan-600">{herdeiras.totalAcoes}</p>
                    <p className="text-xs text-gray-600">ações planejadas</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-cyan-600 h-2 rounded-full" style={{ width: `${herdeiras.percentual}%` }}></div>
                    </div>
                    <p className="text-xs font-semibold text-cyan-600">{herdeiras.percentual}%</p>
                    <div className="flex justify-between text-xs text-gray-600 pt-2">
                      <span>{herdeiras.acoesConcluidas} concluídas</span>
                      <span>{herdeiras.acoesEmAberto} em aberto</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Onboarding */}
                <Card className="border-teal-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <div>
                        <p className="text-xs font-semibold text-teal-600 uppercase">PDI DE INTEGRAÇÃO</p>
                        <p className="text-sm text-gray-600">PDI Integração — Novos Empregados</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-teal-600">{onboarding.totalAcoes}</p>
                    <p className="text-xs text-gray-600">ações planejadas</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${onboarding.percentual}%` }}></div>
                    </div>
                    <p className="text-xs font-semibold text-teal-600">{onboarding.percentual}%</p>
                    <div className="flex justify-between text-xs text-gray-600 pt-2">
                      <span>{onboarding.acoesConcluidas} concluídas</span>
                      <span>{onboarding.acoesEmAberto} em aberto</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rodapé Explicativo */}
              <p className="text-xs text-gray-600 border-t pt-3 mt-4">
                <strong>ℹ️ Entenda os PDIs:</strong> O PDI da Certificação contém ações novas planejadas com base nos Relatórios da Certificação realizada em 12/2025. O PDI de Consolidação reúne ações que foram iniciadas em 2025 e transferidas para conclusão em 2026. O PDI de Integração é destinado a empregados que ingressaram recentemente na organização.
              </p>
            </CardContent>
          </Card>

          {/* BLOCO 2: Média de Ações por Empregado */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <span className="text-xs font-semibold text-blue-600 uppercase">MÉDIA DE AÇÕES POR EMPREGADO</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                  <p className="text-4xl font-bold text-blue-600">{data.media.totalEmpregados}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-2">Total de Empregados</p>
                  <p className="text-xs text-gray-500">com PDI ativo no sistema</p>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                  <p className="text-4xl font-bold text-blue-600">{data.media.mediaGeral}</p>
                  <p className="text-sm font-semibold text-gray-700 mt-2">Média Geral</p>
                  <p className="text-xs text-gray-500">ações planejadas por empregado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 3: Situação Atual das Ações */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <span className="text-xs font-semibold text-green-600 uppercase">SITUAÇÃO ATUAL DAS AÇÕES</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Aprovadas */}
                <Card className="border-green-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-xs font-semibold text-green-600 uppercase">AÇÕES APROVADAS</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-green-600">{data.situacao.acoesAprovadas}</p>
                    <p className="text-sm text-gray-600">Ações Aprovadas pelo Líder</p>
                    <p className="text-xs text-gray-500 mt-3">O líder já analisou e aprovou estas ações. O empregado está autorizado a executá-las.</p>
                  </CardContent>
                </Card>

                {/* Card Executadas */}
                <Card className="border-blue-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-600 uppercase">AÇÕES EXECUTADAS</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-blue-600">{data.situacao.acoesExecutadas}</p>
                    <p className="text-sm text-gray-600">Ações Concluídas com Sucesso</p>
                    <p className="text-xs text-gray-500 mt-3">O empregado realizou a ação, enviou a comprovação e o avaliador confirmou a conclusão.</p>
                  </CardContent>
                </Card>

                {/* Card Vencidas */}
                <Card className="border-red-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-xs font-semibold text-red-600 uppercase">AÇÕES VENCIDAS</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-red-600">{data.situacao.acoesVencidas}</p>
                    <p className="text-sm text-gray-600">Ações com Prazo Vencido</p>
                    <p className="text-xs text-gray-500 mt-3">O prazo dessas ações já passou e elas ainda não foram concluídas pelos empregados.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 4: Situação das Comprovações e Impacto Prático */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader>
              <span className="text-xs font-semibold text-orange-600 uppercase">COMPROVAÇÕES E IMPACTO PRÁTICO</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                  <p className="text-3xl font-bold text-orange-600">{data.comprovacoes.comprovacoeAguardando}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2 uppercase">AGUARDANDO AVALIAÇÃO</p>
                  <p className="text-xs text-gray-500">comprovações enviadas</p>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                  <p className="text-3xl font-bold text-orange-600">{data.comprovacoes.comprovacoeDevolvidas}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2 uppercase">DEVOLVIDAS PARA AJUSTE</p>
                  <p className="text-xs text-gray-500">correção solicitada</p>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                  <p className="text-3xl font-bold text-orange-600">{data.comprovacoes.impactoPratico}%</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2 uppercase">IMPACTO PRÁTICO MÉDIO</p>
                  <p className="text-xs text-gray-500">das ações concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 5: Solicitações de Inserção de Novas Ações */}
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <span className="text-xs font-semibold text-indigo-600 uppercase">SOLICITAÇÕES DE NOVAS AÇÕES</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
                  <p className="text-3xl font-bold text-indigo-600">{data.solicitacoes.totalSolicitacoes}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2 uppercase">TOTAL SOLICITADO</p>
                  <p className="text-xs text-gray-500">novas ações propostas</p>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
                  <p className="text-3xl font-bold text-green-600">{data.solicitacoes.solicitacoesAprovadas}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2 uppercase">APROVADAS</p>
                  <p className="text-xs text-gray-500">incluídas no PDI</p>
                </div>
                <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
                  <p className="text-3xl font-bold text-red-600">{data.solicitacoes.solicitacoesReprovadas}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2 uppercase">REPROVADAS</p>
                  <p className="text-xs text-gray-500">pelo gestor ou RH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

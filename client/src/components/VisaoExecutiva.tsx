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
    { enabled: true }
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

  // Classificação do impacto prático
  const classificarImpacto = (percentual: number) => {
    if (percentual >= 70) return "BOM";
    if (percentual >= 50) return "REGULAR";
    return "PRECISA MELHORAR";
  };

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
                    <p className="text-3xl font-bold text-purple-600">549</p>
                    <p className="text-xs text-gray-600">ações planejadas</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: "35.2%" }}></div>
                    </div>
                    <p className="text-xs font-semibold text-purple-600">35.2%</p>
                    <div className="flex justify-between text-xs text-gray-600 pt-2">
                      <span>193 concluídas</span>
                      <span>356 em aberto</span>
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
                    <p className="text-3xl font-bold text-cyan-600">450</p>
                    <p className="text-xs text-gray-600">ações planejadas</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-cyan-600 h-2 rounded-full" style={{ width: "53.3%" }}></div>
                    </div>
                    <p className="text-xs font-semibold text-cyan-600">53.3%</p>
                    <div className="flex justify-between text-xs text-gray-600 pt-2">
                      <span>240 concluídas</span>
                      <span>210 em aberto</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Onboarding */}
                <Card className="border-teal-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👥</span>
                      <div>
                        <p className="text-xs font-semibold text-teal-600 uppercase">PDI DE INTEGRAÇÃO (ONBOARDING / CROSSBOARDING)</p>
                        <p className="text-sm text-gray-600">PDI Integração — Novos Empregados</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-teal-600">84</p>
                    <p className="text-xs text-gray-600">ações planejadas</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-teal-600 h-2 rounded-full" style={{ width: "78.6%" }}></div>
                    </div>
                    <p className="text-xs font-semibold text-teal-600">78.6%</p>
                    <div className="flex justify-between text-xs text-gray-600 pt-2">
                      <span>66 concluídas</span>
                      <span>18 em aberto</span>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{data.media.totalEmpregados}</p>
                  <p className="text-xs text-gray-600 mt-1">Total de Empregados</p>
                  <p className="text-xs text-gray-500">com PDI ativo</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{data.media.mediaGeral}</p>
                  <p className="text-xs text-gray-600 mt-1">Média Geral</p>
                  <p className="text-xs text-gray-500">ações por empregado</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">3.8</p>
                  <p className="text-xs text-gray-600 mt-1">PDI Certificação</p>
                  <p className="text-xs text-gray-500">ações por empregado</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">4.4</p>
                  <p className="text-xs text-gray-600 mt-1">PDI Consolidação 2025</p>
                  <p className="text-xs text-gray-500">ações por empregado</p>
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
                      <p className="text-xs font-semibold text-green-600 uppercase">QUANTAS AÇÕES FORAM APROVADAS?</p>
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
                      <p className="text-xs font-semibold text-blue-600 uppercase">QUANTAS AÇÕES FORAM EXECUTADAS?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-blue-600">{data.situacao.acoesExecutadas}</p>
                    <p className="text-sm text-gray-600">Ações Executadas e Concluídas com Sucesso</p>
                    <p className="text-xs text-gray-500 mt-3">O empregado realizou a ação, enviou a comprovação e o avaliador confirmou a conclusão.</p>
                  </CardContent>
                </Card>

                {/* Card Vencidas */}
                <Card className="border-red-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-xs font-semibold text-red-600 uppercase">QUANTAS AÇÕES ESTÃO VENCIDAS?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-red-600">{data.situacao.acoesVencidas}</p>
                    <p className="text-sm text-gray-600">Ações com Prazo Vencido — Requerem Atenção</p>
                    <p className="text-xs text-gray-500 mt-3">O prazo dessas ações já passou e elas ainda não foram concluídas pelos empregados.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 4: Situação das Comprovações e Impacto Prático */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader>
              <span className="text-xs font-semibold text-orange-600 uppercase">SITUAÇÃO DAS COMPROVAÇÕES E IMPACTO PRÁTICO</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Aguardando Avaliação */}
                <Card className="border-orange-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <p className="text-xs font-semibold text-orange-600 uppercase">QUANTAS COMPROVAÇÕES AGUARDAM AVALIAÇÃO?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-orange-600">{data.comprovacoes.comprovacoeAguardando}</p>
                    <p className="text-sm text-gray-600">Comprovações Enviadas — Aguardando Avaliação do RH</p>
                    <p className="text-xs text-gray-500 mt-3">O empregado já enviou o comprovante de que realizou a ação, mas o avaliador ainda não analisou.</p>
                  </CardContent>
                </Card>

                {/* Card Devolvidas */}
                <Card className="border-red-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-xs font-semibold text-red-600 uppercase">QUANTAS COMPROVAÇÕES FORAM DEVOLVIDAS?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-red-600">{data.comprovacoes.comprovacoeDevolvidas}</p>
                    <p className="text-sm text-gray-600">Comprovações Devolvidas — Empregado Precisa Refazer</p>
                    <p className="text-xs text-gray-500 mt-3">O avaliador analisou e devolveu porque a comprovação não atende aos critérios. O empregado ainda pode corrigir e enviar novamente.</p>
                  </CardContent>
                </Card>

                {/* Card Impacto Prático */}
                <Card className="border-cyan-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-cyan-600" />
                      <p className="text-xs font-semibold text-cyan-600 uppercase">AS AÇÕES ESTÃO GERANDO RESULTADO PRÁTICO?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-cyan-600">{data.comprovacoes.impactoPratico}%</p>
                    <p className="text-sm text-gray-600">Impacto Prático das Ações no Trabalho Diário</p>
                    <p className="text-xs font-semibold text-cyan-600 mt-2">Classificado como {classificarImpacto(data.comprovacoes.impactoPratico)}</p>
                    <p className="text-xs text-gray-500 mt-2">Mede o quanto as ações realizadas estão gerando resultado real no trabalho diário.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* BLOCO 5: Solicitações de Inserção de Novas Ações no PDI */}
          <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
            <CardHeader>
              <span className="text-xs font-semibold text-cyan-600 uppercase">SOLICITAÇÕES DE INSERÇÃO DE NOVAS AÇÕES NO PDI</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Solicitações Feitas */}
                <Card className="border-cyan-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-cyan-600" />
                      <p className="text-xs font-semibold text-cyan-600 uppercase">QUANTAS SOLICITAÇÕES FORAM FEITAS?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-cyan-600">{data.solicitacoes.totalSolicitacoes}</p>
                    <p className="text-sm text-gray-600">Solicitações de Inserção de Novas Ações</p>
                    <p className="text-xs text-gray-500 mt-3">Empregados solicitaram a inclusão de novas ações no seu plano de desenvolvimento.</p>
                  </CardContent>
                </Card>

                {/* Card Aprovadas e Incluídas */}
                <Card className="border-green-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-xs font-semibold text-green-600 uppercase">QUANTAS FORAM VALIDADAS E INCLUÍDAS?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-green-600">{data.solicitacoes.solicitacoesAprovadas}</p>
                    <p className="text-sm text-gray-600">Solicitações Aprovadas e Incluídas no PDI</p>
                    <p className="text-xs text-gray-500 mt-3">Estas solicitações passaram por todo o fluxo de aprovação e a nova ação foi incluída no PDI do empregado.</p>
                  </CardContent>
                </Card>

                {/* Card Reprovadas */}
                <Card className="border-red-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <p className="text-xs font-semibold text-red-600 uppercase">QUANTAS FORAM REPROVADAS?</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-bold text-red-600">{data.solicitacoes.solicitacoesReprovadas}</p>
                    <p className="text-sm text-gray-600">Solicitações Reprovadas — Não Incluídas no PDI</p>
                    <p className="text-xs text-gray-500 mt-3">Estas solicitações foram analisadas e não foram aprovadas pelo líder ou pelo RH.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Medal, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DashboardStatsProps {
  userRole?: string;
  userId?: number;
  departamentoId?: number;
  stats: {
    blocoA: {
      totalColaboradores: number;
      totalLideres: number;
      taxaEngajamento: number;
    };
    blocoB: {
      pendente: number;
      emAndamento: number;
      concluida: number;
      percentualPendente: number;
      percentualEmAndamento: number;
      percentualConcluida: number;
    };
    blocoC: {
      top5Departamentos: Array<{
        departamentoId: number;
        departamentoNome: string;
        taxaConclusao: number;
        acoesConcluidas: number;
        acoesTotal: number;
      }>;
    };
    blocoD: {
      top10Colaboradores: Array<{
        colaboradorId: number;
        colaboradorNome: string;
        acoesConcluidasTotal: number;
        acoesTotal: number;
        taxaConclusao: number;
        posicao: number;
        medalha?: "ouro" | "prata" | "bronze";
      }>;
    };
    blocoE?: {
      minhasAcoesTotal: number;
      minhasAcoesConcluidas: number;
      minhaTaxaConclusao: number;
      minhaPosicaoRanking: number;
    };
  };
}

export function DashboardStats({ stats, userRole, departamentoId }: DashboardStatsProps) {
  // Query para estatísticas de prazo com filtro de departamento (usa o filtro do Dashboard pai)
  const { data: estatisticasPrazo } = trpc.prazos.estatisticas.useQuery(
    departamentoId ? { departamentoId } : undefined
  );
  const { data: acoesVencidas } = trpc.prazos.vencidas.useQuery({ 
    limite: 5,
    departamentoId: departamentoId 
  });

  // Dados para o gráfico de prazos
  const prazosData = estatisticasPrazo ? [
    { name: "Vencidas", value: estatisticasPrazo.vencidas, color: "#ef4444" },
    { name: "Próximas (7 dias)", value: estatisticasPrazo.proximas, color: "#f59e0b" },
    { name: "No Prazo", value: estatisticasPrazo.noPrazo, color: "#10b981" },
  ].filter((item) => item.value > 0) : [];

  // Dados para o gráfico de rosca (Funil de Execução)
  const funnelData = [
    { name: "Pendente", value: stats.blocoB.percentualPendente, color: "#ef4444" },
    { name: "Em Andamento", value: stats.blocoB.percentualEmAndamento, color: "#f59e0b" },
    { name: "Concluída", value: stats.blocoB.percentualConcluida, color: "#10b981" },
  ].filter((item) => item.value > 0);

  // Dados para o gráfico de barras (Top 5 Departamentos)
  const departamentosData = stats.blocoC.top5Departamentos.map((dept) => ({
    name: dept.departamentoNome,
    taxa: dept.taxaConclusao,
  }));

  return (
    <div className="space-y-6">
      {/* ============= BLOCO E: ESTATÍSTICAS PESSOAIS DO COLABORADOR ============= */}
      {userRole === "colaborador" && stats.blocoE && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Meu Desempenho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">Minhas Ações</p>
                <p className="text-2xl font-bold text-blue-600">{stats.blocoE.minhasAcoesTotal}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{stats.blocoE.minhasAcoesConcluidas}</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">Minha Taxa</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.blocoE.minhaTaxaConclusao}%</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-muted-foreground">Minha Posição no Ranking</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.blocoE.minhaPosicaoRanking > 0 ? `${stats.blocoE.minhaPosicaoRanking}º` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============= BLOCO A: KPIs GERAIS ============= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.blocoA.totalColaboradores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Líderes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.blocoA.totalLideres}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.blocoA.taxaEngajamento}%</div>
          </CardContent>
        </Card>
      </div>

      {/* ============= BLOCO B: FUNIL DE EXECUÇÃO ============= */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Execução</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={funnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground py-8">Sem dados disponíveis</div>
          )}
        </CardContent>
      </Card>

      {/* ============= BLOCO PRAZOS: STATUS DE PRAZOS DAS AÇÕES ============= */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Status de Prazos das Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gráfico de Pizza */}
            <div>
              {prazosData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prazosData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {prazosData.map((entry, index) => (
                        <Cell key={`cell-prazo-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">Sem ações pendentes</div>
              )}
            </div>
            
            {/* Cards de Resumo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700">Vencidas</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{estatisticasPrazo?.vencidas || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-700">Próximas do Vencimento (7 dias)</span>
                </div>
                <span className="text-2xl font-bold text-amber-600">{estatisticasPrazo?.proximas || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">No Prazo</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{estatisticasPrazo?.noPrazo || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Lista de Ações Vencidas */}
          {acoesVencidas && acoesVencidas.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Ações Vencidas (Top 5)
              </h4>
              <div className="space-y-2">
                {acoesVencidas.map((acao) => (
                  <div key={acao.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                    <div>
                      <p className="font-medium text-sm">{acao.titulo}</p>
                      <p className="text-xs text-muted-foreground">{acao.colaboradorNome} - {acao.departamentoNome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600 font-medium">{acao.diasVencido} dias atrasado</p>
                      <p className="text-xs text-muted-foreground">Prazo: {new Date(acao.prazo).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============= BLOCO C: TOP 5 DEPARTAMENTOS ============= */}
      {/* Só mostra para admin */}
      {userRole === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Departamentos (Taxa de Conclusão)</CardTitle>
          </CardHeader>
          <CardContent>
            {departamentosData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={departamentosData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={190} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="taxa" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-8">Sem dados disponíveis</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============= BLOCO D: TOP 10 COLABORADORES ============= */}
      <Card>
        <CardHeader>
          <CardTitle>Os Empregados Destaques em % de Conclusão de Ações</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.blocoD.top10Colaboradores.length > 0 ? (
            <div className="space-y-3">
              {stats.blocoD.top10Colaboradores.map((colaborador) => (
                <div key={colaborador.colaboradorId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {colaborador.medalha === "ouro" && (
                      <Medal className="h-5 w-5 text-yellow-500" />
                    )}
                    {colaborador.medalha === "prata" && (
                      <Medal className="h-5 w-5 text-gray-400" />
                    )}
                    {colaborador.medalha === "bronze" && (
                      <Medal className="h-5 w-5 text-orange-600" />
                    )}
                    {!colaborador.medalha && (
                      <div className="h-5 w-5 flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {colaborador.posicao}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{colaborador.colaboradorNome}</p>
                      <p className="text-xs text-muted-foreground">
                        {colaborador.acoesConcluidasTotal} de {colaborador.acoesTotal} ações concluídas
                      </p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {colaborador.taxaConclusao}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">Sem dados disponíveis</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

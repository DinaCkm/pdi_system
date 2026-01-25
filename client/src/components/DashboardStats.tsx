import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Medal } from "lucide-react";

interface DashboardStatsProps {
  userRole?: string;
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
  };
}

export function DashboardStats({ stats, userRole }: DashboardStatsProps) {
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

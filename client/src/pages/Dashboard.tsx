import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { DashboardStats } from "@/components/DashboardStats";
import { DirecionamentoEstrategico } from "@/components/DirecionamentoEstrategico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectContentNoPortal } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { user } = useAuth();
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>("");
  
  // Carregar departamentos para filtro (Admin e Gerente)
  const { data: departamentos } = trpc.departamentos.list.useQuery(undefined, {
    enabled: user?.role === "admin" || user?.role === "gerente",
  });

  // Carregar estatísticas do dashboard
  const { data: stats, isLoading, isError } = trpc.dashboard.getStats.useQuery(
    {
      departamentoId: selectedDepartamento ? parseInt(selectedDepartamento) : undefined,
    },
    {
      enabled: user?.role === "admin" || user?.role === "gerente" || !selectedDepartamento, // Colaborador/Líder não podem filtrar
    }
  );

  // Exportar relatório CSV
  const handleExportCSV = () => {
    if (!stats) return;

    const csv = [
      ["DASHBOARD - RELATÓRIO DE ESTATÍSTICAS"],
      ["Data:", new Date().toLocaleString("pt-BR")],
      ["Usuário:", user?.name || "Desconhecido"],
      [""],
      ["BLOCO A - KPIs GERAIS"],
      ["Total de Colaboradores", stats.blocoA.totalColaboradores],
      ["Total de Líderes", stats.blocoA.totalLideres],
      ["Taxa de Engajamento (%)", stats.blocoA.taxaEngajamento],
      [""],
      ["BLOCO B - FUNIL DE EXECUÇÃO"],
      ["Status", "Quantidade", "Percentual (%)"],
      ["Pendente", stats.blocoB.pendente, stats.blocoB.percentualPendente],
      ["Em Andamento", stats.blocoB.emAndamento, stats.blocoB.percentualEmAndamento],
      ["Concluída", stats.blocoB.concluida, stats.blocoB.percentualConcluida],
      [""],
      ["BLOCO C - TOP 5 DEPARTAMENTOS"],
      ["Departamento", "Taxa de Conclusão (%)", "Ações Concluídas", "Ações Total"],
      ...stats.blocoC.top5Departamentos.map((dept) => [
        dept.departamentoNome,
        dept.taxaConclusao,
        dept.acoesConcluidas,
        dept.acoesTotal,
      ]),
      [""],
      ["BLOCO D - TOP 10 COLABORADORES"],
      ["Posição", "Nome", "Ações Concluídas", "Medalha"],
      ...stats.blocoD.top10Colaboradores.map((colab) => [
        colab.posicao,
        colab.colaboradorNome,
        colab.acoesConcluidasTotal,
        colab.medalha || "-",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard-${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    // Remover o link com segurança usando setTimeout para evitar race conditions
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch (error) {
        console.warn("Erro ao remover link de download:", error);
      }
      URL.revokeObjectURL(url);
    }, 100);
  };

  if (isError) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Erro ao Carregar Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">
            Não foi possível carregar as estatísticas do dashboard. Por favor, tente novamente.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Estratégico</h1>
        <Button onClick={handleExportCSV} disabled={!stats} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtro de Departamento (Admin e Gerente) */}
      {(user?.role === "admin" || user?.role === "gerente") && departamentos && departamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filtrar por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDepartamento} onValueChange={setSelectedDepartamento}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Selecione um departamento" />
              </SelectTrigger>
              <SelectContentNoPortal position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                <SelectItem value="todos">Todos os Departamentos</SelectItem>
                {Array.isArray(departamentos) && departamentos.length > 0 ? (
                  departamentos.map((dept) => (
                    // Proteção total: só renderiza se ID e Nome forem válidos
                    (dept && dept.id && dept.nome && dept.id.toString().trim() !== "") ? (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.nome}
                      </SelectItem>
                    ) : null
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    Nenhum departamento cadastrado
                   </SelectItem>
                )
              }
              </SelectContentNoPortal>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Carregando */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : stats ? (
        <>
          {/* Widget Exclusivo de Admin: Direcionamento Estratégico */}
          <DirecionamentoEstrategico />
          
          {/* Card de Análise de Liderança - Apenas para Admin e Gerente */}
          {(user?.role === "admin" || user?.role === "gerente") && (
            <Link href="/analise-lideranca">
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 hover:from-emerald-100 hover:to-blue-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-100 rounded-xl">
                        <TrendingUp className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-emerald-800">Análise de Liderança</CardTitle>
                        <p className="text-sm text-emerald-600 mt-1">Ranking de engajamento: Líder vs Equipe</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <span className="text-sm font-medium">Ver análise completa</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">
                    Compare o desempenho individual de cada líder com a taxa de conclusão da sua equipe. 
                    Visualize competências focais e receba insights automáticos para tomada de decisão.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {/* Estatísticas Gerais do Dashboard */}
          <DashboardStats stats={stats} userRole={user?.role} departamentoId={selectedDepartamento && selectedDepartamento !== 'todos' ? parseInt(selectedDepartamento) : undefined} />
        </>
      ) : null}
    </div>
  );
}

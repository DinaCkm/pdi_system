import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, FileSpreadsheet, Building2, Users, Clock, Filter } from "lucide-react";

export default function RelatorioAcoesVencidas() {
  const [departamentoId, setDepartamentoId] = useState<number | undefined>(undefined);
  const [colaboradorId, setColaboradorId] = useState<number | undefined>(undefined);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const { data: departamentos } = trpc.departamentos.list.useQuery();
  const { data: usuarios } = trpc.users.list.useQuery({ page: 1, pageSize: 1000 });

  const { data: relatorio, isLoading, refetch } = trpc.prazos.relatorio.useQuery({
    departamentoId,
    colaboradorId,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const exportToCSV = (type: 'acoes' | 'departamentos' | 'colaboradores') => {
    if (!relatorio) return;

    let csvContent = "";
    let filename = "";

    if (type === 'acoes') {
      filename = `acoes_vencidas_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "ID,Título,Descrição,Prazo,Dias Vencido,Status,Colaborador,Email,Departamento,Competência,Líder\n";
      relatorio.acoes.forEach((acao: any) => {
        csvContent += `${acao.id},"${acao.titulo}","${acao.descricao || ''}",${formatDate(acao.prazo)},${acao.diasVencido},${acao.status},"${acao.colaboradorNome}","${acao.colaboradorEmail}","${acao.departamentoNome}","${acao.macroNome || ''}","${acao.liderNome || ''}"\n`;
      });
    } else if (type === 'departamentos') {
      filename = `resumo_departamentos_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Departamento,Total Vencidas,Colaboradores Afetados,Média Dias Vencido\n";
      relatorio.resumoPorDepartamento.forEach((dept: any) => {
        csvContent += `"${dept.departamentoNome}",${dept.totalVencidas},${dept.colaboradoresAfetados},${dept.mediaDiasVencido}\n`;
      });
    } else {
      filename = `resumo_colaboradores_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = "Colaborador,Email,Departamento,Líder,Total Vencidas,Prazo Mais Antigo,Maior Atraso (dias)\n";
      relatorio.resumoPorColaborador.forEach((colab: any) => {
        csvContent += `"${colab.colaboradorNome}","${colab.colaboradorEmail}","${colab.departamentoNome}","${colab.liderNome || ''}",${colab.totalVencidas},${formatDate(colab.prazoMaisAntigo)},${colab.maiorAtraso}\n`;
      });
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const limparFiltros = () => {
    setDepartamentoId(undefined);
    setColaboradorId(undefined);
    setDataInicio("");
    setDataFim("");
  };

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Relatório de Ações Vencidas
            </h1>
            <p className="text-gray-500 mt-1">
              Visualize e exporte ações com prazo vencido por departamento e colaborador
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select
                  value={departamentoId?.toString() || "all"}
                  onValueChange={(v) => setDepartamentoId(v === "all" ? undefined : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os departamentos</SelectItem>
                    {departamentos?.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select
                  value={colaboradorId?.toString() || "all"}
                  onValueChange={(v) => setColaboradorId(v === "all" ? undefined : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os colaboradores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os colaboradores</SelectItem>
                    {usuarios?.users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <Button variant="outline" onClick={limparFiltros} className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Geral */}
        {relatorio && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total de Ações Vencidas</p>
                    <p className="text-3xl font-bold text-red-600">{relatorio.totalGeral}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Departamentos Afetados</p>
                    <p className="text-3xl font-bold text-blue-600">{relatorio.resumoPorDepartamento.length}</p>
                  </div>
                  <Building2 className="h-10 w-10 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Colaboradores Afetados</p>
                    <p className="text-3xl font-bold text-orange-600">{relatorio.resumoPorColaborador.length}</p>
                  </div>
                  <Users className="h-10 w-10 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Gerado em</p>
                    <p className="text-lg font-bold text-purple-600">
                      {new Date(relatorio.dataGeracao).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(relatorio.dataGeracao).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                  <Clock className="h-10 w-10 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs com Relatórios */}
        <Tabs defaultValue="departamentos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="departamentos">Por Departamento</TabsTrigger>
            <TabsTrigger value="colaboradores">Por Colaborador</TabsTrigger>
            <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
          </TabsList>

          {/* Resumo por Departamento */}
          <TabsContent value="departamentos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Resumo por Departamento</CardTitle>
                  <CardDescription>Visão consolidada de ações vencidas por departamento</CardDescription>
                </div>
                <Button onClick={() => exportToCSV('departamentos')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-gray-500">Carregando...</p>
                ) : relatorio?.resumoPorDepartamento.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nenhuma ação vencida encontrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Departamento</TableHead>
                        <TableHead className="text-center">Total Vencidas</TableHead>
                        <TableHead className="text-center">Colaboradores Afetados</TableHead>
                        <TableHead className="text-center">Média de Atraso (dias)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorio?.resumoPorDepartamento.map((dept: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{dept.departamentoNome}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{dept.totalVencidas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{dept.colaboradoresAfetados}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              {dept.mediaDiasVencido} dias
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resumo por Colaborador */}
          <TabsContent value="colaboradores">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Resumo por Colaborador</CardTitle>
                  <CardDescription>Visão consolidada de ações vencidas por colaborador</CardDescription>
                </div>
                <Button onClick={() => exportToCSV('colaboradores')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-gray-500">Carregando...</p>
                ) : relatorio?.resumoPorColaborador.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nenhuma ação vencida encontrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Líder</TableHead>
                        <TableHead className="text-center">Total Vencidas</TableHead>
                        <TableHead className="text-center">Maior Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorio?.resumoPorColaborador.map((colab: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{colab.colaboradorNome}</p>
                              <p className="text-sm text-gray-500">{colab.colaboradorEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{colab.departamentoNome}</TableCell>
                          <TableCell>{colab.liderNome || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{colab.totalVencidas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              {colab.maiorAtraso} dias
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatório Detalhado */}
          <TabsContent value="detalhado">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Relatório Detalhado</CardTitle>
                  <CardDescription>Lista completa de todas as ações vencidas</CardDescription>
                </div>
                <Button onClick={() => exportToCSV('acoes')} variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-gray-500">Carregando...</p>
                ) : relatorio?.acoes.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">Nenhuma ação vencida encontrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead className="text-center">Dias Vencido</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatorio?.acoes.map((acao: any) => (
                          <TableRow key={acao.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{acao.titulo}</p>
                                {acao.macroNome && (
                                  <p className="text-xs text-gray-500">{acao.macroNome}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{acao.colaboradorNome}</p>
                                <p className="text-xs text-gray-500">{acao.colaboradorEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{acao.departamentoNome}</TableCell>
                            <TableCell>{formatDate(acao.prazo)}</TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant="destructive"
                                className={acao.diasVencido > 30 ? "bg-red-700" : ""}
                              >
                                {acao.diasVencido} dias
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{acao.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

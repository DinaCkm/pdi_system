import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Eye, Filter, RefreshCw, FileText, Users, Target, ClipboardList, AlertCircle } from "lucide-react";

export default function AuditoriaExclusoes() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const { data: auditorias, isLoading, refetch } = trpc.auditoria.listar.useQuery(
    filtroTipo === "todos" ? undefined : { entidadeTipo: filtroTipo as any }
  );
  
  const { data: estatisticas } = trpc.auditoria.estatisticas.useQuery();

  const formatarData = (data: string | Date) => {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "acao":
        return <Target className="h-4 w-4" />;
      case "pdi":
        return <FileText className="h-4 w-4" />;
      case "usuario":
        return <Users className="h-4 w-4" />;
      case "evidencia":
        return <ClipboardList className="h-4 w-4" />;
      case "solicitacao":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Trash2 className="h-4 w-4" />;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const cores: Record<string, string> = {
      acao: "bg-blue-100 text-blue-800",
      pdi: "bg-green-100 text-green-800",
      usuario: "bg-purple-100 text-purple-800",
      evidencia: "bg-orange-100 text-orange-800",
      solicitacao: "bg-red-100 text-red-800",
    };
    return cores[tipo] || "bg-gray-100 text-gray-800";
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      acao: "Ação",
      pdi: "PDI",
      usuario: "Usuário",
      evidencia: "Evidência",
      solicitacao: "Solicitação",
    };
    return labels[tipo] || tipo;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auditoria de Exclusões</h1>
            <p className="text-gray-500 mt-1">
              Visualize todas as exclusões realizadas no sistema
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Exclusões</CardDescription>
              <CardTitle className="text-3xl">{estatisticas?.total || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Ações
              </CardDescription>
              <CardTitle className="text-2xl text-blue-600">{estatisticas?.acao || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> PDIs
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{estatisticas?.pdi || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Usuários
              </CardDescription>
              <CardTitle className="text-2xl text-purple-600">{estatisticas?.usuario || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Evidências
              </CardDescription>
              <CardTitle className="text-2xl text-orange-600">{estatisticas?.evidencia || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Tipo de Entidade</label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="acao">Ações</SelectItem>
                    <SelectItem value="pdi">PDIs</SelectItem>
                    <SelectItem value="usuario">Usuários</SelectItem>
                    <SelectItem value="evidencia">Evidências</SelectItem>
                    <SelectItem value="solicitacao">Solicitações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Data Início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Data Fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Auditoria */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Exclusões</CardTitle>
            <CardDescription>
              {auditorias?.length || 0} registros encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando...
              </div>
            ) : auditorias && auditorias.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome/Título</TableHead>
                    <TableHead>Excluído Por</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditorias.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={`${getTipoBadge(item.entidadeTipo)} gap-1`}>
                          {getTipoIcon(item.entidadeTipo)}
                          {getTipoLabel(item.entidadeTipo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.entidadeNome || `ID: ${item.entidadeId}`}
                      </TableCell>
                      <TableCell>{item.excluidoPorNome}</TableCell>
                      <TableCell>{formatarData(item.createdAt)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.motivoExclusao || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getTipoIcon(item.entidadeTipo)}
                                Detalhes da Exclusão
                              </DialogTitle>
                              <DialogDescription>
                                {getTipoLabel(item.entidadeTipo)} excluído(a) em {formatarData(item.createdAt)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">ID Original</label>
                                  <p className="font-mono">{item.entidadeId}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Nome/Título</label>
                                  <p>{item.entidadeNome}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Excluído Por</label>
                                  <p>{item.excluidoPorNome} (ID: {item.excluidoPor})</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Data/Hora</label>
                                  <p>{formatarData(item.createdAt)}</p>
                                </div>
                              </div>
                              {item.motivoExclusao && (
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Motivo da Exclusão</label>
                                  <p className="bg-gray-50 p-3 rounded-md">{item.motivoExclusao}</p>
                                </div>
                              )}
                              <div>
                                <label className="text-sm font-medium text-gray-500">Dados Excluídos (JSON)</label>
                                <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-xs overflow-x-auto">
                                  {JSON.stringify(item.dadosExcluidos, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Trash2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Nenhuma exclusão registrada</h3>
                <p className="text-gray-500 mt-1">
                  As exclusões de ações, PDIs e outros itens serão registradas aqui.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

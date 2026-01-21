import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectContentNoPortal } from "@/components/ui/select";
import { Eye, Target, User, Calendar, CheckCircle2, Search, Filter, List, TrendingUp, CheckCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

export default function PDIsEquipe() {
  const { data: pdis, isLoading } = trpc.pdis.teamPDIs.useQuery();
  const { data: ciclos } = trpc.ciclos.list.useQuery();
  const { mutate: validatePDI } = trpc.pdis.validate.useMutation();
  const [selectedPDI, setSelectedPDI] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showValidateAlert, setShowValidateAlert] = useState(false);
  const [pdiToValidate, setPDIToValidate] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCiclo, setFilterCiclo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterColaborador, setFilterColaborador] = useState<string>("todos");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      em_andamento: { variant: "default", label: "Em Andamento", className: "bg-blue-500 text-white" },
      concluido: { variant: "outline", label: "Concluído", className: "bg-green-50 text-green-700 border-green-300" },
      cancelado: { variant: "destructive", label: "Cancelado" },
    };
    const config = variants[status] || variants.em_andamento;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const handleView = (pdi: any) => {
    setSelectedPDI(pdi);
    setShowViewModal(true);
  };

  const handleViewActions = (pdiId: number) => {
    setLocation(`/acoes?pdiId=${pdiId}`);
  };

  // Extrair lista única de colaboradores
  const colaboradores = useMemo(() => {
    if (!pdis) return [];
    const uniqueColaboradores = new Map();
    pdis.forEach((pdi: any) => {
      if (pdi.colaboradorId && pdi.colaboradorNome) {
        uniqueColaboradores.set(pdi.colaboradorId, { id: pdi.colaboradorId, name: pdi.colaboradorNome });
      }
    });
    return Array.from(uniqueColaboradores.values());
  }, [pdis]);

  // Filtrar PDIs
  const filteredPDIs = useMemo(() => {
    if (!pdis) return [];
    
    return pdis.filter((pdi: any) => {
      // Filtro de busca (título ou nome do colaborador)
      const matchesSearch = 
        searchTerm === "" ||
        pdi.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pdi.colaboradorNome?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de ciclo
      const matchesCiclo = 
        filterCiclo === "todos" || 
        pdi.cicloId?.toString() === filterCiclo;
      
      // Filtro de status
      const matchesStatus = 
        filterStatus === "todos" || 
        pdi.status === filterStatus;
      
      // Filtro de colaborador
      const matchesColaborador = 
        filterColaborador === "todos" || 
        pdi.colaboradorId?.toString() === filterColaborador;
      
      return matchesSearch && matchesCiclo && matchesStatus && matchesColaborador;
    });
  }, [pdis, searchTerm, filterCiclo, filterStatus, filterColaborador]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            PDIs da Equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e acompanhe os Planos de Desenvolvimento Individual dos seus subordinados
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por Colaborador */}
            <div>
              <Select value={filterColaborador} onValueChange={setFilterColaborador}>
                <SelectTrigger>
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContentNoPortal sideOffset={4} position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="todos">Todos Colaboradores</SelectItem>
                  {colaboradores.map((colab: any) => (
                    <SelectItem key={colab.id} value={colab.id.toString()}>
                      {colab.name}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
              </Select>
            </div>

            {/* Filtro por Ciclo */}
            <div>
              <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                <SelectTrigger>
                  <SelectValue placeholder="Ciclo" />
                </SelectTrigger>
                <SelectContentNoPortal sideOffset={4} position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="todos">Todos Ciclos</SelectItem>
                  {ciclos?.map((ciclo: any) => (
                    <SelectItem key={ciclo.id} value={ciclo.id.toString()}>
                      {ciclo.nome}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContentNoPortal sideOffset={4} position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContentNoPortal>
              </Select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-muted-foreground">
            Exibindo <span className="font-medium text-foreground">{filteredPDIs.length}</span> de{" "}
            <span className="font-medium text-foreground">{pdis?.length || 0}</span> PDIs
          </div>
        </CardContent>
      </Card>

      {/* Lista de PDIs */}
      {!filteredPDIs || filteredPDIs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchTerm || filterCiclo !== "todos" || filterStatus !== "todos" || filterColaborador !== "todos"
                ? "Nenhum PDI encontrado com os filtros aplicados."
                : "Nenhum PDI encontrado para sua equipe."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPDIs.map((pdi: any) => (
            <Card key={pdi.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{pdi.titulo}</CardTitle>
                  {getStatusBadge(pdi.status)}
                </div>
                <CardDescription className="line-clamp-2">
                  {pdi.descricao || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Colaborador */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Colaborador:</span>
                  <span className="text-muted-foreground">{pdi.colaboradorNome || "-"}</span>
                </div>

                {/* Ciclo */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Ciclo:</span>
                  <span className="text-muted-foreground">{pdi.ciclo?.nome || "-"}</span>
                </div>

                {/* Progresso de Ações */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Progresso:</span>
                    </div>
                    <span className="text-muted-foreground font-medium">
                      {pdi.progressPercentage || 0}%
                    </span>
                  </div>
                  <Progress value={pdi.progressPercentage || 0} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pdi.completedCount || 0} concluídas</span>
                    <span>{pdi.actionCount || 0} total</span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(pdi)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Detalhes
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewActions(pdi.id)}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Ações
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do PDI</DialogTitle>
            <DialogDescription>
              Informações completas do Plano de Desenvolvimento Individual
            </DialogDescription>
          </DialogHeader>

          {selectedPDI && (
            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="text-sm font-medium">Título</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedPDI.titulo}</p>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedPDI.descricao || "Sem descrição"}</p>
              </div>

              {/* Colaborador */}
              <div>
                <label className="text-sm font-medium">Colaborador</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPDI.colaborador?.name} ({selectedPDI.colaborador?.email})
                </p>
              </div>

              {/* Ciclo */}
              <div>
                <label className="text-sm font-medium">Ciclo</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPDI.ciclo?.nome} ({new Date(selectedPDI.ciclo?.dataInicio).toLocaleDateString()} - {new Date(selectedPDI.ciclo?.dataFim).toLocaleDateString()})
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="mt-1">
                  {getStatusBadge(selectedPDI.status)}
                </div>
              </div>

              {/* Progresso de Ações */}
              <div>
                <label className="text-sm font-medium">Progresso das Ações</label>
                <div className="space-y-3 mt-2">
                  <Progress value={selectedPDI.progressPercentage || 0} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="font-bold text-lg text-green-600">{selectedPDI.completedCount || 0}</p>
                      <p className="text-muted-foreground">Concluídas</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="font-bold text-lg text-blue-600">{selectedPDI.inProgressCount || 0}</p>
                      <p className="text-muted-foreground">Em Andamento</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="font-bold text-lg text-orange-600">{selectedPDI.pendingCount || 0}</p>
                      <p className="text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{selectedPDI.progressPercentage || 0}%</p>
                    <p className="text-sm text-muted-foreground">de conclusão</p>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Criado em</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedPDI.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Atualizado em</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedPDI.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Botão para ver ações */}
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowViewModal(false);
                    handleViewActions(selectedPDI.id);
                  }}
                >
                  <List className="h-4 w-4 mr-2" />
                  Visualizar Todas as Ações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

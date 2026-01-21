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
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedPDIForActions, setSelectedPDIForActions] = useState<any>(null);
  const { data: actions } = trpc.actions.list.useQuery({ pdiId: selectedPDIForActions?.id }, { enabled: !!selectedPDIForActions?.id });
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

  const handleViewActions = (pdi: any) => {
    setSelectedPDIForActions(pdi);
    setShowActionsModal(true);
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
          {pdis && pdis.length > 0 && pdis[0]?.departamentoNome && (
            <div className="mt-3 inline-block">
              <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-100 to-orange-100 border-l-4 border-blue-600">
                <p className="text-sm font-semibold text-blue-900">Lider do Departamento: <span className="text-orange-600">{pdis[0].departamentoNome}</span></p>
              </div>
            </div>
          )}
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
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewActions(pdi)}
                  >
                    <List className="h-4 w-4 mr-2" />
                    Ações
                  </Button>
                  {pdi.status !== 'em_andamento' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white"
                      onClick={() => {
                        setPDIToValidate(pdi);
                        setShowValidateAlert(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validar
                    </Button>
                  )}
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

              {/* Botão para ver ações */}
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowViewModal(false);
                    handleViewActions(selectedPDI);
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

      {/* Modal de Ações do PDI */}
      <Dialog open={showActionsModal} onOpenChange={setShowActionsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-blue-600" />
              Ações do PDI: {selectedPDIForActions?.titulo}
            </DialogTitle>
            <DialogDescription>
              Colaborador: {selectedPDIForActions?.colaboradorNome}
            </DialogDescription>
          </DialogHeader>
          
          {/* MINI-DASHBOARD DE STATUS */}
          {actions && actions.length > 0 && (() => {
            const total = actions.length;
            const concluidas = actions.filter((a: any) => a.status === 'concluida').length;
            const emAndamento = actions.filter((a: any) => a.status === 'em_andamento' || a.status === 'aguardando_avaliacao').length;
            const percentualConclusao = Math.round((concluidas / total) * 100);

            return (
              <div className="space-y-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg border border-blue-200">
                {/* Contadores */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-2xl font-bold text-gray-800">{total}</p>
                    <p className="text-xs text-muted-foreground">Total de Ações</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-2xl font-bold text-green-600">{concluidas}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
                    <p className="text-xs text-muted-foreground">Em Andamento</p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Progresso de Conclusão</span>
                    <span className="text-sm font-bold text-green-600">{percentualConclusao}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-300"
                      style={{ width: `${percentualConclusao}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* LISTA DE AÇÕES */}
          <div className="space-y-3">
            {!actions || actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma ação cadastrada para este PDI</p>
              </div>
            ) : (
              actions.map((acao: any) => {
                const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                  nao_iniciada: { bg: 'bg-red-100', text: 'text-red-700', label: 'Não Iniciada' },
                  em_andamento: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Em Andamento' },
                  concluida: { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluída' },
                  aguardando_avaliacao: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Aguardando Avaliação' },
                  cancelada: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
                };
                const config = statusConfig[acao.status] || statusConfig.nao_iniciada;

                return (
                  <div key={acao.id} className="p-4 border rounded-lg hover:shadow-md transition bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-800 break-words">{acao.titulo}</h4>
                        <p className="text-xs text-muted-foreground mt-1 break-words whitespace-pre-wrap max-w-full">{acao.descricao}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs">
                          <span className="text-muted-foreground font-medium">
                            Prazo: {new Date(acao.prazo).toLocaleDateString('pt-BR')}
                          </span>
                          <Badge className={`${config.bg} ${config.text} border-0`}>
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowActionsModal(false);
                setLocation('/acoes-equipe');
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <List className="h-4 w-4" />
              Ver painel completo da equipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Validação do PDI */}
      <AlertDialog open={showValidateAlert} onOpenChange={setShowValidateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar PDI do Colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Você está validando cada uma das ações de desenvolvimento do seu colaborador com este OK. Ao prosseguir, este PDI entrará em execução. Está certo disto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pdiToValidate) {
                  validatePDI({ pdiId: pdiToValidate.id }, {
                    onSuccess: () => {
                      setShowValidateAlert(false);
                      setPDIToValidate(null);
                    },
                  });
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white"
            >
              Confirmar Validação
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

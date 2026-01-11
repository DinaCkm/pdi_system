import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Eye, Edit, Trash2, Target, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller, useForm } from "react-hook-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NovoFormularioAcao } from "./AcoesNovoFormulario";

type AcaoFormData = {
  pdiId: number;
  blocoCompetenciaId: number;
  macroCompetenciaId: number;
  microCompetenciaId: number;
  nome: string;
  descricao?: string;
  prazo: string;
};

export default function Acoes() {
  // Ler query params da URL
  const urlParams = new URLSearchParams(window.location.search);
  const pdiIdFromUrl = urlParams.get('pdiId');
  const acaoIdFromUrl = urlParams.get('acaoId');
  
  const [showCreateDialog, setShowCreateDialog] = useState(!!pdiIdFromUrl);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAcao, setSelectedAcao] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPDI, setFilterPDI] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUsuario, setFilterUsuario] = useState<string>("all");
  const [filterLider, setFilterLider] = useState<string>("all");
  const [filterDepartamento, setFilterDepartamento] = useState<string>("all");
  const [filterBloco, setFilterBloco] = useState<string>("all");
  const [filterMacro, setFilterMacro] = useState<string>("all");
  const [filterMicro, setFilterMicro] = useState<string>("all");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { data: acoes, refetch, isLoading } = trpc.actions.list.useQuery();
  const { data: pdis } = trpc.pdis.list.useQuery();
  const { data: usuarios } = trpc.users.list.useQuery();
  const { data: departamentos } = trpc.departamentos.list.useQuery();
  const { data: blocosCompetencias } = trpc.competencias.listBlocos.useQuery();
  const { data: microsCompetencias } = trpc.competencias.listAllMicrosWithDetails.useQuery();
  
  // Efeito para abrir modal de criação com PDI pré-selecionado
  useEffect(() => {
    if (pdiIdFromUrl && pdis) {
      setShowCreateDialog(true);
      setValue('pdiId', parseInt(pdiIdFromUrl));
      // Limpar query param da URL
      window.history.replaceState({}, '', '/acoes');
    }
  }, [pdiIdFromUrl, pdis]);
  
  // Efeito para abrir modal de visualização de ação específica
  useEffect(() => {
    if (acaoIdFromUrl && acoes) {
      const acao = acoes.find((a: any) => a.id === parseInt(acaoIdFromUrl));
      if (acao) {
        setSelectedAcao(acao);
        setShowViewDialog(true);
        // Limpar query param da URL
        window.history.replaceState({}, '', '/acoes');
      }
    }
  }, [acaoIdFromUrl, acoes]);

  const suggestWithAIMutation = trpc.actions.suggestWithAI.useMutation({
    onSuccess: (data) => {
      setValue("nome", data.nome);
      setValue("descricao", data.descricao);
      toast.success("✨ Sugestão gerada com sucesso!");
      setIsGeneratingAI(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar sugestão: ${error.message}`);
      setIsGeneratingAI(false);
    },
  });

  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      setShowCreateDialog(false);
      refetch();
      reset();
    },
    onError: (error) => {
      toast.error(`Erro ao criar ação: ${error.message}`);
    },
  });

  const updateMutation = trpc.actions.update.useMutation({
    onSuccess: () => {
      toast.success("Ação atualizada com sucesso!");
      setShowEditDialog(false);
      setSelectedAcao(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar ação: ${error.message}`);
    },
  });

  const deleteMutation = trpc.actions.delete.useMutation({
    onSuccess: () => {
      toast.success("Ação excluída com sucesso!");
      setShowDeleteDialog(false);
      setSelectedAcao(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir ação: ${error.message}`);
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = useForm<AcaoFormData>();
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit, watch: watchEdit, setValue: setEditValue } = useForm<AcaoFormData>();

  // Watch para seleção hierárquica no formulário de criação
  const selectedBlocoId = watch("blocoCompetenciaId");
  const selectedMacroId = watch("macroCompetenciaId");
  const selectedPDIId = watch("pdiId");

  // Watch para seleção hierárquica no formulário de edição
  const editSelectedBlocoId = watchEdit("blocoCompetenciaId");
  const editSelectedMacroId = watchEdit("macroCompetenciaId");

  // Buscar macrocompetências do bloco selecionado
  const { data: macroCompetencias } = trpc.competencias.listMacros.useQuery(
    { blocoId: selectedBlocoId },
    { enabled: !!selectedBlocoId }
  );

  const { data: editMacroCompetencias } = trpc.competencias.listMacros.useQuery(
    { blocoId: editSelectedBlocoId },
    { enabled: !!editSelectedBlocoId }
  );

  // Buscar microcompetências da macro selecionada
  const { data: microCompetencias } = trpc.competencias.listMicros.useQuery(
    { macroId: selectedMacroId },
    { enabled: !!selectedMacroId }
  );

  const { data: editMicroCompetencias } = trpc.competencias.listMicros.useQuery(
    { macroId: editSelectedMacroId },
    { enabled: !!editSelectedMacroId }
  );

  // Buscar ciclo do PDI selecionado para validação de prazo
  const selectedPDI = pdis?.find(p => p.id === selectedPDIId);

  const onSubmit = (data: AcaoFormData) => {
    // Validar prazo dentro do ciclo
    if (selectedPDI && selectedPDI.ciclo) {
      const prazoDate = new Date(data.prazo);
      const cicloInicio = new Date(selectedPDI.ciclo.dataInicio);
      const cicloFim = new Date(selectedPDI.ciclo.dataFim);

      if (prazoDate < cicloInicio || prazoDate > cicloFim) {
        toast.error(`O prazo deve estar entre ${cicloInicio.toLocaleDateString()} e ${cicloFim.toLocaleDateString()}`);
        return;
      }
    }

    // Converter nomes dos campos para o formato esperado pelo backend
    const payload = {
      pdiId: data.pdiId,
      blocoId: data.blocoCompetenciaId,
      macroId: data.macroCompetenciaId,
      microId: data.microCompetenciaId,
      nome: data.nome,
      descricao: data.descricao || "",
      prazo: data.prazo,
    };

    createMutation.mutate(payload as any);
  };

  const onEdit = (data: AcaoFormData) => {
    if (!selectedAcao) return;
    
    // Converter nomes dos campos para o formato esperado pelo backend
    const payload = {
      id: selectedAcao.id,
      pdiId: data.pdiId,
      blocoId: data.blocoCompetenciaId,
      macroId: data.macroCompetenciaId,
      microId: data.microCompetenciaId,
      nome: data.nome,
      descricao: data.descricao || "",
      prazo: data.prazo,
    };
    
    updateMutation.mutate(payload as any);
  };

  const handleEdit = (acao: any) => {
    setSelectedAcao(acao);
    resetEdit({
      pdiId: acao.pdiId,
      blocoCompetenciaId: acao.blocoCompetenciaId,
      macroCompetenciaId: acao.macroCompetenciaId,
      microCompetenciaId: acao.microCompetenciaId,
      nome: acao.nome,
      descricao: acao.descricao || "",
      prazo: new Date(acao.prazo).toISOString().split('T')[0],
    });
    setShowEditDialog(true);
  };

  const handleDelete = (acao: any) => {
    setSelectedAcao(acao);
    setShowDeleteDialog(true);
  };

  const handleView = (acao: any) => {
    setSelectedAcao(acao);
    setShowViewDialog(true);
  };

  const confirmDelete = () => {
    if (selectedAcao) {
      deleteMutation.mutate({ id: selectedAcao.id });
    }
  };

  // Filtrar ações
  // Extrair listas únicas de macros e blocos das micros
  const macrosCompetencias = useMemo(() => {
    if (!microsCompetencias) return [];
    const uniqueMacros = new Map();
    microsCompetencias.forEach(micro => {
      if (!uniqueMacros.has(micro.macroId)) {
        uniqueMacros.set(micro.macroId, { id: micro.macroId, nome: micro.macroNome });
      }
    });
    return Array.from(uniqueMacros.values());
  }, [microsCompetencias]);

  const filteredAcoes = useMemo(() => {
    if (!acoes) return [];
    
    return acoes.filter(acao => {
      const matchesSearch = acao.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPDI = filterPDI === "all" || acao.pdiId === parseInt(filterPDI);
      const matchesStatus = filterStatus === "all" || acao.status === filterStatus;
      const matchesUsuario = filterUsuario === "all" || acao.pdi?.colaboradorId === parseInt(filterUsuario);
      const matchesLider = filterLider === "all" || acao.pdi?.colaborador?.leaderId === parseInt(filterLider);
      const matchesDepartamento = filterDepartamento === "all" || acao.pdi?.colaborador?.departamentoId === parseInt(filterDepartamento);
      const matchesBloco = filterBloco === "all" || acao.blocoCompetencia?.id === parseInt(filterBloco);
      const matchesMacro = filterMacro === "all" || acao.macroCompetencia?.id === parseInt(filterMacro);
      const matchesMicro = filterMicro === "all" || acao.microCompetencia?.id === parseInt(filterMicro);
      
      return matchesSearch && matchesPDI && matchesStatus && matchesUsuario && matchesLider && matchesDepartamento && matchesBloco && matchesMacro && matchesMicro;
    });
  }, [acoes, searchTerm, filterPDI, filterStatus, filterUsuario, filterLider, filterDepartamento, filterBloco, filterMacro, filterMicro]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      pendente_aprovacao_lider: { variant: "secondary", label: "Pendente Aprovação", className: "bg-orange-100 text-orange-700 border-orange-300" },
      aprovada_lider: { variant: "outline", label: "Aprovada pelo Líder", className: "bg-green-50 text-green-700 border-green-300" },
      reprovada_lider: { variant: "destructive", label: "Reprovada pelo Líder" },
      em_andamento: { variant: "default", label: "Em Andamento", className: "bg-blue-500 text-white" },
      em_discussao: { variant: "outline", label: "Em Discussão", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
      evidencia_enviada: { variant: "outline", label: "Evidência Enviada", className: "bg-purple-50 text-purple-700 border-purple-300" },
      evidencia_aprovada: { variant: "outline", label: "Evidência Aprovada", className: "bg-green-50 text-green-700 border-green-300" },
      evidencia_reprovada: { variant: "destructive", label: "Evidência Reprovada" },
      correcao_solicitada: { variant: "outline", label: "Correção Solicitada", className: "bg-orange-50 text-orange-700 border-orange-300" },
      concluida: { variant: "outline", label: "Concluída", className: "bg-gray-100 text-gray-700 border-gray-300" },
      vencida: { variant: "destructive", label: "Vencida" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.pendente_aprovacao_lider;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Gestão de Ações
          </h1>
          <p className="text-muted-foreground mt-1">
            Ações de desenvolvimento vinculadas aos PDIs
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ação
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Buscar por nome da ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Usuário/Colaborador</Label>
              <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Líder</Label>
              <Select value={filterLider} onValueChange={setFilterLider}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios?.filter(u => u.role === 'lider' || u.role === 'admin').map((lider) => (
                    <SelectItem key={lider.id} value={lider.id.toString()}>
                      {lider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Departamento</Label>
              <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departamentos?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bloco de Competência</Label>
              <Select value={filterBloco} onValueChange={setFilterBloco}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {blocosCompetencias?.map((bloco) => (
                    <SelectItem key={bloco.id} value={bloco.id.toString()}>
                      {bloco.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Macrocompetência</Label>
              <Select value={filterMacro} onValueChange={setFilterMacro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {macrosCompetencias?.map((macro) => (
                    <SelectItem key={macro.id} value={macro.id.toString()}>
                      {macro.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Microcompetência</Label>
              <Select value={filterMicro} onValueChange={setFilterMicro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {microsCompetencias?.map((micro) => (
                    <SelectItem key={micro.id} value={micro.id.toString()}>
                      {micro.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="em_discussao">Em Discussão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ações */}
      {filteredAcoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma ação encontrada.
              <br />
              Crie uma nova ação para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAcoes.map((acao) => (
            <Card key={acao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{acao.nome}</CardTitle>
                  {getStatusBadge(acao.status)}
                </div>
                <CardDescription className="line-clamp-2">
                  {acao.descricao || "Ação não especificada"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  <span className="line-clamp-1">{acao.pdi?.titulo || "PDI não encontrado"}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  <span className="line-clamp-1">Colaborador: {acao.pdi?.colaborador?.nome || "N/A"}</span>
                </div>
                {acao.pdi?.colaborador?.leaderId && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    <span className="line-clamp-1">Líder: {usuarios?.find(u => u.id === acao.pdi?.colaborador?.leaderId)?.name || "N/A"}</span>
                  </div>
                )}
                {acao.pdi?.colaborador?.departamentoId && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    <span className="line-clamp-1">Departamento: {departamentos?.find(d => d.id === acao.pdi?.colaborador?.departamentoId)?.nome || "N/A"}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Prazo: {new Date(acao.prazo).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Target className="h-4 w-4 mr-2" />
                  <span className="line-clamp-1">{acao.microCompetencia?.nome || "Competência não encontrada"}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(acao)} className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    Visualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(acao)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(acao)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Novo Formulário de Criação */}
      <NovoFormularioAcao 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        pdiIdProp={pdiIdFromUrl ? parseInt(pdiIdFromUrl) : undefined}
      />

      {/* Dialog de Criação ANTIGO - REMOVER */}
      <Dialog open={false} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Ação</DialogTitle>
            <DialogDescription>
              Crie uma ação de desenvolvimento vinculada a um PDI com competências específicas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="pdiId">PDI *</Label>
              <Controller
                name="pdiId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o PDI" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                      {pdis?.map((pdi) => (
                        <SelectItem key={pdi.id} value={pdi.id.toString()}>
                          {pdi.titulo} - {pdi.colaborador?.nome || "Colaborador desconhecido"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedPDI && selectedPDI.ciclo && (
                <p className="text-sm text-muted-foreground mt-1">
                  Ciclo: {selectedPDI.ciclo.nome} ({new Date(selectedPDI.ciclo.dataInicio).toLocaleDateString()} - {new Date(selectedPDI.ciclo.dataFim).toLocaleDateString()})
                </p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label>Seleção Hierárquica de Competências *</Label>
              
              <div>
                <Label htmlFor="blocoCompetenciaId">1. Bloco de Competência</Label>
                <Controller
                  name="blocoCompetenciaId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        setValue("macroCompetenciaId", 0);
                        setValue("microCompetenciaId", 0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o bloco" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                        {blocosCompetencias?.map((bloco) => (
                          <SelectItem key={bloco.id} value={bloco.id.toString()}>
                            {bloco.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="macroCompetenciaId">2. Macrocompetência</Label>
                <Controller
                  name="macroCompetenciaId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        setValue("microCompetenciaId", 0);
                      }}
                    disabled={!selectedBlocoId}
                  >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedBlocoId ? "Selecione a macrocompetência" : "Selecione um bloco primeiro"} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                        {macroCompetencias?.map((macro) => (
                          <SelectItem key={macro.id} value={macro.id.toString()}>
                            {macro.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="microCompetenciaId">3. Microcompetência</Label>
                <Controller
                  name="microCompetenciaId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={!selectedMacroId}
                  >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedMacroId ? "Selecione a microcompetência" : "Selecione uma macrocompetência primeiro"} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                        {microCompetencias?.map((micro) => (
                          <SelectItem key={micro.id} value={micro.id.toString()}>
                            {micro.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Botão de Sugestão com IA */}
            {selectedBlocoId && selectedMacroId && watch("microCompetenciaId") && (
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const microId = watch("microCompetenciaId");
                    if (selectedBlocoId && selectedMacroId && microId) {
                      setIsGeneratingAI(true);
                      suggestWithAIMutation.mutate({
                        blocoId: selectedBlocoId,
                        macroId: selectedMacroId,
                        microId: microId,
                      });
                    }
                  }}
                  disabled={isGeneratingAI}
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando sugestão...
                    </>
                  ) : (
                    <>
                      ✨ Sugerir Nome e Ação com IA
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  A IA vai gerar sugestões de nome e ação baseadas nas competências selecionadas
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="nome">Nome da Ação *</Label>
              <Controller
                name="nome"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Ex: Participar de curso de liderança"
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="descricao">Ação a ser realizada</Label>
              <Controller
                name="descricao"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Descreva a ação que será realizada..."
                    rows={3}
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="prazo">Prazo *</Label>
              <Controller
                name="prazo"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Ação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ação</DialogTitle>
            <DialogDescription>
              Atualize as informações da ação de desenvolvimento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
            <div>
              <Label htmlFor="pdiId">PDI *</Label>
              <Controller
                name="pdiId"
                control={editControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o PDI" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                      {pdis?.map((pdi) => (
                        <SelectItem key={pdi.id} value={pdi.id.toString()}>
                          {pdi.titulo} - {pdi.colaborador?.nome || "Colaborador desconhecido"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label>Seleção Hierárquica de Competências *</Label>
              
              <div>
                <Label htmlFor="blocoCompetenciaId">1. Bloco de Competência</Label>
                <Controller
                  name="blocoCompetenciaId"
                  control={editControl}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        setEditValue("macroCompetenciaId", 0);
                        setEditValue("microCompetenciaId", 0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o bloco" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                        {blocosCompetencias?.map((bloco) => (
                          <SelectItem key={bloco.id} value={bloco.id.toString()}>
                            {bloco.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="macroCompetenciaId">2. Macrocompetência</Label>
                <Controller
                  name="macroCompetenciaId"
                  control={editControl}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        setEditValue("microCompetenciaId", 0);
                      }}
                    disabled={!editSelectedBlocoId}
                  >
                      <SelectTrigger>
                        <SelectValue placeholder={editSelectedBlocoId ? "Selecione a macrocompetência" : "Selecione um bloco primeiro"} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                        {editMacroCompetencias?.map((macro) => (
                          <SelectItem key={macro.id} value={macro.id.toString()}>
                            {macro.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="microCompetenciaId">3. Microcompetência</Label>
                <Controller
                  name="microCompetenciaId"
                  control={editControl}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={!editSelectedMacroId}
                  >
                      <SelectTrigger>
                        <SelectValue placeholder={editSelectedMacroId ? "Selecione a microcompetência" : "Selecione uma macrocompetência primeiro"} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]" sideOffset={5}>
                        {editMicroCompetencias?.map((micro) => (
                          <SelectItem key={micro.id} value={micro.id.toString()}>
                            {micro.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nome">Nome da Ação *</Label>
              <Controller
                name="nome"
                control={editControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Ex: Participar de curso de liderança"
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="descricao">Ação a ser realizada</Label>
              <Controller
                name="descricao"
                control={editControl}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Descreva a ação que será realizada..."
                    rows={3}
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="prazo">Prazo *</Label>
              <Controller
                name="prazo"
                control={editControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedAcao?.nome}</DialogTitle>
            <DialogDescription>Detalhes da Ação de Desenvolvimento</DialogDescription>
          </DialogHeader>
          {selectedAcao && (
            <div className="space-y-4 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">PDI</Label>
                  <p className="font-medium">{selectedAcao.pdi?.titulo || "Não encontrado"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAcao.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Competências</Label>
                <div className="space-y-1 mt-1">
                  <p className="text-sm"><strong>Bloco:</strong> {selectedAcao.blocoCompetencia?.nome || "Não encontrado"}</p>
                  <p className="text-sm"><strong>Macro:</strong> {selectedAcao.macroCompetencia?.nome || "Não encontrado"}</p>
                  <p className="text-sm"><strong>Micro:</strong> {selectedAcao.microCompetencia?.nome || "Não encontrado"}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Ação a ser realizada</Label>
                <p className="mt-1">{selectedAcao.descricao || "Não especificada"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Prazo</Label>
                  <p className="font-medium">{new Date(selectedAcao.prazo).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Criado em</Label>
                  <p className="text-sm">{new Date(selectedAcao.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Fechar</Button>
            <Button onClick={() => {
              setShowViewDialog(false);
              handleEdit(selectedAcao);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ação "{selectedAcao?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

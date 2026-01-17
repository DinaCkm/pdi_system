import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Eye, Edit, Trash2, Target, Calendar, User, Lock, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectContentNoPortal } from "@/components/ui/select";
import { Controller, useForm } from "react-hook-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NovoFormularioAcao } from "./AcoesNovoFormulario";
import { AcoesHistorico } from "@/components/AcoesHistorico";
import { ImportarAcoes } from "@/components/ImportarAcoes";

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
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);
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
  const { data: allMacrosCompetencias } = trpc.competencias.listAllMacros.useQuery();
  
  // Cleanup de Portals ao desmontar o componente
  useEffect(() => {
    return () => {
      // Fechar todos os diálogos ao sair da página
      setShowCreateDialog(false);
      setShowEditDialog(false);
      setShowViewDialog(false);
      setShowDeleteDialog(false);
      setShowHistoricoDialog(false);
      
      // Remover qualquer Portal restante do DOM
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach(portal => {
        if (portal.parentNode) {
          portal.parentNode.removeChild(portal);
        }
      });
    };
  }, []);

  // Efeito para aplicar filtro de PDI quando vier da URL
  useEffect(() => {
    if (pdiIdFromUrl) {
      setFilterPDI(pdiIdFromUrl);
      // Limpar query param da URL
      window.history.replaceState({}, '', '/acoes');
    }
  }, [pdiIdFromUrl]);
  
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
    // Nota: selectedPDI tem cicloId e cicloNome, não objeto ciclo
    // Validação de prazo será feita no backend
    if (selectedPDI) {
      // Prazo será validado no backend contra o ciclo
      const prazoDate = new Date(data.prazo);

      // Validação será feita no backend
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
      // Filtros por relacionamentos serão implementados após sincronizar dados com backend
      const matchesUsuario = filterUsuario === "all" || true; // TODO: Implementar após backend
      const matchesLider = filterLider === "all" || true; // TODO: Implementar após backend
      const matchesDepartamento = filterDepartamento === "all" || true; // TODO: Implementar após backend
      const matchesBloco = filterBloco === "all" || true; // TODO: Implementar após backend
      const matchesMacro = filterMacro === "all" || true; // TODO: Implementar após backend
      const matchesMicro = filterMicro === "all" || true; // TODO: Implementar após backend
      
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

  const getAdjustmentBadge = (count: number) => {
    // Não exibir se count for 0
    if (count === 0) return null;
    
    // Definir cor baseado na quantidade
    let className = "";
    if (count >= 5) {
      // Vermelho: limite atingido
      className = "bg-red-100 text-red-700 border-red-300";
    } else if (count >= 3) {
      // Amarelo: próximo do limite
      className = "bg-yellow-100 text-yellow-700 border-yellow-300";
    } else {
      // Verde: ainda tem bastante margem
      className = "bg-green-100 text-green-700 border-green-300";
    }
    
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        {count}/5 ajustes
      </Badge>
    );
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
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ação
          </Button>
          <ImportarAcoes />
        </div>
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
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
              </Select>
            </div>
            <div>
              <Label>Líder</Label>
              <Select value={filterLider} onValueChange={setFilterLider}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios?.filter(u => u.role === 'lider' || u.role === 'admin').map((lider) => (
                    <SelectItem key={lider.id} value={lider.id.toString()}>
                      {lider.name}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
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
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  {departamentos?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.nome}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
              </Select>
            </div>
            <div>
              <Label>Bloco de Competência</Label>
              <Select value={filterBloco} onValueChange={setFilterBloco}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  {blocosCompetencias?.map((bloco) => (
                    <SelectItem key={bloco.id} value={bloco.id.toString()}>
                      {bloco.nome}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
              </Select>
            </div>
            <div>
              <Label>Macrocompetência</Label>
              <Select value={filterMacro} onValueChange={setFilterMacro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  {allMacrosCompetencias?.map((macro) => (
                    <SelectItem key={macro.id} value={macro.id.toString()}>
                      {macro.nome}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
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
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  {microsCompetencias?.map((micro) => (
                    <SelectItem key={micro.id} value={micro.id.toString()}>
                      {micro.nome}
                    </SelectItem>
                  ))}
                </SelectContentNoPortal>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente_aprovacao_lider">Pendente Aprovação Líder</SelectItem>
                  <SelectItem value="aprovada_lider">Aprovada Líder</SelectItem>
                  <SelectItem value="reprovada_lider">Reprovada Líder</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="em_discussao">Em Discussão</SelectItem>
                  <SelectItem value="evidencia_enviada">Evidência Enviada</SelectItem>
                  <SelectItem value="evidencia_aprovada">Evidência Aprovada</SelectItem>
                  <SelectItem value="evidencia_reprovada">Evidência Reprovada</SelectItem>
                  <SelectItem value="correcao_solicitada">Correção Solicitada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContentNoPortal>
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
                {/* Hierarquia: Empregado em destaque */}
                {(() => {
                  const pdi = pdis?.find((p: any) => p.id === acao.pdiId);
                  const user = usuarios?.find((u: any) => u.id === pdi?.colaboradorId);
                  return (
                    <div className="mb-3">
                      <p className="text-sm font-bold text-foreground">{user?.name || "Colaborador"}</p>
                    </div>
                  );
                })()}
                {/* Título da Ação */}
                <CardTitle className="text-lg mb-2">{acao.nome}</CardTitle>
                {/* Status e Ajustes */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(acao.status)}
                    {getAdjustmentBadge(acao.adjustmentCount || 0)}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {acao.descricao || "Ação não especificada"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Informações do Líder, Departamento, Prazo */}
                {(() => {
                  const pdi = pdis?.find((p: any) => p.id === acao.pdiId);
                  const user = usuarios?.find((u: any) => u.id === pdi?.colaboradorId);
                  const leader = usuarios?.find((u: any) => u.id === user?.leaderId);
                  const dept = departamentos?.find((d: any) => d.id === user?.departamentoId);
                  return (
                    <>
                      {pdi && user && (
                        <>
                          <div className="text-sm border-b pb-2">
                            <span className="font-semibold text-foreground">Líder:</span>
                            <p className="text-muted-foreground text-xs">{leader?.name || "N/A"}</p>
                          </div>
                          <div className="text-sm border-b pb-2">
                            <span className="font-semibold text-foreground">Departamento:</span>
                            <p className="text-muted-foreground text-xs">{dept?.nome || "N/A"}</p>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Prazo: {new Date(acao.prazo).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(acao)} className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    Visualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedAcao(acao); setShowHistoricoDialog(true); }} title="Ver histórico de mudanças">
                    <Clock className="h-4 w-4" />
                  </Button>
                  {acao.status === 'aguardando_autorizacao_lider_para_ajuste' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled 
                      title="Edição bloqueada: Aguardando 'De Acordo' do Líder"
                      className="cursor-not-allowed opacity-50"
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleEdit(acao)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
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



      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                    <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                      {pdis?.map((pdi) => (
                        <SelectItem key={pdi.id} value={pdi.id.toString()}>
                          {pdi.titulo} - {pdi.colaboradorNome || "Colaborador desconhecido"}
                        </SelectItem>
                      ))}
                    </SelectContentNoPortal>
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
                      <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                        {blocosCompetencias?.map((bloco) => (
                          <SelectItem key={bloco.id} value={bloco.id.toString()}>
                            {bloco.nome}
                          </SelectItem>
                        ))}
                      </SelectContentNoPortal>
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
                      <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                        {editMacroCompetencias?.map((macro) => (
                          <SelectItem key={macro.id} value={macro.id.toString()}>
                            {macro.nome}
                          </SelectItem>
                        ))}
                      </SelectContentNoPortal>
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
                      <SelectContentNoPortal onCloseAutoFocus={(e) => e.preventDefault()}>
                        {editMicroCompetencias?.map((micro) => (
                          <SelectItem key={micro.id} value={micro.id.toString()}>
                            {micro.nome}
                          </SelectItem>
                        ))}
                      </SelectContentNoPortal>
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

      {/* Dialog de Visualizacao */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{selectedAcao?.nome}</DialogTitle>
            <DialogDescription>Detalhes da Acao de Desenvolvimento</DialogDescription>
          </DialogHeader>
          {selectedAcao && (
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
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

              {/* Secao de Historico */}
              <div className="border-t pt-4">
                <Label className="text-muted-foreground font-semibold">Historico de Mudancas</Label>
                <div className="mt-2">
                  <AcoesHistorico actionId={selectedAcao.id} actionName={selectedAcao.nome} />
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

      {/* Dialog de Histórico */}
      <Dialog open={showHistoricoDialog} onOpenChange={setShowHistoricoDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Histórico de Mudanças</DialogTitle>
            <DialogDescription>
              Todas as alterações realizadas nesta ação
            </DialogDescription>
          </DialogHeader>
          {selectedAcao && (
            <div className="py-4">
              <AcoesHistorico actionId={selectedAcao.id} actionName={selectedAcao.nome} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoricoDialog(false)}>Fechar</Button>
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

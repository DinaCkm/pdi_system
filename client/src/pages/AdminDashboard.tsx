import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from '@/components/RichTextEditor';
import RichTextDisplay from '@/components/RichTextDisplay';
import { stripHtml } from '@/components/RichTextDisplay';
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MessageSquare, Edit2, Filter, TrendingUp, ArrowRight, Building2, User, Calendar, Timer, Bell } from "lucide-react";
import { Link } from "wouter";

function ReenviarNotificacaoButton({ adjustmentId, liderNome }: { adjustmentId: number; liderNome: string }) {
  const reenviar = trpc.pdiAjustes.reenviarNotificacaoLider.useMutation({
    onSuccess: (data) => {
      toast.success(`Email reenviado com sucesso para o líder ${data.liderNome} (${data.liderEmail})`);
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao reenviar notificação ao líder');
    },
  });

  return (
    <Button
      variant="outline"
      className="border-amber-300 text-amber-700 hover:bg-amber-50"
      onClick={() => reenviar.mutate({ adjustmentId })}
      disabled={reenviar.isPending}
      title="Reenviar email de notificação ao líder"
    >
      {reenviar.isPending ? (
        <Clock className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
    </Button>
  );
}

export default function AdminDashboard() {
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  
  // Estado para edição de ação
  const [showEditActionModal, setShowEditActionModal] = useState(false);
  const [editingActionData, setEditingActionData] = useState<any>(null);
  
  // Filtro de status para solicitações
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const { data: pendingEvidences = [], isLoading: evLoading, error: evError } = trpc.evidences.listPending.useQuery();
  const { data: allAdjustments = [], isLoading: adjLoading, error: adjError } = trpc.adjustmentRequests.listPending.useQuery();
  
  // Filtrar solicitações por status
  const filteredAdjustments = statusFilter === "todos" 
    ? allAdjustments 
    : statusFilter === "com_parecer"
    ? allAdjustments.filter((adj: any) => adj.comentariosLider && adj.comentariosLider.length > 0)
    : statusFilter === "aguardando_lider"
    ? allAdjustments.filter((adj: any) => 
        (adj.status === 'aguardando_lider') || 
        (adj.status === 'pendente' && (!adj.comentariosLider || adj.comentariosLider.length === 0))
      )
    : statusFilter === "aguardando_ckm"
    ? allAdjustments.filter((adj: any) => 
        adj.status === 'pendente' && 
        adj.comentariosLider && adj.comentariosLider.length > 0 &&
        adj.status !== 'aprovada' && adj.status !== 'reprovada'
      )
    : allAdjustments.filter((adj: any) => adj.status === statusFilter);
  
  // Função para calcular tempo decorrido
  const getTempoDecorrido = (dataStr: string) => {
    if (!dataStr) return 'N/A';
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffDias > 0) return `${diffDias} dia${diffDias > 1 ? 's' : ''}`;
    if (diffHoras > 0) return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    return 'Menos de 1 hora';
  };

  const getCorTempo = (dataStr: string) => {
    if (!dataStr) return 'text-gray-500';
    const data = new Date(dataStr);
    const agora = new Date();
    const diffDias = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias >= 7) return 'text-red-600';
    if (diffDias >= 3) return 'text-amber-600';
    return 'text-green-600';
  };

  // Contar por status
  const countByStatus = {
    pendente: allAdjustments.filter((adj: any) => adj.status === 'pendente').length,
    aguardando_lider: allAdjustments.filter((adj: any) => 
      (adj.status === 'aguardando_lider') || 
      (adj.status === 'pendente' && (!adj.comentariosLider || adj.comentariosLider.length === 0))
    ).length,
    aguardando_ckm: allAdjustments.filter((adj: any) => 
      adj.status === 'pendente' && 
      adj.comentariosLider && adj.comentariosLider.length > 0 &&
      adj.status !== 'aprovada' && adj.status !== 'reprovada'
    ).length,
    aprovada: allAdjustments.filter((adj: any) => adj.status === 'aprovada').length,
    reprovada: allAdjustments.filter((adj: any) => adj.status === 'reprovada').length,
    comParecerLider: allAdjustments.filter((adj: any) => adj.comentariosLider && adj.comentariosLider.length > 0).length,
  };
  
  useEffect(() => {
    console.log('📊 AdminDashboard - Dados carregados:');
    console.log('  Evidências:', pendingEvidences?.length || 0, pendingEvidences);
    console.log('  Ajustes:', allAdjustments?.length || 0, allAdjustments);
    console.log('  Erros:', { evError, adjError });
  }, [pendingEvidences, allAdjustments, evError, adjError]);

  const utils = trpc.useUtils();

  const approveEvidenceMutation = trpc.evidences.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Evidência aprovada!");
      utils.evidences.listPending.invalidate();
      utils.evidences.listByUser.invalidate();
      setShowEvidenceDialog(false);
      setSelectedEvidence(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao aprovar"),
  });

  const rejectEvidenceMutation = trpc.evidences.reject.useMutation({
    onSuccess: () => {
      toast.success("❌ Evidência rejeitada!");
      utils.evidences.listPending.invalidate();
      utils.evidences.listByUser.invalidate();
      setShowEvidenceDialog(false);
      setSelectedEvidence(null);
      setRejectionReason("");
    },
    onError: (error) => toast.error(error.message || "Erro ao rejeitar"),
  });

  // Mutation para atualizar a ação real no banco
  const updateActionMutation = trpc.actions.update.useMutation({
    onSuccess: () => {
      toast.success("✅ Alterações salvas na ação com sucesso!");
      utils.adjustmentRequests.listPending.invalidate();
      setShowEditActionModal(false);
    },
    onError: (error) => toast.error(error.message || "Erro ao salvar alterações na ação"),
  });

  const approveAdjustmentMutation = trpc.adjustmentRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Solicitação aprovada!");
      utils.adjustmentRequests.listPending.invalidate();
      setShowAdjustmentDialog(false);
      setSelectedAdjustment(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao aprovar"),
  });

  const rejectAdjustmentMutation = trpc.adjustmentRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("❌ Solicitação rejeitada!");
      utils.adjustmentRequests.listPending.invalidate();
      setShowAdjustmentDialog(false);
      setSelectedAdjustment(null);
      setAdjustmentReason("");
    },
    onError: (error) => toast.error(error.message || "Erro ao rejeitar"),
  });

  const handleApproveEvidence = () => {
    if (!selectedEvidence) return;
    approveEvidenceMutation.mutate({ id: selectedEvidence.id });
  };

  const handleRejectEvidence = () => {
    if (!selectedEvidence || !stripHtml(rejectionReason).trim()) {
      toast.error("Forneça um motivo para a rejeição");
      return;
    }
    rejectEvidenceMutation.mutate({
      id: selectedEvidence.id,
      justificativa: rejectionReason,
    });
  };

  const handleApproveAdjustment = () => {
    if (!selectedAdjustment) return;
    approveAdjustmentMutation.mutate({ id: selectedAdjustment.id });
  };

  const handleRejectAdjustment = () => {
    if (!selectedAdjustment || !stripHtml(adjustmentReason).trim()) {
      toast.error("Forneça um motivo para a rejeição");
      return;
    }
    rejectAdjustmentMutation.mutate({
      id: selectedAdjustment.id,
      justificativa: adjustmentReason,
    });
  };

  const handleOpenEditAction = () => {
    if (!selectedAdjustment?.acao) return;
    // Formatar prazo para input date (YYYY-MM-DD)
    let prazoFormatado = selectedAdjustment.acao.prazo || '';
    if (prazoFormatado) {
      try {
        const d = new Date(prazoFormatado);
        if (!isNaN(d.getTime())) {
          prazoFormatado = d.toISOString().split('T')[0];
        }
      } catch {}
    }
    setEditingActionData({
      id: selectedAdjustment.acao.id,
      titulo: selectedAdjustment.acao.titulo,
      descricao: selectedAdjustment.acao.descricao,
      prazo: prazoFormatado,
      macroId: selectedAdjustment.acao.macroId,
    });
    setShowEditActionModal(true);
  };

  const handleSaveActionEdits = async () => {
    if (!editingActionData?.id) {
      toast.error("Erro: ID da ação não encontrado");
      return;
    }
    try {
      const updatePayload: any = { id: editingActionData.id };
      if (editingActionData.titulo) updatePayload.titulo = editingActionData.titulo;
      if (editingActionData.descricao) updatePayload.descricao = editingActionData.descricao;
      if (editingActionData.prazo) updatePayload.prazo = editingActionData.prazo;
      if (editingActionData.macroId) updatePayload.macroId = editingActionData.macroId;
      
      updateActionMutation.mutate(updatePayload);
    } catch (error: any) {
      toast.error("Erro ao salvar alterações: " + (error.message || "Erro desconhecido"));
    }
  };
  
  // Função para obter badge de status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'aguardando_lider':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <MessageSquare className="h-3 w-3 mr-1" />
            Aguardando Líder
          </Badge>
        );
      case 'aprovada':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case 'reprovada':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Reprovada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-600">Dashboard do Admin</h1>
        <p className="text-gray-600 mt-2">Gerencie evidências e solicitações de ajuste</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              📋 Evidências Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{pendingEvidences.length}</div>
            <p className="text-sm text-gray-600">aguardando avaliação</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pendente")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              ⏳ Solicitações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{countByStatus.pendente}</div>
            <p className="text-sm text-gray-600">aguardando avaliação</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-purple-200 bg-purple-50/30" onClick={() => setStatusFilter("com_parecer")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              💬 Com Parecer do Líder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{countByStatus.comParecerLider}</div>
            <p className="text-sm text-gray-600">solicitações comentadas</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("todos")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Total de Solicitações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{allAdjustments.length}</div>
            <p className="text-sm text-gray-600">todas as solicitações</p>
          </CardContent>
        </Card>
      </div>



      <Tabs defaultValue="evidences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="evidences">
            Evidências ({pendingEvidences.length})
          </TabsTrigger>
          <TabsTrigger value="adjustments">
            Solicitações ({allAdjustments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evidences" className="space-y-4">
          {pendingEvidences.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-600">Nenhuma evidência pendente</p>
            </Card>
          ) : (
            pendingEvidences.map((evidence: any) => (
              <Card key={evidence.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{evidence.acao?.titulo || "Ação desconhecida"}</CardTitle>
                      <CardDescription className="space-y-1">
                        <span className="block">Enviada por: <strong>{evidence.solicitante?.name || "Desconhecido"}</strong></span>
                        <span className="flex items-center gap-1 text-xs">
                          <Building2 className="h-3 w-3" />
                          Depto: {evidence.solicitante?.departamento || 'Não informado'}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          Líder: {evidence.solicitante?.liderNome || 'Não informado'}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          Data: {evidence.createdAt ? new Date(evidence.createdAt).toLocaleDateString('pt-BR') + ' às ' + new Date(evidence.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${getCorTempo(evidence.createdAt)}`}>
                          <Timer className="h-3 w-3" />
                          Tempo de resposta: {getTempoDecorrido(evidence.createdAt)}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Descrição da Evidência:</p>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-3">{evidence.descricao ? stripHtml(evidence.descricao) : "Sem descrição"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedEvidence(evidence);
                        setShowEvidenceDialog(true);
                      }}
                      className="flex-1"
                    >
                      Avaliar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          {/* Filtros de Status */}
          <Card className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("todos")}
                >
                  Todos ({allAdjustments.length})
                </Button>
                <Button
                  variant={statusFilter === "pendente" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pendente")}
                  className={statusFilter === "pendente" ? "bg-amber-600 hover:bg-amber-700" : ""}
                >
                  Pendentes ({countByStatus.pendente})
                </Button>
                <Button
                  variant={statusFilter === "aguardando_lider" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("aguardando_lider")}
                  className={statusFilter === "aguardando_lider" ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  Aguardando Líder ({countByStatus.aguardando_lider})
                </Button>
                <Button
                  variant={statusFilter === "aprovada" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("aprovada")}
                  className={statusFilter === "aprovada" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Aprovadas ({countByStatus.aprovada})
                </Button>
                <Button
                  variant={statusFilter === "reprovada" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("reprovada")}
                  className={statusFilter === "reprovada" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Reprovadas ({countByStatus.reprovada})
                </Button>
                <Button
                  variant={statusFilter === "aguardando_ckm" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("aguardando_ckm")}
                  className={statusFilter === "aguardando_ckm" ? "bg-orange-600 hover:bg-orange-700" : "border-orange-300 text-orange-700"}
                >
                  🎯 Aguardando CKM ({countByStatus.aguardando_ckm})
                </Button>
                <Button
                  variant={statusFilter === "com_parecer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("com_parecer")}
                  className={statusFilter === "com_parecer" ? "bg-purple-600 hover:bg-purple-700" : "border-purple-300 text-purple-700"}
                >
                  💬 Com Parecer ({countByStatus.comParecerLider})
                </Button>
              </div>
            </div>
          </Card>

          {filteredAdjustments.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-600">
                {statusFilter === "todos" 
                  ? "Nenhuma solicitação encontrada" 
                  : statusFilter === "com_parecer"
                  ? "Nenhuma solicitação com parecer do líder"
                  : `Nenhuma solicitação com status "${statusFilter}"`}
              </p>
            </Card>
          ) : (
            filteredAdjustments.map((adjustment: any) => (
              <Card key={adjustment.id} className={adjustment.comentariosLider && adjustment.comentariosLider.length > 0 ? 'border-purple-200 bg-purple-50/30' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                          ID #{adjustment.id.toString().padStart(5, '0')}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{adjustment.acao?.titulo || "Ação desconhecida"}</CardTitle>
                      <CardDescription className="space-y-1">
                        <span className="block">Solicitada por: <strong>{adjustment.solicitante?.name || "Desconhecido"}</strong></span>
                        <span className="flex items-center gap-1 text-xs">
                          <Building2 className="h-3 w-3" />
                          Depto: {adjustment.solicitante?.departamento || 'Não informado'}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          Líder: {adjustment.solicitante?.liderNome || 'Não informado'}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          Data: {adjustment.createdAt ? new Date(adjustment.createdAt).toLocaleDateString('pt-BR') + ' às ' + new Date(adjustment.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${getCorTempo(adjustment.createdAt)}`}>
                          <Timer className="h-3 w-3" />
                          Tempo de resposta: {getTempoDecorrido(adjustment.createdAt)}
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(adjustment.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mostrar campos que o colaborador quer alterar */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Campos que o colaborador deseja alterar:</p>
                    {(() => {
                      try {
                        const dados = JSON.parse(adjustment.camposAjustar || '{}');
                        
                        // Novo formato: { camposSelecionados: ["Título", "Prazo", ...] }
                        if (dados.camposSelecionados && Array.isArray(dados.camposSelecionados)) {
                          const campos = dados.camposSelecionados;
                          if (campos.length === 0) {
                            return <p className="text-sm text-gray-500 italic">Nenhum campo especificado</p>;
                          }
                          return (
                            <div className="flex flex-wrap gap-2">
                              {campos.map((campo: string) => (
                                <Badge key={campo} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                  {campo}
                                </Badge>
                              ))}
                            </div>
                          );
                        }
                        
                        // Formato antigo: { titulo: "novo valor", prazo: "novo valor", ... }
                        const valoresAnteriores = JSON.parse(adjustment.dadosAntesAjuste || '{}');
                        const campos = Object.keys(dados);
                        if (campos.length === 0) {
                          return <p className="text-sm text-gray-500 italic">Detalhes não especificados</p>;
                        }
                        
                        const labelMap: Record<string, string> = {
                          titulo: 'Título',
                          descricao: 'Descrição',
                          prazo: 'Prazo',
                          competencia: 'Competência'
                        };
                        
                        return (
                          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
                            {campos.map((campo) => {
                              const valorAnterior = valoresAnteriores[campo] || 'N/A';
                              const novoValor = dados[campo] || 'N/A';
                              const label = labelMap[campo] || campo;
                              
                              const formatValue = (val: any) => {
                                if (!val || val === 'N/A') return 'N/A';
                                if (campo === 'prazo' && val) {
                                  try {
                                    return new Date(val).toLocaleDateString('pt-BR');
                                  } catch { return val; }
                                }
                                return String(val).substring(0, 100) + (String(val).length > 100 ? '...' : '');
                              };
                              
                              return (
                                <div key={campo} className="text-sm">
                                  <span className="font-medium text-gray-700">{label}:</span>
                                  <div className="flex items-center gap-2 mt-1 ml-2">
                                    <span className="text-red-600 line-through bg-red-50 px-2 py-0.5 rounded">{formatValue(valorAnterior)}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">{formatValue(novoValor)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } catch {
                        return <p className="text-sm text-gray-600">{adjustment.camposAjustar || 'Não especificado'}</p>;
                      }
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Justificativa:</p>
                    <div className="text-sm text-gray-600 mt-1 bg-blue-50 p-2 rounded border border-blue-100"><RichTextDisplay content={adjustment.justificativa || ''} /></div>
                  </div>
                  
                  {/* Mostrar comentários do líder */}
                  {adjustment.comentariosLider && adjustment.comentariosLider.length > 0 && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        <p className="text-sm font-semibold text-purple-700">Parecer do Líder:</p>
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                          {adjustment.comentariosLider.length} comentário(s)
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {adjustment.comentariosLider.map((comentario: any) => (
                          <div key={comentario.id} className="bg-white p-2 rounded border border-purple-100">
                            <p className="text-sm text-gray-700">{comentario.comentario}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Por: {comentario.autorName || 'Líder'} • {new Date(comentario.createdAt).toLocaleDateString('pt-BR')} às {new Date(comentario.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar botão de avaliar apenas para solicitações pendentes ou aguardando líder */}
                  {(adjustment.status === 'pendente' || adjustment.status === 'aguardando_lider') && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedAdjustment(adjustment);
                          setShowAdjustmentDialog(true);
                        }}
                        className="flex-1"
                      >
                        Avaliar
                      </Button>
                      <ReenviarNotificacaoButton adjustmentId={adjustment.id} liderNome={adjustment.solicitante?.liderNome || 'do colaborador'} />
                    </div>
                  )}
                  
                  {/* Mostrar justificativa do admin se já foi avaliada */}
                  {adjustment.justificativaAdmin && (
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg border">
                      <p className="text-sm font-semibold text-gray-700">Justificativa do Admin:</p>
                      <div className="text-sm text-gray-600 mt-1"><RichTextDisplay content={adjustment.justificativaAdmin} /></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Avaliação de Evidência */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar Evidência</DialogTitle>
            <DialogDescription>
              {selectedEvidence?.acao?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Descrição:</p>
              <div className="text-sm text-gray-600 mt-1">{selectedEvidence?.descricao ? <RichTextDisplay content={selectedEvidence.descricao} /> : "Sem descrição"}</div>
            </div>

            <div>
              <label className="text-sm font-semibold">Motivo da Rejeição (se aplicável):</label>
              <div className="mt-2">
                <RichTextEditor
                  value={rejectionReason}
                  onChange={setRejectionReason}
                  placeholder="Explique por que está rejeitando..."
                  minHeight="80px"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEvidenceDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectEvidence}
              disabled={rejectEvidenceMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={handleApproveEvidence}
              disabled={approveEvidenceMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Avaliação de Solicitação */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar Solicitação de Ajuste</DialogTitle>
            <DialogDescription>
              {selectedAdjustment?.acao?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Campos a Alterar:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {(() => {
                  try {
                    const dados = JSON.parse(selectedAdjustment?.camposAjustar || '{}');
                    if (dados.camposSelecionados && Array.isArray(dados.camposSelecionados)) {
                      return dados.camposSelecionados.map((campo: string) => (
                        <span key={campo} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{campo}</span>
                      ));
                    }
                    return <p className="text-sm text-gray-600">{selectedAdjustment?.camposAjustar}</p>;
                  } catch {
                    return <p className="text-sm text-gray-600">{selectedAdjustment?.camposAjustar || 'Não especificado'}</p>;
                  }
                })()}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">Justificativa:</p>
              <div className="text-sm text-gray-600 mt-1"><RichTextDisplay content={selectedAdjustment?.justificativa || ''} /></div>
            </div>

            <div>
              <label className="text-sm font-semibold">Motivo da Rejeição (se aplicável):</label>
              <div className="mt-2">
                <RichTextEditor
                  value={adjustmentReason}
                  onChange={setAdjustmentReason}
                  placeholder="Explique por que está rejeitando..."
                  minHeight="80px"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowAdjustmentDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenEditAction}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Ação
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectAdjustment}
              disabled={rejectAdjustmentMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={handleApproveAdjustment}
              disabled={approveAdjustmentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Ação */}
      <Dialog open={showEditActionModal} onOpenChange={setShowEditActionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ação</DialogTitle>
            <DialogDescription>
              Aplique os ajustes solicitados antes de aprovar
            </DialogDescription>
          </DialogHeader>

          {editingActionData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Título:</label>
                <input
                  type="text"
                  value={editingActionData.titulo || ""}
                  onChange={(e) =>
                    setEditingActionData({
                      ...editingActionData,
                      titulo: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Descrição:</label>
                <RichTextEditor
                  value={editingActionData.descricao || ""}
                  onChange={(val) =>
                    setEditingActionData({
                      ...editingActionData,
                      descricao: val,
                    })
                  }
                  minHeight="100px"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Prazo:</label>
                <input
                  type="date"
                  value={editingActionData.prazo || ""}
                  onChange={(e) =>
                    setEditingActionData({
                      ...editingActionData,
                      prazo: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Macro Competência (ID):</label>
                <input
                  type="number"
                  value={editingActionData.macroId || ""}
                  onChange={(e) =>
                    setEditingActionData({
                      ...editingActionData,
                      macroId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditActionModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveActionEdits}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateActionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

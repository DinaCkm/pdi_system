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
import { CheckCircle, XCircle, Clock, MessageSquare, Edit2, Filter, TrendingUp, ArrowRight, Building2, User, Calendar, Timer, Bell, Eye, FileCheck, FileX, Search, ExternalLink, FileText, Gauge, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
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

  // Estado para visualizar detalhes da ação base nas evidências
  const [selectedActionDetails, setSelectedActionDetails] = useState<any>(null);
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  const [showActionDetailsDialog, setShowActionDetailsDialog] = useState(false);

  // Filtro de status para solicitações
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Estados para validação de impacto (novo fluxo)
  const [evidenciaComprova, setEvidenciaComprova] = useState<'sim' | 'nao' | 'insuficiente' | ''>('');
  const [impactoComprova, setImpactoComprova] = useState<'sim' | 'nao' | 'parcialmente' | ''>('');
  const [impactoValidadoAdmin, setImpactoValidadoAdmin] = useState(50);
  const [parecerImpacto, setParecerImpacto] = useState('');

  // Sub-aba de evidências: pendentes, aprovadas, devolvidas
  const [evidenceTab, setEvidenceTab] = useState<'pendentes' | 'aprovadas' | 'devolvidas'>('pendentes');

  // Busca de evidências
  const [evidenceSearch, setEvidenceSearch] = useState('');

  const { data: pendingEvidences = [], isLoading: evLoading, error: evError } = trpc.evidences.listPending.useQuery();
  const { data: approvedEvidences = [], isLoading: approvedEvLoading } = trpc.evidences.listApproved.useQuery();
  const { data: rejectedEvidences = [], isLoading: rejectedEvLoading } = trpc.evidences.listRejected.useQuery();
  const { data: allAdjustments = [], isLoading: adjLoading, error: adjError } = trpc.adjustmentRequests.listPending.useQuery();

  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();
  const { data: fullSelectedAction, isLoading: loadingSelectedAction } = trpc.actions.getById.useQuery(
    { id: selectedActionId || 0 },
    { enabled: !!selectedActionId && showActionDetailsDialog }
  );

  const actionDetailsResolved = fullSelectedAction || selectedActionDetails;

  // Filtrar evidências por busca
  const filterEvidences = (evidences: any[]) => {
    if (!evidenceSearch.trim()) return evidences;
    const search = evidenceSearch.toLowerCase();
    return evidences.filter((ev: any) =>
      (ev.solicitante?.name || '').toLowerCase().includes(search) ||
      (ev.acao?.titulo || '').toLowerCase().includes(search) ||
      (ev.solicitante?.departamento || '').toLowerCase().includes(search)
    );
  };

  const getContestacaoTexto = (evidence: any) => {
    const contestacao = evidence?.texts?.find((t: any) =>
      typeof t?.texto === "string" &&
      t.texto.startsWith("[CONTESTACAO_COLABORADOR]")
    );

    if (!contestacao?.texto) return null;

    return contestacao.texto
      .replace("[CONTESTACAO_COLABORADOR]", "")
      .trim();
  };

  const filteredPendingEvidences = filterEvidences(pendingEvidences);
  const filteredApprovedEvidences = filterEvidences(approvedEvidences);
  const filteredRejectedEvidences = filterEvidences(rejectedEvidences);

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

  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return 'Não informado';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('pt-BR');
  };

  const getActionMacroLabel = (action: any) => {
    if (!action) return 'Não informado';

    const macroById = macros.find((m: any) => m.id === action?.macroId);

    return (
      macroById?.nome ||
      action?.macroCompetencia?.nome ||
      action?.macrocompetencia?.nome ||
      action?.macro?.nome ||
      action?.competencia?.nome ||
      action?.macroNome ||
      action?.competenciaNome ||
      (action?.macroId ? `ID ${action.macroId}` : 'Não informado')
    );
  };

  const handleOpenActionDetails = (action: any, actionId?: number) => {
    setSelectedActionDetails(action || null);
    setSelectedActionId(actionId || action?.id || null);
    setShowActionDetailsDialog(true);
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

  const validateImpactMutation = trpc.evidences.validateImpact.useMutation({
    onSuccess: (result) => {
      if (result.status === 'aprovada') {
        toast.success(`✅ Evidência aprovada! Impacto validado: ${result.impactoValidado ?? '-'}%`);
      } else {
        toast.success('❌ Evidência devolvida ao empregado.');
      }
      utils.evidences.listPending.invalidate();
      utils.evidences.listApproved.invalidate();
      utils.evidences.listRejected.invalidate();
      utils.evidences.listByUser.invalidate();
      setShowEvidenceDialog(false);
      setSelectedEvidence(null);
      setEvidenciaComprova('');
      setImpactoComprova('');
      setImpactoValidadoAdmin(50);
      setParecerImpacto('');
      setRejectionReason('');
    },
    onError: (error) => toast.error(error.message || 'Erro ao avaliar'),
  });

  // Manter mutations antigos para compatibilidade
  const approveEvidenceMutation = trpc.evidences.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Evidência aprovada!");
      utils.evidences.listPending.invalidate();
      utils.evidences.listApproved.invalidate();
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
      utils.evidences.listRejected.invalidate();
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

  const handleValidateImpact = () => {
    if (!selectedEvidence || !evidenciaComprova) {
      toast.error('Informe se a evidência comprova a realização da ação');
      return;
    }
    if ((evidenciaComprova === 'nao' || evidenciaComprova === 'insuficiente') && !stripHtml(rejectionReason).trim()) {
      toast.error(
        evidenciaComprova === 'insuficiente'
          ? 'Forneça uma orientação ao empregado sobre o que precisa melhorar no relato'
          : 'Forneça um motivo para a devolução'
      );
      return;
    }
    validateImpactMutation.mutate({
      evidenceId: selectedEvidence.id,
      evidenciaComprova: evidenciaComprova as 'sim' | 'nao' | 'insuficiente',
      impactoComprova: evidenciaComprova === 'sim' ? (impactoComprova || undefined) : undefined,
      impactoValidadoAdmin: evidenciaComprova === 'sim' ? impactoValidadoAdmin : undefined,
      parecerImpacto: parecerImpacto.trim() || undefined,
      justificativaAdmin: (evidenciaComprova === 'nao' || evidenciaComprova === 'insuficiente') ? rejectionReason : undefined,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEvidenceTab('pendentes')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              📋 Evid. Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{pendingEvidences.length}</div>
            <p className="text-sm text-gray-600">aguardando avaliação</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200 bg-green-50/30" onClick={() => setEvidenceTab('aprovadas')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              ✅ Evid. Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvedEvidences.length}</div>
            <p className="text-sm text-gray-600">validadas</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200 bg-red-50/30" onClick={() => setEvidenceTab('devolvidas')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              ❌ Evid. Devolvidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{rejectedEvidences.length}</div>
            <p className="text-sm text-gray-600">devolvidas</p>
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
            Evidências ({pendingEvidences.length + approvedEvidences.length + rejectedEvidences.length})
          </TabsTrigger>
          <TabsTrigger value="adjustments">
            Solicitações ({allAdjustments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evidences" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={evidenceTab === 'pendentes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEvidenceTab('pendentes')}
              className={evidenceTab === 'pendentes' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <Clock className="h-4 w-4 mr-1" />
              Pendentes ({pendingEvidences.length})
            </Button>
            <Button
              variant={evidenceTab === 'aprovadas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEvidenceTab('aprovadas')}
              className={evidenceTab === 'aprovadas' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Aprovadas ({approvedEvidences.length})
            </Button>
            <Button
              variant={evidenceTab === 'devolvidas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEvidenceTab('devolvidas')}
              className={evidenceTab === 'devolvidas' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Devolvidas ({rejectedEvidences.length})
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, ação ou departamento..."
              value={evidenceSearch}
              onChange={(e) => setEvidenceSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {evidenceTab === 'pendentes' && (
            <>
              {filteredPendingEvidences.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-gray-600">Nenhuma evidência pendente</p>
                </Card>
              ) : (
                filteredPendingEvidences.map((evidence: any) => (
                  <Card key={evidence.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{evidence.acao?.titulo || "Ação desconhecida"}</CardTitle>

                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenActionDetails(evidence.acao, evidence.actionId)}
                              disabled={!evidence.actionId}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver mais informações
                            </Button>
                          </div>

                          <CardDescription className="space-y-1 mt-3">
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
                    <CardContent className="space-y-3">
                      {evidence.oQueRealizou ? (
                        <div className="space-y-2">
                          {(evidence.tipoEvidencia || evidence.cargaHoraria) && (
                            <div className="flex gap-3 text-xs text-gray-500">
                              {evidence.tipoEvidencia && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{evidence.tipoEvidencia}</span>}
                              {evidence.cargaHoraria && <span className="bg-gray-100 px-2 py-0.5 rounded">{evidence.cargaHoraria}h</span>}
                              {evidence.dataRealizacao && <span className="bg-gray-100 px-2 py-0.5 rounded">{new Date(evidence.dataRealizacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O que realizou</p>
                            <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{evidence.oQueRealizou}</p>
                          </div>
                          {evidence.comoAplicou && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Como aplicou na prática</p>
                              <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{evidence.comoAplicou}</p>
                            </div>
                          )}
                          {evidence.resultadoPratico && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultado prático</p>
                              <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{evidence.resultadoPratico}</p>
                            </div>
                          )}
                          {evidence.impactoPercentual != null && (
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Impacto declarado:</p>
                              <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{evidence.impactoPercentual}%</span>
                            </div>
                          )}
                          {evidence.principalAprendizado && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Principal aprendizado</p>
                              <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{evidence.principalAprendizado}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Descrição da Evidência:</p>
                          <div className="text-sm text-gray-600 mt-1 line-clamp-3">{evidence.descricao ? stripHtml(evidence.descricao) : "Sem descrição"}</div>
                        </div>
                      )}

                      {evidence.files && evidence.files.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{evidence.files.length} arquivo(s) anexado(s)</span>
                        </div>
                      )}

                      {getContestacaoTexto(evidence) && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm font-semibold text-amber-800">Contestação do Colaborador:</p>
                          <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap">
                            {getContestacaoTexto(evidence)}
                          </p>
                        </div>
                      )}

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
            </>
          )}

          {evidenceTab === 'aprovadas' && (
            <>
              {approvedEvLoading ? (
                <Card className="text-center py-8">
                  <p className="text-gray-600">Carregando evidências aprovadas...</p>
                </Card>
              ) : filteredApprovedEvidences.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-gray-600">Nenhuma evidência aprovada encontrada</p>
                </Card>
              ) : (
                filteredApprovedEvidences.map((evidence: any) => (
                  <Card key={evidence.id} className="border-green-200 bg-green-50/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{evidence.acao?.titulo || "Ação desconhecida"}</CardTitle>

                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenActionDetails(evidence.acao, evidence.actionId)}
                              disabled={!evidence.actionId}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver mais informações
                            </Button>
                          </div>

                          <CardDescription className="space-y-1 mt-3">
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
                              Enviada em: {evidence.createdAt ? new Date(evidence.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                              <CheckCircle className="h-3 w-3" />
                              Aprovada em: {evidence.evaluatedAt ? new Date(evidence.evaluatedAt).toLocaleDateString('pt-BR') + ' às ' + new Date(evidence.evaluatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </span>
                            {evidence.avaliador?.name && (
                              <span className="flex items-center gap-1 text-xs">
                                <User className="h-3 w-3" />
                                Avaliado por: {evidence.avaliador.name}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprovada
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Descrição da Evidência:</p>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-3">{evidence.descricao ? stripHtml(evidence.descricao) : "Sem descrição"}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}

          {evidenceTab === 'devolvidas' && (
            <>
              {rejectedEvLoading ? (
                <Card className="text-center py-8">
                  <p className="text-gray-600">Carregando evidências devolvidas...</p>
                </Card>
              ) : filteredRejectedEvidences.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-gray-600">Nenhuma evidência devolvida encontrada</p>
                </Card>
              ) : (
                filteredRejectedEvidences.map((evidence: any) => (
                  <Card key={evidence.id} className="border-red-200 bg-red-50/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{evidence.acao?.titulo || "Ação desconhecida"}</CardTitle>

                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenActionDetails(evidence.acao, evidence.actionId)}
                              disabled={!evidence.actionId}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver mais informações
                            </Button>
                          </div>

                          <CardDescription className="space-y-1 mt-3">
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
                              Enviada em: {evidence.createdAt ? new Date(evidence.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-red-700 font-semibold">
                              <XCircle className="h-3 w-3" />
                              Devolvida em: {evidence.evaluatedAt ? new Date(evidence.evaluatedAt).toLocaleDateString('pt-BR') + ' às ' + new Date(evidence.evaluatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </span>
                            {evidence.avaliador?.name && (
                              <span className="flex items-center gap-1 text-xs">
                                <User className="h-3 w-3" />
                                Avaliado por: {evidence.avaliador.name}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Devolvida
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Descrição da Evidência:</p>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-3">{evidence.descricao ? stripHtml(evidence.descricao) : "Sem descrição"}</div>
                      </div>
                      {evidence.justificativaRejeicao && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm font-semibold text-red-700">Motivo da Devolução:</p>
                          <div className="text-sm text-red-600 mt-1"><RichTextDisplay content={evidence.justificativaRejeicao} /></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
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
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Campos que o colaborador deseja alterar:</p>
                    {(() => {
                      try {
                        const dados = JSON.parse(adjustment.camposAjustar || '{}');

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
                                  } catch {
                                    return val;
                                  }
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

      <Dialog
        open={showActionDetailsDialog}
        onOpenChange={(open) => {
          setShowActionDetailsDialog(open);
          if (!open) {
            setSelectedActionDetails(null);
            setSelectedActionId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Detalhes da Ação
            </DialogTitle>
            <DialogDescription>
              Informações da ação base vinculada à evidência
            </DialogDescription>
          </DialogHeader>

          {loadingSelectedAction ? (
            <div className="py-6 text-sm text-gray-500">Carregando detalhes da ação...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Título</p>
                <div className="text-sm text-gray-700 bg-white border rounded-lg p-3">
                  {actionDetailsResolved?.titulo || 'Não informado'}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Descrição</p>
                <div className="text-sm text-gray-700 bg-white border rounded-lg p-3">
                  {actionDetailsResolved?.descricao ? (
                    <RichTextDisplay content={actionDetailsResolved.descricao} />
                  ) : (
                    <span className="text-gray-500">Não informada</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Prazo</p>
                  <div className="text-sm text-gray-700 bg-white border rounded-lg p-3">
                    {formatDateBR(actionDetailsResolved?.prazo)}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Macrocompetência</p>
                  <div className="text-sm text-gray-700 bg-white border rounded-lg p-3">
                    {getActionMacroLabel(actionDetailsResolved)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvidenceDialog} onOpenChange={(open) => {
        setShowEvidenceDialog(open);
        if (!open) {
          setEvidenciaComprova('');
          setImpactoComprova('');
          setImpactoValidadoAdmin(50);
          setParecerImpacto('');
          setRejectionReason('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-600" />
              Avaliar Evidência e Impacto
            </DialogTitle>
            <DialogDescription>
              {selectedEvidence?.acao?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm"><strong>Empregado:</strong> {selectedEvidence?.solicitante?.name || 'N/A'}</p>
              <p className="text-sm"><strong>Departamento:</strong> {selectedEvidence?.solicitante?.departamento || 'N/A'}</p>
              <p className="text-sm"><strong>Data envio:</strong> {selectedEvidence?.createdAt ? new Date(selectedEvidence.createdAt).toLocaleDateString('pt-BR') : 'N/A'}</p>
            </div>

            {(selectedEvidence?.tipoEvidencia || selectedEvidence?.dataRealizacao || selectedEvidence?.cargaHoraria) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                {selectedEvidence?.tipoEvidencia && <p className="text-sm"><strong>Tipo:</strong> {selectedEvidence.tipoEvidencia}</p>}
                {selectedEvidence?.dataRealizacao && <p className="text-sm"><strong>Data Realização:</strong> {new Date(selectedEvidence.dataRealizacao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                {selectedEvidence?.cargaHoraria && <p className="text-sm"><strong>Carga Horária:</strong> {selectedEvidence.cargaHoraria}h</p>}
              </div>
            )}

            {selectedEvidence?.oQueRealizou && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">O que realizou:</p>
                <div className="text-sm text-gray-600 bg-white border rounded-lg p-3 whitespace-pre-wrap">{selectedEvidence.oQueRealizou}</div>
              </div>
            )}

            {selectedEvidence?.comoAplicou && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Como aplicou na prática:</p>
                <div className="text-sm text-gray-600 bg-white border rounded-lg p-3 whitespace-pre-wrap">{selectedEvidence.comoAplicou}</div>
              </div>
            )}

            {selectedEvidence?.resultadoPratico && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Resultado prático:</p>
                <div className="text-sm text-gray-600 bg-white border rounded-lg p-3 whitespace-pre-wrap">{selectedEvidence.resultadoPratico}</div>
              </div>
            )}

            {selectedEvidence?.impactoPercentual != null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800">Impacto informado pelo empregado: <span className="text-lg">{selectedEvidence.impactoPercentual}%</span></p>
              </div>
            )}

            {selectedEvidence?.principalAprendizado && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Principal Aprendizado:</p>
                <div className="text-sm text-gray-600 bg-white border rounded-lg p-3 whitespace-pre-wrap">{selectedEvidence.principalAprendizado}</div>
              </div>
            )}

            {selectedEvidence?.descricao && !selectedEvidence?.oQueRealizou && (
              <div>
                <p className="text-sm font-semibold">Descrição:</p>
                <div className="text-sm text-gray-600 mt-1"><RichTextDisplay content={selectedEvidence.descricao} /></div>
              </div>
            )}

            {selectedEvidence?.linkExterno && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Link externo:</p>
                <a href={selectedEvidence.linkExterno} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5" /> {selectedEvidence.linkExterno}
                </a>
              </div>
            )}

            {getContestacaoTexto(selectedEvidence) && (
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Contestação do Colaborador:</p>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 whitespace-pre-wrap">
                  {getContestacaoTexto(selectedEvidence)}
                </div>
              </div>
            )}

            {selectedEvidence?.files && selectedEvidence.files.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Arquivos anexados:</p>
                <div className="space-y-1">
                  {selectedEvidence.files.map((file: any, idx: number) => (
                    <a key={idx} href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800 truncate flex-1">{file.fileName}</span>
                      <span className="text-xs text-blue-500">{file.fileSize ? (file.fileSize / 1024).toFixed(0) + ' KB' : ''}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t-2 border-blue-300 pt-4">
              <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-1.5">
                <Gauge className="h-4 w-4" /> Avaliação do Administrador
              </h4>

              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-800 block mb-2">A evidência comprova a realização da ação? *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setEvidenciaComprova('sim')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      evidenciaComprova === 'sim' ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${evidenciaComprova === 'sim' ? 'text-green-600' : 'text-gray-400'}`} />
                    Sim, comprova
                  </button>
                  <button
                    onClick={() => setEvidenciaComprova('nao')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      evidenciaComprova === 'nao' ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <XCircle className={`h-5 w-5 mx-auto mb-1 ${evidenciaComprova === 'nao' ? 'text-red-600' : 'text-gray-400'}`} />
                    Não comprova
                  </button>
                  <button
                    onClick={() => setEvidenciaComprova('insuficiente')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      evidenciaComprova === 'insuficiente' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${evidenciaComprova === 'insuficiente' ? 'text-amber-600' : 'text-gray-400'}`} />
                    Não foi possível avaliar
                  </button>
                </div>
              </div>

              {evidenciaComprova === 'nao' && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <label className="text-sm font-semibold text-red-800 block mb-2">Motivo da devolução *</label>
                  <RichTextEditor
                    value={rejectionReason}
                    onChange={setRejectionReason}
                    placeholder="Explique por que a evidência não comprova a realização da ação..."
                    minHeight="80px"
                  />
                </div>
              )}

              {evidenciaComprova === 'insuficiente' && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 mb-2">Não foi possível avaliar a aplicabilidade prática com base nos relatos apresentados. A evidência será devolvida para que o empregado complemente as informações.</p>
                  <label className="text-sm font-semibold text-amber-800 block mb-2">Orientação ao empregado *</label>
                  <RichTextEditor
                    value={rejectionReason}
                    onChange={setRejectionReason}
                    placeholder="Oriente o empregado sobre o que precisa ser detalhado ou complementado no relato..."
                    minHeight="80px"
                  />
                </div>
              )}

              {evidenciaComprova === 'sim' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">O relato comprova impacto prático real?</label>
                    <div className="flex gap-2">
                      {(['sim', 'parcialmente', 'nao'] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setImpactoComprova(opt)}
                          className={`flex-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                            impactoComprova === opt
                              ? opt === 'sim' ? 'border-green-500 bg-green-50 text-green-800'
                                : opt === 'parcialmente' ? 'border-amber-500 bg-amber-50 text-amber-800'
                                : 'border-red-500 bg-red-50 text-red-800'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          {opt === 'sim' ? 'Sim' : opt === 'parcialmente' ? 'Parcialmente' : 'Não'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">
                      Impacto validado pelo administrador: <span className="text-blue-600 text-lg">{impactoValidadoAdmin}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={impactoValidadoAdmin}
                      onChange={e => setImpactoValidadoAdmin(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Este valor será usado no cálculo do IIP (Índice de Impacto Prático).</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-800 block mb-2">Parecer sobre o impacto (opcional)</label>
                    <Textarea
                      value={parecerImpacto}
                      onChange={e => setParecerImpacto(e.target.value)}
                      placeholder="Observações sobre o impacto prático da evidência..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>Cancelar</Button>
            {evidenciaComprova && (
              <Button
                onClick={handleValidateImpact}
                disabled={validateImpactMutation.isPending}
                className={
                  evidenciaComprova === 'sim' ? 'bg-green-600 hover:bg-green-700'
                  : evidenciaComprova === 'insuficiente' ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
                }
              >
                {validateImpactMutation.isPending ? 'Processando...' : evidenciaComprova === 'sim' ? (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Aprovar e Validar Impacto</>
                ) : evidenciaComprova === 'insuficiente' ? (
                  <><AlertTriangle className="h-4 w-4 mr-2" /> Devolver para Complementar Relato</>
                ) : (
                  <><XCircle className="h-4 w-4 mr-2" /> Devolver ao Empregado</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

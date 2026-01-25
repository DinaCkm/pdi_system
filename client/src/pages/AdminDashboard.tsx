import React, { useState, useEffect } from 'react';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MessageSquare, Edit2, UserCheck } from "lucide-react";

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

  const { data: pendingEvidences = [], isLoading: evLoading, error: evError } = trpc.evidences.listPending.useQuery();
  const { data: pendingAdjustments = [], isLoading: adjLoading, error: adjError } = trpc.adjustmentRequests.listPending.useQuery();
  const { data: adjustmentsWithLeaderComments = [], isLoading: leaderLoading } = trpc.adjustmentRequests.listWithLeaderComments.useQuery();
  
  useEffect(() => {
    console.log('📊 AdminDashboard - Dados carregados:');
    console.log('  Evidências:', pendingEvidences?.length || 0);
    console.log('  Ajustes:', pendingAdjustments?.length || 0);
    console.log('  Com comentário do líder:', adjustmentsWithLeaderComments?.length || 0);
  }, [pendingEvidences, pendingAdjustments, adjustmentsWithLeaderComments]);

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

  const approveAdjustmentMutation = trpc.adjustmentRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Solicitação aprovada!");
      utils.adjustmentRequests.listPending.invalidate();
      utils.adjustmentRequests.listWithLeaderComments.invalidate();
      setShowAdjustmentDialog(false);
      setSelectedAdjustment(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao aprovar"),
  });

  const rejectAdjustmentMutation = trpc.adjustmentRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("❌ Solicitação rejeitada!");
      utils.adjustmentRequests.listPending.invalidate();
      utils.adjustmentRequests.listWithLeaderComments.invalidate();
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
    if (!selectedEvidence || !rejectionReason.trim()) {
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
    if (!selectedAdjustment || !adjustmentReason.trim()) {
      toast.error("Forneça um motivo para a rejeição");
      return;
    }
    rejectAdjustmentMutation.mutate({
      id: selectedAdjustment.id,
      justificativa: adjustmentReason,
    });
  };

  const handleOpenEditAction = () => {
    if (!selectedAdjustment?.acao) {
      toast.error("Ação não encontrada");
      return;
    }
    setEditingActionData({ ...selectedAdjustment.acao });
    setShowEditActionModal(true);
  };

  const handleSaveActionEdits = async () => {
    if (!editingActionData) return;
    
    try {
      setSelectedAdjustment({
        ...selectedAdjustment,
        acao: editingActionData
      });
      toast.success("✅ Ação atualizada com sucesso!");
      setShowEditActionModal(false);
    } catch (error: any) {
      toast.error("Erro ao salvar alterações");
    }
  };

  // Função para renderizar alterações De → Para
  const renderChanges = (adjustment: any) => {
    try {
      const novosValores = JSON.parse(adjustment.camposAjustar || '{}');
      let dadosAnteriores: any = {};
      try {
        dadosAnteriores = JSON.parse(adjustment.dadosAntesAjuste || '{}');
      } catch {
        dadosAnteriores = {};
      }

      const campos = [
        { key: 'titulo', label: 'Título' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'prazo', label: 'Prazo' },
        { key: 'competencia', label: 'Competência' },
      ];

      const alteracoes = campos.filter(campo => 
        novosValores[campo.key] !== undefined && 
        novosValores[campo.key] !== dadosAnteriores[campo.key]
      );

      if (alteracoes.length === 0) {
        return <p className="text-sm text-gray-500">Nenhuma alteração específica informada</p>;
      }

      return (
        <div className="space-y-2">
          {alteracoes.map(campo => (
            <div key={campo.key} className="bg-gray-50 p-2 rounded text-sm">
              <span className="font-semibold">{campo.label}:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-red-600 line-through">{dadosAnteriores[campo.key] || '(vazio)'}</span>
                <span>→</span>
                <span className="text-green-600 font-medium">{novosValores[campo.key]}</span>
              </div>
            </div>
          ))}
        </div>
      );
    } catch {
      return <p className="text-sm text-gray-500">Erro ao processar alterações</p>;
    }
  };

  // Função para renderizar comentários do líder
  const renderLeaderComments = (comentariosLider: any) => {
    if (!comentariosLider) return null;
    
    let comentarios: any[] = [];
    try {
      if (typeof comentariosLider === 'string') {
        comentarios = JSON.parse(comentariosLider);
      } else if (Array.isArray(comentariosLider)) {
        comentarios = comentariosLider;
      }
    } catch {
      return null;
    }

    if (!comentarios || comentarios.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-purple-800">Parecer do Líder</span>
        </div>
        {comentarios.map((comentario: any, index: number) => (
          <div key={index} className="bg-white p-3 rounded border border-purple-100 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-purple-700">{comentario.autorNome}</span>
              <span className="text-xs text-gray-500">
                {comentario.createdAt ? new Date(comentario.createdAt).toLocaleString('pt-BR') : ''}
              </span>
            </div>
            <p className="text-gray-700">{comentario.comentario}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-600">Dashboard do Admin</h1>
        <p className="text-gray-600 mt-2">Gerencie evidências e solicitações de ajuste</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              💬 Solicitações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{pendingAdjustments.length}</div>
            <p className="text-sm text-gray-600">aguardando avaliação</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
              <UserCheck className="h-5 w-5" />
              Com Parecer do Líder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{adjustmentsWithLeaderComments.length}</div>
            <p className="text-sm text-purple-700">prontas para decisão</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leaderComments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderComments" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
            Com Parecer do Líder ({adjustmentsWithLeaderComments.length})
          </TabsTrigger>
          <TabsTrigger value="evidences">
            Evidências ({pendingEvidences.length})
          </TabsTrigger>
          <TabsTrigger value="adjustments">
            Solicitações ({pendingAdjustments.length})
          </TabsTrigger>
        </TabsList>

        {/* Aba de Solicitações com Comentário do Líder */}
        <TabsContent value="leaderComments" className="space-y-4">
          {adjustmentsWithLeaderComments.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-600">Nenhuma solicitação com parecer do líder</p>
              <p className="text-sm text-gray-500 mt-2">Quando um líder comentar em uma solicitação de ajuste, ela aparecerá aqui.</p>
            </Card>
          ) : (
            adjustmentsWithLeaderComments.map((adjustment: any) => (
              <Card key={adjustment.id} className="border-purple-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                          ID #{adjustment.id.toString().padStart(5, '0')}
                        </span>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Líder comentou
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{adjustment.acaoTitulo || "Ação desconhecida"}</CardTitle>
                      <CardDescription>
                        Solicitada por: {adjustment.solicitanteNome || "Desconhecido"}
                        {adjustment.departamentoNome && ` • ${adjustment.departamentoNome}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Justificativa do colaborador */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Justificativa do Colaborador:</p>
                    <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">{adjustment.justificativa}</p>
                  </div>

                  {/* Alterações solicitadas */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Alterações Solicitadas:</p>
                    {renderChanges(adjustment)}
                  </div>

                  {/* Comentários do Líder - DESTAQUE */}
                  {renderLeaderComments(adjustment.comentariosLider)}

                  {/* Botões de ação */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => {
                        setSelectedAdjustment({
                          ...adjustment,
                          acao: {
                            titulo: adjustment.acaoTitulo,
                            descricao: adjustment.acaoDescricao,
                            prazo: adjustment.acaoPrazo,
                          }
                        });
                        setShowAdjustmentDialog(true);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      Avaliar Solicitação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Aba de Evidências */}
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
                      <CardDescription>
                        Enviada por: {evidence.solicitante?.name || "Desconhecido"}
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
                    <p className="text-sm text-gray-600 mt-1">{evidence.descricao}</p>
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

        {/* Aba de Solicitações */}
        <TabsContent value="adjustments" className="space-y-4">
          {pendingAdjustments.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-600">Nenhuma solicitação pendente</p>
            </Card>
          ) : (
            pendingAdjustments.map((adjustment: any) => (
              <Card key={adjustment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                          ID #{adjustment.id.toString().padStart(5, '0')}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{adjustment.acao?.titulo || "Ação desconhecida"}</CardTitle>
                      <CardDescription>
                        Solicitada por: {adjustment.solicitante?.name || "Desconhecido"}
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
                    <p className="text-sm font-semibold text-gray-700">Justificativa:</p>
                    <p className="text-sm text-gray-600 mt-1">{adjustment.justificativa}</p>
                  </div>
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
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Avaliação de Evidência */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Avaliar Evidência</DialogTitle>
            <DialogDescription>
              Analise a evidência e decida se aprova ou rejeita
            </DialogDescription>
          </DialogHeader>

          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">Ação:</p>
                <p className="text-sm text-gray-600">{selectedEvidence.acao?.titulo}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Colaborador:</p>
                <p className="text-sm text-gray-600">{selectedEvidence.solicitante?.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Descrição da Evidência:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedEvidence.descricao}</p>
              </div>

              <div>
                <label className="text-sm font-semibold">Motivo da Rejeição (se aplicável):</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEvidenceDialog(false);
                setSelectedEvidence(null);
                setRejectionReason("");
              }}
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

      {/* Dialog de Avaliação de Solicitação de Ajuste */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliar Solicitação de Ajuste</DialogTitle>
            <DialogDescription>
              Analise a solicitação e o parecer do líder para tomar sua decisão
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">Ação:</p>
                  <p className="text-sm text-gray-600">{selectedAdjustment.acao?.titulo || selectedAdjustment.acaoTitulo}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Solicitante:</p>
                  <p className="text-sm text-gray-600">{selectedAdjustment.solicitante?.name || selectedAdjustment.solicitanteNome}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Justificativa do Colaborador:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedAdjustment.justificativa}</p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Alterações Solicitadas:</p>
                {renderChanges(selectedAdjustment)}
              </div>

              {/* Parecer do Líder no Dialog */}
              {selectedAdjustment.comentariosLider && renderLeaderComments(selectedAdjustment.comentariosLider)}

              <div className="border-t pt-4">
                <label className="text-sm font-semibold">Motivo da Rejeição (se aplicável):</label>
                <Textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdjustmentDialog(false);
                setSelectedAdjustment(null);
                setAdjustmentReason("");
              }}
            >
              Cancelar
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Editar Ação
            </DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias na ação
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
                <Textarea
                  value={editingActionData.descricao || ""}
                  onChange={(e) =>
                    setEditingActionData({
                      ...editingActionData,
                      descricao: e.target.value,
                    })
                  }
                  className="mt-1"
                  rows={4}
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
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

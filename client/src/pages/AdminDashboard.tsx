import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MessageSquare, Edit2 } from "lucide-react";

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

  const { data: pendingEvidences = [] } = trpc.evidences.listPending.useQuery();
  const { data: pendingAdjustments = [] } = trpc.adjustmentRequests.listPending.useQuery();

  const utils = trpc.useUtils();

  const approveEvidenceMutation = trpc.evidences.approve.useMutation({
    onSuccess: () => {
      toast.success("✅ Evidência aprovada!");
      utils.evidences.listPending.invalidate();
      setShowEvidenceDialog(false);
      setSelectedEvidence(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao aprovar"),
  });

  const rejectEvidenceMutation = trpc.evidences.reject.useMutation({
    onSuccess: () => {
      toast.success("❌ Evidência rejeitada!");
      utils.evidences.listPending.invalidate();
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-600">Dashboard do Admin</h1>
        <p className="text-gray-600 mt-2">Gerencie evidências e solicitações de ajuste</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <Tabs defaultValue="evidences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="evidences">
            Evidências ({pendingEvidences.length})
          </TabsTrigger>
          <TabsTrigger value="adjustments">
            Solicitações ({pendingAdjustments.length})
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
                    <p className="text-sm font-semibold text-gray-700">Campos a Alterar:</p>
                    <p className="text-sm text-gray-600 mt-1">{adjustment.camposAjustar}</p>
                  </div>
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
              <p className="text-sm text-gray-600 mt-1">{selectedEvidence?.descricao}</p>
            </div>

            <div>
              <label className="text-sm font-semibold">Motivo da Rejeição (se aplicável):</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique por que está rejeitando..."
                className="mt-2"
              />
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
              <p className="text-sm text-gray-600 mt-1">{selectedAdjustment?.camposAjustar}</p>
            </div>

            <div>
              <p className="text-sm font-semibold">Justificativa:</p>
              <p className="text-sm text-gray-600 mt-1">{selectedAdjustment?.justificativa}</p>
            </div>

            <div>
              <label className="text-sm font-semibold">Motivo da Rejeição (se aplicável):</label>
              <Textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Explique por que está rejeitando..."
                className="mt-2"
              />
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
                <Textarea
                  value={editingActionData.descricao || ""}
                  onChange={(e) =>
                    setEditingActionData({
                      ...editingActionData,
                      descricao: e.target.value,
                    })
                  }
                  className="mt-1"
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
                <label className="text-sm font-semibold">Macro Competência:</label>
                <input
                  type="text"
                  value={editingActionData.macroCompetencia || ""}
                  onChange={(e) =>
                    setEditingActionData({
                      ...editingActionData,
                      macroCompetencia: e.target.value,
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

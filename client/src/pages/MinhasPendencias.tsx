import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function MinhasPendencias() {
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: solicitacoes, refetch, isLoading } = trpc.actions.getPendingAdjustments.useQuery();
  const { data: historico, isLoading: loadingHistorico } = trpc.actions.getHistorico.useQuery(
    { actionId: selectedSolicitacao?.actionId || 0 },
    { enabled: !!selectedSolicitacao }
  );

  const aprovarMutation = trpc.actions.aprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso!");
      setShowApproveDialog(false);
      setSelectedSolicitacao(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar solicitação: ${error.message}`);
    },
  });

  const reprovarMutation = trpc.actions.reprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação reprovada!");
      setShowRejectDialog(false);
      setSelectedSolicitacao(null);
      setRejectReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao reprovar solicitação: ${error.message}`);
    },
  });

  const handleViewDetails = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao);
    setShowDetailsDialog(true);
  };

  const handleApprove = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao);
    setShowApproveDialog(true);
  };

  const handleReject = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (selectedSolicitacao) {
      aprovarMutation.mutate({ solicitacaoId: selectedSolicitacao.id });
    }
  };

  const confirmReject = () => {
    if (selectedSolicitacao && rejectReason.trim()) {
      reprovarMutation.mutate({
        solicitacaoId: selectedSolicitacao.id,
        justificativa: rejectReason,
      });
    } else {
      toast.error("Por favor, informe o motivo da reprovação");
    }
  };

  const renderCampoComparacao = (label: string, original: any, proposto: any) => {
    const isDifferent = original !== proposto;
    return (
      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{label} (Original)</p>
          <p className={`text-sm ${isDifferent ? 'line-through text-muted-foreground' : ''}`}>
            {original || "—"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{label} (Proposto)</p>
          <p className={`text-sm font-semibold ${isDifferent ? 'text-orange-600' : ''}`}>
            {proposto || "—"}
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Solicitações de Ajuste</h1>
        <p className="text-muted-foreground">
          Avalie e aprove/reprove solicitações de ajuste de ações dos colaboradores
        </p>
      </div>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma solicitação pendente</h3>
            <p className="text-muted-foreground text-center">
              Todas as solicitações de ajuste foram avaliadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {solicitacoes.map((solicitacao: any) => {
            const camposAjustar = JSON.parse(solicitacao.camposAjustar);
            return (
              <Card key={solicitacao.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Solicitação de Ajuste #{solicitacao.id}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <span className="font-medium">Ação:</span> {solicitacao.actionNome || "Ação desconhecida"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Solicitante</p>
                      <p className="font-medium">{solicitacao.solicitanteName || "Desconhecido"}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Justificativa</p>
                      <p className="text-sm bg-muted p-3 rounded-md">{solicitacao.justificativa}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Campos a ajustar</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(camposAjustar).map((campo) => (
                          <Badge key={campo} variant="secondary">
                            {campo}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(solicitacao)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(solicitacao)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(solicitacao)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reprovar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Comparação entre valores originais e propostos
            </DialogDescription>
          </DialogHeader>

          {selectedSolicitacao && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Informações da Solicitação</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{selectedSolicitacao.solicitanteName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">{selectedSolicitacao.tipoSolicitante}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Justificativa</p>
                    <p className="font-medium">{selectedSolicitacao.justificativa}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Comparação de Campos</h3>
                <div className="space-y-4">
                  {(() => {
                    const camposAjustar = JSON.parse(selectedSolicitacao.camposAjustar);
                    const camposOriginais = JSON.parse(selectedSolicitacao.camposOriginais || '{}');
                    
                    return Object.keys(camposAjustar).map((campo) => {
                      let label = campo;
                      if (campo === 'nome') label = 'Nome da Ação';
                      if (campo === 'descricao') label = 'Descrição';
                      if (campo === 'prazo') label = 'Prazo';
                      
                      return renderCampoComparacao(
                        label,
                        camposOriginais[campo],
                        camposAjustar[campo]
                      );
                    });
                  })()}
                </div>
              </div>

              {historico && historico.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Histórico de Alterações</h3>
                  <div className="space-y-2">
                    {historico.map((item: any) => (
                      <div key={item.id} className="border-l-2 border-muted pl-4 py-2">
                        <p className="text-sm font-medium">{item.campo}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.valorAnterior} → {item.valorNovo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.motivoAlteracao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Aprovação */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar esta solicitação de ajuste? As alterações serão aplicadas à ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              disabled={aprovarMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {aprovarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                "Aprovar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Reprovação */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da reprovação. O colaborador será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motivo">Motivo da Reprovação *</Label>
            <Textarea
              id="motivo"
              placeholder="Explique por que a solicitação foi reprovada..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={reprovarMutation.isPending || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {reprovarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reprovando...
                </>
              ) : (
                "Reprovar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

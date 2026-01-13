import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, FileText, Download, CheckCircle, XCircle, Eye, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DialogType = 'none' | 'view' | 'aprovar' | 'reprovar';

export default function EvidenciasPendentes() {
  const [activeDialog, setActiveDialog] = useState<DialogType>('none');
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [justificativa, setJustificativa] = useState("");

  const { data: evidences, refetch, isLoading } = trpc.evidences.getPending.useQuery();

  const aprovarMutation = trpc.evidences.aprovar.useMutation({
    onSuccess: () => {
      toast.success("Evidência aprovada com sucesso!");
      closeAllDialogs();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar evidência: ${error.message}`);
    },
  });

  const reprovarMutation = trpc.evidences.reprovar.useMutation({
    onSuccess: () => {
      toast.success("Evidência reprovada. O colaborador foi notificado.");
      closeAllDialogs();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao reprovar evidência: ${error.message}`);
    },
  });

  const closeAllDialogs = () => {
    setActiveDialog('none');
    setSelectedEvidence(null);
    setJustificativa("");
  };

  const openDialog = (type: DialogType, evidence: any) => {
    setSelectedEvidence(evidence);
    setActiveDialog(type);
  };

  const handleAprovar = () => {
    if (!selectedEvidence) return;
    aprovarMutation.mutate({ evidenceId: selectedEvidence.id });
  };

  const handleReprovar = () => {
    if (!selectedEvidence) return;
    if (!justificativa.trim() || justificativa.trim().length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres");
      return;
    }
    reprovarMutation.mutate({
      evidenceId: selectedEvidence.id,
      justificativa: justificativa.trim(),
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Evidências Pendentes</h1>
        <p className="text-muted-foreground">
          Avalie as evidências enviadas pelos colaboradores
        </p>
      </div>

      {!evidences || evidences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma evidência pendente
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Todas as evidências foram avaliadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {evidences.map((evidence: any) => (
            <Card key={`evidence-${evidence.id}`} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {evidence.actionNome}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        {evidence.colaboradorNome}
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Pendente</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Enviado em {formatDate(evidence.createdAt)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Arquivos:</span>
                      <span className="font-medium">{evidence.files?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Textos:</span>
                      <span className="font-medium">{evidence.texts?.length || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openDialog('view', evidence)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => openDialog('aprovar', evidence)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => openDialog('reprovar', evidence)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reprovar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Visualização */}
      {activeDialog === 'view' && selectedEvidence && (
        <Dialog open={true} onOpenChange={closeAllDialogs}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Evidência</DialogTitle>
              <DialogDescription>
                Ação: <strong>{selectedEvidence.actionNome}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Informações do Colaborador */}
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <p className="font-medium">{selectedEvidence.colaboradorNome}</p>
                  <p className="text-sm text-muted-foreground">{selectedEvidence.colaboradorEmail}</p>
                </div>
              </div>

              {/* Data de Envio */}
              <div className="space-y-2">
                <Label>Data de Envio</Label>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <p>{formatDate(selectedEvidence.createdAt)}</p>
                </div>
              </div>

              {/* Textos */}
              {selectedEvidence.texts && selectedEvidence.texts.length > 0 && (
                <div className="space-y-2">
                  <Label>Descrição da Evidência</Label>
                  {selectedEvidence.texts.map((text: any, index: number) => (
                    <div key={`text-${index}`} className="p-4 border rounded-lg bg-muted/50">
                      {text.titulo && (
                        <p className="font-medium mb-2">{text.titulo}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{text.texto}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Arquivos */}
              {selectedEvidence.files && selectedEvidence.files.length > 0 && (
                <div className="space-y-2">
                  <Label>Arquivos Anexados ({selectedEvidence.files.length})</Label>
                  <div className="space-y-2">
                    {selectedEvidence.files.map((file: any, index: number) => (
                      <div key={`file-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeAllDialogs}>
                Fechar
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setActiveDialog('aprovar')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setActiveDialog('reprovar')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Aprovação */}
      {activeDialog === 'aprovar' && selectedEvidence && (
        <Dialog open={true} onOpenChange={closeAllDialogs}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar Evidência</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja aprovar esta evidência? O colaborador será notificado e a ação terá seu status atualizado.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeAllDialogs}
                disabled={aprovarMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAprovar}
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
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Reprovação */}
      {activeDialog === 'reprovar' && selectedEvidence && (
        <Dialog open={true} onOpenChange={closeAllDialogs}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reprovar Evidência</DialogTitle>
              <DialogDescription>
                Informe o motivo da reprovação. O colaborador será notificado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Textarea
                  id="justificativa"
                  placeholder="Explique por que a evidência foi reprovada..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={6}
                  disabled={reprovarMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 10 caracteres
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeAllDialogs}
                disabled={reprovarMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReprovar}
                disabled={reprovarMutation.isPending || justificativa.trim().length < 10}
              >
                {reprovarMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reprovando...
                  </>
                ) : (
                  "Reprovar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

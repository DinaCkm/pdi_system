import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, FileText, Download, CheckCircle, XCircle, Eye, Calendar, User, Building2, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RichTextDisplay from '@/components/RichTextDisplay';

type DialogType = 'none' | 'view' | 'aprovar' | 'reprovar';

export default function EvidenciasEquipe() {
  const [activeDialog, setActiveDialog] = useState<DialogType>('none');
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [justificativa, setJustificativa] = useState("");

  const { data: evidences, refetch, isLoading } = trpc.evidences.getPendingByTeam.useQuery();

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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent mb-2">
          Evidências da Equipe
        </h1>
        <p className="text-muted-foreground">
          Avalie as evidências enviadas pelos colaboradores da sua equipe
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
              Todas as evidências da sua equipe foram avaliadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {evidences.map((evidence: any) => (
            <Card key={`evidence-${evidence.id}`} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {evidence.actionNome || evidence.acao?.titulo || 'Ação não identificada'}
                    </CardTitle>
                    <CardDescription className="mt-1 space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        <span className="font-medium">{evidence.colaboradorNome || evidence.solicitante?.name || 'Colaborador'}</span>
                      </div>
                      {evidence.departamentoNome && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {evidence.departamentoNome}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Aguardando
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Enviado em: {evidence.createdAt ? new Date(evidence.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                  </div>

                  {evidence.pdiTitulo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      PDI: {evidence.pdiTitulo}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground italic">
                      {evidence.files && evidence.files.length > 0 
                        ? `${evidence.files.length} arquivo(s) anexado(s)`
                        : 'Verifique os detalhes da evidência'}
                    </p>
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
                Ação: <strong>{selectedEvidence.actionNome || selectedEvidence.acao?.titulo}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Informações do Colaborador */}
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <div className="p-3 border rounded-lg bg-muted/50">
                  <p className="font-medium">{selectedEvidence.colaboradorNome || selectedEvidence.solicitante?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEvidence.colaboradorEmail || selectedEvidence.solicitante?.email}</p>
                  {selectedEvidence.departamentoNome && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <Building2 className="h-3 w-3 inline mr-1" />
                      {selectedEvidence.departamentoNome}
                    </p>
                  )}
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
                      <div className="text-sm"><RichTextDisplay content={text.texto} /></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Descrição simples */}
              {selectedEvidence.descricao && (
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="text-sm"><RichTextDisplay content={selectedEvidence.descricao} /></div>
                  </div>
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
                              {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : ''}
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
                Tem certeza que deseja aprovar esta evidência? O colaborador será notificado e a ação terá seu status atualizado para "Concluída".
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Ação:</strong> {selectedEvidence.actionNome || selectedEvidence.acao?.titulo}
                </p>
                <p className="text-sm text-green-800 mt-1">
                  <strong>Colaborador:</strong> {selectedEvidence.colaboradorNome || selectedEvidence.solicitante?.name}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeAllDialogs}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleAprovar}
                disabled={aprovarMutation.isPending}
              >
                {aprovarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirmar Aprovação
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
                Informe o motivo da reprovação. O colaborador receberá esta justificativa e poderá enviar uma nova evidência.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Ação:</strong> {selectedEvidence.actionNome || selectedEvidence.acao?.titulo}
                </p>
                <p className="text-sm text-red-800 mt-1">
                  <strong>Colaborador:</strong> {selectedEvidence.colaboradorNome || selectedEvidence.solicitante?.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="justificativa">Justificativa da Reprovação *</Label>
                <Textarea
                  id="justificativa"
                  placeholder="Descreva o motivo da reprovação e o que precisa ser corrigido..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 10 caracteres
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeAllDialogs}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReprovar}
                disabled={reprovarMutation.isPending || justificativa.trim().length < 10}
              >
                {reprovarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Confirmar Reprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

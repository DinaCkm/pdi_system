import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, MessageSquare, Clock, User, FileText } from "lucide-react";
import { toast } from "sonner";

export default function SolicitacoesAjuste() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [selectedSolicitacaoData, setSelectedSolicitacaoData] = useState<any>(null);
  const [showAprovarDialog, setShowAprovarDialog] = useState(false);
  const [showReprovarDialog, setShowReprovarDialog] = useState(false);
  const [justificativaReprovacao, setJustificativaReprovacao] = useState("");
  const [comentario, setComentario] = useState("");
  
  // Estados para edição no modal de aprovação
  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editPrazo, setEditPrazo] = useState("");

  const { data: solicitacoes, isLoading, refetch } = trpc.actions.getPendingAdjustmentsWithDetails.useQuery();
  const { data: comentarios, refetch: refetchComentarios } = trpc.actions.getComments.useQuery(
    { adjustmentRequestId: selectedSolicitacao! },
    { enabled: selectedSolicitacao !== null }
  );

  const aprovarMutation = trpc.actions.aprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso!");
      setShowAprovarDialog(false);
      setSelectedSolicitacao(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reprovarMutation = trpc.actions.reprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação reprovada com sucesso!");
      setShowReprovarDialog(false);
      setSelectedSolicitacao(null);
      setJustificativaReprovacao("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addCommentMutation = trpc.actions.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado!");
      setComentario("");
      refetchComentarios();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAprovar = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao.id);
    setSelectedSolicitacaoData(solicitacao);
    
    // Preencher campos com valores originais da ação
    setEditNome(solicitacao.actionNome || "");
    setEditDescricao(solicitacao.actionDescricao || "");
    setEditPrazo(solicitacao.actionPrazo || "");
    
    setShowAprovarDialog(true);
  };

  const handleReprovar = (solicitacaoId: number) => {
    setSelectedSolicitacao(solicitacaoId);
    setShowReprovarDialog(true);
  };

  const confirmarAprovacao = () => {
    if (selectedSolicitacao) {
      // Enviar com os campos editados
      aprovarMutation.mutate({
        solicitacaoId: selectedSolicitacao,
        novoNome: editNome || undefined,
        novaDescricao: editDescricao || undefined,
        novoPrazo: editPrazo || undefined,
      } as any);
    }
  };

  const confirmarReprovacao = () => {
    if (!justificativaReprovacao.trim()) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    if (justificativaReprovacao.length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres");
      return;
    }

    if (selectedSolicitacao) {
      reprovarMutation.mutate({
        solicitacaoId: selectedSolicitacao,
        justificativa: justificativaReprovacao,
      });
    }
  };

  const handleAddComment = (solicitacaoId: number) => {
    if (!comentario.trim()) {
      toast.error("Comentário não pode estar vazio");
      return;
    }

    addCommentMutation.mutate({
      adjustmentRequestId: solicitacaoId,
      comentario,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Histórico de Solicitações</h1>
        <p className="text-muted-foreground">
          Visualize todas as solicitações de ajuste de ações (pendentes, aprovadas e reprovadas)
        </p>
      </div>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <Alert>
          <AlertDescription>
            Não há solicitações de ajuste pendentes no momento.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {solicitacoes.map((solicitacao) => {
            const camposAjustar = JSON.parse(solicitacao.camposAjustar);

            return (
              <Card key={solicitacao.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {solicitacao.actionNome}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {solicitacao.solicitanteNome}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(solicitacao.createdAt).toLocaleString()}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Pendente</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Justificativa */}
                  <div>
                    <h4 className="font-medium mb-2">Justificativa do Colaborador</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {solicitacao.justificativa}
                    </p>
                  </div>

                  {/* Campos a Ajustar */}
                  <div>
                    <h4 className="font-medium mb-2">Campos Solicitados para Ajuste</h4>
                    <div className="space-y-2">
                      {camposAjustar.nome && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-blue-900">Novo Nome:</p>
                          <p className="text-sm text-blue-700">{camposAjustar.nome}</p>
                        </div>
                      )}
                      {camposAjustar.descricao && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-blue-900">Nova Descrição:</p>
                          <p className="text-sm text-blue-700">{camposAjustar.descricao}</p>
                        </div>
                      )}
                      {camposAjustar.prazo && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-sm font-medium text-blue-900">Novo Prazo:</p>
                          <p className="text-sm text-blue-700">
                            {new Date(camposAjustar.prazo).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comentários */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comentários
                    </h4>
                    
                    {selectedSolicitacao === solicitacao.id && comentarios && comentarios.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {comentarios.map((comment) => (
                          <div key={comment.id} className="bg-muted p-3 rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">
                                {comment.autorNome}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {comment.autorRole}
                                </Badge>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">{comment.comentario}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Adicionar comentário..."
                        value={selectedSolicitacao === solicitacao.id ? comentario : ""}
                        onChange={(e) => {
                          setSelectedSolicitacao(solicitacao.id);
                          setComentario(e.target.value);
                        }}
                        rows={2}
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleAddComment(solicitacao.id)}
                        disabled={!comentario.trim() || addCommentMutation.isPending}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleAprovar(solicitacao)}
                      className="flex-1"
                      disabled={aprovarMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aprovar Ajuste
                    </Button>
                    <Button
                      onClick={() => handleReprovar(solicitacao.id)}
                      variant="destructive"
                      className="flex-1"
                      disabled={reprovarMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Aprovação com Edição */}
      <Dialog open={showAprovarDialog} onOpenChange={setShowAprovarDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle>Confirmar Aprovação</DialogTitle>
              <DialogDescription>
                Revise e edite os campos conforme necessário antes de aprovar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 px-6">
              {/* Campos Editáveis */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-nome">Nome da Ação</Label>
                  <Input
                    id="edit-nome"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Nome da ação"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea
                    id="edit-descricao"
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    placeholder="Descrição da ação"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-prazo">Prazo</Label>
                  <Input
                    id="edit-prazo"
                    type="date"
                    value={editPrazo}
                    onChange={(e) => setEditPrazo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 px-6 pb-4">
            <Button variant="outline" onClick={() => setShowAprovarDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovacao} disabled={aprovarMutation.isPending}>
              {aprovarMutation.isPending ? "Aprovando..." : "Aprovar e Notificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reprovação */}
      <Dialog open={showReprovarDialog} onOpenChange={setShowReprovarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Solicitação</DialogTitle>
            <DialogDescription>
              Explique o motivo da reprovação. Esta justificativa será enviada ao colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="justificativa">Justificativa da Reprovação *</Label>
            <Textarea
              id="justificativa"
              placeholder="Explique por que esta solicitação está sendo reprovada (mínimo 10 caracteres)..."
              value={justificativaReprovacao}
              onChange={(e) => setJustificativaReprovacao(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {justificativaReprovacao.length}/10 caracteres mínimos
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReprovarDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarReprovacao}
              disabled={reprovarMutation.isPending}
            >
              {reprovarMutation.isPending ? "Reprovando..." : "Confirmar Reprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

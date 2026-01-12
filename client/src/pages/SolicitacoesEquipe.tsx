import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Clock, User, FileText, Info } from "lucide-react";
import { toast } from "sonner";

export default function SolicitacoesEquipe() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const { data: solicitacoes, isLoading, refetch } = trpc.actions.getPendingAdjustmentsByLeader.useQuery();
  const { data: comentarios, refetch: refetchComentarios } = trpc.actions.getComments.useQuery(
    { adjustmentRequestId: selectedSolicitacao! },
    { enabled: selectedSolicitacao !== null }
  );

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
        <h1 className="text-3xl font-bold mb-2">Solicitações de Ajuste da Equipe</h1>
        <p className="text-muted-foreground">
          Acompanhe as solicitações de ajuste dos seus liderados
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> Como líder, você pode visualizar e comentar nas solicitações, mas apenas o Admin pode aprovar ou reprovar ajustes.
        </AlertDescription>
      </Alert>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <Alert>
          <AlertDescription>
            Não há solicitações de ajuste pendentes da sua equipe no momento.
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
                    <Badge variant="secondary">Aguardando Admin</Badge>
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
                        placeholder="Adicionar comentário ou feedback..."
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

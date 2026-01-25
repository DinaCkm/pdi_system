import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Clock, User, FileText, Info, ArrowRight, Target, Calendar, FileEdit } from "lucide-react";
import { toast } from "sonner";

// Função para obter o badge de status
function getStatusBadge(status: string) {
  switch (status) {
    case "pendente":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando Admin</Badge>;
    case "aguardando_lider":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Aguardando Líder</Badge>;
    case "aprovada":
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovada</Badge>;
    case "reprovada":
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Reprovada</Badge>;
    case "mais_informacoes":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Mais Informações</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function SolicitacoesEquipe() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const { data: solicitacoes, isLoading, refetch } = trpc.adjustmentRequests.listByTeam.useQuery();
  const { data: comentarios, refetch: refetchComentarios } = trpc.adjustmentRequests.getComments.useQuery(
    { adjustmentRequestId: selectedSolicitacao! },
    { enabled: selectedSolicitacao !== null }
  );

  const addCommentMutation = trpc.adjustmentRequests.addComment.useMutation({
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
            Não há solicitações de ajuste da sua equipe no momento.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {solicitacoes.map((solicitacao) => {
            let camposAjustar: any = {};
            let dadosAntesAjuste: any = {};
            
            try {
              camposAjustar = JSON.parse(solicitacao.camposAjustar || "{}");
            } catch (e) {
              camposAjustar = {};
            }
            
            try {
              dadosAntesAjuste = JSON.parse(solicitacao.dadosAntesAjuste || "{}");
            } catch (e) {
              dadosAntesAjuste = {};
            }

            return (
              <Card key={solicitacao.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {solicitacao.actionTitulo || "Ação sem título"}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {solicitacao.solicitanteNome || "Colaborador"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(solicitacao.createdAt).toLocaleString("pt-BR")}
                        </span>
                        {solicitacao.departamentoNome && (
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {solicitacao.departamentoNome}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {getStatusBadge(solicitacao.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Informações da Ação */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileEdit className="h-4 w-4" />
                      Informações da Ação
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">PDI:</span>
                        <p className="font-medium">{solicitacao.pdiTitulo || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Competência:</span>
                        <p className="font-medium">{solicitacao.macroNome || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prazo Atual:</span>
                        <p className="font-medium">
                          {solicitacao.actionPrazo 
                            ? new Date(solicitacao.actionPrazo).toLocaleDateString("pt-BR")
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tipo de Solicitante:</span>
                        <p className="font-medium capitalize">{solicitacao.tipoSolicitante || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Justificativa */}
                  <div>
                    <h4 className="font-medium mb-2">Justificativa do Colaborador</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {solicitacao.justificativa || "Sem justificativa"}
                    </p>
                  </div>

                  {/* Campos a Ajustar - Mostrando DE/PARA */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Alterações Solicitadas (De → Para)
                    </h4>
                    <div className="space-y-3">
                      {/* Título/Nome */}
                      {camposAjustar.titulo && (
                        <div className="border rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Título da Ação:</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-red-50 p-2 rounded text-sm">
                              <span className="text-red-600 font-medium">De: </span>
                              {dadosAntesAjuste.titulo || solicitacao.actionTitulo || "N/A"}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="flex-1 bg-green-50 p-2 rounded text-sm">
                              <span className="text-green-600 font-medium">Para: </span>
                              {camposAjustar.titulo}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Descrição */}
                      {camposAjustar.descricao && (
                        <div className="border rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Descrição:</p>
                          <div className="flex flex-col gap-2">
                            <div className="bg-red-50 p-2 rounded text-sm">
                              <span className="text-red-600 font-medium">De: </span>
                              {dadosAntesAjuste.descricao || solicitacao.actionDescricao || "N/A"}
                            </div>
                            <div className="flex justify-center">
                              <ArrowRight className="h-4 w-4 text-gray-400 rotate-90" />
                            </div>
                            <div className="bg-green-50 p-2 rounded text-sm">
                              <span className="text-green-600 font-medium">Para: </span>
                              {camposAjustar.descricao}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Prazo */}
                      {camposAjustar.prazo && (
                        <div className="border rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Prazo:
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-red-50 p-2 rounded text-sm">
                              <span className="text-red-600 font-medium">De: </span>
                              {dadosAntesAjuste.prazo 
                                ? new Date(dadosAntesAjuste.prazo).toLocaleDateString("pt-BR")
                                : solicitacao.actionPrazo 
                                  ? new Date(solicitacao.actionPrazo).toLocaleDateString("pt-BR")
                                  : "N/A"}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="flex-1 bg-green-50 p-2 rounded text-sm">
                              <span className="text-green-600 font-medium">Para: </span>
                              {new Date(camposAjustar.prazo).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Competência */}
                      {camposAjustar.competencia && (
                        <div className="border rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Competência:</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-red-50 p-2 rounded text-sm">
                              <span className="text-red-600 font-medium">De: </span>
                              {dadosAntesAjuste.competencia || solicitacao.macroNome || "N/A"}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="flex-1 bg-green-50 p-2 rounded text-sm">
                              <span className="text-green-600 font-medium">Para: </span>
                              {camposAjustar.competencia}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Se não houver campos específicos, mostrar mensagem */}
                      {!camposAjustar.titulo && !camposAjustar.descricao && !camposAjustar.prazo && !camposAjustar.competencia && (
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          Detalhes das alterações não especificados
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resposta do Admin (se houver) */}
                  {solicitacao.justificativaAdmin && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 text-orange-800">Resposta do Administrador:</h4>
                      <p className="text-sm text-orange-700">{solicitacao.justificativaAdmin}</p>
                    </div>
                  )}

                  {/* Comentários */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comentários
                    </h4>
                    
                    {selectedSolicitacao === solicitacao.id && comentarios && comentarios.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {comentarios.map((comment: any) => (
                          <div key={comment.id} className="bg-muted p-3 rounded-md">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">
                                {comment.autorNome || "Usuário"}
                                {comment.autorRole && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {comment.autorRole}
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString("pt-BR")}
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
                        onClick={() => setSelectedSolicitacao(solicitacao.id)}
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

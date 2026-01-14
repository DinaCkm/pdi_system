import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, MessageSquare, Clock, User, FileText, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Função para formatar data
function formatarData(data: any): string {
  if (!data) return "N/A";
  if (typeof data === 'string') {
    return data.split('T')[0];
  }
  return "N/A";
}

// Função para detectar se houve alteração
function temAlteracao(original: any, novo: any): boolean {
  return original !== novo;
}

export default function SolicitacoesAjuste() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [selectedSolicitacaoData, setSelectedSolicitacaoData] = useState<any>(null);
  const [showAprovarDialog, setShowAprovarDialog] = useState(false);
  const [showReprovarDialog, setShowReprovarDialog] = useState(false);
  const [justificativaReprovacao, setJustificativaReprovacao] = useState("");
  const [comentario, setComentario] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editPrazo, setEditPrazo] = useState("");
  const [originalNome, setOriginalNome] = useState("");
  const [originalDescricao, setOriginalDescricao] = useState("");
  const [originalPrazo, setOriginalPrazo] = useState("");

  const { data: solicitacoes, isLoading, refetch } = trpc.actions.getPendingAdjustmentsWithDetails.useQuery();

  // Refetch a cada 5 segundos para atualizar a lista
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);
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
    // Armazenar valores originais
    setOriginalNome(solicitacao.actionNome || "");
    setOriginalDescricao(solicitacao.actionDescricao || "");
    setOriginalPrazo(formatarData(solicitacao.actionPrazo) || "");
    // Inicializar campos de edição com valores originais
    setEditNome(solicitacao.actionNome || "");
    setEditDescricao(solicitacao.actionDescricao || "");
    setEditPrazo(formatarData(solicitacao.actionPrazo) || "");
    setShowAprovarDialog(true);
  };

  const handleReprovar = (solicitacaoId: number) => {
    setSelectedSolicitacao(solicitacaoId);
    setShowReprovarDialog(true);
  };

  const confirmarAprovacao = () => {
    if (!editNome.trim() || !editDescricao.trim() || !editPrazo) {
      toast.error("Todos os campos são obrigatórios");
      return;
    }

    if (selectedSolicitacao) {
      aprovarMutation.mutate({
        solicitacaoId: selectedSolicitacao,
        novoNome: editNome,
        novaDescricao: editDescricao,
        novoPrazo: editPrazo,
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Histórico de Solicitações</h1>
          <p className="text-muted-foreground">
            Visualize todas as solicitações de ajuste de ações (pendentes, aprovadas e reprovadas)
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          🔄 Atualizar
        </Button>
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

                  {/* Campos a Ajustar - EDITÁVEIS */}
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold mb-3 text-yellow-900">✏️ EDITE OS CAMPOS SOLICITADOS PARA AJUSTE</h4>
                    <div className="space-y-3">
                      {camposAjustar.nome && (
                        <div>
                          <p className="text-sm font-medium text-yellow-900 mb-1">Novo Nome:</p>
                          <Input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            placeholder="Digite o novo nome"
                            className="bg-white"
                          />
                        </div>
                      )}
                      {camposAjustar.descricao && (
                        <div>
                          <p className="text-sm font-medium text-yellow-900 mb-1">Nova Descrição:</p>
                          <Textarea
                            value={editDescricao}
                            onChange={(e) => setEditDescricao(e.target.value)}
                            placeholder="Digite a nova descrição"
                            rows={4}
                            className="bg-white"
                          />
                        </div>
                      )}
                      {camposAjustar.prazo && (
                        <div>
                          <p className="text-sm font-medium text-yellow-900 mb-1">Novo Prazo:</p>
                          <Input
                            type="date"
                            value={editPrazo}
                            onChange={(e) => setEditPrazo(e.target.value)}
                            className="bg-white"
                          />
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
                      onClick={() => handleAprovar(solicitacao.id)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar e Editar Ação</DialogTitle>
            <DialogDescription>
              Edite TODOS os campos da ação conforme necessário. As alterações serão rastreadas e o colaborador será notificado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSolicitacaoData && (
            <div className="space-y-4 py-4">
              {/* Informações da Solicitação */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm font-bold text-amber-900 mb-3">⚠️ INFORMAÇÕES DA SOLICITAÇÃO</p>
                <div className="space-y-2">
                  <p className="text-sm text-amber-800"><strong>Solicitante:</strong> {selectedSolicitacaoData.solicitanteNome}</p>
                  <p className="text-sm text-amber-800"><strong>Ação:</strong> {selectedSolicitacaoData.actionNome}</p>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">Justificativa do Colaborador:</p>
                    <p className="text-sm text-amber-800 bg-white p-2 rounded border border-amber-100">{selectedSolicitacaoData.justificativa}</p>
                  </div>
                </div>
              </div>

              {/* Seção de Comparação de Valores */}
              <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900">📋 O QUE SERÁ ALTERADO</h4>
                <p className="text-xs text-blue-800">Visualize as mudanças que serão aplicadas. Você pode editar qualquer campo abaixo.</p>
                
                {/* Comparação Nome */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-900">Nome da Ação:</p>
                  {temAlteracao(originalNome, editNome) ? (
                    <p className="text-sm text-blue-800">
                      <span className="line-through">{originalNome}</span>
                      <ArrowRight className="inline mx-2" size={16} />
                      <span className="font-semibold">{editNome || "(vazio)"}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-blue-800">✓ MANTIDO</p>
                  )}
                </div>

                {/* Comparação Descrição */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-900">Descrição:</p>
                  {temAlteracao(originalDescricao, editDescricao) ? (
                    <p className="text-sm text-blue-800">
                      <span className="line-through text-xs">{originalDescricao?.substring(0, 50)}...</span>
                      <ArrowRight className="inline mx-2" size={16} />
                      <span className="font-semibold text-xs">{editDescricao?.substring(0, 50)}...</span>
                    </p>
                  ) : (
                    <p className="text-sm text-blue-800">✓ MANTIDO</p>
                  )}
                </div>

                {/* Comparação Prazo */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-900">Prazo:</p>
                  {temAlteracao(originalPrazo, editPrazo) ? (
                    <p className="text-sm text-blue-800">
                      <span className="line-through">{originalPrazo}</span>
                      <ArrowRight className="inline mx-2" size={16} />
                      <span className="font-semibold">{editPrazo || "(vazio)"}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-blue-800">✓ MANTIDO</p>
                  )}
                </div>
              </div>

              {/* Seção de Edição */}
              <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-sm text-green-900">✏️ EDITE OS CAMPOS CONFORME NECESSÁRIO</h4>
                <p className="text-xs text-green-800">Todos os campos podem ser editados. As alterações serão rastreadas.</p>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-nome" className="font-semibold">Nome da Ação *</Label>
                    <Input
                      id="edit-nome"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Nome da ação"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-descricao" className="font-semibold">Descrição *</Label>
                    <Textarea
                      id="edit-descricao"
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      placeholder="Descrição da ação"
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-prazo" className="font-semibold">Prazo *</Label>
                    <Input
                      id="edit-prazo"
                      type="date"
                      value={editPrazo}
                      onChange={(e) => setEditPrazo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAprovarDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovacao} disabled={aprovarMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {aprovarMutation.isPending ? "Processando..." : "✓ Concordo e Aprovar"}
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

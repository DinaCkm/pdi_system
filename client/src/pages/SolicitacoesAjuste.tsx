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
import AuditoriaHistorico from "@/components/AuditoriaHistorico";
import { trpc } from "@/lib/trpc";

// Função para formatar data
function formatarData(data: any): string {
  if (!data) return "";
  if (typeof data === 'string') {
    return data.split('T')[0];
  }
  if (data instanceof Date) {
    return data.toISOString().split('T')[0];
  }
  return "";
}

// Função para detectar se houve alteração
function temAlteracao(original: any, novo: any): boolean {
  return original !== novo;
}

export default function SolicitacoesAjuste() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [selectedSolicitacaoData, setSelectedSolicitacaoData] = useState<any>(null);
  const [showAprovarDialogAjuste, setShowAprovarDialogAjuste] = useState(false);
  const [showReprovarDialog, setShowReprovarDialog] = useState(false);
  const [justificativaReprovacao, setJustificativaReprovacao] = useState("");
  const [comentario, setComentario] = useState("");
  const [confirmaAprovacao, setConfirmaAprovacao] = useState(false);
  // Estado para armazenar valores de edição por solicitação
  const [editValues, setEditValues] = useState<Record<number, { nome: string; descricao: string; prazo: string }>>({});
  // Estado para controlar se as alterações foram salvas
  const [alteracoesSalvas, setAlteracoesSalvas] = useState(false);
  // Estado para controlar se está salvando
  const [estaSalvando, setEstaSalvando] = useState(false);


  const { data: solicitacoes, isLoading, refetch } = trpc.actions.getPendingAdjustmentsWithDetails.useQuery();

  // Refetch a cada 5 segundos para atualizar a lista
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Inicializar editValues quando solicitações são carregadas
  useEffect(() => {
    if (solicitacoes && solicitacoes.length > 0) {
      const newEditValues: Record<number, { nome: string; descricao: string; prazo: string }> = {};
      solicitacoes.forEach(sol => {
        if (!editValues[sol.id]) {
          newEditValues[sol.id] = {
            nome: sol.actionNome || "",
            descricao: sol.actionDescricao || "",
            prazo: formatarData(sol.actionPrazo)
          };
        }
      });
      if (Object.keys(newEditValues).length > 0) {
        setEditValues(prev => ({ ...prev, ...newEditValues }));
      }
    }
  }, [solicitacoes]);
  const { data: comentarios, refetch: refetchComentarios } = trpc.actions.getComments.useQuery(
    { adjustmentRequestId: selectedSolicitacao! },
    { enabled: selectedSolicitacao !== null }
  );



  const aprovarMutation = trpc.actions.aprovarAjuste.useMutation({
    onSuccess: () => {
      console.log("[aprovarMutation] onSuccess chamado");
      toast.success("Solicitação aprovada com sucesso!");
      setShowAprovarDialogAjuste(false);
      setSelectedSolicitacao(null);
      setConfirmaAprovacao(false);
      setEditValues({});
      // Aguardar 500ms antes de recarregar para garantir que o banco foi atualizado
      setTimeout(() => {
        refetch();
      }, 500);
    },
    onError: (error) => {
      console.log("[aprovarMutation] onError chamado:", error);
      console.log("[aprovarMutation] error.message:", error.message);
      toast.error(error.message);
    },
  });

  const reprovarMutation = trpc.actions.reprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação reprovada com sucesso!");
      setShowReprovarDialog(false);
      setSelectedSolicitacao(null);
      setJustificativaReprovacao("");
      // Aguardar 500ms antes de recarregar para garantir que o banco foi atualizado
      setTimeout(() => {
        refetch();
      }, 500);
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
    console.log("handleAprovar chamado com:", solicitacao);
    setSelectedSolicitacao(solicitacao.id);
    setSelectedSolicitacaoData(solicitacao);
    // NÃO resetar valores - manter os valores que o usuário já editou
    // Se ainda não há valores editados, inicializar com valores originais
    if (!editValues[solicitacao.id]) {
      setEditValues(prev => ({
        ...prev,
        [solicitacao.id]: {
          nome: solicitacao.actionNome || "",
          descricao: solicitacao.actionDescricao || "",
          prazo: formatarData(solicitacao.actionPrazo)
        }
      }));
    }
    setShowAprovarDialogAjuste(true);
  };

  const handleReprovar = (solicitacaoId: number) => {
    setSelectedSolicitacao(solicitacaoId);
    setShowReprovarDialog(true);
  };

  const executarAprovacao = () => {
    console.log("========== EXECUTAR APROVACAO CHAMADO ==========");
    console.log("executarAprovacao chamado");
    console.log("selectedSolicitacao:", selectedSolicitacao);
    console.log("editValues:", editValues);
    console.log("selectedSolicitacaoData:", selectedSolicitacaoData);
    
    if (selectedSolicitacao) {
      const currentEditValues = editValues[selectedSolicitacao];
      console.log("currentEditValues:", currentEditValues);
      if (!currentEditValues) {
        toast.error("Erro ao carregar dados");
        return;
      }
      
      // Verificar tipos de dados
      console.log("Tipos de dados:", {
        solicitacaoId: typeof selectedSolicitacao,
        novoNome: typeof currentEditValues.nome,
        novaDescricao: typeof currentEditValues.descricao,
        novoPrazo: typeof currentEditValues.prazo,
      });
      
      // Verificar se os valores estão vazios
      console.log("Valores vazios?", {
        nome: !currentEditValues.nome,
        descricao: !currentEditValues.descricao,
        prazo: !currentEditValues.prazo,
      });
      
      const payload = {
        solicitacaoId: selectedSolicitacao,
        novoNome: currentEditValues.nome || undefined,
        novaDescricao: currentEditValues.descricao || undefined,
        novoPrazo: currentEditValues.prazo || undefined,
      };
      
      console.log("Payload final:", JSON.stringify(payload, null, 2));
      console.log("Chamando aprovarMutation com:", payload);
      console.log("[executarAprovacao] Chamando mutate...");
      
      try {
        aprovarMutation.mutate(payload as any);
        console.log("[executarAprovacao] mutate chamado com sucesso");
      } catch (err) {
        console.log("[executarAprovacao] Erro ao chamar mutate:", err);
      }
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
            const currentEditValues = editValues[solicitacao.id] || {
              nome: solicitacao.actionNome || "",
              descricao: solicitacao.actionDescricao || "",
              prazo: formatarData(solicitacao.actionPrazo)
            };

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
                            value={currentEditValues.nome || ""}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              [solicitacao.id]: { ...prev[solicitacao.id], nome: e.target.value }
                            }))}
                            placeholder="Digite o novo nome"
                            className="bg-white"
                          />
                        </div>
                      )}
                      {camposAjustar.descricao && (
                        <div>
                          <p className="text-sm font-medium text-yellow-900 mb-1">Nova Descrição:</p>
                          <Textarea
                            value={currentEditValues.descricao || ""}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              [solicitacao.id]: { ...prev[solicitacao.id], descricao: e.target.value }
                            }))}
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
                            value={currentEditValues.prazo || ""}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              [solicitacao.id]: { ...prev[solicitacao.id], prazo: e.target.value }
                            }))}
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

      {/* Dialog de Aprovação */}
      <Dialog open={showAprovarDialogAjuste} onOpenChange={setShowAprovarDialogAjuste}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          {selectedSolicitacaoData && (
            <div className="space-y-4 py-4">

              {/* Comparação: Antes vs Depois */}
              <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-sm text-green-900">📋 O QUE SERÁ ALTERADO</h4>
                <p className="text-xs text-green-800">Visualize os ajustes que o administrador fez com base nas solicitações do colaborador:</p>
                
                {/* Comparação Nome */}
                {temAlteracao(selectedSolicitacaoData?.actionNome, editValues[selectedSolicitacao!]?.nome) && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-green-900">Nome da Ação:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-red-100 p-2 rounded border border-red-300">
                        <p className="text-xs text-red-900 font-semibold">Anterior:</p>
                        <p className="text-xs text-red-800">{selectedSolicitacaoData?.actionNome}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <p className="text-xs text-green-900 font-semibold">Novo:</p>
                        <p className="text-xs text-green-800">{editValues[selectedSolicitacao!]?.nome}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Comparação Descrição */}
                {temAlteracao(selectedSolicitacaoData?.actionDescricao, editValues[selectedSolicitacao!]?.descricao) && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-green-900">Descrição:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-red-100 p-2 rounded border border-red-300">
                        <p className="text-xs text-red-900 font-semibold">Anterior:</p>
                        <p className="text-xs text-red-800 line-clamp-3">{selectedSolicitacaoData?.actionDescricao}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <p className="text-xs text-green-900 font-semibold">Novo:</p>
                        <p className="text-xs text-green-800 line-clamp-3">{editValues[selectedSolicitacao!]?.descricao}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Comparação Prazo */}
                {temAlteracao(formatarData(selectedSolicitacaoData?.actionPrazo), editValues[selectedSolicitacao!]?.prazo) && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-green-900">Prazo:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-red-100 p-2 rounded border border-red-300">
                        <p className="text-xs text-red-900 font-semibold">Anterior:</p>
                        <p className="text-xs text-red-800">{formatarData(selectedSolicitacaoData?.actionPrazo)}</p>
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <p className="text-xs text-green-900 font-semibold">Novo:</p>
                        <p className="text-xs text-green-800">{editValues[selectedSolicitacao!]?.prazo}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>




            </div>
          )}
          
          {/* Histórico de Auditoria */}
          {selectedSolicitacao && selectedSolicitacao > 0 && (
            <div className="mt-6 pt-4 border-t">
              <AuditoriaHistorico adjustmentRequestId={selectedSolicitacao} />
            </div>
          )}
          
          {/* Checkbox de Confirmação */}
          <div className="mt-6 pt-4 border-t">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmaAprovacao}
                onChange={(e) => setConfirmaAprovacao(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">✓ Concordo com as mudanças e desejo aprovar</span>
            </label>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAprovarDialogAjuste(false)}>
              Cancelar
            </Button>
            <Button onClick={executarAprovacao} disabled={!confirmaAprovacao || aprovarMutation.isPending} className="bg-green-600 hover:bg-green-700">
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

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import RichTextDisplay from '@/components/RichTextDisplay';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, User, FileText, Info, ArrowRight, Target, Calendar, FileEdit, Filter, X } from "lucide-react";
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

// Função para obter o label do status
function getStatusLabel(status: string) {
  switch (status) {
    case "pendente":
      return "Aguardando Admin";
    case "aguardando_lider":
      return "Aguardando Líder";
    case "aprovada":
      return "Aprovada";
    case "reprovada":
      return "Reprovada";
    case "mais_informacoes":
      return "Mais Informações";
    default:
      return status;
  }
}

export default function SolicitacoesEquipe() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  
  // Estados dos filtros
  const [filtroEmpregado, setFiltroEmpregado] = useState<string>("todos");
  const [filtroAcao, setFiltroAcao] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

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

  // Extrair listas únicas para os filtros
  const empregadosUnicos = useMemo(() => {
    if (!solicitacoes) return [];
    const empregados = new Map<string, string>();
    solicitacoes.forEach((s: any) => {
      if (s.solicitanteId && s.solicitanteNome) {
        empregados.set(String(s.solicitanteId), s.solicitanteNome);
      }
    });
    return Array.from(empregados.entries()).map(([id, nome]) => ({ id, nome }));
  }, [solicitacoes]);

  const acoesUnicas = useMemo(() => {
    if (!solicitacoes) return [];
    const acoes = new Map<string, string>();
    solicitacoes.forEach((s: any) => {
      if (s.actionId && s.actionTitulo) {
        acoes.set(String(s.actionId), s.actionTitulo);
      }
    });
    return Array.from(acoes.entries()).map(([id, titulo]) => ({ id, titulo }));
  }, [solicitacoes]);

  const statusUnicos = useMemo(() => {
    if (!solicitacoes) return [];
    const statusSet = new Set<string>();
    solicitacoes.forEach((s: any) => {
      if (s.status) {
        statusSet.add(s.status);
      }
    });
    return Array.from(statusSet);
  }, [solicitacoes]);

  // Filtrar solicitações
  const solicitacoesFiltradas = useMemo(() => {
    if (!solicitacoes) return [];
    
    return solicitacoes.filter((s: any) => {
      // Filtro por empregado
      if (filtroEmpregado !== "todos" && String(s.solicitanteId) !== filtroEmpregado) {
        return false;
      }
      
      // Filtro por ação
      if (filtroAcao !== "todos" && String(s.actionId) !== filtroAcao) {
        return false;
      }
      
      // Filtro por status
      if (filtroStatus !== "todos" && s.status !== filtroStatus) {
        return false;
      }
      
      return true;
    });
  }, [solicitacoes, filtroEmpregado, filtroAcao, filtroStatus]);

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroEmpregado("todos");
    setFiltroAcao("todos");
    setFiltroStatus("todos");
  };

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtroEmpregado !== "todos" || filtroAcao !== "todos" || filtroStatus !== "todos";

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
        <h1 className="text-3xl font-bold mb-2">Solicitações de Ajustes nas Ações/Equipe</h1>
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

      {/* Seção de Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Empregado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Empregado</label>
              <Select value={filtroEmpregado} onValueChange={setFiltroEmpregado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os empregados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os empregados</SelectItem>
                  {empregadosUnicos.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Ação */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ação</label>
              <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as ações</SelectItem>
                  {acoesUnicas.map((acao) => (
                    <SelectItem key={acao.id} value={acao.id}>
                      {acao.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {statusUnicos.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botão para limpar filtros */}
          {temFiltrosAtivos && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {solicitacoesFiltradas.length} de {solicitacoes?.length || 0} solicitações
              </p>
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <Alert>
          <AlertDescription>
            Não há solicitações de ajuste da sua equipe no momento.
          </AlertDescription>
        </Alert>
      ) : solicitacoesFiltradas.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma solicitação encontrada com os filtros selecionados.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {solicitacoesFiltradas.map((solicitacao: any) => {
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
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                          ID #{solicitacao.id.toString().padStart(5, '0')}
                        </span>
                      </div>
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
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      <RichTextDisplay content={solicitacao.justificativa || "Sem justificativa"} />
                    </div>
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

                  {/* Comentários do Líder */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Líder - Leia a solicitação de ajuste feita por seu liderado. Deixe aqui a sua concordância ou não concordância com esta mudança solicitada.
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

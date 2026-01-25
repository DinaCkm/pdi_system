import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Clock, User, FileText, ArrowRight, Target, Calendar, FileEdit, Filter } from "lucide-react";
import { toast } from "sonner";

// Função para obter o badge de status
function getStatusBadge(status: string) {
  switch (status) {
    case "pendente":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
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

export default function SolicitacoesAdmin() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [justificativaRejeicao, setJustificativaRejeicao] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>("todos");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");

  const { data: solicitacoes, isLoading, refetch } = trpc.adjustmentRequests.listAll.useQuery();
  const { data: departamentos } = trpc.departments.list.useQuery();
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

  const approveMutation = trpc.adjustmentRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.adjustmentRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Solicitação reprovada!");
      setRejectingId(null);
      setJustificativaRejeicao("");
      refetch();
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

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id });
  };

  const handleReject = (id: number) => {
    if (!justificativaRejeicao.trim() || justificativaRejeicao.length < 10) {
      toast.error("Justificativa deve ter no mínimo 10 caracteres");
      return;
    }
    rejectMutation.mutate({ id, justificativa: justificativaRejeicao });
  };

  // Extrair lista única de colaboradores
  const colaboradores = useMemo(() => {
    if (!solicitacoes) return [];
    const unique = new Map();
    solicitacoes.forEach((s: any) => {
      if (s.solicitanteId && s.solicitanteNome) {
        unique.set(s.solicitanteId, s.solicitanteNome);
      }
    });
    return Array.from(unique, ([id, nome]) => ({ id, nome }));
  }, [solicitacoes]);

  // Filtrar solicitações
  const solicitacoesFiltradas = useMemo(() => {
    if (!solicitacoes) return [];
    
    return solicitacoes.filter((s: any) => {
      // Filtro por status
      if (filtroStatus !== "todos" && s.status !== filtroStatus) return false;
      
      // Filtro por departamento
      if (filtroDepartamento !== "todos" && String(s.departamentoId) !== filtroDepartamento) return false;
      
      // Filtro por colaborador
      if (filtroColaborador !== "todos" && String(s.solicitanteId) !== filtroColaborador) return false;
      
      return true;
    });
  }, [solicitacoes, filtroStatus, filtroDepartamento, filtroColaborador]);

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
        <h1 className="text-3xl font-bold mb-2">Histórico de Alteração nas Ações</h1>
        <p className="text-muted-foreground">
          Visualize todas as solicitações de alteração nas ações dos colaboradores
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aguardando_lider">Aguardando Líder</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="reprovada">Reprovada</SelectItem>
                  <SelectItem value="mais_informacoes">Mais Informações</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Departamento */}
            <div>
              <label className="text-sm font-medium mb-2 block">Departamento</label>
              <Select value={filtroDepartamento} onValueChange={setFiltroDepartamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {departamentos?.map((dept: any) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Colaborador */}
            <div>
              <label className="text-sm font-medium mb-2 block">Colaborador</label>
              <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {colaboradores.map((colab: any) => (
                    <SelectItem key={colab.id} value={String(colab.id)}>
                      {colab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-muted-foreground">
            Exibindo {solicitacoesFiltradas.length} de {solicitacoes?.length || 0} solicitações
          </div>
        </CardContent>
      </Card>

      {!solicitacoesFiltradas || solicitacoesFiltradas.length === 0 ? (
        <Alert>
          <AlertDescription>
            Não há solicitações de ajuste com os filtros selecionados.
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

            const isPending = solicitacao.status === "pendente" || solicitacao.status === "aguardando_lider";

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
                  <div className="border-t pt-4">
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
                        placeholder="Adicionar comentário..."
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

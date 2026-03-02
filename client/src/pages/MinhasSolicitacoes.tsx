import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Info, Target, Calendar, FileEdit, Filter, X, CheckCircle, XCircle, AlertCircle, History } from "lucide-react";
import RichTextDisplay from '@/components/RichTextDisplay';

// Função para obter o badge de status
function getStatusBadge(status: string) {
  switch (status) {
    case "pendente":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando Avaliação</Badge>;
    case "aguardando_lider":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Aguardando Líder</Badge>;
    case "aprovada":
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovada</Badge>;
    case "reprovada":
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Não Aceita</Badge>;
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
      return "Aguardando Avaliação";
    case "aguardando_lider":
      return "Aguardando Líder";
    case "aprovada":
      return "Aprovada";
    case "reprovada":
      return "Não Aceita";
    case "mais_informacoes":
      return "Mais Informações";
    default:
      return status;
  }
}

// Função para obter o ícone de status
function getStatusIcon(status: string) {
  switch (status) {
    case "aprovada":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "reprovada":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "pendente":
    case "aguardando_lider":
      return <Clock className="h-5 w-5 text-yellow-600" />;
    default:
      return <AlertCircle className="h-5 w-5 text-blue-600" />;
  }
}

export default function MinhasSolicitacoes() {
  // Estados dos filtros
  const [filtroAcao, setFiltroAcao] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  const { data: solicitacoes, isLoading } = trpc.adjustmentRequests.list.useQuery();

  // Extrair listas únicas para os filtros
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
  }, [solicitacoes, filtroAcao, filtroStatus]);

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroAcao("todos");
    setFiltroStatus("todos");
  };

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtroAcao !== "todos" || filtroStatus !== "todos";

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
        <div className="flex items-center gap-3 mb-2">
          <History className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Minhas Solicitações</h1>
        </div>
        <p className="text-muted-foreground">
          Acompanhe todas as solicitações de alteração que você fez nas suas ações do PDI
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Aqui você pode visualizar o histórico completo das suas solicitações de alteração, incluindo o status atual e a justificativa do administrador quando aplicável.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Você ainda não fez nenhuma solicitação de alteração.
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
            
            try {
              camposAjustar = JSON.parse(solicitacao.camposAjustar || "{}");
            } catch (e) {
              camposAjustar = {};
            }

            // Verificar se tem campos selecionados (novo formato com checkboxes)
            const camposSelecionados = camposAjustar.camposSelecionados || [];
            const temCamposSelecionados = camposSelecionados.length > 0;

            return (
              <Card key={solicitacao.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(solicitacao.status)}
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">#{solicitacao.id}</span>
                          {solicitacao.actionTitulo || "Ação não identificada"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          Solicitado em {new Date(solicitacao.createdAt).toLocaleDateString('pt-BR')} às {new Date(solicitacao.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(solicitacao.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Campos que foram solicitados para alteração */}
                  {temCamposSelecionados && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <FileEdit className="h-4 w-4" />
                        Campos solicitados para alteração:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {camposSelecionados.map((campo: string) => (
                          <Badge key={campo} variant="secondary" className="bg-blue-100 text-blue-800">
                            {campo === 'titulo' && 'Título'}
                            {campo === 'descricao' && 'Descrição'}
                            {campo === 'prazo' && 'Prazo'}
                            {campo === 'competencia' && 'Macro Competência'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Justificativa do colaborador */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Sua justificativa:
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {solicitacao.justificativa || "Sem justificativa informada"}
                    </p>
                  </div>

                  {/* Resposta do Admin (quando aprovada ou reprovada) */}
                  {(solicitacao.status === 'aprovada' || solicitacao.status === 'reprovada') && (
                    <div className={`rounded-lg p-4 ${
                      solicitacao.status === 'aprovada' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <h4 className={`font-medium mb-2 flex items-center gap-2 ${
                        solicitacao.status === 'aprovada' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {solicitacao.status === 'aprovada' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Resposta do Administrador:
                      </h4>
                      {solicitacao.status === 'aprovada' ? (
                        <p className="whitespace-pre-wrap text-green-700">
                          Sua solicitação foi aprovada. As alterações foram realizadas pelo administrador.
                        </p>
                      ) : (
                        <div className="text-red-700">
                          {solicitacao.justificativaAdmin ? (
                            <RichTextDisplay content={solicitacao.justificativaAdmin} />
                          ) : (
                            <p>Solicitação não aceita pelo administrador.</p>
                          )}
                        </div>
                      )}
                      {solicitacao.updatedAt && solicitacao.updatedAt !== solicitacao.createdAt && (
                        <p className={`text-sm mt-2 ${
                          solicitacao.status === 'aprovada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Respondido em {new Date(solicitacao.updatedAt).toLocaleDateString('pt-BR')} às {new Date(solicitacao.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Parecer do Líder (se houver) */}
                  {solicitacao.parecerLider && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Parecer do Líder:
                      </h4>
                      <p className="text-purple-700 whitespace-pre-wrap">
                        {solicitacao.parecerLider}
                      </p>
                      {solicitacao.liderNome && (
                        <p className="text-sm text-purple-600 mt-2">
                          Por: {solicitacao.liderNome}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status pendente */}
                  {(solicitacao.status === 'pendente' || solicitacao.status === 'aguardando_lider') && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Aguardando avaliação
                      </h4>
                      <p className="text-yellow-700">
                        {solicitacao.status === 'aguardando_lider' 
                          ? "Sua solicitação está aguardando o parecer do seu líder antes de ser avaliada pelo administrador."
                          : "Sua solicitação está na fila para ser avaliada pelo administrador."
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

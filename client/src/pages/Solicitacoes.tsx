import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, User, Clock, FileText } from "lucide-react";
import { useState, useEffect } from "react";
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

export default function HistoricoSolicitacoes() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<number | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<'todas' | 'pendentes' | 'aprovadas' | 'reprovadas'>('todas');

  const { data: solicitacoes, isLoading, error, refetch } = trpc.actions.getPendingAdjustmentsWithDetails.useQuery();
  
  // Filtrar solicitações por status
  const solicitacoesFiltradas = solicitacoes?.filter((sol: any) => {
    if (statusFiltro === 'todas') return true;
    if (statusFiltro === 'pendentes') return sol.status === 'pendente';
    if (statusFiltro === 'aprovadas') return sol.status === 'aprovada';
    if (statusFiltro === 'reprovadas') return sol.status === 'reprovada';
    return true;
  }) || [];

  // Refetch a cada 5 segundos para atualizar a lista
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar solicitações: {error.message}. Verifique se você tem permissão para acessar esta página (requer perfil Admin ou Líder).
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Solicitações de Ajuste</h1>
          <p className="text-muted-foreground">
            Visualize todas as solicitações de ajuste por status (pendentes, aprovadas e reprovadas)
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          🔄 Atualizar
        </Button>
      </div>

      {/* Filtro por Status */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <Button
          variant={statusFiltro === 'todas' ? 'default' : 'outline'}
          onClick={() => setStatusFiltro('todas')}
          className="rounded-full"
        >
          Todas ({solicitacoes?.length || 0})
        </Button>
        <Button
          variant={statusFiltro === 'pendentes' ? 'default' : 'outline'}
          onClick={() => setStatusFiltro('pendentes')}
          className="rounded-full"
        >
          Pendentes ({solicitacoes?.filter((s: any) => s.status === 'pendente').length || 0})
        </Button>
        <Button
          variant={statusFiltro === 'aprovadas' ? 'default' : 'outline'}
          onClick={() => setStatusFiltro('aprovadas')}
          className="rounded-full"
        >
          Aprovadas ({solicitacoes?.filter((s: any) => s.status === 'aprovada').length || 0})
        </Button>
        <Button
          variant={statusFiltro === 'reprovadas' ? 'default' : 'outline'}
          onClick={() => setStatusFiltro('reprovadas')}
          className="rounded-full"
        >
          Reprovadas ({solicitacoes?.filter((s: any) => s.status === 'reprovada').length || 0})
        </Button>
      </div>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <Alert>
          <AlertDescription>
            Não há histórico de solicitações no momento.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6">
          {solicitacoesFiltradas.map((solicitacao: any) => {
            const camposAjustar = JSON.parse(solicitacao.camposAjustar);
            const isAprovada = solicitacao.status === 'aprovada';

            return (
              <div
                key={solicitacao.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{solicitacao.actionNome}</h3>
                      <Badge variant={isAprovada ? "default" : "destructive"}>
                        {isAprovada ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aprovada
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Reprovada
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {solicitacao.solicitanteNome}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatarData(solicitacao.createdAt)}
                      </div>
                      {solicitacao.evaluatedAt && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Avaliado em: {formatarData(solicitacao.evaluatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">Justificativa do Colaborador:</p>
                  <p className="text-sm text-muted-foreground">{solicitacao.justificativa}</p>
                </div>

                {/* Mostrar o que foi alterado */}
                {(camposAjustar.nome || camposAjustar.descricao || camposAjustar.prazo) && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold mb-3 text-blue-900 dark:text-blue-100">
                      ✏️ O QUE FOI ALTERADO:
                    </p>

                    {camposAjustar.nome && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Nome:
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="line-through text-red-600">{solicitacao.actionNome}</span>
                          <span className="text-green-600">→</span>
                          <span className="text-green-600 font-semibold">{camposAjustar.nome}</span>
                        </div>
                      </div>
                    )}

                    {camposAjustar.descricao && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Descrição:
                        </p>
                        <div className="text-sm space-y-1">
                          <p className="line-through text-red-600 text-xs">
                            {solicitacao.actionDescricao?.substring(0, 100)}...
                          </p>
                          <p className="text-green-600 text-xs">
                            {camposAjustar.descricao?.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    )}

                    {camposAjustar.prazo && (
                      <div>
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Prazo:
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="line-through text-red-600">
                            {formatarData(solicitacao.actionPrazo)}
                          </span>
                          <span className="text-green-600">→</span>
                          <span className="text-green-600 font-semibold">
                            {camposAjustar.prazo}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mostrar status final */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <p className="text-sm font-semibold mb-2">Status Final:</p>
                  <div className="flex items-center gap-2">
                    {isAprovada ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-green-600 font-semibold">Aprovada</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-600 font-semibold">Reprovada</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

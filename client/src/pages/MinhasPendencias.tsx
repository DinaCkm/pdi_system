import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, FileText, Filter, Search, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function MinhasPendencias() {
  const authData = useAuth();
  const user = authData?.user;
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColaborador, setFilterColaborador] = useState<string>("todos");
  const [filterData, setFilterData] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  
  // Apenas administradores podem aprovar/reprovar
  const isAdmin = user && 'role' in user && user.role === 'admin';

  const { data: solicitacoes, refetch, isLoading } = trpc.actions.getPendingAdjustments.useQuery();
  const { data: historico, isLoading: loadingHistorico } = trpc.actions.getHistorico.useQuery(
    { actionId: selectedSolicitacao?.actionId || 0 },
    { enabled: !!selectedSolicitacao }
  );

  const aprovarMutation = trpc.actions.aprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso! O colaborador foi notificado.");
      setShowApproveDialog(false);
      setSelectedSolicitacao(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar solicitação: ${error.message}`);
    },
  });

  const reprovarMutation = trpc.actions.reprovarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação reprovada! O colaborador foi notificado.");
      setShowRejectDialog(false);
      setSelectedSolicitacao(null);
      setRejectReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao reprovar solicitação: ${error.message}`);
    },
  });

  // Extrair lista única de colaboradores
  const colaboradores = useMemo(() => {
    if (!solicitacoes) return [];
    const uniqueColaboradores = new Map();
    solicitacoes.forEach((sol: any) => {
      if (sol.solicitanteName && sol.solicitanteId) {
        uniqueColaboradores.set(sol.solicitanteId, {
          id: sol.solicitanteId,
          name: sol.solicitanteName
        });
      }
    });
    return Array.from(uniqueColaboradores.values());
  }, [solicitacoes]);

  // Filtrar solicitações
  const filteredSolicitacoes = useMemo(() => {
    if (!solicitacoes) return [];
    
    return solicitacoes.filter((sol: any) => {
      // Filtro de busca (nome da ação ou colaborador)
      const matchesSearch = 
        searchTerm === "" ||
        sol.actionNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sol.solicitanteName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de colaborador
      const matchesColaborador = 
        filterColaborador === "todos" || 
        sol.solicitanteId?.toString() === filterColaborador;
      
      // Filtro de status
      const matchesStatus = 
        filterStatus === "todos" || 
        sol.status === filterStatus;
      
      // Filtro de data
      let matchesData = true;
      if (filterData !== "todos" && sol.createdAt) {
        const solDate = new Date(sol.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - solDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filterData) {
          case "hoje":
            matchesData = diffDays === 0;
            break;
          case "semana":
            matchesData = diffDays <= 7;
            break;
          case "mes":
            matchesData = diffDays <= 30;
            break;
        }
      }
      
      return matchesSearch && matchesColaborador && matchesStatus && matchesData;
    });
  }, [solicitacoes, searchTerm, filterColaborador, filterStatus, filterData]);

  const handleViewDetails = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao);
    setShowDetailsDialog(true);
  };

  const handleApprove = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao);
    setShowApproveDialog(true);
  };

  const handleReject = (solicitacao: any) => {
    setSelectedSolicitacao(solicitacao);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (selectedSolicitacao) {
      aprovarMutation.mutate({ solicitacaoId: selectedSolicitacao.id });
    }
  };

  const confirmReject = () => {
    if (selectedSolicitacao && rejectReason.trim()) {
      reprovarMutation.mutate({
        solicitacaoId: selectedSolicitacao.id,
        justificativa: rejectReason,
      });
    } else {
      toast.error("Por favor, informe o motivo da reprovação");
    }
  };

  const renderCampoComparacao = (label: string, original: any, proposto: any) => {
    const isDifferent = original !== proposto;
    return (
      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{label} (Original)</p>
          <p className={`text-sm ${isDifferent ? 'line-through text-muted-foreground' : ''}`}>
            {original || "—"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">{label} (Proposto)</p>
          <p className={`text-sm font-semibold ${isDifferent ? 'text-orange-600' : ''}`}>
            {proposto || "—"}
          </p>
        </div>
      </div>
    );
  };

  // Função para gerar resumo das mudanças
  const gerarResumoMudancas = (solicitacao: any) => {
    const camposAjustar = JSON.parse(solicitacao.camposAjustar);
    const camposOriginais = JSON.parse(solicitacao.camposOriginais || '{}');
    
    const mudancas = Object.keys(camposAjustar).map((campo) => {
      let label = campo;
      if (campo === 'nome') label = 'Nome da Ação';
      if (campo === 'descricao') label = 'Descrição';
      if (campo === 'prazo') label = 'Prazo';
      if (campo === 'blocoId') label = 'Bloco';
      if (campo === 'macroId') label = 'Macro Área';
      if (campo === 'microId') label = 'Micro Área';
      
      return {
        campo: label,
        de: camposOriginais[campo] || "—",
        para: camposAjustar[campo] || "—"
      };
    });
    
    return mudancas;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Solicitações</h1>
        <p className="text-muted-foreground mb-4">
          Acompanhe todas as suas solicitações de alteração (pendentes, aprovadas ou rejeitadas)
        </p>
        {/* Aviso removido - será exibido em popup no formulário de solicitação */}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Prazo de Resposta:</span> Solicitações serão respondidas em até 5 dias úteis, exceto se dependerem de reunião com a liderança.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ação ou colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por Colaborador */}
            <div>
              <Select value={filterColaborador} onValueChange={setFilterColaborador}>
                <SelectTrigger>
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Colaboradores</SelectItem>
                  {colaboradores.map((colab: any) => (
                    <SelectItem key={colab.id} value={colab.id.toString()}>
                      {colab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="reprovada">Reprovada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Data */}
            <div>
              <Select value={filterData} onValueChange={setFilterData}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Datas</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Última Semana</SelectItem>
                  <SelectItem value="mes">Último Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-muted-foreground">
            Exibindo <span className="font-medium text-foreground">{filteredSolicitacoes.length}</span> de{" "}
            <span className="font-medium text-foreground">{solicitacoes?.length || 0}</span> solicitações
          </div>
        </CardContent>
      </Card>

      {!filteredSolicitacoes || filteredSolicitacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || filterColaborador !== "todos" || filterData !== "todos"
                ? "Nenhuma solicitação encontrada com os filtros aplicados"
                : "Nenhuma solicitação pendente"}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || filterColaborador !== "todos" || filterData !== "todos"
                ? "Tente ajustar os filtros para ver mais resultados"
                : "Todas as solicitações de ajuste foram avaliadas"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSolicitacoes.map((solicitacao: any) => {
            const camposAjustar = JSON.parse(solicitacao.camposAjustar);
            return (
              <Card key={solicitacao.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Solicitação de Ajuste #{solicitacao.id}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <span className="font-medium">Ação:</span> {solicitacao.actionNome || "Ação desconhecida"}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={solicitacao.status === 'pendente' ? "bg-orange-50 text-orange-700 border-orange-200" : solicitacao.status === 'aprovada' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                    >
                      {solicitacao.status === 'pendente' && <Clock className="h-3 w-3 mr-1" />}
                      {solicitacao.status === 'aprovada' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {solicitacao.status === 'reprovada' && <XCircle className="h-3 w-3 mr-1" />}
                      {solicitacao.status === 'pendente' && 'Pendente'}
                      {solicitacao.status === 'aprovada' && 'Aprovada'}
                      {solicitacao.status === 'reprovada' && 'Reprovada'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Solicitante</p>
                        <p className="font-medium">{solicitacao.solicitanteName || "Desconhecido"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Data da Solicitação</p>
                        <p className="font-medium">{new Date(solicitacao.createdAt).toLocaleDateString()}</p>
                      </div>
                      {solicitacao.evaluatedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Data da Resposta</p>
                          <p className="font-medium">{new Date(solicitacao.evaluatedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                      {solicitacao.status !== 'pendente' && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Respondido por</p>
                          <p className="font-medium">{solicitacao.evaluatorName || "Administrador"}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Justificativa da Solicitação</p>
                      <p className="text-sm bg-muted p-3 rounded-md">{solicitacao.justificativa}</p>
                    </div>

                    {solicitacao.justificativaAdmin && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Justificativa da Resposta</p>
                        <p className="text-sm bg-muted p-3 rounded-md">{solicitacao.justificativaAdmin}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Campos a ajustar</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(camposAjustar).map((campo) => (
                          <Badge key={campo} variant="secondary">
                            {campo}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(solicitacao)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(solicitacao)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(solicitacao)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reprovar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Comparação entre valores originais e propostos
            </DialogDescription>
          </DialogHeader>

          {selectedSolicitacao && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Informações da Solicitação</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{selectedSolicitacao.solicitanteName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">{selectedSolicitacao.tipoSolicitante}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data da Solicitação</p>
                    <p className="font-medium">{new Date(selectedSolicitacao.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ação</p>
                    <p className="font-medium">{selectedSolicitacao.actionNome}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Justificativa</p>
                    <p className="font-medium">{selectedSolicitacao.justificativa}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Comparação de Campos</h3>
                <div className="space-y-4">
                  {(() => {
                    const camposAjustar = JSON.parse(selectedSolicitacao.camposAjustar);
                    const camposOriginais = JSON.parse(selectedSolicitacao.camposOriginais || '{}');
                    
                    return Object.keys(camposAjustar).map((campo) => {
                      let label = campo;
                      if (campo === 'nome') label = 'Nome da Ação';
                      if (campo === 'descricao') label = 'Descrição';
                      if (campo === 'prazo') label = 'Prazo';
                      
                      return renderCampoComparacao(
                        label,
                        camposOriginais[campo],
                        camposAjustar[campo]
                      );
                    });
                  })()}
                </div>
              </div>

              {historico && Array.isArray(historico) && historico.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-bold text-green-900 mb-4">✓ Histórico de Alterações Aprovadas</h3>
                  <div className="space-y-3">
                    {historico && Array.isArray(historico) && historico.map((item: any, index: number) => (
                      <div key={`${item.id}-${index}`} className="bg-white border-l-4 border-green-500 pl-4 py-3 rounded">
                        <p className="text-sm font-bold text-gray-900 capitalize mb-2">{item.campo || 'Campo desconhecido'}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm"><span className="font-semibold">Anterior:</span> <span className="line-through text-gray-600">{item.valorAnterior || '—'}</span></p>
                          <p className="text-sm"><span className="font-semibold">Novo:</span> <span className="text-green-700 font-semibold">{item.valorNovo || '—'}</span></p>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Motivo: {item.motivoAlteracao || 'Sem motivo'}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Data desconhecida'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Aprovação com Resumo */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Revise as mudanças que serão aplicadas à ação. O colaborador será notificado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedSolicitacao && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Resumo das Mudanças</h4>
                <div className="space-y-2">
                  {gerarResumoMudancas(selectedSolicitacao).map((mudanca, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{mudanca.campo}:</span>
                      <div className="ml-4 mt-1">
                        <p className="text-muted-foreground line-through">De: {mudanca.de}</p>
                        <p className="text-orange-600 font-semibold">Para: {mudanca.para}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Ação:</strong> {selectedSolicitacao.actionNome}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  <strong>Solicitante:</strong> {selectedSolicitacao.solicitanteName}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  <strong>Justificativa:</strong> {selectedSolicitacao.justificativa}
                </p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              disabled={aprovarMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {aprovarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                "Aprovar e Notificar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Reprovação */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da reprovação. O colaborador será notificado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motivo">Motivo da Reprovação *</Label>
            <Textarea
              id="motivo"
              placeholder="Explique por que a solicitação foi reprovada..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Mínimo de 10 caracteres
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={reprovarMutation.isPending || !rejectReason.trim() || rejectReason.length < 10}
              className="bg-red-600 hover:bg-red-700"
            >
              {reprovarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reprovando...
                </>
              ) : (
                "Reprovar e Notificar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, FileText, Filter, Search, AlertTriangle, Eye, MessageSquare, Upload, History, User, Zap, Sparkles, Trophy, FileArchive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EvidenciaModal } from "@/components/EvidenciaModal";
import { SolicitarAjusteModal } from "@/components/SolicitarAjusteModal";
import { SolicitarAjusteModalMelhorado } from "@/components/SolicitarAjusteModalMelhorado";

// Hook para buscar nomes de competências
function useMacroNames(macroIds: number[]) {
  const { data: competencias = [] } = trpc.competencias.listAllMacros.useQuery();
  
  return useMemo(() => {
    const map: Record<number, string> = {};
    competencias.forEach((comp: any) => {
      map[comp.id] = comp.nome;
    });
    return map;
  }, [competencias]);
}

export default function MinhasPendencias() {
  const authData = useAuth();
  const user = authData?.user;
  const userId = user?.id;
  const utils = trpc.useUtils();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selectedAcao, setSelectedAcao] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAcaoHistory, setSelectedAcaoHistory] = useState<any>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedAcaoEvidence, setSelectedAcaoEvidence] = useState<any>(null);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [showCelebrationDialog, setShowCelebrationDialog] = useState(false);
  const [celebrationAcao, setCelebrationAcao] = useState<any>(null);
  const [previousAcoes, setPreviousAcoes] = useState<any[]>([]);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [selectedAcaoAjuste, setSelectedAcaoAjuste] = useState<any>(null);

  // Buscar solicitações de ajuste pendentes
  const { data: adjustmentRequests = [] } = trpc.adjustmentRequests.list.useQuery(
    undefined,
    { enabled: !!userId, staleTime: 0 }
  );

  // Verificar se há solicitação pendente para a ação selecionada
  const hasPendingAdjustmentRequest = useMemo(() => {
    if (!selectedAcaoAjuste?.id) return false;
    return adjustmentRequests.some(
      (req: any) => req.actionId === selectedAcaoAjuste.id && req.status === 'pendente'
    );
  }, [selectedAcaoAjuste, adjustmentRequests]);

  // Buscando as ações reais
  const { data: acoes, isLoading } = trpc.actions.list.useQuery(
    undefined,
    { enabled: !!userId }
  );
  
  // Buscar nomes de competências
  const macroIds = useMemo(() => [...new Set((acoes || []).map((a: any) => a.macroId).filter(Boolean))], [acoes]);
  const macroNames = useMacroNames(macroIds);

  // Buscando histórico de uma ação específica
  const { data: actionHistory } = trpc.actions.getHistory.useQuery(
    { actionId: selectedAcaoHistory?.id || 0 },
    { enabled: !!selectedAcaoHistory?.id }
  );

  // Mutation para enviar evidência
  // Buscar evidências da ação selecionada
  const { data: acaoEvidences } = trpc.evidences.listByAction.useQuery(
    { actionId: selectedAcaoEvidence?.id || 0 },
    { enabled: !!selectedAcaoEvidence?.id }
  );

  // Buscar TODAS as evidências do usuário (para filtrar por ação dentro do map)
  const { data: allUserEvidences = [] } = trpc.evidences.listByUser.useQuery(
    undefined,
    { enabled: !!userId }
  );
  
  // DEBUG: Verificar se as evidências estão sendo carregadas
  useEffect(() => {
    console.log('[MinhasPendencias] allUserEvidences:', allUserEvidences);
  }, [allUserEvidences]);

  const createEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: async () => {
      toast.success("Evidência enviada com sucesso!");
      setShowEvidenceDialog(false);
      setEvidenceDescription("");
      setEvidenceFile(null);
      setCelebrationAcao(selectedAcaoEvidence);
      setShowCelebrationDialog(true);
      
      // Invalidar queries para atualizar dados
      await utils.evidences.listByUser.invalidate();
      await utils.actions.list.invalidate();
      
      // Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar evidência");
    }
  });

  const handleSubmitEvidence = async () => {
    if (!selectedAcaoEvidence) {
      toast.error("Ação não selecionada");
      return;
    }

    if (!evidenceDescription.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    setIsSubmittingEvidence(true);
    try {
      await createEvidenceMutation.mutateAsync({
        actionId: selectedAcaoEvidence.id,
        descricao: evidenceDescription,
        arquivo: evidenceFile
      });
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleViewDetails = (acao: any) => {
    setSelectedAcaoHistory(acao);
    setShowHistoryDialog(true);
  };

  const handleCloseCelebration = () => {
    setShowCelebrationDialog(false);
    setCelebrationAcao(null);
  };

  // Filtrar ações
  const filteredAcoes = useMemo(() => {
    if (!acoes) return [];
    
    let result = acoes;

    if (searchTerm) {
      result = result.filter((acao: any) =>
        acao.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acao.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "todos") {
      result = result.filter((acao: any) => acao.status === filterStatus);
    }

    return result;
  }, [acoes, searchTerm, filterStatus]);

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Minhas Ações</h1>
          <p className="text-gray-600">Acompanhe o andamento das suas ações do PDI.</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-600">Exibindo {filteredAcoes.length} de {acoes?.length || 0} ações</p>
          </CardContent>
        </Card>

        {/* Lista de Ações */}
        {filteredAcoes.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Nenhuma ação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAcoes.map((acao: any) => {
              return (
                <Card key={acao.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{acao.titulo}</CardTitle>
                        <CardDescription className="mt-1">{acao.descricao}</CardDescription>
                      </div>
                      <Badge variant={acao.status === 'concluida' ? 'default' : 'secondary'}>
                        {acao.status === 'concluida' ? 'Concluída' : 'Pendente'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* Prazo */}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Prazo</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <p className="text-sm font-medium">{formatDate(acao.prazo)}</p>
                        </div>
                      </div>

                      {/* Macro Competência */}
                      {acao.macroId && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Macro</p>
                          <p className="text-sm font-medium mt-1">{macroNames[acao.macroId] || `Competência ${acao.macroId}`}</p>
                        </div>
                      )}

                      {/* Micro Competência */}
                      {acao.microcompetencia && (
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Micro</p>
                          <p className="text-sm font-medium mt-1 truncate">{acao.microcompetencia}</p>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Botão Detalhes - SEMPRE MOSTRA */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(acao)}
                        className="gap-2 flex-1 min-w-[120px]"
                      >
                        <Eye className="h-4 w-4" />
                        Detalhes
                      </Button>

                      {/* Botão Solicitar Alteração - SÓ SE NÃO ESTÁ CONCLUÍDA */}
                      {acao.status !== 'concluida' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-1 min-w-[140px]"
                          onClick={() => {
                            setSelectedAcaoAjuste(acao);
                            setShowAjusteModal(true);
                          }}
                          disabled={adjustmentRequests.some(
                            (req: any) => req.actionId === acao.id && req.status === 'pendente'
                          )}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Solicitar Alteração
                        </Button>
                      )}
                    </div>

                    {/* Status ou Botão de Enviar Evidência */}
                    {acao.status === 'concluida' ? (
                      <div className="mt-4 w-full py-3 px-4 bg-green-100 text-green-700 border border-green-200 rounded-lg font-bold text-center cursor-default">
                        ✓ Ação Concluída
                      </div>
                    ) : (
                      <div className="mt-4 w-full">
                        <button
                          onClick={() => {
                            setSelectedAcaoEvidence(acao);
                            setShowEvidenceDialog(true);
                          }}
                          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-md active:scale-95"
                        >
                          Registrar Minha Conquista
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de Histórico */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                Histórico da Ação
              </DialogTitle>
            </DialogHeader>
            {actionHistory ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedAcaoHistory?.titulo}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedAcaoHistory?.descricao}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{actionHistory}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Celebração */}
        <Dialog open={showCelebrationDialog} onOpenChange={setShowCelebrationDialog}>
          <DialogContent className="max-w-md text-center">
            <div className="py-8">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <DialogTitle className="text-2xl mb-2">Parabéns!</DialogTitle>
              <p className="text-gray-600 mb-4">
                Sua evidência foi enviada com sucesso para análise.
              </p>
              <p className="text-sm text-gray-500">
                Ação: <strong>{celebrationAcao?.titulo}</strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleCloseCelebration} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Evidência */}
        {showEvidenceDialog && selectedAcaoEvidence && (
          <EvidenciaModal
            acao={selectedAcaoEvidence}
            isOpen={showEvidenceDialog}
            onClose={() => {
              setShowEvidenceDialog(false);
              setSelectedAcaoEvidence(null);
              setEvidenceDescription("");
              setEvidenceFile(null);
            }}
            onSubmit={handleSubmitEvidence}
            isLoading={isSubmittingEvidence}
            evidenceDescription={evidenceDescription}
            onDescriptionChange={setEvidenceDescription}
            evidenceFile={evidenceFile}
            onFileChange={setEvidenceFile}
          />
        )}

        {/* Modal de Ajuste */}
        {showAjusteModal && selectedAcaoAjuste && (
          <SolicitarAjusteModalMelhorado
            acao={selectedAcaoAjuste}
            isOpen={showAjusteModal}
            onClose={() => {
              setShowAjusteModal(false);
              setSelectedAcaoAjuste(null);
            }}
            onSuccess={() => {
              setShowAjusteModal(false);
              setSelectedAcaoAjuste(null);
              utils.adjustmentRequests.list.invalidate();
            }}
          />
        )}
      </div>
    </div>
  );
}

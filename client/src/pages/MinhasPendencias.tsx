import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, FileText, Filter, Search, AlertTriangle, Eye, MessageSquare, Upload, History, User, Zap, Sparkles, Trophy, FileArchive, Linkedin, Download, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EvidenciaModal } from "@/components/EvidenciaModal";
import { SolicitarAjusteModal } from "@/components/SolicitarAjusteModal";
import { IIPDashboard } from "@/components/IIPDashboard";
import { SolicitarAjusteModalMelhorado } from "@/components/SolicitarAjusteModalMelhorado";
import RichTextDisplay, { stripHtml } from '@/components/RichTextDisplay';

// Componente de botão para gerar e baixar certificado de conquista
function CertificateButton({ actionId, variant = 'card' }: { actionId: number; variant?: 'card' | 'celebration' }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateCert = trpc.actions.generateCertificate.useMutation();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateCert.mutateAsync({ actionId });
      // Abrir a imagem em nova aba para download
      const link = document.createElement('a');
      link.href = result.url;
      link.download = `conquista-eco-do-bem-${actionId}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Card de conquista gerado! Salve a imagem e compartilhe no LinkedIn.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar o card de conquista');
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === 'celebration') {
    return (
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isGenerating ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> Gerando card...</>
        ) : (
          <><Award className="h-5 w-5" /> Baixar Card de Conquista</>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
    >
      {isGenerating ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
      ) : (
        <><Award className="h-4 w-4" /> Baixar Card de Conquista</>
      )}
    </button>
  );
}

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

// Componente para exibir evidência rejeitada com opção de contestação
function EvidenciaRejeitadaCard({ evidencia, acao, onReenviar }: { evidencia: any; acao: any; onReenviar: () => void }) {
  const [showContestacao, setShowContestacao] = useState(false);
  const [contestacao, setContestacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();
  
  // Mutation para salvar contestação
  const contestarMutation = trpc.evidences.contestar.useMutation({
    onSuccess: () => {
      toast.success("Contestação enviada com sucesso!");
      setShowContestacao(false);
      setContestacao("");
      utils.evidences.listByUser.invalidate();
      utils.actions.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar contestação");
    }
  });
  
  const handleContestar = async () => {
    if (!contestacao.trim()) {
      toast.error("Por favor, escreva sua contestação");
      return;
    }
    setIsSubmitting(true);
    try {
      await contestarMutation.mutateAsync({
        evidenceId: evidencia.id,
        resposta: contestacao
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="w-full space-y-3">
      {/* Card de Rejeição */}
      <div className="w-full py-3 px-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 font-semibold">
          <XCircle className="h-5 w-5 text-red-600" />
          <span>Evidência Rejeitada</span>
        </div>
        {evidencia.justificativaAdmin && (
          <div className="mt-2 text-sm bg-white/50 p-2 rounded border border-red-100">
            <span className="font-medium">Motivo da Rejeição:</span>
            <div className="mt-1">
              <RichTextDisplay content={evidencia.justificativaAdmin} />
            </div>
          </div>
        )}
        <div className="mt-2 text-xs text-red-600">
          Rejeitada em: {evidencia.evaluatedAt ? new Date(evidencia.evaluatedAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
        </div>
        
        {/* Mostrar contestação anterior se houver */}
        {evidencia.respostaColaborador && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs font-medium text-blue-700 mb-1">Sua Contestação Anterior:</div>
            <div className="text-sm text-blue-800">{evidencia.respostaColaborador}</div>
            {evidencia.dataResposta && (
              <div className="text-xs text-blue-600 mt-1">
                Enviada em: {new Date(evidencia.dataResposta).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Campo de Contestação */}
      {showContestacao ? (
        <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <MessageSquare className="h-4 w-4" />
            <span>Contestar Rejeição</span>
          </div>
          <Textarea
            placeholder="Explique por que você discorda da rejeição ou forneça informações adicionais..."
            value={contestacao}
            onChange={(e) => setContestacao(e.target.value)}
            className="min-h-[100px] bg-white"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContestacao(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleContestar}
              disabled={isSubmitting || !contestacao.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                "Enviar Contestação"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Botão para Contestar */}
          <button
            onClick={() => setShowContestacao(true)}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Contestar
          </button>
          {/* Botão para Reenviar */}
          <button
            onClick={onReenviar}
            className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Nova Evidência
          </button>
        </div>
      )}
    </div>
  );
}

export default function MinhasPendencias() {
  const authData = useAuth();
  const user = authData?.user;
  const userId = user?.id;
  const utils = trpc.useUtils();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPdi, setFilterPdi] = useState<string>("todos");
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
  
  // Buscar ações vencidas do usuário
  const { data: minhasAcoesVencidas = [] } = trpc.prazos.minhasVencidas.useQuery(
    undefined,
    { enabled: !!userId }
  );
  
  // DEBUG: Verificar se as evidências estão sendo carregadas
  useEffect(() => {
    console.log('[MinhasPendencias] allUserEvidences:', allUserEvidences);
    console.log('[MinhasPendencias] Total de evidências:', allUserEvidences?.length);
    if (allUserEvidences && allUserEvidences.length > 0) {
      console.log('[MinhasPendencias] Primeira evidência:', allUserEvidences[0]);
    }
  }, [allUserEvidences]);

  // Obter última evidência e seu status (para o modal de envio)
  const ultimaEvidencia = acaoEvidences?.[0];
  const podeEnviarEvidencia = !ultimaEvidencia || ultimaEvidencia.status === 'reprovada';
  const justificativaReprovacao = ultimaEvidencia?.justificativaAdmin;

  const submitEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: () => {
      toast.success("Evidência enviada!");
      utils.actions.list.invalidate();
      utils.evidences.listByUser.invalidate(); // Recarregar todas as evidências do usuário
      setTimeout(() => {
        setShowEvidenceDialog(false);
        setEvidenceDescription("");
        setEvidenceFile(null);
      }, 100);
    },
    onError: (error: any) => {
      const mensagem = error?.message || "Não foi possível enviar. Verifique se o arquivo não é muito grande ou se sua conexão está estável.";
      toast.error(mensagem);
    },
  });

  // Filtrando para garantir que mostra apenas as ações do usuário logado
  const minhasAcoes = useMemo(() => {
    if (!acoes || !userId) return [];
    return acoes.filter((acao: any) => String(acao.responsavelId) === String(userId));
  }, [acoes, userId]);

  const pdiOptions = useMemo(() => {
    const uniquePdis = new Map<string, { id: string; titulo: string }>();

    minhasAcoes.forEach((acao: any) => {
      if (acao?.pdiId) {
        const id = String(acao.pdiId);
        const titulo = acao.pdiTitulo?.trim() || `PDI ${id}`;

        if (!uniquePdis.has(id)) {
          uniquePdis.set(id, { id, titulo });
        }
      }
    });

    return Array.from(uniquePdis.values()).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }, [minhasAcoes]);

  // Detectar mudança de status para celebração
  useEffect(() => {
    if (!minhasAcoes || minhasAcoes.length === 0) return;
    
    const acaoConcluida = minhasAcoes.find((acao: any) => {
      const acaoAnterior = previousAcoes.find((prev: any) => prev.id === acao.id);
      return (
        acaoAnterior?.status === "aguardando_avaliacao" &&
        acao.status === "concluida"
      );
    });

    if (acaoConcluida) {
      setCelebrationAcao(acaoConcluida);
      setShowCelebrationDialog(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563eb", "#f97316", "#fbbf24", "#10b981"],
      });
    }

    setPreviousAcoes(minhasAcoes);
  }, [minhasAcoes]);

  // Filtrar ações com base em busca, status e PDI
  const filteredAcoes = useMemo(() => {
    return minhasAcoes.filter((acao: any) => {
      // Filtro de busca (título ou descrição)
      const matchesSearch =
        searchTerm === "" ||
        acao.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acao.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus = filterStatus === "todos" || acao.status === filterStatus;

      // Filtro de PDI
      const matchesPdi = filterPdi === "todos" || String(acao.pdiId) === filterPdi;

      return matchesSearch && matchesStatus && matchesPdi;
    }).sort((a: any, b: any) => {
      // Ordenar por data de entrega (prazo) - mais próximas primeiro
      const prazoA = a.prazo ? new Date(a.prazo).getTime() : Infinity;
      const prazoB = b.prazo ? new Date(b.prazo).getTime() : Infinity;
      return prazoA - prazoB;
    });
  }, [minhasAcoes, searchTerm, filterStatus, filterPdi]);

  // Função para obter badge de status
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      nao_iniciada: { variant: "outline", label: "Não Iniciada", className: "bg-gray-50 text-gray-700 border-gray-300" },
      em_andamento: { variant: "default", label: "Em Andamento", className: "bg-blue-500 text-white" },
      concluida: { variant: "outline", label: "Concluída", className: "bg-green-50 text-green-700 border-green-300" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.nao_iniciada;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  // Função para formatar data
  const formatDate = (date: any) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR");
  };

  // Função para abrir detalhes
  const handleViewDetails = (acao: any) => {
    setSelectedAcao(acao);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
          Minhas Ações
        </h1>
        <p className="text-muted-foreground">
          Acompanhe o andamento das suas ações do PDI.
        </p>
      </div>

      {/* IIP - Visão da Empresa (sem filtros de departamento/empregado) */}
      <div className="mb-6">
        <IIPDashboard userRole="colaborador" />
      </div>

      {/* Banner de Alerta - Ações Vencidas */}
      {minhasAcoesVencidas.length > 0 && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Atenção: Você tem {minhasAcoesVencidas.length} ação(s) com prazo vencido!</h3>
                <p className="text-sm text-red-700 mt-1">Por favor, priorize a conclusão dessas ações ou solicite um ajuste de prazo ao seu líder.</p>
                <div className="mt-3 space-y-2">
                  {minhasAcoesVencidas.slice(0, 3).map((acao: any) => (
                    <div key={acao.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                      <span className="text-sm font-medium text-red-800">{acao.titulo}</span>
                      <span className="text-xs text-red-600 font-bold">{acao.diasVencido} dias atrasado</span>
                    </div>
                  ))}
                  {minhasAcoesVencidas.length > 3 && (
                    <p className="text-xs text-red-600">+ {minhasAcoesVencidas.length - 3} outras ações vencidas</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por Título */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="nao_iniciada">Não Iniciada</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de PDI */}
            <Select value={filterPdi} onValueChange={setFilterPdi}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por PDI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os PDIs</SelectItem>
                {pdiOptions.map((pdi) => (
                  <SelectItem key={pdi.id} value={pdi.id}>
                    {pdi.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Exibindo <strong>{filteredAcoes.length}</strong> de <strong>{minhasAcoes.length}</strong> ações
          </p>
        </CardContent>
      </Card>

      {/* Lista de Ações */}
      {filteredAcoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma ação encontrada</p>
            <p className="text-sm text-muted-foreground mt-2">
              {minhasAcoes.length === 0
                ? "Você ainda não possui ações cadastradas."
                : "Nenhuma ação corresponde aos filtros selecionados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAcoes.map((acao: any) => {
            return (
              <Card key={acao.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{acao.titulo}</CardTitle>
                      {acao.pdiTitulo && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">
                          {acao.pdiTitulo}
                        </p>
                      )}
                      <CardDescription className="mt-1 line-clamp-2">
                        {acao.descricao ? stripHtml(acao.descricao) : "Sem descrição"}
                      </CardDescription>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(acao.status)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(acao)}
                      className="gap-2 flex-1 min-w-[120px]"
                    >
                      <Eye className="h-4 w-4" />
                      Detalhes
                    </Button>

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

                    {/* Card de Feedback de Solicitação de Ajuste */}
                    {(() => {
                      // Buscar solicitações avaliadas (aprovadas ou reprovadas) para esta ação
                      const solicitacoesAvaliadas = adjustmentRequests.filter(
                        (req: any) => req.actionId === acao.id && (req.status === 'aprovada' || req.status === 'reprovada')
                      );
                      
                      // Pegar a mais recente
                      const ultimaSolicitacao = solicitacoesAvaliadas.sort((a: any, b: any) => 
                        new Date(b.evaluatedAt || b.createdAt).getTime() - new Date(a.evaluatedAt || a.createdAt).getTime()
                      )[0];
                      
                      if (!ultimaSolicitacao) return null;
                      
                      const isAprovada = ultimaSolicitacao.status === 'aprovada';
                      const isReprovada = ultimaSolicitacao.status === 'reprovada';
                      
                      return (
                        <div className={`w-full mt-2 p-3 rounded-lg border ${
                          isAprovada 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                          <div className="flex items-center gap-2 font-semibold text-sm">
                            {isAprovada ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Solicitação de Ajuste #{ultimaSolicitacao.id} - APROVADA</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span>Solicitação de Ajuste #{ultimaSolicitacao.id} - NÃO ACEITA</span>
                              </>
                            )}
                          </div>
                          {!isAprovada && ultimaSolicitacao.justificativaAdmin && (
                            <div className="mt-2 text-xs bg-white/50 p-2 rounded border border-red-100">
                              <span className="font-medium">Motivo:</span>
                              <div className="mt-1">
                                <RichTextDisplay content={ultimaSolicitacao.justificativaAdmin} />
                              </div>
                            </div>
                          )}
                          {isAprovada && (
                            <div className="mt-1 text-xs opacity-75">
                              Alterações aplicadas com sucesso
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="mt-4 w-full">
                      {(() => {
                        // CORREÇÃO 1: Filtro com comparação STRING segura
                        const evidenciaDesta_Acao = allUserEvidences?.find(
                          (e: any) => String(e.actionId) === String(acao.id)
                        );
                        
                        console.log(`[DEBUG] Ação ${acao.id} (status: ${acao.status}). Evidência encontrada:`, evidenciaDesta_Acao);
                        
                        // CASO 1: AÇÃO APROVADA/CONCLUÍDA - PRIORIDADE MÁXIMA
                        if (acao.status === 'concluida') {
                          const linkedinText = encodeURIComponent(
                            `Concluí mais uma etapa do meu Plano de Desenvolvimento Individual (PDI)!\n\nAção: "${acao.titulo}"${acao.macroId && macroNames[acao.macroId] ? `\nCompetência: "${macroNames[acao.macroId]}"` : ''}\n\nInvestindo no meu crescimento profissional com o programa Eco do Bem - EVOLUIR!\n\n@competênciasdobem @ecobem\n\n#DesenvolvimentoProfissional #PDI #EcoDoBem #EVOLUIR #CrescimentoProfissional`
                          );
                          const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${linkedinText}`;
                          return (
                            <div className="w-full space-y-2">
                              <div className="w-full py-3 px-4 bg-green-100 text-green-700 border border-green-200 rounded-lg font-bold flex flex-col items-center justify-center cursor-default">
                                <div className="flex items-center justify-center">
                                  <span className="mr-2">✓</span> Ação Concluída
                                </div>
                                <div className="text-[10px] mt-1 font-mono">
                                  ID VALIDAÇÃO: {evidenciaDesta_Acao?.id || 'BUSCANDO NO BANCO...'}
                                </div>
                              </div>
                              <button
                                onClick={() => window.open(linkedinUrl, '_blank')}
                                className="w-full py-2.5 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm"
                              >
                                <Linkedin className="h-4 w-4" />
                                Compartilhar Conquista no LinkedIn
                              </button>
                              <CertificateButton actionId={acao.id} />
                            </div>
                          );
                        }
                        
                        // CASO 2: EM ANÁLISE
                        if (evidenciaDesta_Acao?.status === 'aguardando_avaliacao') {
                          return (
                            <div className="w-full py-3 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium flex items-center justify-center cursor-wait">
                              <span className="mr-2">⏳</span> Evidência em Análise
                            </div>
                          );
                        }
                        
                        // CASO 3: EVIDÊNCIA REJEITADA - MOSTRAR MOTIVO E PERMITIR CONTESTAÇÃO/REENVIO
                        if (evidenciaDesta_Acao?.status === 'reprovada') {
                          return (
                            <EvidenciaRejeitadaCard
                              evidencia={evidenciaDesta_Acao}
                              acao={acao}
                              onReenviar={() => {
                                setSelectedAcaoEvidence(acao);
                                setShowEvidenceDialog(true);
                              }}
                            />
                          );
                        }
                        
                        // CASO 4: BOTÃO AZUL - SÓ MOSTRA SE NÃO FOR NENHUM DOS ACIMA
                        return (
                          <button
                            onClick={() => {
                              setSelectedAcaoEvidence(acao);
                              setShowEvidenceDialog(true);
                            }}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-md active:scale-95"
                          >
                            Registrar Minha Conquista
                          </button>
                        );
                      })()}
                    </div>
                  </div>
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
              Histórico de Mudanças
            </DialogTitle>
            <DialogDescription>
              {selectedAcaoHistory?.titulo}
            </DialogDescription>
          </DialogHeader>

          {actionHistory && actionHistory.length > 0 ? (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                {actionHistory.map((entry: any, index: number) => {
                  const isSystem = entry.mudadoPor === "sistema" || !entry.usuarioNome;
                  const timestamp = new Date(entry.dataMudanca).toLocaleString("pt-BR");
                  
                  return (
                    <div key={index} className="flex gap-4 pb-6 relative">
                      {/* Linha vertical */}
                      {index < actionHistory.length - 1 && (
                        <div className="absolute left-5 top-12 w-0.5 h-12 bg-gray-200" />
                      )}

                      {/* Ícone e ponto */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSystem 
                            ? "bg-blue-100 text-blue-600" 
                            : "bg-orange-100 text-orange-600"
                        }`}>
                          {isSystem ? (
                            <Zap className="h-5 w-5" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">
                            {isSystem ? "Alteração do Sistema" : entry.usuarioNome || "Usuário"}
                          </p>
                          <span className="text-xs text-muted-foreground">{timestamp}</span>
                        </div>

                        {/* Mudanças */}
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                          {entry.campoAlterado && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">
                                Campo: {entry.campoAlterado}
                              </p>
                              <div className="flex gap-2 items-start">
                                {/* Valor Antigo */}
                                {entry.valorAntigo && (
                                  <div className="flex-1 bg-red-50 border border-red-200 rounded p-2">
                                    <p className="text-xs text-red-600 font-medium mb-1">Antigo:</p>
                                    <p className="text-sm text-red-800 break-words">
                                      {entry.valorAntigo}
                                    </p>
                                  </div>
                                )}
                                {/* Valor Novo */}
                                {entry.valorNovo && (
                                  <div className="flex-1 bg-green-50 border border-green-200 rounded p-2">
                                    <p className="text-xs text-green-600 font-medium mb-1">Novo:</p>
                                    <p className="text-sm text-green-800 break-words">
                                      {entry.valorNovo}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Motivo/Descrição */}
                          {entry.motivo && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Motivo:</p>
                              <p className="text-sm text-gray-700">{entry.motivo}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-muted-foreground">Nenhuma alteração registrada ainda</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAcao?.titulo}</DialogTitle>
            <DialogDescription>
              Detalhes completos da ação
            </DialogDescription>
          </DialogHeader>

          {selectedAcao && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <div className="mt-1">{selectedAcao.descricao ? <RichTextDisplay content={selectedAcao.descricao} /> : "Sem descrição"}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedAcao.status)}</div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prazo</p>
                  <p className="mt-1">{formatDate(selectedAcao.prazo)}</p>
                </div>

                {selectedAcao.macroId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Macro Competência</p>
                    <p className="mt-1">{macroNames[selectedAcao.macroId] || `Competência ${selectedAcao.macroId}`}</p>
                  </div>
                )}

                {selectedAcao.microcompetencia && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Micro Competência</p>
                    <p className="mt-1">{selectedAcao.microcompetencia}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Envio de Evidência com Fluxo de Email */}
      <EvidenciaModal
        open={showEvidenceDialog}
        onOpenChange={setShowEvidenceDialog}
        actionId={selectedAcaoEvidence?.id || 0}
        actionNome={selectedAcaoEvidence?.titulo || ""}
        macrocompetencia={selectedAcaoEvidence?.macroNome || ""}
        descricao={selectedAcaoEvidence?.descricao || ""}
        prazo={selectedAcaoEvidence?.prazo || null}
        onSuccess={() => {
          utils.actions.list.invalidate();
        }}
      />

      {/* Modal de Celebração */}
      <Dialog open={showCelebrationDialog} onOpenChange={setShowCelebrationDialog}>
        <DialogContent className="max-w-md bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 border-2 border-yellow-300">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500 drop-shadow-lg" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-yellow-700">
              Parabéns{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Meta Batida!
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-4 text-gray-700">
              Sua evidência foi aprovada e você concluiu mais uma etapa do seu PDI. Continue assim!
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Ação concluída:</p>
            <p className="font-semibold text-lg text-blue-600">{celebrationAcao?.titulo}</p>
          </div>

          <div className="text-center text-sm text-gray-500 mb-2">
            Que tal compartilhar essa conquista?
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            {celebrationAcao?.id && (
              <CertificateButton actionId={celebrationAcao.id} variant="celebration" />
            )}
            <button
              onClick={() => {
                const linkedinText = encodeURIComponent(
                  `Concluí mais uma etapa do meu Plano de Desenvolvimento Individual (PDI)!\n\nAção: "${celebrationAcao?.titulo || ''}"\n\nInvestindo no meu crescimento profissional com o programa Eco do Bem - EVOLUIR!\n\n@competênciasdobem @ecobem\n\n#DesenvolvimentoProfissional #PDI #EcoDoBem #EVOLUIR #CrescimentoProfissional`
                );
                window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${linkedinText}`, '_blank');
              }}
              className="w-full py-3 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Linkedin className="h-5 w-5" />
              Compartilhar no LinkedIn
            </button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCelebrationDialog(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitar Ajuste Melhorado */}
      <SolicitarAjusteModalMelhorado
        open={showAjusteModal}
        onOpenChange={setShowAjusteModal}
        actionId={selectedAcaoAjuste?.id || ""}
        actionTitle={selectedAcaoAjuste?.titulo || ""}
        currentData={{
          titulo: selectedAcaoAjuste?.titulo,
          descricao: selectedAcaoAjuste?.descricao,
          prazo: selectedAcaoAjuste?.prazo,
          macroCompetencia: selectedAcaoAjuste?.macroCompetencia,
        }}
        hasPendingRequest={hasPendingAdjustmentRequest}
        onSuccess={() => {
          utils.adjustmentRequests.list.invalidate();
        }}
      />
    </div>
  );
}

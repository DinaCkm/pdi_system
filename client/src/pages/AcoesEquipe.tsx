import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, History, Calendar, Filter, X } from "lucide-react";
import { HistoryModal } from "@/components/HistoryModal";

export default function AcoesEquipe() {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyActionId, setHistoryActionId] = useState<number | null>(null);

  // --- ESTADOS DOS FILTROS ---
  const [filtroColaborador, setFiltroColaborador] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. BUSCA DE AÇÕES DA EQUIPE
  const { data: acoes = [], isLoading } = trpc.actions.teamActions.useQuery();
  
  // 2. FUNÇÕES DE LEITURA DE DADOS
  const getColabName = (acao: any) => {
    return acao.pdi?.colaboradorNome 
        || acao.colaboradorNome 
        || "Colaborador não identificado";
  };

  const getPdiTitle = (acao: any) => {
    return acao.pdi?.titulo || acao.pdiTitulo || "PDI Geral";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      nao_iniciada: { className: "bg-gray-100 text-gray-800 border-gray-300", label: "Não Iniciada" },
      em_andamento: { className: "bg-blue-100 text-blue-800 border-blue-300", label: "Em Andamento" },
      concluida: { className: "bg-green-100 text-green-800 border-green-300", label: "Concluída" },
      cancelada: { className: "bg-red-100 text-red-800 border-red-300", label: "Cancelada" },
      aguardando_avaliacao: { className: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Aguardando Avaliação" },
    };
    const variant = variants[status] || variants.nao_iniciada;
    return variant;
  };

  // 3. OPÇÕES DE FILTRO
  const { colaboradoresUnicos, statusUnicos } = useMemo(() => {
    const colabs = new Set<string>();
    const statuses = new Set<string>();

    acoes.forEach((acao: any) => {
      const c = getColabName(acao);
      if (c && c !== "Colaborador não identificado") colabs.add(c);
      if (acao.status) statuses.add(acao.status);
    });

    return {
      colaboradoresUnicos: Array.from(colabs).sort(),
      statusUnicos: Array.from(statuses).sort(),
    };
  }, [acoes]);

  // 4. LÓGICA DE FILTRAGEM
  const filteredAcoes = acoes.filter((acao: any) => {
    const colab = getColabName(acao);
    const textoGeral = (acao.titulo + (acao.descricao || "") + colab).toLowerCase();
    const termoBusca = searchTerm.toLowerCase();

    if (filtroColaborador && colab !== filtroColaborador) return false;
    if (filtroStatus && acao.status !== filtroStatus) return false;
    if (searchTerm && !textoGeral.includes(termoBusca)) return false;

    return true;
  });

  const clearFilters = () => {
    setFiltroColaborador("");
    setFiltroStatus("");
    setSearchTerm("");
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Ações da Equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Total: {acoes.length} | Exibindo: {filteredAcoes.length}
          </p>
        </div>
      </div>

      {/* --- FILTROS --- */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-foreground">
          <Filter size={16} /> Filtros de Segmentação
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Colaborador */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Colaborador</label>
            <select
              value={filtroColaborador}
              onChange={(e) => setFiltroColaborador(e.target.value)}
              className="p-2 rounded-md border border-input bg-background"
            >
              <option value="">Todos</option>
              {colaboradoresUnicos.map(colab => <option key={colab} value={colab}>{colab}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="p-2 rounded-md border border-input bg-background"
            >
              <option value="">Todos</option>
              {statusUnicos.map(status => {
                const badge = getStatusBadge(status);
                return <option key={status} value={status}>{badge.label}</option>;
              })}
            </select>
          </div>

          {/* Busca */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Busca</label>
            <Input
              placeholder="Título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {(filtroColaborador || filtroStatus || searchTerm) && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X size={14} /> Limpar Filtros
          </Button>
        )}
      </Card>

      {/* --- LISTA DE AÇÕES --- */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAcoes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma ação encontrada com os filtros selecionados.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAcoes.map((acao: any) => {
            const statusBadge = getStatusBadge(acao.status);
            return (
              <Card key={acao.id} className="p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base break-words">{acao.titulo}</h3>
                    <p className="text-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap max-w-full">{acao.descricao}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                      <span className="text-muted-foreground">
                        <strong>Colaborador:</strong> {getColabName(acao)}
                      </span>
                      <span className="text-muted-foreground">
                        <strong>PDI:</strong> {getPdiTitle(acao)}
                      </span>
                      {acao.prazo && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar size={14} />
                          {new Date(acao.prazo).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      <Badge className={`border ${statusBadge.className}`}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHistoryActionId(acao.id);
                        setHistoryModalOpen(true);
                      }}
                      title="Ver histórico"
                    >
                      <History size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL DE HISTÓRICO */}
      {historyModalOpen && (
        <HistoryModal
          actionId={historyActionId}
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setHistoryActionId(null);
          }}
        />
      )}
    </div>
  );
}

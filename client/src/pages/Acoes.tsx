import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Eye, History, Building, Target, Calendar, Filter, X } from "lucide-react";
import { useLocation } from "wouter";
import { HistoryModal } from "@/components/HistoryModal";
import { useAuth } from "@/_core/hooks/useAuth";

// Hook para buscar nomes de competências
function useMacroNames(macroIds: number[]) {
  const { data: competencias = [] } = trpc.competencias.list.useQuery();
  
  return useMemo(() => {
    const map: Record<number, string> = {};
    competencias.forEach((comp: any) => {
      map[comp.id] = comp.nome;
    });
    return map;
  }, [competencias]);
}

export default function Acoes() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyActionId, setHistoryActionId] = useState<number | null>(null);
  
  // Gerente tem acesso somente leitura
  const isReadOnly = user?.role === 'gerente';

  // --- ESTADOS DOS FILTROS ---
  const [filtroDepartamento, setFiltroDepartamento] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState("");
  const [filtroPDI, setFiltroPDI] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroSemVinculo, setFiltroSemVinculo] = useState(false);

  // 1. BUSCA TURBO (LIMIT 1000)
  const { data: acoes = [], isLoading, refetch } = trpc.actions.list.useQuery({ limit: 1000 });
  
  // Buscar nomes de competências
  const macroIds = useMemo(() => [...new Set(acoes.map((a: any) => a.macroId).filter(Boolean))], [acoes]);
  const macroNames = useMacroNames(macroIds);
  
  const utils = trpc.useUtils();
  
  const deleteMutation = trpc.actions.delete.useMutation({
    onSuccess: () => {
      toast.success("Ação removida.");
      utils.actions.list.invalidate();
      refetch();
    },
    onError: (error) => toast.error(error.message || "Erro ao deletar"),
  });

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta ação?")) {
      deleteMutation.mutate({ id });
    }
  };

  // 2. FUNÇÕES DE LEITURA DE DADOS (REFINADAS COM MELHOR FALLBACK)
  const getDeptName = (acao: any) => {
    if (acao.departamentoNome && acao.departamentoNome !== "Departamento não informado") {
      return acao.departamentoNome;
    }
    if (acao.pdi?.departamentoNome && acao.pdi.departamentoNome !== "—") {
      return acao.pdi.departamentoNome;
    }
    return "Departamento não informado";
  };

  const getColabName = (acao: any) => {
    if (acao.colaboradorNome && acao.colaboradorNome !== "Colaborador não identificado") {
      return acao.colaboradorNome;
    }
    if (acao.pdi?.colaboradorNome && acao.pdi.colaboradorNome !== "—") {
      return acao.pdi.colaboradorNome;
    }
    return "Colaborador não identificado";
  };

  const getPdiTitle = (acao: any) => {
    if (acao.pdiTitulo && acao.pdiTitulo !== "PDI Geral") {
      return acao.pdiTitulo;
    }
    if (acao.pdi?.titulo && acao.pdi.titulo !== "—") {
      return acao.pdi.titulo;
    }
    return "PDI Geral";
  };

  // 3. OPÇÕES DE FILTRO
  const { departamentosUnicos, colaboradoresUnicos, pdisUnicos } = useMemo(() => {
    const deptos = new Set<string>();
    const colabs = new Set<string>();
    const pdis = new Set<string>();

    acoes.forEach((acao: any) => {
      const d = getDeptName(acao);
      const c = getColabName(acao);
      const p = getPdiTitle(acao);

      if (d && d !== "Departamento não informado") deptos.add(d);
      if (c && c !== "Colaborador não identificado") colabs.add(c);
      if (p) pdis.add(p);
    });

    return {
      departamentosUnicos: Array.from(deptos).sort(),
      colaboradoresUnicos: Array.from(colabs).sort(),
      pdisUnicos: Array.from(pdis).sort(),
    };
  }, [acoes]);

  // 4. LÓGICA DE FILTRAGEM (COM FALLBACK SEGURO)
  const filteredAcoes = acoes.filter((acao: any) => {
    const dept = getDeptName(acao);
    const colab = getColabName(acao);
    const pdi = getPdiTitle(acao);
    
    const textoGeral = (
      (acao.titulo || "") + 
      " " + 
      (acao.descricao || "") + 
      " " + 
      colab
    ).toLowerCase();
    const termoBusca = searchTerm.toLowerCase();

    // Filtro de ações sem vínculo (orfãs)
    if (filtroSemVinculo) {
      const temVinculo = dept !== "Departamento não informado" && colab !== "Colaborador não identificado";
      if (temVinculo) return false;
    }

    if (filtroDepartamento && dept !== filtroDepartamento) return false;
    if (filtroColaborador && colab !== filtroColaborador) return false;
    if (filtroPDI && pdi !== filtroPDI) return false;
    if (searchTerm && !textoGeral.includes(termoBusca)) return false;

    return true;
  });

  const clearFilters = () => {
    setFiltroDepartamento("");
    setFiltroColaborador("");
    setFiltroPDI("");
    setSearchTerm("");
    setFiltroSemVinculo(false);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0", fontSize: "28px", fontWeight: "800", color: "#111827" }}>
            Painel de Ações
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
            Total: {acoes.length} | Exibindo: {filteredAcoes.length}
          </p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={() => navigate("/acoes/nova")}
            style={{ backgroundColor: "#2563eb", color: "white", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
          >
            <Plus size={20} /> Nova Ação
          </Button>
        )}
      </div>

      {/* --- FILTROS --- */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#374151", fontWeight: "600", fontSize: "14px" }}>
          <Filter size={16} /> Filtros de Segmentação
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {/* Depto */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>1. Departamento</label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: filtroDepartamento ? "#eff6ff" : "white", width: "100%" }}
            >
              <option value="">Todos</option>
              {departamentosUnicos.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>

          {/* Colaborador */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>2. Colaborador</label>
            <select
              value={filtroColaborador}
              onChange={(e) => setFiltroColaborador(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: filtroColaborador ? "#eff6ff" : "white", width: "100%" }}
            >
              <option value="">Todos</option>
              {colaboradoresUnicos.map(colab => <option key={colab} value={colab}>{colab}</option>)}
            </select>
          </div>

          {/* PDI */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>3. PDI Origem</label>
            <select
              value={filtroPDI}
              onChange={(e) => setFiltroPDI(e.target.value)}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: filtroPDI ? "#eff6ff" : "white", width: "100%" }}
            >
              <option value="">Todos</option>
              {pdisUnicos.map(pdi => <option key={pdi} value={pdi}>{pdi}</option>)}
            </select>
          </div>

          {/* Busca */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Busca Rápida</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              {(filtroDepartamento || filtroColaborador || filtroPDI || searchTerm || filtroSemVinculo) && (
                <Button variant="ghost" onClick={clearFilters} style={{ padding: "0 10px", color: "#ef4444" }} title="Limpar Filtros">
                  <X size={18} />
                </Button>
              )}
            </div>
          </div>

          {/* Filtro de Ações sem Vínculo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", justifyContent: "flex-end" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Limpeza</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "6px", border: "1px solid #fee2e2", backgroundColor: filtroSemVinculo ? "#fee2e2" : "white", cursor: "pointer" }} onClick={() => setFiltroSemVinculo(!filtroSemVinculo)}>
              <input
                type="checkbox"
                checked={filtroSemVinculo}
                onChange={(e) => setFiltroSemVinculo(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: "13px", fontWeight: "600", color: filtroSemVinculo ? "#dc2626" : "#6b7280" }}>Ações sem Vínculo</span>
            </div>
          </div>
        </div>
      </div>

      {/* LISTAGEM */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px", color: "#6b7280" }}>
          <Loader2 size={40} className="animate-spin text-blue-600" />
          <p style={{ marginTop: "10px" }}>Carregando dados...</p>
        </div>
      ) : filteredAcoes.length === 0 ? (
        <Card style={{ padding: "60px", textAlign: "center", color: "#6b7280", border: "1px dashed #e5e7eb", backgroundColor: "transparent" }}>
          <p style={{ fontSize: "16px" }}>Nenhuma ação encontrada com estes filtros.</p>
          <Button variant="outline" onClick={clearFilters} style={{ marginTop: "10px" }}>
            Limpar Filtros
          </Button>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {filteredAcoes.map((acao: any) => {
            const nomeColaborador = getColabName(acao);
            const nomeDepartamento = getDeptName(acao);
            const tituloPdi = getPdiTitle(acao);
            const competencia = acao.microcompetencia || acao.macro?.nome || acao.macroNome || (acao.macroId ? macroNames[acao.macroId] || `Competência ${acao.macroId}` : "Geral");
            const dataFormatada = acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : "--/--/----";

            return (
              <Card key={acao.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  
                  {/* --- HEADER COM RÓTULOS CLAROS --- */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", backgroundColor: "white" }}>
                    
                    {/* Linha do Título */}
                    <div style={{ marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            Título da Ação:
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: "4px" }}>
                              ID: {String(acao.id).padStart(5, '0')}
                            </span>
                            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1f2937", margin: 0 }}>
                            {acao.titulo}
                            </h3>
                            <Badge variant={acao.status === "concluida" ? "default" : "secondary"}>
                            {acao.status === "concluida" ? "Concluída" : "Em Andamento"}
                            </Badge>
                        </div>
                    </div>

                    {/* Linha da Descrição (CORTADA EM 2 LINHAS) */}
                    <div>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                            Descritivo:
                        </span>
                        <p style={{ 
                            margin: 0, 
                            fontSize: "14px", 
                            color: "#4b5563",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>
                            {acao.descricao || "Sem detalhes adicionais."}
                        </p>
                    </div>

                  </div>

                  {/* DETALHES TÉCNICOS */}
                  <div style={{ padding: "20px", backgroundColor: "#f9fafb" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                      
                      {/* Depto e Colab */}
                      <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ padding: "8px", backgroundColor: nomeColaborador === "Colaborador não identificado" || nomeDepartamento === "Departamento não informado" ? "#fee2e2" : "#dbeafe", borderRadius: "8px", color: nomeColaborador === "Colaborador não identificado" || nomeDepartamento === "Departamento não informado" ? "#991b1b" : "#1e40af", height: "fit-content" }}>
                          <Building size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase" }}>Departamento / Colaborador</span>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: nomeDepartamento === "Departamento não informado" ? "#dc2626" : "#111827" }}>
                            {nomeDepartamento}
                            {nomeDepartamento === "Departamento não informado" && (
                              <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "700", color: "#dc2626", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "4px" }}>
                                ⚠️ INATIVO/DELETADO
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "13px", color: nomeColaborador === "Colaborador não identificado" ? "#dc2626" : "#4b5563" }}>
                            {nomeColaborador}
                            {nomeColaborador === "Colaborador não identificado" && (
                              <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "700", color: "#dc2626", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "4px" }}>
                                ⚠️ USUÁRIO DELETADO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PDI Info */}
                      <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ padding: "8px", backgroundColor: "#d1fae5", borderRadius: "8px", color: "#065f46", height: "fit-content" }}>
                          <Target size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase" }}>Origem da Ação</span>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{tituloPdi}</div>
                          <div style={{ fontSize: "13px", color: "#4b5563" }}>Foco: {competencia}</div>
                        </div>
                      </div>

                      {/* Prazo */}
                      <div style={{ display: "flex", gap: "10px" }}>
                        <div style={{ padding: "8px", backgroundColor: "#ffedd5", borderRadius: "8px", color: "#9a3412", height: "fit-content" }}>
                          <Calendar size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase" }}>Prazo</span>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{dataFormatada}</div>
                        </div>
                      </div>
                    </div>

                    {/* Botões - CORRIGIDO O VISUALIZAR */}
                    <div style={{ display: "flex", gap: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/acoes/${acao.id}`)}
                        style={{ flex: 1, backgroundColor: "white" }}
                      >
                        <Eye size={16} className="mr-2" /> Visualizar
                      </Button>

                      {!isReadOnly && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate(`/acoes/editar/${acao.id}`)} 
                          style={{ flex: 1, backgroundColor: "white" }}
                        >
                          <Edit size={16} className="mr-2" /> Editar
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { 
                            setHistoryActionId(acao.id); 
                            setHistoryModalOpen(true); 
                        }} 
                      >
                        <History size={16} />
                      </Button>

                      {!isReadOnly && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(acao.id)} 
                          disabled={deleteMutation.isPending} 
                          style={{ color: "#ef4444" }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {historyActionId && (
        <HistoryModal
          isOpen={historyModalOpen}
          actionId={historyActionId}
          onClose={() => {
            setHistoryModalOpen(false);
            setHistoryActionId(null);
          }}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DataTablePDIs } from "@/components/DataTablePDIs";
import { Plus, Loader2, Search, FileText, Upload, X, FileDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PDIs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showModal, setShowModal] = useState(false);
  
  // Estados do Formulário
  const [selectedColaborador, setSelectedColaborador] = useState<string>("");
  const [selectedCiclo, setSelectedCiclo] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [objetivoGeral, setObjetivoGeral] = useState("");
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);
  
  // Estado para busca de colaborador (Filtro)
  const [userSearchTerm, setUserSearchTerm] = useState("");
  
  // Estado para relatório de análise
  const [relatorioAnalise, setRelatorioAnalise] = useState("");

  // 1. CARREGAMENTO TURBO (LIMIT 1000)
  // Isso resolve o problema de usuários sumindo da lista
  const { data: usuariosResult = [] } = trpc.users.list.useQuery({ limit: 1000 });
  
  // Tratamento de segurança: Garante que é array mesmo se vier paginado
  const usuarios = Array.isArray(usuariosResult) ? usuariosResult : (usuariosResult?.items || []);

  const { data: ciclos = [] } = trpc.ciclos.list.useQuery();
  const utils = trpc.useUtils();

  // 2. FILTRO INTELIGENTE
  // Filtra colaboradores baseado no que você digita na busca
  const colaboradores = usuarios.filter((u: any) => {
    // Primeiro, pega só quem é colaborador ou líder (exclui admin puro)
    const isElegivel = u.role === "colaborador" || u.role === "lider";
    if (!isElegivel) return false;

    // Depois aplica a busca por nome
    if (!userSearchTerm) return true; // Se não digitou nada, mostra todos
    return u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
           u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
  });

  // Mutations
  const createPDIMutation = trpc.pdis.create.useMutation({
    onSuccess: () => {
      toast.success("PDI criado com sucesso!");
      resetForm();
      utils.pdis.list.invalidate();
      if (utils.pdis.myPDIs) {
        utils.pdis.myPDIs.invalidate();
      }
      setTimeout(() => setShowModal(false), 300);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar PDI");
    },
  });

  const createBulkMutation = trpc.pdis.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${data.created} PDIs criados! ${data.skipped} colaboradores pulados.`
      );
      resetForm();
      utils.pdis.list.invalidate();
      if (utils.pdis.myPDIs) {
        utils.pdis.myPDIs.invalidate();
      }
      setTimeout(() => setShowModal(false), 300);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar PDIs em lote");
    },
  });

  // Redirecionar se não for Admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      if (user.role === "lider") {
        setLocation("/pdis-equipe");
      } else {
        setLocation("/meu-pdi");
      }
    }
  }, [user, setLocation]);

  if (user?.role !== "admin") {
    return null;
  }

  const resetForm = () => {
    setSelectedColaborador("");
    setSelectedCiclo("");
    setTitulo("");
    setObjetivoGeral("");
    setRelatorioAnalise("");
    setUserSearchTerm(""); // Limpa a busca também
    setIsCreatingBulk(false);
  };

  const handleCreateIndividual = () => {
    // Validação rígida para evitar erro de servidor
    if (!selectedColaborador) {
      toast.error("Selecione um colaborador da lista");
      return;
    }
    if (!selectedCiclo) {
      toast.error("Selecione um ciclo");
      return;
    }
    if (!titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    createPDIMutation.mutate({
      colaboradorId: Number(selectedColaborador),
      cicloId: Number(selectedCiclo),
      titulo,
      objetivoGeral: objetivoGeral || undefined,
      relatorioAnalise: relatorioAnalise || undefined,
    });
  };

  const handleCreateBulk = () => {
    if (!selectedCiclo || !titulo) {
      toast.error("Selecione o ciclo e preencha o título");
      return;
    }

    createBulkMutation.mutate({
      cicloId: Number(selectedCiclo),
      titulo,
      objetivoGeral: objetivoGeral || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-4">
        {/* Informação de Ciclo Ativo */}
        {ciclos.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900">
              Ciclo Atual: <span className="font-bold">{ciclos[0]?.nome}</span>
              {ciclos[0]?.dataInicio && ciclos[0]?.dataFim && (
                <span className="text-blue-700 ml-2">
                  ({new Date(ciclos[0].dataInicio).toLocaleDateString('pt-BR')} - {new Date(ciclos[0].dataFim).toLocaleDateString('pt-BR')})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Gestão de PDIs
            </h1>
            <p className="text-muted-foreground mt-1">
              Central de controle de Planos de Desenvolvimento Individual
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Novo PDI
          </button>
        </div>

        {/* DataTable de PDIs */}
        <div>
          <DataTablePDIs />
        </div>

        {/* Modal de Criação de PDI */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Criar Novo PDI</h2>
              <p className="text-gray-600 mb-6 text-sm">
                {isCreatingBulk
                  ? "Criar PDI em massa para todos sem plano neste ciclo."
                  : "Criar PDI individual para um colaborador."}
              </p>

              <div className="space-y-5">
                {/* Seletor de Ciclo */}
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Ciclo Semestral *</label>
                  <select
                    className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedCiclo}
                    onChange={(e) => setSelectedCiclo(e.target.value)}
                  >
                    <option value="">Selecione um ciclo...</option>
                    {ciclos?.map((ciclo: any) => (
                      <option key={ciclo.id} value={ciclo.id.toString()}>
                        {ciclo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Toggle: Individual vs Lote */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-md">
                  <button
                    onClick={() => setIsCreatingBulk(false)}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                      !isCreatingBulk
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setIsCreatingBulk(true)}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                      isCreatingBulk
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Em Lote (Todos)
                  </button>
                </div>

                {/* ÁREA DE SELEÇÃO DE COLABORADOR COM FILTRO (A CORREÇÃO PRINCIPAL) */}
                {!isCreatingBulk && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                    <label className="text-sm font-bold text-blue-900 block mb-2">
                      Colaborador *
                    </label>
                    
                    {/* Campo de Busca */}
                    <div className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input 
                        type="text"
                        placeholder="Digite o nome para buscar..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-9 p-2 text-sm border border-blue-200 rounded bg-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Select Filtrado - Muito mais seguro que Datalist */}
                    <select
                      value={selectedColaborador}
                      onChange={(e) => setSelectedColaborador(e.target.value)}
                      size={userSearchTerm ? 5 : 1} // Expande se estiver buscando
                      className="w-full p-2 border border-blue-200 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">
                        {colaboradores.length === 0 
                          ? "Nenhum nome encontrado..." 
                          : "-- Selecione na lista --"}
                      </option>
                      {colaboradores.map((colab: any) => (
                        <option key={colab.id} value={colab.id.toString()}>
                          {colab.name}
                        </option>
                      ))}
                    </select>
                    
                    <p className="text-xs text-blue-600 mt-1">
                        {userSearchTerm 
                            ? `Encontrados: ${colaboradores.length}` 
                            : `Total carregado: ${colaboradores.length} colaboradores`}
                    </p>
                  </div>
                )}

                {/* Campo Título */}
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Título do PDI *</label>
                  <input
                    placeholder="Ex: Desenvolvimento de Liderança 2026"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Campo Objetivo Geral */}
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">Objetivo Geral (Opcional)</label>
                  <textarea
                    placeholder="Descreva o objetivo principal do PDI..."
                    value={objetivoGeral}
                    onChange={(e) => setObjetivoGeral(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                {/* Campo Relatório de Análise */}
                {!isCreatingBulk && (
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Relatório de Análise do Colaborador (Opcional)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Insira o relatório/análise que originou este PDI. Suporta formatação Markdown (negrito, tabelas, listas).
                    </p>
                    <textarea
                      placeholder={"Ex:\n**Avaliação de Desempenho 2025**\n\nO colaborador apresentou...\n\n| Competência | Nota |\n|---|---|\n| Liderança | 3.5 |"}
                      value={relatorioAnalise}
                      onChange={(e) => setRelatorioAnalise(e.target.value)}
                      rows={6}
                      className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-y overflow-auto"
                    />
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={isCreatingBulk ? handleCreateBulk : handleCreateIndividual}
                    disabled={createPDIMutation.isPending || createBulkMutation.isPending}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-md hover:opacity-90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(createPDIMutation.isPending || createBulkMutation.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isCreatingBulk ? "Criar em Lote" : "Criar PDI"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

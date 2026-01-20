import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DataTablePDIs } from "@/components/DataTablePDIs";
import { Plus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PDIs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<string>("");
  const [selectedCiclo, setSelectedCiclo] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [objetivoGeral, setObjetivoGeral] = useState("");
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);

  // Queries
  const { data: usuarios = [] } = trpc.users.list.useQuery();
  const { data: ciclos = [] } = trpc.ciclos.list.useQuery();
  const utils = trpc.useUtils();

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
    setIsCreatingBulk(false);
  };

  const handleCreateIndividual = () => {
    if (!selectedColaborador || !selectedCiclo || !titulo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createPDIMutation.mutate({
      colaboradorId: Number(selectedColaborador),
      cicloId: Number(selectedCiclo),
      titulo,
      objetivoGeral: objetivoGeral || undefined,
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

  // Filtrar colaboradores (excluir admins)
  const colaboradores = usuarios.filter(
    (u) => u.role === "colaborador" || u.role === "lider"
  );

  // Encontrar nomes para exibição
  const cicloSelecionado = ciclos.find((c) => c.id === parseInt(selectedCiclo));
  const colaboradorSelecionado = colaboradores.find(
    (c) => c.id === parseInt(selectedColaborador)
  );

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

        {/* Modal de Criação de PDI - HTML PURO */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-2">Criar Novo PDI</h2>
              <p className="text-gray-600 mb-4">
                {isCreatingBulk
                  ? "Criar PDI para todos os colaboradores sem PDI neste ciclo"
                  : "Criar PDI para um colaborador específico"}
              </p>

              <div className="space-y-4">
                {/* Seletor de Ciclo - HTML NATIVO */}
                <div>
                  <label className="text-sm font-medium block mb-1">Ciclo Semestral *</label>
                  <select
                    className="w-full p-2 border rounded bg-white text-black"
                    value={selectedCiclo}
                    onChange={(e) => setSelectedCiclo(e.target.value)}
                  >
                    <option value="">Selecione um ciclo</option>
                    {ciclos?.map((ciclo) => (
                      <option key={ciclo.id} value={ciclo.id.toString()}>
                        {ciclo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Toggle: Individual vs Lote */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCreatingBulk(false)}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                      !isCreatingBulk
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setIsCreatingBulk(true)}
                    className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                      isCreatingBulk
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    Em Lote
                  </button>
                </div>

                {/* Seletor de Colaborador - Input com datalist (apenas se Individual) */}
                {!isCreatingBulk && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Colaborador *</label>
                    <input
                      placeholder="Digite ou selecione um colaborador"
                      value={colaboradorSelecionado?.name || selectedColaborador}
                      onChange={(e) => {
                        const colab = colaboradores.find(
                          (c) => c.name === e.target.value || c.id === parseInt(e.target.value)
                        );
                        setSelectedColaborador(colab?.id.toString() || "");
                      }}
                      list="colaboradores-list"
                      className="w-full p-2 border rounded bg-white text-black"
                    />
                    <datalist id="colaboradores-list">
                      {colaboradores.map((colab) => (
                        <option key={colab.id} value={colab.name} />
                      ))}
                    </datalist>
                  </div>
                )}

                {/* Campo Título */}
                <div>
                  <label className="text-sm font-medium block mb-1">Título *</label>
                  <input
                    placeholder="Ex: PDI 2025 - Desenvolvimento de Liderança"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full p-2 border rounded bg-white text-black"
                  />
                </div>

                {/* Campo Objetivo Geral */}
                <div>
                  <label className="text-sm font-medium block mb-1">Objetivo Geral</label>
                  <textarea
                    placeholder="Descreva o objetivo geral do PDI..."
                    value={objetivoGeral}
                    onChange={(e) => setObjetivoGeral(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded bg-white text-black"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded text-gray-800 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={
                      isCreatingBulk ? handleCreateBulk : handleCreateIndividual
                    }
                    disabled={
                      createPDIMutation.isPending || createBulkMutation.isPending
                    }
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createPDIMutation.isPending || createBulkMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar PDI"
                    )}
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

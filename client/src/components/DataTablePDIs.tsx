import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, Edit2, Trash2, CheckCircle2, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PDI {
  pdiId: number;
  colaboradorNome: string;
  departamentoNome: string;
  liderNome: string;
  cicloNome: string;
  cicloId?: number;
  titulo?: string;
  objetivoGeral?: string;
  status: string;
  totalAcoes: number;
  acoesConcluidasTotal: number;
  progresso: number;
  validadoEm?: string | null;
}

export function DataTablePDIs({ isReadOnly = false }: { isReadOnly?: boolean } = {}) {
  const [, navigate] = useLocation();
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("");
  const [pessoaFilter, setPessoaFilter] = useState<string>("");
  const [realizacaoFilter, setRealizacaoFilter] = useState<string>("todos");
  const [validacaoFilter, setValidacaoFilter] = useState<string>("todos");
  const [pdiToDelete, setPdiToDelete] = useState<number | null>(null);
  
  // Estado para modal de edição
  const [pdiToEdit, setPdiToEdit] = useState<PDI | null>(null);
  const [editForm, setEditForm] = useState({
    titulo: "",
    objetivoGeral: "",
    cicloId: "",
  });

  // Buscar departamentos para filtro
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  
  // Buscar ciclos para o select de edição
  const { data: ciclos = [] } = trpc.ciclos.list.useQuery();

  // Buscar PDIs com filtros
  const { data: pdisList = [], isLoading, refetch } = trpc.pdis.list.useQuery();
  
  // Filtrar PDIs localmente
  const pdis = pdisList.filter((pdi) => {
    // 1. Filtro de Texto (Nome do Colaborador)
    const matchNome = !pessoaFilter || 
      (pdi.colaboradorNome && pdi.colaboradorNome.toLowerCase().includes(pessoaFilter.toLowerCase()));

    // 2. Filtro de Departamento
    const matchDepartamento = !departamentoFilter || pdi.departamentoId === parseInt(departamentoFilter);

    // 3. Filtro de Realização (Progresso/Status)
    let matchRealizacao = true;
    if (realizacaoFilter !== "todos") {
      const progresso = pdi.progresso || 0;
      if (realizacaoFilter === "0") {
        matchRealizacao = progresso === 0;
      } else if (realizacaoFilter === "1-50") {
        matchRealizacao = progresso > 0 && progresso <= 50;
      } else if (realizacaoFilter === "51-99") {
        matchRealizacao = progresso > 50 && progresso < 100;
      } else if (realizacaoFilter === "100") {
        matchRealizacao = (progresso === 100) || (pdi.status === "concluido");
      }
    }

    // 4. Filtro de Validação do Líder
    let matchValidacao = true;
    if (validacaoFilter !== "todos") {
      if (validacaoFilter === "validado") {
        matchValidacao = !!pdi.validadoEm;
      } else if (validacaoFilter === "nao_validado") {
        matchValidacao = !pdi.validadoEm;
      }
    }

    return matchNome && matchDepartamento && matchRealizacao && matchValidacao;
  });

  // Mutation para deletar PDI
  const utils = trpc.useUtils();

  const deletePDIMutation = trpc.pdis.delete.useMutation({
    onSuccess: () => {
      toast.success("PDI deletado com sucesso!");
      utils.pdis.list.invalidate();
      setPdiToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao deletar PDI: ${error.message}`);
    },
  });

  // Mutation para atualizar PDI
  const updatePDIMutation = trpc.pdis.update.useMutation({
    onSuccess: () => {
      toast.success("PDI atualizado com sucesso!");
      utils.pdis.list.invalidate();
      setPdiToEdit(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar PDI: ${error.message}`);
    },
  });

  // Função para abrir modal de edição
  const handleOpenEdit = (pdi: PDI) => {
    setPdiToEdit(pdi);
    setEditForm({
      titulo: pdi.titulo || "",
      objetivoGeral: pdi.objetivoGeral || "",
      cicloId: pdi.cicloId ? String(pdi.cicloId) : "",
    });
  };

  // Função para salvar edição
  const handleSaveEdit = () => {
    if (!pdiToEdit) return;
    
    if (!editForm.titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    updatePDIMutation.mutate({
      id: pdiToEdit.pdiId,
      titulo: editForm.titulo,
      objetivoGeral: editForm.objetivoGeral || undefined,
      cicloId: editForm.cicloId ? Number(editForm.cicloId) : undefined,
    });
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "bg-gray-100 text-gray-800";
      case "aguardando_aprovacao":
        return "bg-yellow-100 text-yellow-800";
      case "ativo":
        return "bg-blue-100 text-blue-800";
      case "em_andamento":
        return "bg-blue-100 text-blue-800";
      case "concluido":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      rascunho: "Rascunho",
      aguardando_aprovacao: "Aguardando Aprovação",
      ativo: "Em Andamento",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return <div className="p-4">Carregando PDIs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros - HTML PURO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro por Departamento */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtrar por Departamento</label>
          <select
            value={departamentoFilter}
            onChange={(e) => setDepartamentoFilter(e.target.value)}
            className="w-full p-2 border rounded bg-white text-black"
          >
            <option value="">Todos os departamentos</option>
            {departamentos.map((dept: any) => (
              <option key={dept.id} value={dept.id.toString()}>
                {dept.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Pessoa */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtrar por Pessoa</label>
          <input
            type="text"
            placeholder="Digite o nome do colaborador"
            value={pessoaFilter}
            onChange={(e) => setPessoaFilter(e.target.value)}
            className="w-full p-2 border rounded bg-white text-black"
          />
        </div>

        {/* Filtro por Realização */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtrar por Realização</label>
          <select
            value={realizacaoFilter}
            onChange={(e) => setRealizacaoFilter(e.target.value)}
            className="w-full p-2 border rounded bg-white text-black"
          >
            <option value="todos">Todos</option>
            <option value="0">0% (Não Iniciados)</option>
            <option value="1-50">1% a 50% (Em Início)</option>
            <option value="51-99">51% a 99% (Fase Final)</option>
            <option value="100">100% (Concluídos)</option>
          </select>
        </div>

        {/* Filtro por Validação do Líder */}
        <div>
          <label className="text-sm font-medium mb-2 block">Validação do Líder</label>
          <select
            value={validacaoFilter}
            onChange={(e) => setValidacaoFilter(e.target.value)}
            className="w-full p-2 border rounded bg-white text-black"
          >
            <option value="todos">Todos</option>
            <option value="validado">✅ Validados pelo Líder</option>
            <option value="nao_validado">⏳ Aguardando Validação</option>
          </select>
        </div>
      </div>

      {/* Tabela - HTML PURO */}
      <div className="border rounded-lg overflow-y-auto max-h-[400px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-left font-semibold">Colaborador</th>
              <th className="p-3 text-left font-semibold">Departamento</th>
              <th className="p-3 text-left font-semibold">Líder</th>
              <th className="p-3 text-left font-semibold">Ciclo</th>
              <th className="p-3 text-left font-semibold">Status</th>
              <th className="p-3 text-left font-semibold">Progresso</th>
              <th className="p-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pdis.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-8 border-b">
                  Nenhum PDI encontrado com os filtros selecionados
                </td>
              </tr>
            ) : (
              pdis.map((pdi: PDI) => (
                <tr key={`pdi-${pdi.pdiId}`} className="hover:bg-gray-50 border-b">
                  <td className="p-3 font-medium">{pdi.colaboradorNome || "—"}</td>
                  <td className="p-3">{pdi.departamentoNome || "—"}</td>
                  <td className="p-3">{pdi.liderNome || "—"}</td>
                  <td className="p-3">{pdi.cicloNome || "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium inline-block w-fit ${getStatusColor(pdi.status)}`}>
                        {getStatusLabel(pdi.status)}
                      </span>
                      {pdi.validadoEm ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Validado pelo Líder
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock className="h-3 w-3" />
                          Aguardando Aprovação do Líder
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pdi.progresso || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{pdi.progresso || 0}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigate(`/pdis/${pdi.pdiId}`)}
                        className="p-2 hover:bg-gray-200 rounded"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleOpenEdit(pdi)}
                          className="p-2 hover:bg-gray-200 rounded"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {!isReadOnly && (
                        <button
                          onClick={() => setPdiToDelete(pdi.pdiId)}
                          className="p-2 hover:bg-gray-200 rounded"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição de PDI */}
      {pdiToEdit !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">✏️ Editar PDI</h2>
              <button
                onClick={() => setPdiToEdit(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Colaborador:</strong> {pdiToEdit.colaboradorNome}
              </p>
            </div>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Título do PDI *
                </label>
                <input
                  type="text"
                  value={editForm.titulo}
                  onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Desenvolvimento de Liderança 2026"
                />
              </div>

              {/* Ciclo */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Ciclo
                </label>
                <select
                  value={editForm.cicloId}
                  onChange={(e) => setEditForm({ ...editForm, cicloId: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione um ciclo...</option>
                  {ciclos.map((ciclo: any) => (
                    <option key={ciclo.id} value={ciclo.id.toString()}>
                      {ciclo.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Objetivo Geral */}
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Objetivo Geral (Opcional)
                </label>
                <textarea
                  value={editForm.objetivoGeral}
                  onChange={(e) => setEditForm({ ...editForm, objetivoGeral: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Descreva o objetivo principal do PDI..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setPdiToEdit(null)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-800 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updatePDIMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updatePDIMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão - HTML PURO */}
      {pdiToDelete !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold mb-2">⚠️ Deletar PDI</h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja deletar este PDI? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setPdiToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-800 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pdiToDelete) {
                    deletePDIMutation.mutate({ id: pdiToDelete });
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

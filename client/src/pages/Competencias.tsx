import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Competencias() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";

  // Dados
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();

  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [editingDescricao, setEditingDescricao] = useState("");

  // Mutações
  const createMacro = trpc.competencias.create.useMutation({
    onSuccess: () => {
      toast.success("Competência criada com sucesso!");
      setNome("");
      setDescricao("");
      utils.competencias.listAllMacros.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar competência");
    },
  });

  const updateMacro = trpc.competencias.update.useMutation({
    onSuccess: () => {
      toast.success("Competência atualizada com sucesso!");
      setEditingId(null);
      setEditingNome("");
      setEditingDescricao("");
      utils.competencias.listAllMacros.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar competência");
    },
  });

  const deleteMacro = trpc.competencias.delete.useMutation({
    onSuccess: () => {
      toast.success("Competência deletada com sucesso!");
      utils.competencias.listAllMacros.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao deletar competência");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    createMacro.mutate({ nome, descricao });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editingNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateMacro.mutate({ id: editingId, nome: editingNome, descricao: editingDescricao });
  };

  const startEdit = (macro: any) => {
    setEditingId(macro.id);
    setEditingNome(macro.nome);
    setEditingDescricao(macro.descricao || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNome("");
    setEditingDescricao("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gestão de Competências</h1>

      {/* Formulário de Criação */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Nova Competência</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Liderança, Técnica, Comunicação"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMacro.isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição da competência (opcional)"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={createMacro.isPending}
            />
          </div>
          <button
            type="submit"
            disabled={createMacro.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {createMacro.isPending ? "Criando..." : "Criar Competência"}
          </button>
        </form>
      </div>

      {/* Lista de Competências */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Competências Cadastradas</h2>
        {macros.length === 0 ? (
          <p className="text-gray-500">Nenhuma competência cadastrada ainda.</p>
        ) : (
          <div className="space-y-4">
            {macros.map((macro: any) => (
              <div key={macro.id} className="border rounded-lg p-4">
                {editingId === macro.id ? (
                  // Modo Edição
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nome *</label>
                      <input
                        type="text"
                        value={editingNome}
                        onChange={(e) => setEditingNome(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={updateMacro.isPending}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Descrição</label>
                      <textarea
                        value={editingDescricao}
                        onChange={(e) => setEditingDescricao(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        disabled={updateMacro.isPending}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={updateMacro.isPending}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {updateMacro.isPending ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={updateMacro.isPending}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 disabled:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  // Modo Visualização
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{macro.nome}</h3>
                      {macro.descricao && <p className="text-gray-600 text-sm mt-1">{macro.descricao}</p>}
                      <p className="text-xs text-gray-400 mt-2">
                        Status: {macro.ativo ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(macro)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Tem certeza que deseja deletar esta competência?")) {
                              deleteMacro.mutate({ id: macro.id });
                            }
                          }}
                          disabled={deleteMacro.isPending}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
                        >
                          Deletar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AcoesEditar() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const actionId = id ? parseInt(id) : 0;

  const { data: action, isLoading } = trpc.actions.getById.useQuery({ id: actionId });
  const { data: pdis } = trpc.pdis.list.useQuery();
  const { data: micros } = trpc.competencias.listAllMicrosWithDetails.useQuery();
  const { data: ciclos } = trpc.ciclos.list.useQuery();

  const [formData, setFormData] = useState({
    pdiId: 0,
    microCompetenciaId: 0,
    nome: "",
    descricao: "",
    prazo: "",
    cicloId: 0,
  });

  // Carregar dados da ação
  useEffect(() => {
    if (action) {
      setFormData({
        pdiId: action.pdiId,
        microCompetenciaId: action.microCompetenciaId,
        nome: action.nome,
        descricao: action.descricao,
        prazo: action.prazo ? new Date(action.prazo).toISOString().split("T")[0] : "",
        cicloId: action.cicloId,
      });
    }
  }, [action]);

  // Sincronizar ciclo quando PDI for selecionado
  useEffect(() => {
    if (formData.pdiId && pdis) {
      const pdi = pdis.find((p) => p.id === formData.pdiId);
      if (pdi && pdi.cicloId) {
        setFormData((prev) => ({ ...prev, cicloId: pdi.cicloId }));
      }
    }
  }, [formData.pdiId, pdis]);

  const updateMutation = trpc.actions.update.useMutation({
    onSuccess: () => {
      setTimeout(() => navigate("/acoes"), 500);
    },
    onError: (error) => {
      console.error("Erro ao atualizar ação:", error);
      toast.error(error.message || "Erro ao atualizar ação");
    },
  });

  const handlePdiChange = (pdiId: number) => {
    setFormData((prev) => ({ ...prev, pdiId }));
  };

  const handleMicroChange = (microId: number) => {
    setFormData((prev) => ({ ...prev, microCompetenciaId: microId }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.pdiId) {
      toast.error("PDI é obrigatório");
      return;
    }
    if (!formData.microCompetenciaId) {
      toast.error("Microcompetência é obrigatória");
      return;
    }
    if (!formData.nome.trim()) {
      toast.error("Nome da ação é obrigatório");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    if (!formData.prazo) {
      toast.error("Prazo é obrigatório");
      return;
    }
    if (!formData.cicloId) {
      toast.error("Ciclo não foi sincronizado corretamente");
      return;
    }

    updateMutation.mutate({
      id: actionId,
      pdiId: action.pdiId, // Manter PDI original, não permitir mudança
      microCompetenciaId: formData.microCompetenciaId,
      nome: formData.nome,
      descricao: formData.descricao,
      prazo: formData.prazo, // Enviar como string (YYYY-MM-DD)
      cicloId: formData.cicloId,
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Carregando ação...</p>
      </div>
    );
  }

  if (!action) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Ação não encontrada</p>
        <button onClick={() => navigate("/acoes")} style={{ marginTop: "10px" }}>
          Voltar para Ações
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Editar Ação</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>Edite os detalhes da ação</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* PDI - Apenas Informativo (Não pode ser alterado) */}
        <div>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
            PDI (Não pode ser alterado)
          </label>
          <div style={{ padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "4px", border: "1px solid #ddd" }}>
            <p style={{ margin: "0" }}>
              {pdis?.find((p) => p.id === formData.pdiId)?.titulo} ({pdis?.find((p) => p.id === formData.pdiId)?.colaboradorNome})
            </p>
          </div>
        </div>

        {/* Microcompetência - RadioGroup */}
        <div>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
            Microcompetência *
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {micros?.map((micro) => (
              <label key={micro.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="microCompetenciaId"
                  value={micro.id}
                  checked={formData.microCompetenciaId === micro.id}
                  onChange={() => handleMicroChange(micro.id)}
                  style={{ cursor: "pointer" }}
                />
                <span>({micro.nome})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Nome da Ação */}
        <div>
          <label htmlFor="nome" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Nome da Ação *
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleInputChange}
            placeholder="Digite o nome da ação"
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="descricao" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Descrição *
          </label>
          <textarea
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleInputChange}
            placeholder="Digite a descrição da ação"
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Ciclo (informativo) */}
        <div
          style={{
            padding: "10px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        >
          <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
            <strong>Ciclo (vinculado ao PDI):</strong>
          </p>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
            {ciclos?.find((c) => c.id === formData.cicloId)?.nome || "Não sincronizado"}
          </p>
        </div>

        {/* Prazo */}
        <div>
          <label htmlFor="prazo" style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Prazo *
          </label>
          <input
            id="prazo"
            name="prazo"
            type="date"
            value={formData.prazo}
            onChange={handleInputChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#0066cc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: updateMutation.isPending ? "not-allowed" : "pointer",
              opacity: updateMutation.isPending ? 0.6 : 1,
            }}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/acoes")}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#f0f0f0",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function AcoesNova() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    pdiId: "",
    microCompetenciaId: "",
    nome: "",
    descricao: "",
    prazo: "",
    cicloId: "", // Campo oculto para cicloId
  });

  const { data: pdis } = trpc.pdis.list.useQuery();
  const { data: micros } = trpc.competencias.listAllMicrosWithDetails.useQuery();
  const { data: ciclos } = trpc.ciclos.list.useQuery();

  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      navigate("/acoes");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar ação");
    },
  });

  // Sincronizar ciclo quando PDI for selecionado
  useEffect(() => {
    if (formData.pdiId) {
      const selectedPdi = pdis?.find((p: any) => p.id === parseInt(formData.pdiId));
      if (selectedPdi && selectedPdi.cicloId) {
        setFormData(prev => ({
          ...prev,
          cicloId: selectedPdi.cicloId.toString()
        }));
        console.log("Ciclo sincronizado:", selectedPdi.cicloId);
      }
    }
  }, [formData.pdiId, pdis]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePdiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pdiId = e.target.value;
    setFormData(prev => ({
      ...prev,
      pdiId: pdiId
    }));
  };

  const handleMicroChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const microId = e.target.value;
    setFormData(prev => ({
      ...prev,
      microCompetenciaId: microId
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);

    // Validações
    if (!formData.pdiId) {
      toast.error("Selecione um PDI");
      return;
    }
    if (!formData.microCompetenciaId) {
      toast.error("Selecione uma microcompetência");
      return;
    }
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!formData.descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    if (!formData.prazo) {
      toast.error("Selecione uma data");
      return;
    }
    if (!formData.cicloId) {
      toast.error("Ciclo não foi sincronizado. Selecione o PDI novamente.");
      return;
    }

    // Encontrar micro para pegar blocoId e macroId
    const micro = micros?.find((m: any) => m.id === parseInt(formData.microCompetenciaId));
    if (!micro) {
      toast.error("Microcompetência inválida");
      return;
    }

    console.log("Enviando dados:", {
      pdiId: parseInt(formData.pdiId),
      microId: parseInt(formData.microCompetenciaId),
      blocoId: micro.blocoId,
      macroId: micro.macroId,
      nome: formData.nome,
      descricao: formData.descricao,
      prazo: formData.prazo,
      cicloId: parseInt(formData.cicloId),
    });

    createMutation.mutate({
      pdiId: parseInt(formData.pdiId),
      microId: parseInt(formData.microCompetenciaId),
      blocoId: micro.blocoId,
      macroId: micro.macroId,
      nome: formData.nome,
      descricao: formData.descricao,
      prazo: formData.prazo,
    });
  };

  const selectedPdi = pdis?.find((p: any) => p.id === parseInt(formData.pdiId));
  const selectedCiclo = ciclos?.find((c: any) => c.id === parseInt(formData.cicloId));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "30px", fontWeight: "bold", marginBottom: "8px" }}>Nova Ação</h1>
          <p style={{ color: "#666" }}>Crie uma nova ação para o PDI</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* PDI */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="pdiId" style={{ fontWeight: "500" }}>PDI *</label>
            <select
              id="pdiId"
              name="pdiId"
              value={formData.pdiId}
              onChange={handlePdiChange}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", color: "black", fontSize: "14px" }}
            >
              <option value="">Selecione um PDI</option>
              {pdis?.map((pdi: any) => (
                <option key={pdi.id} value={pdi.id}>
                  {pdi.titulo} ({pdi.colaboradorNome})
                </option>
              ))}
            </select>
          </div>

          {/* Ciclo Info (sincronizado automaticamente) */}
          {selectedPdi && selectedCiclo && (
            <div style={{ padding: "12px", backgroundColor: "#e8f5e9", borderRadius: "4px", border: "1px solid #4caf50", display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#2e7d32" }}>✓ Ciclo sincronizado:</p>
              <p style={{ fontSize: "14px", color: "#1b5e20", fontWeight: "600" }}>{selectedCiclo.nome}</p>
            </div>
          )}

          {/* Microcompetência */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="microCompetenciaId" style={{ fontWeight: "500" }}>Microcompetência *</label>
            <select
              id="microCompetenciaId"
              name="microCompetenciaId"
              value={formData.microCompetenciaId}
              onChange={handleMicroChange}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", color: "black", fontSize: "14px" }}
            >
              <option value="">Selecione uma microcompetência</option>
              {micros?.map((micro: any) => (
                <option key={micro.id} value={micro.id}>
                  {micro.nome} ({micro.macroNome})
                </option>
              ))}
            </select>
          </div>

          {/* Nome */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="nome" style={{ fontWeight: "500" }}>Nome da Ação *</label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Digite o nome da ação"
              value={formData.nome}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", color: "black", fontSize: "14px" }}
            />
          </div>

          {/* Descrição */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="descricao" style={{ fontWeight: "500" }}>Descrição *</label>
            <textarea
              id="descricao"
              name="descricao"
              placeholder="Digite a descrição da ação"
              value={formData.descricao}
              onChange={handleInputChange}
              rows={3}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", color: "black", fontSize: "14px", fontFamily: "inherit" }}
            />
          </div>

          {/* Prazo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="prazo" style={{ fontWeight: "500" }}>Prazo *</label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleInputChange}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", color: "black", fontSize: "14px" }}
            />
          </div>

          {/* Debug Info - Mostrar cicloId (remover em produção) */}
          <div style={{ padding: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", fontSize: "12px", color: "#666" }}>
            <p>Debug - cicloId: {formData.cicloId || "não sincronizado"}</p>
          </div>

          {/* Botões */}
          <div style={{ display: "flex", gap: "16px", paddingTop: "16px" }}>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ flex: 1, padding: "10px 16px", backgroundColor: "#2563eb", color: "white", borderRadius: "4px", border: "none", cursor: "pointer", opacity: createMutation.isPending ? 0.5 : 1 }}
            >
              {createMutation.isPending ? "Criando..." : "Criar Ação"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/acoes")}
              style={{ flex: 1, padding: "10px 16px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", color: "black", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

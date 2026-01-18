import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  });

  const { data: pdis } = trpc.pdis.list.useQuery();
  const { data: micros } = trpc.competencias.listAllMicrosWithDetails.useQuery();

  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      navigate("/acoes");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar ação");
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      console.log("PDI vazio");
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

    // Encontrar micro para pegar blocoId e macroId
    const micro = micros?.find((m: any) => m.id === parseInt(formData.microCompetenciaId));
    if (!micro) {
      toast.error("Microcompetência inválida");
      return;
    }

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nova Ação</h1>
          <p className="text-muted-foreground">Crie uma nova ação para o PDI</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
          {/* PDI */}
          <div className="space-y-2">
            <Label htmlFor="pdiId">PDI *</Label>
            <select
              id="pdiId"
              name="pdiId"
              value={formData.pdiId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="">Selecione um PDI</option>
              {pdis?.map((pdi: any) => (
                <option key={pdi.id} value={pdi.id}>
                  {pdi.titulo} ({pdi.colaboradorNome})
                </option>
              ))}
            </select>
          </div>

          {/* Microcompetência */}
          <div className="space-y-2">
            <Label htmlFor="microCompetenciaId">Microcompetência *</Label>
            <select
              id="microCompetenciaId"
              name="microCompetenciaId"
              value={formData.microCompetenciaId}
              onChange={handleMicroChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
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
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Ação *</Label>
            <Input
              id="nome"
              name="nome"
              placeholder="Digite o nome da ação"
              value={formData.nome}
              onChange={handleInputChange}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Digite a descrição da ação"
              value={formData.descricao}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Ciclo Info */}
          {selectedPdi && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Ciclo (vinculado ao PDI):</p>
              <p className="text-sm text-muted-foreground">{selectedPdi.cicloNome}</p>
            </div>
          )}

          {/* Prazo */}
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo *</Label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "Criando..." : "Criar Ação"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/acoes")}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

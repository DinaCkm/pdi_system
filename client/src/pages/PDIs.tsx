import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
// import { DirecionamentoEstrategico } from "@/components/DirecionamentoEstrategico";
import { DataTablePDIs } from "@/components/DataTablePDIs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogSelect, DialogSelectItem } from "@/components/DialogSelect";
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
      // Recarregar lista de PDIs
      utils.pdis.list.invalidate();
      // Recarregar lista Meus PDIs se existir
      if (utils.pdis.myPDIs) {
        utils.pdis.myPDIs.invalidate();
      }
      // Fechar modal apos delay para evitar conflito de renderizacao
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
      // Recarregar lista de PDIs
      utils.pdis.list.invalidate();
      // Recarregar lista Meus PDIs se existir
      if (utils.pdis.myPDIs) {
        utils.pdis.myPDIs.invalidate();
      }
      // Fechar modal apos delay para evitar conflito de renderizacao
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
      colaboradorId: parseInt(selectedColaborador),
      cicloId: parseInt(selectedCiclo),
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
      cicloId: parseInt(selectedCiclo),
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
          <Button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo PDI
          </Button>
        </div>

        {/* Widget Direcionamento Estratégico (apenas para admin) - DESABILITADO TEMPORARIAMENTE */}
        {/* {user?.role === "admin" && (
          <div>
            <DirecionamentoEstrategico />
          </div>
        )} */}

        {/* DataTable de PDIs */}
        <div>
          <DataTablePDIs />
        </div>

        {/* Modal de Criação de PDI */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo PDI</DialogTitle>
              <DialogDescription>
                {isCreatingBulk
                  ? "Criar PDI para todos os colaboradores sem PDI neste ciclo"
                  : "Criar PDI para um colaborador específico"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Seletor de Ciclo */}
              <div className="space-y-2">
                <Label htmlFor="ciclo">Ciclo Semestral *</Label>
                <DialogSelect
                  value={selectedCiclo}
                  onValueChange={setSelectedCiclo}
                  placeholder="Selecione um ciclo"
                >
                  {ciclos.map((ciclo) => (
                    <DialogSelectItem key={ciclo.id} value={ciclo.id.toString()}>
                      {ciclo.nome}
                    </DialogSelectItem>
                  ))}
                </DialogSelect>
              </div>

              {/* Toggle: Individual vs Lote */}
              <div className="flex gap-2">
                <Button
                  variant={!isCreatingBulk ? "default" : "outline"}
                  onClick={() => setIsCreatingBulk(false)}
                  className="flex-1"
                >
                  Individual
                </Button>
                <Button
                  variant={isCreatingBulk ? "default" : "outline"}
                  onClick={() => setIsCreatingBulk(true)}
                  className="flex-1"
                >
                  Em Lote
                </Button>
              </div>

              {/* Seletor de Colaborador - Input com datalist (apenas se Individual) */}
              {!isCreatingBulk && (
                <div className="space-y-2">
                  <Label htmlFor="colaborador">Colaborador *</Label>
                  <Input
                    id="colaborador"
                    placeholder="Digite ou selecione um colaborador"
                    value={colaboradorSelecionado?.name || selectedColaborador}
                    onChange={(e) => {
                      const colab = colaboradores.find(
                        (c) => c.name === e.target.value || c.id === parseInt(e.target.value)
                      );
                      setSelectedColaborador(colab?.id.toString() || "");
                    }}
                    list="colaboradores-list"
                  />
                  <datalist id="colaboradores-list">
                    {colaboradores.map((colab) => (
                      <option key={colab.id} value={colab.name} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* Campo Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: PDI 2025 - Desenvolvimento de Liderança"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              {/* Campo Objetivo Geral */}
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo Geral</Label>
                <Textarea
                  id="objetivo"
                  placeholder="Descreva o objetivo geral do PDI..."
                  value={objetivoGeral}
                  onChange={(e) => setObjetivoGeral(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={
                    isCreatingBulk ? handleCreateBulk : handleCreateIndividual
                  }
                  disabled={
                    createPDIMutation.isPending || createBulkMutation.isPending
                  }
                  className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500"
                >
                  {createPDIMutation.isPending || createBulkMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar PDI"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

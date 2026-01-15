import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface NovoFormularioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdiIdProp?: number;
}

interface FormData {
  pdiId: number;
  microCompetenciaId: number;
  nome: string;
  descricao: string;
  prazo: string;
}

export function NovoFormularioAcao({ open, onOpenChange, pdiIdProp }: NovoFormularioProps) {
  const { control, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      pdiId: pdiIdProp || 0,
      microCompetenciaId: 0,
      nome: "",
      descricao: "",
      prazo: "",
    },
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [pdiSearchTerm, setPdiSearchTerm] = useState("");
  const [microSearchTerm, setMicroSearchTerm] = useState("");

  // Queries
  const { data: pdis } = trpc.pdis.list.useQuery(undefined, { staleTime: 0 });
  const { data: micros } = trpc.competencias.listAllMicrosWithDetails.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      utils.actions.list.invalidate();
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar ação");
    },
  });

  const suggestWithAIMutation = trpc.actions.suggestWithAI.useMutation({
    onSuccess: (data) => {
      setValue("nome", data.nome);
      setValue("descricao", data.descricao);
      setIsGeneratingAI(false);
      toast.success("Sugestão gerada com sucesso!");
    },
    onError: (error) => {
      setIsGeneratingAI(false);
      toast.error(error.message || "Erro ao gerar sugestão");
    },
  });

  // Valores selecionados
  const selectedPdiId = watch("pdiId");
  const selectedMicroId = watch("microCompetenciaId");

  const selectedPDI = pdis?.find((p) => p.id === selectedPdiId);
  const selectedMicro = micros?.find((m) => m.id === selectedMicroId);

  // Filtrar PDIs e Micros com busca
  const filteredPdis = pdis?.filter((pdi) =>
    `${pdi.titulo} ${pdi.colaboradorNome || ""}`.toLowerCase().includes(pdiSearchTerm.toLowerCase())
  );

  const filteredMicros = micros?.filter((micro) =>
    `${micro.nome} ${micro.macroNome} ${micro.blocoNome}`.toLowerCase().includes(microSearchTerm.toLowerCase())
  );

  const onSubmit = (data: FormData) => {
    const micro = micros?.find((m) => m.id === data.microCompetenciaId);
    if (!micro) {
      toast.error("Microcompetência não encontrada");
      return;
    }
    
    createMutation.mutate({
      pdiId: data.pdiId,
      blocoId: micro.blocoId,
      macroId: micro.macroId,
      microId: micro.id,
      nome: data.nome,
      descricao: data.descricao,
      prazo: data.prazo,
    });
  };

  const handleSuggestWithAI = () => {
    const microId = watch("microCompetenciaId");
    const micro = micros?.find((m) => m.id === microId);
    
    if (micro) {
      setIsGeneratingAI(true);
      suggestWithAIMutation.mutate({
        blocoId: micro.blocoId,
        macroId: micro.macroId,
        microId: micro.id,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Ação</DialogTitle>
          <DialogDescription>
            Crie uma ação de desenvolvimento vinculada a um PDI com uma microcompetência específica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Select de PDI com busca */}
          <div className="space-y-2">
            <Label htmlFor="pdiId">PDI *</Label>
            <div className="space-y-2">
              <Input
                placeholder="Buscar PDI..."
                value={pdiSearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdiSearchTerm(e.target.value)}
              />
              <Controller
                name="pdiId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  >
                    <option value="0">Selecione o PDI</option>
                    {filteredPdis?.map((pdi) => (
                      <option key={pdi.id} value={pdi.id}>
                        {pdi.titulo} - {pdi.colaboradorNome || "Colaborador desconhecido"}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            {selectedPDI && (
              <div className="space-y-2">
                {selectedPDI.colaborador && (
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    Colaborador: {selectedPDI.colaborador.nome}
                  </p>
                )}
                {selectedPDI.ciclo && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Ciclo: {selectedPDI.ciclo.nome} ({new Date(selectedPDI.ciclo.dataInicio).toLocaleDateString()} - {new Date(selectedPDI.ciclo.dataFim).toLocaleDateString()})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Select de Microcompetência com busca */}
          <div className="space-y-2">
            <Label htmlFor="microCompetenciaId">Microcompetência *</Label>
            <div className="space-y-2">
              <Input
                placeholder="Buscar microcompetência..."
                value={microSearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMicroSearchTerm(e.target.value)}
              />
              <Controller
                name="microCompetenciaId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  >
                    <option value="0">Selecione a microcompetência</option>
                    {filteredMicros?.map((micro) => (
                      <option key={micro.id} value={micro.id}>
                        {micro.nome} ({micro.macroNome} &gt; {micro.blocoNome})
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            {selectedMicro && (
              <div className="p-3 bg-muted rounded-md space-y-1">
                <p className="text-sm font-medium">Competência selecionada:</p>
                <p className="text-sm text-muted-foreground">
                  <strong>Bloco:</strong> {selectedMicro.blocoNome}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Macro:</strong> {selectedMicro.macroNome}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Micro:</strong> {selectedMicro.nome}
                </p>
              </div>
            )}
          </div>

          {/* Botão de Sugestão com IA */}
          {selectedMicroId && selectedMicroId > 0 && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSuggestWithAI}
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando sugestão...
                  </>
                ) : (
                  <>
                    ✨ Sugerir Nome e Ação com IA
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                A IA vai gerar sugestões de nome e ação baseadas na microcompetência selecionada
              </p>
            </div>
          )}

          {/* Nome da Ação */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Ação *</Label>
            <Controller
              name="nome"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Ex: Participar de curso de liderança"
                />
              )}
            />
          </div>

          {/* Ação a ser realizada */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Ação a ser realizada *</Label>
            <Controller
              name="descricao"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="Descreva a ação que será realizada..."
                  rows={4}
                />
              )}
            />
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo *</Label>
            <Controller
              name="prazo"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                />
              )}
            />
            {selectedPDI && selectedPDI.ciclo && (
              <p className="text-sm text-muted-foreground">
                O prazo deve estar entre {new Date(selectedPDI.ciclo.dataInicio).toLocaleDateString()} e {new Date(selectedPDI.ciclo.dataFim).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Ação"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

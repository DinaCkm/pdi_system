'use client';

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { formatDateForMySQL } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NovoFormularioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdiIdProp?: number;
}

interface FormData {
  pdiId: number;
  cicloId: number;
  microCompetenciaId: number;
  blocoId: number;
  macroId: number;
  nome: string;
  descricao: string;
  prazo: string;
}

export function NovoFormularioAcao({ open, onOpenChange, pdiIdProp }: NovoFormularioProps) {
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      pdiId: pdiIdProp || 0,
      cicloId: 0,
      microCompetenciaId: 0,
      blocoId: 0,
      macroId: 0,
      nome: "",
      descricao: "",
      prazo: "",
    },
  });

  const [pdiSearchTerm, setPdiSearchTerm] = useState("");
  const [microSearchTerm, setMicroSearchTerm] = useState("");

  // Queries
  const { data: pdis } = trpc.pdis.list.useQuery(undefined, { staleTime: 0 });
  const { data: micros } = trpc.competencias.listAllMicrosWithDetails.useQuery();
  const { data: ciclos } = trpc.ciclos.list.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      utils.actions.list.invalidate();
      setTimeout(() => onOpenChange(false), 500);
    },
    onError: (error) => {
      const errorMsg = error.message || "Erro ao criar ação";
      console.error("[CREATE ACTION ERROR]", errorMsg, error);
      toast.error(errorMsg);
    },
  });

  // Valores selecionados
  const selectedPdiId = watch("pdiId");
  const selectedMicroId = watch("microCompetenciaId");
  const selectedPrazo = watch("prazo");
  const selectedCicloId = watch("cicloId");
  const selectedBlocoId = watch("blocoId");
  const selectedMacroId = watch("macroId");
  const selectedNome = watch("nome");

  const selectedPDI = pdis?.find((p) => p.id === selectedPdiId);
  const selectedMicro = micros?.find((m) => m.id === selectedMicroId);

  // Filtrar PDIs e Micros com busca
  const filteredPdis = pdis?.filter((pdi) =>
    `${pdi.titulo} ${pdi.colaboradorNome || ""}`.toLowerCase().includes(pdiSearchTerm.toLowerCase())
  );

  const filteredMicros = micros?.filter((micro) =>
    `${micro.microNome} ${micro.macroNome} ${micro.blocoNome}`.toLowerCase().includes(microSearchTerm.toLowerCase())
  );

  // Filtrar ciclos para 2026
  const ciclos2026 = ciclos?.filter(c => c.nome.includes("2026")) || [];

  // Função para selecionar microcompetência
  const handleMicroSelect = (microId: number) => {
    const micro = micros?.find(m => m.id === microId);
    if (micro) {
      setValue("microCompetenciaId", microId);
      setValue("blocoId", micro.blocoId);
      setValue("macroId", micro.macroId);
    }
  };

  const onSubmit = (data: FormData) => {
    if (!data.pdiId) {
      toast.error("Selecione um PDI");
      return;
    }

    if (!data.microCompetenciaId) {
      toast.error("Selecione uma microcompetência");
      return;
    }

    if (!data.cicloId) {
      toast.error("Selecione um ciclo");
      return;
    }

    if (!data.nome || data.nome.trim() === "") {
      toast.error("Digite o nome da ação");
      return;
    }

    if (!data.prazo) {
      toast.error("Selecione uma data");
      return;
    }

    if (!data.blocoId || !data.macroId) {
      toast.error("Dados de competência incompletos");
      return;
    }

    const prazoFormatted = formatDateForMySQL(data.prazo);

    createMutation.mutate({
      pdiId: data.pdiId,
      cicloId: data.cicloId,
      microCompetenciaId: data.microCompetenciaId,
      blocoId: data.blocoId,
      macroId: data.macroId,
      nome: data.nome,
      descricao: data.descricao,
      prazo: prazoFormatted,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Nova Ação</DialogTitle>
          <DialogDescription>Crie uma nova ação para o PDI</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* PDI Selection */}
          <div className="space-y-2">
            <Label htmlFor="pdi">PDI *</Label>
            <Input
              placeholder="Buscar por nome do PDI ou colaborador..."
              value={pdiSearchTerm}
              onChange={(e) => setPdiSearchTerm(e.target.value)}
              className="mb-2"
            />
            <Controller
              name="pdiId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                  <RadioGroup value={field.value?.toString()} onValueChange={(val) => field.onChange(parseInt(val))}>
                    {filteredPdis?.map((pdi) => (
                      <div key={pdi.id} className="flex items-center space-x-2 py-2">
                        <RadioGroupItem value={pdi.id.toString()} id={`pdi-${pdi.id}`} />
                        <Label htmlFor={`pdi-${pdi.id}`} className="cursor-pointer flex-1">
                          {pdi.titulo} - {pdi.colaboradorNome}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            />
          </div>

          {/* Microcompetência Selection */}
          <div className="space-y-2">
            <Label htmlFor="micro">Microcompetência *</Label>
            <Input
              placeholder="Buscar por nome, macro ou bloco..."
              value={microSearchTerm}
              onChange={(e) => setMicroSearchTerm(e.target.value)}
              className="mb-2"
            />
            <Controller
              name="microCompetenciaId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                  <RadioGroup value={field.value?.toString()} onValueChange={(val) => handleMicroSelect(parseInt(val))}>
                    {filteredMicros?.map((micro) => (
                      <div key={micro.id} className="flex items-center space-x-2 py-2">
                        <RadioGroupItem value={micro.id.toString()} id={`micro-${micro.id}`} />
                        <Label htmlFor={`micro-${micro.id}`} className="cursor-pointer flex-1 text-sm">
                          {micro.microNome} ({micro.macroNome} - {micro.blocoNome})
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            />
          </div>

          {/* Ciclo Selection - RadioGroup sem Portal */}
          <div className="space-y-2">
            <Label htmlFor="ciclo">Ciclo *</Label>
            <Controller
              name="cicloId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                  <RadioGroup value={field.value?.toString()} onValueChange={(val) => field.onChange(parseInt(val))}>
                    {ciclos2026?.map((ciclo) => (
                      <div key={ciclo.id} className="flex items-center space-x-2 py-2">
                        <RadioGroupItem value={ciclo.id.toString()} id={`ciclo-${ciclo.id}`} />
                        <Label htmlFor={`ciclo-${ciclo.id}`} className="cursor-pointer flex-1">
                          {ciclo.nome}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Ação *</Label>
            <Controller
              name="nome"
              control={control}
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => <Input {...field} placeholder="Digite o nome da ação" />
              }
            />
            {errors.nome && <p className="text-red-500 text-sm">{errors.nome.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Controller
              name="descricao"
              control={control}
              render={({ field }) => <Textarea {...field} placeholder="Digite a descrição da ação" rows={3} />}
            />
          </div>

          {/* Prazo com Input Date */}
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo *</Label>
            <Controller
              name="prazo"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <input
                  type="date"
                  {...field}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                />
              )}
            />
          </div>

          {/* blocoId e macroId são controlados automaticamente via handleMicroSelect */}

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedPdiId || !selectedMicroId || !selectedCicloId || !selectedNome || !selectedPrazo || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Ação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

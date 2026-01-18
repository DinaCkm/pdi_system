import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";

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

export function AcoesNova() {
  const [, navigate] = useLocation();
  const { control, watch, setValue, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      pdiId: 0,
      cicloId: 0,
      microCompetenciaId: 0,
      blocoId: 0,
      macroId: 0,
      nome: "",
      descricao: "",
      prazo: "",
    },
  });

  const utils = trpc.useUtils();
  const { data: pdis } = trpc.pdis.list.useQuery();
  const { data: micros } = trpc.competencias.listAllMicrosWithDetails.useQuery();
  const { data: ciclos2026 } = trpc.ciclos.list.useQuery();

  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      utils.actions.list.invalidate();
      navigate("/acoes");
    },
    onError: (error) => {
      const errorMsg = error.message || "Erro ao criar ação";
      console.error("[CREATE ACTION ERROR]", errorMsg, error);
      toast.error(errorMsg);
    },
  });

  const selectedPdiId = watch("pdiId");
  const selectedMicroId = watch("microCompetenciaId");
  const selectedCicloId = watch("cicloId");
  const selectedPrazo = watch("prazo");

  const handleMicroSelect = (microId: string) => {
    const id = parseInt(microId);
    const micro = micros?.find((m: any) => m.id === id);
    if (micro) {
      setValue("microCompetenciaId", id as any);
      setValue("blocoId", micro.blocoId as any);
      setValue("macroId", micro.macroId as any);
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
      toast.error("Nome é obrigatório");
      return;
    }
    if (!data.descricao || data.descricao.trim() === "") {
      toast.error("Descrição é obrigatória");
      return;
    }
    if (!data.prazo) {
      toast.error("Selecione uma data");
      return;
    }

    createMutation.mutate({
      pdiId: data.pdiId,
      microId: data.microCompetenciaId,
      blocoId: data.blocoId,
      macroId: data.macroId,
      nome: data.nome,
      descricao: data.descricao,
      prazo: data.prazo,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nova Ação</h1>
          <p className="text-muted-foreground">Crie uma nova ação para o PDI</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
          {/* PDI */}
          <div className="space-y-3">
            <Label>PDI *</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-2">
              <Controller
                name="pdiId"
                control={control}
                render={({ field }) => (
                  <RadioGroup value={field.value?.toString()} onValueChange={(val) => field.onChange(parseInt(val))}>
                    {pdis?.map((pdi: any) => (
                      <div key={pdi.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={pdi.id.toString()} id={`pdi-${pdi.id}`} />
                        <Label htmlFor={`pdi-${pdi.id}`} className="cursor-pointer font-normal">
                          {pdi.nome}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          {/* Microcompetência */}
          <div className="space-y-3">
            <Label>Microcompetência *</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-2">
              <Controller
                name="microCompetenciaId"
                control={control}
                render={({ field }) => (
                  <RadioGroup value={field.value?.toString()} onValueChange={(val) => handleMicroSelect(val)}>
                    {micros?.map((micro: any) => (
                      <div key={micro.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={micro.id.toString()} id={`micro-${micro.id}`} />
                        <Label htmlFor={`micro-${micro.id}`} className="cursor-pointer font-normal">
                          {micro.microNome} ({micro.macroNome} - {micro.blocoNome})
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          {/* Ciclo */}
          <div className="space-y-3">
            <Label>Ciclo *</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-2">
              <Controller
                name="cicloId"
                control={control}
                render={({ field }) => (
                  <RadioGroup value={field.value?.toString()} onValueChange={(val) => field.onChange(parseInt(val))}>
                    {ciclos2026?.map((ciclo: any) => (
                      <div key={ciclo.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={ciclo.id.toString()} id={`ciclo-${ciclo.id}`} />
                        <Label htmlFor={`ciclo-${ciclo.id}`} className="cursor-pointer font-normal">
                          {ciclo.nome}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Ação *</Label>
            <Controller
              name="nome"
              control={control}
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <Input {...field} placeholder="Digite o nome da ação" />
              )}
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Controller
              name="descricao"
              control={control}
              rules={{ required: "Descrição é obrigatória" }}
              render={({ field }) => (
                <Textarea {...field} placeholder="Digite a descrição da ação" rows={3} />
              )}
            />
            {errors.descricao && <p className="text-sm text-destructive">{errors.descricao.message}</p>}
          </div>

          {/* Prazo com Calendar Inline */}
          <div className="space-y-3">
            <Label>Prazo *</Label>
            <Controller
              name="prazo"
              control={control}
              rules={{ required: "Data é obrigatória" }}
              render={({ field }) => (
                <div className="border rounded-md p-3 bg-background">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        field.onChange(dateStr);
                        
                        // Sincronização automática de ciclo baseada na data
                        if (ciclos2026) {
                          const ciclo = ciclos2026.find((c: any) => {
                            const inicio = new Date(c.dataInicio);
                            const fim = new Date(c.dataFim);
                            return date >= inicio && date <= fim;
                          });
                          if (ciclo) {
                            setValue("cicloId", ciclo.id);
                          }
                        }
                      }
                    }}
                    locale={ptBR}
                    className="w-full"
                  />
                  {field.value && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Data selecionada: {format(new Date(field.value), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  )}
                </div>
              )}
            />
            {errors.prazo && <p className="text-sm text-destructive">{errors.prazo.message}</p>}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? "Criando..." : "Criar Ação"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/acoes")}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

  const handleMicroSelect = (microId: string) => {
    const id = parseInt(microId);
    const micro = micros?.find((m: any) => m.id === id);
    if (micro) {
      setValue("microCompetenciaId", id as any);
      setValue("blocoId", micro.blocoId as any);
      setValue("macroId", micro.macroId as any);
    }
  };

  const handleDateChange = (dateStr: string) => {
    setValue("prazo", dateStr as any);
    
    // Sincronização automática de ciclo baseada na data
    if (dateStr && ciclos2026) {
      const date = new Date(dateStr);
      const ciclo = ciclos2026.find((c: any) => {
        const inicio = new Date(c.dataInicio);
        const fim = new Date(c.dataFim);
        return date >= inicio && date <= fim;
      });
      if (ciclo) {
        setValue("cicloId", ciclo.id as any);
      }
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

  const selectedPrazo = watch("prazo");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nova Ação</h1>
          <p className="text-muted-foreground">Crie uma nova ação para o PDI</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
          {/* PDI - Select Nativo */}
          <div className="space-y-2">
            <Label htmlFor="pdiId">PDI *</Label>
            <Controller
              name="pdiId"
              control={control}
              rules={{ required: "PDI é obrigatório" }}
              render={({ field }) => (
                <select
                  {...field}
                  id="pdiId"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Selecione um PDI</option>
                  {pdis?.map((pdi: any) => (
                    <option key={pdi.id} value={pdi.id}>
                      {pdi.nome}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.pdiId && <p className="text-sm text-destructive">{errors.pdiId.message}</p>}
          </div>

          {/* Microcompetência - Select Nativo */}
          <div className="space-y-2">
            <Label htmlFor="microCompetenciaId">Microcompetência *</Label>
            <Controller
              name="microCompetenciaId"
              control={control}
              rules={{ required: "Microcompetência é obrigatória" }}
              render={({ field }) => (
                <select
                  {...field}
                  id="microCompetenciaId"
                  value={field.value || ""}
                  onChange={(e) => handleMicroSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Selecione uma microcompetência</option>
                  {micros?.map((micro: any) => (
                    <option key={micro.id} value={micro.id}>
                      {micro.microNome} ({micro.macroNome} - {micro.blocoNome})
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.microCompetenciaId && <p className="text-sm text-destructive">{errors.microCompetenciaId.message}</p>}
          </div>

          {/* Ciclo - Select Nativo */}
          <div className="space-y-2">
            <Label htmlFor="cicloId">Ciclo *</Label>
            <Controller
              name="cicloId"
              control={control}
              rules={{ required: "Ciclo é obrigatório" }}
              render={({ field }) => (
                <select
                  {...field}
                  id="cicloId"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Selecione um ciclo</option>
                  {ciclos2026?.map((ciclo: any) => (
                    <option key={ciclo.id} value={ciclo.id}>
                      {ciclo.nome}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.cicloId && <p className="text-sm text-destructive">{errors.cicloId.message}</p>}
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Ação *</Label>
            <Controller
              name="nome"
              control={control}
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <Input {...field} id="nome" placeholder="Digite o nome da ação" />
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
                <Textarea {...field} id="descricao" placeholder="Digite a descrição da ação" rows={3} />
              )}
            />
            {errors.descricao && <p className="text-sm text-destructive">{errors.descricao.message}</p>}
          </div>

          {/* Prazo - Input Date Nativo */}
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo *</Label>
            <Controller
              name="prazo"
              control={control}
              rules={{ required: "Data é obrigatória" }}
              render={({ field }) => (
                <div>
                  <input
                    {...field}
                    id="prazo"
                    type="date"
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  />
                  {selectedPrazo && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Data selecionada: {format(new Date(selectedPrazo), 'dd/MM/yyyy', { locale: ptBR })}
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

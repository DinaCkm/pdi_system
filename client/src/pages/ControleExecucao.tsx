import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Unlock, CalendarClock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PDI_LOCK_DEFAULT_MESSAGE } from "@shared/const";

function formatDateTime(d: Date | null | undefined) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

export default function ControleExecucao() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();

  const statusQuery = trpc.systemLock.getStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    if (statusQuery.data?.message) setMessage(statusQuery.data.message);
  }, [statusQuery.data?.message]);

  const onSuccess = (msg: string) => {
    toast.success(msg);
    utils.systemLock.getStatus.invalidate();
    statusQuery.refetch();
  };
  const onError = (e: any) => toast.error(e?.message || "Erro ao atualizar o sistema.");

  const lockNow = trpc.systemLock.lockNow.useMutation({
    onSuccess: () => onSuccess("Sistema encerrado. Usuários estão em modo somente-leitura."),
    onError,
  });
  const schedule = trpc.systemLock.schedule.useMutation({
    onSuccess: () => onSuccess("Data de encerramento agendada."),
    onError,
  });
  const reactivate = trpc.systemLock.reactivate.useMutation({
    onSuccess: () => onSuccess("Sistema reativado. Envios e solicitações liberados."),
    onError,
  });
  const updateMessage = trpc.systemLock.updateMessage.useMutation({
    onSuccess: () => onSuccess("Mensagem atualizada."),
    onError,
  });

  if (loading) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  const role = user?.role;
  const allowed = role === "admin" || role === "gerente";
  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" /> Acesso restrito
            </CardTitle>
            <CardDescription>
              Apenas administradores e gerentes podem controlar o período de execução do PDI.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const status = statusQuery.data;
  const isLocked = status?.locked ?? false;
  const busy = lockNow.isPending || schedule.isPending || reactivate.isPending || updateMessage.isPending;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="h-6 w-6 text-blue-600" /> Controle de Execução do PDI
        </h1>
        <p className="text-muted-foreground mt-1">
          Encerre o período de execução (modo somente-leitura para líderes e colaboradores) ou reative o sistema.
        </p>
      </div>

      {/* Status atual */}
      <Card className={isLocked ? "border-amber-300" : "border-emerald-300"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isLocked ? (
              <>
                <Lock className="h-5 w-5 text-amber-600" />
                <span className="text-amber-700">Sistema ENCERRADO (somente consulta)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-emerald-700">Sistema ATIVO (envios liberados)</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 text-gray-700">
          <div>Bloqueio manual: <strong>{status?.manualLock ? "Sim" : "Não"}</strong></div>
          <div>Encerramento agendado para: <strong>{formatDateTime(status?.scheduledAt)}</strong></div>
          <div>Última alteração: <strong>{formatDateTime(status?.updatedAt)}</strong></div>
          <div className="pt-1">Mensagem exibida aos usuários:</div>
          <div className="italic bg-gray-50 border rounded px-3 py-2">{status?.message}</div>
        </CardContent>
      </Card>

      {/* Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagem de aviso</CardTitle>
          <CardDescription>Exibida no banner e no pop-up para todos os usuários.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder={PDI_LOCK_DEFAULT_MESSAGE}
          />
          <Button
            variant="outline"
            disabled={busy || !message.trim()}
            onClick={() => updateMessage.mutate({ message: message.trim() })}
          >
            Salvar mensagem
          </Button>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bloquear agora */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-5 w-5 text-amber-600" /> Encerrar agora
            </CardTitle>
            <CardDescription>Bloqueia imediatamente envios e solicitações.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={busy}
              onClick={() => lockNow.mutate({ message: message.trim() || undefined })}
            >
              Encerrar período de execução
            </Button>
          </CardContent>
        </Card>

        {/* Agendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-blue-600" /> Agendar encerramento
            </CardTitle>
            <CardDescription>O bloqueio passa a valer automaticamente na data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="scheduledAt">Data e hora de encerramento</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy || !scheduledAt}
              onClick={() => {
                const dt = new Date(scheduledAt);
                if (isNaN(dt.getTime())) {
                  toast.error("Data inválida.");
                  return;
                }
                schedule.mutate({ scheduledAt: dt, message: message.trim() || undefined });
              }}
            >
              Agendar encerramento
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reativar */}
      <Card className="border-emerald-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Unlock className="h-5 w-5 text-emerald-600" /> Reativar sistema
          </CardTitle>
          <CardDescription>
            Remove o bloqueio e o agendamento. Envios e solicitações voltam a funcionar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={busy || !isLocked && !status?.scheduledAt}
            onClick={() => reactivate.mutate()}
          >
            Reativar período de execução
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

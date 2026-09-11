import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LockKeyhole } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function mensagemMotivo(motivo?: string | null) {
  const motivos: Record<string, string> = {
    ADMINISTRADOR: "A avaliação foi bloqueada pelo administrador.",
    INATIVIDADE_3_MIN: "A avaliação foi bloqueada após 3 minutos de inatividade.",
    FECHAMENTO: "A avaliação foi bloqueada após fechamento ou interrupção da sessão.",
    INTERRUPCAO_TECNICA: "A avaliação foi bloqueada devido a uma interrupção técnica.",
    SEGURANCA: "A avaliação foi bloqueada devido a uma ocorrência de segurança.",
  };
  return motivo ? (motivos[motivo] ?? `Motivo registrado: ${motivo}`) : "A avaliação está bloqueada.";
}

export default function ProvaUticRealtimeGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const estadoQuery = trpc.provaUtic.estado.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const tentativa = estadoQuery.data?.tentativa as any;
  const bloqueada = tentativa?.status === "BLOQUEADA";
  const bloqueioKey = tentativa?.id && tentativa?.blocked_at
    ? `prova-utic-bloqueio-${tentativa.id}-${String(tentativa.blocked_at)}`
    : null;

  useEffect(() => {
    if (!bloqueada || !bloqueioKey) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);

    if (sessionStorage.getItem(bloqueioKey) !== "recarregado") {
      sessionStorage.setItem(bloqueioKey, "recarregado");
      const timer = window.setTimeout(() => window.location.reload(), 120);
      return () => window.clearTimeout(timer);
    }
  }, [bloqueada, bloqueioKey]);

  if (loading || (user && estadoQuery.isLoading)) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Verificando status da avaliação...</div>;
  }

  if (bloqueada) {
    const porAdministrador = tentativa?.block_reason === "ADMINISTRADOR";
    return (
      <div className="min-h-screen bg-slate-950 p-6 grid place-items-center">
        <Card className="w-full max-w-2xl border-amber-400 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-9 w-9 text-amber-600" />
              <div>
                <CardTitle className="text-2xl">{porAdministrador ? "AVALIAÇÃO BLOQUEADA PELO ADMINISTRADOR" : "AVALIAÇÃO BLOQUEADA"}</CardTitle>
                <CardDescription>Suas respostas já registradas foram preservadas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <p className="font-semibold">{mensagemMotivo(tentativa?.block_reason)}</p>
              <p className="mt-2 text-sm">Você não pode continuar respondendo neste momento. Somente o administrador pode liberar a continuidade desta mesma tentativa.</p>
            </div>
            <p className="text-sm text-muted-foreground">Esta tela verifica automaticamente a liberação administrativa. Não tente iniciar uma nova avaliação.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

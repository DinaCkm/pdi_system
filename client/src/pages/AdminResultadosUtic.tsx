import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, ChevronRight, Clock3, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString("pt-BR");
}

function formatarDuracao(inicio: unknown, fim: unknown) {
  if (!inicio || !fim) return "—";
  const segundos = Math.max(0, Math.floor((new Date(String(fim)).getTime() - new Date(String(inicio)).getTime()) / 1000));
  if (!Number.isFinite(segundos)) return "—";
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, "0");
  const segundosFinais = (segundos % 60).toString().padStart(2, "0");
  return `${horas}:${minutos}:${segundosFinais}`;
}

function rotuloStatus(status: string) {
  const rotulos: Record<string, string> = {
    CONCLUIDA: "Concluída com todas as respostas",
    FINALIZADA: "Encerrada pelo participante",
    FINALIZADA_TEMPO: "Encerrada por tempo",
  };
  return rotulos[status] ?? status;
}

export default function AdminResultadosUtic() {
  const { loading, user } = useAuth();
  const [tentativaSelecionada, setTentativaSelecionada] = useState<number | null>(null);
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";

  const painelQuery = trpc.provaUtic.listarPainelAdministrativo.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchInterval: 5000,
  });
  const bancoQuery = trpc.provaUticResultados.validarBanco.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
  });
  const resultadoQuery = trpc.provaUticResultados.resultadoTentativa.useQuery(
    { tentativaId: tentativaSelecionada ?? 1 },
    { enabled: Boolean(user && isAdmin && tentativaSelecionada) }
  );

  const tentativas = useMemo(
    () => (painelQuery.data ?? []).filter((item: any) =>
      ["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(item.status)
    ),
    [painelQuery.data]
  );

  useEffect(() => {
    if (tentativaSelecionada === null && tentativas.length > 0) {
      setTentativaSelecionada(Number(tentativas[0].id));
    }
  }, [tentativaSelecionada, tentativas]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (!isAdmin) {
    return <div className="p-6"><Card className="border-red-200"><CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader><CardContent>Esta área é exclusiva do administrador.</CardContent></Card></div>;
  }

  const detalhe = resultadoQuery.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-1 h-8 w-8 text-blue-700" />
          <div>
            <h1 className="text-2xl font-semibold">Resultado da Avaliação de Proficiência para a Função — UTIC</h1>
            <p className="text-sm text-muted-foreground">Dados técnicos da aplicação e da tentativa realizada.</p>
          </div>
        </div>
        {bancoQuery.data && (
          <Badge variant={bancoQuery.data.valido ? "default" : "destructive"}>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            Banco: {bancoQuery.data.total} questões · {bancoQuery.data.valido ? "validado" : "revisar"}
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Selecione o empregado</CardTitle>
            <CardDescription>Escolha quem deseja consultar. O resultado mais recente é aberto automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {painelQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : tentativas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há empregado com resultado finalizado.</p>
            ) : tentativas.map((item: any) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTentativaSelecionada(Number(item.id))}
                className={`w-full rounded-lg border p-3 text-left transition hover:bg-slate-50 ${tentativaSelecionada === Number(item.id) ? "border-blue-500 bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.colaboradorNome}</p>
                    <p className="text-xs text-muted-foreground">Tentativa #{item.id} · {item.respostasSalvas ?? 0}/60 respostas</p>
                    <p className="mt-1 text-xs font-medium text-emerald-700">{rotuloStatus(item.status)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {!tentativaSelecionada ? (
          <Card><CardContent className="grid min-h-64 place-items-center text-center text-muted-foreground">Selecione um empregado para visualizar o resultado.</CardContent></Card>
        ) : resultadoQuery.isLoading ? (
          <Card><CardContent className="p-8 text-sm text-muted-foreground">Calculando resultado...</CardContent></Card>
        ) : resultadoQuery.error ? (
          <Card className="border-red-200"><CardContent className="p-6 text-red-700">{resultadoQuery.error.message}</CardContent></Card>
        ) : detalhe ? (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />{detalhe.tentativa.colaboradorNome}</CardTitle>
                <CardDescription>Tentativa #{detalhe.tentativa.id} · {detalhe.tentativa.cargo || "cargo não informado"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase text-muted-foreground">Acertos</p><p className="mt-1 text-3xl font-bold">{detalhe.resultado.totalAcertos}/60</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase text-muted-foreground">Percentual</p><p className="mt-1 text-3xl font-bold">{detalhe.resultado.percentualGeral.toFixed(1)}%</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase text-muted-foreground">Respondidas</p><p className="mt-1 text-3xl font-bold">{detalhe.resultado.totalRespondidas}/60</p><p className="mt-1 text-xs text-muted-foreground">Não respondidas: {detalhe.resultado.totalNaoRespondidas}</p></div>
                  <div className="rounded-lg border p-4"><p className="flex items-center gap-1 text-xs uppercase text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Tempo de execução</p><p className="mt-1 text-3xl font-bold">{formatarDuracao(detalhe.tentativa.startedAt, detalhe.tentativa.finishedAt)}</p></div>
                  <div className="rounded-lg border p-4"><p className="flex items-center gap-1 text-xs uppercase text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" />Ocorrências</p><p className="mt-1 text-3xl font-bold">{Number(detalhe.tentativa.totalOcorrencias ?? 0)}</p></div>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div><span className="text-muted-foreground">Situação:</span><p className="font-medium">{rotuloStatus(detalhe.tentativa.status)}</p></div>
                  <div><span className="text-muted-foreground">Início:</span><p className="font-medium">{formatarData(detalhe.tentativa.startedAt)}</p></div>
                  <div><span className="text-muted-foreground">Encerramento:</span><p className="font-medium">{formatarData(detalhe.tentativa.finishedAt)}</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              A comparação entre a avaliação anterior e a nova medição por eixo está disponível na página <strong>Evolução</strong>.
            </div>

            <div className="flex justify-end"><Button variant="outline" onClick={() => resultadoQuery.refetch()}>Atualizar resultado</Button></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString("pt-BR");
}

function formatarPp(valor: number | null) {
  if (valor === null) return "Sem base comparável";
  if (valor > 0) return `+${valor.toFixed(1)} p.p.`;
  return `${valor.toFixed(1)} p.p.`;
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
    () => (painelQuery.data ?? []).filter((item: any) => ["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(item.status)),
    [painelQuery.data]
  );

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
            <h1 className="text-2xl font-semibold">Resultados da Avaliação Técnica UTIC</h1>
            <p className="text-sm text-muted-foreground">Correção no servidor e comparação por eixo técnico.</p>
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
            <CardTitle>Tentativas finalizadas</CardTitle>
            <CardDescription>Selecione uma tentativa para visualizar a correção.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {painelQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : tentativas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há tentativa finalizada.</p>
            ) : (
              tentativas.map((item: any) => (
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
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {!tentativaSelecionada ? (
          <Card><CardContent className="grid min-h-64 place-items-center text-center text-muted-foreground">Selecione uma tentativa finalizada para visualizar o resultado.</CardContent></Card>
        ) : resultadoQuery.isLoading ? (
          <Card><CardContent className="p-8 text-sm text-muted-foreground">Calculando resultado...</CardContent></Card>
        ) : resultadoQuery.error ? (
          <Card className="border-red-200"><CardContent className="p-6 text-red-700">{resultadoQuery.error.message}</CardContent></Card>
        ) : detalhe ? (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />{detalhe.tentativa.colaboradorNome}</CardTitle>
                <CardDescription>Tentativa #{detalhe.tentativa.id} · {detalhe.tentativa.cargo || "cargo não informado"} · início {formatarData(detalhe.tentativa.startedAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase text-muted-foreground">Acertos na avaliação</p><p className="mt-1 text-3xl font-bold">{detalhe.resultado.totalAcertos}/60</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase text-muted-foreground">Percentual geral</p><p className="mt-1 text-3xl font-bold">{detalhe.resultado.percentualGeral.toFixed(1)}%</p><p className="mt-1 text-xs text-muted-foreground">Indicador da prova completa; não substitui Performance na Função.</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs uppercase text-muted-foreground">Respondidas</p><p className="mt-1 text-3xl font-bold">{detalhe.resultado.totalRespondidas}/60</p><p className="mt-1 text-xs text-muted-foreground">Não respondidas: {detalhe.resultado.totalNaoRespondidas}</p></div>
                </div>
              </CardContent>
            </Card>

            {detalhe.linhaBase && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <strong>Linha de base provisória:</strong> {detalhe.linhaBase.fonte}. {detalhe.linhaBase.observacao}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Resultado por eixo técnico</CardTitle>
                <CardDescription>A comparação é feita somente dentro do mesmo eixo e na mesma escala. Eixos sem histórico comparável não recebem evolução numérica.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-3">Eixo</th>
                      <th className="px-3 py-3 text-right">Questões</th>
                      <th className="px-3 py-3 text-right">Acertos</th>
                      <th className="px-3 py-3 text-right">Atual</th>
                      <th className="px-3 py-3 text-right">Linha de base</th>
                      <th className="px-3 py-3 text-right">Evolução</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhe.resultado.porEixo.map((eixo: any) => (
                      <tr key={eixo.eixoId} className="border-b last:border-0">
                        <td className="px-3 py-4"><p className="font-medium">{eixo.eixo}</p><p className="text-xs text-muted-foreground">{eixo.eixoId} · Não sei: {eixo.naoSei}</p></td>
                        <td className="px-3 py-4 text-right">{eixo.respondidas}/{eixo.totalQuestoes}</td>
                        <td className="px-3 py-4 text-right font-medium">{eixo.acertos}</td>
                        <td className="px-3 py-4 text-right font-semibold">{Number(eixo.percentualAtual).toFixed(1)}%</td>
                        <td className="px-3 py-4 text-right">{eixo.linhaBase === null ? "Sem base" : `${Number(eixo.linhaBase).toFixed(1)}%`}</td>
                        <td className={`px-3 py-4 text-right font-semibold ${eixo.evolucaoPp > 0 ? "text-emerald-700" : eixo.evolucaoPp < 0 ? "text-red-700" : ""}`}>{formatarPp(eixo.evolucaoPp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="flex justify-end"><Button variant="outline" onClick={() => resultadoQuery.refetch()}>Recalcular resultado</Button></div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

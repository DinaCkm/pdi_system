import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronRight, TrendingUp } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type SituacaoEixo = "EVOLUCAO" | "ESTABILIDADE" | "REDUCAO" | "NOVA_BASE";

function classificarEixo(evolucaoPp: number | null): SituacaoEixo {
  if (evolucaoPp === null) return "NOVA_BASE";
  if (evolucaoPp > 0) return "EVOLUCAO";
  if (evolucaoPp < 0) return "REDUCAO";
  return "ESTABILIDADE";
}

function formatarPp(valor: number | null) {
  if (valor === null) return "—";
  if (valor > 0) return `+${valor.toFixed(1)} p.p.`;
  return `${valor.toFixed(1)} p.p.`;
}

function relacaoDaniel(eixo: string) {
  if (eixo.includes("Infraestrutura") || eixo.includes("Sistemas") || eixo.includes("Dados") || eixo.includes("Suporte")) {
    return "ESSENCIAL";
  }
  if (eixo.includes("Incidentes")) return "NÃO APLICÁVEL À ATUAÇÃO ATUAL";
  return "TRANSVERSAL";
}

function rotuloSituacao(situacao: SituacaoEixo) {
  const rotulos: Record<SituacaoEixo, string> = {
    EVOLUCAO: "Evolução",
    ESTABILIDADE: "Estabilidade",
    REDUCAO: "Permanência ou ampliação do gap",
    NOVA_BASE: "Novo eixo — nova linha de base",
  };
  return rotulos[situacao];
}

function varianteSituacao(situacao: SituacaoEixo): "default" | "secondary" | "destructive" | "outline" {
  if (situacao === "EVOLUCAO") return "default";
  if (situacao === "REDUCAO") return "destructive";
  if (situacao === "ESTABILIDADE") return "secondary";
  return "outline";
}

export default function Evolucao() {
  const { loading, user } = useAuth();
  const [tentativaSelecionada, setTentativaSelecionada] = useState<number | null>(null);
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";

  const painelQuery = trpc.provaUtic.listarPainelAdministrativo.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchInterval: 5000,
  });
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

  const resultadoQuery = trpc.provaUticResultados.resultadoTentativa.useQuery(
    { tentativaId: tentativaSelecionada ?? 1 },
    { enabled: Boolean(user && isAdmin && tentativaSelecionada) }
  );

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (!isAdmin) {
    return <div className="p-6"><Card className="border-red-200"><CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader><CardContent>Esta área é exclusiva do administrador.</CardContent></Card></div>;
  }

  const detalhe = resultadoQuery.data;
  const eixos = detalhe?.resultado?.porEixo ?? [];
  const resumo = {
    evolucao: eixos.filter((eixo: any) => Number(eixo.evolucaoPp) > 0).length,
    estabilidade: eixos.filter((eixo: any) => eixo.evolucaoPp !== null && Number(eixo.evolucaoPp) === 0).length,
    reducao: eixos.filter((eixo: any) => Number(eixo.evolucaoPp) < 0).length,
    novaBase: eixos.filter((eixo: any) => eixo.evolucaoPp === null).length,
  };
  const isDaniel = /Daniel Caio Lemos Penno/i.test(String(detalhe?.tentativa?.colaboradorNome ?? ""));

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Evolução</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Comparação entre a avaliação anterior e a nova Avaliação de Proficiência para a Função, sempre dentro do mesmo eixo.
        </p>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Selecione o empregado</CardTitle>
            <CardDescription>Escolha quem deseja consultar. O resultado mais recente é aberto automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {painelQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : tentativas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há empregado com medição finalizada.</p>
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
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {!tentativaSelecionada ? (
          <Card><CardContent className="grid min-h-64 place-items-center text-center text-muted-foreground">Selecione um empregado para visualizar a evolução.</CardContent></Card>
        ) : resultadoQuery.isLoading ? (
          <Card><CardContent className="p-8 text-sm text-muted-foreground">Calculando evolução...</CardContent></Card>
        ) : resultadoQuery.error ? (
          <Card className="border-red-200"><CardContent className="p-6 text-red-700">{resultadoQuery.error.message}</CardContent></Card>
        ) : detalhe ? (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>{detalhe.tentativa.colaboradorNome}</CardTitle>
                <CardDescription>{detalhe.tentativa.cargo || "Cargo não informado"} · comparação por eixo de conhecimento</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-medium uppercase text-emerald-800">Em evolução</p><p className="mt-1 text-3xl font-bold text-emerald-800">{resumo.evolucao}</p></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-medium uppercase text-slate-700">Estáveis</p><p className="mt-1 text-3xl font-bold text-slate-800">{resumo.estabilidade}</p></div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-xs font-medium uppercase text-red-800">Gap permanece</p><p className="mt-1 text-3xl font-bold text-red-800">{resumo.reducao}</p></div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-medium uppercase text-blue-800">Nova linha de base</p><p className="mt-1 text-3xl font-bold text-blue-800">{resumo.novaBase}</p></div>
              </CardContent>
            </Card>

            {detalhe.linhaBase && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <strong>Linha de base provisória:</strong> {detalhe.linhaBase.fonte}. {detalhe.linhaBase.observacao}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Comparativo da evolução técnica por eixo</CardTitle>
                <CardDescription>A evolução é calculada somente entre medições comparáveis do mesmo eixo.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-3">Eixo de conhecimento</th>
                      <th className="px-3 py-3">Relação com o empregado</th>
                      <th className="px-3 py-3 text-right">Avaliação anterior</th>
                      <th className="px-3 py-3 text-right">Nova avaliação</th>
                      <th className="px-3 py-3 text-right">Evolução</th>
                      <th className="px-3 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eixos.map((eixo: any) => {
                      const situacao = classificarEixo(eixo.evolucaoPp);
                      const relacao = isDaniel ? relacaoDaniel(eixo.eixo) : "A DEFINIR";
                      return (
                        <tr key={eixo.eixoId} className="border-b last:border-0">
                          <td className="px-3 py-4 font-medium">{eixo.eixo}</td>
                          <td className="px-3 py-4"><Badge variant={relacao === "ESSENCIAL" ? "default" : "outline"}>{relacao}</Badge></td>
                          <td className="px-3 py-4 text-right">{eixo.linhaBase === null ? "—" : `${Number(eixo.linhaBase).toFixed(1)}%`}</td>
                          <td className="px-3 py-4 text-right font-semibold">{Number(eixo.percentualAtual).toFixed(1)}%</td>
                          <td className={`px-3 py-4 text-right font-semibold ${eixo.evolucaoPp > 0 ? "text-emerald-700" : eixo.evolucaoPp < 0 ? "text-red-700" : ""}`}>{formatarPp(eixo.evolucaoPp)}</td>
                          <td className="px-3 py-4"><Badge variant={varianteSituacao(situacao)}>{rotuloSituacao(situacao)}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <CardTitle>Direcionamento para o próximo PDI</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {resumo.reducao > 0 && <p><strong>Priorizar:</strong> analisar os eixos em que o gap permanece ou aumentou.</p>}
                {resumo.estabilidade > 0 && <p><strong>Acompanhar:</strong> manter os eixos estáveis sob observação.</p>}
                {resumo.evolucao > 0 && <p><strong>Consolidar:</strong> ampliar a aplicação prática nos eixos em evolução.</p>}
                {resumo.novaBase > 0 && <p><strong>Registrar:</strong> usar o resultado atual como referência nos eixos sem histórico.</p>}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Activity, Building2, TrendingUp, UserRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function formatarNumero(valor: number | null | undefined, sufixo = "") {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "";
  return `${Number(valor).toFixed(1)}${sufixo}`;
}

function formatarVariacao(valor: number | null | undefined, unidade = "") {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "—";
  const numero = Number(valor);
  return `${numero > 0 ? "+" : ""}${numero.toFixed(1)}${unidade}`;
}

function situacaoVariacao(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return { rotulo: "Aguardando nova medição", variant: "outline" as const };
  if (Number(valor) > 0) return { rotulo: "Evolução", variant: "default" as const };
  if (Number(valor) < 0) return { rotulo: "Redução", variant: "destructive" as const };
  return { rotulo: "Estabilidade", variant: "secondary" as const };
}

export default function Evolucao() {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [tipoUnidade, setTipoUnidade] = useState<"" | "ADMINISTRATIVA" | "REGIONAL">("");
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("");
  const [tipoVisao, setTipoVisao] = useState<"UNIDADE" | "EMPREGADO">("UNIDADE");
  const [empregadoSelecionado, setEmpregadoSelecionado] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "Administrador";

  const painelQuery = (trpc.bloco1CompetenciasFuncao as any).painelGeral.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchOnWindowFocus: true,
  });
  const empregadosQuery = trpc.bloco1CompetenciasFuncao.empregados.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchOnWindowFocus: true,
  });

  const unidades = useMemo(() => {
    const dados = (painelQuery.data ?? []) as any[];
    return dados
      .filter((item) => !tipoUnidade || item.tipo === tipoUnidade)
      .sort((a, b) => String(a.unidade).localeCompare(String(b.unidade), "pt-BR"));
  }, [painelQuery.data, tipoUnidade]);

  const unidadeAtual = useMemo(
    () => ((painelQuery.data ?? []) as any[]).find((item) => item.unidade === unidadeSelecionada) ?? null,
    [painelQuery.data, unidadeSelecionada],
  );

  const empregadosDaUnidade = useMemo(() => {
    return ((empregadosQuery.data ?? []) as any[])
      .filter((item) => !unidadeSelecionada || String(item.departamentoNome ?? "") === unidadeSelecionada)
      .sort((a, b) => String(a.nome ?? "").localeCompare(String(b.nome ?? ""), "pt-BR"));
  }, [empregadosQuery.data, unidadeSelecionada]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader>
          <CardContent>Esta área é exclusiva do administrador.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Evolução</h1>
        </div>
        <p className="max-w-5xl text-sm text-muted-foreground">
          Visão consolidada das competências técnicas e comportamentais. O histórico técnico permanece visível mesmo antes da nova avaliação; a coluna atual fica em branco até existir uma nova medição oficial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Escolha a unidade para consultar o consolidado ou acesse a evolução individual de um empregado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">
            <span>Tipo de unidade</span>
            <select
              value={tipoUnidade}
              onChange={(event) => {
                setTipoUnidade(event.target.value as "" | "ADMINISTRATIVA" | "REGIONAL");
                setUnidadeSelecionada("");
                setEmpregadoSelecionado("");
              }}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="ADMINISTRATIVA">Unidade Administrativa</option>
              <option value="REGIONAL">Regional</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Unidade</span>
            <select
              value={unidadeSelecionada}
              onChange={(event) => {
                setUnidadeSelecionada(event.target.value);
                setEmpregadoSelecionado("");
              }}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Selecione a unidade</option>
              {unidades.map((item: any) => <option key={item.unidade} value={item.unidade}>{item.unidade}</option>)}
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span>Visão</span>
            <select
              value={tipoVisao}
              onChange={(event) => {
                setTipoVisao(event.target.value as "UNIDADE" | "EMPREGADO");
                setEmpregadoSelecionado("");
              }}
              disabled={!unidadeSelecionada}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="UNIDADE">Consolidado da unidade</option>
              <option value="EMPREGADO">Empregado específico</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {painelQuery.isLoading ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Carregando evolução...</CardContent></Card>
      ) : painelQuery.error ? (
        <Card className="border-red-200"><CardContent className="p-6 text-red-700">{painelQuery.error.message}</CardContent></Card>
      ) : !unidadeSelecionada ? (
        <Card><CardContent className="grid min-h-56 place-items-center text-center text-muted-foreground">Selecione uma unidade para visualizar os dados.</CardContent></Card>
      ) : tipoVisao === "EMPREGADO" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-blue-600" />Evolução individual</CardTitle>
            <CardDescription>Selecione o empregado para abrir a análise individual completa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={empregadoSelecionado}
              onChange={(event) => setEmpregadoSelecionado(event.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Selecione o empregado</option>
              {empregadosDaUnidade.map((item: any) => (
                <option key={item.id} value={String(item.id)}>
                  {item.nome} — {item.funcaoNome || item.cargo || "Sem função"}
                </option>
              ))}
            </select>
            <Button
              disabled={!empregadoSelecionado}
              onClick={() => setLocation(`/bloco1-competencias-funcao?colaboradorId=${empregadoSelecionado}`)}
            >
              Abrir evolução individual
            </Button>
          </CardContent>
        </Card>
      ) : unidadeAtual ? (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" />{unidadeAtual.unidade}</CardTitle>
              <CardDescription>
                {unidadeAtual.tipo === "REGIONAL" ? "Regional" : "Unidade Administrativa"} · {unidadeAtual.totalEmpregados} empregado(s) ativo(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Eixos técnicos históricos</p>
                <p className="mt-1 text-3xl font-bold">{unidadeAtual.tecnicas?.length ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Competências comportamentais</p>
                <p className="mt-1 text-3xl font-bold">{unidadeAtual.comportamentais?.length ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Empregados</p>
                <p className="mt-1 text-3xl font-bold">{unidadeAtual.totalEmpregados}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competências técnicas — histórico × próxima avaliação</CardTitle>
              <CardDescription>
                O histórico continua visível. Enquanto a nova Avaliação de Proficiência para a Função não tiver sido realizada e calculada, a coluna “Próxima avaliação” permanece em branco.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {(unidadeAtual.tecnicas ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Não há histórico técnico consolidado para esta unidade.</p>
              ) : (
                <table className="w-full min-w-[850px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-3">Eixo técnico</th>
                      <th className="px-3 py-3 text-right">Média histórica</th>
                      <th className="px-3 py-3 text-right">Próxima avaliação</th>
                      <th className="px-3 py-3 text-right">Evolução</th>
                      <th className="px-3 py-3 text-right">Comparáveis</th>
                      <th className="px-3 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(unidadeAtual.tecnicas ?? []).map((item: any) => {
                      const situacao = situacaoVariacao(item.evolucaoPp);
                      return (
                        <tr key={item.eixo} className="border-b last:border-0">
                          <td className="px-3 py-4 font-medium">{item.eixo}</td>
                          <td className="px-3 py-4 text-right">{formatarNumero(item.mediaAnterior, "%") || "—"}</td>
                          <td className="px-3 py-4 text-right font-semibold">{formatarNumero(item.mediaAtual, "%")}</td>
                          <td className="px-3 py-4 text-right">{formatarVariacao(item.evolucaoPp, " p.p.")}</td>
                          <td className="px-3 py-4 text-right">{item.comparaveis ?? 0}</td>
                          <td className="px-3 py-4"><Badge variant={situacao.variant}>{situacao.rotulo}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="border-violet-200">
            <CardHeader>
              <CardTitle>Competências comportamentais — Avaliação de Desempenho</CardTitle>
              <CardDescription>
                Comparação consolidada das duas medições válidas mais recentes de cada competência, quando estiverem na mesma escala.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {(unidadeAtual.comportamentais ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                  Não foram localizadas medições comportamentais válidas de Avaliação de Desempenho para esta unidade.
                </p>
              ) : (
                <table className="w-full min-w-[850px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-3">Competência</th>
                      <th className="px-3 py-3 text-right">Avaliação anterior</th>
                      <th className="px-3 py-3 text-right">Avaliação atual</th>
                      <th className="px-3 py-3 text-right">Variação</th>
                      <th className="px-3 py-3 text-right">Comparáveis</th>
                      <th className="px-3 py-3">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(unidadeAtual.comportamentais ?? []).map((item: any) => {
                      const situacao = situacaoVariacao(item.variacao);
                      return (
                        <tr key={item.competencia} className="border-b last:border-0">
                          <td className="px-3 py-4 font-medium">{item.competencia}</td>
                          <td className="px-3 py-4 text-right">
                            <div>{formatarNumero(item.mediaAnterior) || "—"}</div>
                            {item.periodoAnterior && <div className="text-xs text-muted-foreground">{item.periodoAnterior}</div>}
                          </td>
                          <td className="px-3 py-4 text-right font-semibold">
                            <div>{formatarNumero(item.mediaAtual) || "—"}</div>
                            {item.periodoAtual && <div className="text-xs text-muted-foreground">{item.periodoAtual}</div>}
                          </td>
                          <td className="px-3 py-4 text-right">{formatarVariacao(item.variacao)}</td>
                          <td className="px-3 py-4 text-right">{item.comparaveis ?? 0}</td>
                          <td className="px-3 py-4"><Badge variant={situacao.variant}>{situacao.rotulo}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" />Leitura da tela</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Técnicas:</strong> histórico disponível agora; próxima medição fica em branco até a nova prova oficial.</p>
              <p><strong>Comportamentais:</strong> dados vêm das Avaliações de Desempenho já registradas no sistema.</p>
              <p><strong>Comparação:</strong> somente medições efetivamente comparáveis são usadas para calcular evolução.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card><CardContent className="p-8 text-sm text-muted-foreground">A unidade selecionada não foi localizada no consolidado.</CardContent></Card>
      )}
    </div>
  );
}

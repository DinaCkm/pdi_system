import { useMemo, useState } from "react";
import { Activity, Award, Building2, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

function abreviarEixo(eixo: string) {
  return eixo
    .replace("Governança e Gestão de TI", "Governança de TI")
    .replace("Gestão de Incidentes e Continuidade", "Incidentes e Continuidade")
    .replace("Sistemas Corporativos, Processos e Automação", "Sistemas e Automação")
    .replace("Dados, BI e Inteligência Artificial", "Dados, BI e IA")
    .replace("Suporte, Atendimento e Service Desk", "Suporte e Service Desk")
    .replace("Liderança e Competências Transversais", "Liderança e Transversais");
}

function corResultado(percentual: number) {
  if (percentual >= 70) return "#059669";
  if (percentual >= 50) return "#d97706";
  return "#dc2626";
}

function faixaResultado(percentual: number) {
  if (percentual >= 70) return "Evidenciado";
  if (percentual >= 50) return "Em desenvolvimento";
  return "A desenvolver";
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
  const [, setLocation] = useLocation();
  const [empregadoSelecionado, setEmpregadoSelecionado] = useState<number | null>(null);
  const [tipoUnidade, setTipoUnidade] = useState<"" | "ADMINISTRATIVA" | "REGIONAL">("");
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("");
  const [tipoVisao, setTipoVisao] = useState<"UNIDADE" | "EMPREGADO">("UNIDADE");
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";

  const painelQuery = trpc.provaUtic.listarPainelAdministrativo.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchInterval: 5000,
  });
  const empregadosQuery = (trpc.provaUtic as any).listarLiberacoes.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchOnWindowFocus: true,
  });
  const empregados = useMemo(
    () => [...((empregadosQuery.data ?? []) as any[])].sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR")
    ),
    [empregadosQuery.data]
  );
  const unidades = useMemo(() => {
    const regionais = new Set<string>();
    const administrativas = new Set<string>();
    empregados.forEach((item: any) => {
      const nome = String(item.departamentoNome ?? "").trim();
      if (!nome) return;
      if (/\bREGIONAL\b/i.test(nome)) regionais.add(nome);
      else administrativas.add(nome);
    });
    const ordenar = (itens: Set<string>) => Array.from(itens).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { regionais: ordenar(regionais), administrativas: ordenar(administrativas) };
  }, [empregados]);
  const unidadesDisponiveis = tipoUnidade === "REGIONAL" ? unidades.regionais : tipoUnidade === "ADMINISTRATIVA" ? unidades.administrativas : [];
  const empregadosDaUnidade = useMemo(
    () => empregados.filter((item: any) => String(item.departamentoNome ?? "") === unidadeSelecionada),
    [empregados, unidadeSelecionada]
  );
  const empregadoAtual = useMemo(
    () => empregados.find((item: any) => Number(item.id) === empregadoSelecionado) ?? null,
    [empregadoSelecionado, empregados]
  );
  const tentativaSelecionada = useMemo(() => {
    if (!empregadoSelecionado) return null;
    const encerradas = (painelQuery.data ?? [])
      .filter((item: any) =>
        Number(item.colaboradorId) === empregadoSelecionado &&
        ["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(item.status)
      )
      .sort((a: any, b: any) => Number(b.id) - Number(a.id));
    return encerradas.length > 0 ? Number(encerradas[0].id) : null;
  }, [empregadoSelecionado, painelQuery.data]);

  const resultadoQuery = trpc.provaUticResultados.resultadoTentativa.useQuery(
    { tentativaId: tentativaSelecionada ?? 1 },
    { enabled: Boolean(user && isAdmin && tentativaSelecionada) }
  );
  const consolidadoQuery = (trpc.provaUticResultados as any).consolidadoUnidade.useQuery(
    { departamentoNome: unidadeSelecionada || "PENDENTE" },
    { enabled: Boolean(user && isAdmin && tipoVisao === "UNIDADE" && unidadeSelecionada) }
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
  const dadosEvolucao = eixos
    .filter((eixo: any) => eixo.linhaBase !== null)
    .map((eixo: any) => ({
      eixo: abreviarEixo(String(eixo.eixo)),
      anterior: Number(eixo.linhaBase),
      atual: Number(eixo.percentualAtual),
      evolucaoPp: Number(eixo.evolucaoPp),
    }));
  const dadosTransversais = eixos
        .filter((eixo: any) => eixo.relacao === "TRANSVERSAL")
        .map((eixo: any) => ({
          eixo: abreviarEixo(String(eixo.eixo)),
          percentual: Number(eixo.percentualAtual),
        }))
        .sort((a: any, b: any) => b.percentual - a.percentual);
  const dadosOutrasAtividades = eixos
        .filter((eixo: any) => eixo.relacao === "NAO_APLICAVEL")
        .map((eixo: any) => ({
          eixo: abreviarEixo(String(eixo.eixo)),
          percentual: Number(eixo.percentualAtual),
        }))
        .sort((a: any, b: any) => b.percentual - a.percentual);
  const consolidado = consolidadoQuery.data as any;
  const dadosConsolidados = (consolidado?.porEixo ?? []).map((eixo: any) => ({
    eixo: abreviarEixo(String(eixo.eixo)),
    anterior: Number(eixo.mediaAnterior),
    atual: Number(eixo.mediaAtual),
    evolucaoPp: Number(eixo.evolucaoPp),
    comparaveis: Number(eixo.comparaveis),
    evoluiram: Number(eixo.evoluiram),
    estaveis: Number(eixo.estaveis),
    reduziram: Number(eixo.reduziram),
    percentualEvoluiram: eixo.percentualEvoluiram === null ? null : Number(eixo.percentualEvoluiram),
  }));

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
            <CardTitle>Filtros da evolução</CardTitle>
            <CardDescription>Escolha a unidade e consulte sua evolução consolidada ou um empregado específico.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {empregadosQuery.isLoading || painelQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando empregados...</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block space-y-1.5 text-sm font-medium">
                    <span>Tipo de unidade</span>
                    <select
                      value={tipoUnidade}
                      onChange={(event) => {
                        setTipoUnidade(event.target.value as "" | "ADMINISTRATIVA" | "REGIONAL");
                        setUnidadeSelecionada("");
                        setEmpregadoSelecionado(null);
                      }}
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      <option value="ADMINISTRATIVA">Unidade Administrativa</option>
                      <option value="REGIONAL">Regional</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    <span>Nome da unidade</span>
                    <select
                      value={unidadeSelecionada}
                      disabled={!tipoUnidade}
                      onChange={(event) => {
                        setUnidadeSelecionada(event.target.value);
                        setEmpregadoSelecionado(null);
                      }}
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                    >
                      <option value="">Selecione a unidade</option>
                      {unidadesDisponiveis.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    <span>Tipo de visão</span>
                    <select
                      value={tipoVisao}
                      disabled={!unidadeSelecionada}
                      onChange={(event) => {
                        setTipoVisao(event.target.value as "UNIDADE" | "EMPREGADO");
                        setEmpregadoSelecionado(null);
                      }}
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                    >
                      <option value="UNIDADE">Consolidado da unidade</option>
                      <option value="EMPREGADO">Empregado específico</option>
                    </select>
                  </label>
                </div>
                {tipoVisao === "EMPREGADO" && (
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>Empregado</span>
                  <select
                    value={empregadoSelecionado ?? ""}
                    disabled={!unidadeSelecionada}
                    onChange={(event) => {
                      const valor = event.target.value;
                      setEmpregadoSelecionado(valor ? Number(valor) : null);
                    }}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione o empregado</option>
                    {empregadosDaUnidade.map((item: any) => (
                      <option key={item.id} value={Number(item.id)}>
                        {item.name}{item.departamentoNome ? ` — ${item.departamentoNome}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                )}
                <p className="text-xs text-muted-foreground">
                  O consolidado considera somente medições comparáveis e informa quantos empregados ficaram fora do cálculo.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {tipoVisao === "UNIDADE" ? (
          !unidadeSelecionada ? (
            <Card><CardContent className="grid min-h-64 place-items-center text-center text-muted-foreground">Selecione o tipo e o nome da unidade para visualizar a evolução consolidada.</CardContent></Card>
          ) : consolidadoQuery.isLoading ? (
            <Card><CardContent className="p-8 text-sm text-muted-foreground">Calculando a evolução da unidade...</CardContent></Card>
          ) : consolidadoQuery.error ? (
            <Card className="border-red-200"><CardContent className="p-6 text-red-700">{consolidadoQuery.error.message}</CardContent></Card>
          ) : (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-blue-600" /><CardTitle>{consolidado?.unidade}</CardTitle></div>
                  <CardDescription>Evolução técnica consolidada da unidade, calculada somente com medições comparáveis.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-medium uppercase text-slate-700">Empregados da unidade</p><p className="mt-1 text-3xl font-bold">{consolidado?.totalEmpregados ?? 0}</p></div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-medium uppercase text-blue-800">Com avaliação atual</p><p className="mt-1 text-3xl font-bold text-blue-800">{consolidado?.comAvaliacaoAtual ?? 0}</p></div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-medium uppercase text-emerald-800">Com comparativo</p><p className="mt-1 text-3xl font-bold text-emerald-800">{consolidado?.comComparativo ?? 0}</p></div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-medium uppercase text-amber-800">Sem comparativo</p><p className="mt-1 text-3xl font-bold text-amber-800">{consolidado?.semComparativo ?? 0}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Evolução dos eixos de conhecimento técnico</CardTitle><CardDescription>Média anterior e atual dos empregados comparáveis em cada eixo.</CardDescription></CardHeader>
                <CardContent>
                  {dadosConsolidados.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">A unidade ainda não possui duas medições técnicas comparáveis.</p>
                  ) : (
                    <div className="w-full overflow-x-auto"><div className="min-w-[720px]">
                      <ResponsiveContainer width="100%" height={Math.max(340, dadosConsolidados.length * 58)}>
                        <BarChart data={dadosConsolidados} layout="vertical" margin={{ top: 10, right: 35, left: 30, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tickFormatter={(valor) => `${valor}%`} />
                          <YAxis type="category" dataKey="eixo" width={190} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(valor: number) => `${Number(valor).toFixed(1)}%`} />
                          <Legend />
                          <Bar dataKey="anterior" name="Média anterior" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="atual" name="Média atual" radius={[0, 4, 4, 0]}>
                            {dadosConsolidados.map((item: any) => <Cell key={item.eixo} fill={item.evolucaoPp > 0 ? "#059669" : item.evolucaoPp < 0 ? "#dc2626" : "#d97706"} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div></div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Leitura consolidada por eixo técnico</CardTitle><CardDescription>A média e a distribuição dos empregados devem ser analisadas em conjunto.</CardDescription></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">Eixo</th><th className="px-3 py-3 text-right">Média anterior</th><th className="px-3 py-3 text-right">Média atual</th><th className="px-3 py-3 text-right">Evolução</th><th className="px-3 py-3 text-right">Comparáveis</th><th className="px-3 py-3 text-right">Evoluíram</th><th className="px-3 py-3 text-right">Estáveis</th><th className="px-3 py-3 text-right">Reduziram</th></tr></thead>
                    <tbody>{dadosConsolidados.map((item: any) => <tr key={item.eixo} className="border-b last:border-0"><td className="px-3 py-4 font-medium">{item.eixo}</td><td className="px-3 py-4 text-right">{item.anterior.toFixed(1)}%</td><td className="px-3 py-4 text-right font-semibold">{item.atual.toFixed(1)}%</td><td className={`px-3 py-4 text-right font-semibold ${item.evolucaoPp > 0 ? "text-emerald-700" : item.evolucaoPp < 0 ? "text-red-700" : "text-amber-700"}`}>{formatarPp(item.evolucaoPp)}</td><td className="px-3 py-4 text-right">{item.comparaveis}</td><td className="px-3 py-4 text-right text-emerald-700">{item.evoluiram}</td><td className="px-3 py-4 text-right text-amber-700">{item.estaveis}</td><td className="px-3 py-4 text-right text-red-700">{item.reduziram}</td></tr>)}</tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="border-violet-200">
                <CardHeader><CardTitle>Evolução das competências comportamentais</CardTitle><CardDescription>Fonte: Avaliação de Desempenho.</CardDescription></CardHeader>
                <CardContent><p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">A estrutura está preparada. Os resultados serão apresentados quando houver duas Avaliações de Desempenho comparáveis registradas para os empregados desta unidade.</p></CardContent>
              </Card>
            </div>
          )
        ) : !empregadoSelecionado ? (
          <Card><CardContent className="grid min-h-64 place-items-center text-center text-muted-foreground">Selecione um empregado para visualizar a evolução.</CardContent></Card>
        ) : !tentativaSelecionada ? (
          <Card>
            <CardContent className="grid min-h-64 place-items-center p-8 text-center text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">{empregadoAtual?.name ?? "Empregado selecionado"}</p>
                <p className="mt-2 text-sm">Ainda não possui uma Avaliação de Proficiência encerrada para gerar o comparativo de evolução.</p>
              </div>
            </CardContent>
          </Card>
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
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <CardTitle>Gráfico de evolução por eixo</CardTitle>
                </div>
                <CardDescription>
                  A barra cinza representa a medição anterior e a barra colorida representa o resultado atual.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dadosEvolucao.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Ainda não há medições anteriores comparáveis para gerar este gráfico.
                  </p>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[720px]">
                      <ResponsiveContainer width="100%" height={Math.max(340, dadosEvolucao.length * 58)}>
                        <BarChart data={dadosEvolucao} layout="vertical" margin={{ top: 10, right: 35, left: 30, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tickFormatter={(valor) => `${valor}%`} />
                          <YAxis type="category" dataKey="eixo" width={190} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(valor: number) => `${Number(valor).toFixed(1)}%`} />
                          <Legend />
                          <Bar dataKey="anterior" name="Avaliação anterior" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="atual" name="Avaliação atual" radius={[0, 4, 4, 0]}>
                            {dadosEvolucao.map((item: any) => (
                              <Cell
                                key={item.eixo}
                                fill={item.evolucaoPp > 0 ? "#059669" : item.evolucaoPp < 0 ? "#dc2626" : "#d97706"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span><strong className="text-emerald-700">Verde:</strong> evolução</span>
                  <span><strong className="text-amber-700">Laranja:</strong> estabilidade</span>
                  <span><strong className="text-red-700">Vermelho:</strong> redução do resultado</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <CardTitle>Conhecimentos transversais e potencialidades</CardTitle>
                </div>
                <CardDescription>
                  Evidências de conhecimentos além dos eixos essenciais da função atual, para análise do gestor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-violet-600" />
                    <h3 className="font-semibold">Conhecimentos transversais evidenciados</h3>
                  </div>
                  {dadosTransversais.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Os eixos transversais deste empregado ainda precisam ser classificados.
                    </p>
                  ) : (
                    <>
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[680px]">
                          <ResponsiveContainer width="100%" height={Math.max(230, dadosTransversais.length * 58)}>
                            <BarChart data={dadosTransversais} layout="vertical" margin={{ top: 5, right: 35, left: 30, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" domain={[0, 100]} tickFormatter={(valor) => `${valor}%`} />
                              <YAxis type="category" dataKey="eixo" width={190} tick={{ fontSize: 12 }} />
                              <Tooltip
                                formatter={(valor: number) => [
                                  `${Number(valor).toFixed(1)}% — ${faixaResultado(Number(valor))}`,
                                  "Resultado",
                                ]}
                              />
                              <Bar dataKey="percentual" name="Resultado atual" radius={[0, 4, 4, 0]}>
                                {dadosTransversais.map((item: any) => (
                                  <Cell key={item.eixo} fill={corResultado(item.percentual)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {dadosTransversais.map((item: any) => (
                          <div key={item.eixo} className="rounded-lg border p-3 text-sm">
                            <p className="font-medium">{item.eixo}</p>
                            <p className="mt-1" style={{ color: corResultado(item.percentual) }}>
                              <strong>{item.percentual.toFixed(1)}%</strong> · {faixaResultado(item.percentual)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-semibold">Potencialidades para outras atividades do departamento</h3>
                  {dadosOutrasAtividades.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Não há, nesta medição, eixo classificado como não aplicável à função atual.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dadosOutrasAtividades.map((item: any) => (
                        <div key={item.eixo} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium">{item.eixo}</p>
                            <Badge variant="outline">{item.percentual.toFixed(1)}%</Badge>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, item.percentual)}%`, backgroundColor: corResultado(item.percentual) }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-medium" style={{ color: corResultado(item.percentual) }}>
                            {faixaResultado(item.percentual)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Estes resultados indicam conhecimentos que podem apoiar outras atividades da unidade. Não representam,
                    isoladamente, recomendação de mudança de função; devem ser analisados pelo gestor com as evidências
                    comportamentais e práticas do empregado.
                  </p>
                </section>

                <div className="flex flex-wrap gap-4 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
                  <span><strong className="text-emerald-700">70% ou mais:</strong> evidenciado</span>
                  <span><strong className="text-amber-700">50% a 69,9%:</strong> em desenvolvimento</span>
                  <span><strong className="text-red-700">Abaixo de 50%:</strong> a desenvolver</span>
                </div>
              </CardContent>
            </Card>

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
                      <th className="px-3 py-3 text-right">Próximo PDI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eixos.map((eixo: any) => {
                      const situacao = classificarEixo(eixo.evolucaoPp);
                      const relacao = eixo.relacao === "NAO_APLICAVEL"
                        ? "NÃO APLICÁVEL À ATUAÇÃO ATUAL"
                        : eixo.relacao ?? "A DEFINIR";
                      return (
                        <tr key={eixo.eixoId} className="border-b last:border-0">
                          <td className="px-3 py-4 font-medium">{eixo.eixo}</td>
                          <td className="px-3 py-4"><Badge variant={relacao === "ESSENCIAL" ? "default" : "outline"}>{relacao}</Badge></td>
                          <td className="px-3 py-4 text-right">{eixo.linhaBase === null ? "—" : `${Number(eixo.linhaBase).toFixed(1)}%`}</td>
                          <td className="px-3 py-4 text-right font-semibold">{Number(eixo.percentualAtual).toFixed(1)}%</td>
                          <td className={`px-3 py-4 text-right font-semibold ${eixo.evolucaoPp > 0 ? "text-emerald-700" : eixo.evolucaoPp < 0 ? "text-red-700" : ""}`}>{formatarPp(eixo.evolucaoPp)}</td>
                          <td className="px-3 py-4"><Badge variant={varianteSituacao(situacao)}>{rotuloSituacao(situacao)}</Badge></td>
                          <td className="px-3 py-4 text-right">
                            {(situacao === "REDUCAO" || situacao === "ESTABILIDADE") ? (
                              <button
                                type="button"
                                onClick={() => {
                                  sessionStorage.setItem("acoes_return_url", "/evolucao");
                                  const params = new URLSearchParams({
                                    eixo: String(eixo.eixo),
                                    origem: "evolucao_proficiencia",
                                    tentativaId: String(detalhe.tentativa.id),
                                  });
                                  setLocation(`/acoes/nova?${params.toString()}`);
                                }}
                                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                Criar ação
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Não aplicável</span>
                            )}
                          </td>
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

import { useMemo, useState } from "react";
import { Building2, TrendingUp, UserRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR");
}

function formatarPp(valor: unknown) {
  if (valor === null || valor === undefined) return "—";
  const numero = Number(valor);
  return `${numero > 0 ? "+" : ""}${numero.toFixed(1)} p.p.`;
}

export default function EvolucaoProficiencia() {
  const { loading, user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";
  const [tipoVisao, setTipoVisao] = useState<"EMPREGADO" | "UNIDADE">("EMPREGADO");
  const [colaboradorId, setColaboradorId] = useState<number | null>(null);
  const [unidade, setUnidade] = useState("");

  const empregadosQuery = trpc.evolucaoProficiencia.listarEmpregadosComResultado.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchOnWindowFocus: true,
  });
  const empregados = (empregadosQuery.data ?? []) as any[];
  const unidades = useMemo(
    () => Array.from(new Set(empregados.map(item => String(item.departamentoNome ?? "").trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [empregados],
  );

  const resultadoQuery = trpc.evolucaoProficiencia.resultadoEmpregado.useQuery(
    { colaboradorId: colaboradorId ?? 1 },
    { enabled: Boolean(user && isAdmin && tipoVisao === "EMPREGADO" && colaboradorId) },
  );
  const consolidadoQuery = trpc.evolucaoProficiencia.consolidadoUnidade.useQuery(
    { departamentoNome: unidade || "PENDENTE" },
    { enabled: Boolean(user && isAdmin && tipoVisao === "UNIDADE" && unidade) },
  );

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (!isAdmin) return <div className="p-6"><Card className="border-red-200"><CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader><CardContent>Esta área é exclusiva do administrador.</CardContent></Card></div>;

  const detalhe = resultadoQuery.data as any;
  const eixos = detalhe?.resultado?.porEixo ?? [];
  const consolidado = consolidadoQuery.data as any;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><TrendingUp className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Evolução</h1></div>
        <p className="max-w-4xl text-sm text-muted-foreground">Esta página usa os resultados calculados das aplicações de proficiência. A comparação é feita por eixo com a linha de base individual disponível na matriz técnica.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle><CardDescription>Consulte o resultado mais recente de um empregado ou o consolidado da unidade.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium"><span>Visão</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={tipoVisao} onChange={event => { setTipoVisao(event.target.value as "EMPREGADO" | "UNIDADE"); setColaboradorId(null); setUnidade(""); }}><option value="EMPREGADO">Empregado</option><option value="UNIDADE">Unidade</option></select></label>
          {tipoVisao === "EMPREGADO" ? (
            <label className="space-y-1.5 text-sm font-medium md:col-span-2"><span>Empregado com resultado calculado</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={colaboradorId ?? ""} onChange={event => setColaboradorId(event.target.value ? Number(event.target.value) : null)}><option value="">Selecione</option>{empregados.map(item => <option key={item.id} value={Number(item.id)}>{item.name} — {item.departamentoNome || "Sem unidade"}</option>)}</select></label>
          ) : (
            <label className="space-y-1.5 text-sm font-medium md:col-span-2"><span>Unidade</span><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={unidade} onChange={event => setUnidade(event.target.value)}><option value="">Selecione</option>{unidades.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          )}
        </CardContent>
      </Card>

      {tipoVisao === "EMPREGADO" ? (
        !colaboradorId ? <Card><CardContent className="p-8 text-center text-muted-foreground">Selecione um empregado para visualizar a evolução.</CardContent></Card> : resultadoQuery.isLoading ? <Card><CardContent className="p-8 text-muted-foreground">Carregando resultado...</CardContent></Card> : resultadoQuery.error ? <Card className="border-red-200"><CardContent className="p-6 text-red-800">{resultadoQuery.error.message}</CardContent></Card> : !detalhe ? <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum resultado calculado encontrado.</CardContent></Card> : (
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />{detalhe.colaboradorNome}</CardTitle><CardDescription>{detalhe.cargo || "—"} — {detalhe.departamentoNome || "Sem unidade"}</CardDescription></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Aplicação</p><p className="font-medium">{detalhe.aplicacaoTitulo}</p></div><div><p className="text-xs text-muted-foreground">Calculado em</p><p className="font-medium">{formatarData(detalhe.calculadoEm)}</p></div><div><p className="text-xs text-muted-foreground">Resultado geral</p><p className="text-2xl font-semibold">{Number(detalhe.percentualGeral).toFixed(1)}%</p></div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Conhecimento por eixo</CardTitle><CardDescription>Uma questão vinculada a mais de um eixo conta integralmente em cada eixo associado.</CardDescription></CardHeader>
              <CardContent><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[860px] text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-3">Eixo</th><th className="px-3 py-3">Relação</th><th className="px-3 py-3">Linha de base</th><th className="px-3 py-3">Atual</th><th className="px-3 py-3">Evolução</th><th className="px-3 py-3">Questões</th></tr></thead><tbody>{eixos.map((eixo: any) => <tr key={eixo.eixo} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{eixo.eixo}</td><td className="px-3 py-3"><Badge variant="outline">{eixo.relacao || "Sem relação cadastrada"}</Badge></td><td className="px-3 py-3">{eixo.linhaBase === null ? "—" : `${Number(eixo.linhaBase).toFixed(1)}%`}</td><td className="px-3 py-3">{Number(eixo.percentualAtual).toFixed(1)}%</td><td className="px-3 py-3">{formatarPp(eixo.evolucaoPp)}</td><td className="px-3 py-3">{eixo.acertos}/{eixo.totalQuestoes}</td></tr>)}</tbody></table></div></CardContent>
            </Card>
          </div>
        )
      ) : (
        !unidade ? <Card><CardContent className="p-8 text-center text-muted-foreground">Selecione uma unidade para visualizar o consolidado.</CardContent></Card> : consolidadoQuery.isLoading ? <Card><CardContent className="p-8 text-muted-foreground">Calculando consolidado...</CardContent></Card> : consolidadoQuery.error ? <Card className="border-red-200"><CardContent className="p-6 text-red-800">{consolidadoQuery.error.message}</CardContent></Card> : (
          <div className="space-y-5">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{consolidado?.unidade}</CardTitle><CardDescription>{Number(consolidado?.totalComResultado || 0)} empregado(s) com resultado calculado mais recente.</CardDescription></CardHeader></Card>
            <Card><CardHeader><CardTitle>Evolução consolidada por eixo</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-3">Eixo</th><th className="px-3 py-3">Média anterior</th><th className="px-3 py-3">Média atual</th><th className="px-3 py-3">Evolução</th><th className="px-3 py-3">Comparáveis</th><th className="px-3 py-3">Evoluíram</th></tr></thead><tbody>{(consolidado?.porEixo ?? []).map((eixo: any) => <tr key={eixo.eixo} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{eixo.eixo}</td><td className="px-3 py-3">{eixo.mediaAnterior === null ? "—" : `${Number(eixo.mediaAnterior).toFixed(1)}%`}</td><td className="px-3 py-3">{eixo.mediaAtual === null ? "—" : `${Number(eixo.mediaAtual).toFixed(1)}%`}</td><td className="px-3 py-3">{formatarPp(eixo.evolucaoPp)}</td><td className="px-3 py-3">{eixo.comparaveis}</td><td className="px-3 py-3">{eixo.evoluiram}{eixo.percentualEvoluiram === null ? "" : ` (${Number(eixo.percentualEvoluiram).toFixed(1)}%)`}</td></tr>)}</tbody></table></div></CardContent></Card>
          </div>
        )
      )}
    </div>
  );
}

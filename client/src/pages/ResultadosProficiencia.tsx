import { BarChart3, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR");
}

export default function ResultadosProficiencia() {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";
  const resultadosQuery = trpc.evolucaoProficiencia.listarEmpregadosComResultado.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchOnWindowFocus: true,
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (!isAdmin) return <div className="p-6"><Card className="border-red-200"><CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader><CardContent>Esta área é exclusiva do administrador.</CardContent></Card></div>;

  const resultados = (resultadosQuery.data ?? []) as any[];

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><BarChart3 className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Resultados da Proficiência</h1></div>
        <p className="max-w-4xl text-sm text-muted-foreground">Resultados disponíveis após o administrador clicar em Calcular Resultados. A comparação com a linha de base é apresentada na página Evolução.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Resultados calculados mais recentes</CardTitle><CardDescription>Um registro por empregado, considerando sua aplicação calculada mais recente.</CardDescription></CardHeader>
        <CardContent>
          {resultadosQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando resultados...</p>
          ) : resultadosQuery.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{resultadosQuery.error.message}</div>
          ) : resultados.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum resultado genérico foi calculado até o momento.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead><tr className="border-b text-left"><th className="px-3 py-3">Empregado</th><th className="px-3 py-3">Unidade</th><th className="px-3 py-3">Aplicação</th><th className="px-3 py-3">Prova</th><th className="px-3 py-3">Resultado geral</th><th className="px-3 py-3">Calculado em</th></tr></thead>
                <tbody>
                  {resultados.map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-3"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.cargo || item.email || "—"}</p></td>
                      <td className="px-3 py-3">{item.departamentoNome || "—"}</td>
                      <td className="px-3 py-3">{item.aplicacaoTitulo || "—"}</td>
                      <td className="px-3 py-3">{item.provaNome || "—"}</td>
                      <td className="px-3 py-3 text-lg font-semibold">{Number(item.percentualGeral || 0).toFixed(1)}%</td>
                      <td className="px-3 py-3">{formatarData(item.calculadoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => setLocation("/evolucao")}><TrendingUp className="mr-2 h-4 w-4" />Abrir Evolução</Button>
    </div>
  );
}

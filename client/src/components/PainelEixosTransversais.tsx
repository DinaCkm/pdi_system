import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL,
  EIXOS_TRANSVERSAIS_GESTORES,
  EIXOS_TRANSVERSAIS_TODOS,
} from "@shared/eixosTransversais";

// Transição para a regra dos eixos transversais obrigatórios (somente administrador).
export default function PainelEixosTransversais({ onVerRevisoes }: { onVerRevisoes?: () => void }) {
  const api = (trpc as any).provaUticMatriz;
  const diag = api.diagnosticoTransversais.useQuery(undefined, { refetchOnWindowFocus: false });
  const aplicar = api.aplicarTransversaisFixos.useMutation();
  const reanalisar = api.reanalisarTransversaisIndevidos.useMutation();
  const [mensagem, setMensagem] = useState("");
  const [executando, setExecutando] = useState(false);
  const [falhas, setFalhas] = useState<Array<{ colaboradorId: number; nome: string; erro: string }>>([]);
  const [progresso, setProgresso] = useState({ feitos: 0, divergencias: 0 });

  const d: any = diag.data;

  const aplicarFixos = async () => {
    setMensagem("");
    try {
      const r = await aplicar.mutateAsync();
      setMensagem(`${r.aplicados} classificação(ões) gravada(s) como Transversal nos eixos obrigatórios.`);
      await diag.refetch();
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível aplicar os eixos transversais.");
    }
  };

  const reanalisarTodos = async () => {
    setMensagem("");
    setExecutando(true);
    const ignorar = new Set<number>(falhas.map((f) => f.colaboradorId));
    let feitos = 0;
    let divergencias = 0;
    const novasFalhas = [...falhas];
    try {
      for (let rodada = 0; rodada < 200; rodada++) {
        const r = await reanalisar.mutateAsync({ lote: 3, ignorar: Array.from(ignorar) });
        for (const p of r.processados) { ignorar.add(p.colaboradorId); feitos++; divergencias += p.divergencias; }
        for (const f of r.comErro) { ignorar.add(f.colaboradorId); novasFalhas.push(f); }
        setProgresso({ feitos, divergencias });
        setFalhas([...novasFalhas]);
        if (r.processados.length === 0 && r.comErro.length === 0) break;
        if (r.restantes === 0) break;
      }
      setMensagem(`Reanálise concluída: ${feitos} empregado(s) analisado(s) e ${divergencias} sugestão(ões) enviada(s) para a aba "Revisões do Questionário". Nada foi alterado antes da sua decisão.`);
    } catch (error: any) {
      setMensagem(error?.message || "A reanálise foi interrompida. Clique novamente para continuar de onde parou.");
    } finally {
      setExecutando(false);
      await diag.refetch();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Eixos transversais obrigatórios</CardTitle>
          <CardDescription>
            Conhecimento comum a todo o SEBRAE. A relação é sempre Transversal, tem o mesmo peso e a mesma meta que Essencial e também recebe a calibragem pelo PDI.
            A IA não classifica esses eixos e o empregado não pode pedir alteração. Nos demais eixos, só existem Essencial e Não essencial.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="font-semibold">Todos os empregados</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{EIXOS_TRANSVERSAIS_TODOS.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="font-semibold">Todos os gestores (perfil líder)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{EIXOS_TRANSVERSAIS_GESTORES.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
          <div className="rounded-md border p-3">
            <p className="font-semibold">Comportamental (todos)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5"><li>{COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL}</li></ul>
          </div>
        </CardContent>
      </Card>

      {diag.isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Conferindo as matrizes...</CardContent></Card>
      ) : !d ? (
        <Card><CardContent className="p-6 text-sm text-red-700">Não foi possível carregar o diagnóstico.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Passo 1 · Gravar Transversal nos eixos obrigatórios</CardTitle>
              <CardDescription>Ajuste pela regra, sem IA. Cada alteração fica registrada no histórico da matriz.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                {d.totalFixosParaAplicar === 0
                  ? <span className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-4 w-4" />Todos os eixos obrigatórios já estão como Transversal.</span>
                  : <><strong>{d.totalFixosParaAplicar}</strong> classificação(ões) em eixos obrigatórios ainda não estão como Transversal.</>}
              </p>
              <Button onClick={aplicarFixos} disabled={aplicar.isPending || d.totalFixosParaAplicar === 0}>
                {aplicar.isPending ? "Gravando..." : "Gravar como Transversal"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Passo 2 · Reclassificar "Transversal" nos demais eixos</CardTitle>
              <CardDescription>
                A IA lê o questionário de cada empregado e sugere Essencial ou Não essencial. A sugestão vai para a aba "Revisões do Questionário" e só vale depois da sua decisão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{d.totalIndevidos} classificação(ões) Transversal fora dos eixos obrigatórios</Badge>
                <Badge variant="outline">{d.indevidosEmRevisao} já aguardando sua revisão</Badge>
                <Badge variant="outline">{d.colaboradoresParaReanalisar.length} empregado(s) para reanalisar</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={reanalisarTodos} disabled={executando || d.colaboradoresParaReanalisar.length === 0}>
                  {executando ? `Analisando... ${progresso.feitos} feito(s)` : "Reanalisar com IA"}
                </Button>
                {onVerRevisoes && (
                  <Button variant="outline" onClick={onVerRevisoes}>Abrir Revisões do Questionário ({d.revisoesPendentes})</Button>
                )}
              </div>
              {falhas.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" />Não foi possível analisar {falhas.length} empregado(s). Corrija pela aba "Por Empregado":</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{falhas.map((f) => <li key={f.colaboradorId}><strong>{f.nome}</strong>: {f.erro}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quem ainda não tem um eixo obrigatório na matriz</CardTitle>
              <CardDescription>
                Para entrar na matriz com nota, o eixo precisa ter questões na prova. Use esta lista para planejar as provas do próximo ciclo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {d.faltantes.length === 0 ? (
                <p className="text-sm text-green-700">Todos os empregados têm os eixos obrigatórios.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-left">
                      <tr><th className="px-3 py-2">Unidade</th><th className="px-3 py-2">Empregado</th><th className="px-3 py-2">Eixos que faltam</th></tr>
                    </thead>
                    <tbody>
                      {d.faltantes.map((f: any) => (
                        <tr key={f.colaboradorId} className="border-t">
                          <td className="px-3 py-2">{f.unidade}</td>
                          <td className="px-3 py-2">{f.nome}</td>
                          <td className="px-3 py-2">{f.eixos.join("; ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {mensagem && <div className="rounded-md border bg-slate-50 p-3 text-sm">{mensagem}</div>}
    </div>
  );
}

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL,
  EIXOS_TRANSVERSAIS_GESTORES,
  EIXOS_TRANSVERSAIS_TODOS,
} from "@shared/eixosTransversais";

// Transição para a regra dos eixos transversais obrigatórios (somente administrador).
export default function PainelEixosTransversais() {
  const api = (trpc as any).provaUticMatriz;
  const diag = api.diagnosticoTransversais.useQuery(undefined, { refetchOnWindowFocus: false });
  const aplicar = api.aplicarRegraTransversais.useMutation();
  const [mensagem, setMensagem] = useState("");

  const d: any = diag.data;

  const aplicarAgora = async () => {
    setMensagem("");
    try {
      const r = await aplicar.mutateAsync();
      setMensagem(`Regra aplicada: ${r.transversaisAplicados} gravada(s) como Transversal, ${r.convertidosNaoEssencial} convertida(s) para Não essencial e ${r.incluidos} eixo(s) incluído(s) nas matrizes.`);
      await diag.refetch();
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível aplicar a regra.");
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
              <CardTitle className="text-base">Situação das matrizes</CardTitle>
              <CardDescription>
                A regra é aplicada automaticamente sempre que o sistema é atualizado: eixos obrigatórios viram Transversal e
                "Transversal" em qualquer outro eixo vira Não essencial e o eixo obrigatório que falta é incluído na matriz. Cada alteração fica no histórico da matriz.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              {d.totalFixosParaAplicar === 0 && d.totalIndevidos === 0 && d.totalFaltantes === 0 ? (
                <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />Todas as matrizes seguem a regra.</p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  {d.totalFixosParaAplicar} eixo(s) obrigatório(s) ainda não estão como Transversal, {d.totalIndevidos} eixo(s) não obrigatório(s) ainda estão como Transversal e {d.totalFaltantes} eixo(s) obrigatório(s) ainda não estão na matriz.
                </p>
              )}
              <Button variant="outline" onClick={aplicarAgora} disabled={aplicar.isPending || (d.totalFixosParaAplicar === 0 && d.totalIndevidos === 0 && d.totalFaltantes === 0)}>
                {aplicar.isPending ? "Aplicando..." : "Aplicar agora"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eixos obrigatórios sem nota</CardTitle>
              <CardDescription>
                O eixo já está na matriz, mas a prova da unidade não tinha questões dele. Use esta lista para incluir essas questões nas provas do próximo ciclo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {d.semNota.length === 0 ? (
                <p className="text-sm text-green-700">Todos os eixos obrigatórios têm nota.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-left">
                      <tr><th className="px-3 py-2">Unidade</th><th className="px-3 py-2">Empregado</th><th className="px-3 py-2">Eixos sem nota</th></tr>
                    </thead>
                    <tbody>
                      {d.semNota.map((f: any) => (
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

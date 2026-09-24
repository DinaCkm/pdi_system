import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, PlayCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import RichTextDisplay from "@/components/RichTextDisplay";

type Questao = {
  id: string;
  enunciado: string;
  opcoes: Array<{ letra: string; texto: string; naoSei?: boolean }>;
};

export default function ProvaProficiencia({ aplicacaoId }: { aplicacaoId: number }) {
  const [, setLocation] = useLocation();
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [finalizada, setFinalizada] = useState(false);

  const provaQuery = trpc.aplicacoesProficiencia.estadoProva.useQuery(
    { aplicacaoId },
    { refetchOnWindowFocus: false, retry: false },
  );
  const iniciarMutation = trpc.aplicacoesProficiencia.iniciar.useMutation({
    onSuccess: async () => {
      setMensagem(null);
      await provaQuery.refetch();
    },
    onError: error => setMensagem(error.message),
  });
  const salvarMutation = trpc.aplicacoesProficiencia.salvarResposta.useMutation({
    onError: error => setMensagem(error.message),
  });
  const finalizarMutation = trpc.aplicacoesProficiencia.finalizar.useMutation({
    onSuccess: () => {
      setFinalizada(true);
      setMensagem(null);
      void provaQuery.refetch();
    },
    onError: error => setMensagem(error.message),
  });

  useEffect(() => {
    if (!provaQuery.data) return;
    const existentes: Record<string, string> = {};
    for (const item of provaQuery.data.respostas ?? []) existentes[String(item.questaoChave)] = String(item.resposta);
    setRespostas(existentes);
    if (["FINALIZADA", "FINALIZADA_TEMPO"].includes(String(provaQuery.data.tentativaStatus))) setFinalizada(true);
  }, [provaQuery.data]);

  const questoes = (provaQuery.data?.prova?.questoes ?? []) as Questao[];
  const questao = questoes[indice];
  const tentativaId = Number(provaQuery.data?.tentativaId ?? 0);
  const iniciou = tentativaId > 0;
  const totalRespondidas = useMemo(() => questoes.filter(item => Boolean(respostas[String(item.id)])).length, [questoes, respostas]);
  const percentual = questoes.length ? Math.round((totalRespondidas / questoes.length) * 100) : 0;

  const responder = (questaoId: string, letra: string) => {
    if (!provaQuery.data || !tentativaId || finalizada) return;
    setRespostas(current => ({ ...current, [questaoId]: letra }));
    setMensagem(null);
    salvarMutation.mutate({ aplicacaoId, tentativaId, questaoChave: questaoId, resposta: letra });
  };

  const finalizar = () => {
    if (!tentativaId) return;
    if (totalRespondidas < questoes.length) {
      setMensagem(`Ainda faltam ${questoes.length - totalRespondidas} questão(ões). Você pode revisar antes de finalizar.`);
      return;
    }
    finalizarMutation.mutate({ aplicacaoId, tentativaId });
  };

  if (provaQuery.isLoading) {
    return <div className="grid min-h-screen place-items-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando prova...</div></div>;
  }

  if (provaQuery.error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card className="border-red-200"><CardHeader><CardTitle>Prova indisponível</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-red-800">{provaQuery.error.message}</p><Button variant="outline" onClick={() => setLocation("/avaliacoes")}>Voltar para Avaliações</Button></CardContent></Card>
      </div>
    );
  }

  if (finalizada) {
    const modoTeste = Boolean(provaQuery.data?.modoTeste);
    return (
      <div className="mx-auto max-w-2xl p-6">
        {modoTeste && <div className="mb-4 rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">MODO TESTE — ADMINISTRADOR — ESTE RESULTADO NÃO COMPÕE INDICADORES</div>}
        <Card className="border-green-300 bg-green-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-green-700" />{modoTeste ? "Teste concluído" : "Avaliação finalizada"}</CardTitle>
            <CardDescription>{modoTeste ? "O resultado do teste foi calculado automaticamente e já pode ser conferido na tela de Provas." : "Suas respostas foram gravadas. O resultado será calculado pelo administrador após o encerramento da realização."}</CardDescription>
          </CardHeader>
          <CardContent><Button onClick={() => setLocation(modoTeste ? "/importar-provas" : "/avaliacoes")}>{modoTeste ? "Voltar para Provas" : "Voltar para Avaliações"}</Button></CardContent>
        </Card>
      </div>
    );
  }

  if (!provaQuery.data) return null;

  if (!iniciou) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          {provaQuery.data.modoTeste && <div className="mb-4 rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">MODO TESTE — ADMINISTRADOR — ESTE RESULTADO NÃO COMPÕE INDICADORES</div>}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-blue-700" />{provaQuery.data.aplicacao.titulo}</CardTitle>
              <CardDescription>{provaQuery.data.prova.nome} — {provaQuery.data.prova.unidade}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border bg-white p-4 text-sm">
                <p><strong>Total de questões:</strong> {questoes.length}</p>
                <p className="mt-2 text-muted-foreground">A tentativa só será registrada quando você clicar em iniciar.</p>
              </div>
              {mensagem && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{mensagem}</div>}
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => iniciarMutation.mutate({ aplicacaoId })} disabled={iniciarMutation.isPending}>
                  <PlayCircle className="mr-2 h-5 w-5" />{iniciarMutation.isPending ? "INICIANDO..." : "INICIAR PROVA"}
                </Button>
                <Button variant="outline" onClick={() => setLocation("/avaliacoes")}>Voltar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!questao) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {provaQuery.data.modoTeste && <div className="rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">MODO TESTE — ADMINISTRADOR — ESTE RESULTADO NÃO COMPÕE INDICADORES</div>}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-blue-700" />{provaQuery.data.aplicacao.titulo}</CardTitle><CardDescription>{provaQuery.data.prova.nome} — {provaQuery.data.prova.unidade}</CardDescription></div>
              <Badge variant="outline">{totalRespondidas} de {questoes.length} respondidas</Badge>
            </div>
            <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-700" style={{ width: `${percentual}%` }} /></div><p className="text-xs text-muted-foreground">{percentual}% concluído</p></div>
          </CardHeader>
        </Card>

        {mensagem && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{mensagem}</div>}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3"><Badge variant="secondary">Questão {indice + 1} de {questoes.length}</Badge></div>
            <div className="pt-2 text-lg font-semibold leading-relaxed">
              <RichTextDisplay
                content={questao.enunciado}
                className="text-lg font-semibold leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {questao.opcoes.map(opcao => {
              const selecionada = respostas[String(questao.id)] === String(opcao.letra);
              return (
                <button
                  key={`${questao.id}-${opcao.letra}`}
                  type="button"
                  onClick={() => responder(String(questao.id), String(opcao.letra))}
                  className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${selecionada ? "border-blue-600 bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-semibold">{opcao.letra}</span>
                  <RichTextDisplay
                    content={opcao.texto}
                    className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1"
                  />
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" disabled={indice === 0} onClick={() => setIndice(value => Math.max(0, value - 1))}>Anterior</Button>
          <div className="flex gap-2">
            {indice < questoes.length - 1 ? (
              <Button onClick={() => setIndice(value => Math.min(questoes.length - 1, value + 1))}>Próxima</Button>
            ) : (
              <Button onClick={finalizar} disabled={finalizarMutation.isPending}>{finalizarMutation.isPending ? "FINALIZANDO..." : "FINALIZAR AVALIAÇÃO"}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

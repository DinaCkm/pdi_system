import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, MessageSquarePlus, Settings2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type RelacaoEixo = "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL";

const RELACAO_LABEL: Record<RelacaoEixo, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_ESSENCIAL: "Não essencial",
};

const RELACAO_COR: Record<RelacaoEixo, string> = {
  ESSENCIAL: "border-blue-200 bg-blue-50 text-blue-800",
  TRANSVERSAL: "border-violet-200 bg-violet-50 text-violet-800",
  NAO_ESSENCIAL: "border-slate-200 bg-slate-50 text-slate-700",
};

const rotuloRelacao = (valor: unknown) => RELACAO_LABEL[valor as RelacaoEixo] ?? "Pendente de análise";

function formatarData(valor: unknown) {
  if (!valor) return "";
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

function StatusSolicitacao({ solicitacao }: { solicitacao: any }) {
  if (solicitacao.status === "PENDENTE") {
    return (
      <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Solicitação em análise</p>
          <p>Pedido: {rotuloRelacao(solicitacao.relacaoSolicitada)} · enviado em {formatarData(solicitacao.createdAt)}</p>
        </div>
      </div>
    );
  }
  const ajustada = solicitacao.status === "AJUSTADA";
  return (
    <div className={`flex gap-2 rounded-md border p-3 text-sm ${ajustada ? "border-green-200 bg-green-50 text-green-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
      {ajustada ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>
        <p className="font-medium">
          {ajustada
            ? `Ajustado para ${rotuloRelacao(solicitacao.relacaoFinal)} — sua Evolução já considera a nova classificação`
            : `Classificação mantida (${rotuloRelacao(solicitacao.relacaoFinal)})`}
        </p>
        {solicitacao.respostaAdmin && <p className="mt-1">Resposta: {solicitacao.respostaAdmin}</p>}
        <p className="mt-1 text-xs opacity-80">Respondido em {formatarData(solicitacao.respondidoEm)}</p>
      </div>
    </div>
  );
}

export default function MeusEixosTecnicos() {
  const api = (trpc as any).provaUticMatriz;
  const consulta = api.meusEixos.useQuery(undefined, { refetchOnWindowFocus: false });
  const solicitar = api.solicitarReclassificacao.useMutation();

  const [abertoEixo, setAbertoEixo] = useState<string | null>(null);
  const [relacaoSolicitada, setRelacaoSolicitada] = useState<RelacaoEixo | "">("");
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const dados = consulta.data;
  const eixos: any[] = dados?.eixos ?? [];
  const solicitacoes: any[] = dados?.solicitacoes ?? [];

  // Última solicitação de cada eixo (a lista já vem da mais recente para a mais antiga, pendentes primeiro).
  const ultimaPorEixo = useMemo(() => {
    const mapa = new Map<string, any>();
    for (const item of solicitacoes) if (!mapa.has(item.eixoId)) mapa.set(item.eixoId, item);
    return mapa;
  }, [solicitacoes]);

  const abrir = (eixo: any) => {
    setAbertoEixo(eixo.eixoId);
    setRelacaoSolicitada("");
    setJustificativa("");
    setErro("");
    setSucesso("");
  };

  const enviar = async (eixo: any) => {
    setErro("");
    if (!relacaoSolicitada) return setErro("Selecione a classificação que você entende ser a correta.");
    if (relacaoSolicitada === eixo.relacao) return setErro("Escolha uma classificação diferente da atual.");
    if (justificativa.trim().length < 20) return setErro("Descreva a justificativa com pelo menos 20 caracteres.");
    try {
      await solicitar.mutateAsync({ eixoId: eixo.eixoId, relacaoSolicitada, justificativa: justificativa.trim() });
      setAbertoEixo(null);
      setSucesso(`Solicitação enviada para o eixo "${eixo.eixo}". A administração foi notificada por e-mail.`);
      await consulta.refetch();
    } catch (error: any) {
      setErro(error?.message || "Não foi possível enviar a solicitação.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Meus Eixos Técnicos</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Veja como cada eixo técnico foi classificado para a sua função e o motivo. Se entender que alguma classificação não
          reflete as suas atividades, solicite a revisão com uma justificativa.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-3">
          <div><span className="font-semibold text-blue-800">Essencial:</span> conhecimento central para executar as atividades principais da função.</div>
          <div><span className="font-semibold text-violet-800">Transversal:</span> conhecimento de apoio, usado com frequência em diferentes atividades.</div>
          <div><span className="font-semibold text-slate-700">Não essencial:</span> conhecimento pouco presente nas atividades atuais da função.</div>
        </CardContent>
      </Card>

      {sucesso && <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">{sucesso}</div>}

      {consulta.isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando seus eixos...</CardContent></Card>
      ) : consulta.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{consulta.error.message}</div>
      ) : !dados?.matriz || eixos.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Seus eixos técnicos ainda não foram cadastrados.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{dados.matriz.colaboradorNome}</CardTitle>
            <CardDescription>{dados.matriz.cargo} · {dados.matriz.unidadeNome || "Unidade não informada"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {eixos.map((eixo) => {
              const ultima = ultimaPorEixo.get(eixo.eixoId);
              const pendente = ultima?.status === "PENDENTE";
              const classificado = eixo.statusClassificacao !== "PENDENTE" && eixo.relacao;
              const aberto = abertoEixo === eixo.eixoId;
              return (
                <div key={eixo.eixoId} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-semibold ${eixo.eixoDescricao ? "cursor-help decoration-dotted underline-offset-4 hover:underline" : ""}`}
                          title={eixo.eixoDescricao || undefined}
                        >
                          {eixo.eixo}
                        </p>
                        {classificado ? (
                          <Badge variant="outline" className={RELACAO_COR[eixo.relacao as RelacaoEixo]}>{rotuloRelacao(eixo.relacao)}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Pendente de análise</Badge>
                        )}
                      </div>
                      <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3 text-sm">
                        <p className="font-medium text-blue-950">Por que este eixo é importante para a sua função</p>
                        <p className="mt-1 text-blue-900">
                          {eixo.justificativa?.trim() || "Justificativa ainda não registrada com base no Questionário de Atividades/Função."}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={pendente || aberto} onClick={() => abrir(eixo)}>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      {pendente ? "Solicitação em análise" : "Solicitar alteração"}
                    </Button>
                  </div>

                  {ultima && <div className="mt-3"><StatusSolicitacao solicitacao={ultima} /></div>}

                  {aberto && (
                    <div className="mt-4 space-y-3 rounded-md border bg-muted/30 p-4">
                      <label className="block space-y-2 text-sm font-medium">
                        Classificação que você entende ser a correta
                        <select
                          value={relacaoSolicitada}
                          onChange={(event) => setRelacaoSolicitada(event.target.value as RelacaoEixo)}
                          className="h-10 w-full max-w-xs rounded-md border bg-background px-3 font-normal"
                        >
                          <option value="">Selecione...</option>
                          {Object.entries(RELACAO_LABEL)
                            .filter(([valor]) => valor !== eixo.relacao)
                            .map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                        </select>
                      </label>
                      <label className="block space-y-2 text-sm font-medium">
                        Justificativa
                        <textarea
                          value={justificativa}
                          onChange={(event) => setJustificativa(event.target.value)}
                          rows={4}
                          maxLength={3000}
                          className="w-full rounded-md border bg-background p-3 font-normal"
                          placeholder="Explique quais atividades da sua função usam (ou não usam) este conhecimento e com que frequência."
                        />
                      </label>
                      {erro && (
                        <p className="flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{erro}</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => enviar(eixo)} disabled={solicitar.isPending}>
                          {solicitar.isPending ? "Enviando..." : "Enviar solicitação"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAbertoEixo(null)}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

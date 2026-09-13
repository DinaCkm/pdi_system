import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Database, Save, Settings2 } from "lucide-react";
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

type RelacaoEixo = "ESSENCIAL" | "TRANSVERSAL" | "NAO_APLICAVEL";
type StatusMatriz = "VALIDADA_PROVISORIA" | "VALIDADA_DEFINITIVA" | "PENDENTE_HISTORICO";

type EixoEdicao = {
  eixoId: string;
  eixo: string;
  relacao: RelacaoEixo | "";
  anterior: number | null;
};

const EIXOS_PADRAO = [
  { eixoId: "GOVERNANCA", eixo: "Governança e Gestão de TI" },
  { eixoId: "INFRAESTRUTURA", eixo: "Infraestrutura de TI" },
  { eixoId: "SEGURANCA", eixo: "Segurança da Informação" },
  { eixoId: "INCIDENTES", eixo: "Gestão de Incidentes e Continuidade" },
  { eixoId: "SISTEMAS", eixo: "Sistemas Corporativos, Processos e Automação" },
  { eixoId: "DADOS", eixo: "Dados, BI e Inteligência Artificial" },
  { eixoId: "SUPORTE", eixo: "Suporte, Atendimento e Service Desk" },
  { eixoId: "LIDERANCA", eixo: "Liderança e Competências Transversais" },
] as const;

const STATUS_LABEL: Record<StatusMatriz, string> = {
  VALIDADA_PROVISORIA: "Validada provisoriamente",
  VALIDADA_DEFINITIVA: "Validada definitivamente",
  PENDENTE_HISTORICO: "Pendente de histórico",
};

const RELACAO_LABEL: Record<RelacaoEixo, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_APLICAVEL: "Não aplicável à atuação atual",
};

export default function AdminEixosTecnicos() {
  const api = (trpc as any).provaUticMatriz;
  const listaQuery = api.listar.useQuery(undefined, { refetchOnWindowFocus: false });
  const inicializarMutation = api.inicializarOficial.useMutation();
  const salvarEixoMutation = api.salvarEixo.useMutation();
  const atualizarStatusMutation = api.atualizarStatus.useMutation();

  const matrizes = listaQuery.data ?? [];
  const [matrizSelecionada, setMatrizSelecionada] = useState<number | null>(null);
  const [edicoes, setEdicoes] = useState<Record<string, EixoEdicao>>({});
  const [motivo, setMotivo] = useState("Validação da matriz de conhecimentos");
  const [fonte, setFonte] = useState("");
  const [observacao, setObservacao] = useState("");
  const [status, setStatus] = useState<StatusMatriz>("PENDENTE_HISTORICO");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (matrizSelecionada === null && matrizes.length > 0) {
      setMatrizSelecionada(Number(matrizes[0].id));
    }
  }, [matrizSelecionada, matrizes]);

  const matriz = useMemo(
    () => matrizes.find((item: any) => Number(item.id) === matrizSelecionada) ?? null,
    [matrizes, matrizSelecionada]
  );

  useEffect(() => {
    if (!matriz) return;
    const salvos = new Map((matriz.eixos ?? []).map((item: any) => [item.eixoId, item]));
    const novos: Record<string, EixoEdicao> = {};
    for (const eixo of EIXOS_PADRAO) {
      const salvo: any = salvos.get(eixo.eixoId);
      novos[eixo.eixoId] = {
        eixoId: eixo.eixoId,
        eixo: eixo.eixo,
        relacao: salvo?.relacao ?? "",
        anterior: salvo?.anterior === null || salvo?.anterior === undefined ? null : Number(salvo.anterior),
      };
    }
    setEdicoes(novos);
    setFonte(matriz.fonte ?? "");
    setObservacao(matriz.observacao ?? "");
    setStatus(matriz.status as StatusMatriz);
    setMensagem("");
  }, [matriz]);

  const inicializar = async () => {
    setMensagem("");
    const resultado = await inicializarMutation.mutateAsync();
    await listaQuery.refetch();
    setMensagem(
      resultado.ausentes?.length
        ? `Matrizes preparadas. Cadastros não localizados: ${resultado.ausentes.join(", ")}.`
        : "As sete matrizes da UTIC foram preparadas no servidor."
    );
  };

  const salvar = async () => {
    if (!matriz) return;
    const linhas = Object.values(edicoes);
    if (linhas.some((item) => !item.relacao)) {
      setMensagem("Classifique os oito eixos antes de validar a matriz.");
      return;
    }
    setMensagem("");
    for (const eixo of linhas) {
      await salvarEixoMutation.mutateAsync({
        matrizId: Number(matriz.id),
        eixoId: eixo.eixoId,
        eixo: eixo.eixo,
        relacao: eixo.relacao,
        anterior: eixo.anterior,
        motivo,
        observacao,
      });
    }
    await atualizarStatusMutation.mutateAsync({
      matrizId: Number(matriz.id),
      status,
      fonte: fonte.trim() || null,
      observacao: observacao.trim() || null,
    });
    await listaQuery.refetch();
    setMensagem("Matriz salva no servidor e registrada para auditoria.");
  };

  const salvando =
    inicializarMutation.isPending || salvarEixoMutation.isPending || atualizarStatusMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Administração dos Eixos Técnicos</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Cadastro permanente da relação entre empregado, eixos de conhecimento e linha de base histórica.
        </p>
        <Badge variant="outline">UTIC — dados armazenados no servidor</Badge>
      </div>

      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle>Preparação das matrizes oficiais</CardTitle>
          </div>
          <CardDescription>
            A operação é idempotente: cria apenas o que ainda não existe e não substitui alterações já salvas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={inicializar} disabled={salvando}>
            {inicializarMutation.isPending ? "Preparando..." : "Preparar matrizes oficiais da UTIC"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Cinco empregados receberão os dados históricos provisórios. Ellen e Wescley permanecerão pendentes, sem eixos presumidos.
          </p>
        </CardContent>
      </Card>

      {listaQuery.isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando matrizes...</CardContent></Card>
      ) : matrizes.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma matriz foi preparada.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Empregado</CardTitle>
              <CardDescription>Selecione o empregado para consultar ou completar os oito eixos.</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={matrizSelecionada ?? ""}
                onChange={(event) => setMatrizSelecionada(Number(event.target.value))}
                className="h-10 w-full max-w-2xl rounded-md border bg-background px-3 text-sm"
              >
                {matrizes.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.colaboradorNome} — {STATUS_LABEL[item.status as StatusMatriz]}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {matriz && (
            <Card>
              <CardHeader>
                <CardTitle>{matriz.colaboradorNome}</CardTitle>
                <CardDescription>{matriz.cargo} · {matriz.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {matriz.status === "PENDENTE_HISTORICO" && (
                  <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Aguardando inclusão e validação dos eixos históricos</p>
                      <p className="mt-1">
                        Há evidência de avaliação anterior, mas o relatório ainda não foi localizado. A matriz não deve ser liberada para aplicação enquanto permanecer pendente.
                      </p>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b text-left">
                        <th className="px-4 py-3">Eixo de conhecimento</th>
                        <th className="px-4 py-3">Relação com a função</th>
                        <th className="px-4 py-3">Resultado anterior (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EIXOS_PADRAO.map((eixo) => {
                        const edicao = edicoes[eixo.eixoId];
                        return (
                          <tr key={eixo.eixoId} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{eixo.eixo}</td>
                            <td className="px-4 py-3">
                              <select
                                value={edicao?.relacao ?? ""}
                                onChange={(event) =>
                                  setEdicoes((atual) => ({
                                    ...atual,
                                    [eixo.eixoId]: { ...atual[eixo.eixoId], relacao: event.target.value as RelacaoEixo },
                                  }))
                                }
                                className="h-9 min-w-[250px] rounded-md border bg-background px-2"
                              >
                                <option value="">Selecione...</option>
                                {Object.entries(RELACAO_LABEL).map(([valor, rotulo]) => (
                                  <option key={valor} value={valor}>{rotulo}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={edicao?.anterior ?? ""}
                                placeholder="Sem percentual localizado"
                                onChange={(event) =>
                                  setEdicoes((atual) => ({
                                    ...atual,
                                    [eixo.eixoId]: {
                                      ...atual[eixo.eixoId],
                                      anterior: event.target.value === "" ? null : Number(event.target.value),
                                    },
                                  }))
                                }
                                className="h-9 w-52 rounded-md border bg-background px-3"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    Situação da matriz
                    <select value={status} onChange={(event) => setStatus(event.target.value as StatusMatriz)} className="h-10 w-full rounded-md border bg-background px-3 font-normal">
                      {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Motivo do registro
                    <input value={motivo} onChange={(event) => setMotivo(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 font-normal" />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Fonte
                    <textarea value={fonte} onChange={(event) => setFonte(event.target.value)} rows={3} className="w-full rounded-md border bg-background p-3 font-normal" />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    Observação
                    <textarea value={observacao} onChange={(event) => setObservacao(event.target.value)} rows={3} className="w-full rounded-md border bg-background p-3 font-normal" />
                  </label>
                </div>

                <Button onClick={salvar} disabled={salvando || motivo.trim().length < 3}>
                  <Save className="mr-2 h-4 w-4" />
                  {salvando ? "Salvando..." : "Salvar matriz no servidor"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {mensagem && <div className="rounded-md border bg-muted/30 p-4 text-sm">{mensagem}</div>}
      {listaQuery.error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{listaQuery.error.message}</div>}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, History, Save, Search, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type RelacaoEixo = "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL";
type StatusClassificacao = "CLASSIFICADO" | "PENDENTE";
type StatusMatriz = "VALIDADA_PROVISORIA" | "VALIDADA_DEFINITIVA" | "PENDENTE_HISTORICO";

type EixoEdicao = {
  eixoId: string;
  eixo: string;
  relacao: RelacaoEixo | "";
  statusClassificacao: StatusClassificacao;
  justificativa: string;
  anterior: number | null;
};

const STATUS_LABEL: Record<StatusMatriz, string> = {
  VALIDADA_PROVISORIA: "Validada provisoriamente",
  VALIDADA_DEFINITIVA: "Validada definitivamente",
  PENDENTE_HISTORICO: "Pendente de informações",
};

const RELACAO_LABEL: Record<RelacaoEixo, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_ESSENCIAL: "Não essencial",
};

function normalizar(valor: unknown) {
  return String(valor ?? "").trim().toLocaleLowerCase("pt-BR");
}

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR");
}

function descreverValor(valor: any) {
  if (!valor) return "Sem registro anterior";
  if (typeof valor === "string") return valor;
  if (valor.status) return STATUS_LABEL[valor.status as StatusMatriz] ?? valor.status;
  const relacao = valor.statusClassificacao === "PENDENTE"
    ? "Pendente de análise"
    : RELACAO_LABEL[valor.relacao as RelacaoEixo] ?? valor.relacao ?? "Sem classificação";
  const pontuacao = valor.anterior === null || valor.anterior === undefined
    ? "sem pontuação"
    : `${Number(valor.anterior).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return `${relacao} · ${pontuacao}`;
}

export default function AdminEixosTecnicos() {
  const api = (trpc as any).provaUticMatriz;
  const listaQuery = api.listar.useQuery(undefined, { refetchOnWindowFocus: false });
  const salvarEixoMutation = api.salvarEixo.useMutation();
  const atualizarStatusMutation = api.atualizarStatus.useMutation();
  const matrizes = listaQuery.data ?? [];

  const unidades = useMemo(
    () => Array.from(new Set(matrizes.map((item: any) => item.unidadeNome || "Sem unidade"))).sort((a, b) =>
      String(a).localeCompare(String(b), "pt-BR"),
    ),
    [matrizes],
  );

  const [busca, setBusca] = useState("");
  const [unidade, setUnidade] = useState("");
  const [matrizSelecionada, setMatrizSelecionada] = useState<number | null>(null);
  const [edicoes, setEdicoes] = useState<Record<string, EixoEdicao>>({});
  const [motivo, setMotivo] = useState("Revisão administrativa da matriz de eixos");
  const [fonte, setFonte] = useState("");
  const [observacao, setObservacao] = useState("");
  const [status, setStatus] = useState<StatusMatriz>("PENDENTE_HISTORICO");
  const [mensagem, setMensagem] = useState("");
  const [aba, setAba] = useState<"individual" | "departamento">("individual");
  const [deptSelecionado, setDeptSelecionado] = useState("");
  const [buscaEixo, setBuscaEixo] = useState("");
  const deptQuery = api.listarPorDepartamento.useQuery(undefined, {
    enabled: aba === "departamento",
    refetchOnWindowFocus: false,
  });
  const departamentos: any[] = deptQuery.data ?? [];
  const departamentosFiltrados = useMemo(() => {
    const termo = normalizar(buscaEixo);
    return departamentos
      .filter((d: any) => !deptSelecionado || d.unidadeNome === deptSelecionado)
      .map((d: any) => ({
        ...d,
        eixos: termo ? d.eixos.filter((e: any) => normalizar(e.eixo).includes(termo) || normalizar(e.eixoId).includes(termo)) : d.eixos,
      }))
      .filter((d: any) => d.eixos.length > 0);
  }, [departamentos, deptSelecionado, buscaEixo]);

  const exportarCsv = () => {
    const cab = ["Unidade", "Eixo ID", "Eixo", "Empregados", "Essencial", "Transversal", "Não essencial", "Pendente", "Sem pontuação", "Média (%)"];
    const linhas = departamentosFiltrados.flatMap((d: any) => d.eixos.map((e: any) => [
      d.unidadeNome, e.eixoId, e.eixo, e.totalEmpregados, e.essencial, e.transversal, e.naoEssencial, e.pendente, e.semPontuacao,
      e.mediaPontuacao === null ? "" : String(e.mediaPontuacao).replace(".", ","),
    ]));
    const csv = [cab, ...linhas].map((l) => l.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eixos_por_departamento${deptSelecionado ? "_" + deptSelecionado.replace(/\W+/g, "_") : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const matrizesFiltradas = useMemo(() => {
    const termo = normalizar(busca);
    return matrizes.filter((item: any) => {
      const unidadeItem = item.unidadeNome || "Sem unidade";
      const correspondeUnidade = !unidade || unidadeItem === unidade;
      const correspondeBusca = !termo || [item.colaboradorNome, item.email, item.cargo, unidadeItem]
        .some((valor) => normalizar(valor).includes(termo));
      return correspondeUnidade && correspondeBusca;
    });
  }, [busca, matrizes, unidade]);

  useEffect(() => {
    if (matrizSelecionada === null) return;
    const selecionadaVisivel = matrizesFiltradas.some((item: any) => Number(item.id) === matrizSelecionada);
    if (!selecionadaVisivel) setMatrizSelecionada(null);
  }, [matrizSelecionada, matrizesFiltradas]);

  const matriz = useMemo(
    () => matrizes.find((item: any) => Number(item.id) === matrizSelecionada) ?? null,
    [matrizes, matrizSelecionada],
  );

  const historicoQuery = api.listarHistorico.useQuery(
    { matrizId: matrizSelecionada ?? 1 },
    { enabled: matrizSelecionada !== null, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!matriz) return;
    const novos: Record<string, EixoEdicao> = {};
    for (const eixo of matriz.eixos ?? []) {
      novos[eixo.eixoId] = {
        eixoId: eixo.eixoId,
        eixo: eixo.eixo,
        relacao: eixo.relacao ?? "",
        statusClassificacao: eixo.statusClassificacao === "PENDENTE" ? "PENDENTE" : "CLASSIFICADO",
        justificativa: eixo.justificativa ?? "",
        anterior: eixo.anterior === null || eixo.anterior === undefined ? null : Number(eixo.anterior),
      };
    }
    setEdicoes(novos);
    setFonte(matriz.fonte ?? "");
    setObservacao(matriz.observacao ?? "");
    setStatus(matriz.status as StatusMatriz);
    setMensagem("");
  }, [matriz]);

  const salvar = async () => {
    if (!matriz) return;
    const linhas = Object.values(edicoes);
    if (linhas.length === 0) {
      setMensagem("Este empregado ainda não possui eixos importados.");
      return;
    }
    if (linhas.some((item) => item.statusClassificacao === "CLASSIFICADO" && !item.relacao)) {
      setMensagem("Classifique como Essencial, Transversal ou Não essencial todos os eixos marcados como classificados.");
      return;
    }
    if (motivo.trim().length < 3) {
      setMensagem("Informe o motivo da correção para preservar a auditoria.");
      return;
    }

    const originais = new Map((matriz.eixos ?? []).map((item: any) => [item.eixoId, item]));
    const alterados = linhas.filter((eixo) => {
      const original: any = originais.get(eixo.eixoId);
      const anteriorOriginal = original?.anterior === null || original?.anterior === undefined
        ? null
        : Number(original.anterior);
      return original?.relacao !== (eixo.statusClassificacao === "PENDENTE" ? null : eixo.relacao) ||
        (original?.statusClassificacao ?? "CLASSIFICADO") !== eixo.statusClassificacao ||
        (original?.justificativa ?? "") !== eixo.justificativa ||
        anteriorOriginal !== eixo.anterior ||
        original?.eixo !== eixo.eixo;
    });
    const metadadosAlterados =
      matriz.status !== status ||
      (matriz.fonte ?? "") !== fonte.trim() ||
      (matriz.observacao ?? "") !== observacao.trim();

    if (alterados.length === 0 && !metadadosAlterados) {
      setMensagem("Nenhuma alteração foi identificada.");
      return;
    }

    setMensagem("");
    try {
      for (const eixo of alterados) {
        await salvarEixoMutation.mutateAsync({
          matrizId: Number(matriz.id),
          eixoId: eixo.eixoId,
          eixo: eixo.eixo,
          relacao: eixo.statusClassificacao === "PENDENTE" ? null : eixo.relacao,
          statusClassificacao: eixo.statusClassificacao,
          justificativa: eixo.justificativa.trim() || null,
          anterior: eixo.anterior,
          motivo: motivo.trim(),
          observacao: observacao.trim() || undefined,
        });
      }
      if (metadadosAlterados) {
        await atualizarStatusMutation.mutateAsync({
          matrizId: Number(matriz.id),
          status,
          fonte: fonte.trim() || null,
          observacao: observacao.trim() || null,
        });
      }
      await Promise.all([listaQuery.refetch(), historicoQuery.refetch()]);
      setMensagem(
        alterados.length === 1
          ? "Correção salva. A Evolução passará a usar a classificação e a pontuação atualizadas."
          : `${alterados.length} correções salvas. A Evolução passará a usar os valores atualizados.`,
      );
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível salvar a correção.");
    }
  };

  const salvando = salvarEixoMutation.isPending || atualizarStatusMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Eixos Técnicos</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Administração das classificações e pontuações históricas utilizadas em Avaliações e Evolução.
        </p>
        <Badge variant="outline">Todas as unidades administrativas e Regionais</Badge>
      </div>

      <div className="flex gap-1 border-b">
        {([["individual", "Por Empregado"], ["departamento", "Por Departamento"]] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${aba === valor ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "individual" && (<>

      <Card>
        <CardHeader>
          <CardTitle>Localizar empregado</CardTitle>
          <CardDescription>Filtre por unidade e localize o empregado que precisa de conferência ou correção.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(320px,1.3fr)]">
          <label className="space-y-2 text-sm font-medium">
            Unidade
            <select
              value={unidade}
              onChange={(event) => {
                setUnidade(event.target.value);
                setMatrizSelecionada(null);
              }}
              className="h-10 w-full rounded-md border bg-background px-3 font-normal"
            >
              <option value="">Todas as unidades</option>
              {unidades.map((nome) => <option key={String(nome)} value={String(nome)}>{String(nome)}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            Buscar por nome, e-mail ou cargo
            <span className="relative block">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input value={busca} onChange={(event) => setBusca(event.target.value)} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 font-normal" />
            </span>
          </label>
          <label className="space-y-2 text-sm font-medium lg:col-span-2">
            Empregado
            <select
              value={matrizSelecionada ?? ""}
              onChange={(event) => {
                const valor = event.target.value;
                setMatrizSelecionada(valor ? Number(valor) : null);
              }}
              disabled={matrizesFiltradas.length === 0}
              className="h-10 w-full rounded-md border bg-background px-3 font-normal"
            >
              <option value="">{matrizesFiltradas.length === 0 ? "Nenhum empregado localizado" : "Selecione um empregado"}</option>
              {matrizesFiltradas.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.colaboradorNome} — {item.unidadeNome || "Sem unidade"} — {STATUS_LABEL[item.status as StatusMatriz]}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {listaQuery.isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando matrizes...</CardContent></Card>
      ) : matrizes.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma matriz de eixos foi importada.</CardContent></Card>
      ) : matriz ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{matriz.colaboradorNome}</CardTitle>
              <CardDescription>{matriz.cargo} · {matriz.unidadeNome || "Unidade não informada"} · {matriz.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {matriz.status === "PENDENTE_HISTORICO" && (
                <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Matriz com informações pendentes</p>
                    <p className="mt-1">Complete as pontuações ou classificações faltantes antes da validação definitiva.</p>
                  </div>
                </div>
              )}

              {(matriz.eixos ?? []).length === 0 ? (
                <div className="rounded-md border p-5 text-sm text-muted-foreground">Os eixos deste empregado ainda não foram importados.</div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[1250px] text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b text-left">
                        <th className="px-4 py-3">Eixo de conhecimento</th>
                        <th className="px-4 py-3">Situação</th>
                        <th className="px-4 py-3">Classificação para a função</th>
                        <th className="px-4 py-3">Justificativa</th>
                        <th className="px-4 py-3">Pontuação histórica (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(matriz.eixos ?? []).map((eixo: any) => {
                        const edicao = edicoes[eixo.eixoId];
                        return (
                          <tr key={eixo.eixoId} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{eixo.eixo}</td>
                            <td className="px-4 py-3">
                              <select
                                value={edicao?.statusClassificacao ?? "CLASSIFICADO"}
                                onChange={(event) => setEdicoes((atual) => ({
                                  ...atual,
                                  [eixo.eixoId]: {
                                    ...atual[eixo.eixoId],
                                    statusClassificacao: event.target.value as StatusClassificacao,
                                    relacao: event.target.value === "PENDENTE" ? "" : atual[eixo.eixoId].relacao,
                                  },
                                }))}
                                className="h-9 min-w-[180px] rounded-md border bg-background px-2"
                              >
                                <option value="CLASSIFICADO">Classificado</option>
                                <option value="PENDENTE">Pendente de análise</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={edicao?.relacao ?? ""}
                                disabled={edicao?.statusClassificacao === "PENDENTE"}
                                onChange={(event) => setEdicoes((atual) => ({
                                  ...atual,
                                  [eixo.eixoId]: { ...atual[eixo.eixoId], relacao: event.target.value as RelacaoEixo },
                                }))}
                                className="h-9 min-w-[220px] rounded-md border bg-background px-2"
                              >
                                <option value="">Selecione...</option>
                                {Object.entries(RELACAO_LABEL).map(([valor, rotulo]) => (
                                  <option key={valor} value={valor}>{rotulo}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <textarea
                                value={edicao?.justificativa ?? ""}
                                onChange={(event) => setEdicoes((atual) => ({
                                  ...atual,
                                  [eixo.eixoId]: { ...atual[eixo.eixoId], justificativa: event.target.value },
                                }))}
                                rows={3}
                                className="min-w-[320px] rounded-md border bg-background p-2"
                                placeholder="Justifique a classificação deste eixo para este empregado."
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={edicao?.anterior ?? ""}
                                placeholder="Pontuação pendente"
                                onChange={(event) => setEdicoes((atual) => ({
                                  ...atual,
                                  [eixo.eixoId]: {
                                    ...atual[eixo.eixoId],
                                    anterior: event.target.value === "" ? null : Number(event.target.value),
                                  },
                                }))}
                                className="h-9 w-52 rounded-md border bg-background px-3"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Situação da matriz
                  <select value={status} onChange={(event) => setStatus(event.target.value as StatusMatriz)} className="h-10 w-full rounded-md border bg-background px-3 font-normal">
                    {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Motivo da correção
                  <input value={motivo} onChange={(event) => setMotivo(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 font-normal" />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Fonte das informações
                  <textarea value={fonte} onChange={(event) => setFonte(event.target.value)} rows={3} className="w-full rounded-md border bg-background p-3 font-normal" />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Observação da correção
                  <textarea value={observacao} onChange={(event) => setObservacao(event.target.value)} rows={3} className="w-full rounded-md border bg-background p-3 font-normal" placeholder="Ex.: classificação revista após manifestação do empregado e conferência das atividades declaradas." />
                </label>
              </div>

              <Button onClick={salvar} disabled={salvando || (matriz.eixos ?? []).length === 0}>
                <Save className="mr-2 h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar correções"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <CardTitle>Histórico de alterações</CardTitle>
              </div>
              <CardDescription>Registro de quem alterou, quando alterou e qual foi o motivo informado.</CardDescription>
            </CardHeader>
            <CardContent>
              {historicoQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : (historicoQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há correções registradas para este empregado.</p>
              ) : (
                <div className="space-y-3">
                  {(historicoQuery.data ?? []).map((item: any) => (
                    <div key={item.id} className="rounded-md border p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{item.motivo}</p>
                        <p className="text-xs text-muted-foreground">{formatarData(item.createdAt)}</p>
                      </div>
                      {item.eixoId && <p className="mt-1 text-xs text-muted-foreground">Eixo: {item.eixoId}</p>}
                      <p className="mt-2"><span className="text-muted-foreground">De:</span> {descreverValor(item.valorAnterior)}</p>
                      <p><span className="text-muted-foreground">Para:</span> {descreverValor(item.valorNovo)}</p>
                      {item.observacao && <p className="mt-2">Observação: {item.observacao}</p>}
                      <p className="mt-2 text-xs text-muted-foreground">Alterado por {item.alteradoPorNome || "usuário administrador"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {mensagem && <div className="rounded-md border bg-muted/30 p-4 text-sm">{mensagem}</div>}
      {listaQuery.error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{listaQuery.error.message}</div>}
      </>)}

      {aba === "departamento" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eixos Técnicos por Departamento</CardTitle>
              <CardDescription>
                Todos os eixos técnicos de cada unidade, com a quantidade de empregados por classificação e a média da pontuação histórica.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(320px,1.3fr)_auto] lg:items-end">
              <label className="space-y-2 text-sm font-medium">
                Unidade
                <select value={deptSelecionado} onChange={(e) => setDeptSelecionado(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 font-normal">
                  <option value="">Todas as unidades</option>
                  {departamentos.map((d: any) => <option key={d.unidadeNome} value={d.unidadeNome}>{d.unidadeNome}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Buscar eixo
                <span className="relative block">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input value={buscaEixo} onChange={(e) => setBuscaEixo(e.target.value)} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 font-normal" />
                </span>
              </label>
              <Button type="button" variant="outline" onClick={exportarCsv} disabled={departamentosFiltrados.length === 0}>
                Exportar CSV
              </Button>
            </CardContent>
          </Card>

          {deptQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eixos por departamento...</CardContent></Card>
          ) : deptQuery.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{deptQuery.error.message}</div>
          ) : departamentosFiltrados.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum eixo encontrado para o filtro selecionado.</CardContent></Card>
          ) : (
            departamentosFiltrados.map((dept: any) => (
              <Card key={dept.unidadeNome}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{dept.unidadeNome}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{dept.eixos.length} eixo{dept.eixos.length !== 1 ? "s" : ""}</Badge>
                      <Badge variant="outline">{dept.totalEmpregados} empregado{dept.totalEmpregados !== 1 ? "s" : ""}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b text-left">
                          <th className="px-4 py-3">Eixo de conhecimento</th>
                          <th className="px-4 py-3 text-center">Empregados</th>
                          <th className="px-4 py-3 text-center">Essencial</th>
                          <th className="px-4 py-3 text-center">Transversal</th>
                          <th className="px-4 py-3 text-center">Não essencial</th>
                          <th className="px-4 py-3 text-center">Pendente</th>
                          <th className="px-4 py-3 text-center">Média histórica</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dept.eixos.map((eixo: any) => (
                          <tr key={eixo.eixoId} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{eixo.eixo}</td>
                            <td className="px-4 py-3 text-center">{eixo.totalEmpregados}</td>
                            <td className="px-4 py-3 text-center">{eixo.essencial || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-center">{eixo.transversal || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-center">{eixo.naoEssencial || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-center">{eixo.pendente ? <span className="font-semibold text-amber-700">{eixo.pendente}</span> : <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-center">
                              {eixo.mediaPontuacao === null
                                ? <span className="text-muted-foreground">—</span>
                                : `${Number(eixo.mediaPontuacao).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

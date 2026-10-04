import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, History, Inbox, Save, Search, Settings2, XCircle } from "lucide-react";
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

// Regionais: nome contém "Regional" ou começa com a sigla de uma das 8 regionais.
function ehRegional(nome: unknown) {
  const texto = String(nome ?? "").trim();
  return /regional/i.test(texto) || /^(RBP|RME|RMN|RNO|RPJ|RSG|RSU|RVA)\b/i.test(texto);
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
  if (valor.removido) return "Eixo removido da matriz";
  const relacao = valor.statusClassificacao === "PENDENTE"
    ? "Pendente de análise"
    : RELACAO_LABEL[valor.relacao as RelacaoEixo] ?? valor.relacao ?? "Sem classificação";
  const pontuacao = valor.anterior === null || valor.anterior === undefined
    ? "sem pontuação"
    : `${Number(valor.anterior).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return `${relacao} · ${pontuacao}`;
}

function CartaoSolicitacao({ solicitacao, onRespondida }: { solicitacao: any; onRespondida: (mensagem: string) => void }) {
  const api = (trpc as any).provaUticMatriz;
  const responder = api.responderSolicitacao.useMutation();
  const [relacaoFinal, setRelacaoFinal] = useState<RelacaoEixo>(solicitacao.relacaoSolicitada);
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState("");
  const pendente = solicitacao.status === "PENDENTE";

  const enviar = async (decisao: "AJUSTADA" | "MANTIDA") => {
    setErro("");
    if (resposta.trim().length < 5) {
      setErro(decisao === "AJUSTADA"
        ? "Escreva a justificativa da nova classificação (ela será exibida ao empregado)."
        : "Explique ao empregado por que a classificação foi mantida.");
      return;
    }
    try {
      await responder.mutateAsync({ id: Number(solicitacao.id), decisao, relacaoFinal: decisao === "AJUSTADA" ? relacaoFinal : undefined, resposta: resposta.trim() });
      onRespondida(decisao === "AJUSTADA"
        ? `Eixo "${solicitacao.eixo}" de ${solicitacao.colaboradorNome} reclassificado para ${RELACAO_LABEL[relacaoFinal]}. A Evolução já usa a nova classificação e o empregado foi avisado.`
        : `Classificação do eixo "${solicitacao.eixo}" mantida. ${solicitacao.colaboradorNome} foi avisado(a).`);
    } catch (error: any) {
      setErro(error?.message || "Não foi possível registrar a resposta.");
    }
  };

  return (
    <div className={`rounded-lg border p-4 text-sm ${pendente ? "border-amber-300 bg-amber-50/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{solicitacao.colaboradorNome} <span className="font-normal text-muted-foreground">· {solicitacao.unidadeNome || "Sem unidade"}</span></p>
          <p className="mt-1"><span className="font-medium">{solicitacao.eixo}</span>: {solicitacao.relacaoAtual ? RELACAO_LABEL[solicitacao.relacaoAtual as RelacaoEixo] ?? solicitacao.relacaoAtual : "Pendente de análise"} → <span className="font-medium">{RELACAO_LABEL[solicitacao.relacaoSolicitada as RelacaoEixo]}</span></p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Solicitado em {formatarData(solicitacao.createdAt)}</p>
          {!pendente && (
            <Badge variant="outline" className={solicitacao.status === "AJUSTADA" ? "mt-1 border-green-300 bg-green-50 text-green-800" : "mt-1"}>
              {solicitacao.status === "AJUSTADA" ? `Ajustada para ${RELACAO_LABEL[solicitacao.relacaoFinal as RelacaoEixo] ?? solicitacao.relacaoFinal}` : "Classificação mantida"}
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-2 rounded-md bg-background/70 p-2"><span className="text-muted-foreground">Justificativa do empregado:</span> {solicitacao.justificativa}</p>

      {pendente ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <label className="space-y-1 text-xs font-medium">
              Classificação final (se ajustar)
              <select value={relacaoFinal} onChange={(event) => setRelacaoFinal(event.target.value as RelacaoEixo)} className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal">
                {Object.entries(RELACAO_LABEL).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium">
              Resposta ao empregado / nova justificativa do eixo
              <textarea value={resposta} onChange={(event) => setResposta(event.target.value)} rows={2} className="w-full rounded-md border bg-background p-2 text-sm font-normal" placeholder="Ex.: Atividade de atendimento declarada como principal no questionário; eixo passa a ser essencial." />
            </label>
          </div>
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => enviar("AJUSTADA")} disabled={responder.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />Ajustar classificação
            </Button>
            <Button size="sm" variant="outline" onClick={() => enviar("MANTIDA")} disabled={responder.isPending}>
              <XCircle className="mr-2 h-4 w-4" />Manter classificação
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-muted-foreground">
          {solicitacao.respostaAdmin && <p className="text-sm text-foreground">Resposta: {solicitacao.respostaAdmin}</p>}
          <p className="mt-1">Respondida por {solicitacao.respondidoPorNome || "administrador"} em {formatarData(solicitacao.respondidoEm)}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminEixosTecnicos() {
  const api = (trpc as any).provaUticMatriz;
  const utils = trpc.useUtils();
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
  const [aba, setAba] = useState<"individual" | "departamento" | "solicitacoes" | "revisoes">("individual");
  const [filtroSolicitacao, setFiltroSolicitacao] = useState<"PENDENTE" | "TODAS">("PENDENTE");
  const [mensagemSolicitacao, setMensagemSolicitacao] = useState("");
  const solicitacoesQuery = api.listarSolicitacoes.useQuery(undefined, { refetchOnWindowFocus: false });
  const solicitacoes: any[] = solicitacoesQuery.data ?? [];
  const totalPendentes = solicitacoes.filter((item) => item.status === "PENDENTE").length;
  const revisoesQuery = api.listarRevisoesQuestionario.useQuery(undefined, { refetchOnWindowFocus: false });
  const decidirRevisaoMutation = api.decidirRevisaoQuestionario.useMutation();
  const gerarCatalogoMutation = api.gerarCatalogoEixos.useMutation();
  const analisarQuestionarioMutation = api.analisarQuestionarioEmpregado.useMutation();
  const revisoes: any[] = revisoesQuery.data ?? [];
  const revisoesPendentes = revisoes.filter((item) => item.status === "PENDENTE");
  const totalRevisoesPendentes = revisoesPendentes.length;
  const [deptSelecionado, setDeptSelecionado] = useState("");
  const [buscaEixo, setBuscaEixo] = useState("");
  const [grupo, setGrupo] = useState<"regionais" | "administrativas" | "todas">("regionais");
  const deptQuery = api.listarPorDepartamento.useQuery(undefined, {
    enabled: aba === "departamento",
    refetchOnWindowFocus: false,
  });
  const departamentos: any[] = deptQuery.data ?? [];

  const departamentosDoGrupo = useMemo(
    () => departamentos.filter((d: any) => grupo === "todas" || (ehRegional(d.unidadeNome) ? grupo === "regionais" : grupo === "administrativas")),
    [departamentos, grupo],
  );

  // Consolidado: soma os eixos de todas as unidades do grupo em uma única tabela.
  const consolidado = useMemo(() => {
    const eixos = new Map<string, any>();
    let totalEmpregados = 0;
    for (const d of departamentosDoGrupo) {
      totalEmpregados += Number(d.totalEmpregados);
      for (const e of d.eixos) {
        const atual = eixos.get(e.eixoId) ?? {
          eixoId: e.eixoId, eixo: e.eixo, totalEmpregados: 0, qtdPontuacao: 0, somaPontuacao: 0,
          menorPontuacao: null as number | null, maiorPontuacao: null as number | null, unidades: 0,
        };
        atual.totalEmpregados += e.totalEmpregados;
        atual.qtdPontuacao += e.qtdPontuacao;
        atual.somaPontuacao += e.somaPontuacao;
        if (e.menorPontuacao !== null) atual.menorPontuacao = atual.menorPontuacao === null ? e.menorPontuacao : Math.min(atual.menorPontuacao, e.menorPontuacao);
        if (e.maiorPontuacao !== null) atual.maiorPontuacao = atual.maiorPontuacao === null ? e.maiorPontuacao : Math.max(atual.maiorPontuacao, e.maiorPontuacao);
        atual.unidades += 1;
        eixos.set(e.eixoId, atual);
      }
    }
    return {
      unidadeNome: grupo === "regionais" ? "Consolidado das Regionais" : grupo === "administrativas" ? "Consolidado das Unidades Administrativas" : "Consolidado de todas as unidades",
      totalEmpregados,
      totalUnidades: departamentosDoGrupo.length,
      consolidado: true,
      eixos: Array.from(eixos.values())
        .map((e) => ({ ...e, mediaPontuacao: e.qtdPontuacao ? Number((e.somaPontuacao / e.qtdPontuacao).toFixed(2)) : null }))
        .sort((x, y) => String(x.eixo).localeCompare(String(y.eixo), "pt-BR")),
    };
  }, [departamentosDoGrupo, grupo]);

  const departamentosFiltrados = useMemo(() => {
    const termo = normalizar(buscaEixo);
    const base = deptSelecionado ? departamentosDoGrupo.filter((d: any) => d.unidadeNome === deptSelecionado) : [consolidado];
    return base
      .map((d: any) => ({ ...d, eixos: termo ? d.eixos.filter((e: any) => normalizar(e.eixo).includes(termo)) : d.eixos }))
      .filter((d: any) => d.eixos.length > 0);
  }, [departamentosDoGrupo, consolidado, deptSelecionado, buscaEixo]);

  const pct = (v: number | null) => v === null || v === undefined ? "" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

  const exportarCsv = () => {
    const cab = ["Unidade", "Eixo", "Unidades com o eixo", "Empregados com o eixo", "Média histórica (%)", "Menor (%)", "Maior (%)"];
    const linhas = departamentosFiltrados.flatMap((d: any) => d.eixos.map((e: any) => [
      d.unidadeNome, e.eixo, d.consolidado ? e.unidades : 1, e.totalEmpregados,
      ...[e.mediaPontuacao, e.menorPontuacao, e.maiorPontuacao].map((v) => (v === null ? "" : String(v).replace(".", ","))),
    ]));
    const csv = [cab, ...linhas].map((l) => l.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eixos_historicos_${(deptSelecionado || grupo).replace(/\W+/g, "_")}.csv`;
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

  const solicitacoesDaMatriz = useMemo(
    () => solicitacoes.filter((item) => Number(item.matrizId) === matrizSelecionada && item.status === "PENDENTE"),
    [solicitacoes, matrizSelecionada],
  );
  const eixosComPedido = useMemo(() => new Set(solicitacoesDaMatriz.map((item) => item.eixoId)), [solicitacoesDaMatriz]);
  const revisoesDaMatriz = useMemo(
    () => revisoesPendentes.filter((item) => Number(item.matrizId) === matrizSelecionada),
    [revisoesPendentes, matrizSelecionada],
  );
  const revisaoPorEixo = useMemo(
    () => new Map(revisoesDaMatriz.map((item) => [String(item.eixoId), item])),
    [revisoesDaMatriz],
  );

  const decidirRevisao = async (revisao: any, decisao: "AJUSTADA" | "MANTIDA") => {
    setMensagem("");
    try {
      await decidirRevisaoMutation.mutateAsync({ id: Number(revisao.id), decisao });
      await Promise.all([
        revisoesQuery.refetch(),
        listaQuery.refetch(),
        historicoQuery.refetch(),
        utils.bloco1CompetenciasFuncao.mapaIndividual.invalidate({ colaboradorId: Number(revisao.colaboradorId) }),
      ]);
      setMensagem(
        decisao === "AJUSTADA"
          ? `A classificação de "${revisao.eixo}" foi ajustada para ${RELACAO_LABEL[revisao.relacaoSugerida as RelacaoEixo]}.`
          : `A classificação atual de "${revisao.eixo}" foi mantida.`,
      );
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível registrar a decisão.");
    }
  };

  const aoResponder = async (texto: string, colaboradorId: number) => {
    setMensagemSolicitacao(texto);
    await Promise.all([
      solicitacoesQuery.refetch(),
      listaQuery.refetch(),
      utils.bloco1CompetenciasFuncao.mapaIndividual.invalidate({ colaboradorId }),
    ]);
  };

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

  const gerarCatalogo = async () => {
    setMensagem("");
    try {
      const resultado = await gerarCatalogoMutation.mutateAsync();
      setMensagem(`Catálogo preparado: ${resultado.salvos} eixo(s) descritos a partir das questões vinculadas.`);
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível gerar o catálogo dos eixos.");
    }
  };

  const analisarQuestionarioSelecionado = async () => {
    if (!matriz?.colaboradorId) return;
    setMensagem("");
    try {
      const resultado = await analisarQuestionarioMutation.mutateAsync({ colaboradorId: Number(matriz.colaboradorId) });
      await revisoesQuery.refetch();
      setMensagem(
        `Análise concluída para ${resultado.colaboradorNome}: ${resultado.eixosAnalisados} eixo(s) analisados, ${resultado.coerentes} coerente(s) e ${resultado.divergencias} revisão(ões) sugerida(s). Nenhuma classificação foi alterada automaticamente.`,
      );
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível analisar o questionário deste empregado.");
    }
  };

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
      await Promise.all([
        listaQuery.refetch(),
        historicoQuery.refetch(),
        utils.bloco1CompetenciasFuncao.mapaIndividual.invalidate({ colaboradorId: Number(matriz.colaboradorId) }),
      ]);
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
        {([["individual", "Por Empregado"], ["departamento", "Por Departamento"], ["revisoes", "Revisões do Questionário"], ["solicitacoes", "Solicitações dos Empregados"]] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${aba === valor ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {rotulo}
            {valor === "revisoes" && totalRevisoesPendentes > 0 && (
              <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{totalRevisoesPendentes}</span>
            )}
            {valor === "solicitacoes" && totalPendentes > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{totalPendentes}</span>
            )}
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
                  {item.colaboradorNome} — {item.unidadeNome || "Sem unidade"} — {STATUS_LABEL[item.status as StatusMatriz]}{(item.eixos ?? []).length > 0 && (item.eixos ?? []).every((eixo: any) => eixo.anterior === null || eixo.anterior === undefined) ? " — ⚠ sem histórico" : ""}{Number(item.solicitacoesPendentes) > 0 ? ` — 📩 ${item.solicitacoesPendentes} solicitação(ões) pendente(s)` : ""}
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
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>{matriz.colaboradorNome}</CardTitle>
                  <CardDescription>{matriz.cargo} · {matriz.unidadeNome || "Unidade não informada"} · {matriz.email}</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={analisarQuestionarioSelecionado}
                  disabled={analisarQuestionarioMutation.isPending}
                >
                  {analisarQuestionarioMutation.isPending ? "Analisando questionário..." : "Analisar questionário e eixos"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {(matriz.eixos ?? []).length > 0 && (matriz.eixos ?? []).every((eixo: any) => eixo.anterior === null || eixo.anterior === undefined) && (
                <div className="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Empregado sem pontuação histórica</p>
                    <p className="mt-1">Confirmar se não há avaliação no ciclo anterior (ex.: empregado admitido após a prova histórica). Enquanto isso, a Evolução deste empregado não terá ponto de partida para comparação.</p>
                  </div>
                </div>
              )}
              {matriz.status === "PENDENTE_HISTORICO" && (
                <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Matriz com informações pendentes</p>
                    <p className="mt-1">Complete as pontuações ou classificações faltantes antes da validação definitiva.</p>
                  </div>
                </div>
              )}

              {solicitacoesDaMatriz.length > 0 && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Inbox className="h-4 w-4" />Solicitações de reclassificação deste empregado aguardando resposta</p>
                  {solicitacoesDaMatriz.map((item) => (
                    <CartaoSolicitacao key={item.id} solicitacao={item} onRespondida={(texto) => aoResponder(texto, Number(item.colaboradorId))} />
                  ))}
                </div>
              )}
              {mensagemSolicitacao && <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">{mensagemSolicitacao}</div>}

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
                            <td className="px-4 py-3 font-medium">
                              {eixo.eixo}
                              {eixosComPedido.has(eixo.eixoId) && <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-800">📩 Solicitação pendente</Badge>}
                            </td>
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
                              {revisaoPorEixo.has(String(eixo.eixoId)) && (() => {
                                const revisao = revisaoPorEixo.get(String(eixo.eixoId));
                                return (
                                  <div className="mb-3 min-w-[360px] rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge className="bg-blue-600 text-white">Revisão sugerida</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Atual: {revisao.relacaoAtual ? RELACAO_LABEL[revisao.relacaoAtual as RelacaoEixo] : "Pendente"} → Sugerida: {RELACAO_LABEL[revisao.relacaoSugerida as RelacaoEixo]}
                                      </span>
                                    </div>
                                    {revisao.eixoDescricao && (
                                      <div className="mt-3 text-xs leading-5">
                                        <p className="font-semibold text-slate-800">O que é este eixo</p>
                                        <p className="mt-1 text-slate-600">{revisao.eixoDescricao}</p>
                                      </div>
                                    )}
                                    {Array.isArray(revisao.conhecimentos) && revisao.conhecimentos.length > 0 && (
                                      <div className="mt-3 text-xs leading-5">
                                        <p className="font-semibold text-slate-800">Conhecimentos que abrange</p>
                                        <p className="mt-1 text-slate-600">{revisao.conhecimentos.join(" · ")}</p>
                                      </div>
                                    )}
                                    <div className="mt-3 rounded-md bg-white/80 p-3 text-xs leading-5 text-slate-700">
                                      <p className="font-semibold">Justificativa fundamentada no questionário</p>
                                      <p className="mt-1">{revisao.justificativaSugerida}</p>
                                    </div>
                                    {Array.isArray(revisao.evidencias) && revisao.evidencias.length > 0 && (
                                      <details className="mt-3 rounded-md border bg-white/70 p-2 text-xs">
                                        <summary className="cursor-pointer font-medium">Ver respostas do questionário utilizadas</summary>
                                        <div className="mt-2 space-y-2">
                                          {revisao.evidencias.map((ev: any, indice: number) => (
                                            <div key={`${ev.chave || "evidencia"}-${indice}`} className="rounded border bg-white p-2">
                                              <p className="font-semibold">{ev.titulo || ev.chave}</p>
                                              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{ev.resposta}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button size="sm" onClick={() => decidirRevisao(revisao, "AJUSTADA")} disabled={decidirRevisaoMutation.isPending}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />Aceitar ajuste
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => decidirRevisao(revisao, "MANTIDA")} disabled={decidirRevisaoMutation.isPending}>
                                        <XCircle className="mr-2 h-4 w-4" />Manter classificação atual
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}
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
                Quantos empregados têm cada eixo técnico e a média da pontuação histórica. Regionais: prova histórica 2025. Unidades administrativas: pontuação histórica da matriz de eixos de cada empregado.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(180px,0.5fr)_minmax(220px,0.8fr)_minmax(240px,1fr)_auto] lg:items-end">
              <label className="space-y-2 text-sm font-medium">
                Grupo
                <select value={grupo} onChange={(e) => { setGrupo(e.target.value as any); setDeptSelecionado(""); }} className="h-10 w-full rounded-md border bg-background px-3 font-normal">
                  <option value="regionais">Regionais</option>
                  <option value="administrativas">Unidades administrativas</option>
                  <option value="todas">Todas</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Unidade
                <select value={deptSelecionado} onChange={(e) => setDeptSelecionado(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 font-normal">
                  <option value="">Consolidado do grupo</option>
                  {departamentosDoGrupo.map((d: any) => <option key={d.unidadeNome} value={d.unidadeNome}>{d.unidadeNome}</option>)}
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
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eixos...</CardContent></Card>
          ) : deptQuery.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{deptQuery.error.message}</div>
          ) : departamentosFiltrados.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum registro histórico encontrado para este filtro.</CardContent></Card>
          ) : (
            departamentosFiltrados.map((dept: any) => (
              <Card key={dept.unidadeNome}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{dept.unidadeNome}</CardTitle>
                    <div className="flex gap-2">
                      {dept.consolidado && <Badge variant="outline">{dept.totalUnidades} unidade{dept.totalUnidades !== 1 ? "s" : ""}</Badge>}
                      <Badge variant="outline">{dept.eixos.length} eixo{dept.eixos.length !== 1 ? "s" : ""}</Badge>
                      <Badge variant="outline">{dept.totalEmpregados} empregado{dept.totalEmpregados !== 1 ? "s" : ""}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b text-left">
                          <th className="px-4 py-3">Eixo técnico</th>
                          {dept.consolidado && <th className="px-4 py-3 text-center">Unidades</th>}
                          <th className="px-4 py-3 text-center">Empregados</th>
                          <th className="px-4 py-3 text-center">Média histórica</th>
                          <th className="px-4 py-3 text-center">Menor</th>
                          <th className="px-4 py-3 text-center">Maior</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dept.eixos.map((eixo: any) => (
                          <tr key={eixo.eixoId} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{eixo.eixo}</td>
                            {dept.consolidado && <td className="px-4 py-3 text-center">{eixo.unidades}</td>}
                            <td className="px-4 py-3 text-center">{eixo.totalEmpregados}</td>
                            <td className="px-4 py-3 text-center font-semibold">{pct(eixo.mediaPontuacao) || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-center">{pct(eixo.menorPontuacao) || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-center">{pct(eixo.maiorPontuacao) || <span className="text-muted-foreground">—</span>}</td>
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
      {aba === "revisoes" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Empregados com revisão sugerida</CardTitle>
                  <CardDescription>
                    Este relatório mostra somente unidade e empregado. Abra o empregado para ler a justificativa no próprio eixo e decidir se aceita o ajuste ou mantém a classificação atual.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={gerarCatalogo}
                  disabled={gerarCatalogoMutation.isPending}
                >
                  {gerarCatalogoMutation.isPending ? "Preparando catálogo..." : "Preparar catálogo dos eixos"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revisoesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando revisões...</p>
              ) : revisoesQuery.error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{revisoesQuery.error.message}</div>
              ) : (() => {
                const pessoas = new Map<string, any>();
                for (const item of revisoesPendentes) {
                  const chave = `${item.unidadeNome || "Sem unidade"}::${item.colaboradorId}`;
                  if (!pessoas.has(chave)) pessoas.set(chave, item);
                }
                const lista = Array.from(pessoas.values());
                return lista.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma revisão pendente.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b text-left">
                          <th className="px-4 py-3">Unidade</th>
                          <th className="px-4 py-3">Empregado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map((item: any) => (
                          <tr
                            key={`${item.unidadeNome || "Sem unidade"}-${item.colaboradorId}`}
                            className="cursor-pointer border-b last:border-0 hover:bg-blue-50/50"
                            onClick={() => {
                              setBusca("");
                              setUnidade("");
                              setMatrizSelecionada(Number(item.matrizId));
                              setAba("individual");
                            }}
                          >
                            <td className="px-4 py-3">{item.unidadeNome || "Sem unidade"}</td>
                            <td className="px-4 py-3 font-medium text-blue-700">{item.colaboradorNome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {aba === "solicitacoes" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de reclassificação</CardTitle>
              <CardDescription>
                Pedidos enviados pelos empregados na tela "Meus Eixos Técnicos". Ao ajustar, a classificação do eixo é atualizada,
                a Evolução do empregado passa a usá-la e ele é avisado por e-mail e notificação.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {([["PENDENTE", `Pendentes (${totalPendentes})`], ["TODAS", "Todas"]] as const).map(([valor, rotulo]) => (
                <Button key={valor} size="sm" variant={filtroSolicitacao === valor ? "default" : "outline"} onClick={() => setFiltroSolicitacao(valor)}>{rotulo}</Button>
              ))}
            </CardContent>
          </Card>
          {mensagemSolicitacao && <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">{mensagemSolicitacao}</div>}
          {solicitacoesQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando solicitações...</CardContent></Card>
          ) : solicitacoesQuery.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{solicitacoesQuery.error.message}</div>
          ) : (
            (() => {
              const visiveis = solicitacoes.filter((item) => filtroSolicitacao === "TODAS" || item.status === "PENDENTE");
              return visiveis.length === 0 ? (
                <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma solicitação {filtroSolicitacao === "PENDENTE" ? "pendente" : "registrada"}.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {visiveis.map((item) => (
                    <CartaoSolicitacao key={item.id} solicitacao={item} onRespondida={(texto) => aoResponder(texto, Number(item.colaboradorId))} />
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

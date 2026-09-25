import { useMemo, useState } from "react";
import { Activity, CalendarClock, Calculator, CheckCircle2, ClipboardCheck, Eye, PlayCircle, RefreshCw, Search, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "LIBERADA") return "default";
  if (status === "CALCULADA") return "secondary";
  if (status === "CANCELADA") return "destructive";
  return "outline";
}

export default function AdminAplicacoesProficiencia() {
  const { loading, user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";
  const [cicloId, setCicloId] = useState<number | null>(null);
  const [provaId, setProvaId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [agendadaPara, setAgendadaPara] = useState("");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [aplicacaoSelecionada, setAplicacaoSelecionada] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [logsColaboradorId, setLogsColaboradorId] = useState<number | null>(null);
  const [identidadeColaboradorId, setIdentidadeColaboradorId] = useState<number | null>(null);

  const provasQuery = trpc.aplicacoesProficiencia.listarProvasValidas.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
  });
  const ciclosQuery = trpc.ciclos.list.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
  });
  const participantesQuery = trpc.aplicacoesProficiencia.listarParticipantesDisponiveis.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
  });
  const aplicacoesQuery = trpc.aplicacoesProficiencia.listar.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchInterval: 5000,
  });
  const monitoramentoQuery = trpc.aplicacoesProficiencia.monitoramento.useQuery(
    { aplicacaoId: aplicacaoSelecionada ?? 1 },
    {
      enabled: Boolean(user && isAdmin && aplicacaoSelecionada),
      refetchInterval: 2000,
      refetchOnWindowFocus: true,
    },
  );
  const ocorrenciasQuery = trpc.aplicacoesProficiencia.listarOcorrencias.useQuery(
    { aplicacaoId: aplicacaoSelecionada ?? 1, colaboradorId: logsColaboradorId ?? undefined },
    { enabled: Boolean(user && isAdmin && aplicacaoSelecionada && logsColaboradorId), refetchInterval: 2000, refetchOnWindowFocus: true },
  );
  const identidadeQuery = trpc.aplicacoesProficiencia.consultarIdentidade.useQuery(
    { aplicacaoId: aplicacaoSelecionada ?? 1, colaboradorId: identidadeColaboradorId ?? 1 },
    { enabled: Boolean(user && isAdmin && aplicacaoSelecionada && identidadeColaboradorId), refetchOnWindowFocus: false },
  );

  const criarMutation = trpc.aplicacoesProficiencia.criar.useMutation({
    onSuccess: async (data) => {
      setMensagem(`Aplicação criada com ${data.participantes} participante(s).`);
      setAplicacaoSelecionada(data.id);
      setProvaId(null);
      setTitulo("");
      setAgendadaPara("");
      setSelecionados([]);
      await aplicacoesQuery.refetch();
    },
    onError: error => setMensagem(error.message),
  });

  const liberarMutation = trpc.aplicacoesProficiencia.liberar.useMutation({
    onSuccess: async () => {
      setMensagem("Prova liberada. Os participantes selecionados já podem iniciar.");
      await Promise.all([aplicacoesQuery.refetch(), monitoramentoQuery.refetch()]);
    },
    onError: error => setMensagem(error.message),
  });

  const cancelarMutation = (trpc as any).aplicacoesProficiencia.cancelar.useMutation({
    onSuccess: async () => {
      setMensagem("Aplicação cancelada. Os participantes podem ser agendados novamente. Se era um teste de homologação, a prova volta a aguardar um novo teste.");
      await Promise.all([aplicacoesQuery.refetch(), monitoramentoQuery.refetch()]);
    },
    onError: (error: any) => setMensagem(error.message),
  });

  const cancelarAplicacao = () => {
    if (!aplicacaoSelecionada) return;
    const motivo = window.prompt("Motivo do cancelamento (obrigatório, mínimo 5 caracteres):", "");
    if (motivo === null) return;
    if (motivo.trim().length < 5) { setMensagem("Informe um motivo com pelo menos 5 caracteres."); return; }
    cancelarMutation.mutate({ aplicacaoId: aplicacaoSelecionada, motivo: motivo.trim() });
  };

  const calcularMutation = trpc.aplicacoesProficiencia.calcular.useMutation({
    onSuccess: async data => {
      setMensagem(
        `Resultados calculados para ${data.calculados} participante(s). ${data.pendentes} participante(s) ainda pendente(s).`,
      );
      await Promise.all([aplicacoesQuery.refetch(), monitoramentoQuery.refetch()]);
    },
    onError: error => setMensagem(error.message),
  });

  const provasValidas = useMemo(
    () => ((provasQuery.data ?? []) as any[]).filter((prova: any) => cicloId && Number(prova.cicloId) === Number(cicloId)),
    [provasQuery.data, cicloId],
  );

  const provaSelecionada = useMemo(
    () => provasValidas.find((item: any) => Number(item.id) === Number(provaId)) ?? null,
    [provasValidas, provaId],
  );

  const normalizarUnidade = (valor: unknown) =>
    String(valor ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const participantes = (participantesQuery.data ?? []) as any[];

  // A unidade da aplicação é determinada pela própria prova.
  // Não existe seleção manual de unidade nesta etapa.
  const participantesDaUnidade = useMemo(() => {
    if (!provaSelecionada?.unidade) return [];
    const unidadeProva = normalizarUnidade(provaSelecionada.unidade);
    return participantes.filter((item: any) =>
      normalizarUnidade(item.departamentoNome) === unidadeProva,
    );
  }, [participantes, provaSelecionada]);

  const participantesFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return participantesDaUnidade.filter((item: any) => {
      if (!termo) return true;
      return [item.name, item.email, item.cargo, item.departamentoNome]
        .some(valor => String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo));
    });
  }, [busca, participantesDaUnidade]);

  const alternarParticipante = (id: number) => {
    setSelecionados(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const selecionarFiltrados = () => {
    const ids = participantesFiltrados.map(item => Number(item.id));
    setSelecionados(current => Array.from(new Set([...current, ...ids])));
  };

  const criarAplicacao = () => {
    setMensagem(null);
    if (!cicloId || !provaId || !titulo.trim() || !agendadaPara || selecionados.length === 0) {
      setMensagem("Informe o ciclo, a prova, o título, a data/horário e selecione pelo menos um participante.");
      return;
    }
    const data = new Date(agendadaPara);
    if (Number.isNaN(data.getTime())) {
      setMensagem("A data e o horário informados são inválidos.");
      return;
    }
    criarMutation.mutate({
      provaId,
      cicloId,
      titulo: titulo.trim(),
      agendadaPara: data.toISOString(),
      colaboradorIds: selecionados,
    });
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (!isAdmin) {
    return <div className="p-6"><Card className="border-red-200"><CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader><CardContent>Esta área é exclusiva do administrador.</CardContent></Card></div>;
  }

  const monitoramento = monitoramentoQuery.data as any;
  const aplicacaoMonitorada = monitoramento?.aplicacao;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold">Aplicações da Proficiência</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Planeje a aplicação, selecione uma prova validada, escolha os participantes, defina data e horário, libere no momento da aplicação e acompanhe a realização em tempo real.
        </p>
      </div>

      {mensagem && <div className="rounded-md border bg-slate-50 p-4 text-sm">{mensagem}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Planejar nova aplicação</CardTitle>
          <CardDescription>Selecione primeiro o ciclo. Depois, somente provas VALIDADA vinculadas a esse ciclo ficam disponíveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-1.5 text-sm font-medium">
              <span>Ciclo do PDI</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={cicloId ?? ""}
                onChange={event => {
                  const id = event.target.value ? Number(event.target.value) : null;
                  setCicloId(id);
                  setProvaId(null);
                  setSelecionados([]);
                  setBusca("");
                }}
              >
                <option value="">Selecione o ciclo</option>
                {(ciclosQuery.data ?? []).map((ciclo: any) => (
                  <option key={ciclo.id} value={Number(ciclo.id)}>
                    {ciclo.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>Prova validada</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={provaId ?? ""}
                disabled={!cicloId}
                onChange={event => {
                  const id = event.target.value ? Number(event.target.value) : null;
                  setProvaId(id);
                  setSelecionados([]);
                  setBusca("");
                  const prova = provasValidas.find((item: any) => Number(item.id) === id);
                  if (prova && !titulo.trim()) setTitulo(`${prova.nome} — ${prova.unidade}`);
                }}
              >
                <option value="">{cicloId ? "Selecione a prova" : "Selecione primeiro o ciclo"}</option>
                {provasValidas.map((prova: any) => (
                  <option key={prova.id} value={Number(prova.id)}>
                    {prova.codigo} — {prova.nome} — {prova.unidade}
                  </option>
                ))}
              </select>
              {cicloId && provasValidas.length === 0 && (
                <span className="block text-xs font-normal text-amber-700">Não há prova VALIDADA disponível neste ciclo.</span>
              )}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>Título da aplicação</span>
              <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={titulo} onChange={event => setTitulo(event.target.value)} placeholder="Ex.: Certificação 2026 — RBP" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>Data e horário</span>
              <input type="datetime-local" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={agendadaPara} onChange={event => setAgendadaPara(event.target.value)} />
            </label>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1 space-y-1.5 text-sm font-medium">
                <span>Unidade da aplicação</span>
                <div className="flex h-10 w-full items-center rounded-md border bg-slate-50 px-3 text-sm font-semibold">
                  {provaSelecionada?.unidade || "Selecione uma prova validada"}
                </div>
                <p className="text-xs font-normal text-muted-foreground">
                  Definida automaticamente pela prova. Somente empregados desta unidade podem ser selecionados.
                </p>
              </div>
              <label className="min-w-64 flex-1 space-y-1.5 text-sm font-medium">
                <span>Pesquisar participante</span>
                <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Nome, e-mail ou cargo" /></div>
              </label>
              <Button variant="outline" onClick={selecionarFiltrados} disabled={!provaSelecionada}>Selecionar filtrados</Button>
              <Button variant="ghost" onClick={() => setSelecionados([])}>Limpar seleção</Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /><strong>{selecionados.length}</strong> participante(s) selecionado(s)</span>
              {provaSelecionada && <span className="text-muted-foreground">{participantesDaUnidade.length} empregado(s) elegível(is) na unidade da prova.</span>}
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-background"><tr className="border-b text-left"><th className="px-3 py-2">Selecionar</th><th className="px-3 py-2">Participante</th><th className="px-3 py-2">Cargo</th><th className="px-3 py-2">Unidade</th></tr></thead>
                <tbody>
                  {participantesFiltrados.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2"><input type="checkbox" checked={selecionados.includes(Number(item.id))} onChange={() => alternarParticipante(Number(item.id))} /></td>
                      <td className="px-3 py-2"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.email || "—"}</p></td>
                      <td className="px-3 py-2">{item.cargo || "—"}</td>
                      <td className="px-3 py-2">
                        <p>{item.departamentoNome || "Sem unidade"}</p>

                      </td>
                    </tr>
                  ))}
                  {participantesFiltrados.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{provaSelecionada ? "Nenhum empregado ativo foi encontrado na unidade vinculada a esta prova." : "Selecione uma prova para carregar os empregados da unidade correspondente."}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <Button onClick={criarAplicacao} disabled={criarMutation.isPending}>
            {criarMutation.isPending ? "CRIANDO..." : "CRIAR APLICAÇÃO AGENDADA"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div><CardTitle>Aplicações cadastradas</CardTitle><CardDescription>Abra uma aplicação para liberar, acompanhar e calcular os resultados.</CardDescription></div>
            <Button variant="outline" onClick={() => aplicacoesQuery.refetch()} disabled={aplicacoesQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${aplicacoesQuery.isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead><tr className="border-b text-left"><th className="px-3 py-3">Aplicação</th><th className="px-3 py-3">Prova</th><th className="px-3 py-3">Agendamento</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Participantes</th><th className="px-3 py-3">Ação</th></tr></thead>
              <tbody>
                {(aplicacoesQuery.data ?? []).map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-3 font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{item.titulo}</span>
                        {item.modoTeste && <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-900">MODO TESTE</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">{item.provaCodigo} — {item.provaUnidade}</td>
                    <td className="px-3 py-3">{formatarData(item.agendadaPara)}</td>
                    <td className="px-3 py-3"><Badge variant={statusVariant(String(item.status))}>{item.status}</Badge></td>
                    <td className="px-3 py-3">{Number(item.totalParticipantes || 0)}</td>
                    <td className="px-3 py-3"><Button size="sm" variant={Number(item.id) === aplicacaoSelecionada ? "default" : "outline"} onClick={() => setAplicacaoSelecionada(Number(item.id))}>Abrir aplicação</Button></td>
                  </tr>
                ))}
                {(aplicacoesQuery.data ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma aplicação cadastrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {aplicacaoSelecionada && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Operação e status da aplicação
              {monitoramento?.modoTeste && <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-900">MODO TESTE — MESMO AMBIENTE DO CANDIDATO</Badge>}
            </CardTitle>
            <CardDescription>{aplicacaoMonitorada ? `${aplicacaoMonitorada.titulo} — ${formatarData(aplicacaoMonitorada.agendadaPara)}` : "Carregando aplicação..."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {monitoramentoQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando status...</p> : monitoramentoQuery.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{monitoramentoQuery.error.message}</div> : monitoramento && (
              <>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => liberarMutation.mutate({ aplicacaoId: aplicacaoSelecionada })}
                    disabled={liberarMutation.isPending || aplicacaoMonitorada?.status !== "AGENDADA"}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />LIBERAR PROVA
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={cancelarAplicacao}
                    disabled={cancelarMutation.isPending || !(aplicacaoMonitorada?.status === "AGENDADA" || (monitoramento?.modoTeste && aplicacaoMonitorada?.status === "LIBERADA"))}
                  >
                    <X className="mr-2 h-4 w-4" />{monitoramento?.modoTeste ? "CANCELAR TESTE" : "CANCELAR AGENDAMENTO"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => calcularMutation.mutate({ aplicacaoId: aplicacaoSelecionada })}
                    disabled={calcularMutation.isPending || !["LIBERADA", "ENCERRADA", "CALCULADA"].includes(String(aplicacaoMonitorada?.status)) || Number(monitoramento.resumo.finalizados) === 0}
                  >
                    <Calculator className="mr-2 h-4 w-4" />CALCULAR RESULTADOS
                  </Button>
                  <Badge variant={statusVariant(String(aplicacaoMonitorada?.status))}>{aplicacaoMonitorada?.status}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardHeader className="pb-2"><CardDescription>Total previsto</CardDescription><CardTitle className="text-3xl">{monitoramento.resumo.total}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Não iniciaram</CardDescription><CardTitle className="text-3xl">{monitoramento.resumo.naoIniciaram}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Em andamento</CardDescription><CardTitle className="text-3xl">{monitoramento.resumo.emAndamento}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Finalizaram</CardDescription><CardTitle className="text-3xl">{monitoramento.resumo.finalizados}</CardTitle><CardDescription>{monitoramento.resumo.percentualConclusao}% da aplicação</CardDescription></CardHeader></Card>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead><tr className="border-b text-left"><th className="px-3 py-3">Participante</th><th className="px-3 py-3">Unidade</th><th className="px-3 py-3">Identidade</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Realização</th><th className="px-3 py-3">Ocorrências</th><th className="px-3 py-3">Início</th><th className="px-3 py-3">Término</th></tr></thead>
                    <tbody>
                      {monitoramento.participantes.map((item: any) => (
                        <tr key={item.colaboradorId} className="border-b last:border-0">
                          <td className="px-3 py-3 font-medium">{item.colaboradorNome}</td>
                          <td className="px-3 py-3">{item.departamentoNome || "—"}</td>
                          <td className="px-3 py-3">
                            {Number(item.identidadeConfirmada || 0) > 0 ? (
                              <Button size="sm" variant="outline" onClick={() => setIdentidadeColaboradorId(Number(item.colaboradorId))}><UserCheck className="mr-1 h-4 w-4" />Confirmada</Button>
                            ) : <Badge variant="secondary">Pendente</Badge>}
                          </td>
                          <td className="px-3 py-3"><Badge variant={item.situacao === "FINALIZOU" ? "secondary" : item.situacao === "EM_ANDAMENTO" ? "default" : "outline"}>{item.situacao === "NAO_INICIOU" ? "Não iniciou" : item.situacao === "EM_ANDAMENTO" ? "Em andamento" : "Finalizou"}</Badge></td>
                          <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-700" style={{ width: `${Math.min(100, Number(item.percentualRealizacao || 0))}%` }} /></div><span>{Number(item.percentualRealizacao || 0)}%</span></div></td>
                          <td className="px-3 py-3">
                            <Button size="sm" variant="outline" onClick={() => setLogsColaboradorId(Number(item.colaboradorId))}>
                              <Activity className="mr-1 h-4 w-4" />{Number(item.totalOcorrencias || 0)} log(s)
                            </Button>
                          </td>
                          <td className="px-3 py-3">{formatarData(item.iniciadaEm)}</td>
                          <td className="px-3 py-3">{item.finalizadaEm ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-700" />{formatarData(item.finalizadaEm)}</span> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {logsColaboradorId && aplicacaoSelecionada && (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold"><Activity className="h-5 w-5 text-blue-700" />Logs da tentativa</h2>
                <p className="mt-1 text-sm text-muted-foreground">Eventos registrados no mesmo ambiente utilizado pelo candidato.</p>
              </div>
              <Button variant="outline" onClick={() => setLogsColaboradorId(null)}><X className="mr-1 h-4 w-4" />Fechar</Button>
            </div>
            <div className="mt-5 space-y-2">
              {ocorrenciasQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando logs...</p> :
                (ocorrenciasQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada.</p> :
                (ocorrenciasQuery.data ?? []).map((log: any) => (
                  <div key={log.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{log.tipo}</strong>
                      <span className="text-xs text-muted-foreground">{formatarData(log.createdAt)}</span>
                    </div>
                    {log.detalhe && <p className="mt-1 text-muted-foreground">{log.detalhe}</p>}
                    {log.tentativaId && <p className="mt-1 text-xs text-muted-foreground">Tentativa #{log.tentativaId}</p>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {identidadeColaboradorId && aplicacaoSelecionada && (
        <div className="fixed inset-0 z-[230] grid place-items-center bg-black/75 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5 text-blue-700" />Identidade registrada</h2>
                <p className="mt-1 text-sm text-muted-foreground">Conferência visual manual vinculada a esta aplicação.</p>
              </div>
              <Button variant="outline" onClick={() => setIdentidadeColaboradorId(null)}><X className="mr-1 h-4 w-4" />Fechar</Button>
            </div>
            {identidadeQuery.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Carregando identidade...</p> : identidadeQuery.data ? (
              <div className="mt-5 grid gap-5 md:grid-cols-[280px_1fr]">
                <img src={identidadeQuery.data.fotoData} alt="Fotografia de identidade" className="aspect-video w-full rounded-lg border object-cover" />
                <div className="space-y-3 text-sm">
                  <p><strong>Participante:</strong> {identidadeQuery.data.nome || "—"}</p>
                  <p><strong>E-mail:</strong> {identidadeQuery.data.email || "—"}</p>
                  <p><strong>Confirmado em:</strong> {formatarData(identidadeQuery.data.confirmadoEm)}</p>
                  <div className="rounded-md border bg-slate-50 p-3 leading-6">{identidadeQuery.data.declaracao}</div>
                </div>
              </div>
            ) : <p className="mt-5 text-sm text-muted-foreground">Não há identidade registrada.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

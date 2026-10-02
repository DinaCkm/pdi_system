import { useMemo, useState } from "react";
import { Activity, CalendarClock, Calculator, CheckCircle2, ClipboardCheck, Eye, Mail, PlayCircle, Plus, RefreshCw, Search, Send, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAcessarComo } from "@/components/ImpersonacaoBanner";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  // O banco grava em UTC e devolve "AAAA-MM-DD HH:MM:SS" sem fuso.
  // Sem o "Z", o navegador leria como horário de Brasília e mostraria +3h.
  let texto = String(valor instanceof Date ? valor.toISOString() : valor).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto)) texto = texto.replace(" ", "T") + "Z";
  const data = new Date(texto);
  return Number.isNaN(data.getTime())
    ? String(valor)
    : data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

// Converte o valor do banco (UTC, sem fuso) em Date.
function paraData(valor: unknown): Date | null {
  if (!valor) return null;
  let texto = String(valor instanceof Date ? valor.toISOString() : valor).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto)) texto = texto.replace(" ", "T") + "Z";
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function montarEmailConvocacao(params: { nome: string; titulo: string; agendadaPara: unknown }) {
  const data = paraData(params.agendadaPara);
  const fuso = { timeZone: "America/Sao_Paulo" } as const;
  const dia = data ? data.toLocaleDateString("pt-BR", fuso) : "[DATA]";
  const semana = data ? data.toLocaleDateString("pt-BR", { ...fuso, weekday: "long" }) : "";
  const hora = data ? data.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).replace(":00", "h").replace(":", "h") : "[HORÁRIO]";
  const primeiroNome = String(params.nome || "").trim().split(/\s+/)[0] || "participante";
  const assunto = `${params.titulo} — sua prova está agendada para ${dia}, às ${hora}`;
  const corpo = `Olá, ${primeiroNome},

Sua Avaliação de Proficiência da ${params.titulo} está agendada.

📅 Data: ${dia}${semana ? ` (${semana})` : ""}
🕑 Horário: ${hora} (horário de Brasília)
💻 Local: on-line, pela Plataforma de PDI — https://pdi.ecodobem.com

COMO ACESSAR
1. No horário agendado, entre em https://pdi.ecodobem.com com seu e-mail e senha.
2. No menu lateral, clique em "Avaliações".
3. Clique em "INICIAR AVALIAÇÃO". O botão aparece assim que a prova for liberada.

ANTES DA PROVA, PREPARE:
• Um computador ou notebook com câmera e microfone funcionando. Não use celular.
• Navegador Google Chrome ou Microsoft Edge atualizado.
• Apenas UMA tela ou monitor ligado. Desconecte monitores extras.
• Internet estável e um ambiente silencioso, bem iluminado e sem outras pessoas.

ETAPAS DE ABERTURA DA PROVA
1. Confirmação de identidade: o sistema tira uma foto sua pela câmera, e você confirma que é a pessoa que fará a avaliação.
2. Leitura e aceite das regras.
3. Autorização da câmera, do microfone e do compartilhamento de tela. Selecione "TELA INTEIRA": janela ou guia do navegador não são aceitas.
4. A prova abre em tela cheia.

REGRAS DURANTE A PROVA
A avaliação é monitorada. Estas ações ficam registradas como ocorrência e podem bloquear a prova:
• Sair da tela cheia, trocar de aba ou abrir outra janela ou programa;
• Copiar, colar, recortar, imprimir ou tirar print da tela;
• Fechar ou recarregar a página;
• Desligar a câmera, o microfone ou o compartilhamento de tela.

Suas respostas são gravadas a cada questão. Se a prova for interrompida, o que você já respondeu fica preservado. Ao terminar, o resultado será calculado pela administração após o encerramento da aplicação.

DÚVIDAS
Se tiver qualquer dúvida, fale comigo pelo Fale Conosco da plataforma ou pelo WhatsApp XXXX. Recomendo testar câmera e microfone com antecedência. Se algo não funcionar, me avise antes do dia da prova.

Boa prova!

Dina
CKM Talents`;
  return { assunto, corpo };
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
  const [emailConvocacao, setEmailConvocacao] = useState<{ colaboradorId: number; nome: string; email: string; assunto: string; corpo: string } | null>(null);
  const [emailAviso, setEmailAviso] = useState("");
  const { acessarComo, isPending: acessarComoPendente } = useAcessarComo();
  const enviarEmailMutation = trpc.aplicacoesProficiencia.enviarEmailConvocacao.useMutation({
    onSuccess: data => {
      setEmailConvocacao(null);
      setEmailAviso("");
      setMensagem(`E-mail de convocação enviado para ${data.enviadoPara}.`);
    },
    onError: error => setEmailAviso(error.message),
  });
  const [identidadeColaboradorId, setIdentidadeColaboradorId] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("ATIVAS");
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [buscaAdicionar, setBuscaAdicionar] = useState("");
  const [selecionadosAdicionar, setSelecionadosAdicionar] = useState<number[]>([]);

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
  const participantesAdicionarQuery = trpc.aplicacoesProficiencia.listarParticipantesParaAdicionar.useQuery(
    { aplicacaoId: aplicacaoSelecionada ?? 1 },
    { enabled: Boolean(user && isAdmin && aplicacaoSelecionada && modalAdicionarAberto), refetchOnWindowFocus: true },
  );
  const questoesAplicacaoQuery = trpc.aplicacoesProficiencia.listarQuestoesAplicacao.useQuery(
    { aplicacaoId: aplicacaoSelecionada ?? 1 },
    { enabled: Boolean(user && isAdmin && aplicacaoSelecionada), refetchOnWindowFocus: true },
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

  const adicionarParticipantesMutation = trpc.aplicacoesProficiencia.adicionarParticipantes.useMutation({
    onSuccess: async data => {
      setMensagem(`${data.adicionados} participante(s) adicionado(s) à aplicação.`);
      setModalAdicionarAberto(false);
      setBuscaAdicionar("");
      setSelecionadosAdicionar([]);
      await Promise.all([aplicacoesQuery.refetch(), monitoramentoQuery.refetch(), participantesAdicionarQuery.refetch()]);
    },
    onError: error => setMensagem(error.message),
  });

  const liberarContinuidadeMutation = trpc.aplicacoesProficiencia.liberarContinuidadeTentativa.useMutation({
    onSuccess: async data => {
      setMensagem(`Continuidade liberada para ${data.colaboradorNome || "o participante"}. As respostas já registradas foram preservadas.`);
      await Promise.all([aplicacoesQuery.refetch(), monitoramentoQuery.refetch()]);
    },
    onError: error => setMensagem(error.message),
  });

  const anularQuestaoMutation = trpc.aplicacoesProficiencia.anularQuestao.useMutation({
    onSuccess: async data => {
      setMensagem(`Questão anulada nesta aplicação. Ela não contará no resultado geral nem nos eixos. ${data.recalculados ? `${data.recalculados} resultado(s) finalizado(s) foram recalculados automaticamente.` : ""}`);
      await Promise.all([questoesAplicacaoQuery.refetch(), monitoramentoQuery.refetch(), aplicacoesQuery.refetch()]);
    },
    onError: error => setMensagem(error.message),
  });

  const restaurarQuestaoMutation = trpc.aplicacoesProficiencia.restaurarQuestao.useMutation({
    onSuccess: async data => {
      setMensagem(`Questão restaurada no cálculo desta aplicação. ${data.recalculados ? `${data.recalculados} resultado(s) finalizado(s) foram recalculados automaticamente.` : ""}`);
      await Promise.all([questoesAplicacaoQuery.refetch(), monitoramentoQuery.refetch(), aplicacoesQuery.refetch()]);
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

  const participantesAdicionarFiltrados = useMemo(() => {
    const termo = buscaAdicionar.trim().toLocaleLowerCase("pt-BR");
    const lista = (participantesAdicionarQuery.data ?? []) as any[];
    if (!termo) return lista;
    return lista.filter((item: any) =>
      [item.name, item.email, item.cargo, item.departamentoNome]
        .some(valor => String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [participantesAdicionarQuery.data, buscaAdicionar]);

  const alternarAdicionar = (id: number) => {
    setSelecionadosAdicionar(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const aplicacoesFiltradas = useMemo(() => {
    const todas = (aplicacoesQuery.data ?? []) as any[];
    if (filtroStatus === "TODAS") return todas;
    if (filtroStatus === "ATIVAS") return todas.filter((item: any) => String(item.status) !== "CANCELADA");
    return todas.filter((item: any) => String(item.status) === filtroStatus);
  }, [aplicacoesQuery.data, filtroStatus]);

  const provasValidas = useMemo(
    () => ((provasQuery.data ?? []) as any[]).filter((prova: any) => cicloId && Number(prova.cicloId) === Number(cicloId)),
    [provasQuery.data, cicloId],
  );

  const provaSelecionada = useMemo(
    () => provasValidas.find((item: any) => Number(item.id) === Number(provaId)) ?? null,
    [provasValidas, provaId],
  );

  const normalizarUnidade = (valor: unknown) => {
    const normalizada = String(valor ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // O cadastro pode usar sigla + nome completo, enquanto a prova usa apenas a sigla.
    // "US" e "UAS" representam a mesma Unidade de Administração e Suprimentos.
    const primeiroToken = normalizada.split(" ")[0] ?? "";
    const codigo = /^[a-z]{2,8}$/.test(primeiroToken) ? primeiroToken : normalizada;
    return codigo === "us" ? "uas" : codigo;
  };

  const participantes = (participantesQuery.data ?? []) as any[];

  // A unidade da aplicação é determinada pela própria prova.
  // Não existe seleção manual de unidade nesta etapa.
  const participantesDaUnidade = useMemo(() => {
    if (!provaSelecionada?.unidade) return [];
    const unidadeProva = normalizarUnidade(provaSelecionada.unidade);
    // Elegível: lotado na unidade da prova OU gestor da unidade (líder do departamento ou da equipe lotada nela).
    return participantes.filter((item: any) =>
      [item.departamentoNome, ...String(item.unidadesLideradas ?? "").split("||")]
        .some(unidade => unidade && normalizarUnidade(unidade) === unidadeProva),
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
                        {normalizarUnidade(item.departamentoNome) !== normalizarUnidade(provaSelecionada?.unidade) && <p className="text-xs text-blue-700">Gestor da unidade</p>}

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
            <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroStatus}
              onChange={event => setFiltroStatus(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Filtrar aplicações por status"
            >
              <option value="ATIVAS">Ativas (sem canceladas)</option>
              <option value="AGENDADA">Agendadas</option>
              <option value="LIBERADA">Liberadas</option>
              <option value="ENCERRADA">Encerradas</option>
              <option value="CALCULADA">Calculadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="TODAS">Todas</option>
            </select>
            <Button variant="outline" onClick={() => aplicacoesQuery.refetch()} disabled={aplicacoesQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${aplicacoesQuery.isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead><tr className="border-b text-left"><th className="px-3 py-3">Aplicação</th><th className="px-3 py-3">Prova</th><th className="px-3 py-3">Agendamento</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Participantes</th><th className="px-3 py-3">Ação</th></tr></thead>
              <tbody>
                {aplicacoesFiltradas.map((item: any) => (
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
                {aplicacoesFiltradas.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{(aplicacoesQuery.data ?? []).length === 0 ? "Nenhuma aplicação cadastrada." : "Nenhuma aplicação com este filtro."}</td></tr>}
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
                    variant="outline"
                    onClick={() => {
                      setBuscaAdicionar("");
                      setSelecionadosAdicionar([]);
                      setModalAdicionarAberto(true);
                    }}
                    disabled={!["AGENDADA", "LIBERADA"].includes(String(aplicacaoMonitorada?.status))}
                  >
                    <Plus className="mr-2 h-4 w-4" />ADICIONAR PARTICIPANTE
                  </Button>
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
                    onClick={() => {
                      const jaCalculada = String(aplicacaoMonitorada?.status) === "CALCULADA";
                      if (jaCalculada) {
                        const confirmado = window.confirm(
                          "Recalcular os resultados desta aplicação? As respostas originais dos participantes serão preservadas. Apenas os resultados, percentuais e cálculos por eixo serão atualizados com as regras válidas atuais.",
                        );
                        if (!confirmado) return;
                      }
                      calcularMutation.mutate({ aplicacaoId: aplicacaoSelecionada });
                    }}
                    disabled={calcularMutation.isPending || !["LIBERADA", "ENCERRADA", "CALCULADA"].includes(String(aplicacaoMonitorada?.status)) || Number(monitoramento.resumo.finalizados) === 0}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {String(aplicacaoMonitorada?.status) === "CALCULADA" ? "RECALCULAR RESULTADOS" : "CALCULAR RESULTADOS"}
                  </Button>
                  <Badge variant={statusVariant(String(aplicacaoMonitorada?.status))}>{aplicacaoMonitorada?.status}</Badge>
                </div>

                <details className="rounded-lg border bg-white">
                  <summary className="cursor-pointer select-none px-4 py-3 font-semibold">
                    Gerenciar questões desta aplicação
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {(questoesAplicacaoQuery.data ?? []).filter((item: any) => item.anulada).length} anulada(s)
                    </span>
                  </summary>
                  <div className="border-t p-4">
                    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      Uma questão anulada continua registrada na prova e nas respostas, mas deixa de contar no resultado geral e em todos os eixos vinculados. Resultados já finalizados são recalculados automaticamente.
                    </div>
                    {questoesAplicacaoQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando questões...</p>
                    ) : (
                      <div className="max-h-[420px] overflow-auto rounded-md border">
                        <table className="w-full min-w-[900px] text-sm">
                          <thead className="sticky top-0 bg-background">
                            <tr className="border-b text-left">
                              <th className="px-3 py-2">Questão</th>
                              <th className="px-3 py-2">Enunciado</th>
                              <th className="px-3 py-2">Eixo(s)</th>
                              <th className="px-3 py-2">Situação</th>
                              <th className="px-3 py-2">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(questoesAplicacaoQuery.data ?? []).map((item: any) => (
                              <tr key={item.questaoChave} className="border-b align-top last:border-0">
                                <td className="px-3 py-3 font-semibold">Questão {item.numero}</td>
                                <td className="max-w-xl px-3 py-3">
                                  <div className="line-clamp-3">{String(item.enunciado || "").replace(/<[^>]*>/g, " ")}</div>
                                  {item.anulada && item.motivo && <p className="mt-2 text-xs text-amber-800"><strong>Motivo:</strong> {item.motivo}</p>}
                                </td>
                                <td className="px-3 py-3">{(item.eixos ?? []).map((eixo: any) => eixo.nome).filter(Boolean).join(", ") || "—"}</td>
                                <td className="px-3 py-3">
                                  {item.anulada ? <Badge variant="destructive">ANULADA</Badge> : <Badge variant="outline">VÁLIDA</Badge>}
                                </td>
                                <td className="px-3 py-3">
                                  {item.anulada ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={restaurarQuestaoMutation.isPending}
                                      onClick={() => {
                                        if (!window.confirm(`Restaurar a Questão ${item.numero} no cálculo desta aplicação?`)) return;
                                        restaurarQuestaoMutation.mutate({ aplicacaoId: Number(aplicacaoSelecionada), questaoChave: String(item.questaoChave) });
                                      }}
                                    >
                                      RESTAURAR
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-300 text-red-700 hover:bg-red-50"
                                      disabled={anularQuestaoMutation.isPending || String(aplicacaoMonitorada?.status) === "CANCELADA"}
                                      onClick={() => {
                                        const motivo = window.prompt(
                                          `Motivo da anulação da Questão ${item.numero} (obrigatório):`,
                                          "",
                                        );
                                        if (motivo === null) return;
                                        if (motivo.trim().length < 10) {
                                          setMensagem("Informe um motivo com pelo menos 10 caracteres para manter o registro de auditoria.");
                                          return;
                                        }
                                        if (!window.confirm(`Confirmar a anulação da Questão ${item.numero} somente nesta aplicação? Ela deixará de contar na nota geral e nos eixos.`)) return;
                                        anularQuestaoMutation.mutate({
                                          aplicacaoId: Number(aplicacaoSelecionada),
                                          questaoChave: String(item.questaoChave),
                                          motivo: motivo.trim(),
                                        });
                                      }}
                                    >
                                      ANULAR NESTA APLICAÇÃO
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>

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
                          <td className="px-3 py-3 font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{item.colaboradorNome}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const modelo = montarEmailConvocacao({
                                    nome: String(item.colaboradorNome || ""),
                                    titulo: String(aplicacaoMonitorada?.titulo || "Certificação Técnica"),
                                    agendadaPara: aplicacaoMonitorada?.agendadaPara,
                                  });
                                  setEmailAviso("");
                                  setEmailConvocacao({
                                    colaboradorId: Number(item.colaboradorId),
                                    nome: String(item.colaboradorNome || ""),
                                    email: String(item.colaboradorEmail || ""),
                                    ...modelo,
                                  });
                                }}
                              >
                                <Mail className="mr-1 h-4 w-4" />E-mail de convocação
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acessarComoPendente}
                                onClick={() => acessarComo(Number(item.colaboradorId), String(item.colaboradorNome || "empregado"))}
                                title="Acessar como (somente leitura)"
                              >
                                <Eye className="mr-1 h-4 w-4 text-orange-600" />Acessar como
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-3">{item.departamentoNome || "—"}</td>
                          <td className="px-3 py-3">
                            {Number(item.identidadeConfirmada || 0) > 0 ? (
                              <Button size="sm" variant="outline" onClick={() => setIdentidadeColaboradorId(Number(item.colaboradorId))}><UserCheck className="mr-1 h-4 w-4" />Confirmada</Button>
                            ) : <Badge variant="secondary">Pendente</Badge>}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={item.situacao === "FINALIZOU" ? "secondary" : item.tentativaStatus === "BLOQUEADA" ? "destructive" : item.situacao === "EM_ANDAMENTO" ? "default" : "outline"}>
                                {item.tentativaStatus === "BLOQUEADA" ? "Bloqueada" : item.situacao === "NAO_INICIOU" ? "Não iniciou" : item.situacao === "EM_ANDAMENTO" ? "Em andamento" : "Finalizou"}
                              </Badge>
                              {item.tentativaStatus === "BLOQUEADA" && item.tentativaId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-400 text-amber-800 hover:bg-amber-50"
                                  disabled={liberarContinuidadeMutation.isPending}
                                  onClick={() => {
                                    const observacao = window.prompt("Observação da liberação (opcional):", "Liberação após análise das ocorrências.");
                                    if (observacao === null) return;
                                    liberarContinuidadeMutation.mutate({
                                      aplicacaoId: Number(aplicacaoSelecionada),
                                      tentativaId: Number(item.tentativaId),
                                      observacao: observacao.trim() || undefined,
                                    });
                                  }}
                                >
                                  LIBERAR CONTINUIDADE
                                </Button>
                              )}
                            </div>
                          </td>
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

      {modalAdicionarAberto && aplicacaoSelecionada && (
        <div className="fixed inset-0 z-[250] grid place-items-center bg-black/70 p-4">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b p-6">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold"><Plus className="h-5 w-5 text-blue-700" />Adicionar participante</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Somente pessoas elegíveis da unidade <strong>{aplicacaoMonitorada?.prova?.unidade || aplicacaoMonitorada?.provaUnidade || "da prova"}</strong> são exibidas.
                </p>
              </div>
              <Button variant="outline" onClick={() => setModalAdicionarAberto(false)}><X className="mr-1 h-4 w-4" />Fechar</Button>
            </div>
            <div className="space-y-4 overflow-auto p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                  value={buscaAdicionar}
                  onChange={event => setBuscaAdicionar(event.target.value)}
                  placeholder="Pesquisar por nome, e-mail, cargo ou unidade"
                />
              </div>
              <div className="rounded-md border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead><tr className="border-b text-left"><th className="px-3 py-2">Selecionar</th><th className="px-3 py-2">Participante</th><th className="px-3 py-2">Cargo</th><th className="px-3 py-2">Unidade</th></tr></thead>
                  <tbody>
                    {participantesAdicionarQuery.isLoading ? (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Carregando participantes elegíveis...</td></tr>
                    ) : participantesAdicionarFiltrados.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhuma pessoa elegível disponível para inclusão nesta aplicação.</td></tr>
                    ) : participantesAdicionarFiltrados.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-2"><input type="checkbox" checked={selecionadosAdicionar.includes(Number(item.id))} onChange={() => alternarAdicionar(Number(item.id))} /></td>
                        <td className="px-3 py-2"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.email || "—"}</p></td>
                        <td className="px-3 py-2">{item.cargo || "—"}</td>
                        <td className="px-3 py-2">{item.departamentoNome || "Gestor da unidade"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground"><strong>{selecionadosAdicionar.length}</strong> participante(s) selecionado(s).</p>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => setModalAdicionarAberto(false)}>Cancelar</Button>
              <Button
                disabled={selecionadosAdicionar.length === 0 || adicionarParticipantesMutation.isPending}
                onClick={() => adicionarParticipantesMutation.mutate({ aplicacaoId: aplicacaoSelecionada, colaboradorIds: selecionadosAdicionar })}
              >
                {adicionarParticipantesMutation.isPending ? "ADICIONANDO..." : "ADICIONAR À APLICAÇÃO"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {emailConvocacao && aplicacaoSelecionada && (
        <div className="fixed inset-0 z-[240] grid place-items-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b p-6">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold"><Mail className="h-5 w-5 text-blue-700" />E-mail de convocação</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Para: <strong>{emailConvocacao.nome}</strong> — {emailConvocacao.email || "sem e-mail cadastrado"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Confira e ajuste o texto antes de enviar.</p>
              </div>
              <Button variant="outline" onClick={() => setEmailConvocacao(null)}><X className="mr-1 h-4 w-4" />Fechar</Button>
            </div>
            <div className="space-y-4 overflow-auto p-6">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Assunto</span>
                <input
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={emailConvocacao.assunto}
                  onChange={event => setEmailConvocacao({ ...emailConvocacao, assunto: event.target.value })}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Mensagem</span>
                <textarea
                  className="min-h-[420px] w-full rounded-md border bg-background p-3 font-mono text-sm leading-6"
                  value={emailConvocacao.corpo}
                  onChange={event => setEmailConvocacao({ ...emailConvocacao, corpo: event.target.value })}
                />
              </label>
              {emailAviso && <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{emailAviso}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => setEmailConvocacao(null)}>Cancelar</Button>
              <Button
                disabled={enviarEmailMutation.isPending || !emailConvocacao.email}
                onClick={() => {
                  if (/XXXX|\[NOME\]|\[DATA\]|\[HORÁRIO\]/.test(emailConvocacao.corpo + emailConvocacao.assunto)) {
                    setEmailAviso("Substitua os campos marcados (ex.: XXXX do WhatsApp) antes de enviar.");
                    return;
                  }
                  if (!window.confirm(`Enviar o e-mail para ${emailConvocacao.nome} (${emailConvocacao.email})?`)) return;
                  enviarEmailMutation.mutate({
                    aplicacaoId: aplicacaoSelecionada,
                    colaboradorId: emailConvocacao.colaboradorId,
                    assunto: emailConvocacao.assunto,
                    corpo: emailConvocacao.corpo,
                  });
                }}
              >
                <Send className="mr-2 h-4 w-4" />{enviarEmailMutation.isPending ? "ENVIANDO..." : "ENVIAR E-MAIL"}
              </Button>
            </div>
          </div>
        </div>
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

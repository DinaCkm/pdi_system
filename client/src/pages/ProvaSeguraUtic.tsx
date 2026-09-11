import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, Mic, MonitorUp, ShieldCheck, Shuffle, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DURACAO_TOTAL_SEGUNDOS = 3 * 60 * 60;
const DURACAO_QUESTAO_SEGUNDOS = 2 * 60;
const LIMITE_VIOLACOES = 3;
const INATIVIDADE_ALERTA_MS = 150 * 1000;
const INATIVIDADE_BLOQUEIO_MS = 180 * 1000;
const STORAGE_KEY = "piloto-utic-prova-segura-v5";

type Fase = "preparacao" | "em_prova" | "finalizada" | "anulada" | "bloqueada";
type EventoAuditoria = { data: string; tipo: string; detalhe: string };
type Questao = { id: number; eixo: string; enunciado: string; opcoes: string[] };

type EstadoSalvo = {
  respostas: Record<number, string>;
  eventos: EventoAuditoria[];
  violacoes: number;
  ordemQuestoes: number[];
  ordemOpcoes: Record<number, string[]>;
  fila: number[];
  indiceAtual: number;
  passagem: number;
  exibicoes: Record<number, number>;
};

const QUESTOES_DEMO: Questao[] = [
  { id: 1, eixo: "Governança e Gestão de TI", enunciado: "Questão demonstrativa para testar seleção e salvamento automático.", opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"] },
  { id: 2, eixo: "Infraestrutura de TI", enunciado: "Questão demonstrativa para validar navegação em tela única.", opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"] },
  { id: 3, eixo: "Segurança da Informação", enunciado: "Questão demonstrativa para testar persistência das respostas durante a sessão.", opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"] },
  { id: 4, eixo: "Sistemas Corporativos, Processos e Automação", enunciado: "Questão demonstrativa para testar o comportamento do cronômetro individual.", opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"] },
  { id: 5, eixo: "Dados, BI e Inteligência Artificial", enunciado: "Questão demonstrativa para testar a retomada de questões pendentes.", opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"] },
];

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function formatarTempo(total: number) {
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
  const segundos = (total % 60).toString().padStart(2, "0");
  return horas > 0 ? `${horas}:${minutos}:${segundos}` : `${minutos}:${segundos}`;
}

export default function ProvaSeguraUtic() {
  const { loading, user } = useAuth();
  const utils = trpc.useUtils();
  const estadoQuery = trpc.provaUtic.estado.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const bloqueadasQuery = trpc.provaUtic.listarBloqueadas.useQuery(undefined, { enabled: user?.role === "admin" || user?.role === "Administrador" });
  const iniciarMutation = trpc.provaUtic.iniciar.useMutation();
  const retomarMutation = trpc.provaUtic.retomar.useMutation();
  const salvarRespostaMutation = trpc.provaUtic.salvarResposta.useMutation();
  const atividadeMutation = trpc.provaUtic.atividade.useMutation();
  const bloquearMutation = trpc.provaUtic.bloquear.useMutation();
  const finalizarMutation = trpc.provaUtic.finalizar.useMutation();
  const liberarMutation = trpc.provaUtic.liberarContinuacao.useMutation({ onSuccess: async () => { await bloqueadasQuery.refetch(); await estadoQuery.refetch(); } });

  const [fase, setFase] = useState<Fase>("preparacao");
  const [mostrarComunicado, setMostrarComunicado] = useState(false);
  const [mostrarAvisoTela, setMostrarAvisoTela] = useState(false);
  const [mostrarConfirmacaoFinalizar, setMostrarConfirmacaoFinalizar] = useState(false);
  const [aceiteComunicado, setAceiteComunicado] = useState(false);
  const [aceiteTela, setAceiteTela] = useState(false);
  const [modoRetomada, setModoRetomada] = useState(false);
  const [tentativaId, setTentativaId] = useState<number | null>(null);
  const [tempoTotalRestante, setTempoTotalRestante] = useState(DURACAO_TOTAL_SEGUNDOS);
  const [tempoQuestaoRestante, setTempoQuestaoRestante] = useState(DURACAO_QUESTAO_SEGUNDOS);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [violacoes, setViolacoes] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoDezMinutos, setAvisoDezMinutos] = useState(false);
  const [avisoInatividade, setAvisoInatividade] = useState(false);
  const [gravacaoAtiva, setGravacaoAtiva] = useState(false);
  const [cameraMicAtivos, setCameraMicAtivos] = useState(false);
  const [erroInicio, setErroInicio] = useState<string | null>(null);
  const [ordemQuestoes, setOrdemQuestoes] = useState<number[]>([]);
  const [ordemOpcoes, setOrdemOpcoes] = useState<Record<number, string[]>>({});
  const [fila, setFila] = useState<number[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [passagem, setPassagem] = useState(1);
  const [exibicoes, setExibicoes] = useState<Record<number, number>>({});

  const faseRef = useRef<Fase>("preparacao");
  const tentativaIdRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamTelaRef = useRef<MediaStream | null>(null);
  const streamCameraMicRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ultimaAtividadeLocalRef = useRef(Date.now());
  const ultimoPingRef = useRef(0);
  const sessaoIniciadaNestaPaginaRef = useRef(false);

  const questaoAtualId = fila[indiceAtual];
  const questaoAtual = useMemo(() => QUESTOES_DEMO.find((q) => q.id === questaoAtualId) ?? null, [questaoAtualId]);

  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => { tentativaIdRef.current = tentativaId; }, [tentativaId]);
  useEffect(() => { if (!loading && !user) window.location.href = "/login"; }, [loading, user]);

  const persistir = (parcial: Partial<EstadoSalvo> = {}) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas, eventos, violacoes, ordemQuestoes, ordemOpcoes, fila, indiceAtual, passagem, exibicoes, ...parcial }));
  };

  const registrarEventoLocal = (tipo: string, detalhe: string) => {
    setEventos((atual) => {
      const proximo = [{ data: new Date().toISOString(), tipo, detalhe }, ...atual].slice(0, 100);
      persistir({ eventos: proximo });
      return proximo;
    });
  };

  const pararMonitoramento = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamTelaRef.current?.getTracks().forEach((track) => track.stop());
    streamCameraMicRef.current?.getTracks().forEach((track) => track.stop());
    streamTelaRef.current = null;
    streamCameraMicRef.current = null;
    setGravacaoAtiva(false);
    setCameraMicAtivos(false);
  };

  useEffect(() => {
    const estado = estadoQuery.data;
    if (!estado || sessaoIniciadaNestaPaginaRef.current) return;
    const tentativa = estado.tentativa as any;
    if (!tentativa) return;

    setTentativaId(Number(tentativa.id));
    const respostasServidor: Record<number, string> = {};
    for (const item of estado.respostas ?? []) respostasServidor[Number(item.questaoId)] = item.resposta;
    setRespostas(respostasServidor);

    if (tentativa.status === "EM_ANDAMENTO") {
      bloquearMutation.mutate({ tentativaId: Number(tentativa.id), motivo: "FECHAMENTO" }, {
        onSettled: async () => { setFase("bloqueada"); await estadoQuery.refetch(); },
      });
      return;
    }
    if (tentativa.status === "BLOQUEADA") setFase("bloqueada");
    if (tentativa.status === "LIBERADA") setFase("preparacao");
    if (["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(tentativa.status)) setFase("finalizada");
    if (tentativa.status === "ANULADA") setFase("anulada");
  }, [estadoQuery.data]);

  const finalizar = async (motivo: "MANUAL" | "TEMPO" | "CONCLUIDA") => {
    if (faseRef.current !== "em_prova" || !tentativaIdRef.current) return;
    try {
      await finalizarMutation.mutateAsync({ tentativaId: tentativaIdRef.current, motivo });
    } catch (error: any) {
      setAviso(error?.message ?? "Não foi possível registrar a finalização no servidor.");
      return;
    }
    sessaoIniciadaNestaPaginaRef.current = false;
    faseRef.current = "finalizada";
    setFase("finalizada");
    registrarEventoLocal("finalizacao", motivo);
    pararMonitoramento();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    await estadoQuery.refetch();
  };

  const bloquearSessao = async (motivo: "INATIVIDADE_3_MIN" | "FECHAMENTO" | "INTERRUPCAO_TECNICA" | "SEGURANCA") => {
    if (!tentativaIdRef.current || faseRef.current !== "em_prova") return;
    try { await bloquearMutation.mutateAsync({ tentativaId: tentativaIdRef.current, motivo }); } catch { /* servidor também valida inatividade no retorno */ }
    sessaoIniciadaNestaPaginaRef.current = false;
    faseRef.current = "bloqueada";
    setFase("bloqueada");
    pararMonitoramento();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    await estadoQuery.refetch();
  };

  const registrarViolacao = (tipo: "troca_aba" | "saida_tela_cheia" | "interrupcao_compartilhamento") => {
    if (faseRef.current !== "em_prova") return;
    setViolacoes((atual) => {
      const novo = atual + 1;
      const detalhe = tipo === "troca_aba" ? "A página da prova perdeu visibilidade." : tipo === "saida_tela_cheia" ? "O modo tela cheia foi encerrado." : "O compartilhamento da tela foi interrompido.";
      setAviso(`${detalhe} Ocorrência ${novo} de ${LIMITE_VIOLACOES}.`);
      registrarEventoLocal(tipo, detalhe);
      if (novo >= LIMITE_VIOLACOES) window.setTimeout(() => bloquearSessao("SEGURANCA"), 0);
      return novo;
    });
  };

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) registrarViolacao("troca_aba"); };
    const onFullscreen = () => { if (!document.fullscreenElement) registrarViolacao("saida_tela_cheia"); };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (faseRef.current === "em_prova") {
        event.preventDefault();
        event.returnValue = "";
        if (tentativaIdRef.current) bloquearMutation.mutate({ tentativaId: tentativaIdRef.current, motivo: "FECHAMENTO" });
      }
    };
    const onPageHide = () => {
      if (faseRef.current === "em_prova" && tentativaIdRef.current) bloquearMutation.mutate({ tentativaId: tentativaIdRef.current, motivo: "FECHAMENTO" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    if (fase !== "em_prova") return;
    const bloquearConteudo = (event: Event) => { event.preventDefault(); registrarEventoLocal("tentativa_conteudo_protegido", "Tentativa de copiar, selecionar, colar, imprimir ou reproduzir conteúdo bloqueada."); setAviso("Ação não permitida. Esta avaliação possui conteúdo protegido. A ocorrência foi registrada."); };
    const bloquearTeclas = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "x", "v", "p", "s", "u"].includes(tecla)) bloquearConteudo(event);
      if (event.key === "PrintScreen") { registrarEventoLocal("tentativa_print_screen", "Tecla Print Screen detectada."); setAviso("Tentativa de captura registrada."); }
    };
    document.addEventListener("selectstart", bloquearConteudo);
    document.addEventListener("contextmenu", bloquearConteudo);
    document.addEventListener("copy", bloquearConteudo);
    document.addEventListener("cut", bloquearConteudo);
    document.addEventListener("paste", bloquearConteudo);
    document.addEventListener("dragstart", bloquearConteudo);
    document.addEventListener("keydown", bloquearTeclas);
    window.addEventListener("beforeprint", bloquearConteudo);
    return () => {
      document.removeEventListener("selectstart", bloquearConteudo);
      document.removeEventListener("contextmenu", bloquearConteudo);
      document.removeEventListener("copy", bloquearConteudo);
      document.removeEventListener("cut", bloquearConteudo);
      document.removeEventListener("paste", bloquearConteudo);
      document.removeEventListener("dragstart", bloquearConteudo);
      document.removeEventListener("keydown", bloquearTeclas);
      window.removeEventListener("beforeprint", bloquearConteudo);
    };
  }, [fase]);

  useEffect(() => {
    if (fase !== "em_prova" || !tentativaId) return;
    ultimaAtividadeLocalRef.current = Date.now();
    ultimoPingRef.current = 0;
    const atividade = () => {
      const agora = Date.now();
      ultimaAtividadeLocalRef.current = agora;
      setAvisoInatividade(false);
      if (agora - ultimoPingRef.current >= 15000) {
        ultimoPingRef.current = agora;
        atividadeMutation.mutate({ tentativaId });
      }
    };
    const eventosAtividade = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    eventosAtividade.forEach((nome) => window.addEventListener(nome, atividade, { passive: true }));
    const verificar = window.setInterval(() => {
      const inativo = Date.now() - ultimaAtividadeLocalRef.current;
      if (inativo >= INATIVIDADE_BLOQUEIO_MS) {
        window.clearInterval(verificar);
        setAvisoInatividade(true);
        window.setTimeout(() => bloquearSessao("INATIVIDADE_3_MIN"), 800);
      } else if (inativo >= INATIVIDADE_ALERTA_MS) {
        setAvisoInatividade(true);
      }
    }, 1000);
    return () => {
      eventosAtividade.forEach((nome) => window.removeEventListener(nome, atividade));
      window.clearInterval(verificar);
    };
  }, [fase, tentativaId]);

  const avancarQuestao = (porTempo = false) => {
    if (!questaoAtual) return;
    const novasExibicoes = { ...exibicoes, [questaoAtual.id]: (exibicoes[questaoAtual.id] ?? 0) + 1 };
    setExibicoes(novasExibicoes);
    if (porTempo) registrarEventoLocal("tempo_questao_esgotado", `Tempo de 2 minutos encerrado para a questão ${questaoAtual.id}.`);
    if (indiceAtual < fila.length - 1) {
      const proximoIndice = indiceAtual + 1;
      setIndiceAtual(proximoIndice);
      setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
      persistir({ indiceAtual: proximoIndice, exibicoes: novasExibicoes });
      return;
    }
    const pendentes = ordemQuestoes.filter((id) => !respostas[id]);
    if (pendentes.length === 0) { void finalizar("CONCLUIDA"); return; }
    const novaPassagem = passagem + 1;
    setFila(pendentes);
    setIndiceAtual(0);
    setPassagem(novaPassagem);
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    registrarEventoLocal("retomada_pendentes", `Iniciada a passagem ${novaPassagem} com ${pendentes.length} questão(ões) pendente(s).`);
  };

  useEffect(() => {
    if (fase !== "em_prova") return;
    const totalTimer = window.setInterval(() => setTempoTotalRestante((atual) => {
      if (atual === 601) setAvisoDezMinutos(true);
      if (atual <= 1) { window.clearInterval(totalTimer); window.setTimeout(() => finalizar("TEMPO"), 0); return 0; }
      return atual - 1;
    }), 1000);
    return () => window.clearInterval(totalTimer);
  }, [fase]);

  useEffect(() => {
    if (fase !== "em_prova" || !questaoAtual) return;
    const timer = window.setInterval(() => setTempoQuestaoRestante((atual) => { if (atual <= 1) { window.clearInterval(timer); window.setTimeout(() => avancarQuestao(true), 0); return 0; } return atual - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [fase, questaoAtualId, indiceAtual, fila, respostas]);

  const validarCameraMicrofone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este navegador não permite verificar câmera e microfone.");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const cameraAtiva = stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled);
    const microfoneAtivo = stream.getAudioTracks().some((track) => track.readyState === "live" && track.enabled);
    if (!cameraAtiva || !microfoneAtivo) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Câmera e microfone precisam estar conectados, ligados e autorizados.");
    }
    streamCameraMicRef.current = stream;
    setCameraMicAtivos(true);
  };

  const validarEGravarTela = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") throw new Error("Este navegador não oferece suporte ao compartilhamento e gravação de tela.");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = stream.getVideoTracks()[0];
    const displaySurface = track?.getSettings?.().displaySurface;
    if (displaySurface && displaySurface !== "monitor") {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Você selecionou uma guia ou janela. Escolha obrigatoriamente TELA INTEIRA.");
    }
    streamTelaRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    track?.addEventListener("ended", () => registrarViolacao("interrupcao_compartilhamento"));
    recorder.start(1000);
    setGravacaoAtiva(true);
  };

  const prepararTentativa = async () => {
    const ordem = embaralhar(QUESTOES_DEMO.map((q) => q.id));
    const opcoes: Record<number, string[]> = {};
    QUESTOES_DEMO.forEach((q) => { opcoes[q.id] = embaralhar(q.opcoes); });

    let id: number;
    let respostasServidor: Record<number, string> = {};
    if (modoRetomada) {
      const atual = estadoQuery.data?.tentativa as any;
      if (!atual) throw new Error("Tentativa liberada não encontrada.");
      await retomarMutation.mutateAsync({ tentativaId: Number(atual.id) });
      id = Number(atual.id);
      for (const item of estadoQuery.data?.respostas ?? []) respostasServidor[Number(item.questaoId)] = item.resposta;
      const segundosRestantes = Math.max(0, Math.floor((new Date(atual.expires_at).getTime() - Date.now()) / 1000));
      setTempoTotalRestante(segundosRestantes);
    } else {
      const criada = await iniciarMutation.mutateAsync();
      id = Number(criada.id);
      setTempoTotalRestante(DURACAO_TOTAL_SEGUNDOS);
    }

    localStorage.removeItem(STORAGE_KEY);
    setTentativaId(id);
    setRespostas(respostasServidor);
    setEventos([]); setViolacoes(0); setOrdemQuestoes(ordem); setOrdemOpcoes(opcoes);
    const filaInicial = modoRetomada ? ordem.filter((qid) => !respostasServidor[qid]) : ordem;
    setFila(filaInicial.length > 0 ? filaInicial : ordem);
    setIndiceAtual(0); setPassagem(modoRetomada ? 2 : 1); setExibicoes({});
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    setAvisoDezMinutos(false); setAvisoInatividade(false);
    sessaoIniciadaNestaPaginaRef.current = true;
    faseRef.current = "em_prova";
    setFase("em_prova");
    registrarEventoLocal(modoRetomada ? "retomada" : "inicio", modoRetomada ? "Avaliação retomada após liberação administrativa." : "Avaliação iniciada e vinculada a uma tentativa no servidor.");
    await utils.provaUtic.estado.invalidate();
  };

  const abrirComunicado = (retomada = false) => {
    setModoRetomada(retomada);
    setErroInicio(null);
    setAceiteComunicado(false);
    setAceiteTela(false);
    setMostrarComunicado(true);
  };

  const concluirComunicado = async () => {
    if (!aceiteComunicado) return;
    setErroInicio(null);
    setMostrarComunicado(false);
    try {
      await validarCameraMicrofone();
      setMostrarAvisoTela(true);
    } catch (error) {
      pararMonitoramento();
      setErroInicio(error instanceof Error ? error.message : "Não foi possível validar câmera e microfone.");
    }
  };

  const abrirSeletorTela = async () => {
    if (!aceiteTela) return;
    setErroInicio(null);
    setMostrarAvisoTela(false);
    try {
      await validarEGravarTela();
      await document.documentElement.requestFullscreen();
      await prepararTentativa();
    } catch (error: any) {
      pararMonitoramento();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      setErroInicio(error?.message ?? "Não foi possível validar o compartilhamento da tela.");
    }
  };

  const responder = (questaoId: number, resposta: string) => {
    if (!tentativaId) return;
    setRespostas((atual) => { const proximo = { ...atual, [questaoId]: resposta }; persistir({ respostas: proximo }); return proximo; });
    salvarRespostaMutation.mutate({ tentativaId, questaoId, resposta }, {
      onError: (error) => setAviso(`Não foi possível salvar a resposta no servidor: ${error.message}`),
    });
  };

  if (loading || !user || estadoQuery.isLoading) return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Verificando acesso e tentativa...</div>;

  const tentativaServidor = estadoQuery.data?.tentativa as any;
  const statusServidor = tentativaServidor?.status as string | undefined;

  if (fase === "bloqueada" || statusServidor === "BLOQUEADA") return (
    <div className="min-h-screen bg-slate-950 p-6 grid place-items-center"><Card className="max-w-2xl w-full border-amber-400"><CardHeader><div className="flex items-center gap-3"><LockKeyhole className="h-8 w-8 text-amber-600" /><div><CardTitle>Avaliação interrompida e bloqueada</CardTitle><CardDescription>As respostas já registradas foram preservadas.</CardDescription></div></div></CardHeader><CardContent className="space-y-4"><div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Você não pode retornar à avaliação automaticamente.</p><p className="mt-2">Entre em contato com o administrador. Somente o administrador poderá liberar a continuidade desta mesma tentativa.</p></div><p className="text-sm text-muted-foreground">Motivo registrado: {tentativaServidor?.block_reason ?? "interrupção da sessão"}</p>{(user.role === "admin" || user.role === "Administrador") && tentativaServidor?.id && <Button onClick={() => liberarMutation.mutate({ tentativaId: Number(tentativaServidor.id) })} disabled={liberarMutation.isPending}>Liberar continuidade como administrador</Button>}</CardContent></Card></div>
  );

  if (fase === "anulada" || statusServidor === "ANULADA") return <div className="min-h-screen bg-slate-950 p-6 grid place-items-center"><Card className="max-w-xl w-full border-red-300"><CardHeader><CardTitle className="text-red-700">Avaliação encerrada por segurança</CardTitle><CardDescription>Entre em contato com o administrador.</CardDescription></CardHeader></Card></div>;

  if (fase === "finalizada" || ["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(statusServidor ?? "")) {
    const respondidas = Object.keys(respostas).length || estadoQuery.data?.respostas?.length || 0;
    const encerradaPorTempo = statusServidor === "FINALIZADA_TEMPO";
    return <div className="min-h-screen bg-slate-50 p-6 grid place-items-center"><Card className="max-w-2xl w-full border-emerald-300 shadow-lg"><CardHeader><div className="flex items-center gap-3"><CheckCircle2 className="h-10 w-10 text-emerald-600" /><div><CardTitle className="text-2xl">AVALIAÇÃO CONCLUÍDA</CardTitle><CardDescription>{encerradaPorTempo ? "O tempo total da avaliação foi encerrado." : "Avaliação concluída com sucesso. Suas respostas foram registradas."}</CardDescription></div></div></CardHeader><CardContent className="space-y-4"><div className="rounded-md border bg-emerald-50 p-4"><p className="font-semibold">Suas respostas foram registradas no servidor.</p><p className="mt-1 text-sm">Questões respondidas: {respondidas} de {QUESTOES_DEMO.length}.</p></div><p className="text-sm text-muted-foreground">Esta tentativa está encerrada e não pode ser reiniciada pelo participante. Você pode fechar esta janela.</p></CardContent></Card></div>;
  }

  if (fase === "em_prova" && questaoAtual) {
    const opcoesAtuais = ordemOpcoes[questaoAtual.id] ?? questaoAtual.opcoes;
    return (
      <div className="prova-protegida min-h-screen bg-slate-100"><style>{`.prova-protegida,.prova-protegida *{-webkit-user-select:none!important;user-select:none!important}@media print{body *{visibility:hidden!important}}`}</style>
        <header className="sticky top-0 z-40 border-b bg-white px-5 py-3"><div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Avaliação Técnica UTIC — Modo Prova Segura</p><p className="text-xs text-muted-foreground">Questões demonstrativas.</p></div><div className="flex flex-wrap gap-2"><Badge variant={cameraMicAtivos ? "default" : "destructive"}><Video className="mr-1 h-3 w-3" />Câmera/Mic {cameraMicAtivos ? "ativos" : "inativos"}</Badge><Badge variant={gravacaoAtiva ? "default" : "destructive"}><MonitorUp className="mr-1 h-3 w-3" />{gravacaoAtiva ? "Tela compartilhada" : "Sem tela"}</Badge><Badge variant={violacoes ? "destructive" : "secondary"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge><div className="rounded-md bg-slate-950 px-4 py-2 font-mono text-white">Total {formatarTempo(tempoTotalRestante)}</div></div></div></header>
        <main className="mx-auto max-w-4xl p-5 pb-32 space-y-4">
          {avisoDezMinutos && <div className="rounded-lg border-2 border-red-400 bg-red-50 p-5 text-red-950"><p className="text-lg font-bold">ATENÇÃO: FALTAM 10 MINUTOS</p><p>A avaliação será encerrada automaticamente quando o tempo total chegar a zero. As respostas já salvas permanecerão registradas.</p></div>}
          {avisoInatividade && <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-5 text-amber-950"><p className="text-lg font-bold">ATENÇÃO — INATIVIDADE DETECTADA</p><p>Movimente o mouse ou pressione uma tecla para manter sua avaliação ativa. Ao completar 3 minutos sem atividade, a prova será bloqueada e somente o administrador poderá liberar a continuidade.</p></div>}
          {aviso && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Ocorrência:</strong> {aviso}</div>}
          <div className="text-sm"><strong>Passagem {passagem}</strong> · {Object.keys(respostas).length} de {QUESTOES_DEMO.length} respondidas</div>
          <Card><CardHeader><CardTitle>Questão {indiceAtual + 1} de {fila.length}</CardTitle><CardDescription className="text-base text-foreground">{questaoAtual.enunciado}</CardDescription></CardHeader><CardContent className="space-y-4">{opcoesAtuais.map((opcao, index) => <label key={opcao} className="flex items-center gap-3 rounded-md border p-3"><input type="radio" name={`q-${questaoAtual.id}`} checked={respostas[questaoAtual.id] === opcao} onChange={() => responder(questaoAtual.id, opcao)} /><span><strong>{String.fromCharCode(65 + index)}.</strong> {opcao}</span></label>)}<div className={`rounded-md border p-4 ${tempoQuestaoRestante <= 10 ? "border-red-300 bg-red-50" : "bg-slate-50"}`}><p className="text-xs uppercase text-muted-foreground">Tempo desta questão</p><p className="font-mono text-3xl font-bold">{formatarTempo(tempoQuestaoRestante)}</p><p className="text-xs text-muted-foreground">Ao zerar, a próxima questão será apresentada. Se não houver resposta, esta questão voltará depois.</p></div><div className="flex justify-end"><Button disabled={!respostas[questaoAtual.id]} onClick={() => avancarQuestao(false)}>Salvar e avançar</Button></div></CardContent></Card>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-[0_-4px_14px_rgba(0,0,0,0.08)]"><div className="mx-auto max-w-4xl flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">As respostas são salvas no servidor a cada marcação.</p><Button variant="destructive" onClick={() => setMostrarConfirmacaoFinalizar(true)}>FINALIZAR AVALIAÇÃO</Button></div></footer>
        {mostrarConfirmacaoFinalizar && <div className="fixed inset-0 z-[160] bg-black/80 p-4 grid place-items-center"><div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><AlertTriangle className="h-8 w-8 text-red-700 shrink-0" /><div><h2 className="text-xl font-bold">Tem certeza que deseja finalizar?</h2><p className="mt-3 text-sm leading-relaxed">Ao clicar em <strong>FINALIZAR DEFINITIVAMENTE</strong>, você não poderá dar continuidade a esta avaliação. As respostas já registradas serão mantidas.</p></div></div><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setMostrarConfirmacaoFinalizar(false)}>Continuar avaliação</Button><Button variant="destructive" onClick={() => { setMostrarConfirmacaoFinalizar(false); void finalizar("MANUAL"); }}>FINALIZAR DEFINITIVAMENTE</Button></div></div></div>}
      </div>
    );
  }

  const podeRetomar = statusServidor === "LIBERADA";
  return (
    <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-blue-700" />Modo Prova Segura — Piloto UTIC</h1><p className="text-sm text-muted-foreground mt-2">Teste do ambiente seguro antes de carregar as 60 questões oficiais.</p></div>
      {podeRetomar && <Card className="border-emerald-300 bg-emerald-50"><CardHeader><CardTitle>Continuidade liberada pelo administrador</CardTitle><CardDescription>Você poderá continuar a mesma tentativa. As respostas já registradas serão preservadas e o tempo total não será reiniciado.</CardDescription></CardHeader><CardContent><Button size="lg" onClick={() => abrirComunicado(true)}>RETOMAR AVALIAÇÃO LIBERADA</Button></CardContent></Card>}
      {!tentativaServidor && <><Card><CardHeader><CardTitle>Requisitos básicos</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="rounded-md border p-4"><Video className="h-5 w-5 mb-2" /><strong>Computador com câmera</strong><p className="text-sm text-muted-foreground mt-1">A câmera deverá estar conectada, ligada e autorizada durante toda a prova.</p></div><div className="rounded-md border p-4"><Mic className="h-5 w-5 mb-2" /><strong>Microfone obrigatório</strong><p className="text-sm text-muted-foreground mt-1">O microfone deverá estar conectado, ligado e autorizado durante toda a prova.</p></div><div className="rounded-md border p-4"><MonitorUp className="h-5 w-5 mb-2" /><strong>Compartilhar Tela inteira</strong><p className="text-sm text-muted-foreground mt-1">Guia do Chrome ou Janela não serão aceitas.</p></div><div className="rounded-md border p-4"><Shuffle className="h-5 w-5 mb-2" /><strong>Questões aleatórias</strong><p className="text-sm text-muted-foreground mt-1">Questões e alternativas são embaralhadas por tentativa.</p></div></CardContent></Card>{erroInicio && <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800"><strong>Não foi possível iniciar:</strong> {erroInicio}</div>}<Button size="lg" onClick={() => abrirComunicado(false)}>Iniciar avaliação</Button></>}

      {(user.role === "admin" || user.role === "Administrador") && (bloqueadasQuery.data?.length ?? 0) > 0 && <Card><CardHeader><CardTitle>Administração — tentativas bloqueadas</CardTitle><CardDescription>Somente o administrador pode liberar a continuidade.</CardDescription></CardHeader><CardContent className="space-y-3">{bloqueadasQuery.data?.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{item.colaboradorNome || `Empregado ${item.colaboradorId}`}</p><p className="text-xs text-muted-foreground">Tentativa #{item.id} · {item.status} · {item.blockReason || "sem motivo informado"}</p></div>{item.status === "BLOQUEADA" && <Button onClick={() => liberarMutation.mutate({ tentativaId: Number(item.id) })} disabled={liberarMutation.isPending}>Liberar continuidade</Button>}</div>)}</CardContent></Card>}
    </div>

    {mostrarComunicado && <div className="fixed inset-0 z-[100] bg-black/75 p-4 grid place-items-center"><div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="sticky top-0 bg-red-700 text-white p-6"><div className="flex items-center gap-3"><AlertTriangle className="h-9 w-9" /><div><p className="text-sm font-semibold uppercase tracking-wider">Comunicado obrigatório</p><h2 className="text-2xl font-bold">Leia todas as regras antes de iniciar a avaliação</h2></div></div></div><div className="p-6 space-y-5 text-sm leading-relaxed"><p className="text-base font-semibold">Ao prosseguir, você declara que está ciente das condições abaixo e concorda em realizar a prova em ambiente monitorado.</p><div className="space-y-3"><p><strong>1. Equipamento:</strong> computador com câmera e microfone conectados, ligados e autorizados durante toda a avaliação.</p><p><strong>2. Tela única:</strong> mantenha apenas a tela usada na prova ativa e feche abas, janelas, aplicativos e documentos desnecessários.</p><p><strong>3. Compartilhamento:</strong> selecione exclusivamente <strong>TELA INTEIRA</strong>. Guia do Chrome ou Janela não serão aceitas.</p><p><strong>4. Tempo:</strong> cada questão terá 2 minutos e o tempo total máximo será de 3 horas. Faltando 10 minutos, o sistema emitirá um alerta.</p><p><strong>5. Inatividade:</strong> após 2 minutos e 30 segundos sem atividade será exibido um aviso. Ao completar 3 minutos sem mouse ou teclado, a avaliação será bloqueada.</p><p><strong>6. Interrupção:</strong> se a aba, navegador ou prova for fechada, as respostas salvas serão preservadas, mas você não poderá retornar sem liberação do administrador.</p><p><strong>7. Finalização voluntária:</strong> o botão FINALIZAR AVALIAÇÃO estará disponível durante a prova. Se você confirmar a finalização, não poderá continuar esta tentativa.</p><p><strong>8. Conteúdo protegido:</strong> é proibido selecionar, copiar, colar, imprimir, salvar, fotografar, capturar ou reproduzir questões e alternativas.</p><p><strong>9. Reinício:</strong> o participante nunca poderá reiniciar a avaliação do zero. Somente o administrador poderá liberar a continuidade de uma tentativa interrompida.</p></div><div className="rounded-lg border-2 border-red-300 bg-red-50 p-4"><label className="flex items-start gap-3 cursor-pointer"><input className="mt-1 h-5 w-5" type="checkbox" checked={aceiteComunicado} onChange={(e) => setAceiteComunicado(e.target.checked)} /><span className="font-semibold text-red-900">LI TODAS AS REGRAS, ESTOU CIENTE DAS CONDIÇÕES DE REALIZAÇÃO E MONITORAMENTO DA AVALIAÇÃO E CONCORDO EM PROSSEGUIR.</span></label></div><div className="flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={() => setMostrarComunicado(false)}>Cancelar</Button><Button disabled={!aceiteComunicado} className="bg-red-700 hover:bg-red-800" onClick={concluirComunicado}>ACEITO E ESTOU CIENTE — PROSSEGUIR</Button></div></div></div></div>}

    {mostrarAvisoTela && <div className="fixed inset-0 z-[120] bg-black/85 p-4 grid place-items-center"><div className="w-full max-w-2xl rounded-2xl border-4 border-amber-400 bg-white shadow-2xl"><div className="bg-amber-400 px-6 py-5 text-slate-950"><div className="flex items-center gap-3"><MonitorUp className="h-10 w-10" /><div><p className="text-sm font-black uppercase tracking-widest">Atenção antes de compartilhar</p><h2 className="text-3xl font-black">USE SOMENTE TELA INTEIRA</h2></div></div></div><div className="p-7 space-y-5"><div className="rounded-xl border-2 border-red-300 bg-red-50 p-5 text-red-950"><p className="text-xl font-black">ANTES DE CLICAR EM “ESCOLHER TELA”:</p><div className="mt-4 space-y-3 text-base font-semibold"><p>1. Feche todas as outras abas do navegador que não serão utilizadas.</p><p>2. Feche outras janelas, aplicativos, documentos, mensagens e sistemas abertos.</p><p>3. Se utiliza dois ou mais monitores, mantenha somente a tela da prova ativa.</p><p>4. Na janela do Chrome que abrirá em seguida, clique na opção <strong>TELA INTEIRA</strong>.</p><p>5. NÃO escolha <strong>Guia do Chrome</strong> e NÃO escolha <strong>Janela</strong>.</p></div></div><label className="flex items-start gap-3 rounded-xl border-2 border-slate-300 p-4 cursor-pointer"><input className="mt-1 h-5 w-5" type="checkbox" checked={aceiteTela} onChange={(e) => setAceiteTela(e.target.checked)} /><span className="font-bold">Já fechei as abas, janelas e aplicativos desnecessários, estou usando apenas a tela destinada à prova e estou ciente de que devo selecionar TELA INTEIRA.</span></label><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { pararMonitoramento(); setMostrarAvisoTela(false); }}>Cancelar</Button><Button disabled={!aceiteTela} size="lg" className="bg-amber-500 text-slate-950 hover:bg-amber-600 font-black" onClick={abrirSeletorTela}>ESTOU PRONTO — ESCOLHER TELA INTEIRA</Button></div></div></div></div>}
    </div>
  );
}

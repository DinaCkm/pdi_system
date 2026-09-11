import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { UTIC_QUESTOES, TOTAL_QUESTOES_UTIC, type UticOpcao } from "@shared/uticQuestoes";
import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, Mic, MonitorUp, ShieldCheck, Shuffle, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DURACAO_TOTAL_SEGUNDOS = 3 * 60 * 60;
const DURACAO_QUESTAO_SEGUNDOS = 2 * 60;
const LIMITE_VIOLACOES = 3;
const INATIVIDADE_ALERTA_MS = 150 * 1000;
const INATIVIDADE_BLOQUEIO_MS = 180 * 1000;
const STORAGE_KEY = "utic-prova-segura-oficial-v1";

type Fase = "preparacao" | "em_prova" | "finalizada" | "anulada" | "bloqueada";
type EventoAuditoria = { data: string; tipo: string; detalhe: string };
type TipoAuditoria =
  | "troca_aba"
  | "saida_tela_cheia"
  | "interrupcao_compartilhamento"
  | "compartilhamento_invalido"
  | "multiplas_telas"
  | "tentativa_conteudo_protegido"
  | "tentativa_print_screen"
  | "tempo_questao_esgotado"
  | "retomada_pendentes"
  | "ordem_aleatoria"
  | "monitoramento_iniciado";

type EstadoSalvo = {
  tentativaId: number;
  ordemQuestoes: number[];
  ordemOpcoes: Record<number, string[]>;
  fila: number[];
  indiceAtual: number;
  passagem: number;
  exibicoes: Record<number, number>;
};

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function formatarTempo(total: number) {
  const seguro = Math.max(0, Math.floor(total));
  const horas = Math.floor(seguro / 3600);
  const minutos = Math.floor((seguro % 3600) / 60).toString().padStart(2, "0");
  const segundos = (seguro % 60).toString().padStart(2, "0");
  return horas > 0 ? `${horas}:${minutos}:${segundos}` : `${minutos}:${segundos}`;
}

function lerEstadoLocal(tentativaId: number): EstadoSalvo | null {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto) as EstadoSalvo;
    if (Number(salvo.tentativaId) !== Number(tentativaId)) return null;
    if (!Array.isArray(salvo.ordemQuestoes) || salvo.ordemQuestoes.length !== TOTAL_QUESTOES_UTIC) return null;
    return salvo;
  } catch {
    return null;
  }
}

export default function ProvaSeguraUtic() {
  const { loading, user } = useAuth();
  const utils = trpc.useUtils();
  const estadoQuery = trpc.provaUtic.estado.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const bloqueadasQuery = trpc.provaUtic.listarBloqueadas.useQuery(undefined, {
    enabled: user?.role === "admin" || user?.role === "Administrador",
  });

  const iniciarMutation = trpc.provaUtic.iniciar.useMutation();
  const retomarMutation = trpc.provaUtic.retomar.useMutation();
  const salvarRespostaMutation = trpc.provaUtic.salvarResposta.useMutation();
  const atividadeMutation = trpc.provaUtic.atividade.useMutation();
  const bloquearMutation = trpc.provaUtic.bloquear.useMutation();
  const finalizarMutation = trpc.provaUtic.finalizar.useMutation();
  const auditoriaMutation = trpc.provaUticAuditoria.registrar.useMutation();
  const liberarMutation = trpc.provaUtic.liberarContinuacao.useMutation({
    onSuccess: async () => {
      await bloqueadasQuery.refetch();
      await estadoQuery.refetch();
    },
  });

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
  const [monitoramentoTelaAtivo, setMonitoramentoTelaAtivo] = useState(false);
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
  const respostasRef = useRef<Record<number, string>>({});
  const streamTelaRef = useRef<MediaStream | null>(null);
  const streamCameraMicRef = useRef<MediaStream | null>(null);
  const ultimaAtividadeLocalRef = useRef(Date.now());
  const ultimoPingRef = useRef(0);
  const ultimaProtecaoRef = useRef(0);
  const sessaoIniciadaNestaPaginaRef = useRef(false);

  const questaoAtualId = fila[indiceAtual];
  const questaoAtual = useMemo(
    () => UTIC_QUESTOES.find((questao) => questao.id === questaoAtualId) ?? null,
    [questaoAtualId]
  );

  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => { tentativaIdRef.current = tentativaId; }, [tentativaId]);
  useEffect(() => { respostasRef.current = respostas; }, [respostas]);
  useEffect(() => { if (!loading && !user) window.location.href = "/login"; }, [loading, user]);

  const persistirNavegacao = (parcial: Partial<EstadoSalvo> = {}) => {
    const id = parcial.tentativaId ?? tentativaIdRef.current;
    if (!id) return;
    const estado: EstadoSalvo = {
      tentativaId: id,
      ordemQuestoes,
      ordemOpcoes,
      fila,
      indiceAtual,
      passagem,
      exibicoes,
      ...parcial,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  };

  const registrarEvento = (tipo: TipoAuditoria, detalhe: string) => {
    const registro = { data: new Date().toISOString(), tipo, detalhe };
    setEventos((atual) => [registro, ...atual].slice(0, 100));
    const id = tentativaIdRef.current;
    if (id) auditoriaMutation.mutate({ tentativaId: id, tipo, detalhe });
  };

  const pararMonitoramento = () => {
    streamTelaRef.current?.getTracks().forEach((track) => track.stop());
    streamCameraMicRef.current?.getTracks().forEach((track) => track.stop());
    streamTelaRef.current = null;
    streamCameraMicRef.current = null;
    setMonitoramentoTelaAtivo(false);
    setCameraMicAtivos(false);
  };

  useEffect(() => {
    const estado = estadoQuery.data;
    if (!estado || sessaoIniciadaNestaPaginaRef.current) return;
    const tentativa = estado.tentativa as any;
    if (!tentativa) return;

    setTentativaId(Number(tentativa.id));
    const respostasServidor: Record<number, string> = {};
    for (const item of estado.respostas ?? []) respostasServidor[Number(item.questaoId)] = String(item.resposta);
    setRespostas(respostasServidor);
    respostasRef.current = respostasServidor;

    if (tentativa.status === "EM_ANDAMENTO") {
      bloquearMutation.mutate(
        { tentativaId: Number(tentativa.id), motivo: "FECHAMENTO" },
        { onSettled: async () => { setFase("bloqueada"); await estadoQuery.refetch(); } }
      );
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
      if (motivo !== "TEMPO") {
        setAviso(error?.message ?? "Não foi possível registrar a finalização no servidor.");
        return;
      }
    }
    sessaoIniciadaNestaPaginaRef.current = false;
    faseRef.current = "finalizada";
    setFase("finalizada");
    pararMonitoramento();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    await estadoQuery.refetch();
  };

  const bloquearSessao = async (motivo: "INATIVIDADE_3_MIN" | "FECHAMENTO" | "INTERRUPCAO_TECNICA" | "SEGURANCA") => {
    if (!tentativaIdRef.current || faseRef.current !== "em_prova") return;
    try {
      await bloquearMutation.mutateAsync({ tentativaId: tentativaIdRef.current, motivo });
    } catch {
      // A validação definitiva também ocorre no servidor ao consultar a tentativa.
    }
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
      const detalhe = tipo === "troca_aba"
        ? "A página da prova perdeu visibilidade."
        : tipo === "saida_tela_cheia"
          ? "O modo tela cheia foi encerrado."
          : "O compartilhamento da tela foi interrompido.";
      setAviso(`${detalhe} Ocorrência ${novo} de ${LIMITE_VIOLACOES}.`);
      registrarEvento(tipo, detalhe);
      if (novo >= LIMITE_VIOLACOES) window.setTimeout(() => void bloquearSessao("SEGURANCA"), 0);
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
      if (faseRef.current === "em_prova" && tentativaIdRef.current) {
        bloquearMutation.mutate({ tentativaId: tentativaIdRef.current, motivo: "FECHAMENTO" });
      }
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
    const bloquearConteudo = (event: Event) => {
      event.preventDefault();
      const agora = Date.now();
      if (agora - ultimaProtecaoRef.current < 1200) return;
      ultimaProtecaoRef.current = agora;
      const detalhe = "Tentativa de copiar, selecionar, colar, imprimir, salvar ou reproduzir conteúdo bloqueada.";
      registrarEvento("tentativa_conteudo_protegido", detalhe);
      setAviso("Ação não permitida. Esta avaliação possui conteúdo protegido. A ocorrência foi registrada.");
    };
    const bloquearTeclas = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "x", "v", "p", "s", "u", "a"].includes(tecla)) bloquearConteudo(event);
      if (event.key === "PrintScreen") {
        event.preventDefault();
        registrarEvento("tentativa_print_screen", "Tecla Print Screen detectada pelo navegador.");
        setAviso("Tentativa de captura registrada. O sistema não permite reprodução do conteúdo da avaliação.");
      }
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
    const atividade = () => {
      ultimaAtividadeLocalRef.current = Date.now();
      setAvisoInatividade(false);
      const agora = Date.now();
      if (agora - ultimoPingRef.current >= 20_000) {
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
        window.setTimeout(() => void bloquearSessao("INATIVIDADE_3_MIN"), 800);
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
    if (porTempo) {
      registrarEvento("tempo_questao_esgotado", `Tempo de 2 minutos encerrado para a questão de banco ${questaoAtual.id}.`);
    }

    if (indiceAtual < fila.length - 1) {
      const proximoIndice = indiceAtual + 1;
      setIndiceAtual(proximoIndice);
      setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
      persistirNavegacao({ indiceAtual: proximoIndice, exibicoes: novasExibicoes });
      return;
    }

    const pendentes = ordemQuestoes.filter((id) => !respostasRef.current[id]);
    if (pendentes.length === 0) {
      void finalizar("CONCLUIDA");
      return;
    }

    const novaPassagem = passagem + 1;
    setFila(pendentes);
    setIndiceAtual(0);
    setPassagem(novaPassagem);
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    persistirNavegacao({ fila: pendentes, indiceAtual: 0, passagem: novaPassagem, exibicoes: novasExibicoes });
    registrarEvento("retomada_pendentes", `Iniciada a passagem ${novaPassagem} com ${pendentes.length} questão(ões) pendente(s).`);
  };

  useEffect(() => {
    if (fase !== "em_prova") return;
    const totalTimer = window.setInterval(() => {
      setTempoTotalRestante((atual) => {
        if (atual === 601) setAvisoDezMinutos(true);
        if (atual <= 1) {
          window.clearInterval(totalTimer);
          window.setTimeout(() => void finalizar("TEMPO"), 0);
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
    return () => window.clearInterval(totalTimer);
  }, [fase]);

  useEffect(() => {
    if (fase !== "em_prova" || !questaoAtual) return;
    const timer = window.setInterval(() => {
      setTempoQuestaoRestante((atual) => {
        if (atual <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => avancarQuestao(true), 0);
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [fase, questaoAtualId, indiceAtual]);

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

  const validarQuantidadeTelas = async () => {
    const getScreenDetails = (window as any).getScreenDetails;
    if (typeof getScreenDetails !== "function") return;
    try {
      const detalhes = await getScreenDetails.call(window);
      const quantidade = Array.isArray(detalhes?.screens) ? detalhes.screens.length : 0;
      if (quantidade > 1) {
        throw new Error("Foram identificadas múltiplas telas/monitores. Para realizar a avaliação, mantenha somente uma tela ativa e tente novamente.");
      }
    } catch (error: any) {
      if (/múltiplas telas/i.test(String(error?.message ?? ""))) throw error;
      // Nem todos os navegadores permitem enumerar monitores; a prova continua com as demais proteções.
    }
  };

  const validarTelaInteira = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Este navegador não oferece suporte ao compartilhamento de tela exigido pela avaliação.");
    }
    await validarQuantidadeTelas();
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = stream.getVideoTracks()[0];
    const displaySurface = track?.getSettings?.().displaySurface;
    if (displaySurface && displaySurface !== "monitor") {
      stream.getTracks().forEach((item) => item.stop());
      throw new Error("Você selecionou uma guia ou janela. Para realizar esta avaliação é obrigatório compartilhar TELA INTEIRA.");
    }
    streamTelaRef.current = stream;
    setMonitoramentoTelaAtivo(true);
    track?.addEventListener("ended", () => registrarViolacao("interrupcao_compartilhamento"));
  };

  const criarOrdemAleatoria = () => {
    const ordem = embaralhar(UTIC_QUESTOES.map((questao) => questao.id));
    const opcoes: Record<number, string[]> = {};
    for (const questao of UTIC_QUESTOES) opcoes[questao.id] = embaralhar(questao.opcoes.map((opcao) => opcao.id));
    return { ordem, opcoes };
  };

  const prepararTentativa = async () => {
    let id: number;
    let respostasServidor: Record<number, string> = {};
    let segundosRestantes = DURACAO_TOTAL_SEGUNDOS;

    if (modoRetomada) {
      const atual = estadoQuery.data?.tentativa as any;
      if (!atual) throw new Error("Tentativa liberada não encontrada.");
      const retomada = await retomarMutation.mutateAsync({ tentativaId: Number(atual.id) });
      id = Number(atual.id);
      for (const item of estadoQuery.data?.respostas ?? []) respostasServidor[Number(item.questaoId)] = String(item.resposta);
      segundosRestantes = Math.max(0, Math.floor((new Date(retomada.expiresAt).getTime() - Date.now()) / 1000));
    } else {
      const criada = await iniciarMutation.mutateAsync();
      id = Number(criada.id);
      localStorage.removeItem(STORAGE_KEY);
    }

    const salvo = modoRetomada ? lerEstadoLocal(id) : null;
    const aleatorio = salvo ? null : criarOrdemAleatoria();
    const ordem = salvo?.ordemQuestoes ?? aleatorio!.ordem;
    const opcoes = salvo?.ordemOpcoes ?? aleatorio!.opcoes;
    const filaInicial = salvo?.fila?.length
      ? salvo.fila.filter((qid) => !respostasServidor[qid])
      : (modoRetomada ? ordem.filter((qid) => !respostasServidor[qid]) : ordem);
    const filaValida = filaInicial.length > 0 ? filaInicial : ordem;
    const indiceValido = salvo && filaValida.length > 0 ? Math.min(salvo.indiceAtual ?? 0, filaValida.length - 1) : 0;
    const passagemValida = salvo?.passagem ?? (modoRetomada ? 2 : 1);
    const exibicoesValidas = salvo?.exibicoes ?? {};

    setTentativaId(id);
    tentativaIdRef.current = id;
    setRespostas(respostasServidor);
    respostasRef.current = respostasServidor;
    setEventos([]);
    setViolacoes(0);
    setOrdemQuestoes(ordem);
    setOrdemOpcoes(opcoes);
    setFila(filaValida);
    setIndiceAtual(indiceValido);
    setPassagem(passagemValida);
    setExibicoes(exibicoesValidas);
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    setTempoTotalRestante(segundosRestantes);
    setAvisoDezMinutos(segundosRestantes <= 600);
    setAvisoInatividade(false);
    sessaoIniciadaNestaPaginaRef.current = true;
    faseRef.current = "em_prova";
    setFase("em_prova");

    const estadoLocal: EstadoSalvo = {
      tentativaId: id,
      ordemQuestoes: ordem,
      ordemOpcoes: opcoes,
      fila: filaValida,
      indiceAtual: indiceValido,
      passagem: passagemValida,
      exibicoes: exibicoesValidas,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoLocal));

    const resumoOrdem = ordem.map((qid) => `${qid}:${(opcoes[qid] ?? []).join(",")}`).join("|");
    registrarEvento("ordem_aleatoria", resumoOrdem);
    registrarEvento("monitoramento_iniciado", "Câmera, microfone, compartilhamento de tela inteira e modo tela cheia validados.");
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
      await validarTelaInteira();
      await document.documentElement.requestFullscreen();
      if (!document.fullscreenElement) throw new Error("O modo tela cheia é obrigatório para iniciar a avaliação.");
      await prepararTentativa();
    } catch (error: any) {
      pararMonitoramento();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      setErroInicio(error?.message ?? "Não foi possível validar o ambiente seguro da avaliação.");
    }
  };

  const responder = (questaoId: number, opcaoId: string) => {
    if (!tentativaId) return;
    const proximo = { ...respostasRef.current, [questaoId]: opcaoId };
    respostasRef.current = proximo;
    setRespostas(proximo);
    salvarRespostaMutation.mutate(
      { tentativaId, questaoId, resposta: opcaoId },
      { onError: (error) => setAviso(`Não foi possível salvar a resposta no servidor: ${error.message}`) }
    );
  };

  if (loading || !user || estadoQuery.isLoading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Verificando acesso e tentativa...</div>;
  }

  const tentativaServidor = estadoQuery.data?.tentativa as any;
  const statusServidor = tentativaServidor?.status as string | undefined;

  if (fase === "bloqueada" || statusServidor === "BLOQUEADA") {
    return (
      <div className="min-h-screen bg-slate-950 p-6 grid place-items-center">
        <Card className="max-w-2xl w-full border-amber-400">
          <CardHeader>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-8 w-8 text-amber-600" />
              <div>
                <CardTitle>Avaliação interrompida e bloqueada</CardTitle>
                <CardDescription>As respostas já registradas foram preservadas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Você não pode retornar à avaliação automaticamente.</p>
              <p className="mt-2">Entre em contato com o administrador. Somente o administrador poderá liberar a continuidade desta mesma tentativa.</p>
            </div>
            <p className="text-sm text-muted-foreground">Motivo registrado: {tentativaServidor?.block_reason ?? "interrupção da sessão"}</p>
            {(user.role === "admin" || user.role === "Administrador") && tentativaServidor?.id && (
              <Button onClick={() => liberarMutation.mutate({ tentativaId: Number(tentativaServidor.id) })} disabled={liberarMutation.isPending}>
                Liberar continuidade como administrador
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fase === "anulada" || statusServidor === "ANULADA") {
    return (
      <div className="min-h-screen bg-slate-950 p-6 grid place-items-center">
        <Card className="max-w-xl w-full border-red-300">
          <CardHeader>
            <CardTitle className="text-red-700">Avaliação encerrada por segurança</CardTitle>
            <CardDescription>Entre em contato com o administrador.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (fase === "finalizada" || ["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(statusServidor ?? "")) {
    const respondidas = Object.keys(respostas).length || estadoQuery.data?.respostas?.length || 0;
    const encerradaPorTempo = statusServidor === "FINALIZADA_TEMPO";
    return (
      <div className="min-h-screen bg-slate-50 p-6 grid place-items-center">
        <Card className="max-w-2xl w-full border-emerald-300 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <div>
                <CardTitle className="text-2xl">AVALIAÇÃO CONCLUÍDA</CardTitle>
                <CardDescription>{encerradaPorTempo ? "O tempo total da avaliação foi encerrado." : "Avaliação concluída com sucesso. Suas respostas foram registradas."}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-emerald-50 p-4">
              <p className="font-semibold">Suas respostas foram registradas no servidor.</p>
              <p className="mt-1 text-sm">Questões respondidas: {respondidas} de {TOTAL_QUESTOES_UTIC}.</p>
            </div>
            <p className="text-sm text-muted-foreground">O resultado técnico é disponibilizado à administração. Esta tentativa não pode ser reiniciada pelo participante.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fase === "em_prova" && questaoAtual) {
    const idsOpcoes = ordemOpcoes[questaoAtual.id] ?? questaoAtual.opcoes.map((opcao) => opcao.id);
    const opcoesAtuais = idsOpcoes
      .map((id) => questaoAtual.opcoes.find((opcao) => opcao.id === id))
      .filter((opcao): opcao is UticOpcao => Boolean(opcao));
    const respondidas = Object.keys(respostas).length;
    const tituloPosicao = passagem === 1
      ? `Questão ${indiceAtual + 1} de ${TOTAL_QUESTOES_UTIC}`
      : `Retorno de pendentes — ${indiceAtual + 1} de ${fila.length}`;

    return (
      <div className="prova-protegida min-h-screen bg-slate-100">
        <style>{`.prova-protegida,.prova-protegida *{-webkit-user-select:none!important;user-select:none!important}@media print{body *{visibility:hidden!important}.prova-protegida:before{visibility:visible!important;content:'CONTEÚDO PROTEGIDO — IMPRESSÃO NÃO AUTORIZADA';position:fixed;inset:0;display:grid;place-items:center;font-size:24px;font-weight:700}}`}</style>
        <header className="sticky top-0 z-40 border-b bg-white px-5 py-3">
          <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Avaliação Técnica UTIC — Modo Prova Segura</p>
              <p className="text-xs text-muted-foreground">60 questões oficiais · 2 minutos por questão · até 3 horas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={cameraMicAtivos ? "default" : "destructive"}><Video className="mr-1 h-3 w-3" />Câmera/Mic {cameraMicAtivos ? "ativos" : "inativos"}</Badge>
              <Badge variant={monitoramentoTelaAtivo ? "default" : "destructive"}><MonitorUp className="mr-1 h-3 w-3" />{monitoramentoTelaAtivo ? "Tela inteira ativa" : "Sem tela"}</Badge>
              <Badge variant={violacoes ? "destructive" : "secondary"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge>
              <div className="rounded-md bg-slate-950 px-4 py-2 font-mono text-white">Total {formatarTempo(tempoTotalRestante)}</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl p-5 pb-32 space-y-4">
          {avisoDezMinutos && (
            <div className="rounded-lg border-2 border-red-400 bg-red-50 p-5 text-red-950">
              <p className="text-lg font-bold">ATENÇÃO: FALTAM 10 MINUTOS</p>
              <p>A avaliação será encerrada automaticamente quando o tempo total chegar a zero. As respostas já salvas permanecerão registradas.</p>
            </div>
          )}
          {avisoInatividade && (
            <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
              <p className="text-lg font-bold">ATENÇÃO — INATIVIDADE DETECTADA</p>
              <p>Movimente o mouse ou pressione uma tecla. Ao completar 3 minutos sem atividade, a prova será bloqueada.</p>
            </div>
          )}
          {aviso && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Ocorrência:</strong> {aviso}</div>}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong>Passagem {passagem}</strong>
            <span>{respondidas} de {TOTAL_QUESTOES_UTIC} respondidas</span>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{tituloPosicao}</CardTitle>
              <CardDescription className="text-base font-medium text-slate-700">{questaoAtual.eixo}</CardDescription>
              <div className="pt-3 text-base leading-7 text-foreground whitespace-pre-line">{questaoAtual.enunciado}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              {opcoesAtuais.map((opcao, index) => (
                <label key={opcao.id} className="flex cursor-pointer items-start gap-3 rounded-md border bg-white p-4 hover:bg-slate-50">
                  <input
                    className="mt-1 h-4 w-4"
                    type="radio"
                    name={`q-${questaoAtual.id}`}
                    checked={respostas[questaoAtual.id] === opcao.id}
                    onChange={() => responder(questaoAtual.id, opcao.id)}
                  />
                  <span><strong>{String.fromCharCode(65 + index)}.</strong> {opcao.texto}</span>
                </label>
              ))}

              <div className={`rounded-md border p-4 ${tempoQuestaoRestante <= 10 ? "border-red-300 bg-red-50" : "bg-slate-50"}`}>
                <p className="text-xs uppercase text-muted-foreground">Tempo desta questão</p>
                <p className="font-mono text-3xl font-bold">{formatarTempo(tempoQuestaoRestante)}</p>
                <p className="text-xs text-muted-foreground">Ao zerar, a próxima questão será apresentada. Se estiver sem resposta, esta questão voltará somente depois da passagem pelas demais.</p>
              </div>

              <div className="flex justify-end">
                <Button disabled={!respostas[questaoAtual.id] || salvarRespostaMutation.isPending} onClick={() => avancarQuestao(false)}>
                  Salvar e avançar
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-[0_-4px_14px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">A resposta é salva no servidor no momento da marcação.</p>
            <Button variant="destructive" onClick={() => setMostrarConfirmacaoFinalizar(true)}>FINALIZAR AVALIAÇÃO</Button>
          </div>
        </footer>

        {mostrarConfirmacaoFinalizar && (
          <div className="fixed inset-0 z-[160] bg-black/80 p-4 grid place-items-center">
            <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-8 w-8 text-red-700 shrink-0" />
                <div>
                  <h2 className="text-xl font-bold">Tem certeza que deseja finalizar?</h2>
                  <p className="mt-3 text-sm leading-relaxed">Ao clicar em <strong>FINALIZAR DEFINITIVAMENTE</strong>, você não poderá continuar esta tentativa. As respostas já registradas serão mantidas.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMostrarConfirmacaoFinalizar(false)}>Continuar avaliação</Button>
                <Button variant="destructive" onClick={() => { setMostrarConfirmacaoFinalizar(false); void finalizar("MANUAL"); }}>FINALIZAR DEFINITIVAMENTE</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const podeRetomar = statusServidor === "LIBERADA";
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-blue-700" />Modo Prova Segura — Avaliação Técnica UTIC</h1>
          <p className="text-sm text-muted-foreground mt-2">Ambiente de produção para validação controlada da prova completa da UTIC.</p>
        </div>

        {podeRetomar && (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardHeader>
              <CardTitle>Continuidade liberada pelo administrador</CardTitle>
              <CardDescription>Você poderá continuar a mesma tentativa. As respostas já registradas serão preservadas.</CardDescription>
            </CardHeader>
            <CardContent><Button size="lg" onClick={() => abrirComunicado(true)}>RETOMAR AVALIAÇÃO LIBERADA</Button></CardContent>
          </Card>
        )}

        {!tentativaServidor && (
          <>
            <Card>
              <CardHeader><CardTitle>Requisitos da avaliação</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-4"><Video className="h-5 w-5 mb-2" /><strong>Computador com câmera</strong><p className="text-sm text-muted-foreground mt-1">A câmera deverá permanecer conectada, ligada e autorizada.</p></div>
                <div className="rounded-md border p-4"><Mic className="h-5 w-5 mb-2" /><strong>Microfone obrigatório</strong><p className="text-sm text-muted-foreground mt-1">O microfone deverá permanecer conectado, ligado e autorizado.</p></div>
                <div className="rounded-md border p-4"><MonitorUp className="h-5 w-5 mb-2" /><strong>Compartilhar Tela inteira</strong><p className="text-sm text-muted-foreground mt-1">Guia do Chrome ou Janela não serão aceitas. Quando o navegador permitir identificar múltiplos monitores, a prova bloqueará o início até permanecer somente uma tela ativa.</p></div>
                <div className="rounded-md border p-4"><Shuffle className="h-5 w-5 mb-2" /><strong>60 questões aleatórias</strong><p className="text-sm text-muted-foreground mt-1">Questões e alternativas são embaralhadas por tentativa; a ordem das alternativas é preservada quando uma questão retorna.</p></div>
              </CardContent>
            </Card>
            {erroInicio && <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800"><strong>Não foi possível iniciar:</strong> {erroInicio}</div>}
            <Button size="lg" onClick={() => abrirComunicado(false)}>Iniciar avaliação</Button>
          </>
        )}

        {(user.role === "admin" || user.role === "Administrador") && (bloqueadasQuery.data?.length ?? 0) > 0 && (
          <Card>
            <CardHeader><CardTitle>Administração — tentativas bloqueadas</CardTitle><CardDescription>Somente o administrador pode liberar a continuidade.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {bloqueadasQuery.data?.map((item: any) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div><p className="font-medium">{item.colaboradorNome || `Empregado ${item.colaboradorId}`}</p><p className="text-xs text-muted-foreground">Tentativa #{item.id} · {item.status} · {item.blockReason || "sem motivo informado"}</p></div>
                  {item.status === "BLOQUEADA" && <Button onClick={() => liberarMutation.mutate({ tentativaId: Number(item.id) })} disabled={liberarMutation.isPending}>Liberar continuidade</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {mostrarComunicado && (
        <div className="fixed inset-0 z-[100] bg-black/75 p-4 grid place-items-center">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-red-700 text-white p-6">
              <div className="flex items-center gap-3"><AlertTriangle className="h-9 w-9" /><div><p className="text-sm font-semibold uppercase tracking-wider">Comunicado obrigatório</p><h2 className="text-2xl font-bold">Leia todas as regras antes de iniciar a avaliação</h2></div></div>
            </div>
            <div className="p-6 space-y-5 text-sm leading-relaxed">
              <p className="text-base font-semibold">Ao prosseguir, você declara que está ciente das condições abaixo e concorda em realizar a prova em ambiente monitorado.</p>
              <div className="space-y-3">
                <p><strong>1. Equipamento:</strong> computador com câmera e microfone conectados, ligados e autorizados durante toda a avaliação.</p>
                <p><strong>2. Tela única:</strong> utilize somente a tela da prova. Se o navegador identificar mais de um monitor ativo, o início poderá ser bloqueado.</p>
                <p><strong>3. Compartilhamento:</strong> selecione exclusivamente <strong>TELA INTEIRA</strong>. Guia do Chrome ou Janela não serão aceitas.</p>
                <p><strong>4. Tempo:</strong> cada questão terá até 2 minutos e o tempo total máximo será de 3 horas. Questões sem resposta voltarão em nova passagem dentro do tempo restante.</p>
                <p><strong>5. Inatividade:</strong> após 2 minutos e 30 segundos sem atividade será exibido um aviso. Ao completar 3 minutos, a avaliação será bloqueada.</p>
                <p><strong>6. Interrupção:</strong> fechar a aba, sair da tela cheia, trocar de aba/janela ou interromper o compartilhamento gera ocorrência. Ao atingir o limite de segurança, a tentativa será bloqueada para análise administrativa.</p>
                <p><strong>7. Conteúdo protegido:</strong> é proibido selecionar, copiar, colar, imprimir, salvar, fotografar, capturar ou reproduzir questões e alternativas. O navegador pode registrar parte dessas tentativas; capturas realizadas fora das capacidades do navegador não podem ser garantidamente detectadas.</p>
                <p><strong>8. Finalização:</strong> a avaliação pode ser finalizada voluntariamente, mas essa decisão encerra a tentativa e impede continuidade sem uma nova decisão administrativa.</p>
              </div>
              <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input className="mt-1 h-5 w-5" type="checkbox" checked={aceiteComunicado} onChange={(event) => setAceiteComunicado(event.target.checked)} />
                  <span className="font-semibold text-red-900">LI, COMPREENDI E CONCORDO COM AS REGRAS DE MONITORAMENTO E REALIZAÇÃO DA AVALIAÇÃO.</span>
                </label>
              </div>
              <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setMostrarComunicado(false)}>Cancelar</Button><Button disabled={!aceiteComunicado} onClick={() => void concluirComunicado()}>Continuar</Button></div>
            </div>
          </div>
        </div>
      )}

      {mostrarAvisoTela && (
        <div className="fixed inset-0 z-[120] bg-black/80 p-4 grid place-items-center">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3"><MonitorUp className="h-9 w-9 text-blue-700 shrink-0" /><div><h2 className="text-xl font-bold">Selecione obrigatoriamente TELA INTEIRA</h2><p className="mt-2 text-sm leading-relaxed">Na janela do navegador que será aberta, clique em <strong>Tela inteira</strong>. Não selecione Guia do Chrome nem Janela. Depois da validação, a página entrará em modo tela cheia.</p></div></div>
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"><strong>Importante:</strong> se você utiliza mais de um monitor, mantenha apenas o monitor desta avaliação ativo. Quando tecnicamente identificável pelo navegador, múltiplas telas impedirão o início.</div>
            <label className="mt-5 flex items-start gap-3 cursor-pointer rounded-md border p-4"><input className="mt-1 h-5 w-5" type="checkbox" checked={aceiteTela} onChange={(event) => setAceiteTela(event.target.checked)} /><span className="font-semibold">Estou utilizando somente a tela necessária para a avaliação e vou selecionar TELA INTEIRA.</span></label>
            <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => { setMostrarAvisoTela(false); pararMonitoramento(); }}>Cancelar</Button><Button disabled={!aceiteTela} onClick={() => void abrirSeletorTela()}>Compartilhar Tela inteira e iniciar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

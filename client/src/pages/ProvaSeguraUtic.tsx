import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, Clock3, Mic, MonitorUp, ShieldCheck, Shuffle, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DURACAO_TOTAL_SEGUNDOS = 3 * 60 * 60;
const DURACAO_QUESTAO_SEGUNDOS = 2 * 60;
const LIMITE_VIOLACOES = 3;
const STORAGE_KEY = "piloto-utic-prova-segura-v4";

type Fase = "preparacao" | "em_prova" | "finalizada" | "anulada";
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
  const [fase, setFase] = useState<Fase>("preparacao");
  const [mostrarComunicado, setMostrarComunicado] = useState(false);
  const [mostrarAvisoTela, setMostrarAvisoTela] = useState(false);
  const [aceiteComunicado, setAceiteComunicado] = useState(false);
  const [aceiteTela, setAceiteTela] = useState(false);
  const [tempoTotalRestante, setTempoTotalRestante] = useState(DURACAO_TOTAL_SEGUNDOS);
  const [tempoQuestaoRestante, setTempoQuestaoRestante] = useState(DURACAO_QUESTAO_SEGUNDOS);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [violacoes, setViolacoes] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamTelaRef = useRef<MediaStream | null>(null);
  const streamCameraMicRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const questaoAtualId = fila[indiceAtual];
  const questaoAtual = useMemo(() => QUESTOES_DEMO.find((q) => q.id === questaoAtualId) ?? null, [questaoAtualId]);

  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => { if (!loading && !user) window.location.href = "/login"; }, [loading, user]);

  const persistir = (parcial: Partial<EstadoSalvo> = {}) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas, eventos, violacoes, ordemQuestoes, ordemOpcoes, fila, indiceAtual, passagem, exibicoes, ...parcial }));
  };

  const registrarEvento = (tipo: string, detalhe: string) => {
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

  const finalizar = (motivo: "manual" | "tempo" | "concluida") => {
    if (faseRef.current !== "em_prova") return;
    faseRef.current = "finalizada";
    setFase("finalizada");
    registrarEvento("finalizacao", motivo === "tempo" ? "Tempo total encerrado; teste finalizado automaticamente." : motivo === "concluida" ? "Todas as questões foram respondidas; teste finalizado." : "Teste finalizado pelo usuário.");
    pararMonitoramento();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  };

  const registrarViolacao = (tipo: "troca_aba" | "saida_tela_cheia" | "interrupcao_compartilhamento") => {
    if (faseRef.current !== "em_prova") return;
    setViolacoes((atual) => {
      const novo = atual + 1;
      const detalhe = tipo === "troca_aba" ? "A página da prova perdeu visibilidade." : tipo === "saida_tela_cheia" ? "O modo tela cheia foi encerrado." : "O compartilhamento da tela foi interrompido.";
      setEventos((lista) => {
        const proxima = [{ data: new Date().toISOString(), tipo, detalhe }, ...lista].slice(0, 100);
        persistir({ eventos: proxima, violacoes: novo });
        return proxima;
      });
      setAviso(`${detalhe} Ocorrência ${novo} de ${LIMITE_VIOLACOES}.`);
      if (novo >= LIMITE_VIOLACOES) {
        faseRef.current = "anulada";
        setFase("anulada");
        pararMonitoramento();
      }
      return novo;
    });
  };

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) registrarViolacao("troca_aba"); };
    const onFullscreen = () => { if (!document.fullscreenElement) registrarViolacao("saida_tela_cheia"); };
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (faseRef.current === "em_prova") { event.preventDefault(); event.returnValue = ""; } };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onBeforeUnload);
      pararMonitoramento();
    };
  }, []);

  useEffect(() => {
    if (fase !== "em_prova") return;
    const bloquear = (event: Event) => { event.preventDefault(); registrarEvento("tentativa_conteudo_protegido", "Tentativa de copiar, selecionar, colar, imprimir ou reproduzir conteúdo bloqueada."); setAviso("Ação não permitida. Esta avaliação possui conteúdo protegido. A ocorrência foi registrada."); };
    const bloquearTeclas = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "x", "v", "p", "s", "u"].includes(tecla)) bloquear(event);
      if (event.key === "PrintScreen") { registrarEvento("tentativa_print_screen", "Tecla Print Screen detectada."); setAviso("Tentativa de captura registrada."); }
    };
    document.addEventListener("selectstart", bloquear);
    document.addEventListener("contextmenu", bloquear);
    document.addEventListener("copy", bloquear);
    document.addEventListener("cut", bloquear);
    document.addEventListener("paste", bloquear);
    document.addEventListener("dragstart", bloquear);
    document.addEventListener("keydown", bloquearTeclas);
    window.addEventListener("beforeprint", bloquear);
    return () => {
      document.removeEventListener("selectstart", bloquear);
      document.removeEventListener("contextmenu", bloquear);
      document.removeEventListener("copy", bloquear);
      document.removeEventListener("cut", bloquear);
      document.removeEventListener("paste", bloquear);
      document.removeEventListener("dragstart", bloquear);
      document.removeEventListener("keydown", bloquearTeclas);
      window.removeEventListener("beforeprint", bloquear);
    };
  }, [fase]);

  const avancarQuestao = (porTempo = false) => {
    if (!questaoAtual) return;
    const novasExibicoes = { ...exibicoes, [questaoAtual.id]: (exibicoes[questaoAtual.id] ?? 0) + 1 };
    setExibicoes(novasExibicoes);
    if (porTempo) registrarEvento("tempo_questao_esgotado", `Tempo de 2 minutos encerrado para a questão ${questaoAtual.id}.`);
    if (indiceAtual < fila.length - 1) {
      const proximoIndice = indiceAtual + 1;
      setIndiceAtual(proximoIndice);
      setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
      persistir({ indiceAtual: proximoIndice, exibicoes: novasExibicoes });
      return;
    }
    const pendentes = ordemQuestoes.filter((id) => !respostas[id]);
    if (pendentes.length === 0) return finalizar("concluida");
    const novaPassagem = passagem + 1;
    setFila(pendentes);
    setIndiceAtual(0);
    setPassagem(novaPassagem);
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    registrarEvento("retomada_pendentes", `Iniciada a passagem ${novaPassagem} com ${pendentes.length} questão(ões) pendente(s).`);
  };

  useEffect(() => {
    if (fase !== "em_prova") return;
    const totalTimer = window.setInterval(() => setTempoTotalRestante((atual) => { if (atual <= 1) { window.clearInterval(totalTimer); window.setTimeout(() => finalizar("tempo"), 0); return 0; } return atual - 1; }), 1000);
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

  const prepararTentativa = () => {
    const ordem = embaralhar(QUESTOES_DEMO.map((q) => q.id));
    const opcoes: Record<number, string[]> = {};
    QUESTOES_DEMO.forEach((q) => { opcoes[q.id] = embaralhar(q.opcoes); });
    localStorage.removeItem(STORAGE_KEY);
    setRespostas({}); setEventos([]); setViolacoes(0); setOrdemQuestoes(ordem); setOrdemOpcoes(opcoes); setFila(ordem); setIndiceAtual(0); setPassagem(1); setExibicoes({});
    setTempoTotalRestante(DURACAO_TOTAL_SEGUNDOS); setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    faseRef.current = "em_prova";
    setFase("em_prova");
    setTimeout(() => registrarEvento("inicio", "Avaliação iniciada após aceite das regras, validação de câmera/microfone e compartilhamento da tela inteira."), 0);
  };

  const abrirComunicado = () => {
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
      prepararTentativa();
    } catch (error) {
      pararMonitoramento();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      setErroInicio(error instanceof Error ? error.message : "Não foi possível validar o compartilhamento da tela.");
    }
  };

  const responder = (questaoId: number, resposta: string) => {
    setRespostas((atual) => { const proximo = { ...atual, [questaoId]: resposta }; persistir({ respostas: proximo }); return proximo; });
  };

  const reiniciar = () => {
    pararMonitoramento();
    localStorage.removeItem(STORAGE_KEY);
    setRespostas({}); setEventos([]); setViolacoes(0); setOrdemQuestoes([]); setOrdemOpcoes({}); setFila([]); setIndiceAtual(0); setPassagem(1); setExibicoes({});
    setTempoTotalRestante(DURACAO_TOTAL_SEGUNDOS); setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS); setAceiteComunicado(false); setAceiteTela(false); setMostrarComunicado(false); setMostrarAvisoTela(false); setAviso(null); setErroInicio(null);
    faseRef.current = "preparacao";
    setFase("preparacao");
  };

  if (loading || !user) return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Verificando acesso...</div>;

  if (fase === "anulada") return <div className="min-h-screen bg-slate-950 p-6 grid place-items-center"><Card className="max-w-xl w-full border-red-300"><CardHeader><CardTitle className="text-red-700">Teste encerrado por segurança</CardTitle><CardDescription>O limite de {LIMITE_VIOLACOES} ocorrências foi atingido.</CardDescription></CardHeader><CardContent><Button onClick={reiniciar}>Voltar ao início</Button></CardContent></Card></div>;

  if (fase === "finalizada") return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl space-y-6"><Card className="border-emerald-200"><CardHeader><div className="flex items-center gap-3"><CheckCircle2 className="h-7 w-7 text-emerald-600" /><div><CardTitle>Teste concluído</CardTitle><CardDescription>Esta etapa valida o motor da prova segura.</CardDescription></div></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><div className="rounded-md border p-4">Respostas: <strong>{Object.keys(respostas).length}/{QUESTOES_DEMO.length}</strong></div><div className="rounded-md border p-4">Ocorrências: <strong>{violacoes}</strong></div><div className="rounded-md border p-4">Passagens: <strong>{passagem}</strong></div></CardContent></Card><Button onClick={reiniciar}>Testar novamente</Button></div></div>;

  if (fase === "em_prova" && questaoAtual) {
    const opcoesAtuais = ordemOpcoes[questaoAtual.id] ?? questaoAtual.opcoes;
    return <div className="prova-protegida min-h-screen bg-slate-100"><style>{`.prova-protegida,.prova-protegida *{-webkit-user-select:none!important;user-select:none!important}@media print{body *{visibility:hidden!important}}`}</style><header className="sticky top-0 z-40 border-b bg-white px-5 py-3"><div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Avaliação Técnica UTIC — Modo Prova Segura</p><p className="text-xs text-muted-foreground">Questões demonstrativas.</p></div><div className="flex gap-2"><Badge variant={cameraMicAtivos ? "default" : "destructive"}><Video className="mr-1 h-3 w-3" />Câmera/Mic {cameraMicAtivos ? "ativos" : "inativos"}</Badge><Badge variant={gravacaoAtiva ? "default" : "destructive"}><MonitorUp className="mr-1 h-3 w-3" />{gravacaoAtiva ? "Tela compartilhada" : "Sem tela"}</Badge><Badge variant={violacoes ? "destructive" : "secondary"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge><div className="rounded-md bg-slate-950 px-4 py-2 font-mono text-white">Total {formatarTempo(tempoTotalRestante)}</div></div></div></header><main className="mx-auto max-w-4xl p-5 pb-28 space-y-4">{aviso && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Ocorrência registrada:</strong> {aviso}</div>}<div className="text-sm"><strong>Passagem {passagem}</strong> · {Object.keys(respostas).length} de {QUESTOES_DEMO.length} respondidas</div><Card><CardHeader><CardTitle>Questão {indiceAtual + 1} de {fila.length}</CardTitle><CardDescription className="text-base text-foreground">{questaoAtual.enunciado}</CardDescription></CardHeader><CardContent className="space-y-4">{opcoesAtuais.map((opcao, index) => <label key={opcao} className="flex items-center gap-3 rounded-md border p-3"><input type="radio" name={`q-${questaoAtual.id}`} checked={respostas[questaoAtual.id] === opcao} onChange={() => responder(questaoAtual.id, opcao)} /><span><strong>{String.fromCharCode(65 + index)}.</strong> {opcao}</span></label>)}<div className={`rounded-md border p-4 ${tempoQuestaoRestante <= 10 ? "border-red-300 bg-red-50" : "bg-slate-50"}`}><p className="text-xs uppercase text-muted-foreground">Tempo desta questão</p><p className="font-mono text-3xl font-bold">{formatarTempo(tempoQuestaoRestante)}</p><p className="text-xs text-muted-foreground">Ao zerar, a próxima questão será apresentada. Se não houver resposta, esta questão voltará depois.</p></div><div className="flex justify-end"><Button disabled={!respostas[questaoAtual.id]} onClick={() => avancarQuestao(false)}>Salvar e avançar</Button></div></CardContent></Card></main></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div><h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-blue-700" />Modo Prova Segura — Piloto UTIC</h1><p className="text-sm text-muted-foreground mt-2">Teste do ambiente seguro antes de carregar as 60 questões oficiais.</p></div>
        <Card><CardHeader><CardTitle>Requisitos básicos</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="rounded-md border p-4"><Video className="h-5 w-5 mb-2" /><strong>Computador com câmera</strong><p className="text-sm text-muted-foreground mt-1">A câmera deverá estar conectada, ligada e autorizada durante toda a prova.</p></div><div className="rounded-md border p-4"><Mic className="h-5 w-5 mb-2" /><strong>Microfone obrigatório</strong><p className="text-sm text-muted-foreground mt-1">O microfone deverá estar conectado, ligado e autorizado durante toda a prova.</p></div><div className="rounded-md border p-4"><MonitorUp className="h-5 w-5 mb-2" /><strong>Compartilhar Tela inteira</strong><p className="text-sm text-muted-foreground mt-1">Guia do Chrome ou Janela não serão aceitas.</p></div><div className="rounded-md border p-4"><Shuffle className="h-5 w-5 mb-2" /><strong>Questões aleatórias</strong><p className="text-sm text-muted-foreground mt-1">Questões e alternativas são embaralhadas por tentativa.</p></div></CardContent></Card>
        {erroInicio && <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800"><strong>Não foi possível iniciar:</strong> {erroInicio}</div>}
        <Button size="lg" onClick={abrirComunicado}>Iniciar avaliação</Button>
      </div>

      {mostrarComunicado && <div className="fixed inset-0 z-[100] bg-black/75 p-4 grid place-items-center"><div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="sticky top-0 bg-red-700 text-white p-6"><div className="flex items-center gap-3"><AlertTriangle className="h-9 w-9" /><div><p className="text-sm font-semibold uppercase tracking-wider">Comunicado obrigatório</p><h2 className="text-2xl font-bold">Leia todas as regras antes de iniciar a avaliação</h2></div></div></div><div className="p-6 space-y-5 text-sm leading-relaxed"><p className="text-base font-semibold">Ao prosseguir, você declara que está ciente das condições abaixo e concorda em realizar a prova em ambiente monitorado.</p><div className="space-y-3"><p><strong>1. Equipamento:</strong> utilize um computador com <strong>câmera e microfone conectados, ligados e autorizados</strong>. Ambos devem permanecer ativos durante toda a avaliação.</p><p><strong>2. Tela única:</strong> se você trabalha com mais de um monitor, mantenha apenas a tela usada na prova ativa.</p><p><strong>3. Fechamento:</strong> feche abas, janelas, aplicativos e documentos que não sejam necessários antes de iniciar.</p><p><strong>4. Compartilhamento:</strong> quando o navegador solicitar, selecione exclusivamente <strong>TELA INTEIRA</strong>. Guia do Chrome ou Janela não serão aceitas.</p><p><strong>5. Tela cheia:</strong> troca de aba, saída da tela cheia, perda de foco ou interrupção do compartilhamento poderão ser registradas.</p><p><strong>6. Conteúdo protegido:</strong> é proibido selecionar, copiar, colar, imprimir, salvar, fotografar, capturar ou reproduzir questões e alternativas.</p><p><strong>7. Tempo:</strong> cada questão terá <strong>2 minutos</strong>; o tempo total máximo será de <strong>3 horas</strong>.</p><p><strong>8. Ordem:</strong> questões e alternativas são aleatórias.</p><p><strong>9. Monitoramento:</strong> ocorrências de segurança ficam registradas e, se confirmada violação, a avaliação poderá ser anulada.</p></div><div className="rounded-lg border-2 border-red-300 bg-red-50 p-4"><label className="flex items-start gap-3 cursor-pointer"><input className="mt-1 h-5 w-5" type="checkbox" checked={aceiteComunicado} onChange={(e) => setAceiteComunicado(e.target.checked)} /><span className="font-semibold text-red-900">LI TODAS AS REGRAS, ESTOU CIENTE DAS CONDIÇÕES DE REALIZAÇÃO E MONITORAMENTO DA AVALIAÇÃO E CONCORDO EM PROSSEGUIR.</span></label></div><div className="flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={() => setMostrarComunicado(false)}>Cancelar</Button><Button disabled={!aceiteComunicado} className="bg-red-700 hover:bg-red-800" onClick={concluirComunicado}>ACEITO E ESTOU CIENTE — PROSSEGUIR</Button></div></div></div></div>}

      {mostrarAvisoTela && <div className="fixed inset-0 z-[120] bg-black/85 p-4 grid place-items-center"><div className="w-full max-w-2xl rounded-2xl border-4 border-amber-400 bg-white shadow-2xl"><div className="bg-amber-400 px-6 py-5 text-slate-950"><div className="flex items-center gap-3"><MonitorUp className="h-10 w-10" /><div><p className="text-sm font-black uppercase tracking-widest">Atenção antes de compartilhar</p><h2 className="text-3xl font-black">USE SOMENTE TELA INTEIRA</h2></div></div></div><div className="p-7 space-y-5"><div className="rounded-xl border-2 border-red-300 bg-red-50 p-5 text-red-950"><p className="text-xl font-black">ANTES DE CLICAR EM “ESCOLHER TELA”:</p><div className="mt-4 space-y-3 text-base font-semibold"><p>1. Feche todas as outras abas do navegador que não serão utilizadas.</p><p>2. Feche outras janelas, aplicativos, documentos, mensagens e sistemas abertos.</p><p>3. Se utiliza dois ou mais monitores, mantenha somente a tela da prova ativa.</p><p>4. Na janela do Chrome que abrirá em seguida, clique na opção <strong>TELA INTEIRA</strong>.</p><p>5. NÃO escolha <strong>Guia do Chrome</strong> e NÃO escolha <strong>Janela</strong>.</p></div></div><p className="text-sm text-slate-700">Se o sistema identificar que foi compartilhada apenas uma guia ou uma janela, a avaliação não será iniciada. Saídas da prova e interrupções de compartilhamento poderão ser registradas.</p><label className="flex items-start gap-3 rounded-xl border-2 border-slate-300 p-4 cursor-pointer"><input className="mt-1 h-5 w-5" type="checkbox" checked={aceiteTela} onChange={(e) => setAceiteTela(e.target.checked)} /><span className="font-bold">Já fechei as abas, janelas e aplicativos desnecessários, estou usando apenas a tela destinada à prova e estou ciente de que devo selecionar TELA INTEIRA.</span></label><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { pararMonitoramento(); setMostrarAvisoTela(false); }}>Cancelar</Button><Button disabled={!aceiteTela} size="lg" className="bg-amber-500 text-slate-950 hover:bg-amber-600 font-black" onClick={abrirSeletorTela}>ESTOU PRONTO — ESCOLHER TELA INTEIRA</Button></div></div></div></div>}
    </div>
  );
}

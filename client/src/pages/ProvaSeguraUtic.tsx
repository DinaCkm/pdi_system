import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, MonitorUp, ShieldCheck, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DURACAO_TOTAL_SEGUNDOS = 3 * 60 * 60;
const DURACAO_QUESTAO_SEGUNDOS = 2 * 60;
const LIMITE_VIOLACOES = 3;
const STORAGE_KEY = "piloto-utic-prova-segura-v2";

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

function estadoInicialVazio(): EstadoSalvo {
  return { respostas: {}, eventos: [], violacoes: 0, ordemQuestoes: [], ordemOpcoes: {}, fila: [], indiceAtual: 0, passagem: 1, exibicoes: {} };
}

export default function ProvaSeguraUtic() {
  const { loading, user } = useAuth();
  const [fase, setFase] = useState<Fase>("preparacao");
  const [aceite, setAceite] = useState(false);
  const [gravarTela, setGravarTela] = useState(true);
  const [tempoTotalRestante, setTempoTotalRestante] = useState(DURACAO_TOTAL_SEGUNDOS);
  const [tempoQuestaoRestante, setTempoQuestaoRestante] = useState(DURACAO_QUESTAO_SEGUNDOS);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [violacoes, setViolacoes] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gravacaoAtiva, setGravacaoAtiva] = useState(false);
  const [gravacaoUrl, setGravacaoUrl] = useState<string | null>(null);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const [ordemQuestoes, setOrdemQuestoes] = useState<number[]>([]);
  const [ordemOpcoes, setOrdemOpcoes] = useState<Record<number, string[]>>({});
  const [fila, setFila] = useState<number[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [passagem, setPassagem] = useState(1);
  const [exibicoes, setExibicoes] = useState<Record<number, number>>({});

  const faseRef = useRef<Fase>("preparacao");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const questaoAtualId = fila[indiceAtual];
  const questaoAtual = useMemo(() => QUESTOES_DEMO.find((q) => q.id === questaoAtualId) ?? null, [questaoAtualId]);

  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => { if (!loading && !user) window.location.href = "/login"; }, [loading, user]);

  const persistir = (parcial: Partial<EstadoSalvo> = {}) => {
    const estado: EstadoSalvo = {
      respostas, eventos, violacoes, ordemQuestoes, ordemOpcoes, fila, indiceAtual, passagem, exibicoes,
      ...parcial,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  };

  const registrarEvento = (tipo: string, detalhe: string) => {
    setEventos((atual) => {
      const proximo = [{ data: new Date().toISOString(), tipo, detalhe }, ...atual].slice(0, 100);
      persistir({ eventos: proximo });
      return proximo;
    });
  };

  const registrarTentativaProtegida = (tipo: string, detalhe: string) => {
    if (faseRef.current !== "em_prova") return;
    registrarEvento(tipo, detalhe);
    setAviso("Ação não permitida. Esta avaliação possui conteúdo protegido. A ocorrência foi registrada.");
  };

  const pararGravacao = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setGravacaoAtiva(false);
  };

  const finalizar = (motivo: "manual" | "tempo" | "concluida") => {
    if (faseRef.current !== "em_prova") return;
    faseRef.current = "finalizada";
    setFase("finalizada");
    registrarEvento("finalizacao", motivo === "tempo" ? "Tempo total encerrado; teste finalizado automaticamente." : motivo === "concluida" ? "Todas as questões foram respondidas; teste finalizado." : "Teste finalizado pelo usuário.");
    pararGravacao();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  };

  const registrarViolacao = (tipo: "troca_aba" | "saida_tela_cheia") => {
    if (faseRef.current !== "em_prova") return;
    setViolacoes((atual) => {
      const novo = atual + 1;
      const detalhe = tipo === "troca_aba" ? "A página da prova perdeu visibilidade." : "O modo tela cheia foi encerrado.";
      setEventos((lista) => {
        const proxima = [{ data: new Date().toISOString(), tipo, detalhe }, ...lista].slice(0, 100);
        persistir({ eventos: proxima, violacoes: novo });
        return proxima;
      });
      setAviso(`${detalhe} Ocorrência ${novo} de ${LIMITE_VIOLACOES}.`);
      if (novo >= LIMITE_VIOLACOES) {
        faseRef.current = "anulada";
        setFase("anulada");
        pararGravacao();
      }
      return novo;
    });
  };

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) registrarViolacao("troca_aba"); };
    const onFullscreen = () => { if (!document.fullscreenElement) registrarViolacao("saida_tela_cheia"); };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (faseRef.current === "em_prova") { event.preventDefault(); event.returnValue = ""; }
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onBeforeUnload);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (gravacaoUrl) URL.revokeObjectURL(gravacaoUrl);
    };
  }, [gravacaoUrl]);

  useEffect(() => {
    if (fase !== "em_prova") return;
    const bloquearSelecao = (event: Event) => { event.preventDefault(); registrarTentativaProtegida("tentativa_selecao", "Tentativa de selecionar conteúdo da avaliação bloqueada."); };
    const bloquearContexto = (event: MouseEvent) => { event.preventDefault(); registrarTentativaProtegida("tentativa_menu_contexto", "Tentativa de abrir o menu de contexto bloqueada."); };
    const bloquearCopia = (event: ClipboardEvent) => { event.preventDefault(); registrarTentativaProtegida("tentativa_copia", "Tentativa de copiar ou recortar conteúdo da avaliação bloqueada."); };
    const bloquearColagem = (event: ClipboardEvent) => { event.preventDefault(); registrarTentativaProtegida("tentativa_colagem", "Tentativa de colar conteúdo durante a avaliação bloqueada."); };
    const bloquearArraste = (event: DragEvent) => { event.preventDefault(); registrarTentativaProtegida("tentativa_arraste", "Tentativa de arrastar conteúdo da avaliação bloqueada."); };
    const bloquearAtalhos = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();
      const comModificador = event.ctrlKey || event.metaKey;
      if (comModificador && ["c", "x", "v", "p", "s", "u"].includes(tecla)) {
        event.preventDefault();
        registrarTentativaProtegida("tentativa_atalho_protegido", `Atalho protegido (${event.ctrlKey ? "Ctrl" : "Command"}+${event.key.toUpperCase()}) bloqueado.`);
      } else if (event.key === "PrintScreen") {
        registrarTentativaProtegida("tentativa_print_screen", "Tecla Print Screen detectada; ocorrência registrada.");
      }
    };
    const registrarImpressao = () => registrarTentativaProtegida("tentativa_impressao", "Tentativa de imprimir detectada; conteúdo protegido.");
    document.addEventListener("selectstart", bloquearSelecao);
    document.addEventListener("contextmenu", bloquearContexto);
    document.addEventListener("copy", bloquearCopia);
    document.addEventListener("cut", bloquearCopia);
    document.addEventListener("paste", bloquearColagem);
    document.addEventListener("dragstart", bloquearArraste);
    document.addEventListener("keydown", bloquearAtalhos);
    window.addEventListener("beforeprint", registrarImpressao);
    return () => {
      document.removeEventListener("selectstart", bloquearSelecao);
      document.removeEventListener("contextmenu", bloquearContexto);
      document.removeEventListener("copy", bloquearCopia);
      document.removeEventListener("cut", bloquearCopia);
      document.removeEventListener("paste", bloquearColagem);
      document.removeEventListener("dragstart", bloquearArraste);
      document.removeEventListener("keydown", bloquearAtalhos);
      window.removeEventListener("beforeprint", registrarImpressao);
    };
  }, [fase, respostas, eventos, violacoes, fila, indiceAtual, passagem, exibicoes, ordemQuestoes, ordemOpcoes]);

  const avancarQuestao = (porTempo = false) => {
    if (!questaoAtual) return;
    const respondeu = Boolean(respostas[questaoAtual.id]);
    const novasExibicoes = { ...exibicoes, [questaoAtual.id]: (exibicoes[questaoAtual.id] ?? 0) + 1 };
    setExibicoes(novasExibicoes);

    if (porTempo) registrarEvento("tempo_questao_esgotado", `Tempo de 2 minutos encerrado para a questão ${questaoAtual.id}${respondeu ? "; resposta já estava salva." : "; questão permanecerá pendente."}`);

    if (indiceAtual < fila.length - 1) {
      const proximoIndice = indiceAtual + 1;
      setIndiceAtual(proximoIndice);
      setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
      persistir({ indiceAtual: proximoIndice, exibicoes: novasExibicoes });
      return;
    }

    const pendentes = ordemQuestoes.filter((id) => !respostas[id]);
    if (pendentes.length === 0) {
      finalizar("concluida");
      return;
    }

    const novaFila = pendentes;
    const novaPassagem = passagem + 1;
    setFila(novaFila);
    setIndiceAtual(0);
    setPassagem(novaPassagem);
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    registrarEvento("retomada_pendentes", `Iniciada a passagem ${novaPassagem} com ${novaFila.length} questão(ões) pendente(s).`);
    persistir({ fila: novaFila, indiceAtual: 0, passagem: novaPassagem, exibicoes: novasExibicoes });
  };

  useEffect(() => {
    if (fase !== "em_prova") return;
    const timer = window.setInterval(() => {
      setTempoTotalRestante((atual) => {
        if (atual <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => finalizar("tempo"), 0);
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
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
  }, [fase, questaoAtualId, indiceAtual, fila, respostas]);

  const iniciarGravacaoTela = async () => {
    if (!gravarTela) return true;
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setErroGravacao("Este navegador não oferece suporte à gravação de tela usada neste piloto.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setGravacaoUrl((anterior) => { if (anterior) URL.revokeObjectURL(anterior); return URL.createObjectURL(blob); });
      };
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (faseRef.current === "em_prova") registrarViolacao("saida_tela_cheia");
        setGravacaoAtiva(false);
      });
      recorder.start(1000);
      setGravacaoAtiva(true);
      registrarEvento("gravacao_iniciada", "Compartilhamento e gravação da tela autorizados no navegador.");
      return true;
    } catch {
      setErroGravacao("A gravação de tela não foi autorizada. Para testar este recurso, permita o compartilhamento da tela.");
      return false;
    }
  };

  const iniciar = async () => {
    setErroGravacao(null);
    setAviso(null);
    if (!aceite) return;
    try { await document.documentElement.requestFullscreen(); }
    catch { setAviso("Não foi possível ativar a tela cheia. Tente novamente e autorize o modo tela cheia."); return; }

    const gravacaoOk = await iniciarGravacaoTela();
    if (!gravacaoOk && gravarTela) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      return;
    }

    const ordem = embaralhar(QUESTOES_DEMO.map((q) => q.id));
    const opcoes: Record<number, string[]> = {};
    QUESTOES_DEMO.forEach((q) => { opcoes[q.id] = embaralhar(q.opcoes); });

    const limpo = estadoInicialVazio();
    limpo.ordemQuestoes = ordem;
    limpo.fila = ordem;
    limpo.ordemOpcoes = opcoes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limpo));
    setRespostas({});
    setEventos([]);
    setViolacoes(0);
    setOrdemQuestoes(ordem);
    setOrdemOpcoes(opcoes);
    setFila(ordem);
    setIndiceAtual(0);
    setPassagem(1);
    setExibicoes({});
    setTempoTotalRestante(DURACAO_TOTAL_SEGUNDOS);
    setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    faseRef.current = "em_prova";
    setFase("em_prova");
    setTimeout(() => registrarEvento("inicio", "Piloto iniciado com ordem aleatória de questões e alternativas, 2 minutos por questão e limite total de 3 horas."), 0);
  };

  const responder = (questaoId: number, resposta: string) => {
    setRespostas((atual) => {
      const proximo = { ...atual, [questaoId]: resposta };
      persistir({ respostas: proximo });
      return proximo;
    });
  };

  const reiniciar = () => {
    pararGravacao();
    localStorage.removeItem(STORAGE_KEY);
    setRespostas({}); setEventos([]); setViolacoes(0); setOrdemQuestoes([]); setOrdemOpcoes({}); setFila([]); setIndiceAtual(0); setPassagem(1); setExibicoes({});
    setTempoTotalRestante(DURACAO_TOTAL_SEGUNDOS); setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);
    setAceite(false); setAviso(null); setErroGravacao(null); setGravacaoUrl(null);
    faseRef.current = "preparacao"; setFase("preparacao");
  };

  if (loading || !user) return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Verificando acesso...</div>;

  if (fase === "anulada") return (
    <div className="min-h-screen bg-slate-950 p-6 grid place-items-center">
      <Card className="max-w-xl w-full border-red-300"><CardHeader><CardTitle className="text-red-700">Teste encerrado por segurança</CardTitle><CardDescription>O limite de {LIMITE_VIOLACOES} ocorrências foi atingido.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm">O piloto registrou as saídas da tela segura. Na aplicação oficial, a ocorrência poderá ser encaminhada para confirmação administrativa.</p><Button onClick={reiniciar}>Voltar ao início do piloto</Button></CardContent></Card>
    </div>
  );

  if (fase === "finalizada") return (
    <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-emerald-200"><CardHeader><div className="flex items-center gap-3"><CheckCircle2 className="h-7 w-7 text-emerald-600" /><div><CardTitle>Teste do Modo Prova Segura concluído</CardTitle><CardDescription>Esta etapa valida o motor da prova, não o conteúdo técnico da UTIC.</CardDescription></div></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Respostas salvas</p><p className="text-2xl font-semibold">{Object.keys(respostas).length}/{QUESTOES_DEMO.length}</p></div><div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Ocorrências</p><p className="text-2xl font-semibold">{violacoes}</p></div><div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Passagens realizadas</p><p className="text-2xl font-semibold">{passagem}</p></div></CardContent></Card>
      {gravacaoUrl && <Card><CardHeader><CardTitle>Prévia da gravação desta sessão</CardTitle></CardHeader><CardContent><video className="w-full rounded-md border bg-black" controls src={gravacaoUrl} /></CardContent></Card>}
      <Card><CardHeader><CardTitle>Auditoria do piloto</CardTitle></CardHeader><CardContent className="space-y-2">{eventos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : eventos.map((evento, indice) => <div key={`${evento.data}-${indice}`} className="rounded-md border p-3 text-sm"><p className="font-medium">{evento.tipo}</p><p className="text-muted-foreground">{evento.detalhe}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(evento.data).toLocaleString("pt-BR")}</p></div>)}</CardContent></Card>
      <div className="flex gap-3"><Button onClick={reiniciar}>Testar novamente</Button><Button variant="outline" onClick={() => window.location.href = "/avaliacoes"}>Voltar para Avaliações</Button></div>
    </div></div>
  );

  if (fase === "em_prova" && questaoAtual) {
    const opcoesAtuais = ordemOpcoes[questaoAtual.id] ?? questaoAtual.opcoes;
    const respondidaAtual = Boolean(respostas[questaoAtual.id]);
    const progresso = ordemQuestoes.length > 0 ? Math.round((Object.keys(respostas).length / ordemQuestoes.length) * 100) : 0;
    return (
      <div className="prova-protegida min-h-screen bg-slate-100">
        <style>{`.prova-protegida,.prova-protegida *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}@media print{body *{visibility:hidden!important}body::before{content:"Conteúdo protegido. A impressão desta avaliação não é permitida.";visibility:visible!important;position:fixed;inset:0;display:grid;place-items:center;font:600 20px/1.4 sans-serif;padding:40px;text-align:center;background:white;color:black}}`}</style>
        <header className="sticky top-0 z-40 border-b bg-white px-5 py-3 shadow-sm"><div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Avaliação Técnica UTIC — Teste do Modo Prova Segura</p><p className="text-xs text-muted-foreground">Questões demonstrativas; conteúdo oficial ainda não carregado.</p></div><div className="flex items-center gap-3"><Badge variant={gravacaoAtiva ? "default" : "outline"}><MonitorUp className="mr-1 h-3.5 w-3.5" />{gravacaoAtiva ? "Tela sendo gravada" : "Sem gravação"}</Badge><Badge variant={violacoes > 0 ? "destructive" : "secondary"}>Ocorrências: {violacoes}/{LIMITE_VIOLACOES}</Badge><div className="rounded-md border bg-slate-950 px-4 py-2 font-mono text-base font-bold text-white"><Clock3 className="mr-2 inline h-4 w-4" />Total {formatarTempo(tempoTotalRestante)}</div></div></div></header>
        <main className="mx-auto max-w-4xl p-5 pb-28 space-y-4">
          {aviso && <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Ocorrência registrada</p><p>{aviso}</p></div></div>}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><div><strong>Passagem {passagem}</strong> · {Object.keys(respostas).length} de {QUESTOES_DEMO.length} respondidas</div><Badge variant="outline">Progresso {progresso}%</Badge></div>
          <Card className="border-blue-200 shadow-sm">
            <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">Questão {indiceAtual + 1} de {fila.length}{passagem > 1 ? " pendente(s)" : ""}</CardTitle><Badge variant="outline">{questaoAtual.eixo}</Badge></div><CardDescription className="pt-2 text-base text-foreground">{questaoAtual.enunciado}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">{opcoesAtuais.map((opcao, index) => <label key={`${questaoAtual.id}-${opcao}`} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-slate-50"><input type="radio" name={`q-${questaoAtual.id}`} checked={respostas[questaoAtual.id] === opcao} onChange={() => responder(questaoAtual.id, opcao)} /><span className="text-sm"><strong>{String.fromCharCode(65 + index)}.</strong> {opcao}</span></label>)}</div>
              <div className={`rounded-md border p-4 ${tempoQuestaoRestante <= 10 ? "border-red-300 bg-red-50" : "bg-slate-50"}`}><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Tempo desta questão</p><p className={`mt-1 font-mono text-2xl font-bold ${tempoQuestaoRestante <= 10 ? "text-red-700" : ""}`}>{formatarTempo(tempoQuestaoRestante)}</p></div><p className="max-w-sm text-right text-xs text-muted-foreground">Ao chegar a 00:00, o sistema avança automaticamente. Se estiver sem resposta, a questão volta depois.</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-700 transition-all" style={{ width: `${Math.max(0, Math.min(100, (tempoQuestaoRestante / DURACAO_QUESTAO_SEGUNDOS) * 100))}%` }} /></div></div>
              <div className="flex justify-end"><Button disabled={!respondidaAtual} onClick={() => avancarQuestao(false)}>Salvar e avançar</Button></div>
            </CardContent>
          </Card>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"><div className="mx-auto max-w-4xl flex items-center justify-between gap-4"><div className="text-sm">Ordem das questões e alternativas sorteada para esta tentativa · 2 minutos por questão · limite total de 3 horas</div><Button variant="outline" onClick={() => finalizar("manual")}>Finalizar teste</Button></div></footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2"><div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-blue-700" /><h1 className="text-2xl font-semibold">Modo Prova Segura — Piloto UTIC</h1></div><p className="text-sm text-muted-foreground">Teste do motor da avaliação técnica antes de carregar as 60 questões oficiais.</p></div>
      <Card><CardHeader><CardTitle>Regras deste teste</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><div className="rounded-md border p-4"><LockKeyhole className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Tela cheia obrigatória</p><p className="mt-1 text-sm text-muted-foreground">Sair da tela cheia ou trocar de aba gera ocorrência.</p></div><div className="rounded-md border p-4"><Clock3 className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">2 minutos por questão</p><p className="mt-1 text-sm text-muted-foreground">Ao zerar, avança automaticamente; questões sem resposta retornam depois. Tempo total máximo: 3 horas.</p></div><div className="rounded-md border p-4"><Shuffle className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Questões e alternativas aleatórias</p><p className="mt-1 text-sm text-muted-foreground">A ordem é sorteada uma vez por tentativa. Quando uma questão volta, suas alternativas permanecem na mesma ordem.</p></div><div className="rounded-md border p-4"><MonitorUp className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Gravação da tela</p><p className="mt-1 text-sm text-muted-foreground">O navegador pedirá autorização explícita para compartilhar e gravar a tela.</p></div><div className="rounded-md border p-4 md:col-span-2"><ShieldCheck className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Proteção do conteúdo</p><p className="mt-1 text-sm text-muted-foreground">Seleção, cópia, impressão, salvamento e reprodução do conteúdo são bloqueados quando tecnicamente possível e registrados.</p></div></CardContent></Card>
      <Card className="border-amber-300 bg-amber-50"><CardHeader><CardTitle className="text-amber-900">Atenção — ambiente monitorado e conteúdo protegido</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-amber-900"><p>A avaliação deverá ser realizada exclusivamente na página da prova. Saídas da tela, trocas de aba ou janela e interrupções detectáveis poderão ser registradas.</p><p>É proibido copiar, selecionar, imprimir, fotografar, capturar ou reproduzir as questões e alternativas por qualquer meio.</p><p className="font-medium">Caso seja identificada e confirmada uma violação das regras de segurança, a avaliação poderá ser anulada.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Antes de iniciar</CardTitle></CardHeader><CardContent className="space-y-4"><label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer"><input className="mt-1" type="checkbox" checked={gravarTela} onChange={(event) => setGravarTela(event.target.checked)} /><div><p className="font-medium">Testar gravação da tela</p><p className="text-sm text-muted-foreground">A gravação deste piloto ainda não é enviada ao servidor.</p></div></label><label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer"><input className="mt-1" type="checkbox" checked={aceite} onChange={(event) => setAceite(event.target.checked)} /><div><p className="font-medium">Li, compreendi e concordo com as regras de monitoramento e proteção do conteúdo</p><p className="text-sm text-muted-foreground">Ao iniciar, o sistema solicitará tela cheia e, se selecionado acima, compartilhamento da tela.</p></div></label>{erroGravacao && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erroGravacao}</div>}{aviso && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{aviso}</div>}<div className="flex flex-wrap gap-3"><Button disabled={!aceite} onClick={iniciar}>Iniciar teste da prova segura</Button><Button variant="outline" onClick={() => window.location.href = "/avaliacoes"}>Voltar para Avaliações</Button></div></CardContent></Card>
      <p className="text-xs text-muted-foreground">Nesta etapa, respostas e auditoria ainda permanecem no navegador. Persistência no banco e armazenamento institucional da gravação serão conectados antes da aplicação oficial.</p>
    </div></div>
  );
}

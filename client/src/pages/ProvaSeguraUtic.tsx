import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, MonitorUp, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DURACAO_SEGUNDOS = 10 * 60;
const LIMITE_VIOLACOES = 3;
const STORAGE_KEY = "piloto-utic-prova-segura-v1";

type Fase = "preparacao" | "em_prova" | "finalizada" | "anulada";

type EventoAuditoria = {
  data: string;
  tipo: string;
  detalhe: string;
};

type EstadoSalvo = {
  respostas: Record<number, string>;
  eventos: EventoAuditoria[];
  violacoes: number;
};

const QUESTOES_DEMO = [
  {
    id: 1,
    eixo: "Governança e Gestão de TI",
    enunciado: "Questão demonstrativa para testar seleção e salvamento automático.",
    opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"],
  },
  {
    id: 2,
    eixo: "Infraestrutura de TI",
    enunciado: "Questão demonstrativa para validar navegação em tela única.",
    opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"],
  },
  {
    id: 3,
    eixo: "Segurança da Informação",
    enunciado: "Questão demonstrativa para testar persistência das respostas durante a sessão.",
    opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"],
  },
  {
    id: 4,
    eixo: "Sistemas Corporativos, Processos e Automação",
    enunciado: "Questão demonstrativa para testar o comportamento do cronômetro.",
    opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"],
  },
  {
    id: 5,
    eixo: "Dados, BI e Inteligência Artificial",
    enunciado: "Questão demonstrativa para testar a finalização da prova segura.",
    opcoes: ["Alternativa A", "Alternativa B", "Alternativa C", "Não sei"],
  },
];

function lerEstadoSalvo(): EstadoSalvo {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return { respostas: {}, eventos: [], violacoes: 0 };
    const salvo = JSON.parse(bruto) as EstadoSalvo;
    return {
      respostas: salvo.respostas ?? {},
      eventos: salvo.eventos ?? [],
      violacoes: salvo.violacoes ?? 0,
    };
  } catch {
    return { respostas: {}, eventos: [], violacoes: 0 };
  }
}

function formatarTempo(total: number) {
  const minutos = Math.floor(total / 60).toString().padStart(2, "0");
  const segundos = (total % 60).toString().padStart(2, "0");
  return `${minutos}:${segundos}`;
}

export default function ProvaSeguraUtic() {
  const { loading, user } = useAuth();
  const estadoInicial = useMemo(() => lerEstadoSalvo(), []);
  const [fase, setFase] = useState<Fase>("preparacao");
  const [aceite, setAceite] = useState(false);
  const [gravarTela, setGravarTela] = useState(true);
  const [tempoRestante, setTempoRestante] = useState(DURACAO_SEGUNDOS);
  const [respostas, setRespostas] = useState<Record<number, string>>(estadoInicial.respostas);
  const [eventos, setEventos] = useState<EventoAuditoria[]>(estadoInicial.eventos);
  const [violacoes, setViolacoes] = useState(estadoInicial.violacoes);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gravacaoAtiva, setGravacaoAtiva] = useState(false);
  const [gravacaoUrl, setGravacaoUrl] = useState<string | null>(null);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const faseRef = useRef<Fase>("preparacao");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [loading, user]);

  const registrarEvento = (tipo: string, detalhe: string) => {
    setEventos((atual) => {
      const proximo = [{ data: new Date().toISOString(), tipo, detalhe }, ...atual].slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas, eventos: proximo, violacoes }));
      return proximo;
    });
  };

  const pararGravacao = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setGravacaoAtiva(false);
  };

  const finalizar = (motivo: "manual" | "tempo") => {
    if (faseRef.current !== "em_prova") return;
    faseRef.current = "finalizada";
    setFase("finalizada");
    registrarEvento("finalizacao", motivo === "tempo" ? "Tempo encerrado; teste finalizado automaticamente." : "Teste finalizado pelo usuário.");
    pararGravacao();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  };

  const registrarViolacao = (tipo: "troca_aba" | "saida_tela_cheia") => {
    if (faseRef.current !== "em_prova") return;
    setViolacoes((atual) => {
      const novo = atual + 1;
      const detalhe = tipo === "troca_aba" ? "A página da prova perdeu visibilidade." : "O modo tela cheia foi encerrado.";
      setEventos((lista) => {
        const proxima = [{ data: new Date().toISOString(), tipo, detalhe }, ...lista].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas, eventos: proxima, violacoes: novo }));
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
    const onVisibility = () => {
      if (document.hidden) registrarViolacao("troca_aba");
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) registrarViolacao("saida_tela_cheia");
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (faseRef.current === "em_prova") {
        event.preventDefault();
        event.returnValue = "";
      }
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
    const timer = window.setInterval(() => {
      setTempoRestante((atual) => {
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
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setGravacaoUrl((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior);
          return URL.createObjectURL(blob);
        });
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

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setAviso("Não foi possível ativar a tela cheia. Tente novamente e autorize o modo tela cheia.");
      return;
    }

    const gravacaoOk = await iniciarGravacaoTela();
    if (!gravacaoOk && gravarTela) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      return;
    }

    const estadoLimpo = { respostas: {}, eventos: [], violacoes: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoLimpo));
    setRespostas({});
    setEventos([]);
    setViolacoes(0);
    setTempoRestante(DURACAO_SEGUNDOS);
    faseRef.current = "em_prova";
    setFase("em_prova");
    registrarEvento("inicio", "Piloto do Modo Prova Segura UTIC iniciado.");
  };

  const responder = (questaoId: number, resposta: string) => {
    setRespostas((atual) => {
      const proximo = { ...atual, [questaoId]: resposta };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ respostas: proximo, eventos, violacoes }));
      return proximo;
    });
  };

  const reiniciar = () => {
    pararGravacao();
    localStorage.removeItem(STORAGE_KEY);
    setRespostas({});
    setEventos([]);
    setViolacoes(0);
    setTempoRestante(DURACAO_SEGUNDOS);
    setAceite(false);
    setAviso(null);
    setErroGravacao(null);
    setGravacaoUrl(null);
    faseRef.current = "preparacao";
    setFase("preparacao");
  };

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-600">Verificando acesso...</div>;
  }

  if (fase === "anulada") {
    return (
      <div className="min-h-screen bg-slate-950 p-6 grid place-items-center">
        <Card className="max-w-xl w-full border-red-300">
          <CardHeader>
            <CardTitle className="text-red-700">Teste encerrado por segurança</CardTitle>
            <CardDescription>O limite de {LIMITE_VIOLACOES} ocorrências foi atingido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">O piloto registrou as saídas da tela segura. Em uma aplicação oficial, esta situação poderá ser configurada para anular a tentativa ou apenas encaminhá-la para análise.</p>
            <Button onClick={reiniciar}>Voltar ao início do piloto</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fase === "finalizada") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card className="border-emerald-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                <div>
                  <CardTitle>Teste do Modo Prova Segura concluído</CardTitle>
                  <CardDescription>Esta etapa valida o comportamento da sala de prova, não o conteúdo técnico da UTIC.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Respostas salvas</p><p className="text-2xl font-semibold">{Object.keys(respostas).length}/{QUESTOES_DEMO.length}</p></div>
              <div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Ocorrências</p><p className="text-2xl font-semibold">{violacoes}</p></div>
              <div className="rounded-md border p-4"><p className="text-xs text-muted-foreground">Gravação de tela</p><p className="text-sm font-semibold mt-2">{gravacaoUrl ? "Capturada no navegador" : "Não capturada"}</p></div>
            </CardContent>
          </Card>

          {gravacaoUrl && (
            <Card>
              <CardHeader><CardTitle>Prévia da gravação desta sessão</CardTitle><CardDescription>Nesta primeira etapa a gravação permanece apenas nesta sessão do navegador; o armazenamento institucional será ligado ao backend na etapa seguinte.</CardDescription></CardHeader>
              <CardContent><video className="w-full rounded-md border bg-black" controls src={gravacaoUrl} /></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Auditoria do piloto</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {eventos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p> : eventos.map((evento, indice) => (
                <div key={`${evento.data}-${indice}`} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{evento.tipo}</p>
                  <p className="text-muted-foreground">{evento.detalhe}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(evento.data).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={reiniciar}>Testar novamente</Button>
            <Button variant="outline" onClick={() => window.location.href = "/avaliacoes"}>Voltar para Avaliações</Button>
          </div>
        </div>
      </div>
    );
  }

  if (fase === "em_prova") {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="sticky top-0 z-40 border-b bg-white px-5 py-3 shadow-sm">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Avaliação Técnica UTIC — Teste do Modo Prova Segura</p>
              <p className="text-xs text-muted-foreground">Questões demonstrativas; conteúdo oficial ainda não carregado.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={gravacaoAtiva ? "default" : "outline"}><MonitorUp className="mr-1 h-3.5 w-3.5" />{gravacaoAtiva ? "Tela sendo gravada" : "Sem gravação"}</Badge>
              <Badge variant={violacoes > 0 ? "destructive" : "secondary"}>Ocorrências: {violacoes}/{LIMITE_VIOLACOES}</Badge>
              <div className="rounded-md border bg-slate-950 px-4 py-2 font-mono text-lg font-bold text-white"><Clock3 className="mr-2 inline h-4 w-4" />{formatarTempo(tempoRestante)}</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-4 p-5 pb-28">
          {aviso && (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div><p className="font-semibold">Ocorrência de segurança registrada</p><p>{aviso}</p></div>
            </div>
          )}

          {QUESTOES_DEMO.map((questao, indice) => (
            <Card key={questao.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Questão {indice + 1}</CardTitle>
                  <Badge variant="outline">{questao.eixo}</Badge>
                </div>
                <CardDescription>{questao.enunciado}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {questao.opcoes.map((opcao) => (
                  <label key={opcao} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-slate-50">
                    <input type="radio" name={`q-${questao.id}`} checked={respostas[questao.id] === opcao} onChange={() => responder(questao.id, opcao)} />
                    <span className="text-sm">{opcao}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="text-sm"><strong>{Object.keys(respostas).length}</strong> de {QUESTOES_DEMO.length} respondidas <span className="ml-2 text-muted-foreground">• salvamento automático ativo no piloto</span></div>
            <Button onClick={() => finalizar("manual")}>Finalizar teste</Button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-blue-700" /><h1 className="text-2xl font-semibold">Modo Prova Segura — Piloto UTIC</h1></div>
          <p className="text-sm text-muted-foreground">Primeira etapa do motor da avaliação técnica. Vamos validar a experiência e os controles antes de carregar as 60 questões oficiais.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Regras deste teste</CardTitle><CardDescription>Esta tela foi construída separada do menu do sistema para simular a experiência real da prova.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-4"><LockKeyhole className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Tela cheia obrigatória</p><p className="mt-1 text-sm text-muted-foreground">Sair da tela cheia ou trocar de aba gera ocorrência.</p></div>
            <div className="rounded-md border p-4"><Clock3 className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Cronômetro real</p><p className="mt-1 text-sm text-muted-foreground">Para o piloto, o tempo é de 10 minutos. No cadastro oficial será configurável.</p></div>
            <div className="rounded-md border p-4"><AlertTriangle className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Limite de ocorrências</p><p className="mt-1 text-sm text-muted-foreground">Neste piloto, a 3ª ocorrência encerra o teste automaticamente.</p></div>
            <div className="rounded-md border p-4"><MonitorUp className="mb-2 h-5 w-5 text-blue-700" /><p className="font-medium">Gravação da tela</p><p className="mt-1 text-sm text-muted-foreground">O navegador pedirá autorização explícita para compartilhar e gravar a tela.</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Antes de iniciar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer">
              <input className="mt-1" type="checkbox" checked={gravarTela} onChange={(event) => setGravarTela(event.target.checked)} />
              <div><p className="font-medium">Testar gravação da tela</p><p className="text-sm text-muted-foreground">Recomendado para validar agora a funcionalidade solicitada. A gravação deste piloto ainda não é enviada ao servidor.</p></div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-4 cursor-pointer">
              <input className="mt-1" type="checkbox" checked={aceite} onChange={(event) => setAceite(event.target.checked)} />
              <div><p className="font-medium">Li e compreendi as regras deste teste</p><p className="text-sm text-muted-foreground">Ao iniciar, o sistema solicitará tela cheia e, se selecionado acima, compartilhamento da tela.</p></div>
            </label>
            {erroGravacao && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erroGravacao}</div>}
            {aviso && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{aviso}</div>}
            <div className="flex flex-wrap gap-3">
              <Button disabled={!aceite} onClick={iniciar}>Iniciar teste da prova segura</Button>
              <Button variant="outline" onClick={() => window.location.href = "/avaliacoes"}>Voltar para Avaliações</Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">Importante: nesta etapa, respostas e auditoria são persistidas somente no navegador para validar o motor visual e os controles. A persistência institucional no banco e o armazenamento da gravação serão conectados na etapa seguinte, antes da aplicação oficial.</p>
      </div>
    </div>
  );
}

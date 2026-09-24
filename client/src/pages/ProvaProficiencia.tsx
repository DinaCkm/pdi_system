import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Loader2, Mic, MonitorUp, PlayCircle, RefreshCw, ShieldCheck, Shuffle, UserCheck, Video } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import RichTextDisplay from "@/components/RichTextDisplay";

type Questao = {
  id: string;
  enunciado: string;
  opcoes: Array<{ letra: string; texto: string; naoSei?: boolean }>;
};

export default function ProvaProficiencia({ aplicacaoId }: { aplicacaoId: number }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [finalizada, setFinalizada] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [aceiteIdentidade, setAceiteIdentidade] = useState(false);
  const [mostrarComunicado, setMostrarComunicado] = useState(false);
  const [aceiteComunicado, setAceiteComunicado] = useState(false);
  const [mostrarAvisoTela, setMostrarAvisoTela] = useState(false);
  const [aceiteTela, setAceiteTela] = useState(false);
  const [sessaoAutorizada, setSessaoAutorizada] = useState(false);
  const [iniciandoAmbiente, setIniciandoAmbiente] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const cameraMonitorRef = useRef<MediaStream | null>(null);
  const telaRef = useRef<MediaStream | null>(null);
  const eventosRecentesRef = useRef<Record<string, number>>({});

  const provaQuery = trpc.aplicacoesProficiencia.estadoProva.useQuery(
    { aplicacaoId },
    { refetchOnWindowFocus: false, retry: false },
  );
  const identidadeQuery = trpc.aplicacoesProficiencia.estadoIdentidade.useQuery(
    { aplicacaoId },
    { enabled: Boolean(aplicacaoId), refetchOnWindowFocus: false, retry: false },
  );
  const registrarIdentidadeMutation = trpc.aplicacoesProficiencia.registrarIdentidade.useMutation();
  const registrarOcorrenciaMutation = trpc.aplicacoesProficiencia.registrarOcorrencia.useMutation();
  const iniciarMutation = trpc.aplicacoesProficiencia.iniciar.useMutation({
    onSuccess: async () => {
      setMensagem(null);
      await provaQuery.refetch();
    },
    onError: error => setMensagem(error.message),
  });
  const salvarMutation = trpc.aplicacoesProficiencia.salvarResposta.useMutation({
    onError: error => setMensagem(error.message),
  });
  const finalizarMutation = trpc.aplicacoesProficiencia.finalizar.useMutation({
    onSuccess: () => {
      setFinalizada(true);
      setMensagem(null);
      void provaQuery.refetch();
    },
    onError: error => setMensagem(error.message),
  });

  const pararCamera = () => {
    cameraRef.current?.getTracks().forEach(track => track.stop());
    cameraRef.current = null;
    setCameraAtiva(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const pararMonitoramento = () => {
    telaRef.current?.getTracks().forEach(track => track.stop());
    cameraMonitorRef.current?.getTracks().forEach(track => track.stop());
    telaRef.current = null;
    cameraMonitorRef.current = null;
  };

  const ativarCamera = async () => {
    setMensagem(null);
    setFoto(null);
    setAceiteIdentidade(false);
    pararCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setMensagem("Este navegador não permite acessar a câmera necessária para confirmar sua identidade.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      cameraRef.current = stream;
      setCameraAtiva(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setMensagem("Não foi possível acessar a câmera. Autorize o uso da câmera no navegador e tente novamente.");
    }
  };

  const tirarFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMensagem("A câmera ainda não está pronta. Aguarde alguns segundos e tente novamente.");
      return;
    }
    const canvas = document.createElement("canvas");
    const escala = Math.min(1, 720 / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
    canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFoto(canvas.toDataURL("image/jpeg", 0.82));
    pararCamera();
  };

  const confirmarIdentidade = async () => {
    if (!foto || !aceiteIdentidade) return;
    try {
      await registrarIdentidadeMutation.mutateAsync({ aplicacaoId, fotoDataUrl: foto, aceiteDeclaracao: true });
      await identidadeQuery.refetch();
      setMensagem(null);
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível confirmar a identidade.");
    }
  };

  const registrarOcorrencia = (tipo: string, detalhe: string, tentativaAtual?: number) => {
    const agora = Date.now();
    if (agora - (eventosRecentesRef.current[tipo] || 0) < 1200) return;
    eventosRecentesRef.current[tipo] = agora;
    registrarOcorrenciaMutation.mutate({
      aplicacaoId,
      tentativaId: tentativaAtual || undefined,
      tipo,
      detalhe,
    });
  };

  useEffect(() => {
    if (!provaQuery.data) return;
    const existentes: Record<string, string> = {};
    for (const item of provaQuery.data.respostas ?? []) existentes[String(item.questaoChave)] = String(item.resposta);
    setRespostas(existentes);
    if (["FINALIZADA", "FINALIZADA_TEMPO"].includes(String(provaQuery.data.tentativaStatus))) setFinalizada(true);
  }, [provaQuery.data]);

  useEffect(() => () => {
    pararCamera();
    pararMonitoramento();
  }, []);

  useEffect(() => {
    const id = Number(provaQuery.data?.tentativaId ?? 0);
    if (!id || finalizada || !sessaoAutorizada) return;

    registrarOcorrencia("MONITORAMENTO_INICIADO", "Monitoramento de foco e navegação iniciado.", id);

    const onVisibility = () => {
      if (document.hidden) registrarOcorrencia("TROCA_ABA", "A aba da avaliação perdeu visibilidade.", id);
    };
    const onBlur = () => registrarOcorrencia("SAIDA_FOCO", "A janela da avaliação perdeu o foco.", id);
    const onFullscreen = () => {
      if (!document.fullscreenElement) registrarOcorrencia("SAIDA_TELA_CHEIA", "O participante saiu do modo de tela cheia.", id);
    };
    const onContext = (event: MouseEvent) => {
      registrarOcorrencia("MENU_CONTEXTO", "Foi acionado o menu de contexto durante a avaliação.", id);
      event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") registrarOcorrencia("PRINT_SCREEN", "Foi detectada tecla Print Screen durante a avaliação.", id);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
    };
  }, [provaQuery.data?.tentativaId, finalizada, sessaoAutorizada]);

  const questoes = (provaQuery.data?.prova?.questoes ?? []) as Questao[];
  const questao = questoes[indice];
  const tentativaId = Number(provaQuery.data?.tentativaId ?? 0);
  const iniciou = tentativaId > 0;
  const totalRespondidas = useMemo(() => questoes.filter(item => Boolean(respostas[String(item.id)])).length, [questoes, respostas]);
  const percentual = questoes.length ? Math.round((totalRespondidas / questoes.length) * 100) : 0;

  const responder = (questaoId: string, letra: string) => {
    if (!provaQuery.data || !tentativaId || finalizada) return;
    setRespostas(current => ({ ...current, [questaoId]: letra }));
    setMensagem(null);
    salvarMutation.mutate({ aplicacaoId, tentativaId, questaoChave: questaoId, resposta: letra });
  };

  const abrirComunicado = () => {
    setMensagem(null);
    setAceiteComunicado(false);
    setMostrarComunicado(true);
  };

  const concluirComunicado = () => {
    if (!aceiteComunicado) return;
    registrarOcorrencia("ACEITE_REGRAS", "O participante leu e aceitou as regras obrigatórias da avaliação.");
    setMostrarComunicado(false);
    setAceiteTela(false);
    setMostrarAvisoTela(true);
  };

  const iniciarAmbienteMonitorado = async () => {
    if (!aceiteTela || iniciandoAmbiente) return;
    setIniciandoAmbiente(true);
    setMensagem(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador não oferece os recursos de câmera, microfone e compartilhamento de tela exigidos.");
      }

      const tela = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const trilhaTela = tela.getVideoTracks()[0];
      const configuracoesTela = trilhaTela?.getSettings?.() as MediaTrackSettings & { displaySurface?: string };
      if (configuracoesTela?.displaySurface && configuracoesTela.displaySurface !== "monitor") {
        tela.getTracks().forEach(track => track.stop());
        registrarOcorrencia("COMPARTILHAMENTO_INVALIDO", "Foi selecionada uma janela ou guia em vez da tela inteira.");
        throw new Error("Selecione TELA INTEIRA. Janela ou guia do navegador não são aceitas.");
      }

      const cameraMic = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      telaRef.current = tela;
      cameraMonitorRef.current = cameraMic;
      trilhaTela?.addEventListener("ended", () => {
        registrarOcorrencia("INTERRUPCAO_COMPARTILHAMENTO", "O compartilhamento da tela foi interrompido durante a avaliação.", Number(provaQuery.data?.tentativaId ?? 0) || undefined);
      });
      cameraMic.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          registrarOcorrencia("INTERRUPCAO_CAMERA_MICROFONE", "Câmera ou microfone foi interrompido durante a avaliação.", Number(provaQuery.data?.tentativaId ?? 0) || undefined);
        });
      });

      registrarOcorrencia("AMBIENTE_MONITORADO_AUTORIZADO", "Câmera, microfone e compartilhamento de tela foram autorizados.");
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      } catch {
        registrarOcorrencia("TELA_CHEIA_NAO_AUTORIZADA", "O navegador não entrou em tela cheia no início da avaliação.");
      }

      const inicio = await iniciarMutation.mutateAsync({ aplicacaoId });
      registrarOcorrencia("MONITORAMENTO_INICIADO", "Monitoramento iniciado no mesmo ambiente da aplicação oficial.", Number(inicio.tentativaId));
      setSessaoAutorizada(true);
      setMostrarAvisoTela(false);
      await provaQuery.refetch();
    } catch (error: any) {
      pararMonitoramento();
      setMensagem(error?.message || "Não foi possível preparar o ambiente monitorado.");
    } finally {
      setIniciandoAmbiente(false);
    }
  };

  const finalizar = () => {
    if (!tentativaId) return;
    if (totalRespondidas < questoes.length) {
      setMensagem(`Ainda faltam ${questoes.length - totalRespondidas} questão(ões). Você pode revisar antes de finalizar.`);
      return;
    }
    finalizarMutation.mutate({ aplicacaoId, tentativaId });
  };

  if (provaQuery.isLoading) {
    return <div className="grid min-h-screen place-items-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando prova...</div></div>;
  }

  if (provaQuery.error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card className="border-red-200"><CardHeader><CardTitle>Prova indisponível</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-red-800">{provaQuery.error.message}</p><Button variant="outline" onClick={() => setLocation("/avaliacoes")}>Voltar para Avaliações</Button></CardContent></Card>
      </div>
    );
  }

  if (finalizada) {
    const modoTeste = Boolean(provaQuery.data?.modoTeste);
    return (
      <div className="mx-auto max-w-2xl p-6">
        {modoTeste && <div className="mb-4 rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">MODO TESTE — ADMINISTRADOR — ESTE RESULTADO NÃO COMPÕE INDICADORES</div>}
        <Card className="border-green-300 bg-green-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-green-700" />{modoTeste ? "Teste concluído" : "Avaliação finalizada"}</CardTitle>
            <CardDescription>{modoTeste ? "O resultado do teste foi calculado automaticamente e já pode ser conferido na tela de Provas." : "Suas respostas foram gravadas. O resultado será calculado pelo administrador após o encerramento da realização."}</CardDescription>
          </CardHeader>
          <CardContent><Button onClick={() => setLocation(modoTeste ? "/importar-provas" : "/avaliacoes")}>{modoTeste ? "Voltar para Provas" : "Voltar para Avaliações"}</Button></CardContent>
        </Card>
      </div>
    );
  }

  if (!provaQuery.data) return null;

  if (!iniciou) {
    const identidadeConfirmada = Boolean(identidadeQuery.data?.identidadeConfirmada);
    const nome = String(user?.name || "Participante");
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {provaQuery.data.modoTeste && <div className="rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">MODO TESTE — ADMINISTRADOR — MESMA EXPERIÊNCIA DO CANDIDATO — RESULTADO FORA DOS INDICADORES</div>}

          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-blue-700" />Abertura da Avaliação de Proficiência para a Função</CardTitle>
              <CardDescription>{provaQuery.data.aplicacao.titulo} — {provaQuery.data.prova.unidade}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <p>Antes de iniciar, confirme sua identidade e leia as orientações. Durante a avaliação, ocorrências de foco e navegação são registradas para acompanhamento administrativo.</p>
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><span>Evite trocar de aba, minimizar a janela ou sair da tela cheia. Essas ocorrências serão registradas no histórico da tentativa.</span></div>
              </div>
              <p><strong>Total de questões:</strong> {questoes.length}</p>
            </CardContent>
          </Card>

          {!identidadeConfirmada ? (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-blue-700" />Confirmação de identidade</CardTitle>
                <CardDescription>A fotografia deve ser capturada agora, pela câmera deste dispositivo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="overflow-hidden rounded-lg border bg-slate-950">
                    {foto ? <img src={foto} alt="Fotografia capturada" className="aspect-video w-full object-cover" /> : <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover scale-x-[-1]" />}
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    {!cameraAtiva && !foto && <Button onClick={() => void ativarCamera()}><Camera className="mr-2 h-5 w-5" />ATIVAR CÂMERA</Button>}
                    {cameraAtiva && !foto && <Button onClick={tirarFoto}><Camera className="mr-2 h-5 w-5" />TIRAR FOTO</Button>}
                    {foto && <Button variant="outline" onClick={() => void ativarCamera()}><RefreshCw className="mr-2 h-4 w-4" />REFAZER FOTO</Button>}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4 text-sm leading-6">
                  Declaro que sou <strong>{nome}</strong>, participante identificado(a) nesta plataforma, e que sou a pessoa que realizará esta avaliação.
                </div>
                <label className="flex items-start gap-3 rounded-md border p-4 text-sm font-semibold">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={aceiteIdentidade} onChange={e => setAceiteIdentidade(e.target.checked)} />
                  Confirmo minha identidade e a fotografia capturada.
                </label>
                <Button onClick={() => void confirmarIdentidade()} disabled={!foto || !aceiteIdentidade || registrarIdentidadeMutation.isPending}>
                  <UserCheck className="mr-2 h-5 w-5" />{registrarIdentidadeMutation.isPending ? "REGISTRANDO..." : "CONFIRMAR IDENTIDADE"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-300 bg-emerald-50/40">
              <CardContent className="pt-6"><div className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5" />Identidade confirmada para esta aplicação.</div></CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-4 pt-6">
              <label className="flex items-start gap-3 rounded-md border p-4 text-sm font-semibold">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={aceiteRegras} onChange={e => setAceiteRegras(e.target.checked)} />
                Li as orientações e estou ciente de que ocorrências de navegação e foco serão registradas durante a avaliação.
              </label>
              {mensagem && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{mensagem}</div>}
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void iniciarAvaliacao()} disabled={!identidadeConfirmada || !aceiteRegras || iniciarMutation.isPending}>
                  <PlayCircle className="mr-2 h-5 w-5" />{iniciarMutation.isPending ? "INICIANDO..." : "INICIAR AVALIAÇÃO"}
                </Button>
                <Button variant="outline" onClick={() => setLocation("/avaliacoes")}>Voltar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!questao) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {provaQuery.data.modoTeste && <div className="rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">MODO TESTE — ADMINISTRADOR — MESMA EXPERIÊNCIA DO CANDIDATO — RESULTADO FORA DOS INDICADORES</div>}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-blue-700" />{provaQuery.data.aplicacao.titulo}</CardTitle><CardDescription>{provaQuery.data.prova.nome} — {provaQuery.data.prova.unidade}</CardDescription></div>
              <Badge variant="outline">{totalRespondidas} de {questoes.length} respondidas</Badge>
            </div>
            <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-slate-700" style={{ width: `${percentual}%` }} /></div><p className="text-xs text-muted-foreground">{percentual}% concluído</p></div>
          </CardHeader>
        </Card>

        {mensagem && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{mensagem}</div>}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3"><Badge variant="secondary">Questão {indice + 1} de {questoes.length}</Badge></div>
            <div className="pt-2 text-lg font-semibold leading-relaxed">
              <RichTextDisplay
                content={questao.enunciado}
                className="text-lg font-semibold leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {questao.opcoes.map(opcao => {
              const selecionada = respostas[String(questao.id)] === String(opcao.letra);
              return (
                <button
                  key={`${questao.id}-${opcao.letra}`}
                  type="button"
                  onClick={() => responder(String(questao.id), String(opcao.letra))}
                  className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${selecionada ? "border-blue-600 bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-semibold">{opcao.letra}</span>
                  <RichTextDisplay
                    content={opcao.texto}
                    className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1"
                  />
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="outline" disabled={indice === 0} onClick={() => setIndice(value => Math.max(0, value - 1))}>Anterior</Button>
          <div className="flex gap-2">
            {indice < questoes.length - 1 ? (
              <Button onClick={() => setIndice(value => Math.min(questoes.length - 1, value + 1))}>Próxima</Button>
            ) : (
              <Button onClick={finalizar} disabled={finalizarMutation.isPending}>{finalizarMutation.isPending ? "FINALIZANDO..." : "FINALIZAR AVALIAÇÃO"}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

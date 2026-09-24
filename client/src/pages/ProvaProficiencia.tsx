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
  const [revisandoPendentes, setRevisandoPendentes] = useState(false);
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
  const violacoesRef = useRef(0);
  const [violacoes, setViolacoes] = useState(0);
  const [bloqueada, setBloqueada] = useState(false);
  const LIMITE_VIOLACOES = 3;

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
  const bloquearMutation = trpc.aplicacoesProficiencia.bloquearTentativa.useMutation({
    onSuccess: async () => {
      setBloqueada(true);
      setSessaoAutorizada(false);
      pararMonitoramento();
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      await provaQuery.refetch();
    },
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

    const registrarViolacao = (tipo: string, detalhe: string) => {
      registrarOcorrencia(tipo, detalhe, id);
      violacoesRef.current += 1;
      setViolacoes(violacoesRef.current);
      setMensagem(`Ação não permitida. Ocorrência ${violacoesRef.current} de ${LIMITE_VIOLACOES} registrada.`);
      if (violacoesRef.current >= LIMITE_VIOLACOES) {
        bloquearMutation.mutate({ aplicacaoId, tentativaId: id, motivo: "SEGURANCA" });
      }
    };

    const bloquearConteudo = (event: Event) => {
      event.preventDefault();
      registrarViolacao("CONTEUDO_PROTEGIDO", "Tentativa de selecionar, copiar, colar, recortar, imprimir, salvar ou reproduzir conteúdo.");
    };
    const onVisibility = () => {
      if (document.hidden) registrarViolacao("TROCA_ABA", "A aba da avaliação perdeu visibilidade.");
    };
    const onBlur = () => registrarViolacao("SAIDA_FOCO", "A janela da avaliação perdeu o foco.");
    const onFullscreen = () => {
      if (!document.fullscreenElement) registrarViolacao("SAIDA_TELA_CHEIA", "O participante saiu do modo de tela cheia.");
    };
    const onKey = (event: KeyboardEvent) => {
      const tecla = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "x", "v", "p", "s", "u", "a"].includes(tecla)) {
        bloquearConteudo(event);
        return;
      }
      if (event.key === "PrintScreen") {
        event.preventDefault();
        registrarViolacao("PRINT_SCREEN", "Tecla Print Screen detectada pelo navegador.");
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      registrarOcorrencia("TENTATIVA_FECHAMENTO", "Tentativa de fechar ou recarregar a página durante a avaliação.", id);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("selectstart", bloquearConteudo);
    document.addEventListener("contextmenu", bloquearConteudo);
    document.addEventListener("copy", bloquearConteudo);
    document.addEventListener("cut", bloquearConteudo);
    document.addEventListener("paste", bloquearConteudo);
    document.addEventListener("dragstart", bloquearConteudo);
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeprint", bloquearConteudo);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("selectstart", bloquearConteudo);
      document.removeEventListener("contextmenu", bloquearConteudo);
      document.removeEventListener("copy", bloquearConteudo);
      document.removeEventListener("cut", bloquearConteudo);
      document.removeEventListener("paste", bloquearConteudo);
      document.removeEventListener("dragstart", bloquearConteudo);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeprint", bloquearConteudo);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [provaQuery.data?.tentativaId, finalizada, sessaoAutorizada]);

  const questoes = (provaQuery.data?.prova?.questoes ?? []) as Questao[];
  const questao = questoes[indice];
  const tentativaId = Number(provaQuery.data?.tentativaId ?? 0);
  const iniciou = tentativaId > 0;
  const totalRespondidas = useMemo(() => questoes.filter(item => Boolean(respostas[String(item.id)])).length, [questoes, respostas]);
  const percentual = questoes.length ? Math.round((totalRespondidas / questoes.length) * 100) : 0;

  const responder = async (questaoId: string, letra: string) => {
    if (!provaQuery.data || !tentativaId || finalizada) return;
    const novasRespostas = { ...respostas, [questaoId]: letra };
    setRespostas(novasRespostas);
    setMensagem(null);
    try {
      await salvarMutation.mutateAsync({ aplicacaoId, tentativaId, questaoChave: questaoId, resposta: letra });

      const faltantes = questoes
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => !novasRespostas[String(item.id)]);

      if (faltantes.length === 0) {
        setMensagem("Todas as questões foram respondidas. Finalizando a avaliação...");
        finalizarMutation.mutate({ aplicacaoId, tentativaId });
        return;
      }

      if (revisandoPendentes) {
        const proxima = faltantes.find(({ idx }) => idx > indice) ?? faltantes[0];
        if (proxima) {
          setIndice(proxima.idx);
          setMensagem(`Ainda faltam ${faltantes.length} questão(ões). As pendentes estão sendo reapresentadas.`);
        }
      }
    } catch (error: any) {
      setMensagem(error?.message || "Não foi possível salvar a resposta.");
    }
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

      const getScreenDetails = (window as any).getScreenDetails;
      if (typeof getScreenDetails === "function") {
        try {
          const detalhes = await getScreenDetails.call(window);
          const quantidade = Array.isArray(detalhes?.screens) ? detalhes.screens.length : 0;
          if (quantidade > 1) {
            registrarOcorrencia("MULTIPLAS_TELAS", `Foram detectadas ${quantidade} telas/monitores conectados.`);
            throw new Error("Foram identificadas múltiplas telas/monitores. Para iniciar, mantenha somente uma tela ativa.");
          }
        } catch (error: any) {
          if (/múltiplas telas/i.test(String(error?.message ?? ""))) throw error;
        }
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

      registrarOcorrencia("AMBIENTE_MONITORADO_AUTORIZADO", "Câmera, microfone e compartilhamento de tela inteira foram autorizados.");
      violacoesRef.current = 0;
      setViolacoes(0);
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

  const irParaPendentes = () => {
    const faltantes = questoes
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !respostas[String(item.id)]);

    if (faltantes.length === 0) {
      finalizarMutation.mutate({ aplicacaoId, tentativaId });
      return;
    }

    setRevisandoPendentes(true);
    const proxima = faltantes.find(({ idx }) => idx !== indice) ?? faltantes[0];
    setIndice(proxima.idx);
    setMensagem(
      `Ainda faltam ${faltantes.length} questão(ões). Todas precisam ser marcadas. Caso não saiba a resposta, marque “Não sei”.`,
    );
  };

  const finalizar = () => {
    if (!tentativaId) return;
    if (totalRespondidas < questoes.length) {
      irParaPendentes();
      return;
    }
    finalizarMutation.mutate({ aplicacaoId, tentativaId });
  };

  const avancar = () => {
    if (revisandoPendentes) {
      irParaPendentes();
      return;
    }
    if (indice < questoes.length - 1) {
      setIndice(value => Math.min(questoes.length - 1, value + 1));
      return;
    }
    if (totalRespondidas < questoes.length) {
      irParaPendentes();
      return;
    }
    finalizar();
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

  if (bloqueada || String(provaQuery.data?.tentativaStatus) === "BLOQUEADA") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-6">
        <Card className="w-full max-w-2xl border-amber-400">
          <CardHeader>
            <CardTitle className="text-xl">Avaliação bloqueada por segurança</CardTitle>
            <CardDescription>As respostas já registradas foram preservadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              O limite de ocorrências de segurança foi atingido. Entre em contato com o administrador para análise dos logs e eventual liberação.
            </div>
          </CardContent>
        </Card>
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

  if (!sessaoAutorizada) {
    const identidadeConfirmada = Boolean(identidadeQuery.data?.identidadeConfirmada);
    const nome = String(user?.name || "Participante");
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {provaQuery.data.modoTeste && (
            <div className="rounded-md border border-violet-300 bg-violet-50 p-3 text-center text-sm font-semibold text-violet-950">
              MODO TESTE — ADMINISTRADOR — MESMA EXPERIÊNCIA DO CANDIDATO — RESULTADO FORA DOS INDICADORES
            </div>
          )}

          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-blue-700" />
                Abertura da Avaliação de Proficiência para a Função
              </CardTitle>
              <CardDescription>{provaQuery.data.aplicacao.titulo} — {provaQuery.data.prova.unidade}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6">
              <p>
                Esta etapa reproduz a abertura da aplicação oficial. A avaliação somente será liberada após identificação,
                leitura e aceite das regras, autorização de câmera e microfone e compartilhamento da tela inteira.
              </p>
              <p><strong>Total de questões:</strong> {questoes.length}</p>
            </CardContent>
          </Card>

          {!identidadeConfirmada ? (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-700" />
                  1. Confirmação de identidade
                </CardTitle>
                <CardDescription>A fotografia deve ser capturada agora pela câmera deste dispositivo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="overflow-hidden rounded-lg border bg-slate-950">
                    {foto ? (
                      <img src={foto} alt="Fotografia capturada" className="aspect-video w-full object-cover" />
                    ) : (
                      <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover scale-x-[-1]" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    {!cameraAtiva && !foto && (
                      <Button onClick={() => void ativarCamera()}>
                        <Camera className="mr-2 h-5 w-5" />ATIVAR CÂMERA
                      </Button>
                    )}
                    {cameraAtiva && !foto && (
                      <Button onClick={tirarFoto}>
                        <Camera className="mr-2 h-5 w-5" />TIRAR FOTO
                      </Button>
                    )}
                    {foto && (
                      <Button variant="outline" onClick={() => void ativarCamera()}>
                        <RefreshCw className="mr-2 h-4 w-4" />REFAZER FOTO
                      </Button>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4 text-sm leading-6">
                  Declaro que sou <strong>{nome}</strong>, participante identificado(a) nesta plataforma, e que sou a pessoa que realizará esta avaliação.
                </div>
                <label className="flex items-start gap-3 rounded-md border p-4 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={aceiteIdentidade}
                    onChange={e => setAceiteIdentidade(e.target.checked)}
                  />
                  Confirmo minha identidade e a fotografia capturada.
                </label>
                <Button onClick={() => void confirmarIdentidade()} disabled={!foto || !aceiteIdentidade || registrarIdentidadeMutation.isPending}>
                  <UserCheck className="mr-2 h-5 w-5" />
                  {registrarIdentidadeMutation.isPending ? "REGISTRANDO..." : "CONFIRMAR IDENTIDADE"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-emerald-300 bg-emerald-50/40">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 font-semibold text-emerald-900">
                    <CheckCircle2 className="h-5 w-5" />Identidade confirmada para esta aplicação.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>2. Requisitos da avaliação</CardTitle>
                  <CardDescription>Confira os requisitos antes de abrir o comunicado obrigatório.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <Video className="mb-2 h-5 w-5" />
                    <strong>Computador com câmera</strong>
                    <p className="mt-1 text-sm text-muted-foreground">A câmera deverá permanecer conectada, ligada e autorizada.</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <Mic className="mb-2 h-5 w-5" />
                    <strong>Microfone obrigatório</strong>
                    <p className="mt-1 text-sm text-muted-foreground">O microfone deverá permanecer conectado, ligado e autorizado.</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <MonitorUp className="mb-2 h-5 w-5" />
                    <strong>Compartilhar tela inteira</strong>
                    <p className="mt-1 text-sm text-muted-foreground">Janela ou guia do navegador não serão aceitas quando o navegador permitir essa validação.</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <Shuffle className="mb-2 h-5 w-5" />
                    <strong>Ambiente monitorado</strong>
                    <p className="mt-1 text-sm text-muted-foreground">Troca de aba, perda de foco, saída de tela cheia e interrupções são registradas nos logs.</p>
                  </div>
                </CardContent>
              </Card>

              {mensagem && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{mensagem}</div>}

              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={abrirComunicado}>
                  <PlayCircle className="mr-2 h-5 w-5" />LER REGRAS E PROSSEGUIR
                </Button>
                <Button variant="outline" onClick={() => setLocation("/avaliacoes")}>Voltar</Button>
              </div>
            </>
          )}
        </div>

        {mostrarComunicado && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
              <div className="sticky top-0 bg-red-700 p-6 text-white">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-9 w-9" />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider">Comunicado obrigatório</p>
                    <h2 className="text-2xl font-bold">Leia todas as regras antes de iniciar a avaliação</h2>
                  </div>
                </div>
              </div>
              <div className="space-y-5 p-6 text-sm leading-relaxed">
                <p className="text-base font-semibold">
                  Ao prosseguir, você declara que está ciente das condições abaixo e concorda em realizar a prova em ambiente monitorado.
                </p>
                <div className="space-y-3">
                  <p><strong>1. Equipamento:</strong> computador com câmera e microfone conectados, ligados e autorizados durante toda a avaliação.</p>
                  <p><strong>2. Tela única:</strong> utilize somente a tela da prova durante a realização.</p>
                  <p><strong>3. Compartilhamento:</strong> selecione exclusivamente <strong>TELA INTEIRA</strong>. Janela ou guia não serão aceitas quando tecnicamente identificáveis.</p>
                  <p><strong>4. Navegação:</strong> trocar de aba, minimizar a janela, perder o foco ou sair da tela cheia gera ocorrência registrada.</p>
                  <p><strong>5. Interrupções:</strong> interromper câmera, microfone ou compartilhamento de tela gera ocorrência para análise administrativa.</p>
                  <p><strong>6. Conteúdo protegido:</strong> tentativas de copiar, imprimir, usar menu de contexto ou capturar conteúdo podem ser registradas pelo navegador.</p>
                  <p><strong>7. Auditoria:</strong> a fotografia de identidade, os aceites e as ocorrências ficam vinculados à tentativa para conferência administrativa.</p>
                  <p><strong>8. Finalização:</strong> ao finalizar a avaliação, a tentativa é encerrada e as respostas registradas são preservadas.</p>
                </div>
                <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      className="mt-1 h-5 w-5"
                      type="checkbox"
                      checked={aceiteComunicado}
                      onChange={event => setAceiteComunicado(event.target.checked)}
                    />
                    <span className="font-semibold text-red-900">
                      LI, COMPREENDI E CONCORDO COM AS REGRAS DE MONITORAMENTO E REALIZAÇÃO DA AVALIAÇÃO.
                    </span>
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setMostrarComunicado(false)}>Cancelar</Button>
                  <Button disabled={!aceiteComunicado} onClick={concluirComunicado}>Continuar</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {mostrarAvisoTela && (
          <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <MonitorUp className="h-9 w-9 shrink-0 text-blue-700" />
                <div>
                  <h2 className="text-xl font-bold">3. Autorize o ambiente monitorado</h2>
                  <p className="mt-2 text-sm leading-relaxed">
                    Ao continuar, o navegador solicitará o compartilhamento da <strong>TELA INTEIRA</strong> e autorização para câmera e microfone.
                    Depois dessas permissões, a avaliação entrará em tela cheia.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
                <strong>Importante:</strong> não selecione uma guia ou apenas uma janela. O teste administrativo segue exatamente esta mesma etapa.
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border p-4">
                <input
                  className="mt-1 h-5 w-5"
                  type="checkbox"
                  checked={aceiteTela}
                  onChange={event => setAceiteTela(event.target.checked)}
                />
                <span className="font-semibold">
                  Estou ciente e vou autorizar tela inteira, câmera e microfone para iniciar a avaliação.
                </span>
              </label>
              {mensagem && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{mensagem}</div>}
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMostrarAvisoTela(false)} disabled={iniciandoAmbiente}>Cancelar</Button>
                <Button disabled={!aceiteTela || iniciandoAmbiente} onClick={() => void iniciarAmbienteMonitorado()}>
                  {iniciandoAmbiente ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MonitorUp className="mr-2 h-4 w-4" />}
                  {iniciandoAmbiente ? "PREPARANDO..." : "AUTORIZAR E INICIAR"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!questao) return null;

  return (
    <div className="prova-protegida min-h-screen bg-slate-50 p-4 md:p-6">
      <style>{`.prova-protegida,.prova-protegida *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}@media print{body *{visibility:hidden!important}.prova-protegida:before{visibility:visible!important;content:'CONTEÚDO PROTEGIDO — IMPRESSÃO NÃO AUTORIZADA';position:fixed;inset:0;display:grid;place-items:center;font-size:24px;font-weight:700}}`}</style>
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

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white p-3 text-xs">
          <span>Ambiente protegido: seleção, cópia, impressão e atalhos bloqueados.</span>
          <Badge variant={violacoes ? "destructive" : "secondary"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge>
        </div>
        {mensagem && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{mensagem}</div>}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="secondary">Questão {indice + 1} de {questoes.length}</Badge>
              {revisandoPendentes && <Badge variant="destructive">Revisão de questões pendentes</Badge>}
            </div>
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
                  onClick={() => void responder(String(questao.id), String(opcao.letra))}
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
          <div className="flex flex-wrap gap-2">
            {totalRespondidas < questoes.length ? (
              <Button onClick={avancar}>
                {revisandoPendentes
                  ? `PRÓXIMA PENDENTE (${questoes.length - totalRespondidas})`
                  : indice < questoes.length - 1
                    ? "Próxima"
                    : `REVISAR ${questoes.length - totalRespondidas} PENDENTE(S)`}
              </Button>
            ) : (
              <Button onClick={finalizar} disabled={finalizarMutation.isPending}>
                {finalizarMutation.isPending ? "FINALIZANDO..." : "FINALIZAR AVALIAÇÃO"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

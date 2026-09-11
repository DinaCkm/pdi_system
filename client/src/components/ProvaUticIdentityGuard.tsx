import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Camera, CheckCircle2, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  children: ReactNode;
};

export default function ProvaUticIdentityGuard({ children }: Props) {
  const { loading, user } = useAuth();
  const identidadeQuery = trpc.provaUtic.estadoIdentidade.useQuery(undefined, {
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
  });
  const registrarMutation = trpc.provaUtic.registrarIdentidade.useMutation();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmadaNestaTela, setConfirmadaNestaTela] = useState(false);

  const pararCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraAtiva(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => pararCamera(), []);

  const ativarCamera = async () => {
    setErro(null);
    setFoto(null);
    setAceite(false);
    pararCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setErro("Este navegador não permite acessar a câmera necessária para confirmar sua identidade.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraAtiva(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      pararCamera();
      setErro("Não foi possível acessar a câmera. Autorize o uso da câmera no navegador e tente novamente.");
    }
  };

  const tirarFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setErro("A câmera ainda não está pronta. Aguarde alguns segundos e tente novamente.");
      return;
    }

    const larguraMaxima = 720;
    const escala = Math.min(1, larguraMaxima / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
    canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      setErro("Não foi possível capturar a fotografia. Tente novamente.");
      return;
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const fotoJpeg = canvas.toDataURL("image/jpeg", 0.82);
    setFoto(fotoJpeg);
    setErro(null);
    pararCamera();
  };

  const confirmarIdentidade = async () => {
    if (!foto || !aceite) return;
    setErro(null);

    try {
      await registrarMutation.mutateAsync({
        fotoDataUrl: foto,
        aceiteDeclaracao: true,
      });
      setConfirmadaNestaTela(true);
      pararCamera();
      await identidadeQuery.refetch();
    } catch (error: any) {
      setErro(error?.message ?? "Não foi possível registrar a confirmação de identidade.");
    }
  };

  if (loading || !user || identidadeQuery.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6 text-sm text-slate-600">
        Verificando identidade do participante...
      </div>
    );
  }

  const estado = identidadeQuery.data as any;
  const identidadeJaConfirmada = confirmadaNestaTela || Boolean(estado?.identidadeConfirmada);
  const precisaConfirmar = Boolean(estado?.necessaria) && !identidadeJaConfirmada;

  if (!precisaConfirmar) return <>{children}</>;

  const nome = String(user.name || "Participante").trim();
  const declaracao = `Declaro que sou ${nome}, participante identificado(a) nesta plataforma, e que sou a pessoa que realizará esta avaliação. Confirmo que esta fotografia foi capturada por mim imediatamente antes do início da prova e poderá ser utilizada exclusivamente para conferência da minha identidade em eventual auditoria do processo avaliativo.`;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <UserCheck className="h-8 w-8 text-blue-700" />
            Confirmação de identidade antes da avaliação
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Antes de iniciar a prova, precisamos registrar uma fotografia atual do participante e sua declaração de identidade.
          </p>
        </div>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-700" />
              1. Tire uma foto agora pela câmera
            </CardTitle>
            <CardDescription>
              A fotografia deve mostrar claramente o rosto do participante que realizará a avaliação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Não fotografe nem envie documentos pessoais.</p>
                  <p className="mt-1">
                    Não solicitamos RG, CNH, passaporte ou qualquer outro documento. A confirmação será feita apenas pela fotografia capturada ao vivo nesta tela e pela declaração abaixo.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-lg border bg-slate-950">
                {foto ? (
                  <img src={foto} alt="Fotografia capturada para confirmação de identidade" className="aspect-video w-full object-cover" />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video w-full object-cover scale-x-[-1]"
                  />
                )}
              </div>

              <div className="flex flex-col justify-center gap-3">
                {!cameraAtiva && !foto && (
                  <Button size="lg" onClick={() => void ativarCamera()}>
                    <Camera className="mr-2 h-5 w-5" />
                    ATIVAR CÂMERA
                  </Button>
                )}

                {cameraAtiva && !foto && (
                  <Button size="lg" onClick={tirarFoto}>
                    <Camera className="mr-2 h-5 w-5" />
                    TIRAR FOTO
                  </Button>
                )}

                {foto && (
                  <>
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-5 w-5" />
                        Fotografia capturada
                      </div>
                      <p className="mt-1">Confira se seu rosto está nítido antes de continuar.</p>
                    </div>
                    <Button variant="outline" onClick={() => void ativarCamera()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      REFAZER FOTO
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              2. Confirme sua declaração de identidade
            </CardTitle>
            <CardDescription>
              O registro será vinculado à tentativa desta avaliação para eventual conferência de auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-5 text-sm leading-7">
              {declaracao}
            </div>

            <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={aceite}
                  onChange={(event) => setAceite(event.target.checked)}
                />
                <span className="font-semibold text-blue-950">
                  LI E CONFIRMO ESTA DECLARAÇÃO DE IDENTIDADE.
                </span>
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              A fotografia é destinada à conferência visual manual em eventual auditoria do processo avaliativo. Este passo não realiza reconhecimento facial automático.
            </p>

            {erro && (
              <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                {erro}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={!foto || !aceite || registrarMutation.isPending}
                onClick={() => void confirmarIdentidade()}
                className="font-semibold"
              >
                <UserCheck className="mr-2 h-5 w-5" />
                {registrarMutation.isPending ? "REGISTRANDO..." : "CONFIRMAR IDENTIDADE E CONTINUAR"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

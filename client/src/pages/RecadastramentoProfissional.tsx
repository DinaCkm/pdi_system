import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { BriefcaseBusiness, CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function RecadastramentoProfissional() {
  const [, setLocation] = useLocation();
  const api = (trpc as any).recadastramentoProfissional;
  const status = api.status.useQuery(undefined, { refetchOnWindowFocus: false });
  const opcoes = api.opcoes.useQuery(undefined, { refetchOnWindowFocus: false });
  const confirmar = api.confirmarPerfil.useMutation();

  const [cargo, setCargo] = useState("");
  const [funcaoId, setFuncaoId] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!status.data) return;
    if (status.data.concluido) {
      setLocation("/dashboard");
      return;
    }
    if (status.data.proximaEtapa === "EIXOS") {
      setLocation("/meus-eixos-tecnicos");
      return;
    }
    if (!cargo && status.data.usuario?.cargoAtual) {
      setCargo(status.data.usuario.cargoAtual);
    }
    if (!funcaoId && status.data.funcaoAtual?.id) {
      setFuncaoId(String(status.data.funcaoAtual.id));
    }
  }, [status.data, cargo, funcaoId, setLocation]);

  const cargos = useMemo(() => opcoes.data?.cargos ?? [], [opcoes.data]);
  const funcoes = useMemo(() => opcoes.data?.funcoes ?? [], [opcoes.data]);

  const salvar = async () => {
    setErro("");
    if (!cargo) {
      setErro("Selecione seu cargo.");
      return;
    }
    if (!funcaoId) {
      setErro("Selecione sua função.");
      return;
    }

    try {
      await confirmar.mutateAsync({
        cargo,
        funcaoId: Number(funcaoId),
      });
      await status.refetch();
      setLocation("/meus-eixos-tecnicos");
    } catch (error: any) {
      setErro(error?.message || "Não foi possível salvar sua atualização.");
    }
  };

  if (status.isLoading || opcoes.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Preparando sua atualização cadastral...
        </div>
      </div>
    );
  }

  if (status.error || opcoes.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Não foi possível carregar seu perfil</CardTitle>
            <CardDescription>
              Tente novamente. Se o problema continuar, procure a administração do PDI-System.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const nome = status.data?.usuario?.nome || "";
  const email = status.data?.usuario?.email || "";

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-primary">Etapa 1 de 2</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Atualize seu Perfil Profissional
          </h1>
          <p className="text-muted-foreground">
            Confirme seu cargo e sua função atual antes de continuar no PDI-System.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              Seus dados
            </CardTitle>
            <CardDescription>
              Cargo e função são informações diferentes. Selecione em cada campo a opção que representa sua situação atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <div className="min-h-10 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {nome || "Não informado"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <div className="min-h-10 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {email || "Não informado"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="cargo" className="text-sm font-medium">
                Cargo
              </label>
              <select
                id="cargo"
                value={cargo}
                onChange={(event) => setCargo(event.target.value)}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Selecione seu cargo...</option>
                {cargos.map((item: string) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Selecione o cargo formal que consta no seu vínculo profissional.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="funcao" className="text-sm font-medium">
                Função
              </label>
              <select
                id="funcao"
                value={funcaoId}
                onChange={(event) => setFuncaoId(event.target.value)}
                className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Selecione sua função...</option>
                {funcoes.map((item: any) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Selecione a função que representa as responsabilidades que você exerce atualmente.
              </p>
            </div>

            {funcoes.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Não há funções disponíveis para seleção. Procure a administração do PDI-System antes de continuar.
              </div>
            )}

            {erro && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {erro}
              </div>
            )}

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <div className="flex gap-3">
                <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">O que acontece depois?</p>
                  <p className="mt-1">
                    Após confirmar seu perfil, você será direcionado para revisar seus Eixos de Conhecimento. O acesso normal ao sistema será liberado somente após concluir as duas etapas.
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={salvar}
              disabled={confirmar.isPending || !cargo || !funcaoId || funcoes.length === 0}
            >
              {confirmar.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar e revisar meus eixos
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

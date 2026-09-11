import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Activity, Clock3, LockKeyhole, RefreshCw, ShieldCheck, Unlock, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AcaoConfirmacao = {
  tipo: "bloquear" | "liberar";
  tentativaId: number;
  colaboradorNome: string;
  status: string;
} | null;

type CredencialTeste = {
  nome: string;
  baseadoEm: string;
  email: string;
  senhaTemporaria: string;
  cargo: string;
  usuarioId: number;
  criadoAgora: boolean;
} | null;

function formatarDuracao(total: number | string | null | undefined) {
  const segundos = Math.max(0, Number(total ?? 0));
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60).toString().padStart(2, "0");
  const segundosFinais = Math.floor(segundos % 60).toString().padStart(2, "0");
  return `${horas}:${minutos}:${segundosFinais}`;
}

function formatarData(valor: unknown) {
  if (!valor) return "—";
  const data = new Date(String(valor));
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString("pt-BR");
}

function formatarUltimaAtividade(total: number | string | null | undefined) {
  const segundos = Math.max(0, Number(total ?? 0));
  if (segundos < 10) return "agora";
  if (segundos < 60) return `${Math.floor(segundos)}s atrás`;
  if (segundos < 3600) return `${Math.floor(segundos / 60)}min atrás`;
  return `${Math.floor(segundos / 3600)}h atrás`;
}

function rotuloStatus(status: string) {
  const rotulos: Record<string, string> = {
    EM_ANDAMENTO: "Em andamento",
    BLOQUEADA: "Bloqueada",
    LIBERADA: "Liberada para continuidade",
    FINALIZADA: "Finalizada pelo participante",
    CONCLUIDA: "Concluída",
    FINALIZADA_TEMPO: "Finalizada por tempo",
    ANULADA: "Anulada",
  };
  return rotulos[status] ?? status;
}

function varianteStatus(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "EM_ANDAMENTO") return "default";
  if (status === "BLOQUEADA" || status === "ANULADA") return "destructive";
  if (status === "LIBERADA") return "secondary";
  return "outline";
}

function rotuloMotivo(motivo: string | null | undefined) {
  const rotulos: Record<string, string> = {
    ADMINISTRADOR: "Bloqueio pelo administrador",
    INATIVIDADE_3_MIN: "Inatividade de 3 minutos",
    FECHAMENTO: "Fechamento ou saída da prova",
    INTERRUPCAO_TECNICA: "Interrupção técnica",
    SEGURANCA: "Ocorrência de segurança",
    FINALIZADA_PELO_PARTICIPANTE: "Finalizada pelo participante",
    TEMPO_TOTAL: "Tempo total encerrado",
  };
  if (!motivo) return "—";
  return rotulos[motivo] ?? motivo;
}

export default function AdminAvaliacoes() {
  const { loading, user } = useAuth();
  const [acao, setAcao] = useState<AcaoConfirmacao>(null);
  const [observacao, setObservacao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [credencialTeste, setCredencialTeste] = useState<CredencialTeste>(null);

  const isAdmin = user?.role === "admin" || user?.role === "Administrador";
  const painelQuery = trpc.provaUtic.listarPainelAdministrativo.useQuery(undefined, {
    enabled: Boolean(user && isAdmin),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const prepararTesteMutation = trpc.provaUticTeste.prepararParticipante.useMutation({
    onSuccess: (data) => {
      setCredencialTeste({
        nome: data.nome,
        baseadoEm: data.baseadoEm,
        email: data.email,
        senhaTemporaria: data.senhaTemporaria,
        cargo: data.cargo,
        usuarioId: data.usuarioId,
        criadoAgora: data.criadoAgora,
      });
      setMensagem(
        data.criadoAgora
          ? "Funcionário de teste UTIC criado com sucesso."
          : "Funcionário de teste UTIC atualizado e recebeu uma nova senha temporária."
      );
    },
    onError: (error) => {
      setCredencialTeste(null);
      setMensagem(error.message);
    },
  });

  const bloquearMutation = trpc.provaUtic.bloquearAdministrativamente.useMutation({
    onSuccess: async () => {
      setMensagem("Avaliação bloqueada pelo administrador.");
      setAcao(null);
      setObservacao("");
      await painelQuery.refetch();
    },
    onError: (error) => setMensagem(error.message),
  });

  const liberarMutation = trpc.provaUtic.liberarContinuacao.useMutation({
    onSuccess: async () => {
      setMensagem("Continuidade liberada. O participante poderá retomar a mesma tentativa.");
      setAcao(null);
      setObservacao("");
      await painelQuery.refetch();
    },
    onError: (error) => setMensagem(error.message),
  });

  const itens = painelQuery.data ?? [];
  const resumo = useMemo(() => ({
    andamento: itens.filter((item: any) => item.status === "EM_ANDAMENTO").length,
    bloqueadas: itens.filter((item: any) => item.status === "BLOQUEADA").length,
    liberadas: itens.filter((item: any) => item.status === "LIBERADA").length,
    finalizadas: itens.filter((item: any) => ["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(item.status)).length,
  }), [itens]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Esta área é exclusiva do administrador do sistema.</p></CardContent>
        </Card>
      </div>
    );
  }

  const confirmarAcao = () => {
    if (!acao) return;
    if (acao.tipo === "bloquear") {
      bloquearMutation.mutate({ tentativaId: acao.tentativaId, observacao: observacao.trim() || undefined });
    } else {
      liberarMutation.mutate({ tentativaId: acao.tentativaId, observacao: observacao.trim() || undefined });
    }
  };

  const processando = bloquearMutation.isPending || liberarMutation.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-700" />
            <div>
              <h1 className="text-2xl font-semibold">Administração das Avaliações</h1>
              <p className="text-sm text-muted-foreground">Controle das tentativas da Avaliação Técnica UTIC.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline"><Activity className="mr-1 h-3.5 w-3.5" />Atualização automática: 2s</Badge>
          <Button variant="outline" onClick={() => painelQuery.refetch()} disabled={painelQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${painelQuery.isFetching ? "animate-spin" : ""}`} />Atualizar agora
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Em andamento</CardDescription><CardTitle className="text-3xl">{resumo.andamento}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Bloqueadas</CardDescription><CardTitle className="text-3xl">{resumo.bloqueadas}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Liberadas</CardDescription><CardTitle className="text-3xl">{resumo.liberadas}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Finalizadas</CardDescription><CardTitle className="text-3xl">{resumo.finalizadas}</CardTitle></CardHeader></Card>
      </div>

      {mensagem && <div className="rounded-md border bg-slate-50 p-4 text-sm">{mensagem}</div>}

      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-700" />Funcionário fake para teste da UTIC</CardTitle>
          <CardDescription>
            O sistema cria uma cópia identificada como teste, baseada no empregado real Daniel Caio Lemos Penno. Cargo, unidade e vínculo de liderança são copiados do cadastro existente; CPF e e-mail reais não são utilizados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => { setMensagem(null); setCredencialTeste(null); prepararTesteMutation.mutate(); }}
            disabled={prepararTesteMutation.isPending}
            className="font-semibold"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {prepararTesteMutation.isPending ? "PREPARANDO..." : "PREPARAR FUNCIONÁRIO DE TESTE UTIC"}
          </Button>

          {credencialTeste && (
            <div className="rounded-lg border-2 border-blue-300 bg-white p-5">
              <p className="text-base font-bold text-blue-900">PARTICIPANTE DE TESTE PRONTO</p>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <p><strong>Nome:</strong> {credencialTeste.nome}</p>
                <p><strong>Cargo:</strong> {credencialTeste.cargo}</p>
                <p><strong>E-mail de acesso:</strong> <span className="font-mono">{credencialTeste.email}</span></p>
                <p><strong>Senha temporária:</strong> <span className="font-mono text-base font-bold">{credencialTeste.senhaTemporaria}</span></p>
              </div>
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                Use estas credenciais em uma janela anônima/privativa do navegador para não encerrar sua sessão de administrador. Esta conta é somente para os testes da avaliação UTIC.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitoramento das tentativas</CardTitle>
          <CardDescription>O bloqueio administrativo impede novas respostas imediatamente. Enquanto a prova estiver bloqueada pelo administrador, o relógio fica pausado. O tempo volta a contar quando o administrador confirma a liberação.</CardDescription>
        </CardHeader>
        <CardContent>
          {painelQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando tentativas...</p>
          ) : itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tentativa registrada no piloto UTIC.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Empregado</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Questões</th>
                    <th className="px-3 py-3 font-medium">Tempo restante</th>
                    <th className="px-3 py-3 font-medium">Última atividade</th>
                    <th className="px-3 py-3 font-medium">Motivo</th>
                    <th className="px-3 py-3 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item: any) => (
                    <tr key={item.id} className="border-b align-top last:border-0">
                      <td className="px-3 py-4">
                        <p className="font-medium">{item.colaboradorNome}</p>
                        <p className="text-xs text-muted-foreground">Tentativa #{item.id}</p>
                        {item.colaboradorEmail && <p className="text-xs text-muted-foreground">{item.colaboradorEmail}</p>}
                      </td>
                      <td className="px-3 py-4"><Badge variant={varianteStatus(item.status)}>{rotuloStatus(item.status)}</Badge></td>
                      <td className="px-3 py-4"><strong>{Number(item.respostasSalvas ?? 0)}</strong> de 60</td>
                      <td className="px-3 py-4">
                        {["EM_ANDAMENTO", "BLOQUEADA", "LIBERADA"].includes(item.status) ? (
                          <div className="flex items-center gap-2 font-mono"><Clock3 className="h-4 w-4" />{formatarDuracao(item.segundosRestantes)}</div>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-4">
                        <p>{formatarUltimaAtividade(item.segundosSemAtividade)}</p>
                        <p className="text-xs text-muted-foreground">{formatarData(item.lastActivityAt)}</p>
                      </td>
                      <td className="px-3 py-4">{rotuloMotivo(item.blockReason)}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          {["EM_ANDAMENTO", "LIBERADA"].includes(item.status) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => { setMensagem(null); setObservacao(""); setAcao({ tipo: "bloquear", tentativaId: Number(item.id), colaboradorNome: item.colaboradorNome, status: item.status }); }}
                            >
                              <LockKeyhole className="mr-1 h-4 w-4" />BLOQUEAR
                            </Button>
                          )}
                          {item.status === "BLOQUEADA" && (
                            <Button
                              size="sm"
                              onClick={() => { setMensagem(null); setObservacao(""); setAcao({ tipo: "liberar", tentativaId: Number(item.id), colaboradorNome: item.colaboradorNome, status: item.status }); }}
                            >
                              <Unlock className="mr-1 h-4 w-4" />LIBERAR CONTINUIDADE
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {acao && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              {acao.tipo === "bloquear" ? <LockKeyhole className="h-8 w-8 shrink-0 text-red-700" /> : <Unlock className="h-8 w-8 shrink-0 text-blue-700" />}
              <div>
                <h2 className="text-xl font-bold">{acao.tipo === "bloquear" ? "Bloquear avaliação agora?" : "Liberar continuidade?"}</h2>
                {acao.tipo === "bloquear" ? (
                  <p className="mt-2 text-sm leading-relaxed">Você está prestes a bloquear a avaliação de <strong>{acao.colaboradorNome}</strong>. O participante não poderá continuar respondendo até nova liberação do administrador. O tempo da prova ficará pausado durante este bloqueio administrativo.</p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed">A mesma tentativa de <strong>{acao.colaboradorNome}</strong> será liberada. As respostas e o histórico permanecem preservados. Se o bloqueio foi administrativo, todo o período bloqueado será devolvido ao tempo restante e o relógio voltará a contar assim que esta liberação for confirmada.</p>
                )}
              </div>
            </div>

            <label className="mt-5 block text-sm font-medium">
              Observação administrativa (opcional)
              <textarea
                className="mt-2 min-h-24 w-full rounded-md border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={observacao}
                onChange={(event) => setObservacao(event.target.value.slice(0, 300))}
                placeholder="Ex.: orientação do fiscal, problema técnico confirmado, ajuste operacional..."
              />
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => { setAcao(null); setObservacao(""); }} disabled={processando}>Cancelar</Button>
              <Button
                variant={acao.tipo === "bloquear" ? "destructive" : "default"}
                onClick={confirmarAcao}
                disabled={processando}
              >
                {acao.tipo === "bloquear" ? "CONFIRMAR BLOQUEIO" : "CONFIRMAR LIBERAÇÃO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

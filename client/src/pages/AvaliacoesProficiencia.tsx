import { CheckCircle2, ClipboardCheck, PlayCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import AdminAplicacoesProficiencia from "./AdminAplicacoesProficiencia";

function formatarData(valor: unknown) {
  if (!valor) return "—";
  // O banco grava em UTC e pode devolver "AAAA-MM-DD HH:MM:SS" sem indicador de fuso.
  // Tratamos esse valor explicitamente como UTC e exibimos no horário de Brasília.
  let texto = String(valor instanceof Date ? valor.toISOString() : valor).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto)) {
    texto = texto.replace(" ", "T") + "Z";
  }
  const data = new Date(texto);
  return Number.isNaN(data.getTime())
    ? String(valor)
    : data.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      });
}

export default function AvaliacoesProficiencia() {
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "Administrador";
  const minhasQuery = trpc.aplicacoesProficiencia.minhasAplicacoes.useQuery(undefined, {
    enabled: Boolean(user && !isAdmin),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verificando acesso...</div>;
  if (isAdmin) return <AdminAplicacoesProficiencia />;

  const aplicacoes = (minhasQuery.data ?? []) as any[];

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><ClipboardCheck className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Avaliações</h1></div>
        <p className="max-w-3xl text-sm text-muted-foreground">As aplicações agendadas aparecem nesta área para que você conclua a orientação obrigatória. A prova somente poderá ser iniciada depois da liberação administrativa.</p>
      </div>

      {minhasQuery.isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Verificando avaliações liberadas...</CardContent></Card>
      ) : minhasQuery.error ? (
        <Card className="border-red-200"><CardContent className="p-6 text-sm text-red-800">{minhasQuery.error.message}</CardContent></Card>
      ) : aplicacoes.length === 0 ? (
        <Card><CardHeader><CardTitle>Nenhuma avaliação liberada</CardTitle><CardDescription>Não há aplicação disponível para início neste momento.</CardDescription></CardHeader></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {aplicacoes.map((item: any) => {
            const encerrada = ["FINALIZADA", "FINALIZADA_TEMPO"].includes(String(item.tentativaStatus));
            const liberada = String(item.status) === "LIBERADA";
            const orientacaoConcluida = Boolean(Number(item.orientacaoConcluida));
            const emAndamento = Boolean(item.tentativaId) && !encerrada;
            const badge = encerrada
              ? "Finalizada"
              : emAndamento
                ? "Em andamento"
                : liberada
                  ? orientacaoConcluida ? "Liberada" : "Liberada — orientação pendente"
                  : orientacaoConcluida ? "Orientação concluída — aguardando liberação" : "Orientação disponível";

            return (
              <Card key={item.id} className={encerrada ? "border-green-200" : "border-blue-200"}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><CardTitle>{item.titulo}</CardTitle><CardDescription>{item.provaNome} — {item.provaUnidade}</CardDescription></div>
                    <Badge variant={encerrada ? "secondary" : "default"}>{badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm sm:grid-cols-2"><p><strong>Data prevista:</strong> {formatarData(item.agendadaPara)}</p><p><strong>Questões:</strong> {Number(item.totalQuestoes || 0)}</p></div>
                  {encerrada ? (
                    <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><span>Avaliação finalizada. Aguarde o cálculo dos resultados pelo administrador.</span></div>
                  ) : !liberada && orientacaoConcluida ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>Orientação obrigatória concluída. Aguarde a liberação administrativa da avaliação. Você não precisará assistir ao vídeo novamente.</span>
                      </div>
                      <Button variant="outline" onClick={() => setLocation(`/avaliacoes/proficiencia/${Number(item.id)}`)}>
                        VER SITUAÇÃO DA AVALIAÇÃO
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setLocation(`/avaliacoes/proficiencia/${Number(item.id)}`)}>
                      <PlayCircle className="mr-2 h-5 w-5" />
                      {item.tentativaId
                        ? "CONTINUAR AVALIAÇÃO"
                        : !orientacaoConcluida
                          ? "ASSISTIR ORIENTAÇÃO OBRIGATÓRIA"
                          : "INICIAR AVALIAÇÃO"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

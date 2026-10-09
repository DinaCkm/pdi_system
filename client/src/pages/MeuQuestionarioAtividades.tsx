import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Save } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const grupoLabel: Record<string, string> = {
  funcao: "Atividades e responsabilidades da função",
  contexto: "Contexto da atuação",
  desenvolvimento: "Formação e desenvolvimento",
};

const grupoOrdem = ["funcao", "contexto", "desenvolvimento"];

export default function MeuQuestionarioAtividades() {
  const ano = new Date().getFullYear();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const consulta = trpc.questionarioAtividades.meu.useQuery({ ano }, { refetchOnWindowFocus: false });
  const salvar = trpc.questionarioAtividades.salvarMeu.useMutation();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!consulta.data) return;
    const mapa: Record<string, string> = {};
    for (const pergunta of consulta.data.perguntas ?? []) mapa[pergunta.chave] = pergunta.resposta ?? "";
    setRespostas(mapa);
    setConcluido(Boolean(consulta.data.questionario));
  }, [consulta.data]);

  const grupos = useMemo(() => {
    const perguntas = consulta.data?.perguntas ?? [];
    return grupoOrdem
      .map((grupo) => ({ grupo, perguntas: perguntas.filter((pergunta) => pergunta.grupo === grupo) }))
      .filter((item) => item.perguntas.length > 0);
  }, [consulta.data?.perguntas]);

  const salvarQuestionario = async () => {
    const perguntas = consulta.data?.perguntas ?? [];
    const faltantes = perguntas.filter((pergunta) => !String(respostas[pergunta.chave] ?? "").trim());
    if (faltantes.length > 0) {
      toast.error(`Responda todas as perguntas antes de concluir. Faltam ${faltantes.length} resposta(s).`);
      return;
    }

    try {
      await salvar.mutateAsync({
        ano,
        respostas: perguntas.map((pergunta) => ({
          chave: pergunta.chave,
          resposta: String(respostas[pergunta.chave] ?? "").trim(),
        })),
      });
      await utils.questionarioAtividades.meu.invalidate();
      setConcluido(true);
      toast.success("Questionário salvo e analisado. Agora revise seus eixos técnicos.");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível concluir o questionário.");
    }
  };

  if (consulta.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando seu questionário...</div>;
  }

  if (consulta.error) {
    return <div className="p-6 text-sm text-red-700">{consulta.error.message}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold">Meu Questionário de Atividades</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Esta etapa ajuda a identificar quais conhecimentos técnicos são essenciais, transversais ou não essenciais para a sua função.
          Responda considerando as atividades que você realmente executa.
        </p>
      </div>

      {concluido && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3 text-green-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Questionário registrado</p>
                <p className="text-sm">Você pode revisar as respostas ou seguir para a validação dos seus eixos técnicos.</p>
              </div>
            </div>
            <Button onClick={() => setLocation("/meus-eixos-tecnicos")}>IR PARA MEUS EIXOS TÉCNICOS</Button>
          </CardContent>
        </Card>
      )}

      {grupos.map((grupo, indice) => (
        <Card key={grupo.grupo}>
          <CardHeader>
            <CardTitle>{indice + 1}. {grupoLabel[grupo.grupo]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {grupo.perguntas.map((pergunta) => (
              <div key={pergunta.chave} className="space-y-2">
                <Label className="text-base">{pergunta.titulo}</Label>
                <p className="text-sm text-muted-foreground">{pergunta.pergunta}</p>
                <Textarea
                  value={respostas[pergunta.chave] ?? ""}
                  onChange={(event) => setRespostas((atual) => ({ ...atual, [pergunta.chave]: event.target.value }))}
                  rows={4}
                  placeholder="Escreva sua resposta..."
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button onClick={salvarQuestionario} disabled={salvar.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {salvar.isPending ? "SALVANDO E ANALISANDO..." : "SALVAR E CONTINUAR"}
        </Button>
        {concluido && <Button variant="outline" onClick={() => setLocation("/meus-eixos-tecnicos")}>IR PARA MEUS EIXOS TÉCNICOS</Button>}
      </div>
    </div>
  );
}

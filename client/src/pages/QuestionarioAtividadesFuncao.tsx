import { useEffect, useMemo, useState } from "react";
import { FileText, History, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StatusQuestionario = "rascunho" | "preenchido" | "validado";
type FonteQuestionario = "manual" | "importado_historico";
type ClassificacaoEixo = "ESSENCIAL" | "NAO_ESSENCIAL" | "TRANSVERSAL";

const grupoLabel: Record<string, string> = {
  funcao: "Atividades e responsabilidades da função",
  contexto: "Contexto da atuação",
  desenvolvimento: "Formação e desenvolvimento",
};

const grupoOrdem = ["funcao", "contexto", "desenvolvimento"];

export default function QuestionarioAtividadesFuncao() {
  const [colaboradorId, setColaboradorId] = useState("");
  const [ano, setAno] = useState("2025");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusQuestionario>("rascunho");
  const [fonte, setFonte] = useState<FonteQuestionario>("importado_historico");
  const [arquivoOrigemNome, setArquivoOrigemNome] = useState("");
  const [arquivoOrigemUrl, setArquivoOrigemUrl] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [eixosTecnicos, setEixosTecnicos] = useState<Record<string, { classificacao: ClassificacaoEixo | ""; justificativa: string }>>({});

  const utils = trpc.useUtils();
  const empregados = trpc.questionarioAtividades.empregados.useQuery();

  const questionario = trpc.questionarioAtividades.get.useQuery(
    {
      colaboradorId: Number(colaboradorId || 0),
      ano: Number(ano),
    },
    {
      enabled: Boolean(colaboradorId) && Number(ano) > 0,
    },
  );

  const eixos = trpc.questionarioAtividades.eixosTecnicos.useQuery(
    {
      colaboradorId: Number(colaboradorId || 0),
      ano: Number(ano),
    },
    {
      enabled: Boolean(colaboradorId) && Number(ano) > 0,
    },
  );

  const historico = trpc.questionarioAtividades.historico.useQuery(
    { questionarioId: Number(questionario.data?.questionario?.id || 0) },
    {
      enabled: Boolean(questionario.data?.questionario?.id) && mostrarHistorico,
    },
  );

  useEffect(() => {
    const mapa: Record<string, { classificacao: ClassificacaoEixo | ""; justificativa: string }> = {};
    for (const eixo of eixos.data?.eixos ?? []) {
      mapa[eixo.eixoChave] = {
        classificacao: (eixo.classificacao as ClassificacaoEixo | null) ?? "",
        justificativa: eixo.justificativa ?? "",
      };
    }
    setEixosTecnicos(mapa);
  }, [eixos.data]);

  useEffect(() => {
    if (!questionario.data) return;

    const q = questionario.data.questionario;
    setStatus((q?.status as StatusQuestionario) || "rascunho");
    setFonte((q?.fonte as FonteQuestionario) || "importado_historico");
    setArquivoOrigemNome(q?.arquivoOrigemNome || "");
    setArquivoOrigemUrl(q?.arquivoOrigemUrl || "");
    setObservacoes(q?.observacoes || "");

    const mapa: Record<string, string> = {};
    for (const pergunta of questionario.data.perguntas) {
      mapa[pergunta.chave] = pergunta.resposta || "";
    }
    setRespostas(mapa);
  }, [questionario.data]);

  const empregadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const dados = empregados.data ?? [];
    if (!termo) return dados;

    return dados.filter((item: any) =>
      [item.nome, item.cargo, item.departamentoNome]
        .filter(Boolean)
        .some((valor) => String(valor).toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [empregados.data, busca]);

  const empregadoSelecionado = useMemo(
    () =>
      (empregados.data ?? []).find(
        (item: any) => Number(item.id) === Number(colaboradorId),
      ) ?? null,
    [empregados.data, colaboradorId],
  );

  const grupos = useMemo(() => {
    const perguntas = questionario.data?.perguntas ?? [];
    return grupoOrdem
      .map((grupo) => ({
        grupo,
        perguntas: perguntas.filter((pergunta) => pergunta.grupo === grupo),
      }))
      .filter((item) => item.perguntas.length > 0);
  }, [questionario.data?.perguntas]);

  const salvarEixosMutation = trpc.questionarioAtividades.salvarEixosTecnicos.useMutation({
    onSuccess: async () => {
      toast.success("Eixos técnicos salvos com origem no questionário.");
      await utils.questionarioAtividades.eixosTecnicos.invalidate();
      await utils.questionarioAtividades.historico.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível salvar os eixos técnicos.");
    },
  });

  const salvarMutation = trpc.questionarioAtividades.save.useMutation({
    onSuccess: async () => {
      toast.success("Questionário salvo com histórico preservado.");
      await utils.questionarioAtividades.get.invalidate();
      if (questionario.data?.questionario?.id) {
        await utils.questionarioAtividades.historico.invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível salvar o questionário.");
    },
  });

  const salvar = (statusDestino: StatusQuestionario) => {
    if (!colaboradorId) {
      toast.error("Selecione um empregado.");
      return;
    }

    salvarMutation.mutate({
      colaboradorId: Number(colaboradorId),
      ano: Number(ano),
      status: statusDestino,
      fonte,
      arquivoOrigemNome: arquivoOrigemNome.trim() || null,
      arquivoOrigemUrl: arquivoOrigemUrl.trim() || null,
      observacoes: observacoes.trim() || null,
      respostas: (questionario.data?.perguntas ?? []).map((pergunta) => ({
        chave: pergunta.chave,
        resposta: respostas[pergunta.chave] ?? "",
      })),
    });
  };

  const salvarEixos = () => {
    const prova = eixos.data?.prova;
    if (!prova) {
      toast.error("Não há prova aplicada para este empregado no período selecionado.");
      return;
    }
    if (!eixos.data?.questionarioId) {
      toast.error("Salve o questionário antes de classificar os eixos técnicos.");
      return;
    }

    salvarEixosMutation.mutate({
      colaboradorId: Number(colaboradorId),
      ano: Number(ano),
      provaId: prova.provaId,
      aplicacaoId: prova.aplicacaoId,
      origemProvaChave: prova.origemProvaChave,
      eixos: (eixos.data?.eixos ?? []).map((eixo) => ({
        eixoChave: eixo.eixoChave,
        eixoNome: eixo.eixoNome,
        classificacao: eixosTecnicos[eixo.eixoChave]?.classificacao || null,
        justificativa: eixosTecnicos[eixo.eixoChave]?.justificativa?.trim() || null,
      })),
    });
  };

  const statusLabel: Record<StatusQuestionario, string> = {
    rascunho: "Rascunho",
    preenchido: "Preenchido",
    validado: "Validado",
  };

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Questionário de Atividades da Função</h1>
        <p className="text-muted-foreground max-w-4xl mt-1">
          Base individual para auditoria dos eixos técnicos. As respostas devem refletir as
          atividades efetivamente declaradas pelo empregado e não uma descrição genérica da unidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar empregado e período</CardTitle>
          <CardDescription>
            Os questionários históricos de 2025 podem ser transcritos dos arquivos originais sem alterar a matriz técnica atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar empregado, cargo ou unidade..."
          />

          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <Select
              value={colaboradorId}
              onValueChange={(value) => {
                setColaboradorId(value);
                setMostrarHistorico(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empregado" />
              </SelectTrigger>
              <SelectContent>
                {empregadosFiltrados.map((item: any) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.nome} — {item.cargo || "Sem cargo"} — {item.departamentoNome || "Sem unidade"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {colaboradorId && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{empregadoSelecionado?.nome || "Empregado"}</CardTitle>
                  <CardDescription className="mt-1">
                    {empregadoSelecionado?.cargo || "Sem cargo"} · {empregadoSelecionado?.departamentoNome || "Sem unidade"}
                  </CardDescription>
                </div>
                <Badge variant={status === "validado" ? "default" : "secondary"}>
                  {statusLabel[status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Origem do questionário</Label>
                  <Select value={fonte} onValueChange={(value) => setFonte(value as FonteQuestionario)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="importado_historico">Questionário histórico importado</SelectItem>
                      <SelectItem value="manual">Preenchimento manual no sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome do arquivo de origem</Label>
                  <Input
                    value={arquivoOrigemNome}
                    onChange={(event) => setArquivoOrigemNome(event.target.value)}
                    placeholder="Ex.: JOSEANE RODRIGUES LEITE_QUESTIONARIO.pdf"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Link do arquivo de origem</Label>
                <Input
                  value={arquivoOrigemUrl}
                  onChange={(event) => setArquivoOrigemUrl(event.target.value)}
                  placeholder="Link do arquivo original no Google Drive"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações da auditoria</Label>
                <Textarea
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  rows={3}
                  placeholder="Registre observações importantes sobre a fonte ou a validação."
                />
              </div>
            </CardContent>
          </Card>

          {questionario.isLoading ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Carregando questionário...
              </CardContent>
            </Card>
          ) : (
            grupos.map((grupo, indice) => (
              <Card key={grupo.grupo}>
                <CardHeader>
                  <CardTitle>{indice + 2}. {grupoLabel[grupo.grupo]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {grupo.perguntas.map((pergunta) => (
                    <div key={pergunta.chave} className="space-y-2">
                      <Label className="text-base">{pergunta.titulo}</Label>
                      <p className="text-sm text-muted-foreground">{pergunta.pergunta}</p>
                      <Textarea
                        value={respostas[pergunta.chave] ?? ""}
                        onChange={(event) =>
                          setRespostas((atual) => ({
                            ...atual,
                            [pergunta.chave]: event.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Transcreva a resposta original do empregado."
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}

          <Card>
            <CardHeader>
              <CardTitle>Eixos Técnicos do Empregado</CardTitle>
              <CardDescription>
                A prova aplicada fornece somente a lista oficial de eixos. A classificação Essencial, Não Essencial ou Transversal deve ser feita exclusivamente pela leitura deste Questionário de Atividades/Função.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eixos.isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando eixos da prova aplicada...</div>
              ) : !eixos.data?.prova ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  {eixos.data?.aviso || "Nenhuma prova aplicada foi encontrada para este empregado no período selecionado."}
                </div>
              ) : (
                <>
                  <div className="rounded-md border p-4 text-sm space-y-1">
                    <div><span className="font-medium">Prova que fornece os eixos:</span> {eixos.data.prova.nome}</div>
                    <div><span className="font-medium">Aplicação:</span> {eixos.data.prova.aplicacaoTitulo}</div>
                    <div><span className="font-medium">Origem da classificação:</span> Questionário de Atividades/Função</div>
                    <div className="text-muted-foreground">
                      A prova não define a importância do eixo para a função; ela apenas informa quais eixos foram avaliados.
                    </div>
                  </div>

                  {(eixos.data.eixos ?? []).length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">
                      A prova aplicada não possui eixos técnicos identificáveis no snapshot preservado.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(eixos.data.eixos ?? []).map((eixo) => {
                        const atual = eixosTecnicos[eixo.eixoChave] ?? { classificacao: "", justificativa: "" };
                        return (
                          <div key={eixo.eixoChave} className="rounded-md border p-4 space-y-3">
                            <div className="font-medium">{eixo.eixoNome}</div>
                            <div className="grid gap-3 md:grid-cols-[260px_1fr]">
                              <div className="space-y-2">
                                <Label>Classificação funcional</Label>
                                <Select
                                  value={atual.classificacao || "PENDENTE"}
                                  onValueChange={(value) =>
                                    setEixosTecnicos((estado) => ({
                                      ...estado,
                                      [eixo.eixoChave]: {
                                        ...atual,
                                        classificacao: value === "PENDENTE" ? "" : (value as ClassificacaoEixo),
                                      },
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                                    <SelectItem value="ESSENCIAL">Essencial</SelectItem>
                                    <SelectItem value="NAO_ESSENCIAL">Não Essencial</SelectItem>
                                    <SelectItem value="TRANSVERSAL">Transversal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Justificativa baseada no questionário</Label>
                                <Textarea
                                  value={atual.justificativa}
                                  onChange={(event) =>
                                    setEixosTecnicos((estado) => ({
                                      ...estado,
                                      [eixo.eixoChave]: {
                                        ...atual,
                                        justificativa: event.target.value,
                                      },
                                    }))
                                  }
                                  rows={3}
                                  placeholder="Registre o que no questionário sustenta esta classificação. Não use o resultado da prova como justificativa."
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={salvarEixos}
                    disabled={
                      salvarEixosMutation.isPending ||
                      !eixos.data?.questionarioId ||
                      (eixos.data?.eixos ?? []).length === 0
                    }
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar classificação dos eixos
                  </Button>

                  {!eixos.data?.questionarioId && (
                    <p className="text-sm text-muted-foreground">
                      Para preservar a rastreabilidade, salve primeiro o questionário. Depois a classificação ficará vinculada a esta versão e à prova realmente aplicada.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validação e rastreabilidade</CardTitle>
              <CardDescription>
                O questionário é a fonte da classificação funcional dos eixos. Toda alteração fica vinculada ao empregado, ao período e ao histórico desta análise.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => salvar("rascunho")}
                  disabled={salvarMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar rascunho
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => salvar("preenchido")}
                  disabled={salvarMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Marcar como preenchido
                </Button>
                <Button
                  onClick={() => salvar("validado")}
                  disabled={salvarMutation.isPending}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Validar questionário
                </Button>

                {questionario.data?.questionario?.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setMostrarHistorico((atual) => !atual)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    {mostrarHistorico ? "Ocultar histórico" : "Ver histórico"}
                  </Button>
                )}
              </div>

              {mostrarHistorico && (
                <div className="rounded-md border">
                  {historico.isLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Carregando histórico...</div>
                  ) : (historico.data ?? []).length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Nenhuma alteração registrada.</div>
                  ) : (
                    <div className="divide-y">
                      {(historico.data ?? []).map((item: any) => (
                        <div key={item.id} className="p-4 text-sm">
                          <div className="font-medium">{item.campo}</div>
                          <div className="text-muted-foreground mt-1">
                            Alterado por {item.alteradoPorNome || item.alteradoPor} em {String(item.createdAt)}
                          </div>
                          <div className="grid gap-2 mt-2 md:grid-cols-2">
                            <div>
                              <span className="font-medium">Antes:</span>{" "}
                              {item.valorAnterior || "—"}
                            </div>
                            <div>
                              <span className="font-medium">Depois:</span>{" "}
                              {item.valorNovo || "—"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

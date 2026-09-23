import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { macroRelacionadaDaAD } from "../../../shared/competenciasAdRelacionamento";

const relacaoLabel: Record<string, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_ESSENCIAL: "Não essencial",
};

const evolucaoLabel: Record<string, string> = {
  EVOLUCAO: "Evolução",
  ESTABILIDADE: "Estabilidade",
  REDUCAO: "Redução",
  SEM_COMPARACAO: "Sem comparação",
};

export default function Bloco1CompetenciasFuncao() {
  const [, navigate] = useLocation();
  const [colaboradorId, setColaboradorId] = useState("");
  const [busca, setBusca] = useState("");
  const [eixoAberto, setEixoAberto] = useState<number | null>(null);
  const [statusEdicao, setStatusEdicao] = useState<"CLASSIFICADO" | "PENDENTE">("CLASSIFICADO");
  const [relacaoEdicao, setRelacaoEdicao] = useState<"ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | "">("");
  const [justificativaEdicao, setJustificativaEdicao] = useState("");
  const [motivoEdicao, setMotivoEdicao] = useState("Revisão da classificação do eixo técnico");
  const [mensagemEdicao, setMensagemEdicao] = useState("");

  const empregados = trpc.bloco1CompetenciasFuncao.empregados.useQuery();
  const pdis = trpc.pdis.list.useQuery();
  const mapa = trpc.bloco1CompetenciasFuncao.mapaIndividual.useQuery(
    { colaboradorId: Number(colaboradorId || 0) },
    { enabled: Boolean(colaboradorId) },
  );

  const salvarEixoMutation = (trpc as any).questionarioAtividades.salvarEixosTecnicos.useMutation({
    onSuccess: async () => {
      await mapa.refetch();
      setMensagemEdicao("Classificação e justificativa atualizadas com histórico preservado.");
    },
    onError: (error: any) => {
      setMensagemEdicao(error?.message || "Não foi possível salvar a alteração.");
    },
  });

  const abrirJustificativa = (item: any) => {
    const id = Number(item.eixoRegistroId);
    if (eixoAberto === id) {
      setEixoAberto(null);
      setMensagemEdicao("");
      return;
    }
    setEixoAberto(id);
    setStatusEdicao(item.statusClassificacao === "PENDENTE" ? "PENDENTE" : "CLASSIFICADO");
    setRelacaoEdicao(item.classificacao || "");
    setJustificativaEdicao(item.justificativa || "");
    setMotivoEdicao("Revisão da classificação do eixo técnico");
    setMensagemEdicao("");
  };

  const salvarJustificativa = async (item: any) => {
    const tecnico = mapa.data?.tecnico;
    if (!tecnico?.questionarioId || !tecnico?.provaHistoricaId || !tecnico?.origemProvaChave || !tecnico?.anoQuestionario) {
      setMensagemEdicao("Registro histórico regional ainda não está completo para este empregado.");
      return;
    }
    if (statusEdicao === "CLASSIFICADO" && !relacaoEdicao) {
      setMensagemEdicao("Selecione Essencial, Transversal ou Não essencial.");
      return;
    }
    if (statusEdicao === "CLASSIFICADO" && justificativaEdicao.trim().length < 3) {
      setMensagemEdicao("Informe a justificativa com base no Questionário de Atividades/Função.");
      return;
    }

    const eixos = tecnico.competencias.map((eixo: any) => ({
      eixoChave: String(eixo.eixoChave || eixo.eixoId),
      eixoNome: String(eixo.eixoNome),
      classificacao:
        Number(eixo.eixoRegistroId) === Number(item.eixoRegistroId)
          ? (statusEdicao === "PENDENTE" ? null : relacaoEdicao)
          : (eixo.statusClassificacao === "PENDENTE" ? null : eixo.classificacao),
      justificativa:
        Number(eixo.eixoRegistroId) === Number(item.eixoRegistroId)
          ? (justificativaEdicao.trim() || null)
          : (eixo.justificativa || null),
    }));

    await salvarEixoMutation.mutateAsync({
      colaboradorId: Number(colaboradorId),
      ano: Number(tecnico.anoQuestionario),
      provaId: Number(tecnico.provaHistoricaId),
      aplicacaoId: null,
      origemProvaChave: String(tecnico.origemProvaChave),
      motivoAlteracao: motivoEdicao.trim(),
      eixos,
    });
  };

  const empregadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const dados = empregados.data ?? [];
    if (!termo) return dados;
    return dados.filter((u: any) =>
      [u.nome, u.cargo, u.funcaoNome, u.departamentoNome]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [empregados.data, busca]);

  const pdiDoEmpregado = useMemo(() => {
    if (!colaboradorId) return null;
    return (pdis.data ?? []).find(
      (pdi: any) => Number(pdi.colaboradorId) === Number(colaboradorId),
    ) ?? null;
  }, [pdis.data, colaboradorId]);

  const abrirBiblioteca = (eixo: string, macroId?: number | null, macroRelacionada?: string | null) => {
    const params = new URLSearchParams();
    if (pdiDoEmpregado?.pdiId) params.set("pdiId", String(pdiDoEmpregado.pdiId));
    if (eixo) params.set("eixo", eixo);
    if (macroId) params.set("macroId", String(macroId));
    if (macroRelacionada) params.set("macroRelacionada", macroRelacionada);
    params.set("origem", "evolucao_individual");
    params.set("modo", "biblioteca");
    navigate(`/acoes/nova?${params.toString()}`);
  };

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Evolução Individual</h1>
        <p className="text-muted-foreground max-w-4xl">
          A análise é individual. O objetivo é acompanhar se houve desenvolvimento das competências
          técnicas e comportamentais após as ações do PDI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar empregado</CardTitle>
          <CardDescription>
            A função organizacional é contexto da análise, mas não determina sozinha as competências da pessoa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por empregado, função, cargo ou unidade..."
          />
          <Select value={colaboradorId} onValueChange={setColaboradorId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o empregado" />
            </SelectTrigger>
            <SelectContent>
              {empregadosFiltrados.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nome} — {u.funcaoNome || u.cargo || "Sem função"} — {u.departamentoNome || "Sem unidade"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {mapa.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{mapa.data.empregado.nome}</CardTitle>
              <CardDescription>
                Função: {mapa.data.empregado.funcaoNome || "Não vinculada"} · Cargo: {mapa.data.empregado.cargo || "—"} ·
                Unidade: {mapa.data.empregado.departamentoNome || "—"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Competências Técnicas</CardTitle>
              <CardDescription>
                A classificação funcional vem do Questionário de Atividades/Função. O indicador anterior é o marco zero da prova histórica regional.
                O resultado atual somente será preenchido pela Prova 2, quando ela for aplicada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eixo / competência técnica</TableHead>
                      <TableHead>Classificação individual</TableHead>
                      <TableHead>Histórico (marco zero)</TableHead>
                      <TableHead>Prova 2</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.tecnico.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum registro histórico regional vinculado ao Questionário de Atividades/Função foi localizado para este empregado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mapa.data.tecnico.competencias.map((item: any) => (
                        <>
                        <TableRow key={item.eixoRegistroId}>
                          <TableCell className="font-medium">{item.eixoNome}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={item.statusClassificacao === "PENDENTE" ? "secondary" : item.classificacao === "ESSENCIAL" ? "default" : "outline"}>
                                {item.statusClassificacao === "PENDENTE"
                                  ? "Pendente"
                                  : relacaoLabel[item.classificacao] || item.classificacao || "Sem classificação"}
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={() => abrirJustificativa(item)}>
                                {eixoAberto === Number(item.eixoRegistroId) ? "Fechar" : "Ver / editar justificativa"}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.percentualAnterior === null ? "—" : `${Number(item.percentualAnterior).toFixed(1)}%`}
                          </TableCell>
                          <TableCell>
                            {item.percentualAtual === null ? "Aguardando Prova 2" : `${Number(item.percentualAtual).toFixed(1)}%`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.evolucao === "EVOLUCAO"
                                  ? "default"
                                  : item.evolucao === "SEM_COMPARACAO"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {item.evolucao === "SEM_COMPARACAO"
                                ? "Aguardando Prova 2"
                                : `${evolucaoLabel[item.evolucao] || item.evolucao} ${item.evolucaoPp === null ? "" : `(${Number(item.evolucaoPp) > 0 ? "+" : ""}${Number(item.evolucaoPp).toFixed(1)} p.p.)`}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => abrirBiblioteca(item.eixoNome)}>
                              Criar ação no PDI
                            </Button>
                          </TableCell>
                        </TableRow>
                        {eixoAberto === Number(item.eixoRegistroId) && (
                          <TableRow key={`${item.eixoRegistroId}-justificativa`}>
                            <TableCell colSpan={6} className="bg-muted/20">
                              <div className="grid gap-4 p-3 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-medium">
                                  Situação da análise
                                  <select
                                    value={statusEdicao}
                                    onChange={(event) => {
                                      const valor = event.target.value as "CLASSIFICADO" | "PENDENTE";
                                      setStatusEdicao(valor);
                                      if (valor === "PENDENTE") setRelacaoEdicao("");
                                    }}
                                    className="h-10 w-full rounded-md border bg-background px-3 font-normal"
                                  >
                                    <option value="CLASSIFICADO">Classificado</option>
                                    <option value="PENDENTE">Pendente de análise</option>
                                  </select>
                                </label>
                                <label className="space-y-2 text-sm font-medium">
                                  Classificação
                                  <select
                                    value={relacaoEdicao}
                                    disabled={statusEdicao === "PENDENTE"}
                                    onChange={(event) => setRelacaoEdicao(event.target.value as any)}
                                    className="h-10 w-full rounded-md border bg-background px-3 font-normal"
                                  >
                                    <option value="">Selecione</option>
                                    <option value="ESSENCIAL">Essencial</option>
                                    <option value="TRANSVERSAL">Transversal</option>
                                    <option value="NAO_ESSENCIAL">Não essencial</option>
                                  </select>
                                </label>
                                <label className="space-y-2 text-sm font-medium md:col-span-2">
                                  Justificativa da classificação
                                  <textarea
                                    value={justificativaEdicao}
                                    onChange={(event) => setJustificativaEdicao(event.target.value)}
                                    rows={4}
                                    className="w-full rounded-md border bg-background p-3 font-normal"
                                    placeholder="Explique por que este eixo é Essencial, Transversal ou Não essencial para este empregado."
                                  />
                                </label>
                                <label className="space-y-2 text-sm font-medium md:col-span-2">
                                  Motivo da alteração
                                  <Input value={motivoEdicao} onChange={(event) => setMotivoEdicao(event.target.value)} />
                                </label>
                                <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                                  <Button
                                    size="sm"
                                    onClick={() => salvarJustificativa(item)}
                                    disabled={salvarEixoMutation.isPending}
                                  >
                                    {salvarEixoMutation.isPending ? "Salvando..." : "Salvar classificação e justificativa"}
                                  </Button>
                                  {mensagemEdicao && <span className="text-sm text-muted-foreground">{mensagemEdicao}</span>}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Competências Comportamentais — Evolução 2024 × 2025</CardTitle>
              <CardDescription>
                Nesta etapa, a evolução considera exclusivamente a mesma competência comportamental
                medida em 2024 e 2025. O DISC não participa deste cálculo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência comportamental</TableHead>
                      <TableHead>2024</TableHead>
                      <TableHead>2025</TableHead>
                      <TableHead>Variação</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.comportamental.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma competência comportamental comparável localizada para este empregado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mapa.data.comportamental.competencias.map((item: any) => (
                        <TableRow key={item.competenciaMacroId}>
                          <TableCell className="font-medium">
                            <div>{item.competenciaNome || "—"}</div>
                            {macroRelacionadaDaAD(item.competenciaNome) ? (
                              <div className="mt-1 text-xs font-normal text-muted-foreground">
                                Macrocompetência relacionada para ações: {macroRelacionadaDaAD(item.competenciaNome)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {item.resultado2024 === null ? "—" : Number(item.resultado2024).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.resultado2025 === null ? "—" : Number(item.resultado2025).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.variacao === null
                              ? "—"
                              : `${Number(item.variacao) > 0 ? "+" : ""}${Number(item.variacao).toFixed(2)}`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.evolucao === "EVOLUCAO"
                                  ? "default"
                                  : item.evolucao === "SEM_COMPARACAO"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {evolucaoLabel[item.evolucao] || item.evolucao}
                            </Badge>
                            {!item.comparavel && item.motivo ? (
                              <div className="text-xs text-muted-foreground mt-1">{item.motivo}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirBiblioteca(
                                item.competenciaNome || "",
                                Number(item.competenciaMacroId),
                                macroRelacionadaDaAD(item.competenciaNome),
                              )}
                            >
                              Criar ação no PDI
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                A criação de nova ação permanece disponível em qualquer resultado de evolução.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regra metodológica aplicada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Técnicas:</strong> Questionário de Atividades/Função = classificação funcional; prova histórica regional = indicador original (marco zero); Prova 2 = indicador atual; evolução = Prova 2 − histórico.</p>
              <p><strong>Comportamentais:</strong> comparar a mesma competência entre 2024 e 2025.</p>
              <p><strong>Leitura:</strong> resultado maior = evolução; resultado igual = estabilidade; resultado menor = redução.</p>
              <p><strong>PDI:</strong> estabilidade ou redução sinaliza necessidade de atenção, mas a criação de nova ação permanece disponível em qualquer resultado, inclusive quando houve evolução.</p>
              <p><strong>DISC:</strong> não participa do cálculo atual; fica reservado para funcionalidade futura.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

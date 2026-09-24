import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { macroRelacionadaDaAD } from "../../../shared/competenciasAdRelacionamento";
import { ChevronDown, ChevronUp, Sparkles, ShieldCheck, Target, TrendingUp } from "lucide-react";

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


type ItemVisual = {
  nome: string;
  tipo: "Técnica" | "Comportamental";
  intensidade: number;
  motivo?: string;
};

const ECO = {
  roxo: "#5E2B8A",
  roxoClaro: "#7650A5",
  azul: "#4E7CCF",
  turquesa: "#2FC7D8",
};

function limitar(valor: number, minimo = 12, maximo = 100) {
  return Math.max(minimo, Math.min(maximo, Number.isFinite(valor) ? valor : minimo));
}

function classificacaoNaoEssencial(valor: unknown) {
  const normalizado = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return normalizado.includes("NAO_ESSENCIAL") || normalizado.includes("NAO_APLICAVEL");
}

function normalizarNivel(valor: number | null | undefined, minimo: number | null | undefined, maximo: number | null | undefined) {
  if (valor === null || valor === undefined || minimo === null || minimo === undefined || maximo === null || maximo === undefined) return null;
  const amplitude = Number(maximo) - Number(minimo);
  if (!Number.isFinite(amplitude) || amplitude <= 0) return null;
  return ((Number(valor) - Number(minimo)) / amplitude) * 100;
}

function GraficoVisual({
  titulo,
  descricao,
  itens,
  accent,
  icon: Icon,
  vazio,
}: {
  titulo: string;
  descricao: string;
  itens: ItemVisual[];
  accent: string;
  icon: any;
  vazio: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}16`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{titulo}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{descricao}</p>
        </div>
      </div>
      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">{vazio}</div>
      ) : (
        <div className="space-y-4">
          {itens.map((item, indice) => (
            <div key={`${item.tipo}:${item.nome}:${indice}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-slate-800" title={item.nome}>{item.nome}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.tipo}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${limitar(item.intensidade)}%`,
                    background: `linear-gradient(90deg, ${accent}, ${ECO.turquesa})`,
                  }}
                  aria-label={`${item.nome}: intensidade visual`}
                />
              </div>
              {item.motivo && <p className="text-[11px] leading-4 text-slate-500">{item.motivo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Bloco1CompetenciasFuncao() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const role = String(user?.role ?? "");
  const isAdmin = role === "admin" || role === "Administrador";
  const isGerente = role === "gerente";
  const isLider = role === "lider";
  const isColaborador = role === "colaborador";
  const podeSelecionarEmpregado = !isColaborador;
  const podeEditarClassificacao = isAdmin;
  const podeCriarAcao = isAdmin || isLider;
  const [colaboradorId, setColaboradorId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("colaboradorId") || "";
  });
  const [busca, setBusca] = useState("");
  const [eixoAberto, setEixoAberto] = useState<number | null>(null);
  const [statusEdicao, setStatusEdicao] = useState<"CLASSIFICADO" | "PENDENTE">("CLASSIFICADO");
  const [relacaoEdicao, setRelacaoEdicao] = useState<"ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | "">("");
  const [justificativaEdicao, setJustificativaEdicao] = useState("");
  const [motivoEdicao, setMotivoEdicao] = useState("Revisão da classificação do eixo técnico");
  const [mensagemEdicao, setMensagemEdicao] = useState("");
  const [sinteseAberta, setSinteseAberta] = useState(true);

  const empregados = trpc.bloco1CompetenciasFuncao.empregados.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const pdisAdmin = trpc.pdis.list.useQuery(undefined, { enabled: Boolean(user && (isAdmin || isGerente)) });
  const pdisEquipe = trpc.pdis.teamPDIs.useQuery(undefined, { enabled: Boolean(user && isLider) });
  const pdisMeus = trpc.pdis.myPDIs.useQuery(undefined, { enabled: Boolean(user && (isColaborador || isLider)) });
  const mapa = trpc.bloco1CompetenciasFuncao.mapaIndividual.useQuery(
    { colaboradorId: Number(colaboradorId || 0) },
    { enabled: Boolean(colaboradorId) },
  );

  useEffect(() => {
    if (isColaborador && user?.id) {
      setColaboradorId(String(user.id));
    }
  }, [isColaborador, user?.id]);

  useEffect(() => {
    if (!podeSelecionarEmpregado || !colaboradorId || !empregados.data) return;
    const permitido = (empregados.data as any[]).some((item: any) => Number(item.id) === Number(colaboradorId));
    if (!permitido) setColaboradorId("");
  }, [podeSelecionarEmpregado, colaboradorId, empregados.data]);

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

  const pdisDisponiveis = useMemo(() => {
    const todos = [
      ...((pdisAdmin.data ?? []) as any[]),
      ...((pdisEquipe.data ?? []) as any[]),
      ...((pdisMeus.data ?? []) as any[]),
    ];
    const unicos = new Map<number, any>();
    for (const pdi of todos) {
      const id = Number(pdi.id ?? pdi.pdiId);
      if (id) unicos.set(id, pdi);
    }
    return Array.from(unicos.values());
  }, [pdisAdmin.data, pdisEquipe.data, pdisMeus.data]);

  const pdiDoEmpregado = useMemo(() => {
    if (!colaboradorId) return null;
    return pdisDisponiveis.find(
      (pdi: any) => Number(pdi.colaboradorId) === Number(colaboradorId),
    ) ?? null;
  }, [pdisDisponiveis, colaboradorId]);

  const abrirBiblioteca = (eixo: string, macroId?: number | null, macroRelacionada?: string | null) => {
    const params = new URLSearchParams();
    const pdiId = pdiDoEmpregado?.pdiId ?? pdiDoEmpregado?.id;
    if (pdiId) params.set("pdiId", String(pdiId));
    if (eixo) params.set("eixo", eixo);
    if (macroId) params.set("macroId", String(macroId));
    if (macroRelacionada) params.set("macroRelacionada", macroRelacionada);
    params.set("origem", "evolucao_individual");
    params.set("modo", "biblioteca");
    navigate(`/acoes/nova?${params.toString()}`);
  };

  const sintese = useMemo(() => {
    const tecnicas = (mapa.data?.tecnico?.competencias ?? []) as any[];
    const comportamentais = (mapa.data?.comportamental?.competencias ?? []) as any[];

    const forca: ItemVisual[] = [];
    const mantidas: ItemVisual[] = [];
    const potencialidades: ItemVisual[] = [];
    const focos: ItemVisual[] = [];

    for (const item of tecnicas) {
      const anterior = item.percentualAnterior === null || item.percentualAnterior === undefined ? null : Number(item.percentualAnterior);
      const atual = item.percentualAtual === null || item.percentualAtual === undefined ? null : Number(item.percentualAtual);
      const delta = anterior !== null && atual !== null ? atual - anterior : null;

      if (delta !== null && delta >= 10) {
        forca.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: delta });
      } else if (delta !== null && Math.abs(delta) < 10) {
        mantidas.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: atual ?? 50 });
      }

      const nivelPotencial = atual ?? anterior;
      if (classificacaoNaoEssencial(item.classificacao) && nivelPotencial !== null) {
        potencialidades.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: nivelPotencial });
      }

      if (item.novaCompetencia) {
        focos.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: atual ?? 50, motivo: "Nova competência incluída na avaliação." });
      } else if (delta !== null && delta <= -10) {
        focos.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: Math.abs(delta), motivo: "Ponto de atenção para o próximo ciclo de desenvolvimento." });
      }
    }

    for (const item of comportamentais) {
      const anterior = item.resultadoAnterior === null || item.resultadoAnterior === undefined ? null : Number(item.resultadoAnterior);
      const atual = item.resultadoAtual === null || item.resultadoAtual === undefined ? null : Number(item.resultadoAtual);

      // A Avaliação de Desempenho utiliza escala 0–3.
      // A normalização é apenas interna para aplicar o limiar visual de 10%;
      // as notas continuam aparecendo somente na tabela de comparação.
      const anteriorNorm = anterior !== null && anterior >= 0 && anterior <= 3
        ? normalizarNivel(anterior, 0, 3)
        : normalizarNivel(anterior, item.escalaMinAnterior, item.escalaMaxAnterior);
      const atualNorm = atual !== null && atual >= 0 && atual <= 3
        ? normalizarNivel(atual, 0, 3)
        : normalizarNivel(atual, item.escalaMinAtual, item.escalaMaxAtual);
      const deltaNorm = anteriorNorm !== null && atualNorm !== null ? atualNorm - anteriorNorm : null;
      const semHistoricoComparavel = atualNorm !== null && anteriorNorm === null;

      if (deltaNorm !== null && deltaNorm >= 10) {
        forca.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: deltaNorm });
      } else if (deltaNorm !== null && Math.abs(deltaNorm) < 10) {
        mantidas.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: atualNorm ?? 50 });
      }

      if (classificacaoNaoEssencial(item.classificacao) && atualNorm !== null) {
        potencialidades.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: atualNorm });
      }

      if (semHistoricoComparavel || item.novaCompetencia) {
        focos.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: atualNorm ?? 50, motivo: "Competência sem histórico comparável; considerar no próximo ciclo de desenvolvimento." });
      } else if (deltaNorm !== null && deltaNorm <= -10) {
        focos.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: Math.abs(deltaNorm), motivo: "Ponto de atenção para o próximo ciclo de desenvolvimento." });
      }
    }

    const ordem = (a: ItemVisual, b: ItemVisual) => b.intensidade - a.intensidade || a.nome.localeCompare(b.nome, "pt-BR");
    return {
      forca: forca.sort(ordem),
      mantidas: mantidas.sort(ordem),
      potencialidades: potencialidades.sort(ordem),
      focos: focos.sort(ordem),
    };
  }, [mapa.data]);

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">{isColaborador ? "Minha Evolução" : "Evolução Individual"}</h1>
        <p className="text-muted-foreground max-w-4xl">
          A análise é individual. O objetivo é acompanhar se houve desenvolvimento das competências
          técnicas e comportamentais após as ações do PDI.
        </p>
      </div>

      {podeSelecionarEmpregado && (
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
      )}

      {colaboradorId && mapa.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando histórico técnico e Avaliação de Desempenho do empregado selecionado...
          </CardContent>
        </Card>
      )}

      {colaboradorId && mapa.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>Não foi possível carregar a evolução individual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-800">{mapa.error.message}</p>
            <Button size="sm" variant="outline" onClick={() => mapa.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

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
                O indicador histórico mostra a última referência técnica válida já registrada. A nova avaliação permanece em branco até existir uma aplicação oficial calculada para o empregado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mapa.data.comportamental.erroCarregamento && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  Os dados técnicos foram carregados, mas houve falha ao consultar a Avaliação de Desempenho: {mapa.data.comportamental.erroCarregamento}
                </div>
              )}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eixo / competência técnica</TableHead>
                      <TableHead>Classificação individual</TableHead>
                      <TableHead>Avaliação histórica</TableHead>
                      <TableHead>Próxima avaliação</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.tecnico.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum resultado técnico histórico foi localizado para este empregado.
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
                              {podeEditarClassificacao && item.editavelClassificacao !== false && (
                                <Button size="sm" variant="ghost" onClick={() => abrirJustificativa(item)}>
                                  {eixoAberto === Number(item.eixoRegistroId) ? "Fechar" : "Ver / editar justificativa"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.percentualAnterior === null ? "—" : `${Number(item.percentualAnterior).toFixed(1)}%`}
                          </TableCell>
                          <TableCell>
                            {item.percentualAtual === null ? "" : `${Number(item.percentualAtual).toFixed(1)}%`}
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
                                ? "—"
                                : `${evolucaoLabel[item.evolucao] || item.evolucao} ${item.evolucaoPp === null ? "" : `(${Number(item.evolucaoPp) > 0 ? "+" : ""}${Number(item.evolucaoPp).toFixed(1)} p.p.)`}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {podeCriarAcao ? (
                              <Button size="sm" variant="outline" onClick={() => abrirBiblioteca(item.eixoNome)}>
                                Criar ação no PDI
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Visualização</span>
                            )}
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
              <CardTitle>3. Competências Comportamentais — Avaliação de Desempenho</CardTitle>
              <CardDescription>
                Compara as duas Avaliações de Desempenho válidas mais recentes da mesma competência e na mesma escala. O DISC não participa deste cálculo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência comportamental</TableHead>
                      <TableHead>Avaliação anterior</TableHead>
                      <TableHead>Avaliação atual</TableHead>
                      <TableHead>Variação</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.comportamental.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum resultado de Avaliação de Desempenho comportamental foi localizado para este empregado.
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
                            <div>{item.resultadoAnterior === null ? "—" : Number(item.resultadoAnterior).toFixed(2)}</div>
                            {item.periodoAnterior && <div className="text-xs text-muted-foreground">{item.periodoAnterior}</div>}
                          </TableCell>
                          <TableCell>
                            <div>{item.resultadoAtual === null ? "—" : Number(item.resultadoAtual).toFixed(2)}</div>
                            {item.periodoAtual && <div className="text-xs text-muted-foreground">{item.periodoAtual}</div>}
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
                            {podeCriarAcao ? (
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
                            ) : (
                              <span className="text-xs text-muted-foreground">Visualização</span>
                            )}
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

          <div className="overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setSinteseAberta((valor) => !valor)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-white md:px-7"
              style={{ background: `linear-gradient(105deg, ${ECO.roxo} 0%, ${ECO.azul} 55%, ${ECO.turquesa} 100%)` }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-lg font-semibold md:text-xl">Síntese Visual da Evolução</h2>
                </div>
                <p className="mt-1 max-w-4xl text-sm text-white/85">
                  Uma leitura visual das evoluções relevantes, competências mantidas, potencialidades e pontos de foco para o próximo PDI.
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
                {sinteseAberta ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </button>

            {sinteseAberta && (
              <div className="bg-gradient-to-b from-[#F8F6FC] via-white to-[#F2FBFC] p-4 md:p-7">
                <div className="mb-5 rounded-2xl border border-violet-100 bg-white/80 p-4 text-sm text-slate-600">
                  <strong className="text-slate-800">Como ler:</strong> os gráficos não apresentam notas ou percentuais. A intensidade das barras serve apenas para destacar visualmente as competências. Evoluções relevantes consideram diferença de pelo menos 10% da amplitude da escala; pequenas oscilações ficam em “Competências Mantidas”.
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <GraficoVisual
                    titulo="Força da Evolução"
                    descricao="Competências que apresentaram crescimento relevante entre as avaliações."
                    itens={sintese.forca}
                    accent={ECO.roxo}
                    icon={TrendingUp}
                    vazio="Ainda não há evolução relevante comparável para destacar."
                  />
                  <GraficoVisual
                    titulo="Competências Mantidas"
                    descricao="Competências que permaneceram dentro da faixa de estabilidade entre as avaliações."
                    itens={sintese.mantidas}
                    accent={ECO.azul}
                    icon={ShieldCheck}
                    vazio="Ainda não há competências comparáveis classificadas como mantidas."
                  />
                  <GraficoVisual
                    titulo="Potencialidades"
                    descricao="Nível de desenvolvimento observado em competências classificadas como não essenciais."
                    itens={sintese.potencialidades}
                    accent={ECO.turquesa}
                    icon={Sparkles}
                    vazio="Não há potencialidades não essenciais disponíveis para esta leitura."
                  />
                  <GraficoVisual
                    titulo="Pontos de Foco para o Próximo PDI"
                    descricao="Novas competências e mudanças relevantes que merecem atenção no próximo ciclo de desenvolvimento."
                    itens={sintese.focos}
                    accent={ECO.roxoClaro}
                    icon={Target}
                    vazio="Nenhum ponto de foco foi identificado pelos critérios atuais."
                  />
                </div>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regra metodológica aplicada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Técnicas:</strong> histórico técnico válido = indicador anterior; próxima Avaliação de Proficiência oficial = indicador atual; enquanto ela não ocorrer, o campo permanece em branco.</p>
              <p><strong>Comportamentais:</strong> comparação das duas Avaliações de Desempenho válidas mais recentes da mesma competência e mesma escala.</p>
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

import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContentNoPortal, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Download, Info, Lock } from "lucide-react";

// Resultado Executivo — aba Evolução (só administradores, até a publicação).
// Todos os números vêm de evolucaoCiclo.visaoGeral; os textos de explicação vêm
// das legendas do servidor, para tela e regra nunca divergirem.

type Dimensao = "TECNICO" | "COMPORTAMENTAL";
type Recorte = "AMBOS" | Dimensao;

const SITUACOES = ["MANTEVE", "ATINGIU", "EM_ANDAMENTO", "CONCLUIU_ABAIXO", "SEM_ACAO", "AGUARDANDO_MEDICAO"] as const;
type Situacao = (typeof SITUACOES)[number];

const COR_SITUACAO: Record<Situacao, string> = {
  MANTEVE: "#0F5C55",
  ATINGIU: "#2E9E6A",
  EM_ANDAMENTO: "#2F6FD6",
  CONCLUIU_ABAIXO: "#B4400B",
  SEM_ACAO: "#F2A93B",
  AGUARDANDO_MEDICAO: "#9AA4B2",
};

const META = 70;

// O tipo do cliente tRPC não inclui os routers registrados em server/rootRouter.ts
// (mesmo padrão usado no resto do projeto).
const api = (trpc as any).evolucaoCiclo;

const fmtNum = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
const fmtPp = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtNum(v)} pp`;
const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${fmtNum(v)}%`);
const corDelta = (v: number | null | undefined) => (v === null || v === undefined ? "#4B5563" : v >= 0 ? "#1F7A4D" : "#B4400B");

const div = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

// Soma indicadores de várias dimensões a partir das contagens do servidor.
function combinar(lista: any[]) {
  const c = lista.reduce(
    (acc, ind) => {
      for (const k of Object.keys(acc)) acc[k] += Number(ind?.contagens?.[k] ?? 0);
      return acc;
    },
    { comparaveis: 0, somaDeltaPp: 0, comBase: 0, comAtual: 0, naMetaBase: 0, naMetaAtual: 0, somaComAcao: 0, somaSemAcao: 0 } as Record<string, number>,
  );
  const situacoes = Object.fromEntries(SITUACOES.map((s) => [s, 0])) as Record<Situacao, number>;
  const porque = Object.fromEntries(SITUACOES.map((s) => [s, {} as Record<string, number>])) as Record<Situacao, Record<string, number>>;
  let amostraComAcao = 0;
  let amostraSemAcao = 0;
  for (const ind of lista) {
    for (const s of SITUACOES) {
      situacoes[s] += Number(ind?.situacoes?.total?.[s] ?? 0);
      for (const [k, v] of Object.entries(ind?.situacoes?.porque?.[s] ?? {})) porque[s][k] = (porque[s][k] ?? 0) + Number(v);
    }
    amostraComAcao += Number(ind?.efetividade?.amostraComAcao ?? 0);
    amostraSemAcao += Number(ind?.efetividade?.amostraSemAcao ?? 0);
  }
  return {
    indice: c.comparaveis ? Math.round((c.somaDeltaPp / c.comparaveis) * 10) / 10 : null,
    naMetaBase: div(c.naMetaBase, c.comBase),
    naMetaAtual: div(c.naMetaAtual, c.comAtual),
    situacoes,
    porque,
    efetividade: {
      comAcao: amostraComAcao ? Math.round((c.somaComAcao / amostraComAcao) * 10) / 10 : null,
      semAcao: amostraSemAcao ? Math.round((c.somaSemAcao / amostraSemAcao) * 10) / 10 : null,
      amostraComAcao,
      amostraSemAcao,
    },
  };
}

function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: Array<[T, string]>;
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex flex-wrap overflow-hidden rounded-lg border border-[#CBD2DC]">
      {opcoes.map(([v, nome]) => (
        <button
          key={v}
          type="button"
          aria-pressed={valor === v}
          onClick={() => onChange(v)}
          className={`min-h-[44px] px-4 text-[13.5px] font-semibold ${valor === v ? "bg-[#1D4ED8] text-white" : "bg-white text-[#374151] hover:bg-[#F4F6F9]"}`}
        >
          {nome}
        </button>
      ))}
    </div>
  );
}

function Explica({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-[#4B5563]">{children}</p>;
}

function baixarCsv(nome: string, linhas: Array<Array<string | number | null>>) {
  const csv = linhas.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

export function ResultadoExecutivoEvolucao() {
  const [unidade, setUnidade] = useState<string>("TODAS");
  const [recorte, setRecorte] = useState<Recorte>("AMBOS");
  const [situacaoSel, setSituacaoSel] = useState<Situacao>("SEM_ACAO");
  const [abaEixo, setAbaEixo] = useState<Dimensao>("TECNICO");
  const [listaAberta, setListaAberta] = useState(false);
  const [busca, setBusca] = useState("");

  const filtro = unidade === "TODAS" ? undefined : { unidade };
  const visao = api.visaoGeral.useQuery(filtro, { refetchOnWindowFocus: false });
  const prontidao = api.prontidaoPublicacao.useQuery(undefined, { refetchOnWindowFocus: false });
  const dimensoesDoRecorte: Dimensao[] = recorte === "AMBOS" ? ["TECNICO", "COMPORTAMENTAL"] : [recorte];
  const lista = api.detalhe.useQuery(
    {
      situacao: situacaoSel,
      ...(unidade === "TODAS" ? {} : { unidade }),
      ...(recorte === "AMBOS" ? {} : { dimensao: recorte }),
    },
    { enabled: listaAberta, refetchOnWindowFocus: false },
  );

  const d: any = visao.data;
  const leg: any = d?.legendas;

  const combinado = useMemo(() => (d ? combinar(dimensoesDoRecorte.map((x) => d.geral[x])) : null), [d, recorte]);
  const tec = useMemo(() => (d ? combinar([d.geral.TECNICO]) : null), [d]);
  const comp = useMemo(() => (d ? combinar([d.geral.COMPORTAMENTAL]) : null), [d]);
  const ambos = useMemo(() => (d ? combinar([d.geral.TECNICO, d.geral.COMPORTAMENTAL]) : null), [d]);

  if (visao.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (visao.isError || !d || !combinado || !tec || !comp || !ambos) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-5 text-red-800">
          Não foi possível carregar o Resultado Executivo. {visao.error?.message ?? ""}
        </CardContent>
      </Card>
    );
  }

  const periodo = (x: Dimensao) => `${d.periodos[x].base ?? "—"} → ${d.periodos[x].atual ?? "—"}`;
  const totalSituacoes = SITUACOES.reduce((s, x) => s + combinado.situacoes[x], 0);

  // ---- KPIs (Técnico + Comportamental e cada dimensão)
  const kpis = [
    {
      titulo: "Índice de Evolução do Ciclo de Desenvolvimento Comportamental e Técnico",
      valor: fmtPp(ambos.indice),
      cor: corDelta(ambos.indice),
      tec: fmtPp(tec.indice),
      comp: fmtPp(comp.indice),
      explica: leg.indicadores.indiceEvolucaoPp,
    },
    {
      titulo: "Eixos e competências na meta de Desenvolvimento Comportamental e Técnico (70%)",
      valor: `${fmtPct(ambos.naMetaBase)} → ${fmtPct(ambos.naMetaAtual)}`,
      cor: "#172033",
      tec: `${fmtPct(tec.naMetaBase)} → ${fmtPct(tec.naMetaAtual)}`,
      comp: `${fmtPct(comp.naMetaBase)} → ${fmtPct(comp.naMetaAtual)}`,
      explica: `${leg.indicadores.percentualNaMetaBase ?? leg.indicadores.percentualNaMeta} Primeiro número: medição anterior; segundo: medição atual.`,
    },
    {
      titulo: "Eixos técnicos e competências comportamentais que estavam abaixo da meta e atingiram",
      valor: fmtNum(ambos.situacoes.ATINGIU, 0),
      cor: "#1F7A4D",
      tec: fmtNum(tec.situacoes.ATINGIU, 0),
      comp: fmtNum(comp.situacoes.ATINGIU, 0),
      explica: leg.situacoes.ATINGIU.regra,
    },
    {
      titulo: "Eixos técnicos e competências comportamentais abaixo da meta e sem ação ativa no PDI",
      valor: fmtNum(ambos.situacoes.SEM_ACAO, 0),
      cor: "#B45309",
      tec: fmtNum(tec.situacoes.SEM_ACAO, 0),
      comp: fmtNum(comp.situacoes.SEM_ACAO, 0),
      explica: `${leg.situacoes.SEM_ACAO.regra} Clique na situação abaixo para ver os motivos.`,
    },
  ];

  // ---- Leitura automática por dimensão (maior avanço e maior queda)
  const leitura = (dim: Dimensao) => {
    const eixos = (d.porEixo as any[]).filter((e) => e.dimensao === dim && e.indiceEvolucaoPp !== null && e.itensComMeta >= 3);
    if (!eixos.length) return "Ainda não há medições suficientes para comparar os eixos.";
    const ord = [...eixos].sort((a, b) => b.indiceEvolucaoPp - a.indiceEvolucaoPp);
    const melhor = ord.slice(0, 2).map((e) => `${e.eixo} (${fmtPp(e.indiceEvolucaoPp)})`);
    const pior = ord[ord.length - 1];
    return `Maior avanço: ${melhor.join(" e ")}. ${
      pior.indiceEvolucaoPp < 0 ? "Caiu" : "Menor avanço"
    }: ${pior.eixo} (${fmtPp(pior.indiceEvolucaoPp)}).`;
  };

  const resumoDim = (dim: Dimensao, ind: ReturnType<typeof combinar>) => {
    const g = d.geral[dim];
    const pm = g.motivos.porMotivo;
    const nome = dim === "TECNICO" ? "Eixos" : "Competências";
    return [
      { nome: dim === "TECNICO" ? "Índice de Evolução Técnica" : "Índice de Evolução Comportamental", valor: fmtPp(ind.indice), cor: corDelta(ind.indice), explica: leg.indicadores.indiceEvolucaoPp },
      { nome: `${nome} na meta (70%)`, valor: `${fmtPct(ind.naMetaBase)} → ${fmtPct(ind.naMetaAtual)}`, cor: "#172033", explica: leg.indicadores.percentualNaMeta },
      { nome: `${nome} que atingiram a meta no ciclo`, valor: fmtNum(ind.situacoes.ATINGIU, 0), cor: "#1F7A4D", explica: leg.situacoes.ATINGIU.regra },
      {
        nome: `${nome} abaixo da meta, com ação em andamento`,
        valor: fmtNum(ind.situacoes.EM_ANDAMENTO, 0),
        cor: "#1D4ED8",
        explica: `Sendo trabalhados no PDI; ${fmtNum(ind.porque.EM_ANDAMENTO.VENCIDA ?? 0, 0)} com prazo vencido e ${fmtNum(ind.porque.EM_ANDAMENTO.PRORROGADA ?? 0, 0)} prorrogados.`,
      },
      {
        nome: `${nome} abaixo da meta, sem ação ativa`,
        valor: fmtNum(ind.situacoes.SEM_ACAO, 0),
        cor: "#B45309",
        explica: Object.entries(ind.porque.SEM_ACAO)
          .filter(([, v]) => Number(v) > 0)
          .map(([k, v]) => `${v} ${String(leg.motivos[k]?.titulo ?? k).toLowerCase()}`)
          .join(", ") || "Nenhum.",
      },
      {
        nome: `${nome} ainda sem medição atual`,
        valor: fmtNum(ind.situacoes.AGUARDANDO_MEDICAO, 0),
        cor: "#4B5563",
        explica: leg.situacoes.AGUARDANDO_MEDICAO.significa,
      },
      ...(dim === "TECNICO"
        ? [
            {
              nome: "Potencialidades técnicas",
              valor: fmtNum(g.potencialidades.total, 0),
              cor: "#6D4BC0",
              explica: `Eixos Não essenciais (sem meta) que a pessoa já domina. ${fmtNum(g.potencialidades.acimaDe70, 0)} estão acima de 70% e podem atuar como multiplicadores.`,
            },
          ]
        : []),
    ];
  };

  // ---- Situação selecionada
  const legSel = leg.situacoes[situacaoSel];
  const porqueSel = Object.entries(combinado.porque[situacaoSel]).sort((a, b) => Number(b[1]) - Number(a[1]));
  const maxPorque = Math.max(1, ...porqueSel.map(([, v]) => Number(v)));
  const tituloPorque = (k: string) => leg.motivos[k]?.titulo ?? leg.detalhesSituacao[k]?.titulo ?? k;
  const fontePorque = (k: string) => leg.motivos[k]?.explicacao ?? leg.detalhesSituacao[k]?.fonte ?? "";
  const amostraSel = dimensoesDoRecorte.flatMap((x) => d.amostras[x][situacaoSel] as any[]).slice(0, 6);

  // ---- Eixos
  const eixosAba = (d.porEixo as any[])
    .filter((e) => e.dimensao === abaEixo && e.itensComMeta > 0)
    .sort((a, b) => (b.indiceEvolucaoPp ?? -999) - (a.indiceEvolucaoPp ?? -999));

  // ---- Unidades (recorte atual)
  const unidadesLinhas = (d.porUnidade as any[]).map((u) => {
    const c = combinar(dimensoesDoRecorte.map((x) => u[x]));
    return { nome: u.unidade, indice: c.indice, naMeta: c.naMetaAtual, atingiu: c.situacoes.ATINGIU, semAcao: c.situacoes.SEM_ACAO, aguardando: c.situacoes.AGUARDANDO_MEDICAO };
  });

  // ---- Pendências para publicar
  const p: any = prontidao.data;
  const pendencias = p
    ? [
        { ok: p.ativosSemMatriz.length === 0, texto: p.ativosSemMatriz.length ? `${p.ativosSemMatriz.length} empregado(s) ativo(s) sem matriz` : "Todos os empregados ativos com matriz" },
        { ok: p.matrizesPendentes.length === 0, texto: p.matrizesPendentes.length ? `${p.matrizesPendentes.length} matriz(es) com histórico pendente` : "Matrizes sem histórico pendente" },
        { ok: p.eixosPendentes === 0, texto: p.eixosPendentes ? `${p.eixosPendentes} eixo(s) pendente(s) de classificação` : "Matrizes sem eixo pendente de classificação" },
        { ok: p.semResultado2026.length === 0, texto: p.semResultado2026.length ? `${p.semResultado2026.length} empregado(s) sem resultado da prova 2026` : "Todos com resultado da prova 2026" },
        { ok: p.semBase2025SemAlerta.length === 0, texto: p.semBase2025SemAlerta.length ? `${p.semBase2025SemAlerta.length} empregado(s) sem nota 2025 e sem o alerta de confirmação` : "Linha de base 2025 conferida" },
        { ok: true, info: true, texto: `${p.semAvaliacaoDesempenhoAtual.length} empregado(s) sem a Avaliação de Desempenho mais recente (informativo, não impede publicar)` },
      ]
    : [];
  const qtdPendencias = pendencias.filter((x) => !x.ok).length;

  const itensLista = ((lista.data as any[]) ?? []).filter((i) =>
    busca.trim() ? `${i.colaboradorNome} ${i.unidade} ${i.eixo}`.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")) : true,
  );

  const exportarLista = () =>
    baixarCsv(`resultado-executivo-${situacaoSel.toLowerCase()}.csv`, [
      ["Empregado", "Unidade", "Dimensão", "Eixo / competência", "Relação", "Medição anterior (%)", "Medição atual (%)", "Evolução (pp)", "Situação", "Por quê"],
      ...itensLista.map((i) => [
        i.colaboradorNome,
        i.unidade,
        i.dimensao === "TECNICO" ? "Técnico" : "Comportamental",
        i.eixo,
        i.relacao,
        i.base,
        i.atual,
        i.deltaPp,
        leg.situacoes[i.situacao]?.nome ?? "",
        i.porque ? tituloPorque(i.porque) : "",
      ]),
    ]);

  return (
    <div className="space-y-6 text-[#172033]">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
            <span>SEBRAE/TO · Ciclo 2025/26</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[#78350F]">
              <Lock className="h-3 w-3" aria-hidden="true" /> Visível só para administradores
            </span>
          </div>
          <h2 className="text-2xl font-bold">Resultado Executivo</h2>
          <p className="max-w-3xl text-sm text-[#4B5563]">
            Desenvolvimento Técnico e Comportamental: onde estávamos no início do ciclo, o que o PDI fez e onde chegamos.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <label className="mb-1 block text-xs font-semibold text-[#4B5563]" htmlFor="re-unidade">
            Unidade
          </label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger id="re-unidade" className="min-h-[44px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContentNoPortal position="popper">
              <SelectItem value="TODAS">SEBRAE/TO — todas</SelectItem>
              {(d.unidades as string[]).map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContentNoPortal>
          </Select>
        </div>
      </div>

      {/* Como ler */}
      <Card className="border-[#E3E7EE] bg-[#F4F6F9]">
        <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-2">
          <p className="md:col-span-2 font-semibold">Como ler este relatório</p>
          <p>
            <strong>Técnico:</strong> eixos de conhecimento da função, medidos pela Prova de Certificação ({periodo("TECNICO")}).
          </p>
          <p>
            <strong>Comportamental:</strong> as competências que a Avaliação de Desempenho mediu ({periodo("COMPORTAMENTAL")}). Nota 0–3 lida em % da escala.
          </p>
          <p>
            <strong>Meta de 70%:</strong> vale para os eixos Essenciais e Transversais e para as competências comportamentais. Abaixo de 70% = ponto a desenvolver.
          </p>
          <p>
            <strong>Não essencial:</strong> não tem meta. O que a pessoa domina nesses eixos aparece como potencialidade, nunca como lacuna.
          </p>
        </CardContent>
      </Card>

      {/* Pendências */}
      {p && (
        <Card className={qtdPendencias ? "border-[#F2A93B] bg-[#FFFBEB]" : "border-[#2E9E6A] bg-[#F0FAF4]"}>
          <CardContent className="space-y-3 p-5">
            <div>
              <p className="font-semibold">
                {qtdPendencias ? `Antes de publicar: ${qtdPendencias} pendência(s)` : "Antes de publicar: tudo conferido"}
              </p>
              <Explica>A publicação só será liberada quando todos os itens estiverem conferidos. Só administradores veem este quadro.</Explica>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {pendencias.map((x) => (
                <li key={x.texto} className="flex items-start gap-2 text-sm">
                  {x.info ? (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" aria-hidden="true" />
                  ) : x.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1F7A4D]" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" aria-hidden="true" />
                  )}
                  <span>{x.texto}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.titulo} className="border-[#E3E7EE]">
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <p className="text-sm font-semibold leading-snug">{k.titulo}</p>
              <p className="text-3xl font-bold" style={{ color: k.cor }}>
                {k.valor}
              </p>
              <div className="flex gap-4 text-sm">
                <span>
                  <span className="text-[#4B5563]">Técnico </span>
                  <strong>{k.tec}</strong>
                </span>
                <span>
                  <span className="text-[#4B5563]">Comportamental </span>
                  <strong>{k.comp}</strong>
                </span>
              </div>
              <Explica>
                <strong>O que é:</strong> {k.explica}
              </Explica>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Blocos por dimensão */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["TECNICO", "COMPORTAMENTAL"] as Dimensao[]).map((dim) => (
          <Card key={dim} className="border-[#E3E7EE]">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-lg font-bold" style={{ color: dim === "TECNICO" ? "#1D4ED8" : "#0F5C55" }}>
                  {dim === "TECNICO" ? "Desenvolvimento Técnico" : "Desenvolvimento Comportamental"}
                </p>
                <Explica>
                  {dim === "TECNICO"
                    ? `Eixos de conhecimento da função (Essenciais e Transversais), Prova de Certificação ${periodo("TECNICO")}.`
                    : `Competências medidas pela Avaliação de Desempenho, ${periodo("COMPORTAMENTAL")}.`}
                </Explica>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {resumoDim(dim, dim === "TECNICO" ? tec : comp).map((i) => (
                  <div key={i.nome} className="rounded-lg border border-[#E3E7EE] bg-white p-3">
                    <p className="text-xs font-semibold text-[#374151]">{i.nome}</p>
                    <p className="text-xl font-bold" style={{ color: i.cor }}>
                      {i.valor}
                    </p>
                    <Explica>{i.explica}</Explica>
                  </div>
                ))}
              </div>
              <p className="rounded-lg bg-[#F4F6F9] p-3 text-sm">
                <strong>Leitura:</strong> {leitura(dim)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Situações */}
      <Card className="border-[#E3E7EE]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">Situação de cada eixo técnico e competência comportamental</p>
              <Explica>
                Cada pessoa tem vários eixos e competências com meta. Aqui está onde cada um deles está no ciclo. Clique em uma situação para ver o motivo e o que fazer.
              </Explica>
            </div>
            <Segmentado<Recorte>
              rotulo="Recorte"
              valor={recorte}
              onChange={setRecorte}
              opcoes={[
                ["AMBOS", "Técnico + Comportamental"],
                ["TECNICO", "Só técnico"],
                ["COMPORTAMENTAL", "Só comportamental"],
              ]}
            />
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#EEF1F5]" aria-hidden="true">
            {SITUACOES.map((s) =>
              combinado.situacoes[s] ? <div key={s} style={{ flex: `${combinado.situacoes[s]} 0 0`, background: COR_SITUACAO[s] }} /> : null,
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SITUACOES.map((s) => {
              const ativo = s === situacaoSel;
              const qtd = combinado.situacoes[s];
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setSituacaoSel(s)}
                  className={`flex min-h-[44px] flex-col gap-1.5 rounded-xl p-4 text-left ${ativo ? "border-2 border-[#1D4ED8] bg-[#EEF3FD]" : "border border-[#E3E7EE] bg-white hover:bg-[#F4F6F9]"}`}
                >
                  <span className="flex items-start gap-2 text-sm font-semibold">
                    <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-[3px]" style={{ background: COR_SITUACAO[s] }} aria-hidden="true" />
                    {leg.situacoes[s].nome}
                  </span>
                  <span className="text-lg font-bold">
                    {fmtNum(qtd, 0)} <span className="text-sm font-medium text-[#4B5563]">· {totalSituacoes ? Math.round((qtd / totalSituacoes) * 100) : 0}%</span>
                  </span>
                  <span className="text-xs text-[#4B5563]">{leg.situacoes[s].regra}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 rounded-xl border border-[#E3E7EE] bg-[#F4F6F9] p-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">Situação selecionada</p>
              <p className="text-lg font-bold">
                {legSel.nome} · {fmtNum(combinado.situacoes[situacaoSel], 0)} pontos de desenvolvimento
              </p>
              <p className="text-sm">
                <strong>O que significa:</strong> {legSel.significa}
              </p>
              <p className="text-sm">
                <strong>O que recomendamos:</strong> {legSel.recomenda}
              </p>
              <p className="pt-2 text-sm font-semibold">Por quê? Motivos registrados no sistema</p>
              {porqueSel.length ? (
                <ul className="space-y-3">
                  {porqueSel.map(([k, v]) => (
                    <li key={k} className="space-y-1">
                      <div className="flex justify-between gap-3 text-sm">
                        <span>{tituloPorque(k)}</span>
                        <strong>{fmtNum(Number(v), 0)}</strong>
                      </div>
                      <div className="h-2 rounded bg-white">
                        <div className="h-2 rounded" style={{ width: `${Math.round((Number(v) / maxPorque) * 100)}%`, background: COR_SITUACAO[situacaoSel] }} />
                      </div>
                      <p className="text-xs text-[#4B5563]">{fontePorque(k)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Explica>Nenhum item nesta situação no recorte escolhido.</Explica>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Quem está nesta situação (amostra)</p>
              {amostraSel.length ? (
                <ul className="space-y-2">
                  {amostraSel.map((a, idx) => (
                    <li key={`${a.colaboradorId}-${a.eixo}-${idx}`} className="rounded-lg border border-[#E3E7EE] bg-white p-3 text-sm">
                      <p className="font-semibold">
                        {a.nome} · <span className="font-normal text-[#4B5563]">{a.unidade}</span>
                      </p>
                      <p className="text-[#374151]">
                        {a.eixo} — {fmtPct(a.base)} → {fmtPct(a.atual)}
                        {a.porque ? ` · ${tituloPorque(a.porque)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Explica>Ninguém nesta situação.</Explica>
              )}
              <Button variant="outline" className="min-h-[44px]" onClick={() => setListaAberta(true)} disabled={!combinado.situacoes[situacaoSel]}>
                Ver lista completa e exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evolução por eixo */}
      <Card className="border-[#E3E7EE]">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">Evolução por eixo e competência</p>
              <Explica>Média de todos os empregados que têm aquele eixo ou competência com meta.</Explica>
            </div>
            <Segmentado<Dimensao>
              rotulo="Dimensão"
              valor={abaEixo}
              onChange={setAbaEixo}
              opcoes={[
                ["TECNICO", "Eixos técnicos"],
                ["COMPORTAMENTAL", "Competências comportamentais"],
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[#4B5563]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded bg-[#B8C2D1]" aria-hidden="true" /> Medição anterior ({d.periodos[abaEixo].base ?? "—"})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded bg-[#1D4ED8]" aria-hidden="true" /> Medição atual ({d.periodos[abaEixo].atual ?? "—"})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-0.5 bg-[#172033]" aria-hidden="true" /> Meta de 70%
            </span>
            <span>Δ = pontos percentuais ganhos ou perdidos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#E3E7EE] text-left text-xs text-[#4B5563]">
                  <th className="py-2 pr-3 font-semibold">{abaEixo === "TECNICO" ? "Eixo técnico" : "Competência comportamental"}</th>
                  <th className="py-2 pr-3 font-semibold">{periodo(abaEixo)}</th>
                  <th className="py-2 pr-3 text-right font-semibold">Δ</th>
                  <th className="py-2 font-semibold">Leitura</th>
                </tr>
              </thead>
              <tbody>
                {eixosAba.map((e) => {
                  const s = e.situacoes.total;
                  const leituraEixo =
                    s.AGUARDANDO_MEDICAO === e.itensComMeta
                      ? "Aguardando medição atual"
                      : `${s.ATINGIU} atingiram a meta · ${s.SEM_ACAO} sem ação ativa${s.AGUARDANDO_MEDICAO ? ` · ${s.AGUARDANDO_MEDICAO} sem medição atual` : ""}`;
                  return (
                    <tr key={e.eixo} className="border-b border-[#EEF1F5] align-top">
                      <td className="py-3 pr-3 font-medium">
                        {e.eixo}
                        {e.transversal && <span className="ml-2 rounded bg-[#EEF3FD] px-1.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">Transversal</span>}
                        <span className="block text-xs font-normal text-[#4B5563]">{e.itensComMeta} com meta</span>
                      </td>
                      <td className="w-[38%] py-3 pr-3">
                        <div className="relative space-y-1.5">
                          {[
                            { v: e.mediaBase, cor: "#B8C2D1" },
                            { v: e.mediaAtual, cor: "#1D4ED8" },
                          ].map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="relative h-2 flex-1 rounded bg-[#EEF1F5]">
                                <div className="h-2 rounded" style={{ width: `${Math.max(0, Math.min(100, b.v ?? 0))}%`, background: b.cor }} />
                                <div className="absolute -top-1 h-4 w-0.5 bg-[#172033]" style={{ left: `${META}%` }} aria-hidden="true" />
                              </div>
                              <span className="w-12 text-right text-xs tabular-nums">{fmtPct(b.v)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums" style={{ color: corDelta(e.indiceEvolucaoPp) }}>
                        {fmtPp(e.indiceEvolucaoPp)}
                      </td>
                      <td className="py-3 text-[#374151]">{leituraEixo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Efetividade do PDI */}
      <Card className="border-[#E3E7EE]">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-lg font-bold">O PDI gerou evolução?</p>
            <Explica>{leg.indicadores.efetividade}</Explica>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(["TECNICO", "COMPORTAMENTAL"] as Dimensao[]).map((dim) => {
              const ef = d.geral[dim].efetividade;
              return (
                <div key={dim} className="space-y-3 rounded-xl border border-[#E3E7EE] p-4">
                  <p className="font-semibold">{dim === "TECNICO" ? "Técnico" : "Comportamental"}</p>
                  {ef.amostraComAcao === 0 ? (
                    <Explica>
                      {dim === "COMPORTAMENTAL"
                        ? `As ações do PDI deste ciclo foram feitas depois da ${d.periodos.COMPORTAMENTAL.atual ?? "última Avaliação de Desempenho"}. O efeito delas aparecerá na próxima Avaliação de Desempenho.`
                        : "Ainda não há pessoas com ação concluída antes da prova e com as duas medições para comparar."}
                    </Explica>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-[#4B5563]">Concluíram ação do PDI</p>
                        <p className="text-2xl font-bold" style={{ color: corDelta(ef.evolucaoComAcaoConcluidaPp) }}>
                          {fmtPp(ef.evolucaoComAcaoConcluidaPp)}
                        </p>
                        <Explica>evolução média em {ef.amostraComAcao} pontos de desenvolvimento</Explica>
                      </div>
                      <div>
                        <p className="text-xs text-[#4B5563]">Não tiveram ação</p>
                        <p className="text-2xl font-bold" style={{ color: corDelta(ef.evolucaoSemAcaoPp) }}>
                          {fmtPp(ef.evolucaoSemAcaoPp)}
                        </p>
                        <Explica>evolução média em {ef.amostraSemAcao} pontos de desenvolvimento</Explica>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unidades */}
      <Card className="border-[#E3E7EE]">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-lg font-bold">Evolução por unidade</p>
            <Explica>
              Recorte: {recorte === "AMBOS" ? "Técnico + Comportamental" : recorte === "TECNICO" ? "só técnico" : "só comportamental"} (use os botões da seção Situação para trocar).
            </Explica>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#E3E7EE] text-left text-xs text-[#4B5563]">
                  <th className="py-2 pr-3 font-semibold">Unidade</th>
                  <th className="py-2 pr-3 text-right font-semibold">Evolução média</th>
                  <th className="py-2 pr-3 text-right font-semibold">Na meta (medição atual)</th>
                  <th className="py-2 pr-3 text-right font-semibold">Atingiram a meta no ciclo</th>
                  <th className="py-2 pr-3 text-right font-semibold">Abaixo da meta sem ação ativa</th>
                  <th className="py-2 text-right font-semibold">Sem medição atual</th>
                </tr>
              </thead>
              <tbody>
                {unidadesLinhas.map((u) => (
                  <tr key={u.nome} className="border-b border-[#EEF1F5]">
                    <td className="py-2.5 pr-3 font-medium">{u.nome}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums" style={{ color: corDelta(u.indice) }}>
                      {fmtPp(u.indice)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmtPct(u.naMeta)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.atingiu}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.semAcao}</td>
                    <td className="py-2.5 text-right tabular-nums">{u.aguardando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Explica>
            Evolução média = diferença entre a medição atual e a anterior, em pontos percentuais. As colunas de contagem são pontos de desenvolvimento (eixos e competências com meta), não pessoas.
          </Explica>
        </CardContent>
      </Card>

      <p className="text-xs text-[#4B5563]">
        Fontes: matriz de eixos, Prova de Certificação ({periodo("TECNICO")}), Avaliação de Desempenho ({periodo("COMPORTAMENTAL")}) e ações e solicitações do PDI.
      </p>

      {/* Lista completa */}
      <Dialog open={listaAberta} onOpenChange={setListaAberta}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{legSel.nome}</DialogTitle>
            <DialogDescription>
              {unidade === "TODAS" ? "SEBRAE/TO — todas as unidades" : unidade} · {recorte === "AMBOS" ? "Técnico + Comportamental" : recorte === "TECNICO" ? "Técnico" : "Comportamental"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label htmlFor="re-busca" className="mb-1 block text-xs font-semibold text-[#4B5563]">
                Buscar por empregado, unidade ou eixo
              </label>
              <Input id="re-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite um nome" className="min-h-[44px]" />
            </div>
            <Button onClick={exportarLista} disabled={!itensLista.length} className="min-h-[44px]">
              <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Exportar CSV
            </Button>
          </div>
          <div className="max-h-[55vh] overflow-auto">
            {lista.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-[#E3E7EE] text-left text-xs text-[#4B5563]">
                    <th className="py-2 pr-3">Empregado</th>
                    <th className="py-2 pr-3">Unidade</th>
                    <th className="py-2 pr-3">Eixo / competência</th>
                    <th className="py-2 pr-3 text-right">Anterior</th>
                    <th className="py-2 pr-3 text-right">Atual</th>
                    <th className="py-2">Por quê</th>
                  </tr>
                </thead>
                <tbody>
                  {itensLista.map((i, idx) => (
                    <tr key={`${i.colaboradorId}-${i.dimensao}-${i.eixo}-${idx}`} className="border-b border-[#EEF1F5] align-top">
                      <td className="py-2 pr-3 font-medium">{i.colaboradorNome}</td>
                      <td className="py-2 pr-3">{i.unidade}</td>
                      <td className="py-2 pr-3">
                        {i.eixo}
                        <span className="block text-xs text-[#4B5563]">{i.dimensao === "TECNICO" ? "Técnico" : "Comportamental"}</span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(i.base)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(i.atual)}</td>
                      <td className="py-2">{i.porque ? tituloPorque(i.porque) : "—"}</td>
                    </tr>
                  ))}
                  {!itensLista.length && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#4B5563]">
                        Nenhum resultado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

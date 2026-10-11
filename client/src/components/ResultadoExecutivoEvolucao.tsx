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

// Abaixo da expectativa hoje, qualquer que seja a situação das ações:
// é o que o próximo PDI precisa considerar.
const A_DESENVOLVER: Situacao[] = ["EM_ANDAMENTO", "CONCLUIU_ABAIXO", "SEM_ACAO"];

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
const fmtNota = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDeltaNota = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmtNota(v)}`;
const META_NOTA = 2.1;
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
  const [listaSituacoes, setListaSituacoes] = useState<Situacao[] | null>(null); // null = a situação selecionada
  const [busca, setBusca] = useState("");

  const filtro = unidade === "TODAS" ? undefined : { unidade };
  const visao = api.visaoGeral.useQuery(filtro, { refetchOnWindowFocus: false });
  const prontidao = api.prontidaoPublicacao.useQuery(undefined, { refetchOnWindowFocus: false });
  const dimensoesDoRecorte: Dimensao[] = recorte === "AMBOS" ? ["TECNICO", "COMPORTAMENTAL"] : [recorte];
  const lista = api.detalhe.useQuery(
    {
      situacoes: listaSituacoes ?? [situacaoSel],
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
  // Quais eixos/competências estão numa situação, com a quantidade de cada um.
  const eixosNaSituacao = (dim: Dimensao, sit: Situacao | Situacao[]) => {
    const sits = Array.isArray(sit) ? sit : [sit];
    return (d.porEixo as any[])
      .map((e) => ({
        dimensao: e.dimensao,
        eixo: e.eixo as string,
        qtd: sits.reduce((t, x) => t + Number(e.situacoes?.total?.[x] ?? 0), 0),
      }))
      .filter((e) => e.dimensao === dim && e.qtd > 0)
      .sort((a, b) => b.qtd - a.qtd || a.eixo.localeCompare(b.eixo, "pt-BR"));
  };
  const resumoEixos = (dim: Dimensao, sit: Situacao | Situacao[], limite = 4) => {
    const lista = eixosNaSituacao(dim, sit);
    if (!lista.length) return "Nenhum.";
    const mostrados = lista.slice(0, limite).map((x) => `${x.eixo} (${x.qtd})`);
    return mostrados.join(" · ") + (lista.length > limite ? ` · e mais ${lista.length - limite}` : "");
  };
  const abrirLista = (sit: Situacao | Situacao[]) => {
    if (Array.isArray(sit)) setListaSituacoes(sit);
    else {
      setSituacaoSel(sit);
      setListaSituacoes(null);
    }
    setRecorte("AMBOS");
    setBusca("");
    setListaAberta(true);
  };

  const somar = (ind: ReturnType<typeof combinar>, sits: Situacao[]) => sits.reduce((t, x) => t + ind.situacoes[x], 0);

  // Cada eixo/competência pelo nome: onde atuar, o que está bem, o que aguarda medição.
  // Cada item é uma pessoa naquele eixo, então as contagens são de pessoas.
  const listasEixos = (dim: Dimensao) => {
    const linhas = (d.porEixo as any[])
      .filter((e) => e.dimensao === dim && e.itensComMeta > 0)
      .map((e) => {
        const t = e.situacoes.total;
        const abaixo = A_DESENVOLVER.reduce((s2, x) => s2 + Number(t[x] ?? 0), 0);
        const aguardando = Number(t.AGUARDANDO_MEDICAO ?? 0);
        const medidos = e.itensComMeta - aguardando;
        return {
          eixo: e.eixo as string,
          transversal: Boolean(e.transversal),
          abaixo,
          medidos,
          aguardando,
          naExpectativa: Number(t.MANTEVE ?? 0) + Number(t.ATINGIU ?? 0),
          atingiu: Number(t.ATINGIU ?? 0),
          evolucao: dim === "TECNICO" ? fmtPp(e.indiceEvolucaoPp) : fmtDeltaNota(e.nota?.indiceEvolucao),
          corEvolucao: corDelta(dim === "TECNICO" ? e.indiceEvolucaoPp : e.nota?.indiceEvolucao),
        };
      });
    return {
      atuar: linhas.filter((l) => l.abaixo > 0).sort((a, b) => b.abaixo - a.abaixo || a.eixo.localeCompare(b.eixo, "pt-BR")),
      bem: linhas
        .filter((l) => l.medidos > 0 && l.abaixo === 0)
        .sort((a, b) => b.medidos - a.medidos || a.eixo.localeCompare(b.eixo, "pt-BR")),
      aguardando: linhas.filter((l) => l.medidos === 0).sort((a, b) => b.aguardando - a.aguardando),
    };
  };

  // ---- Síntese gerencial: conclusões escritas a partir dos dados.
  const sintese = (() => {
    const nomeDim = (dim: Dimensao) => (dim === "TECNICO" ? "técnico" : "comportamental");
    const evol = (e: any, dim: Dimensao) => (dim === "TECNICO" ? e.indiceEvolucaoPp : e.nota?.indiceEvolucao ?? null);
    const fmtEvol = (v: number, dim: Dimensao) => (dim === "TECNICO" ? fmtPp(v) : `${fmtDeltaNota(v)} na nota`);
    const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

    const atuar: string[] = [];
    const ajudar: string[] = [];
    const melhorou: string[] = [];
    const caiu: string[] = [];
    const atencao: string[] = [];

    for (const dim of ["TECNICO", "COMPORTAMENTAL"] as Dimensao[]) {
      const eixos = (d.porEixo as any[]).filter((e) => e.dimensao === dim && e.itensComMeta > 0);
      const abaixo = (e: any) => A_DESENVOLVER.reduce((t, x) => t + Number(e.situacoes?.total?.[x] ?? 0), 0);

      // Onde atuar primeiro: mais pessoas abaixo da expectativa, e em quais unidades.
      const prioridades = eixos
        .filter((e) => abaixo(e) > 0)
        .sort((a, b) => abaixo(b) - abaixo(a))
        .slice(0, 3);
      for (const e of prioridades) {
        const unidades = (d.matriz as any[])
          .filter((m) => m.dimensao === dim && m.eixo === e.eixo)
          .map((m) => ({ u: m.unidade as string, n: A_DESENVOLVER.reduce((t, x) => t + Number(m.situacoes?.[x] ?? 0), 0) }))
          .filter((m) => m.n > 0)
          .sort((a, b) => b.n - a.n);
        const ondeTexto = unidades.length
          ? ` — ${lista(unidades.slice(0, 3).map((m) => `${m.u} (${m.n})`))}${unidades.length > 3 ? ` e mais ${unidades.length - 3} unidade(s)` : ""}`
          : "";
        atuar.push(`${e.eixo} (${nomeDim(dim)}): ${abaixo(e)} pessoa(s) abaixo da expectativa${ondeTexto}.`);

        // Quem pode ajudar: quem já domina o mesmo conhecimento.
        const dominam = Number(e.situacoes?.total?.MANTEVE ?? 0) + Number(e.situacoes?.total?.ATINGIU ?? 0);
        const fora = dim === "TECNICO" ? Number(e.potencialidades?.acimaDe70 ?? 0) : 0;
        if (dominam + fora > 0) {
          ajudar.push(
            `${e.eixo}: ${dominam} pessoa(s) já alcançam a expectativa${fora ? ` e ${fora} dominam o tema mesmo sem ser exigido pela função` : ""} — podem atuar como multiplicadoras ou mentoras.`,
          );
        }
      }

      // O que melhorou e o que caiu.
      const comEvol = eixos.filter((e) => evol(e, dim) !== null && e.itensComMeta >= 3);
      const ord = [...comEvol].sort((a, b) => evol(b, dim) - evol(a, dim));
      const subiu = ord.filter((e) => evol(e, dim) > 0).slice(0, 3);
      if (subiu.length) melhorou.push(`No ${nomeDim(dim)}: ${lista(subiu.map((e) => `${e.eixo} (${fmtEvol(evol(e, dim), dim)})`))}.`);
      const desceu = ord.filter((e) => evol(e, dim) < 0).reverse().slice(0, 3);
      if (desceu.length) caiu.push(`No ${nomeDim(dim)}: ${lista(desceu.map((e) => `${e.eixo} (${fmtEvol(evol(e, dim), dim)})`))}.`);
    }

    // Unidades: maior e menor evolução técnica.
    const unid = (d.porUnidade as any[])
      .map((u) => ({ nome: u.unidade as string, v: combinar([u.TECNICO]).indice }))
      .filter((u) => u.v !== null) as Array<{ nome: string; v: number }>;
    if (unid.length >= 2) {
      const o = [...unid].sort((a, b) => b.v - a.v);
      melhorou.push(`Unidade com maior evolução técnica: ${o[0].nome} (${fmtPp(o[0].v)}).`);
      const ult = o[o.length - 1];
      (ult.v < 0 ? caiu : atencao).push(`Unidade com ${ult.v < 0 ? "queda" : "menor evolução"} técnica: ${ult.nome} (${fmtPp(ult.v)}).`);
    }

    // Atenção na leitura: cobertura das medições.
    const tecTotal = SITUACOES.reduce((t, x) => t + tec.situacoes[x], 0);
    const semProva = tec.situacoes.AGUARDANDO_MEDICAO;
    if (tecTotal && semProva) {
      atencao.push(
        `${Math.round((semProva / tecTotal) * 100)}% dos eixos técnicos com expectativa ainda não têm resultado da prova 2026. As conclusões técnicas valem só para quem já fez a prova.`,
      );
    }
    if (d.geral.COMPORTAMENTAL.efetividade.amostraComAcao === 0) {
      atencao.push(
        `As ações comportamentais do PDI deste ciclo foram feitas depois da ${d.periodos.COMPORTAMENTAL.atual ?? "última Avaliação de Desempenho"}; o efeito delas só aparecerá na próxima avaliação.`,
      );
    }
    const efT = d.geral.TECNICO.efetividade;
    if (efT.amostraComAcao >= 5 && efT.amostraSemAcao >= 5 && efT.evolucaoComAcaoConcluidaPp !== null && efT.evolucaoSemAcaoPp !== null) {
      const dif = Math.round((efT.evolucaoComAcaoConcluidaPp - efT.evolucaoSemAcaoPp) * 10) / 10;
      (dif >= 0 ? melhorou : atencao).push(
        `PDI técnico: quem concluiu ação no eixo evoluiu ${fmtPp(efT.evolucaoComAcaoConcluidaPp)}, contra ${fmtPp(efT.evolucaoSemAcaoPp)} de quem não teve ação (${dif >= 0 ? "+" : ""}${fmtNum(dif)} pp de diferença; ${efT.amostraComAcao} e ${efT.amostraSemAcao} casos).`,
      );
    }

    return { atuar, ajudar, melhorou, caiu, atencao };
  })();

  // Técnico em % de acerto; comportamental na nota oficial da AD (0 a 3).
  // Nenhum número mistura as duas escalas.
  const notaComp = d.geral.COMPORTAMENTAL.nota;
  const kpis = [
    {
      titulo: "Índice de Evolução do Ciclo",
      tec: { valor: fmtPp(tec.indice), cor: corDelta(tec.indice), unidade: "pontos percentuais de acerto" },
      comp: { valor: fmtDeltaNota(notaComp?.indiceEvolucao), cor: corDelta(notaComp?.indiceEvolucao), unidade: "na nota da AD (0 a 3)" },
      explica:
        "Técnico: quanto o percentual médio de acerto subiu entre a prova anterior e a atual. Comportamental: quanto a nota média da Avaliação de Desempenho subiu, na escala de 0 a 3. Só entra quem tem as duas medições.",
    },
    {
      titulo: "Eixos e competências na expectativa de desenvolvimento",
      tec: { valor: `${fmtPct(tec.naMetaBase)} → ${fmtPct(tec.naMetaAtual)}`, cor: "#172033", unidade: "dos eixos com 70% de acerto ou mais" },
      comp: { valor: `${fmtPct(comp.naMetaBase)} → ${fmtPct(comp.naMetaAtual)}`, cor: "#172033", unidade: "das competências com nota 2,1 ou mais" },
      explica: "Quantos eixos e competências com expectativa estão na expectativa. Primeiro número: medição anterior; segundo: medição atual.",
    },
    {
      titulo: "Estavam abaixo da expectativa e atingiram",
      situacao: "ATINGIU" as Situacao,
      total: fmtNum(ambos.situacoes.ATINGIU, 0),
      totalCor: "#1F7A4D",
      tec: { valor: fmtNum(tec.situacoes.ATINGIU, 0), cor: "#1F7A4D", unidade: "eixos técnicos" },
      comp: { valor: fmtNum(comp.situacoes.ATINGIU, 0), cor: "#1F7A4D", unidade: "competências" },
      explica: "Estavam abaixo da expectativa (ou sem medição) e chegaram à expectativa na medição atual: 70% de acerto no técnico, nota 2,1 no comportamental.",
    },
    {
      titulo: "Pontos a desenvolver no próximo PDI",
      situacao: A_DESENVOLVER,
      total: fmtNum(somar(ambos, A_DESENVOLVER), 0),
      totalCor: "#1D4ED8",
      tec: { valor: fmtNum(somar(tec, A_DESENVOLVER), 0), cor: "#1D4ED8", unidade: "eixos técnicos" },
      comp: { valor: fmtNum(somar(comp, A_DESENVOLVER), 0), cor: "#1D4ED8", unidade: "competências" },
      explica:
        "Eixos e competências que, na medição atual, estão abaixo da expectativa de desenvolvimento. São os pontos que o próximo PDI deve considerar.",
    },
  ] as Array<{ titulo: string; situacao?: Situacao | Situacao[]; total?: string; totalCor?: string; tec: any; comp: any; explica: string }>;

  const resumoDim = (dim: Dimensao, ind: ReturnType<typeof combinar>) => {
    const g = d.geral[dim];
    const pm = g.motivos.porMotivo;
    const nome = dim === "TECNICO" ? "Eixos" : "Competências";
    return [
      ...(dim === "TECNICO"
        ? [
            { nome: "Índice de Evolução Técnica", valor: fmtPp(ind.indice), cor: corDelta(ind.indice), explica: "Quanto o percentual médio de acerto subiu, em pontos percentuais." },
            { nome: "Acerto médio nos eixos com expectativa", valor: `${fmtPct(g.mediaBase)} → ${fmtPct(g.mediaAtual)}`, cor: "#172033", explica: "Média do percentual de acerto: prova anterior → prova atual." },
            { nome: "Eixos na expectativa (70% de acerto)", valor: `${fmtPct(ind.naMetaBase)} → ${fmtPct(ind.naMetaAtual)}`, cor: "#172033", explica: leg.indicadores.percentualNaMeta },
          ]
        : [
            { nome: "Índice de Evolução Comportamental", valor: fmtDeltaNota(g.nota?.indiceEvolucao), cor: corDelta(g.nota?.indiceEvolucao), explica: "Quanto a nota média da Avaliação de Desempenho subiu, na escala de 0 a 3." },
            { nome: "Nota média (0 a 3)", valor: `${fmtNota(g.nota?.mediaBase)} → ${fmtNota(g.nota?.mediaAtual)}`, cor: "#172033", explica: "Nota média das competências: AD anterior → AD atual." },
            { nome: "Competências na expectativa (nota 2,1)", valor: `${fmtPct(ind.naMetaBase)} → ${fmtPct(ind.naMetaAtual)}`, cor: "#172033", explica: "Dos itens avaliados, quantos têm nota 2,1 ou mais (70% da escala)." },
          ]),
      { nome: `${nome} que atingiram a expectativa no ciclo`, valor: fmtNum(ind.situacoes.ATINGIU, 0), cor: "#1F7A4D", explica: `Quais: ${resumoEixos(dim, "ATINGIU", 3)}` },
      {
        nome: `${nome} a desenvolver no próximo PDI`,
        valor: fmtNum(somar(ind, A_DESENVOLVER), 0),
        cor: "#1D4ED8",
        explica: `Abaixo da expectativa na medição atual. Quais: ${resumoEixos(dim, A_DESENVOLVER, 3)}`,
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
              explica: `Eixos Não essenciais (sem expectativa definida) que a pessoa já domina. ${fmtNum(g.potencialidades.acimaDe70, 0)} estão acima de 70% e podem atuar como multiplicadores.`,
            },
          ]
        : []),
    ];
  };

  // Valor de um item na escala da sua dimensão.
  const valorItem = (i: any, quando: "base" | "atual") =>
    i.dimensao === "COMPORTAMENTAL" || (i.notaBase !== undefined && i.notaBase !== null) || (i.notaAtual !== undefined && i.notaAtual !== null)
      ? `nota ${fmtNota(quando === "base" ? i.notaBase : i.notaAtual)}`
      : fmtPct(quando === "base" ? i.base : i.atual);

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
    .sort((a, b) => {
      const v = (e: any) => (abaEixo === "TECNICO" ? e.indiceEvolucaoPp : e.nota?.indiceEvolucao) ?? -999;
      return v(b) - v(a);
    });

  // ---- Unidades (recorte atual)
  const unidadesLinhas = (d.porUnidade as any[]).map((u) => {
    const c = combinar(dimensoesDoRecorte.map((x) => u[x]));
    return {
      nome: u.unidade,
      evolTec: combinar([u.TECNICO]).indice,
      evolComp: u.COMPORTAMENTAL?.nota?.indiceEvolucao ?? null,
      naMeta: c.naMetaAtual,
      atingiu: c.situacoes.ATINGIU,
      semAcao: A_DESENVOLVER.reduce((t, x) => t + c.situacoes[x], 0),
      aguardando: c.situacoes.AGUARDANDO_MEDICAO,
    };
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
    baixarCsv(`resultado-executivo-${listaSituacoes ? "a-desenvolver" : situacaoSel.toLowerCase()}.csv`, [
      ["Empregado", "Unidade", "Dimensão", "Eixo / competência", "Relação", "Escala", "Medição anterior", "Medição atual", "Evolução", "Situação", "Por quê"],
      ...itensLista.map((i) => [
        i.colaboradorNome,
        i.unidade,
        i.dimensao === "TECNICO" ? "Técnico" : "Comportamental",
        i.eixo,
        i.relacao,
        i.dimensao === "TECNICO" ? "% de acerto" : "nota AD (0 a 3)",
        i.dimensao === "TECNICO" ? i.base : i.notaBase,
        i.dimensao === "TECNICO" ? i.atual : i.notaAtual,
        i.dimensao === "TECNICO" ? i.deltaPp : i.deltaNota,
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

      {/* Síntese gerencial */}
      <Card className="border-[#CBD2DC]">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-lg font-bold">Síntese gerencial</p>
            <Explica>Conclusões tiradas automaticamente dos resultados de {unidade === "TODAS" ? "todo o SEBRAE/TO" : unidade}. Os detalhes e os números de cada ponto estão nas seções abaixo.</Explica>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { titulo: "Onde atuar primeiro", cor: "#B45309", itens: sintese.atuar, vazio: "Nenhum conhecimento com pessoas abaixo da expectativa na medição atual." },
              { titulo: "Quem pode ajudar", cor: "#6D4BC0", itens: sintese.ajudar, vazio: "Sem multiplicadores identificados para as prioridades." },
              { titulo: "O que melhorou no ciclo", cor: "#1F7A4D", itens: sintese.melhorou, vazio: "Ainda sem medições suficientes para comparar." },
              { titulo: "O que caiu", cor: "#B4400B", itens: sintese.caiu, vazio: "Nenhum conhecimento com queda média." },
            ].map((b) => (
              <div key={b.titulo} className="rounded-xl border border-[#E3E7EE] p-4">
                <p className="text-sm font-bold" style={{ color: b.cor }}>
                  {b.titulo}
                </p>
                {b.itens.length ? (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                    {b.itens.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[#4B5563]">{b.vazio}</p>
                )}
              </div>
            ))}
          </div>
          {sintese.atencao.length > 0 && (
            <div className="rounded-xl bg-[#FFFBEB] p-4">
              <p className="text-sm font-bold text-[#78350F]">Atenção na leitura</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-[#172033]">
                {sintese.atencao.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Como ler */}
      <Card className="border-[#E3E7EE] bg-[#F4F6F9]">
        <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-2">
          <p className="md:col-span-2 font-semibold">Como ler este relatório</p>
          <p>
            <strong>Técnico:</strong> eixos de conhecimento da função, medidos pela Prova de Certificação ({periodo("TECNICO")}).
          </p>
          <p>
            <strong>Comportamental:</strong> as competências que a Avaliação de Desempenho mediu ({periodo("COMPORTAMENTAL")}), na nota oficial de 0 a 3, sem conversão.
          </p>
          <p>
            <strong>Expectativa de desenvolvimento:</strong> 70% de acerto nos eixos Essenciais e Transversais; nota 2,1 (70% da escala) nas competências. Abaixo disso = ponto a desenvolver. Por usarem escalas diferentes, técnico e comportamental aparecem sempre lado a lado, nunca somados.
          </p>
          <p>
            <strong>Não essencial:</strong> não tem expectativa definida. O que a pessoa domina nesses eixos aparece como potencialidade, nunca como lacuna.
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
              {k.total !== undefined && (
                <p className="text-3xl font-bold" style={{ color: k.totalCor }}>
                  {k.total}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Técnico", k.tec],
                  ["Comportamental", k.comp],
                ].map(([rotulo, v]: any) => (
                  <div key={rotulo} className="rounded-lg bg-[#F4F6F9] p-2.5">
                    <p className="text-xs font-semibold text-[#4B5563]">{rotulo}</p>
                    <p className={`${k.total !== undefined ? "text-lg" : "text-xl"} font-bold leading-tight`} style={{ color: v.cor }}>
                      {v.valor}
                    </p>
                    <p className="text-[11px] leading-snug text-[#4B5563]">{v.unidade}</p>
                    {k.situacao && (
                      <p className="mt-1.5 text-[11.5px] leading-snug text-[#172033]">
                        {resumoEixos(rotulo === "Técnico" ? "TECNICO" : "COMPORTAMENTAL", k.situacao)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {k.situacao && (
                <Button variant="outline" className="min-h-[44px] self-start" onClick={() => abrirLista(k.situacao!)} disabled={k.total === "0"}>
                  Ver quem são
                </Button>
              )}
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
              <div className="grid gap-3 sm:grid-cols-3">
                {resumoDim(dim, dim === "TECNICO" ? tec : comp)
                  .slice(0, 3)
                  .map((i) => (
                    <div key={i.nome} className="rounded-lg border border-[#E3E7EE] bg-white p-3">
                      <p className="text-xs font-semibold text-[#374151]">{i.nome}</p>
                      <p className="text-lg font-bold" style={{ color: i.cor }}>
                        {i.valor}
                      </p>
                      <Explica>{i.explica}</Explica>
                    </div>
                  ))}
              </div>
              {(() => {
                const l = listasEixos(dim);
                const nenhum = dim === "TECNICO" ? "Nenhum eixo" : "Nenhuma competência";
                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-bold text-[#B45309]">Onde precisamos atuar</p>
                      <Explica>
                        {dim === "TECNICO" ? "Eixos" : "Competências"} com pessoas abaixo da expectativa de desenvolvimento na medição atual. Do maior para o menor número de pessoas.
                      </Explica>
                      {l.atuar.length ? (
                        <ul className="mt-2 divide-y divide-[#EEF1F5] rounded-lg border border-[#E3E7EE]">
                          {l.atuar.map((x) => (
                            <li key={x.eixo} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                              <span className="font-medium">
                                {x.eixo}
                                {x.transversal && <span className="ml-1.5 text-[11px] font-semibold text-[#1D4ED8]">Transversal</span>}
                              </span>
                              <span className="text-[#374151]">
                                <strong>{x.abaixo}</strong> de {x.medidos} pessoa(s) abaixo ·{" "}
                                <span style={{ color: x.corEvolucao }}>{x.evolucao}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[#4B5563]">{nenhum} com pessoas abaixo da expectativa.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1F7A4D]">Estão bem</p>
                      <Explica>Todos os avaliados alcançam a expectativa de desenvolvimento.</Explica>
                      {l.bem.length ? (
                        <ul className="mt-2 divide-y divide-[#EEF1F5] rounded-lg border border-[#E3E7EE]">
                          {l.bem.map((x) => (
                            <li key={x.eixo} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                              <span className="font-medium">
                                {x.eixo}
                                {x.transversal && <span className="ml-1.5 text-[11px] font-semibold text-[#1D4ED8]">Transversal</span>}
                              </span>
                              <span className="text-[#374151]">
                                {x.medidos} pessoa(s){x.atingiu ? ` · ${x.atingiu} chegaram neste ciclo` : ""} ·{" "}
                                <span style={{ color: x.corEvolucao }}>{x.evolucao}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[#4B5563]">{nenhum} com todos na expectativa.</p>
                      )}
                    </div>
                    {l.aguardando.length > 0 && (
                      <div>
                        <p className="text-sm font-bold text-[#4B5563]">Aguardando medição</p>
                        <p className="mt-1 text-sm text-[#374151]">
                          {l.aguardando.map((x) => `${x.eixo} (${x.aguardando})`).join(" · ")}
                        </p>
                        <Explica>
                          {dim === "TECNICO"
                            ? "Ainda sem resultado da prova 2026 para estas pessoas; entre parênteses, quantas aguardam."
                            : "Sem a Avaliação de Desempenho mais recente para estas pessoas."}
                        </Explica>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conhecimentos e potencialidades da empresa */}
      {(() => {
        const disseminados = (dim: Dimensao) =>
          (d.porEixo as any[])
            .filter((e) => e.dimensao === dim && Number(e.disseminacao?.pessoasMedidas ?? 0) >= 3)
            .map((e) => ({
              eixo: e.eixo as string,
              medidas: Number(e.disseminacao.pessoasMedidas),
              em70: Number(e.disseminacao.pessoasEm70),
            }))
            .map((x) => ({ ...x, pct: Math.round((x.em70 / x.medidas) * 100) }))
            .sort((a, b) => b.em70 - a.em70 || b.pct - a.pct || a.eixo.localeCompare(b.eixo, "pt-BR"))
            .slice(0, 10);
        const potencialidades = (d.porEixo as any[])
          .filter((e) => e.dimensao === "TECNICO" && Number(e.potencialidades?.acimaDe70 ?? 0) > 0)
          .map((e) => ({ eixo: e.eixo as string, acima: Number(e.potencialidades.acimaDe70), total: Number(e.potencialidades.total) }))
          .sort((a, b) => b.acima - a.acima || a.eixo.localeCompare(b.eixo, "pt-BR"));
        const Lista = ({ itens, vazio, texto }: { itens: any[]; vazio: string; texto: (x: any) => React.ReactNode }) =>
          itens.length ? (
            <ul className="mt-2 divide-y divide-[#EEF1F5] rounded-lg border border-[#E3E7EE]">
              {itens.map((x) => (
                <li key={x.eixo} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">{x.eixo}</span>
                  <span className="text-[#374151]">{texto(x)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#4B5563]">{vazio}</p>
          );
        return (
          <Card className="border-[#E3E7EE]">
            <CardContent className="space-y-5 p-5">
              <div>
                <p className="text-lg font-bold">Conhecimentos e potencialidades da empresa</p>
                <Explica>O que o SEBRAE/TO já sabe, independentemente da função de cada pessoa. Medição atual.</Explica>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                <div>
                  <p className="text-sm font-bold text-[#0F5C55]">Conhecimentos técnicos mais disseminados</p>
                  <Explica>Eixos em que mais pessoas têm 70% de acerto ou mais, em qualquer função.</Explica>
                  <Lista
                    itens={disseminados("TECNICO")}
                    vazio="Ainda sem resultados da prova 2026."
                    texto={(x) => (
                      <>
                        <strong>{x.em70}</strong> de {x.medidas} pessoas ({x.pct}%)
                      </>
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F5C55]">Competências comportamentais mais fortes</p>
                  <Explica>Competências em que mais pessoas têm nota 2,1 ou mais na Avaliação de Desempenho.</Explica>
                  <Lista
                    itens={disseminados("COMPORTAMENTAL")}
                    vazio="Sem Avaliação de Desempenho registrada."
                    texto={(x) => (
                      <>
                        <strong>{x.em70}</strong> de {x.medidas} pessoas ({x.pct}%)
                      </>
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#6D4BC0]">Potencialidades</p>
                  <Explica>
                    Eixos que não são exigidos pela função da pessoa (Não essenciais), mas que ela domina com 70% ou mais. É conhecimento disponível para outras áreas e para
                    atuar como multiplicador.
                  </Explica>
                  <Lista
                    itens={potencialidades}
                    vazio="Nenhuma potencialidade acima de 70% ainda."
                    texto={(x) => (
                      <>
                        <strong>{x.acima}</strong> pessoa(s) com 70% ou mais
                      </>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Situações */}
      <Card className="border-[#E3E7EE]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">Situação de cada eixo técnico e competência comportamental</p>
              <Explica>
                Cada pessoa tem vários eixos e competências com expectativa. Aqui está onde cada um deles está no ciclo. Clique em uma situação para ver o motivo e o que fazer.
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
              <p className="pt-2 text-sm font-semibold">Quais eixos e competências</p>
              <div className="space-y-1.5 text-sm">
                {dimensoesDoRecorte.map((dim) => {
                  const lista = eixosNaSituacao(dim, situacaoSel);
                  return (
                    <p key={dim}>
                      <span className="font-semibold">{dim === "TECNICO" ? "Técnico: " : "Comportamental: "}</span>
                      {lista.length ? lista.map((x) => `${x.eixo} (${x.qtd})`).join(" · ") : "nenhum"}
                    </p>
                  );
                })}
              </div>
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
                        {a.eixo} — {valorItem(a, "base")} → {valorItem(a, "atual")}
                        {a.porque ? ` · ${tituloPorque(a.porque)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Explica>Ninguém nesta situação.</Explica>
              )}
              <Button variant="outline" className="min-h-[44px]" onClick={() => abrirLista(situacaoSel)} disabled={!combinado.situacoes[situacaoSel]}>
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
              <Explica>Média de todos os empregados que têm aquele eixo ou competência com expectativa.</Explica>
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
              <span className="inline-block h-3 w-0.5 bg-[#172033]" aria-hidden="true" /> Expectativa: {abaEixo === "TECNICO" ? "70% de acerto" : "nota 2,1"}
            </span>
            <span>
              {abaEixo === "TECNICO" ? "Valores em % de acerto · Δ = pontos percentuais" : "Valores na nota da AD (0 a 3) · Δ = diferença na nota"}
            </span>
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
                      : `${s.ATINGIU} atingiram a expectativa · ${A_DESENVOLVER.reduce((t: number, x) => t + Number(s[x] ?? 0), 0)} abaixo da expectativa${s.AGUARDANDO_MEDICAO ? ` · ${s.AGUARDANDO_MEDICAO} sem medição atual` : ""}`;
                  return (
                    <tr key={e.eixo} className="border-b border-[#EEF1F5] align-top">
                      <td className="py-3 pr-3 font-medium">
                        {e.eixo}
                        {e.transversal && <span className="ml-2 rounded bg-[#EEF3FD] px-1.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">Transversal</span>}
                        <span className="block text-xs font-normal text-[#4B5563]">{e.itensComMeta} com expectativa</span>
                      </td>
                      <td className="w-[38%] py-3 pr-3">
                        <div className="relative space-y-1.5">
                          {(abaEixo === "TECNICO"
                            ? [
                                { largura: e.mediaBase, rotulo: fmtPct(e.mediaBase), cor: "#B8C2D1" },
                                { largura: e.mediaAtual, rotulo: fmtPct(e.mediaAtual), cor: "#1D4ED8" },
                              ]
                            : [
                                { largura: e.nota?.mediaBase != null ? (e.nota.mediaBase / 3) * 100 : null, rotulo: fmtNota(e.nota?.mediaBase), cor: "#B8C2D1" },
                                { largura: e.nota?.mediaAtual != null ? (e.nota.mediaAtual / 3) * 100 : null, rotulo: fmtNota(e.nota?.mediaAtual), cor: "#1D4ED8" },
                              ]
                          ).map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="relative h-2 flex-1 rounded bg-[#EEF1F5]">
                                <div className="h-2 rounded" style={{ width: `${Math.max(0, Math.min(100, b.largura ?? 0))}%`, background: b.cor }} />
                                <div className="absolute -top-1 h-4 w-0.5 bg-[#172033]" style={{ left: `${META}%` }} aria-hidden="true" />
                              </div>
                              <span className="w-12 text-right text-xs tabular-nums">{b.rotulo}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td
                        className="py-3 pr-3 text-right font-semibold tabular-nums"
                        style={{ color: corDelta(abaEixo === "TECNICO" ? e.indiceEvolucaoPp : e.nota?.indiceEvolucao) }}
                      >
                        {abaEixo === "TECNICO" ? fmtPp(e.indiceEvolucaoPp) : fmtDeltaNota(e.nota?.indiceEvolucao)}
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
                          {dim === "TECNICO" ? fmtPp(ef.evolucaoComAcaoConcluidaPp) : `${fmtDeltaNota(d.geral[dim].nota?.efetividade?.evolucaoComAcaoConcluida)} na nota`}
                        </p>
                        <Explica>evolução média em {ef.amostraComAcao} pontos de desenvolvimento</Explica>
                      </div>
                      <div>
                        <p className="text-xs text-[#4B5563]">Não tiveram ação</p>
                        <p className="text-2xl font-bold" style={{ color: corDelta(ef.evolucaoSemAcaoPp) }}>
                          {dim === "TECNICO" ? fmtPp(ef.evolucaoSemAcaoPp) : `${fmtDeltaNota(d.geral[dim].nota?.efetividade?.evolucaoSemAcao)} na nota`}
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
                  <th className="py-2 pr-3 text-right font-semibold">Evolução técnica (pp)</th>
                  <th className="py-2 pr-3 text-right font-semibold">Evolução comportamental (nota)</th>
                  <th className="py-2 pr-3 text-right font-semibold">Na expectativa (medição atual)</th>
                  <th className="py-2 pr-3 text-right font-semibold">Atingiram a expectativa no ciclo</th>
                  <th className="py-2 pr-3 text-right font-semibold">A desenvolver no próximo PDI</th>
                  <th className="py-2 text-right font-semibold">Sem medição atual</th>
                </tr>
              </thead>
              <tbody>
                {unidadesLinhas.map((u) => (
                  <tr key={u.nome} className="border-b border-[#EEF1F5]">
                    <td className="py-2.5 pr-3 font-medium">{u.nome}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums" style={{ color: corDelta(u.evolTec) }}>
                      {fmtPp(u.evolTec)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums" style={{ color: corDelta(u.evolComp) }}>
                      {fmtDeltaNota(u.evolComp)}
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
            Evolução técnica = diferença no percentual médio de acerto, em pontos percentuais. Evolução comportamental = diferença na nota média da AD (0 a 3). As colunas de contagem são pontos de desenvolvimento (eixos e competências com expectativa), não pessoas; as colunas de expectativa e contagem seguem o recorte da seção Situação.
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
            <DialogTitle>{listaSituacoes ? "Pontos a desenvolver no próximo PDI" : legSel.nome}</DialogTitle>
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
                      <td className="py-2 pr-3 text-right tabular-nums">{valorItem(i, "base")}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{valorItem(i, "atual")}</td>
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

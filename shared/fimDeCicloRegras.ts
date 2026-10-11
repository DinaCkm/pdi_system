// Relatório de Fim de Ciclo do PDI — regras puras (sem banco).
// Especificação: "Especificação de ajustes — Relatório de Fim de Ciclo do PDI".
//
// Vocabulário: uma AVALIAÇÃO é o resultado de uma pessoa em um eixo técnico ou
// em uma competência. Cada avaliação compara o PONTO DE PARTIDA (PP) com a
// NOVA MEDIÇÃO (NM). A referência é 70% nos dois instrumentos. Técnico
// (Avaliação de Proficiência) e comportamental (Avaliação de Desempenho) são
// sempre lidos separadamente: nunca somados nem com média conjunta.

export const REFERENCIA = 70;

// Seção 5: limites em pontos (escala de 0 a 100%). Pendentes de validação com a
// diretoria: ficam aqui, num único lugar, para poderem ser ajustados.
export const PARAMETROS = {
  referencia: REFERENCIA,
  limiarEvolucaoPontos: 10, //  PP < 70, NM < 70 e NM − PP ≥ 10 → "Em evolução"
  limiarAtencaoPontos: 10, //   NM ≥ 70 e queda ≥ 10 → "Ponto de atenção"
  amostraMinima: 5, //          n < 5 → "amostra pequena", fora de destaques e sínteses
  comparacaoMinima: 20, //      comparação entre grupos só com 20 avaliações por grupo
};

export const INSTRUMENTOS = ["TECNICO", "COMPORTAMENTAL"] as const;
export type Instrumento = (typeof INSTRUMENTOS)[number];

export const CLASSES = [
  "MANTEVE",
  "ATENCAO",
  "CHEGOU",
  "EM_EVOLUCAO",
  "NOVO_FOCO_PERSISTENTE",
  "NOVO_FOCO_NOVA",
  "PRIMEIRA_MEDICAO",
  "SEM_COMPARACAO",
] as const;
export type Classe = (typeof CLASSES)[number];

// Grupos da barra empilhada (bloco 3).
export const GRUPOS = ["MANTEVE", "CHEGOU", "ABAIXO", "SEM_COMPARACAO"] as const;
export type Grupo = (typeof GRUPOS)[number];

export const GRUPO_DA_CLASSE: Record<Classe, Grupo> = {
  MANTEVE: "MANTEVE",
  ATENCAO: "MANTEVE",
  CHEGOU: "CHEGOU",
  EM_EVOLUCAO: "ABAIXO",
  NOVO_FOCO_PERSISTENTE: "ABAIXO",
  NOVO_FOCO_NOVA: "ABAIXO",
  PRIMEIRA_MEDICAO: "SEM_COMPARACAO",
  SEM_COMPARACAO: "SEM_COMPARACAO",
};

export const ROTULO_CLASSE: Record<Classe, string> = {
  MANTEVE: "Já acima de 70% e manteve",
  ATENCAO: "Atenção",
  CHEGOU: "Chegou a 70% neste ciclo",
  EM_EVOLUCAO: "Em evolução",
  NOVO_FOCO_PERSISTENTE: "Abaixo de 70%",
  NOVO_FOCO_NOVA: "Abaixo de 70% (caiu)",
  PRIMEIRA_MEDICAO: "Primeira medição",
  SEM_COMPARACAO: "Aguardando medição",
};

export const ROTULO_GRUPO: Record<Grupo, string> = {
  MANTEVE: "Já acima de 70% e manteve",
  CHEGOU: "Chegou a 70% neste ciclo",
  ABAIXO: "Abaixo de 70%",
  SEM_COMPARACAO: "Sem comparação",
};

export function classificar(pp: number | null, nm: number | null, p = PARAMETROS): Classe {
  if (nm === null) return "SEM_COMPARACAO";
  if (pp === null) return "PRIMEIRA_MEDICAO";
  const ref = p.referencia;
  if (pp >= ref && nm >= ref) return pp - nm >= p.limiarAtencaoPontos ? "ATENCAO" : "MANTEVE";
  if (pp < ref && nm >= ref) return "CHEGOU";
  if (pp < ref && nm < ref) return nm - pp >= p.limiarEvolucaoPontos ? "EM_EVOLUCAO" : "NOVO_FOCO_PERSISTENTE";
  return "NOVO_FOCO_NOVA"; // pp ≥ 70 e nm < 70
}

// ---------- Números (seção 6.2) ----------

export function arred(v: number, casas = 1) {
  const f = 10 ** casas;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

export function media(valores: number[]) {
  return valores.length ? arred(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
}

export function pct(parte: number, total: number) {
  return total > 0 ? arred((parte / total) * 100) : null;
}

const nf = (casas: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });

// Número sem sinal. Nunca "-0".
export function fmtNum(v: number | null | undefined, casas = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "[a carregar]";
  return nf(casas).format(arred(v, casas));
}

export function fmtPct(v: number | null | undefined) {
  return v === null || v === undefined || !Number.isFinite(v) ? "[a carregar]" : `${fmtNum(v)}%`;
}

// Variação com sinal: zero aparece "0", sem sinal; nunca "−0". Usa o sinal de menos tipográfico.
export function fmtDelta(v: number | null | undefined, casas = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "[a carregar]";
  const r = arred(v, casas);
  if (r === 0) return "0";
  return `${r > 0 ? "+" : "−"}${nf(casas).format(Math.abs(r))}`;
}

// Sentido da variação: positivo, zero ou negativo (o arredondado decide; zero nunca é verde).
export function sentido(v: number | null | undefined): "positivo" | "zero" | "negativo" | "indefinido" {
  if (v === null || v === undefined || !Number.isFinite(v)) return "indefinido";
  const r = arred(v);
  return r > 0 ? "positivo" : r < 0 ? "negativo" : "zero";
}

// "subiu 6,2 pontos, de 72% para 78,2%" — sempre com a média antes e depois (seção 6.4).
export function fraseVariacao(antes: number | null, depois: number | null) {
  if (antes === null || depois === null) return "sem as duas medições para comparar";
  const d = arred(depois - antes);
  const ab = Math.abs(d);
  const pontos = `${fmtNum(ab)} ${ab === 1 ? "ponto" : "pontos"}`;
  if (d === 0) return `igual, de ${fmtPct(antes)} para ${fmtPct(depois)}`;
  if (Math.abs(d) < 1) return `praticamente igual, ${fmtDelta(d)} ponto, de ${fmtPct(antes)} para ${fmtPct(depois)}`;
  return `${d > 0 ? "subiu" : "caiu"} ${pontos}, de ${fmtPct(antes)} para ${fmtPct(depois)}`;
}

// Variação relativa ((Y − X) / X).
export function variacaoRelativa(antes: number | null, depois: number | null) {
  if (antes === null || depois === null || antes === 0) return null;
  return arred(((depois - antes) / antes) * 100);
}

// ---------- Sínteses (seção 9) ----------
// 2 a 3 frases, até 60 palavras, sem nomes de pessoas e sem eixo com n < 5.

export function contarPalavras(texto: string) {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export function lista(nomes: string[]) {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

// Mantém a síntese dentro do limite: corta frases do fim até caber.
export function limitarSintese(frases: string[], maxPalavras = 60) {
  const usadas: string[] = [];
  for (const f of frases.filter(Boolean)) {
    const candidato = [...usadas, f].join(" ");
    if (contarPalavras(candidato) > maxPalavras && usadas.length >= 1) break;
    usadas.push(f);
    if (usadas.length === 3) break;
  }
  return usadas.join(" ");
}

export type ResumoInstrumento = {
  total: number;
  feitas: number;
  comparaveis: number;
  primeiraMedicao: number;
  aguardando: number;
  pctAcimaAntes: number | null;
  pctAcimaDepois: number | null;
  mediaAntes: number | null;
  mediaDepois: number | null;
  grupos: Record<Grupo, number>;
};

export function sinteseResultado(t: ResumoInstrumento, c: ResumoInstrumento) {
  const frases: string[] = [];
  const partes: string[] = [];
  if (t.pctAcimaDepois !== null) partes.push(`de ${fmtPct(t.pctAcimaAntes)} para ${fmtPct(t.pctAcimaDepois)} no técnico`);
  if (c.pctAcimaDepois !== null) partes.push(`de ${fmtPct(c.pctAcimaAntes)} para ${fmtPct(c.pctAcimaDepois)} nas competências`);
  if (partes.length) frases.push(`Avaliações acima de 70%: ${lista(partes)}.`);
  const notas: string[] = [];
  if (t.mediaAntes !== null && t.mediaDepois !== null) notas.push(`no técnico, ${fraseVariacao(t.mediaAntes, t.mediaDepois)}`);
  if (c.mediaAntes !== null && c.mediaDepois !== null) notas.push(`nas competências, ${fraseVariacao(c.mediaAntes, c.mediaDepois)}`);
  if (notas.length) frases.push(`Nota média: ${notas.join("; ")}.`);
  if (t.aguardando > 0) {
    frases.push(`A leitura técnica é parcial: ${t.aguardando} de ${t.total} avaliações aguardam a Avaliação de Proficiência 2026.`);
  }
  return limitarSintese(frases);
}

export function sinteseFechamento(t: ResumoInstrumento, c: ResumoInstrumento) {
  const frases = [
    `${t.grupos.MANTEVE + c.grupos.MANTEVE} avaliações já estavam acima de 70% e se mantiveram: ${t.grupos.MANTEVE} técnicas e ${c.grupos.MANTEVE} de competências.`,
    `${t.grupos.CHEGOU + c.grupos.CHEGOU} chegaram a 70% neste ciclo.`,
    `${t.grupos.ABAIXO + c.grupos.ABAIXO} seguem abaixo de 70% e entram no foco do próximo ciclo.`,
  ];
  return limitarSintese(frases);
}

export type EixoResumo = {
  nome: string;
  transversal: boolean;
  comparaveis: number;
  delta: number | null;
};

export function sinteseConhecimento(eixos: EixoResumo[], instrumento: Instrumento, minimo = PARAMETROS.amostraMinima) {
  const validos = eixos.filter((e) => e.comparaveis >= minimo && e.delta !== null);
  if (!validos.length) {
    return instrumento === "TECNICO"
      ? "Ainda não há eixo com pelo menos 5 pessoas com as duas medições para comparar."
      : "Ainda não há competência com pelo menos 5 pessoas com as duas avaliações para comparar.";
  }
  const sobe = validos.filter((e) => arred(e.delta!) > 0).sort((a, b) => b.delta! - a.delta!).slice(0, 2);
  const cai = validos.filter((e) => arred(e.delta!) < 0).sort((a, b) => a.delta! - b.delta!).slice(0, 2);
  const frases: string[] = [];
  if (sobe.length) frases.push(`Os maiores avanços vieram de ${lista(sobe.map((e) => `${e.nome} (${fmtDelta(e.delta)})`))}.`);
  if (cai.length) {
    const trans = cai.filter((e) => e.transversal).map((e) => e.nome);
    frases.push(
      `${lista(cai.map((e) => `${e.nome} (${fmtDelta(e.delta)})`))} ${cai.length > 1 ? "tiveram queda e pedem" : "teve queda e pede"} novo foco${
        trans.length ? `; ${lista(trans)} ${trans.length > 1 ? "são eixos transversais" : "é eixo transversal"}` : ""
      }.`,
    );
  }
  if (!sobe.length && !cai.length) frases.push("As médias ficaram praticamente iguais entre as duas medições.");
  if (instrumento === "COMPORTAMENTAL") frases.push("Estes resultados são o ponto de partida do PDI comportamental.");
  return limitarSintese(frases);
}

export function sintesePdi(args: {
  planejamentoPct: number | null;
  execucaoPct: number | null;
  forca: { nome: string; media: number | null; pessoas: number } | null;
  multiplicadores: number;
}) {
  const frases: string[] = [];
  const partes: string[] = [];
  if (args.planejamentoPct !== null) partes.push(`${fmtPct(args.planejamentoPct)} dos pontos de partida abaixo de 70% receberam plano`);
  if (args.execucaoPct !== null) partes.push(`${fmtPct(args.execucaoPct)} das ações técnicas foram concluídas antes da nova medição`);
  if (partes.length) frases.push(`${lista(partes)}.`.replace(/^./, (c) => c.toUpperCase()));
  if (args.forca) {
    frases.push(
      `${args.forca.nome} é a principal força transversal, com média de ${fmtPct(args.forca.media)} entre ${args.forca.pessoas} pessoas.`,
    );
  }
  if (args.multiplicadores > 0) frases.push("Há conhecimento disponível para mentoria interna.");
  return limitarSintese(frases);
}

export function sinteseInvestimento(
  linhas: Array<{ nome: string; tipo: Instrumento; crescimento: number | null; pctComAcao: number | null; contraste: boolean }>,
) {
  const tec = linhas.filter((l) => l.tipo === "TECNICO" && !l.contraste && l.crescimento !== null && arred(l.crescimento) > 0);
  const frases: string[] = [];
  const acompanharam = tec.filter((l) => (l.pctComAcao ?? 0) >= 50);
  const semInvest = tec.filter((l) => (l.pctComAcao ?? 0) < 50);
  if (acompanharam.length) {
    frases.push(`No técnico, o investimento acompanhou o crescimento em ${lista(acompanharam.map((l) => l.nome))}: metade ou mais das pessoas tinha ação concluída.`);
  }
  if (semInvest.length) {
    frases.push(`${lista(semInvest.map((l) => l.nome))} ${semInvest.length > 1 ? "cresceram" : "cresceu"} com poucas ações concluídas antes da nova medição.`);
  }
  if (!tec.length) frases.push("Ainda não há eixo técnico com pelo menos 5 pessoas e crescimento para relacionar com as ações do PDI.");
  frases.push("No comportamental, a leitura vale a partir da próxima Avaliação de Desempenho.");
  return limitarSintese(frases);
}

// Motivo curto de um item de foco (bloco 6).
export function motivoFoco(item: { delta: number | null; abaixo: number; pessoas: number }) {
  const d = item.delta === null ? null : arred(item.delta);
  if (d !== null && d < 0 && item.abaixo > 0) return `Queda no ciclo e ${item.abaixo} ${item.abaixo === 1 ? "pede" : "pedem"} novo foco. Recuperar quem caiu.`;
  if (d !== null && d < 0) return "Queda no ciclo, ainda acima de 70%. Manter a força.";
  if (item.abaixo > 0) return `${item.abaixo} de ${item.pessoas} abaixo de 70%. Incluir no próximo PDI.`;
  return "Acompanhar.";
}

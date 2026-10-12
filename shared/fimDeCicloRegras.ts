// Relatório de Fim de Ciclo do PDI — regras puras (sem banco).
//
// O relatório fala a mesma língua do sistema: CONCEITOS, nunca notas,
// médias ou percentuais (decisão de 12/10/2026). Os números que aparecem são
// só contagens de pessoas, avaliações e ações ("12 de 15 pessoas").
//
// Uma AVALIAÇÃO é o resultado de uma pessoa em um eixo técnico ou em uma
// competência. Compara o conceito do PONTO DE PARTIDA com o da NOVA MEDIÇÃO.
// A expectativa de desenvolvimento é "Conhecimento Aplicado" ou acima (a
// régua do sistema começa esse conceito em 70). Técnico (Avaliação de
// Proficiência) e comportamental (Avaliação de Desempenho) são sempre lidos
// separadamente.

import { FAIXAS_CONCEITO } from "./evolucaoDomain";

export const CONCEITOS = ["EM_DESENVOLVIMENTO", "APLICADO", "CONSOLIDADO", "AVANCADO", "REFERENCIA"] as const;
export type Conceito = (typeof CONCEITOS)[number];

export const ROTULO_CONCEITO: Record<Conceito, string> = {
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  APLICADO: "Conhecimento Aplicado",
  CONSOLIDADO: "Conhecimento Consolidado",
  AVANCADO: "Conhecimento Avançado",
  REFERENCIA: "Referência",
};

export const NIVEL: Record<Conceito, number> = {
  EM_DESENVOLVIMENTO: 1,
  APLICADO: 2,
  CONSOLIDADO: 3,
  AVANCADO: 4,
  REFERENCIA: 5,
};

// Mesma régua do sistema (shared/evolucaoDomain.ts), para técnico e comportamental.
export function conceitoDe(percentual: number | null | undefined): Conceito | null {
  if (percentual === null || percentual === undefined || !Number.isFinite(Number(percentual))) return null;
  const v = Number(percentual);
  if (v >= FAIXAS_CONCEITO.referencia) return "REFERENCIA";
  if (v >= FAIXAS_CONCEITO.avancado) return "AVANCADO";
  if (v >= FAIXAS_CONCEITO.consolidado) return "CONSOLIDADO";
  if (v >= FAIXAS_CONCEITO.aplicado) return "APLICADO";
  return "EM_DESENVOLVIMENTO";
}

export const EXPECTATIVA: Conceito = "APLICADO";
export const naExpectativa = (c: Conceito | null) => c !== null && NIVEL[c] >= NIVEL[EXPECTATIVA];
export const forte = (c: Conceito | null) => c !== null && NIVEL[c] >= NIVEL.AVANCADO;

export const PARAMETROS = {
  expectativa: ROTULO_CONCEITO[EXPECTATIVA],
  amostraMinima: 5, //      n < 5 → "amostra pequena", fora de destaques e sínteses
  comparacaoMinima: 20, //  leitura para o Sebrae todo só com 20 avaliações comparáveis por grupo
};

export const INSTRUMENTOS = ["TECNICO", "COMPORTAMENTAL"] as const;
export type Instrumento = (typeof INSTRUMENTOS)[number];

// Classificação por avaliação, só por conceito.
export const CLASSES = [
  "MANTEVE", //            na expectativa antes e depois, sem descer de conceito
  "ATENCAO", //            na expectativa antes e depois, mas desceu de conceito
  "CHEGOU", //             era Em Desenvolvimento e chegou à expectativa
  "ABAIXO_PERSISTENTE", // era e continua Em Desenvolvimento
  "ABAIXO_NOVA", //        estava na expectativa e passou a Em Desenvolvimento
  "PRIMEIRA_MEDICAO", //   só tem a nova medição: não conta como evolução
  "SEM_COMPARACAO", //     ainda sem a nova medição
] as const;
export type Classe = (typeof CLASSES)[number];

export const GRUPOS = ["MANTEVE", "CHEGOU", "ABAIXO", "SEM_COMPARACAO"] as const;
export type Grupo = (typeof GRUPOS)[number];

export const GRUPO_DA_CLASSE: Record<Classe, Grupo> = {
  MANTEVE: "MANTEVE",
  ATENCAO: "MANTEVE",
  CHEGOU: "CHEGOU",
  ABAIXO_PERSISTENTE: "ABAIXO",
  ABAIXO_NOVA: "ABAIXO",
  PRIMEIRA_MEDICAO: "SEM_COMPARACAO",
  SEM_COMPARACAO: "SEM_COMPARACAO",
};

export const ROTULO_GRUPO: Record<Grupo, string> = {
  MANTEVE: "Já na expectativa e manteve",
  CHEGOU: "Chegou à expectativa neste ciclo",
  ABAIXO: "Em Desenvolvimento",
  SEM_COMPARACAO: "Sem comparação",
};

export function classificar(antes: Conceito | null, depois: Conceito | null): Classe {
  if (depois === null) return "SEM_COMPARACAO";
  if (antes === null) return "PRIMEIRA_MEDICAO";
  const a = naExpectativa(antes);
  const d = naExpectativa(depois);
  if (a && d) return NIVEL[depois] < NIVEL[antes] ? "ATENCAO" : "MANTEVE";
  if (!a && d) return "CHEGOU";
  if (!a && !d) return "ABAIXO_PERSISTENTE";
  return "ABAIXO_NOVA";
}

export type Movimento = "SUBIU" | "MANTEVE" | "DESCEU";
export function movimento(antes: Conceito | null, depois: Conceito | null): Movimento | null {
  if (antes === null || depois === null) return null;
  const d = NIVEL[depois] - NIVEL[antes];
  return d > 0 ? "SUBIU" : d < 0 ? "DESCEU" : "MANTEVE";
}

export function distribuicaoVazia(): Record<Conceito, number> {
  return Object.fromEntries(CONCEITOS.map((c) => [c, 0])) as Record<Conceito, number>;
}

// Conceito em que está a maior parte das pessoas (empate: o mais alto).
export function conceitoPredominante(d: Record<Conceito, number>): Conceito | null {
  let melhor: Conceito | null = null;
  for (const c of CONCEITOS) if (d[c] > 0 && (melhor === null || d[c] >= d[melhor])) melhor = c;
  return melhor;
}

// ---------- Texto (seção 9: sínteses) ----------

export function contarPalavras(texto: string) {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export function lista(nomes: string[]) {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join("; ")} e ${nomes[nomes.length - 1]}`;
}

export function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

// No máximo 3 frases e 60 palavras.
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
  naExpectativaAntes: number;
  naExpectativaDepois: number;
  subiram: number;
  mantiveram: number;
  desceram: number;
  grupos: Record<Grupo, number>;
};

export function sinteseResultado(t: ResumoInstrumento, c: ResumoInstrumento) {
  const frases: string[] = [];
  if (t.comparaveis) {
    frases.push(
      `No técnico, ${t.naExpectativaDepois} de ${t.comparaveis} avaliações estão na expectativa de desenvolvimento (eram ${t.naExpectativaAntes}); ${plural(t.subiram, "subiu", "subiram")} de conceito e ${plural(t.desceram, "desceu", "desceram")}.`,
    );
  }
  if (c.comparaveis) {
    frases.push(
      `Nas competências, ${c.naExpectativaDepois} de ${c.comparaveis} estão na expectativa (eram ${c.naExpectativaAntes}); ${plural(c.subiram, "subiu", "subiram")} e ${plural(c.desceram, "desceu", "desceram")}.`,
    );
  }
  if (t.aguardando > 0) frases.push(`A leitura técnica é parcial: ${t.aguardando} de ${t.total} avaliações aguardam a Avaliação de Proficiência 2026.`);
  return limitarSintese(frases);
}

export function sinteseFechamento(t: ResumoInstrumento, c: ResumoInstrumento) {
  return limitarSintese([
    `${t.grupos.MANTEVE + c.grupos.MANTEVE} avaliações já estavam na expectativa e se mantiveram: ${t.grupos.MANTEVE} técnicas e ${c.grupos.MANTEVE} de competências.`,
    `${t.grupos.CHEGOU + c.grupos.CHEGOU} chegaram à expectativa neste ciclo.`,
    `${t.grupos.ABAIXO + c.grupos.ABAIXO} seguem no conceito Em Desenvolvimento e entram no foco do próximo ciclo.`,
  ]);
}

export type EixoResumo = { nome: string; transversal: boolean; comparaveis: number; subiram: number; desceram: number };

export function sinteseConhecimento(eixos: EixoResumo[], instrumento: Instrumento, minimo = PARAMETROS.amostraMinima) {
  const validos = eixos.filter((e) => e.comparaveis >= minimo);
  if (!validos.length) {
    return instrumento === "TECNICO"
      ? "Ainda não há eixo com pelo menos 5 pessoas com as duas medições para comparar."
      : "Ainda não há competência com pelo menos 5 pessoas com as duas avaliações para comparar.";
  }
  const saldo = (e: EixoResumo) => e.subiram - e.desceram;
  const leitura = (l: EixoResumo[]) => ({
    sobe: l.filter((e) => saldo(e) > 0).sort((a, b) => saldo(b) - saldo(a) || b.subiram - a.subiram).slice(0, 2),
    cai: l.filter((e) => saldo(e) < 0).sort((a, b) => saldo(a) - saldo(b) || b.desceram - a.desceram).slice(0, 2),
  });
  const frases: string[] = [];
  if (instrumento === "TECNICO") {
    // Transversais (todo o Sebrae) e essenciais (específicos de cada área) nunca na mesma frase.
    for (const [grupo, l] of [
      ["Nos eixos transversais, comuns a todo o Sebrae", validos.filter((e) => e.transversal)],
      ["Nos eixos essenciais, específicos de cada área", validos.filter((e) => !e.transversal)],
    ] as const) {
      if (!l.length) continue;
      const { sobe, cai } = leitura(l);
      const partes: string[] = [];
      if (sobe.length) partes.push(`mais pessoas subiram de conceito em ${lista(sobe.map((e) => `${e.nome} (${e.subiram} de ${e.comparaveis})`))}`);
      if (cai.length) partes.push(`${lista(cai.map((e) => e.nome))} ${cai.length > 1 ? "pedem" : "pede"} novo foco, com mais quedas do que subidas`);
      if (!partes.length) partes.push("a maior parte das pessoas manteve o conceito");
      frases.push(`${grupo}, ${partes.join("; ")}.`);
    }
    return limitarSintese(frases);
  }
  const { sobe, cai } = leitura(validos);
  if (sobe.length) frases.push(`Mais pessoas subiram de conceito em ${lista(sobe.map((e) => `${e.nome} (${e.subiram} de ${e.comparaveis})`))}.`);
  if (cai.length) frases.push(`Em ${lista(cai.map((e) => `${e.nome} (${e.desceram} de ${e.comparaveis} desceram)`))}, mais pessoas desceram do que subiram, o que pede novo foco.`);
  if (!sobe.length && !cai.length) frases.push("A maior parte das pessoas manteve o conceito entre as duas medições.");
  frases.push("Estes resultados são o ponto de partida do PDI comportamental.");
  return limitarSintese(frases);
}

export function sintesePdi(args: {
  planejamento: { comPlano: number; total: number };
  execucao: { concluidasAntes: number; total: number };
  forca: { nome: string; fortes: number; pessoas: number } | null;
  multiplicadores: number;
}) {
  const frases: string[] = [];
  const partes: string[] = [];
  if (args.planejamento.total) partes.push(`${args.planejamento.comPlano} de ${args.planejamento.total} pontos de partida no conceito Em Desenvolvimento já têm plano`);
  if (args.execucao.total) partes.push(`${args.execucao.concluidasAntes} de ${args.execucao.total} ações técnicas foram concluídas antes da nova medição`);
  if (partes.length) frases.push(`${lista(partes)}.`);
  if (args.forca) {
    frases.push(`${args.forca.nome} é a principal força transversal: ${args.forca.fortes} de ${args.forca.pessoas} pessoas em Conhecimento Avançado ou Referência.`);
  }
  if (args.multiplicadores > 0) frases.push("Há conhecimento disponível para mentoria interna.");
  return limitarSintese(frases);
}

export type LinhaInvestimento = {
  nome: string;
  tipo: Instrumento;
  transversal: boolean;
  pessoas: number;
  subiram: number;
  desceram: number;
  comAcao: number;
  acoes: number;
  contraste: boolean;
};

export function sinteseInvestimento(linhas: LinhaInvestimento[]) {
  const tec = linhas.filter((l) => l.tipo === "TECNICO" && !l.contraste);
  const frases: string[] = [];
  const acompanharam = tec.filter((l) => l.comAcao * 2 >= l.pessoas);
  const semInvest = tec.filter((l) => l.comAcao * 2 < l.pessoas);
  if (acompanharam.length) frases.push(`No técnico, o investimento acompanhou a subida de conceito em ${lista(acompanharam.map((l) => l.nome))}: metade ou mais das pessoas tinha ação concluída.`);
  if (semInvest.length) frases.push(`Em ${lista(semInvest.map((l) => l.nome))}, as pessoas subiram de conceito com poucas ações concluídas antes da nova medição.`);
  if (!tec.length) frases.push("Ainda não há eixo técnico com pelo menos 5 pessoas que subiram de conceito para relacionar com as ações do PDI.");
  frases.push("No comportamental, a leitura vale a partir da próxima Avaliação de Desempenho.");
  return limitarSintese(frases);
}

// Motivo curto de um item de foco (bloco 6).
export function motivoFoco(item: { emDesenvolvimento: number; desceram: number; subiram: number; pessoas: number }) {
  if (item.desceram > item.subiram && item.emDesenvolvimento > 0) {
    return `${plural(item.desceram, "pessoa desceu", "pessoas desceram")} de conceito e ${item.emDesenvolvimento} ${item.emDesenvolvimento === 1 ? "está" : "estão"} no conceito Em Desenvolvimento. Recuperar quem caiu.`;
  }
  if (item.desceram > item.subiram) return `${plural(item.desceram, "pessoa desceu", "pessoas desceram")} de conceito, ainda na expectativa. Manter a força.`;
  if (item.emDesenvolvimento > 0) return `${item.emDesenvolvimento} de ${item.pessoas} no conceito Em Desenvolvimento. Incluir no próximo PDI.`;
  return "Acompanhar.";
}

import { COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL, ehGestorPorPerfil, tipoTransversal } from "../../shared/eixosTransversais";
import { percentualNaEscala } from "../../shared/evolucaoDomain";
import {
  alvoDoLastro,
  anoDaAvaliacao,
  dataOuNula,
  normalizar,
  numeroOuNulo,
  periodosAD,
  type Base,
} from "./resultadoExecutivo";
import {
  CLASSES,
  CONCEITOS,
  GRUPOS,
  GRUPO_DA_CLASSE,
  PARAMETROS,
  classificar,
  conceitoDe,
  conceitoPredominante,
  distribuicaoVazia,
  forte,
  motivoFoco,
  movimento,
  naExpectativa,
  sinteseConhecimento,
  sinteseFechamento,
  sinteseInvestimento,
  sintesePdi,
  sinteseResultado,
  type Classe,
  type Conceito,
  type Grupo,
  type Instrumento,
  type LinhaInvestimento,
  type ResumoInstrumento,
} from "../../shared/fimDeCicloRegras";

// Relatório de Fim de Ciclo do PDI — página da diretoria.
// Só conceitos e contagens: nenhuma nota, média ou percentual sai daqui, e
// nenhum nome de pessoa (LGPD e NR-1).
// Universo: empregados ativos com perfil "colaborador" ou "lider" (gerentes de
// unidade e regionais são empregados). Perfis "admin" e "gerente" do sistema são
// acessos administrativos e ficam fora.

type Avaliacao = {
  instrumento: Instrumento;
  pessoa: number;
  unidade: string;
  eixo: string;
  transversal: boolean; //  transversal para esta pessoa (de todos, ou de liderança se ela é líder)
  lideranca: boolean; //    transversal só dos líderes (Estratégia e Planejamento; Liderança e Gestão de Equipes)
  antes: Conceito | null;
  depois: Conceito | null;
  classe: Classe;
  dataNm: Date | null;
  acoesAtivas: number; //          ações não canceladas no eixo/competência (qualquer status)
  concluidasAntesNm: number; //    ações concluídas no ciclo (sem corte por data)
};

const PERFIS_EMPREGADO = new Set(["colaborador", "lider"]);
const MIN = PARAMETROS.amostraMinima;

function agrupar<T>(itens: T[], chave: (i: T) => string) {
  const m = new Map<string, T[]>();
  for (const i of itens) {
    const k = chave(i);
    const l = m.get(k) ?? [];
    l.push(i);
    m.set(k, l);
  }
  return m;
}

function distribuicao(conceitos: Array<Conceito | null>) {
  const d = distribuicaoVazia();
  for (const c of conceitos) if (c) d[c] += 1;
  return d;
}

function contarClasses(avals: Avaliacao[]) {
  const classes = Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<Classe, number>;
  const grupos = Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<Grupo, number>;
  for (const a of avals) {
    classes[a.classe] += 1;
    grupos[GRUPO_DA_CLASSE[a.classe]] += 1;
  }
  return { classes, grupos };
}

function movimentos(avals: Avaliacao[]) {
  let subiram = 0;
  let mantiveram = 0;
  let desceram = 0;
  for (const a of avals) {
    const m = movimento(a.antes, a.depois);
    if (m === "SUBIU") subiram++;
    else if (m === "DESCEU") desceram++;
    else if (m === "MANTEVE") mantiveram++;
  }
  return { subiram, mantiveram, desceram };
}

// Antes e depois sempre sobre as mesmas avaliações (as que têm as duas medições).
function resumoInstrumento(avals: Avaliacao[]): ResumoInstrumento & {
  classes: Record<Classe, number>;
  distribuicaoAntes: Record<Conceito, number>;
  distribuicaoDepois: Record<Conceito, number>;
} {
  const comp = avals.filter((a) => a.antes !== null && a.depois !== null);
  const { classes, grupos } = contarClasses(avals);
  return {
    total: avals.length,
    feitas: avals.filter((a) => a.depois !== null).length,
    comparaveis: comp.length,
    primeiraMedicao: classes.PRIMEIRA_MEDICAO,
    aguardando: classes.SEM_COMPARACAO,
    naExpectativaAntes: comp.filter((a) => naExpectativa(a.antes)).length,
    naExpectativaDepois: comp.filter((a) => naExpectativa(a.depois)).length,
    ...movimentos(comp),
    distribuicaoAntes: distribuicao(comp.map((a) => a.antes)),
    distribuicaoDepois: distribuicao(comp.map((a) => a.depois)),
    grupos,
    classes,
  };
}

function resumoEixo(nome: string, avals: Avaliacao[], descricao: string | null) {
  const comp = avals.filter((a) => a.antes !== null && a.depois !== null);
  const comNm = avals.filter((a) => a.depois !== null);
  const distAtual = distribuicao(comNm.map((a) => a.depois));
  return {
    nome,
    transversal: avals.some((a) => a.transversal),
    lideranca: avals.some((a) => a.lideranca),
    descricao,
    pessoas: avals.length,
    comparaveis: comp.length,
    distribuicaoAntes: distribuicao(comp.map((a) => a.antes)),
    distribuicaoDepois: distribuicao(comp.map((a) => a.depois)),
    ...movimentos(comp),
    nAtual: comNm.length,
    distribuicaoAtual: distAtual,
    predominanteAtual: conceitoPredominante(distAtual),
    emDesenvolvimento: distAtual.EM_DESENVOLVIMENTO,
    fortes: distAtual.AVANCADO + distAtual.REFERENCIA,
    aguardando: avals.length - comNm.length,
    amostraPequena: comp.length < MIN,
  };
}
type ResumoEixo = ReturnType<typeof resumoEixo>;

function conceitoDaMetade(l: Conceito[]): Conceito {
  const ordenados = [...l].sort((a, b) => CONCEITOS.indexOf(a) - CONCEITOS.indexOf(b));
  return ordenados[Math.floor((ordenados.length - 1) / 2)];
}

// ---------- Avaliações a partir da base ----------

export function montarAvaliacoes(base: Base) {
  const pessoas = new Map<number, { unidade: string; lider: boolean }>();
  for (const c of base.colaboradores) {
    if (!PERFIS_EMPREGADO.has(String(c.role ?? ""))) continue;
    pessoas.set(Number(c.id), { unidade: String(c.unidade ?? "Sem unidade"), lider: ehGestorPorPerfil(c.role) });
  }

  // Avaliação de Proficiência atual (2026).
  const nmTecnico = new Map<string, number>();
  const dataNmTecnico = new Map<number, Date | null>();
  for (const r of base.resultados) {
    const id = Number(r.colaboradorId);
    if (!pessoas.has(id)) continue;
    dataNmTecnico.set(id, dataOuNula(r.calculadoEm));
    let json: any = {};
    try {
      json = JSON.parse(String(r.resultadoJson ?? "{}"));
    } catch {
      json = {};
    }
    for (const e of json.porEixo ?? []) {
      const v = numeroOuNulo(e.percentualAtual ?? e.percentualConhecimento);
      if (v !== null) nmTecnico.set(`${id}|${normalizar(e.eixo)}`, v);
    }
  }

  // Avaliação de Desempenho: anterior e mais recente (nota 0–3 lida na régua de conceitos).
  const ad = periodosAD(base.medicoesAD);
  const notaAD = new Map<string, number>();
  const dataAdPorAno = new Map<number, Date>();
  // A AD é aplicada depois do ciclo de PDI que ela mede: a data que separa "antes" e "depois"
  // das ações é o lançamento da avaliação no sistema, não a data de referência (31/12).
  const lancamentoAdPorAno = new Map<number, Date>();
  for (const m of base.medicoesAD) {
    if (!(m.validada || m.avaliacaoStatus === "FINALIZADA")) continue;
    const id = Number(m.colaboradorId);
    if (!pessoas.has(id) || !m.competencia) continue;
    const ano = anoDaAvaliacao(m.dataReferencia, m.avaliacaoTitulo);
    const valor = numeroOuNulo(m.valor);
    if (!ano || valor === null) continue;
    const d = dataOuNula(m.dataReferencia);
    if (d && (!dataAdPorAno.get(ano) || d > dataAdPorAno.get(ano)!)) dataAdPorAno.set(ano, d);
    const l = dataOuNula(m.avaliacaoLancadaEm);
    if (l && (!lancamentoAdPorAno.get(ano) || l > lancamentoAdPorAno.get(ano)!)) lancamentoAdPorAno.set(ano, l);
    const escala03 = valor >= 0 && valor <= 3;
    const p = percentualNaEscala(valor, escala03 ? 0 : Number(m.escalaMin ?? 0), escala03 ? 3 : Number(m.escalaMax ?? 3));
    if (p !== null) notaAD.set(`${id}|${normalizar(m.competencia)}|${ano}`, p);
  }

  // Ações do PDI por pessoa e eixo/competência.
  type InfoAcao = { cancelada: boolean; concluida: boolean; conclusao: Date | null };
  const acoesPorChave = new Map<string, InfoAcao[]>();
  const acoesRecorte: Array<{ pessoa: number; status: string; inicio: Date | null; conclusao: Date | null; instrumento: Instrumento | null }> = [];
  for (const a of base.acoes) {
    const id = Number(a.colaboradorId);
    if (!pessoas.has(id)) continue;
    const status = String(a.status ?? "");
    const concluida = status === "concluida";
    const conclusao = dataOuNula(a.evidenciaAprovadaEm) ?? (concluida ? dataOuNula(a.atualizadaEm) : null);
    const alvo = alvoDoLastro(a.tipo, a.eixo, a.macroNome);
    const instrumento: Instrumento | null = alvo ? (alvo.dimensao === "TECNICO" ? "TECNICO" : "COMPORTAMENTAL") : null;
    acoesRecorte.push({ pessoa: id, status, inicio: dataOuNula(a.cicloInicio), conclusao: concluida ? conclusao : null, instrumento });
    if (!alvo) continue;
    const chave = `${instrumento}|${id}|${normalizar(alvo.eixo)}`;
    const l = acoesPorChave.get(chave) ?? [];
    l.push({ cancelada: status === "cancelada", concluida, conclusao });
    acoesPorChave.set(chave, l);
  }
  // Decisão da Dina (12/10): não usar datas. Toda ação concluída no ciclo conta para a nova medição.
  const contarAcoes = (chave: string, _dataNm: Date | null) => {
    const ativas = (acoesPorChave.get(chave) ?? []).filter((x) => !x.cancelada);
    return {
      acoesAtivas: ativas.length,
      concluidasAntesNm: ativas.filter((x) => x.concluida).length,
    };
  };

  const avaliacoes: Avaliacao[] = [];
  const potencialidades: Array<{ pessoa: number; unidade: string; eixo: string }> = [];
  // Eixos não essenciais com medição: só para a Matriz de Conhecimento por empregado.
  const naoEssenciais: Array<{ pessoa: number; unidade: string; eixo: string; antes: Conceito | null; depois: Conceito | null }> = [];

  for (const e of base.eixosMatriz) {
    const id = Number(e.colaboradorId);
    const p = pessoas.get(id);
    if (!p) continue;
    const eixo = String(e.eixo ?? "").trim();
    const relacao = String(e.relacao ?? "").toUpperCase();
    const chaveNm = `${id}|${normalizar(eixo)}`;
    const depois = conceitoDe(nmTecnico.has(chaveNm) ? nmTecnico.get(chaveNm)! : null);
    if (relacao === "NAO_ESSENCIAL") {
      // Eixo transversal é essencial para todo o Sebrae: nunca é potencialidade, mesmo com cadastro errado.
      const tipoT = tipoTransversal(eixo);
      if (tipoT === "TODOS" || (tipoT === "GESTORES" && p.lider)) continue;
      if (naExpectativa(depois)) potencialidades.push({ pessoa: id, unidade: p.unidade, eixo });
      naoEssenciais.push({ pessoa: id, unidade: p.unidade, eixo, antes: conceitoDe(numeroOuNulo(e.base2025)), depois });
      continue;
    }
    if (relacao !== "ESSENCIAL" && relacao !== "TRANSVERSAL") continue;
    const antes = conceitoDe(numeroOuNulo(e.base2025));
    const dataNm = depois !== null ? dataNmTecnico.get(id) ?? null : null;
    avaliacoes.push({
      instrumento: "TECNICO",
      pessoa: id,
      unidade: p.unidade,
      eixo,
      // Eixo de liderança só é transversal para líderes; para os demais conta como essencial da área.
      transversal: tipoTransversal(eixo) === "TODOS" || (tipoTransversal(eixo) === "GESTORES" && p.lider),
      lideranca: tipoTransversal(eixo) === "GESTORES" && p.lider,
      antes,
      depois,
      classe: classificar(antes, depois),
      dataNm,
      ...contarAcoes(`TECNICO|${id}|${normalizar(eixo)}`, dataNm),
    });
  }

  // Comportamental: só as competências que a Avaliação de Desempenho mediu.
  const competenciasPorPessoa = new Map<number, Set<string>>();
  const nomeCompetencia = new Map<string, string>();
  for (const m of base.medicoesAD) {
    const id = Number(m.colaboradorId);
    if (!pessoas.has(id) || !m.competencia) continue;
    const k = normalizar(m.competencia);
    nomeCompetencia.set(k, String(m.competencia).trim());
    const s = competenciasPorPessoa.get(id) ?? new Set<string>();
    s.add(k);
    competenciasPorPessoa.set(id, s);
  }
  const dataAdAtual = ad.anoAtual ? lancamentoAdPorAno.get(ad.anoAtual) ?? dataAdPorAno.get(ad.anoAtual) ?? new Date(ad.anoAtual, 11, 31) : null;
  for (const [id, comps] of Array.from(competenciasPorPessoa.entries())) {
    const p = pessoas.get(id)!;
    for (const k of Array.from(comps)) {
      const antes = conceitoDe(ad.anoBase ? notaAD.get(`${id}|${k}|${ad.anoBase}`) ?? null : null);
      const depois = conceitoDe(ad.anoAtual ? notaAD.get(`${id}|${k}|${ad.anoAtual}`) ?? null : null);
      if (antes === null && depois === null) continue;
      const dataNm = depois !== null ? dataAdAtual : null;
      avaliacoes.push({
        instrumento: "COMPORTAMENTAL",
        pessoa: id,
        unidade: p.unidade,
        eixo: nomeCompetencia.get(k)!,
        transversal: k === normalizar(COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL),
        lideranca: false,
        antes,
        depois,
        classe: classificar(antes, depois),
        dataNm,
        ...contarAcoes(`COMPORTAMENTAL|${id}|${k}`, dataNm),
      });
    }
  }

  const descricaoEixo = new Map<string, string>();
  for (const c of base.catalogo ?? []) {
    const k = normalizar(c.eixo);
    if (!descricaoEixo.has(k) && c.descricao) descricaoEixo.set(k, String(c.descricao));
  }

  return {
    avaliacoes,
    potencialidades,
    naoEssenciais,
    acoes: acoesRecorte,
    pessoas,
    ad: {
      anoBase: ad.anoBase,
      anoAtual: ad.anoAtual,
      dataBase: ad.anoBase ? dataAdPorAno.get(ad.anoBase) ?? null : null,
      dataAtual: dataAdAtual,
    },
    descricaoEixo,
  };
}

// ---------- Relatório ----------

export const PUBLICOS = ["TODOS", "LIDERES", "DEMAIS"] as const;
export type Publico = (typeof PUBLICOS)[number];

export function montarRelatorio(base: Base, unidade?: string, publico: Publico = "TODOS") {
  const dados = montarAvaliacoes(base);
  // Recorte por área e por público (líderes = perfil "lider"; demais = os outros empregados).
  const doPublico = (pessoa: number) => {
    if (publico === "TODOS") return true;
    const lider = dados.pessoas.get(pessoa)?.lider ?? false;
    return publico === "LIDERES" ? lider : !lider;
  };
  const noRecorte = <T extends { unidade: string; pessoa: number }>(l: T[]) =>
    l.filter((x) => (unidade ? x.unidade === unidade : true) && doPublico(x.pessoa));
  const avals = noRecorte(dados.avaliacoes);
  const potenc = noRecorte(dados.potencialidades);
  const pessoasRecorte = new Set(avals.map((a) => a.pessoa));
  const acoes = dados.acoes.filter((a) => (unidade ? dados.pessoas.get(a.pessoa)?.unidade === unidade : true) && doPublico(a.pessoa));
  const noPublicoEArea = (pessoa: number) => dados.pessoas.has(pessoa) && (unidade ? dados.pessoas.get(pessoa)?.unidade === unidade : true) && doPublico(pessoa);

  const tec = avals.filter((a) => a.instrumento === "TECNICO");
  const comp = avals.filter((a) => a.instrumento === "COMPORTAMENTAL");
  const resumoTec = resumoInstrumento(tec);
  const resumoComp = resumoInstrumento(comp);

  // Eixo de liderança (dos líderes) e o mesmo eixo como essencial de outra pessoa são lidos separados.
  const grupoAval = (a: Avaliacao) => (a.lideranca ? "L" : a.transversal ? "T" : "E");
  const eixos = (lista: Avaliacao[], instrumento: Instrumento) =>
    Array.from(agrupar(lista, (a) => `${grupoAval(a)}|${a.eixo}`).values())
      .map((l) => resumoEixo(l[0].eixo, l, instrumento === "TECNICO" ? dados.descricaoEixo.get(normalizar(l[0].eixo)) ?? null : null))
      .sort((a, b) => b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"));
  const eixosTec = eixos(tec, "TECNICO");
  const eixosComp = eixos(comp, "COMPORTAMENTAL");

  const saldo = (e: ResumoEixo) => e.subiram - e.desceram;
  const destaques = (l: ResumoEixo[]) => {
    const validos = l.filter((e) => e.comparaveis >= MIN);
    return {
      sobem: validos.filter((e) => saldo(e) > 0).sort((a, b) => saldo(b) - saldo(a)).slice(0, 2).map((e) => ({ nome: e.nome, subiram: e.subiram, comparaveis: e.comparaveis, transversal: e.transversal, lideranca: e.lideranca })),
      caem: validos.filter((e) => saldo(e) < 0).sort((a, b) => saldo(a) - saldo(b)).slice(0, 2).map((e) => ({ nome: e.nome, desceram: e.desceram, comparaveis: e.comparaveis, transversal: e.transversal, lideranca: e.lideranca })),
    };
  };

  // Onde focar (bloco 2): pessoas em Em Desenvolvimento por eixo, só eixos com 5 pessoas medidas ou mais.
  const ondeFocar = (l: ResumoEixo[]) => {
    const comFoco = l.filter((e) => e.emDesenvolvimento > 0);
    return {
      itens: comFoco
        .filter((e) => e.nAtual >= MIN)
        .sort((a, b) => b.emDesenvolvimento - a.emDesenvolvimento || a.nome.localeCompare(b.nome, "pt-BR"))
        .map((e) => ({ nome: e.nome, emDesenvolvimento: e.emDesenvolvimento, pessoas: e.nAtual, transversal: e.transversal, lideranca: e.lideranca })),
      amostraPequena: comFoco.filter((e) => e.nAtual < MIN).length,
    };
  };

  // ---- Bloco 1: contexto
  const areas = Array.from(new Set(avals.map((a) => a.unidade))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const datasNmTec = tec.map((a) => a.dataNm).filter(Boolean) as Date[];
  const acoesNaoCanceladas = acoes.filter((a) => a.status !== "cancelada");
  const inicios = acoesNaoCanceladas.map((a) => a.inicio).filter(Boolean) as Date[];
  const conclusoes = acoesNaoCanceladas.map((a) => a.conclusao).filter(Boolean) as Date[];
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  const minData = (l: Date[]) => (l.length ? new Date(Math.min(...l.map((d) => d.getTime()))) : null);
  const maxData = (l: Date[]) => (l.length ? new Date(Math.max(...l.map((d) => d.getTime()))) : null);

  // Abrangência: quem fez cada avaliação (as pessoas avaliadas podem ter feito só uma delas).
  const pessoasTec = new Set(tec.map((a) => a.pessoa));
  const pessoasComp = new Set(comp.map((a) => a.pessoa));
  const contexto = {
    pessoas: pessoasRecorte.size,
    abrangencia: {
      tecnico: pessoasTec.size,
      comportamental: pessoasComp.size,
      ambas: Array.from(pessoasTec).filter((p) => pessoasComp.has(p)).length,
    },
    areas,
    periodo: {
      tecnico: { inicioAno: 2025, fim: iso(maxData(datasNmTec)) },
      comportamental: { inicio: iso(dados.ad.dataBase), fim: iso(dados.ad.dataAtual) },
    },
    execucao: { inicio: iso(minData(inicios)), fim: iso(maxData(conclusoes)) },
    acoes: {
      total: acoes.length,
      concluidas: acoes.filter((a) => a.status === "concluida").length,
      emAndamento: acoes.filter((a) => a.status !== "concluida" && a.status !== "cancelada").length,
      canceladas: acoes.filter((a) => a.status === "cancelada").length,
      // Pedidos de alteração (prazo, título, descrição...) e de nova ação, no mesmo recorte.
      alteracoes: (() => {
        const l = (base.ajustes ?? []).filter((x: any) => noPublicoEArea(Number(x.colaboradorId)));
        return { aprovadas: l.filter((x: any) => x.status === "aprovada").length, negadas: l.filter((x: any) => x.status === "reprovada").length, pendentes: l.filter((x: any) => x.status !== "aprovada" && x.status !== "reprovada").length };
      })(),
      novasAcoes: (() => {
        const l = (base.pedidosAcao ?? []).filter((x: any) => noPublicoEArea(Number(x.colaboradorId)));
        const st = (x: any) => String(x.statusGeral);
        return {
          aprovadas: l.filter((x: any) => Number(x.virouAcao) === 1 || st(x) === "aprovada").length,
          vetadas: l.filter((x: any) => st(x) === "vetada_gestor" || st(x) === "vetada_rh").length,
          encerradas: l.filter((x: any) => st(x) === "encerrada_lider").length,
          pendentes: l.filter((x: any) => Number(x.virouAcao) !== 1 && !["aprovada", "vetada_gestor", "vetada_rh", "encerrada_lider"].includes(st(x))).length,
        };
      })(),
    },
    eixos: [...eixosTec]
      .sort((a, b) => Number(b.transversal) - Number(a.transversal) || b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((e) => ({ nome: e.nome, transversal: e.transversal, lideranca: e.lideranca, pessoas: e.pessoas })),
    competencias: eixosComp.map((e) => ({ nome: e.nome, transversal: e.transversal, pessoas: e.pessoas })),
    ad: { anoBase: dados.ad.anoBase, anoAtual: dados.ad.anoAtual },
  };

  // ---- Bloco 5a: como o PDI está acontecendo
  // Ponto de partida do PDI: técnico = Avaliação de Proficiência 2025; comportamental = AD mais recente.
  const ppTec = tec.filter((a) => a.antes === "EM_DESENVOLVIMENTO");
  // Ponto de partida do PDI comportamental: a AD anterior (o PDI foi feito depois dela).
  const ppComp = comp.filter((a) => a.antes === "EM_DESENVOLVIMENTO");
  const planejamento = {
    TECNICO: { comPlano: ppTec.filter((a) => a.acoesAtivas > 0).length, total: ppTec.length },
    COMPORTAMENTAL: { comPlano: ppComp.filter((a) => a.acoesAtivas > 0).length, total: ppComp.length },
  };
  const pessoasComNmTec = new Set(tec.filter((a) => a.depois !== null).map((a) => a.pessoa));
  const dataNmPessoa = new Map<number, Date>();
  for (const a of tec) if (a.dataNm) dataNmPessoa.set(a.pessoa, a.dataNm);
  const acoesTecMedidas = acoesNaoCanceladas.filter((a) => a.instrumento === "TECNICO" && pessoasComNmTec.has(a.pessoa));
  const execucao = {
    concluidasAntes: acoesTecMedidas.filter((a) => a.status === "concluida").length,
    total: acoesTecMedidas.length,
  };
  const sinais = Array.from(
    agrupar(
      tec.filter((a) => a.antes === "EM_DESENVOLVIMENTO" && a.depois !== null && a.concluidasAntesNm > 0),
      (a) => a.unidade,
    ).entries(),
  ).map(([area, l]) => ({ area, chegaram: l.filter((a) => naExpectativa(a.depois)).length, total: l.length }));
  const pdi = {
    planejamento,
    execucao,
    sinaisPorArea: sinais.filter((s) => s.total >= MIN).sort((a, b) => b.total - a.total),
    areasAmostraPequena: sinais.filter((s) => s.total < MIN).length,
  };

  // ---- Bloco 5b: fortalezas e multiplicadores
  const ordenarForca = (a: ResumoEixo, b: ResumoEixo) => b.fortes * a.nAtual - a.fortes * b.nAtual || b.nAtual - a.nAtual;
  const itemForca = (e: ResumoEixo) => ({ nome: e.nome, pessoas: e.nAtual, fortes: e.fortes, predominante: e.predominanteAtual, distribuicao: e.distribuicaoAtual });
  const transversais = eixosTec.filter((e) => e.transversal && !e.lideranca && e.nAtual >= MIN).sort(ordenarForca).map(itemForca);
  const lideranca = eixosTec.filter((e) => e.lideranca && e.nAtual >= MIN).sort(ordenarForca).map(itemForca);
  const porAreaEspecificos = Array.from(agrupar(tec.filter((a) => !a.transversal), (a) => a.unidade).entries())
    .map(([area, l]) => ({
      area,
      eixos: Array.from(agrupar(l, (a) => a.eixo).entries())
        .map(([nome, la]) => resumoEixo(nome, la, null))
        .filter((e) => e.nAtual >= MIN)
        .sort(ordenarForca)
        .slice(0, unidade ? 10 : 2)
        .map(itemForca),
    }))
    .filter((x) => x.eixos.length)
    .sort((a, b) => a.area.localeCompare(b.area, "pt-BR"));
  const multPorEixo = Array.from(agrupar(potenc, (p) => p.eixo).entries()).map(([nome, l]) => ({ nome, vezes: l.length }));
  const fortalezas = {
    transversais,
    lideranca,
    porArea: porAreaEspecificos,
    multiplicadores: {
      total: potenc.length,
      eixos: multPorEixo.length,
      porEixo: multPorEixo.filter((e) => e.vezes >= MIN).sort((a, b) => b.vezes - a.vezes),
    },
  };

  // ---- Bloco 6: foco do próximo ciclo
  const itemFoco = (e: ResumoEixo) => ({
    nome: e.nome,
    pessoas: e.nAtual,
    emDesenvolvimento: e.emDesenvolvimento,
    subiram: e.comparaveis >= MIN ? e.subiram : null,
    desceram: e.comparaveis >= MIN ? e.desceram : null,
    comparaveis: e.comparaveis,
    predominante: e.predominanteAtual,
    transversal: e.transversal,
    lideranca: e.lideranca,
    motivo: motivoFoco({
      emDesenvolvimento: e.emDesenvolvimento,
      desceram: e.comparaveis >= MIN ? e.desceram : 0,
      subiram: e.comparaveis >= MIN ? e.subiram : 0,
      pessoas: e.nAtual,
    }),
  });
  const criterioFoco = (e: ResumoEixo) => e.nAtual >= MIN && (e.emDesenvolvimento > 0 || (e.comparaveis >= MIN && e.desceram > e.subiram));
  const ordenarFoco = (a: ResumoEixo, b: ResumoEixo) =>
    b.emDesenvolvimento - a.emDesenvolvimento || b.desceram - b.subiram - (a.desceram - a.subiram) || a.nome.localeCompare(b.nome, "pt-BR");
  const foco = {
    sebrae: {
      tecnicos: eixosTec.filter((e) => e.transversal && !e.lideranca && criterioFoco(e)).sort(ordenarFoco).map(itemFoco),
      lideranca: eixosTec.filter((e) => e.lideranca && criterioFoco(e)).sort(ordenarFoco).map(itemFoco),
      competencias: eixosComp.filter(criterioFoco).sort(ordenarFoco).map(itemFoco),
    },
    porArea: Array.from(agrupar(avals, (a) => a.unidade).entries())
      .map(([area, l]) => {
        const t = Array.from(agrupar(l.filter((a) => a.instrumento === "TECNICO" && !a.transversal), (a) => a.eixo).entries()).map(([n, la]) => resumoEixo(n, la, null));
        const c = Array.from(agrupar(l.filter((a) => a.instrumento === "COMPORTAMENTAL"), (a) => a.eixo).entries()).map(([n, la]) => resumoEixo(n, la, null));
        return {
          area,
          tecnicos: t.filter(criterioFoco).sort(ordenarFoco).slice(0, 4).map(itemFoco),
          competencias: c.filter(criterioFoco).sort(ordenarFoco).slice(0, 4).map(itemFoco),
        };
      })
      .filter((x) => x.tecnicos.length || x.competencias.length)
      .sort((a, b) => a.area.localeCompare(b.area, "pt-BR")),
  };

  // ---- Matriz de Conhecimento por área (sem nomes): conceito mais frequente na medição atual.
  // Célula com menos de 5 pessoas medidas não mostra conceito (privacidade e amostra pequena).
  const ORDEM_GRUPO = { T: 0, L: 1, E: 2 } as const;
  const celula = (l: Avaliacao[]) => {
    const med = l.filter((a) => a.depois !== null);
    if (med.length < MIN) return { pessoas: l.length, medidas: med.length, amostraPequena: true as const };
    return {
      pessoas: l.length,
      medidas: med.length,
      amostraPequena: false as const,
      naExpectativa: med.filter((a) => naExpectativa(a.depois)).length,
      // Conceito alcançado (ou superado) por pelo menos metade das pessoas.
      metade: conceitoDaMetade(med.map((a) => a.depois as Conceito)),
    };
  };
  const matrizArea = (lista: Avaliacao[], instrumento: Instrumento) => {
    const colunas = eixos(lista, instrumento)
      .map((e) => ({ chave: `${e.lideranca ? "L" : e.transversal ? "T" : "E"}|${e.nome}`, nome: e.nome, grupo: (e.lideranca ? "L" : e.transversal ? "T" : "E") as keyof typeof ORDEM_GRUPO, pessoas: e.pessoas }))
      .sort((a, b) => ORDEM_GRUPO[a.grupo] - ORDEM_GRUPO[b.grupo] || b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"));
    const linha = (l: Avaliacao[]) => {
      const celulas: Record<string, ReturnType<typeof celula>> = {};
      for (const [chave, la] of Array.from(agrupar(l, (a) => `${grupoAval(a)}|${a.eixo}`).entries())) celulas[chave] = celula(la);
      return { pessoas: new Set(l.map((a) => a.pessoa)).size, celulas };
    };
    return {
      colunas,
      total: linha(lista),
      linhas: Array.from(agrupar(lista, (a) => a.unidade).entries())
        .map(([area, l]) => ({ area, ...linha(l) }))
        .sort((a, b) => a.area.localeCompare(b.area, "pt-BR")),
    };
  };
  const matriz = { TECNICO: matrizArea(tec, "TECNICO"), COMPORTAMENTAL: matrizArea(comp, "COMPORTAMENTAL") };

  // ---- Bloco 7: quanto investimos onde mais crescemos
  const linhaInvest = (e: ResumoEixo, tipo: Instrumento, contraste: boolean): LinhaInvestimento => {
    const l = avals.filter(
      (a) => a.instrumento === tipo && a.eixo === e.nome && a.transversal === e.transversal && a.lideranca === e.lideranca && a.antes !== null && a.depois !== null,
    );
    return {
      nome: e.nome,
      tipo,
      transversal: e.transversal,
      lideranca: e.lideranca,
      pessoas: l.length,
      subiram: e.subiram,
      desceram: e.desceram,
      comPlano: l.filter((a) => a.acoesAtivas > 0).length,
      comAcao: l.filter((a) => a.concluidasAntesNm > 0).length,
      acoes: l.reduce((s, a) => s + a.concluidasAntesNm, 0),
      contraste,
    };
  };
  const validosInv = (l: ResumoEixo[]) => l.filter((e) => e.comparaveis >= MIN);
  const cresce = (l: ResumoEixo[]) => validosInv(l).filter((e) => saldo(e) > 0).sort((a, b) => saldo(b) - saldo(a)).slice(0, 2);
  const quedas = [
    ...validosInv(eixosTec).map((e) => ({ e, tipo: "TECNICO" as Instrumento })),
    ...validosInv(eixosComp).map((e) => ({ e, tipo: "COMPORTAMENTAL" as Instrumento })),
  ]
    .filter((x) => saldo(x.e) < 0)
    .sort((a, b) => saldo(a.e) - saldo(b.e));
  const investimento = [
    ...cresce(eixosTec).map((e) => linhaInvest(e, "TECNICO", false)),
    ...cresce(eixosComp).map((e) => linhaInvest(e, "COMPORTAMENTAL", false)),
    ...(quedas[0] ? [linhaInvest(quedas[0].e, quedas[0].tipo, true)] : []),
  ];

  // ---- Bloco 8: encaminhamentos
  const semPlano =
    planejamento.TECNICO.total - planejamento.TECNICO.comPlano + planejamento.COMPORTAMENTAL.total - planejamento.COMPORTAMENTAL.comPlano;
  const encaminhamentos = [
    ...(resumoTec.aguardando > 0 ? [`Concluir a Avaliação de Proficiência 2026 nas ${resumoTec.aguardando} avaliações pendentes`] : []),
    ...(semPlano > 0 ? [`Líderes: incluir no próximo PDI os ${semPlano} pontos de partida no conceito Em Desenvolvimento ainda sem plano`] : []),
    "Concluir a revisão dos eixos por função com cada empregado",
    ...(fortalezas.multiplicadores.total > 0 ? ["Conectar multiplicadores às prioridades"] : []),
  ];

  // ---- Sínteses
  const sinteses = {
    resultado: sinteseResultado(eixosTec, eixosComp, resumoTec.aguardando),
    fechamento: sinteseFechamento(resumoTec, resumoComp),
    tecnico: sinteseConhecimento(eixosTec, "TECNICO"),
    comportamental: sinteseConhecimento(eixosComp, "COMPORTAMENTAL"),
    pdi: sintesePdi({
      planejamento: {
        comPlano: planejamento.TECNICO.comPlano + planejamento.COMPORTAMENTAL.comPlano,
        total: planejamento.TECNICO.total + planejamento.COMPORTAMENTAL.total,
      },
      execucao,
      forca: transversais[0] ? { nome: transversais[0].nome, fortes: transversais[0].fortes, pessoas: transversais[0].pessoas } : null,
      multiplicadores: fortalezas.multiplicadores.total,
    }),
    investimento: sinteseInvestimento(investimento),
  };

  return {
    parametros: PARAMETROS,
    conceitos: CONCEITOS,
    recorte: { unidade: unidade ?? null, publico, pessoas: pessoasRecorte.size, amostraPequena: pessoasRecorte.size < MIN },
    contexto,
    instrumentos: {
      TECNICO: {
        ...resumoTec,
        destaques: destaques(eixosTec),
        // Transversais (todo o Sebrae) e essenciais (por área) lidos separadamente.
        destaquesPorTipo: {
          transversais: destaques(eixosTec.filter((e) => e.transversal && !e.lideranca)),
          lideranca: destaques(eixosTec.filter((e) => e.lideranca)),
          essenciais: destaques(eixosTec.filter((e) => !e.transversal)),
        },
        ondeFocar: ondeFocar(eixosTec), eixos: eixosTec },
      COMPORTAMENTAL: { ...resumoComp, destaques: destaques(eixosComp), ondeFocar: ondeFocar(eixosComp), eixos: eixosComp },
    },
    matriz,
    pdi,
    fortalezas,
    foco,
    investimento,
    encaminhamentos,
    sinteses,
  };
}

// Unidades disponíveis no filtro.
export function unidadesDoRelatorio(base: Base) {
  const { avaliacoes } = montarAvaliacoes(base);
  return Array.from(new Set(avaliacoes.map((a) => a.unidade))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ---------- Matriz de Conhecimento por empregado (só administradores) ----------
// Esta visão tem nomes: fica fora do relatório da diretoria e só aparece para administradores.

type Relacao = "TRANSVERSAL" | "ESSENCIAL" | "NAO_ESSENCIAL";
type CelulaPessoa = { antes: Conceito | null; depois: Conceito | null; relacao?: Relacao; acoesAtivas: number; concluidasAntesNm: number };

export function montarMatrizEmpregados(base: Base, unidade?: string, publico: Publico = "TODOS") {
  const dados = montarAvaliacoes(base);
  const nomes = new Map<number, string>(base.colaboradores.map((c: any) => [Number(c.id), String(c.name ?? "")]));
  const incluir = (pessoa: number) => {
    const p = dados.pessoas.get(pessoa);
    if (!p) return false;
    if (unidade && p.unidade !== unidade) return false;
    if (publico === "LIDERES") return p.lider;
    if (publico === "DEMAIS") return !p.lider;
    return true;
  };

  const linhas = new Map<
    number,
    { id: number; nome: string; unidade: string; lider: boolean; tecnico: Record<string, CelulaPessoa>; comportamental: Record<string, CelulaPessoa>; acoes: { ativas: number; concluidas: number } }
  >();
  const linhaDe = (pessoa: number) => {
    let l = linhas.get(pessoa);
    if (!l) {
      const p = dados.pessoas.get(pessoa)!;
      l = { id: pessoa, nome: nomes.get(pessoa) || `Empregado ${pessoa}`, unidade: p.unidade, lider: p.lider, tecnico: {}, comportamental: {}, acoes: { ativas: 0, concluidas: 0 } };
      linhas.set(pessoa, l);
    }
    return l;
  };

  const contagemTec = new Map<string, number>();
  const contagemComp = new Map<string, number>();
  for (const a of dados.avaliacoes) {
    if (!incluir(a.pessoa)) continue;
    const l = linhaDe(a.pessoa);
    if (a.instrumento === "TECNICO") {
      l.tecnico[a.eixo] = { antes: a.antes, depois: a.depois, relacao: a.transversal ? "TRANSVERSAL" : "ESSENCIAL", acoesAtivas: a.acoesAtivas, concluidasAntesNm: a.concluidasAntesNm };
      contagemTec.set(a.eixo, (contagemTec.get(a.eixo) ?? 0) + 1);
    } else {
      l.comportamental[a.eixo] = { antes: a.antes, depois: a.depois, acoesAtivas: a.acoesAtivas, concluidasAntesNm: a.concluidasAntesNm };
      contagemComp.set(a.eixo, (contagemComp.get(a.eixo) ?? 0) + 1);
    }
  }
  for (const n of dados.naoEssenciais) {
    if (!incluir(n.pessoa) || (n.antes === null && n.depois === null)) continue;
    linhaDe(n.pessoa).tecnico[n.eixo] = { antes: n.antes, depois: n.depois, relacao: "NAO_ESSENCIAL", acoesAtivas: 0, concluidasAntesNm: 0 };
    contagemTec.set(n.eixo, (contagemTec.get(n.eixo) ?? 0) + 1);
  }
  for (const a of dados.acoes) {
    if (!linhas.has(a.pessoa) || a.status === "cancelada") continue;
    const l = linhas.get(a.pessoa)!;
    l.acoes.ativas += 1;
    if (a.status === "concluida") l.acoes.concluidas += 1;
  }

  // Colunas: transversais de todos, de liderança e demais eixos (pelo nome do eixo).
  const grupoNome = (eixo: string) => {
    const t = tipoTransversal(eixo);
    return t === "TODOS" ? "T" : t === "GESTORES" ? "L" : "E";
  };
  const ORDEM = { T: 0, L: 1, E: 2 } as const;
  const colunasTec = Array.from(contagemTec.entries())
    .map(([nome, pessoas]) => ({ nome, grupo: grupoNome(nome) as keyof typeof ORDEM, pessoas }))
    .sort((a, b) => ORDEM[a.grupo] - ORDEM[b.grupo] || b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"));
  const colunasComp = Array.from(contagemComp.entries())
    .map(([nome, pessoas]) => ({ nome, grupo: (normalizar(nome) === normalizar(COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL) ? "T" : "E") as keyof typeof ORDEM, pessoas }))
    .sort((a, b) => ORDEM[a.grupo] - ORDEM[b.grupo] || b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    unidades: Array.from(new Set(dados.avaliacoes.map((a) => a.unidade))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    ad: dados.ad,
    colunas: { TECNICO: colunasTec, COMPORTAMENTAL: colunasComp },
    linhas: Array.from(linhas.values()).sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR")),
  };
}

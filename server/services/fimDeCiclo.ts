import { COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL, tipoTransversal } from "../../shared/eixosTransversais";
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
  GRUPOS,
  GRUPO_DA_CLASSE,
  PARAMETROS,
  arred,
  classificar,
  media,
  motivoFoco,
  pct,
  sinteseConhecimento,
  sinteseFechamento,
  sinteseInvestimento,
  sintesePdi,
  sinteseResultado,
  variacaoRelativa,
  type Classe,
  type Grupo,
  type Instrumento,
  type ResumoInstrumento,
} from "../../shared/fimDeCicloRegras";

// Relatório de Fim de Ciclo do PDI — página da diretoria.
// Só dados agregados: nenhum nome de pessoa sai daqui (LGPD e NR-1).
// Universo: empregados ativos com perfil "colaborador" ou "lider" (gerentes de
// unidade e regionais são empregados). Perfis "admin" e "gerente" do sistema são
// acessos administrativos e ficam fora.

type Avaliacao = {
  instrumento: Instrumento;
  pessoa: number;
  unidade: string;
  eixo: string;
  transversal: boolean;
  pp: number | null;
  nm: number | null;
  classe: Classe;
  dataNm: Date | null;
  acoesAtivas: number; //          ações não canceladas no eixo/competência (qualquer status)
  concluidasAntesNm: number; //    ações concluídas antes da nova medição
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

// Médias arredondadas primeiro: a variação é a diferença das médias exibidas,
// então barras e Δ sempre batem (seção 6.1).
function mediasMesmaBase(avals: Avaliacao[]) {
  const comp = avals.filter((a) => a.pp !== null && a.nm !== null);
  const antes = media(comp.map((a) => a.pp!));
  const depois = media(comp.map((a) => a.nm!));
  return {
    comparaveis: comp.length,
    mediaAntes: antes,
    mediaDepois: depois,
    delta: antes !== null && depois !== null ? arred(depois - antes) : null,
    pctAcimaAntes: pct(comp.filter((a) => a.pp! >= PARAMETROS.referencia).length, comp.length),
    pctAcimaDepois: pct(comp.filter((a) => a.nm! >= PARAMETROS.referencia).length, comp.length),
  };
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

function resumoInstrumento(avals: Avaliacao[]): ResumoInstrumento & {
  classes: Record<Classe, number>;
  delta: number | null;
  variacaoRelativa: number | null;
} {
  const m = mediasMesmaBase(avals);
  const { classes, grupos } = contarClasses(avals);
  return {
    total: avals.length,
    feitas: avals.filter((a) => a.nm !== null).length,
    comparaveis: m.comparaveis,
    primeiraMedicao: classes.PRIMEIRA_MEDICAO,
    aguardando: classes.SEM_COMPARACAO,
    pctAcimaAntes: m.pctAcimaAntes,
    pctAcimaDepois: m.pctAcimaDepois,
    mediaAntes: m.mediaAntes,
    mediaDepois: m.mediaDepois,
    delta: m.delta,
    variacaoRelativa: variacaoRelativa(m.mediaAntes, m.mediaDepois),
    grupos,
    classes,
  };
}

function resumoEixo(nome: string, avals: Avaliacao[], descricao: string | null) {
  const m = mediasMesmaBase(avals);
  const comNm = avals.filter((a) => a.nm !== null);
  const { classes } = contarClasses(avals);
  return {
    nome,
    transversal: avals.some((a) => a.transversal),
    descricao,
    pessoas: avals.length,
    comparaveis: m.comparaveis,
    mediaAntes: m.mediaAntes,
    mediaDepois: m.mediaDepois,
    delta: m.delta,
    nAtual: comNm.length,
    mediaAtual: media(comNm.map((a) => a.nm!)),
    abaixo: comNm.filter((a) => a.nm! < PARAMETROS.referencia).length,
    pedemNovoFoco: classes.NOVO_FOCO_PERSISTENTE + classes.NOVO_FOCO_NOVA,
    emEvolucao: classes.EM_EVOLUCAO,
    atencao: classes.ATENCAO,
    aguardando: classes.SEM_COMPARACAO,
    amostraPequena: m.comparaveis < MIN,
  };
}
type ResumoEixo = ReturnType<typeof resumoEixo>;

// ---------- Avaliações a partir da base ----------

export function montarAvaliacoes(base: Base) {
  const pessoas = new Map<number, { unidade: string }>();
  for (const c of base.colaboradores) {
    if (!PERFIS_EMPREGADO.has(String(c.role ?? ""))) continue;
    pessoas.set(Number(c.id), { unidade: String(c.unidade ?? "Sem unidade") });
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

  // Avaliação de Desempenho: anterior e mais recente.
  const ad = periodosAD(base.medicoesAD);
  const notaAD = new Map<string, number>(); // % da escala
  const dataAdPorAno = new Map<number, Date>();
  for (const m of base.medicoesAD) {
    if (!(m.validada || m.avaliacaoStatus === "FINALIZADA")) continue;
    const id = Number(m.colaboradorId);
    if (!pessoas.has(id) || !m.competencia) continue;
    const ano = anoDaAvaliacao(m.dataReferencia, m.avaliacaoTitulo);
    const valor = numeroOuNulo(m.valor);
    if (!ano || valor === null) continue;
    const d = dataOuNula(m.dataReferencia);
    if (d && (!dataAdPorAno.get(ano) || d > dataAdPorAno.get(ano)!)) dataAdPorAno.set(ano, d);
    const escala03 = valor >= 0 && valor <= 3;
    const p = percentualNaEscala(valor, escala03 ? 0 : Number(m.escalaMin ?? 0), escala03 ? 3 : Number(m.escalaMax ?? 3));
    if (p !== null) notaAD.set(`${id}|${normalizar(m.competencia)}|${ano}`, p);
  }

  // Ações do PDI por pessoa e eixo/competência.
  type InfoAcao = { cancelada: boolean; concluida: boolean; conclusao: Date | null };
  const acoesPorChave = new Map<string, InfoAcao[]>();
  const acoesRecorte: Array<{ pessoa: number; status: string; inicio: Date | null; conclusao: Date | null; instrumento: Instrumento | null; chave: string | null }> = [];
  for (const a of base.acoes) {
    const id = Number(a.colaboradorId);
    if (!pessoas.has(id)) continue;
    const status = String(a.status ?? "");
    const concluida = status === "concluida";
    const conclusao = dataOuNula(a.evidenciaAprovadaEm) ?? (concluida ? dataOuNula(a.atualizadaEm) : null);
    const alvo = alvoDoLastro(a.tipo, a.eixo, a.macroNome);
    const instrumento: Instrumento | null = alvo ? (alvo.dimensao === "TECNICO" ? "TECNICO" : "COMPORTAMENTAL") : null;
    const chave = alvo ? `${instrumento}|${id}|${normalizar(alvo.eixo)}` : null;
    acoesRecorte.push({ pessoa: id, status, inicio: dataOuNula(a.cicloInicio), conclusao: concluida ? conclusao : null, instrumento, chave });
    if (!chave) continue;
    const l = acoesPorChave.get(chave) ?? [];
    l.push({ cancelada: status === "cancelada", concluida, conclusao });
    acoesPorChave.set(chave, l);
  }
  const contarAcoes = (chave: string, dataNm: Date | null) => {
    const l = acoesPorChave.get(chave) ?? [];
    const ativas = l.filter((x) => !x.cancelada);
    return {
      acoesAtivas: ativas.length,
      concluidasAntesNm: dataNm ? ativas.filter((x) => x.concluida && x.conclusao && x.conclusao < dataNm).length : 0,
    };
  };

  const avaliacoes: Avaliacao[] = [];
  const potencialidades: Array<{ pessoa: number; unidade: string; eixo: string }> = [];

  for (const e of base.eixosMatriz) {
    const id = Number(e.colaboradorId);
    const p = pessoas.get(id);
    if (!p) continue;
    const eixo = String(e.eixo ?? "").trim();
    const relacao = String(e.relacao ?? "").toUpperCase();
    const nm = nmTecnico.has(`${id}|${normalizar(eixo)}`) ? nmTecnico.get(`${id}|${normalizar(eixo)}`)! : null;
    if (relacao === "NAO_ESSENCIAL") {
      if (nm !== null && nm >= PARAMETROS.referencia) potencialidades.push({ pessoa: id, unidade: p.unidade, eixo });
      continue;
    }
    if (relacao !== "ESSENCIAL" && relacao !== "TRANSVERSAL") continue;
    const pp = numeroOuNulo(e.base2025);
    const dataNm = nm !== null ? dataNmTecnico.get(id) ?? null : null;
    avaliacoes.push({
      instrumento: "TECNICO",
      pessoa: id,
      unidade: p.unidade,
      eixo,
      transversal: tipoTransversal(eixo) !== null,
      pp,
      nm,
      classe: classificar(pp, nm),
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
  const dataAdAtual = ad.anoAtual ? dataAdPorAno.get(ad.anoAtual) ?? new Date(ad.anoAtual, 11, 31) : null;
  for (const [id, comps] of Array.from(competenciasPorPessoa.entries())) {
    const p = pessoas.get(id)!;
    for (const k of Array.from(comps)) {
      const pp = ad.anoBase ? notaAD.get(`${id}|${k}|${ad.anoBase}`) ?? null : null;
      const nm = ad.anoAtual ? notaAD.get(`${id}|${k}|${ad.anoAtual}`) ?? null : null;
      if (pp === null && nm === null) continue;
      const dataNm = nm !== null ? dataAdAtual : null;
      avaliacoes.push({
        instrumento: "COMPORTAMENTAL",
        pessoa: id,
        unidade: p.unidade,
        eixo: nomeCompetencia.get(k)!,
        transversal: k === normalizar(COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL),
        pp,
        nm,
        classe: classificar(pp, nm),
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

export function montarRelatorio(base: Base, unidade?: string) {
  const dados = montarAvaliacoes(base);
  const noRecorte = <T extends { unidade: string }>(l: T[]) => (unidade ? l.filter((x) => x.unidade === unidade) : l);
  const avals = noRecorte(dados.avaliacoes);
  const potenc = noRecorte(dados.potencialidades);
  const pessoasRecorte = new Set(avals.map((a) => a.pessoa));
  const acoes = dados.acoes.filter((a) => (unidade ? dados.pessoas.get(a.pessoa)?.unidade === unidade : true));

  const tec = avals.filter((a) => a.instrumento === "TECNICO");
  const comp = avals.filter((a) => a.instrumento === "COMPORTAMENTAL");
  const resumoTec = resumoInstrumento(tec);
  const resumoComp = resumoInstrumento(comp);

  const eixos = (lista: Avaliacao[], instrumento: Instrumento) =>
    Array.from(agrupar(lista, (a) => a.eixo).entries())
      .map(([nome, l]) => resumoEixo(nome, l, instrumento === "TECNICO" ? dados.descricaoEixo.get(normalizar(nome)) ?? null : null))
      .sort((a, b) => b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"));
  const eixosTec = eixos(tec, "TECNICO");
  const eixosComp = eixos(comp, "COMPORTAMENTAL");

  const destaques = (l: ResumoEixo[]) => {
    const validos = l.filter((e) => e.comparaveis >= MIN && e.delta !== null);
    return {
      sobem: validos.filter((e) => e.delta! > 0).sort((a, b) => b.delta! - a.delta!).slice(0, 2).map((e) => ({ nome: e.nome, delta: e.delta })),
      caem: validos.filter((e) => e.delta! < 0).sort((a, b) => a.delta! - b.delta!).slice(0, 2).map((e) => ({ nome: e.nome, delta: e.delta })),
    };
  };

  // Onde focar (bloco 2): pessoas abaixo de 70% por eixo, só eixos com 5 pessoas ou mais.
  const ondeFocar = (l: ResumoEixo[]) => {
    const comAbaixo = l.filter((e) => e.abaixo > 0);
    return {
      itens: comAbaixo.filter((e) => e.nAtual >= MIN).sort((a, b) => b.abaixo - a.abaixo || a.nome.localeCompare(b.nome, "pt-BR")).map((e) => ({ nome: e.nome, abaixo: e.abaixo, transversal: e.transversal })),
      amostraPequena: comAbaixo.filter((e) => e.nAtual < MIN).length,
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

  const contexto = {
    pessoas: pessoasRecorte.size,
    areas,
    periodo: {
      tecnico: { inicioAno: 2025, inicio: null as string | null, fim: iso(maxData(datasNmTec)) },
      comportamental: { inicio: iso(dados.ad.dataBase), fim: iso(dados.ad.dataAtual) },
    },
    execucao: { inicio: iso(minData(inicios)), fim: iso(maxData(conclusoes)) },
    acoes: {
      total: acoes.length,
      concluidas: acoes.filter((a) => a.status === "concluida").length,
      emAndamento: acoes.filter((a) => a.status !== "concluida" && a.status !== "cancelada").length,
      canceladas: acoes.filter((a) => a.status === "cancelada").length,
    },
    eixos: [...eixosTec]
      .sort((a, b) => Number(b.transversal) - Number(a.transversal) || b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((e) => ({ nome: e.nome, transversal: e.transversal, pessoas: e.pessoas })),
    competencias: eixosComp.map((e) => ({ nome: e.nome, transversal: e.transversal, pessoas: e.pessoas })),
    ad: { anoBase: dados.ad.anoBase, anoAtual: dados.ad.anoAtual },
  };

  // ---- Bloco 5a: como o PDI está acontecendo
  // Ponto de partida do PDI: técnico = Avaliação de Proficiência 2025; comportamental = AD mais recente.
  const ppTec = tec.filter((a) => a.pp !== null && a.pp < PARAMETROS.referencia);
  const ppComp = comp.filter((a) => a.nm !== null && a.nm < PARAMETROS.referencia);
  const planejamento = {
    TECNICO: { comPlano: ppTec.filter((a) => a.acoesAtivas > 0).length, total: ppTec.length },
    COMPORTAMENTAL: { comPlano: ppComp.filter((a) => a.acoesAtivas > 0).length, total: ppComp.length },
  };
  const pessoasComNmTec = new Set(tec.filter((a) => a.nm !== null).map((a) => a.pessoa));
  const dataNmPessoa = new Map<number, Date | null>();
  for (const a of tec) if (a.dataNm) dataNmPessoa.set(a.pessoa, a.dataNm);
  const acoesTecMedidas = acoesNaoCanceladas.filter((a) => a.instrumento === "TECNICO" && pessoasComNmTec.has(a.pessoa));
  const execucao = {
    concluidasAntes: acoesTecMedidas.filter((a) => {
      const d = dataNmPessoa.get(a.pessoa);
      return a.status === "concluida" && a.conclusao && d && a.conclusao < d;
    }).length,
    total: acoesTecMedidas.length,
  };
  const sinais = Array.from(
    agrupar(
      tec.filter((a) => a.pp !== null && a.nm !== null && a.pp < PARAMETROS.referencia && a.concluidasAntesNm > 0),
      (a) => a.unidade,
    ).entries(),
  ).map(([area, l]) => ({ area, chegaram: l.filter((a) => a.nm! >= PARAMETROS.referencia).length, total: l.length }));
  const pdi = {
    planejamento,
    execucao,
    sinaisPorArea: sinais.filter((s) => s.total >= MIN).sort((a, b) => b.total - a.total),
    areasAmostraPequena: sinais.filter((s) => s.total < MIN).length,
  };

  // ---- Bloco 5b: fortalezas e multiplicadores
  const transversais = eixosTec
    .filter((e) => e.transversal && e.nAtual >= MIN)
    .sort((a, b) => (b.mediaAtual ?? 0) - (a.mediaAtual ?? 0))
    .map((e) => ({ nome: e.nome, media: e.mediaAtual, pessoas: e.nAtual }));
  const porAreaEspecificos = Array.from(agrupar(tec.filter((a) => !a.transversal), (a) => a.unidade).entries())
    .map(([area, l]) => ({
      area,
      eixos: Array.from(agrupar(l, (a) => a.eixo).entries())
        .map(([nome, la]) => resumoEixo(nome, la, null))
        .filter((e) => e.nAtual >= MIN)
        .sort((a, b) => (b.mediaAtual ?? 0) - (a.mediaAtual ?? 0))
        .slice(0, unidade ? 10 : 2)
        .map((e) => ({ nome: e.nome, media: e.mediaAtual, pessoas: e.nAtual })),
    }))
    .filter((x) => x.eixos.length)
    .sort((a, b) => a.area.localeCompare(b.area, "pt-BR"));
  const multPorEixo = Array.from(agrupar(potenc, (p) => p.eixo).entries()).map(([nome, l]) => ({ nome, vezes: l.length }));
  const fortalezas = {
    transversais,
    porArea: porAreaEspecificos,
    multiplicadores: {
      total: potenc.length,
      eixos: multPorEixo.length,
      porEixo: multPorEixo.filter((e) => e.vezes >= MIN).sort((a, b) => b.vezes - a.vezes),
    },
  };

  // ---- Bloco 6: foco do próximo ciclo
  // Pessoas = quem já tem a medição atual naquele eixo (é sobre elas que a média e o "abaixo" são calculados).
  const itemFoco = (e: ResumoEixo) => ({
    nome: e.nome,
    delta: e.comparaveis >= MIN ? e.delta : null,
    pessoas: e.nAtual,
    total: e.pessoas,
    media: e.mediaAtual,
    abaixo: e.abaixo,
    transversal: e.transversal,
    motivo: motivoFoco({ delta: e.comparaveis >= MIN ? e.delta : null, abaixo: e.abaixo, pessoas: e.nAtual }),
  });
  const criterioFoco = (e: ResumoEixo) => e.nAtual >= MIN && (e.abaixo > 0 || (e.comparaveis >= MIN && e.delta !== null && e.delta < 0));
  const ordenarFoco = (a: ResumoEixo, b: ResumoEixo) => b.abaixo - a.abaixo || (a.delta ?? 0) - (b.delta ?? 0) || a.nome.localeCompare(b.nome, "pt-BR");
  const foco = {
    sebrae: {
      tecnicos: eixosTec.filter((e) => e.transversal && criterioFoco(e)).sort(ordenarFoco).map(itemFoco),
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

  // ---- Bloco 7: quanto investimos onde mais crescemos
  const linhaInvest = (e: ResumoEixo, tipo: Instrumento, contraste: boolean) => {
    const l = avals.filter((a) => a.instrumento === tipo && a.eixo === e.nome && a.pp !== null && a.nm !== null);
    const acoesSoma = l.reduce((s, a) => s + a.concluidasAntesNm, 0);
    return {
      nome: e.nome,
      tipo,
      pessoas: l.length,
      crescimento: e.delta,
      acoesPorPessoa: l.length ? arred(acoesSoma / l.length) : null,
      pctComAcao: pct(l.filter((a) => a.concluidasAntesNm > 0).length, l.length),
      contraste,
    };
  };
  const validosInv = (l: ResumoEixo[]) => l.filter((e) => e.comparaveis >= MIN && e.delta !== null);
  const cresceTec = validosInv(eixosTec).filter((e) => e.delta! > 0).sort((a, b) => b.delta! - a.delta!).slice(0, 2);
  const cresceComp = validosInv(eixosComp).filter((e) => e.delta! > 0).sort((a, b) => b.delta! - a.delta!).slice(0, 2);
  const quedas = [
    ...validosInv(eixosTec).map((e) => ({ e, tipo: "TECNICO" as Instrumento })),
    ...validosInv(eixosComp).map((e) => ({ e, tipo: "COMPORTAMENTAL" as Instrumento })),
  ]
    .filter((x) => x.e.delta! < 0)
    .sort((a, b) => a.e.delta! - b.e.delta!);
  const investimento = [
    ...cresceTec.map((e) => linhaInvest(e, "TECNICO", false)),
    ...cresceComp.map((e) => linhaInvest(e, "COMPORTAMENTAL", false)),
    ...(quedas[0] ? [linhaInvest(quedas[0].e, quedas[0].tipo, true)] : []),
  ];

  // ---- Bloco 8: encaminhamentos
  const semPlano =
    planejamento.TECNICO.total - planejamento.TECNICO.comPlano + planejamento.COMPORTAMENTAL.total - planejamento.COMPORTAMENTAL.comPlano;
  const encaminhamentos = [
    ...(resumoTec.aguardando > 0 ? [`Concluir a Avaliação de Proficiência 2026 nas ${resumoTec.aguardando} avaliações pendentes`] : []),
    ...(semPlano > 0 ? [`Líderes: incluir no próximo PDI os ${semPlano} pontos de partida abaixo de 70% ainda sem plano`] : []),
    "Concluir a revisão dos eixos por função com cada empregado",
    ...(fortalezas.multiplicadores.total > 0 ? ["Conectar multiplicadores às prioridades"] : []),
  ];

  // ---- Sínteses
  const pctPlano = pct(
    planejamento.TECNICO.comPlano + planejamento.COMPORTAMENTAL.comPlano,
    planejamento.TECNICO.total + planejamento.COMPORTAMENTAL.total,
  );
  const sinteses = {
    resultado: sinteseResultado(resumoTec, resumoComp),
    fechamento: sinteseFechamento(resumoTec, resumoComp),
    tecnico: sinteseConhecimento(eixosTec, "TECNICO"),
    comportamental: sinteseConhecimento(eixosComp, "COMPORTAMENTAL"),
    pdi: sintesePdi({
      planejamentoPct: pctPlano,
      execucaoPct: pct(execucao.concluidasAntes, execucao.total),
      forca: transversais[0] ?? null,
      multiplicadores: fortalezas.multiplicadores.total,
    }),
    investimento: sinteseInvestimento(investimento),
  };

  return {
    parametros: PARAMETROS,
    recorte: {
      unidade: unidade ?? null,
      pessoas: pessoasRecorte.size,
      amostraPequena: pessoasRecorte.size < MIN,
    },
    contexto,
    instrumentos: {
      TECNICO: { ...resumoTec, destaques: destaques(eixosTec), ondeFocar: ondeFocar(eixosTec), eixos: eixosTec },
      COMPORTAMENTAL: { ...resumoComp, destaques: destaques(eixosComp), ondeFocar: ondeFocar(eixosComp), eixos: eixosComp },
    },
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

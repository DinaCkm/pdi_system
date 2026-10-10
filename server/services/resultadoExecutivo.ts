import { sql } from "drizzle-orm";
import {
  COMPETENCIAS_AD_HISTORICAS,
  competenciaADRelacionadaDaMacro,
  nomeCompetenciaAD,
} from "../../shared/competenciasAdRelacionamento";
import { COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL, ehGestorPorPerfil } from "../../shared/eixosTransversais";
import { percentualNaEscala } from "../../shared/evolucaoDomain";
import {
  DESCRICAO_DIMENSAO,
  DIMENSOES,
  GRUPO_DO_MOTIVO,
  LEGENDA_GRUPO_MOTIVO,
  LEGENDA_INDICADOR,
  LEGENDA_MOTIVO,
  LEGENDA_STATUS,
  META_PROFICIENCIA,
  STATUS_EVOLUCAO,
  classificarEixo,
  comMeta,
  contarMotivos,
  motivoDaLacuna,
  prazoFoiProrrogado,
  situacaoVazia,
  type Dimensao,
  type GrupoMotivo,
  type Motivo,
  type Relacao,
  type SituacaoAcoes,
  type StatusEvolucao,
} from "./resultadoExecutivoRegras";

// Resultado Executivo — montagem dos dados (consultas só leitura + cruzamento em memória).
// Recebe a conexão pronta; o router cuida de permissão e de garantir as tabelas.
// Regras puras em ./resultadoExecutivoRegras.ts.


export type EixoAvaliado = {
  dimensao: Dimensao;
  colaboradorId: number;
  colaboradorNome: string;
  unidade: string;
  gestor: boolean;
  eixo: string;
  relacao: Relacao;
  base: number | null; //            % (prova) ou % da escala (AD)
  atual: number | null;
  notaBase: number | null; //        nota original da AD (0–3); null no técnico
  notaAtual: number | null;
  deltaPp: number | null;
  periodoBase: string | null;
  periodoAtual: string | null;
  acoes: SituacaoAcoes;
  status: StatusEvolucao;
  precisaNovaAcao: boolean;
  motivo: Motivo | null;
  grupoMotivo: GrupoMotivo | null;
};

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export function normalizar(valor: unknown) {
  return String(valor ?? "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function dataOuNula(valor: unknown): Date | null {
  if (!valor) return null;
  const d = new Date(valor as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

function media(valores: number[]) {
  return valores.length ? arredondar(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
}

function anoDaAvaliacao(dataReferencia: unknown, titulo: unknown): number | null {
  const d = dataOuNula(dataReferencia);
  if (d && d.getFullYear() > 2000) return d.getFullYear();
  const m = String(titulo ?? "").match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

// Chave dimensão|colaborador|eixo para cruzar ações e solicitações.
function chave(dimensao: Dimensao, colaboradorId: number, eixo: unknown) {
  return `${dimensao}|${colaboradorId}|${normalizar(eixo)}`;
}

// De qual eixo/competência é a ação ou solicitação.
function alvoDoLastro(tipo: unknown, eixo: unknown, macroNome: unknown): { dimensao: Dimensao; eixo: string } | null {
  const tipoNorm = String(tipo ?? "").toUpperCase();
  const eixoNome = String(eixo ?? "").trim();
  if (eixoNome) {
    // Sem tipo gravado = ação técnica antiga (regra anterior a PR #237).
    return { dimensao: tipoNorm === "COMPORTAMENTAL" ? "COMPORTAMENTAL" : "TECNICO", eixo: eixoNome };
  }
  const macro = String(macroNome ?? "").trim();
  if (!macro) return null;
  if (/^COMPORTAMENTAL\s*-/i.test(macro)) {
    const ad = competenciaADRelacionadaDaMacro(macro);
    return ad ? { dimensao: "COMPORTAMENTAL", eixo: ad } : null;
  }
  // Macro já com o nome de uma competência da AD.
  const nomeAD = nomeCompetenciaAD(macro);
  if ((COMPETENCIAS_AD_HISTORICAS as readonly string[]).some((c) => normalizar(c) === normalizar(nomeAD))) {
    return { dimensao: "COMPORTAMENTAL", eixo: nomeAD };
  }
  if (/^T[ÉE]CNICA\s*-/i.test(macro)) {
    return { dimensao: "TECNICO", eixo: macro.replace(/^T[ÉE]CNICA\s*-\s*/i, "") };
  }
  return null;
}

// Carrega a base completa do ciclo e cruza em memória.
export async function carregarBase(db: { execute: (q: any) => Promise<any> }, cicloId?: number) {
  const filtroCiclo = cicloId ? sql`AND p.cicloId = ${cicloId}` : sql``;

  const [
    colaboradoresR,
    eixosMatrizR,
    resultadosR,
    medicoesADR,
    acoesR,
    pdisR,
    prazosR,
    evidenciasR,
    solicitacoesR,
  ] = await Promise.all([
    // 1) Empregados ativos. Gestor entra na unidade que lidera.
    db.execute(sql`
      SELECT u.id, u.name, u.role,
             COALESCE(dl.nome, d.nome, 'Sem unidade') AS unidade,
             m.id AS matrizId, m.status AS matrizStatus, m.observacao AS matrizObservacao
        FROM users u
        LEFT JOIN departamentos d ON d.id = u.departamentoId
        LEFT JOIN departamentos dl ON dl.id = (
          SELECT d2.id FROM departamentos d2
           WHERE d2.leaderId = u.id AND d2.status = 'ativo'
           ORDER BY d2.id LIMIT 1
        )
        LEFT JOIN prova_utic_matrizes m ON m.colaborador_id = u.id
       WHERE u.status = 'ativo'
    `),
    // 2) Eixos das matrizes.
    db.execute(sql`
      SELECT m.colaborador_id AS colaboradorId, e.eixo_nome AS eixo, e.relacao,
             e.status_classificacao AS statusClassificacao, e.percentual_anterior AS base2025
        FROM prova_utic_matrizes m
        JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
    `),
    // 3) Último resultado de prova (exclui aplicações de homologação/teste).
    db.execute(sql`
      SELECT rp.colaborador_id AS colaboradorId, rp.resultado_json AS resultadoJson, rp.calculado_em AS calculadoEm
        FROM resultados_proficiencia rp
       WHERE rp.id = (
         SELECT rp2.id FROM resultados_proficiencia rp2
          WHERE rp2.colaborador_id = rp.colaborador_id
            AND NOT EXISTS (
              SELECT 1 FROM provas_importadas_homologacao ph
               WHERE ph.aplicacao_teste_id = rp2.aplicacao_id
            )
          ORDER BY rp2.calculado_em DESC, rp2.id DESC
          LIMIT 1
       )
    `),
    // 4) Avaliação de Desempenho (competências comportamentais).
    db.execute(sql`
      SELECT mc.colaboradorId, cm.nome AS competencia, mc.valor,
             mc.escala_min AS escalaMin, mc.escala_max AS escalaMax, mc.validada,
             a.id AS avaliacaoId, a.status AS avaliacaoStatus, a.titulo AS avaliacaoTitulo,
             a.data_referencia AS dataReferencia
        FROM medicoes_competencias mc
        JOIN avaliacoes a ON a.id = mc.avaliacaoId
        LEFT JOIN competencias_macros cm ON cm.id = mc.competenciaMacroId
       WHERE mc.tipoCompetencia = 'COMPORTAMENTAL'
         AND mc.fonte = 'AVALIACAO_DESEMPENHO'
    `),
    // 5) Ações dos PDIs não cancelados (opcionalmente de um ciclo), inclusive canceladas.
    db.execute(sql`
      SELECT a.id, p.colaboradorId, a.status, a.prazo, a.eixo_nome AS eixo,
             a.tipo_competencia AS tipo, cm.nome AS macroNome, c.dataInicio AS cicloInicio
        FROM actions a
        JOIN pdis p ON p.id = a.pdiId
        LEFT JOIN ciclos c ON c.id = p.cicloId
        LEFT JOIN competencias_macros cm ON cm.id = a.macroId
       WHERE p.status <> 'cancelado'
         ${filtroCiclo}
    `),
    // 6) Quem tem PDI ativo no recorte.
    db.execute(sql`
      SELECT DISTINCT p.colaboradorId FROM pdis p WHERE p.status <> 'cancelado' ${filtroCiclo}
    `),
    // 7) Alterações de prazo (para identificar prorrogação).
    db.execute(sql`
      SELECT actionId, valorAnterior, valorNovo FROM acoes_historico WHERE campo = 'Prazo'
    `),
    // 8) Última evidência de cada ação (devolvida = reprovada).
    db.execute(sql`
      SELECT e.actionId, e.status
        FROM evidences e
       WHERE e.id = (SELECT MAX(e2.id) FROM evidences e2 WHERE e2.actionId = e.actionId)
    `),
    // 9) Solicitações de ação que não viraram ação.
    db.execute(sql`
      SELECT p.colaboradorId, s.statusGeral, cm.nome AS macroNome
        FROM solicitacoes_acoes s
        JOIN pdis p ON p.id = s.pdiId
        LEFT JOIN competencias_macros cm ON cm.id = s.macroId
       WHERE s.acaoIncluidaId IS NULL
         AND p.status <> 'cancelado'
         ${filtroCiclo}
    `),
  ]);

  return {
    colaboradores: rowsOf<any>(colaboradoresR),
    eixosMatriz: rowsOf<any>(eixosMatrizR),
    resultados: rowsOf<any>(resultadosR),
    medicoesAD: rowsOf<any>(medicoesADR),
    acoes: rowsOf<any>(acoesR),
    comPdi: new Set(rowsOf<any>(pdisR).map((r) => Number(r.colaboradorId))),
    prorrogadas: new Set(
      rowsOf<any>(prazosR)
        .filter((r) => prazoFoiProrrogado(r.valorAnterior, r.valorNovo))
        .map((r) => Number(r.actionId)),
    ),
    evidenciaDevolvida: new Set(
      rowsOf<any>(evidenciasR)
        .filter((r) => String(r.status) === "reprovada")
        .map((r) => Number(r.actionId)),
    ),
    solicitacoes: rowsOf<any>(solicitacoesR),
  };
}

type Base = Awaited<ReturnType<typeof carregarBase>>;

// Períodos da AD: a mais recente é a "atual" e a anterior é a "base".
function periodosAD(medicoes: any[]) {
  const anos = new Set<number>();
  const dataPorAno = new Map<number, Date>();
  for (const m of medicoes) {
    if (!(m.validada || m.avaliacaoStatus === "FINALIZADA")) continue;
    const ano = anoDaAvaliacao(m.dataReferencia, m.avaliacaoTitulo);
    if (!ano) continue;
    anos.add(ano);
    const d = dataOuNula(m.dataReferencia);
    if (d && (!dataPorAno.get(ano) || d > dataPorAno.get(ano)!)) dataPorAno.set(ano, d);
  }
  const ordenados = Array.from(anos).sort((a, b) => b - a);
  const atual = ordenados[0] ?? null;
  const base = ordenados[1] ?? null;
  return {
    anoAtual: atual,
    anoBase: base,
    // Sem data gravada: considera o fim do ano da AD.
    dataAtual: atual ? dataPorAno.get(atual) ?? new Date(atual, 11, 31) : null,
  };
}

export function montarAvaliacao(base: Base): { itens: EixoAvaliado[]; periodos: Record<Dimensao, { base: string | null; atual: string | null }> } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const colabPorId = new Map<number, any>();
  for (const c of base.colaboradores) colabPorId.set(Number(c.id), c);

  // Medição técnica atual por pessoa e eixo.
  const atualTecnico = new Map<string, number>();
  const dataTecnicaPorColab = new Map<number, Date | null>();
  for (const r of base.resultados) {
    const colaboradorId = Number(r.colaboradorId);
    dataTecnicaPorColab.set(colaboradorId, dataOuNula(r.calculadoEm));
    let json: any = {};
    try { json = JSON.parse(String(r.resultadoJson ?? "{}")); } catch { json = {}; }
    for (const e of json.porEixo ?? []) {
      const pct = numeroOuNulo(e.percentualAtual ?? e.percentualConhecimento);
      if (pct === null) continue;
      atualTecnico.set(chave("TECNICO", colaboradorId, e.eixo), pct);
    }
  }

  // AD: nota por pessoa, competência e ano.
  const ad = periodosAD(base.medicoesAD);
  const notaAD = new Map<string, { valor: number; min: number; max: number }>();
  const comAD = new Set<number>();
  for (const m of base.medicoesAD) {
    if (!(m.validada || m.avaliacaoStatus === "FINALIZADA")) continue;
    const ano = anoDaAvaliacao(m.dataReferencia, m.avaliacaoTitulo);
    const valor = numeroOuNulo(m.valor);
    if (!ano || valor === null || !m.competencia) continue;
    const colaboradorId = Number(m.colaboradorId);
    comAD.add(colaboradorId);
    // Base Umanni: notas entre 0 e 3 são lidas na escala 0–3 (mesma regra da Evolução Individual).
    const naEscala03 = valor >= 0 && valor <= 3;
    notaAD.set(`${chave("COMPORTAMENTAL", colaboradorId, m.competencia)}|${ano}`, {
      valor,
      min: naEscala03 ? 0 : Number(m.escalaMin ?? 0),
      max: naEscala03 ? 3 : Number(m.escalaMax ?? 3),
    });
  }

  // Ações por pessoa e eixo/competência.
  const situacoes = new Map<string, SituacaoAcoes>();
  const situacao = (k: string) => {
    let s = situacoes.get(k);
    if (!s) { s = situacaoVazia(); situacoes.set(k, s); }
    return s;
  };
  const dataMedicaoAtual = (dimensao: Dimensao, colaboradorId: number) =>
    dimensao === "TECNICO" ? dataTecnicaPorColab.get(colaboradorId) ?? null : ad.dataAtual;

  for (const a of base.acoes) {
    const alvo = alvoDoLastro(a.tipo, a.eixo, a.macroNome);
    if (!alvo) continue;
    const colaboradorId = Number(a.colaboradorId);
    const s = situacao(chave(alvo.dimensao, colaboradorId, alvo.eixo));
    const status = String(a.status ?? "");
    const id = Number(a.id);
    if (status === "cancelada") { s.canceladas += 1; continue; }
    s.total += 1;
    if (status === "concluida") {
      s.concluidas += 1;
      const medicao = dataMedicaoAtual(alvo.dimensao, colaboradorId);
      const inicio = dataOuNula(a.cicloInicio);
      if (!medicao || !inicio || inicio < medicao) s.concluidasAntesDaMedicao += 1;
    } else {
      s.abertas += 1;
      if (a.prazo && new Date(a.prazo) < hoje) s.vencidas += 1;
      if (base.prorrogadas.has(id)) s.prorrogadas += 1;
      if (base.evidenciaDevolvida.has(id)) s.evidenciaDevolvida += 1;
    }
  }

  for (const sol of base.solicitacoes) {
    const alvo = alvoDoLastro(null, null, sol.macroNome);
    if (!alvo) continue;
    const s = situacao(chave(alvo.dimensao, Number(sol.colaboradorId), alvo.eixo));
    const st = String(sol.statusGeral ?? "");
    if (st === "vetada_gestor" || st === "vetada_rh" || st === "encerrada_lider") s.solicitacoesReprovadas += 1;
    else if (st === "aguardando_solicitante" || st === "em_revisao") s.solicitacoesDevolvidas += 1;
    else if (st === "aguardando_ckm" || st === "aguardando_gestor" || st === "aguardando_rh") s.solicitacoesEmAnalise += 1;
  }

  const itens: EixoAvaliado[] = [];
  const registrar = (
    dimensao: Dimensao,
    colab: any,
    eixo: string,
    relacao: Relacao,
    valores: { base: number | null; atual: number | null; notaBase: number | null; notaAtual: number | null },
    periodoBase: string | null,
    periodoAtual: string | null,
  ) => {
    const colaboradorId = Number(colab.id);
    const acoes = situacoes.get(chave(dimensao, colaboradorId, eixo)) ?? situacaoVazia();
    const { status, precisaNovaAcao } = classificarEixo({ relacao, base: valores.base, atual: valores.atual, acoes });
    const motivo = comMeta(relacao) ? motivoDaLacuna(status, acoes, base.comPdi.has(colaboradorId)) : null;
    itens.push({
      dimensao,
      colaboradorId,
      colaboradorNome: String(colab.name ?? ""),
      unidade: String(colab.unidade ?? "Sem unidade"),
      gestor: ehGestorPorPerfil(colab.role),
      eixo,
      relacao,
      ...valores,
      deltaPp: valores.base !== null && valores.atual !== null ? arredondar(valores.atual - valores.base) : null,
      periodoBase,
      periodoAtual,
      acoes,
      status,
      precisaNovaAcao,
      motivo,
      grupoMotivo: motivo ? GRUPO_DO_MOTIVO[motivo] : null,
    });
  };

  // TÉCNICO: eixos da matriz de cada empregado ativo.
  for (const e of base.eixosMatriz) {
    const colab = colabPorId.get(Number(e.colaboradorId));
    if (!colab) continue; // inativo
    const eixo = String(e.eixo ?? "").trim();
    const relacao = (e.relacao ? String(e.relacao).toUpperCase() : null) as Relacao;
    const k = chave("TECNICO", Number(colab.id), eixo);
    registrar(
      "TECNICO",
      colab,
      eixo,
      relacao,
      {
        base: numeroOuNulo(e.base2025),
        atual: atualTecnico.has(k) ? atualTecnico.get(k)! : null,
        notaBase: null,
        notaAtual: null,
      },
      "Prova 2025",
      "Prova 2026",
    );
  }

  // COMPORTAMENTAL: exatamente o que a Avaliação de Desempenho mediu.
  // Nada é acrescentado nem alterado: só entram as competências em que a
  // pessoa foi avaliada (na AD anterior ou na mais recente).
  const rotuloBase = ad.anoBase ? `AD ${ad.anoBase}` : null;
  const rotuloAtual = ad.anoAtual ? `AD ${ad.anoAtual}` : null;
  for (const colab of base.colaboradores) {
    const colaboradorId = Number(colab.id);
    const papel = String(colab.role ?? "");
    if (papel !== "colaborador" && papel !== "lider") continue;
    if (!comAD.has(colaboradorId)) continue;
    for (const competencia of COMPETENCIAS_AD_HISTORICAS) {
      const prefixo = chave("COMPORTAMENTAL", colaboradorId, competencia);
      const notaB = ad.anoBase ? notaAD.get(`${prefixo}|${ad.anoBase}`) ?? null : null;
      const notaA = ad.anoAtual ? notaAD.get(`${prefixo}|${ad.anoAtual}`) ?? null : null;
      if (!notaB && !notaA) continue; // não avaliada para esta pessoa
      const transversal = normalizar(competencia) === normalizar(COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL);
      // A comparação só vale na mesma escala.
      const mesmaEscala = !notaB || !notaA || (notaB.min === notaA.min && notaB.max === notaA.max);
      registrar(
        "COMPORTAMENTAL",
        colab,
        competencia,
        transversal ? "TRANSVERSAL" : "ESSENCIAL",
        {
          base: notaB && mesmaEscala ? percentualNaEscala(notaB.valor, notaB.min, notaB.max) : null,
          atual: notaA ? percentualNaEscala(notaA.valor, notaA.min, notaA.max) : null,
          notaBase: notaB?.valor ?? null,
          notaAtual: notaA?.valor ?? null,
        },
        rotuloBase,
        rotuloAtual,
      );
    }
  }

  return {
    itens,
    periodos: {
      TECNICO: { base: "Prova 2025", atual: "Prova 2026" },
      COMPORTAMENTAL: { base: rotuloBase, atual: rotuloAtual },
    },
  };
}

function contarStatus(itens: EixoAvaliado[]) {
  const contagem = Object.fromEntries(STATUS_EVOLUCAO.map((s) => [s, 0])) as Record<StatusEvolucao, number>;
  for (const i of itens) contagem[i.status] += 1;
  return contagem;
}

// Indicadores de um recorte, sempre de uma única dimensão.
export function indicadores(itens: EixoAvaliado[]) {
  const comMetaItens = itens.filter((i) => comMeta(i.relacao));
  const comparaveis = comMetaItens.filter((i) => i.deltaPp !== null);
  const naMetaBase = comMetaItens.filter((i) => i.base !== null && i.base >= META_PROFICIENCIA).length;
  const naMetaAtual = comMetaItens.filter((i) => i.atual !== null && i.atual >= META_PROFICIENCIA).length;
  const comBase = comMetaItens.filter((i) => i.base !== null).length;
  const comAtual = comMetaItens.filter((i) => i.atual !== null).length;

  // Efetividade do PDI: só ações concluídas antes da medição podem ter efeito nela.
  const comAcaoConcluida = comparaveis.filter((i) => i.acoes.concluidasAntesDaMedicao > 0).map((i) => i.deltaPp!);
  const semAcao = comparaveis.filter((i) => i.acoes.total === 0).map((i) => i.deltaPp!);

  const potencialidades = itens.filter((i) => i.status === "POTENCIALIDADE");

  return {
    pessoas: new Set(itens.map((i) => i.colaboradorId)).size,
    itensComMeta: comMetaItens.length,
    indiceEvolucaoPp: media(comparaveis.map((i) => i.deltaPp!)),
    mediaBase: media(comMetaItens.filter((i) => i.base !== null).map((i) => i.base!)),
    mediaAtual: media(comMetaItens.filter((i) => i.atual !== null).map((i) => i.atual!)),
    percentualNaMetaBase: comBase ? arredondar((naMetaBase / comBase) * 100) : null,
    percentualNaMetaAtual: comAtual ? arredondar((naMetaAtual / comAtual) * 100) : null,
    efetividade: {
      evolucaoComAcaoConcluidaPp: media(comAcaoConcluida),
      evolucaoSemAcaoPp: media(semAcao),
      amostraComAcao: comAcaoConcluida.length,
      amostraSemAcao: semAcao.length,
    },
    potencialidades: {
      total: potencialidades.length,
      acimaDe70: potencialidades.filter((i) => i.atual !== null && i.atual >= META_PROFICIENCIA).length,
    },
    status: contarStatus(itens),
    motivos: contarMotivos(itens.map((i) => i.motivo)),
  };
}

export function porDimensao(itens: EixoAvaliado[]) {
  return Object.fromEntries(
    DIMENSOES.map((d) => [d, indicadores(itens.filter((i) => i.dimensao === d))]),
  ) as Record<Dimensao, ReturnType<typeof indicadores>>;
}

export function agrupar<K extends string>(itens: EixoAvaliado[], chaveDe: (i: EixoAvaliado) => K) {
  const mapa = new Map<K, EixoAvaliado[]>();
  for (const i of itens) {
    const k = chaveDe(i);
    const lista = mapa.get(k) ?? [];
    lista.push(i);
    mapa.set(k, lista);
  }
  return mapa;
}

export function legendas(periodos: Record<Dimensao, { base: string | null; atual: string | null }>) {
  return {
    meta: `Meta de ${META_PROFICIENCIA}% para itens Essenciais e Transversais. Não essencial não tem meta.`,
    dimensoes: Object.fromEntries(
      DIMENSOES.map((d) => [d, { ...DESCRICAO_DIMENSAO[d], periodoBase: periodos[d].base, periodoAtual: periodos[d].atual }]),
    ),
    indicadores: LEGENDA_INDICADOR,
    status: LEGENDA_STATUS,
    motivos: LEGENDA_MOTIVO,
    gruposMotivo: LEGENDA_GRUPO_MOTIVO,
  };
}

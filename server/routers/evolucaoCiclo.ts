import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { ensureAcoesLastroSchema } from "../services/acoesLastro";
import { ensureHomologacaoTables } from "../services/homologacaoProvas";
import { ensureTechnicalMatrixTables } from "../services/technicalMatrixSchema";

// Resultado Executivo — Evolução do Ciclo.
// Somente leitura e somente administradores enquanto o Resultado Executivo
// não for publicado. Cruza, para cada empregado e eixo técnico:
//   - a classificação da matriz (Essencial / Transversal / Não essencial);
//   - a linha de base 2025 (percentual_anterior da matriz);
//   - o resultado da prova de certificação 2026 (resultados_proficiencia);
//   - as ações do PDI ligadas ao eixo (actions.eixo_nome).
//
// Regra de meta: Essencial e Transversal = 70%. Não essencial não tem meta:
// todo conhecimento nesses eixos é registrado como potencialidade.

export const META_PROFICIENCIA = 70;

export const STATUS_EVOLUCAO = [
  "DOMINIO", //               estava na meta em 2025 e continua em 2026
  "DESENVOLVIDO", //          estava abaixo da meta em 2025 e atingiu em 2026
  "EM_DESENVOLVIMENTO", //    abaixo da meta, com ação aberta ou evoluindo
  "ACAO_SEM_EFEITO", //       abaixo da meta, ação concluída e nota não subiu
  "LACUNA_SEM_PLANO", //      abaixo da meta e sem nenhuma ação no PDI
  "POTENCIALIDADE", //        eixo Não essencial (sem meta)
  "SEM_RESULTADO_2026", //    ainda sem prova 2026 para o eixo
  "SEM_CLASSIFICACAO", //     eixo sem relação definida na matriz
] as const;
export type StatusEvolucao = (typeof STATUS_EVOLUCAO)[number];

type Relacao = "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | null;

type EixoAvaliado = {
  colaboradorId: number;
  colaboradorNome: string;
  unidade: string;
  eixo: string;
  relacao: Relacao;
  base2025: number | null;
  atual2026: number | null;
  deltaPp: number | null;
  acoesTotal: number;
  acoesConcluidas: number;
  acoesAbertas: number;
  acoesVencidas: number;
  status: StatusEvolucao;
  precisaNovaAcao: boolean;
};

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function normalizar(valor: string) {
  return String(valor ?? "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function media(valores: number[]) {
  return valores.length ? arredondar(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
}

function comMeta(relacao: Relacao) {
  return relacao === "ESSENCIAL" || relacao === "TRANSVERSAL";
}

export function classificarEixo(item: {
  relacao: Relacao;
  base2025: number | null;
  atual2026: number | null;
  acoesConcluidas: number;
  acoesAbertas: number;
}): { status: StatusEvolucao; precisaNovaAcao: boolean } {
  if (!item.relacao) return { status: "SEM_CLASSIFICACAO", precisaNovaAcao: false };
  if (item.relacao === "NAO_ESSENCIAL") return { status: "POTENCIALIDADE", precisaNovaAcao: false };
  if (item.atual2026 === null) return { status: "SEM_RESULTADO_2026", precisaNovaAcao: false };

  if (item.atual2026 >= META_PROFICIENCIA) {
    const jaNaMeta = item.base2025 !== null && item.base2025 >= META_PROFICIENCIA;
    return { status: jaNaMeta ? "DOMINIO" : "DESENVOLVIDO", precisaNovaAcao: false };
  }

  // Abaixo da meta em 2026.
  if (item.acoesAbertas > 0) return { status: "EM_DESENVOLVIMENTO", precisaNovaAcao: false };
  const evoluiu = item.base2025 !== null && item.atual2026 > item.base2025;
  if (item.acoesConcluidas > 0) {
    return evoluiu
      ? { status: "EM_DESENVOLVIMENTO", precisaNovaAcao: true }
      : { status: "ACAO_SEM_EFEITO", precisaNovaAcao: true };
  }
  return { status: "LACUNA_SEM_PLANO", precisaNovaAcao: true };
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await ensureTechnicalMatrixTables();
  await ensureHomologacaoTables(db);
  await ensureAcoesLastroSchema();
  return db;
}

// Carrega a base completa do ciclo em 4 consultas e cruza em memória.
async function carregarBase(db: any, cicloId?: number) {
  // 1) Empregados ativos com matriz. Gestor entra na unidade que lidera.
  const colaboradores = rowsOf<any>(await db.execute(sql`
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
  `));

  // 2) Eixos das matrizes.
  const eixosMatriz = rowsOf<any>(await db.execute(sql`
    SELECT m.colaborador_id AS colaboradorId, e.eixo_nome AS eixo, e.relacao,
           e.status_classificacao AS statusClassificacao, e.percentual_anterior AS base2025
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
  `));

  // 3) Último resultado de prova (exclui aplicações de homologação/teste).
  const resultados = rowsOf<any>(await db.execute(sql`
    SELECT rp.colaborador_id AS colaboradorId, rp.resultado_json AS resultadoJson
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
  `));

  // 4) Ações técnicas dos PDIs não cancelados (opcionalmente de um ciclo).
  const filtroCiclo = cicloId ? sql`AND p.cicloId = ${cicloId}` : sql``;
  const acoes = rowsOf<any>(await db.execute(sql`
    SELECT p.colaboradorId, a.status, a.prazo, a.eixo_nome AS eixo, a.tipo_competencia AS tipo
      FROM actions a
      JOIN pdis p ON p.id = a.pdiId
     WHERE p.status <> 'cancelado'
       AND a.eixo_nome IS NOT NULL AND a.eixo_nome <> ''
       AND (a.tipo_competencia IS NULL OR a.tipo_competencia = 'TECNICA')
       ${filtroCiclo}
  `));

  return { colaboradores, eixosMatriz, resultados, acoes };
}

function montarAvaliacao(base: Awaited<ReturnType<typeof carregarBase>>) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const colabPorId = new Map<number, any>();
  for (const c of base.colaboradores) colabPorId.set(Number(c.id), c);

  const atualPorColabEixo = new Map<string, number>();
  for (const r of base.resultados) {
    let json: any = {};
    try { json = JSON.parse(String(r.resultadoJson ?? "{}")); } catch { json = {}; }
    for (const e of json.porEixo ?? []) {
      const pct = numeroOuNulo(e.percentualAtual ?? e.percentualConhecimento);
      if (pct === null) continue;
      atualPorColabEixo.set(`${Number(r.colaboradorId)}|${normalizar(e.eixo)}`, pct);
    }
  }

  const acoesPorColabEixo = new Map<string, { total: number; concluidas: number; abertas: number; vencidas: number }>();
  for (const a of base.acoes) {
    const chave = `${Number(a.colaboradorId)}|${normalizar(a.eixo)}`;
    const item = acoesPorColabEixo.get(chave) ?? { total: 0, concluidas: 0, abertas: 0, vencidas: 0 };
    const status = String(a.status ?? "");
    if (status === "cancelada") continue;
    item.total += 1;
    if (status === "concluida") {
      item.concluidas += 1;
    } else {
      item.abertas += 1;
      if (a.prazo && new Date(a.prazo) < hoje) item.vencidas += 1;
    }
    acoesPorColabEixo.set(chave, item);
  }

  const avaliados: EixoAvaliado[] = [];
  for (const e of base.eixosMatriz) {
    const colaboradorId = Number(e.colaboradorId);
    const colab = colabPorId.get(colaboradorId);
    if (!colab) continue; // inativo
    const chave = `${colaboradorId}|${normalizar(e.eixo)}`;
    const relacao = (e.relacao ? String(e.relacao).toUpperCase() : null) as Relacao;
    const base2025 = numeroOuNulo(e.base2025);
    const atual2026 = atualPorColabEixo.has(chave) ? atualPorColabEixo.get(chave)! : null;
    const acoes = acoesPorColabEixo.get(chave) ?? { total: 0, concluidas: 0, abertas: 0, vencidas: 0 };
    const { status, precisaNovaAcao } = classificarEixo({
      relacao,
      base2025,
      atual2026,
      acoesConcluidas: acoes.concluidas,
      acoesAbertas: acoes.abertas,
    });
    avaliados.push({
      colaboradorId,
      colaboradorNome: String(colab.name ?? ""),
      unidade: String(colab.unidade ?? "Sem unidade"),
      eixo: String(e.eixo ?? "").trim(),
      relacao,
      base2025,
      atual2026,
      deltaPp: base2025 !== null && atual2026 !== null ? arredondar(atual2026 - base2025) : null,
      acoesTotal: acoes.total,
      acoesConcluidas: acoes.concluidas,
      acoesAbertas: acoes.abertas,
      acoesVencidas: acoes.vencidas,
      status,
      precisaNovaAcao,
    });
  }
  return avaliados;
}

function contarStatus(itens: EixoAvaliado[]) {
  const contagem = Object.fromEntries(STATUS_EVOLUCAO.map((s) => [s, 0])) as Record<StatusEvolucao, number>;
  for (const i of itens) contagem[i.status] += 1;
  return contagem;
}

// Indicadores de um recorte (SEBRAE inteiro, unidade, eixo ou unidade × eixo).
function indicadores(itens: EixoAvaliado[]) {
  const comMetaItens = itens.filter((i) => comMeta(i.relacao));
  const comparaveis = comMetaItens.filter((i) => i.deltaPp !== null);
  const naMeta2025 = comMetaItens.filter((i) => i.base2025 !== null && i.base2025 >= META_PROFICIENCIA).length;
  const naMeta2026 = comMetaItens.filter((i) => i.atual2026 !== null && i.atual2026 >= META_PROFICIENCIA).length;
  const comBase = comMetaItens.filter((i) => i.base2025 !== null).length;
  const comAtual = comMetaItens.filter((i) => i.atual2026 !== null).length;

  // Efetividade do PDI: evolução de quem concluiu ação no eixo × quem não teve ação.
  const comAcaoConcluida = comparaveis.filter((i) => i.acoesConcluidas > 0).map((i) => i.deltaPp!);
  const semAcao = comparaveis.filter((i) => i.acoesTotal === 0).map((i) => i.deltaPp!);

  const potencialidades = itens.filter((i) => i.status === "POTENCIALIDADE");

  return {
    pessoas: new Set(itens.map((i) => i.colaboradorId)).size,
    eixosComMeta: comMetaItens.length,
    indiceEvolucaoPp: media(comparaveis.map((i) => i.deltaPp!)),
    media2025: media(comMetaItens.filter((i) => i.base2025 !== null).map((i) => i.base2025!)),
    media2026: media(comMetaItens.filter((i) => i.atual2026 !== null).map((i) => i.atual2026!)),
    percentualNaMeta2025: comBase ? arredondar((naMeta2025 / comBase) * 100) : null,
    percentualNaMeta2026: comAtual ? arredondar((naMeta2026 / comAtual) * 100) : null,
    efetividade: {
      evolucaoComAcaoConcluidaPp: media(comAcaoConcluida),
      evolucaoSemAcaoPp: media(semAcao),
      amostraComAcao: comAcaoConcluida.length,
      amostraSemAcao: semAcao.length,
    },
    potencialidades: {
      total: potencialidades.length,
      acimaDe70: potencialidades.filter((i) => i.atual2026 !== null && i.atual2026 >= META_PROFICIENCIA).length,
    },
    status: contarStatus(itens),
  };
}

function agrupar<K extends string>(itens: EixoAvaliado[], chave: (i: EixoAvaliado) => K) {
  const mapa = new Map<K, EixoAvaliado[]>();
  for (const i of itens) {
    const k = chave(i);
    const lista = mapa.get(k) ?? [];
    lista.push(i);
    mapa.set(k, lista);
  }
  return mapa;
}

const filtroInput = z
  .object({
    cicloId: z.number().int().positive().optional(),
    unidade: z.string().trim().min(1).max(255).optional(),
  })
  .optional();

export const evolucaoCicloRouter = router({
  // Painel geral: SEBRAE inteiro, por unidade, por eixo e a matriz unidade × eixo.
  visaoGeral: adminProcedure.input(filtroInput).query(async ({ input }) => {
    const db = await dbObrigatorio();
    let itens = montarAvaliacao(await carregarBase(db, input?.cicloId));
    if (input?.unidade) itens = itens.filter((i) => i.unidade === input.unidade);

    const porUnidade = Array.from(agrupar(itens, (i) => i.unidade).entries())
      .map(([unidade, lista]) => ({ unidade, ...indicadores(lista) }))
      .sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR"));

    const porEixo = Array.from(agrupar(itens, (i) => i.eixo).entries())
      .map(([eixo, lista]) => ({ eixo, ...indicadores(lista) }))
      .sort((a, b) => b.eixosComMeta - a.eixosComMeta || a.eixo.localeCompare(b.eixo, "pt-BR"));

    const matriz = Array.from(agrupar(itens, (i) => `${i.unidade}|||${i.eixo}`).entries()).map(([k, lista]) => {
      const [unidade, eixo] = k.split("|||");
      const ind = indicadores(lista);
      return {
        unidade,
        eixo,
        essenciais: lista.filter((i) => i.relacao === "ESSENCIAL").length,
        transversais: lista.filter((i) => i.relacao === "TRANSVERSAL").length,
        naoEssenciais: lista.filter((i) => i.relacao === "NAO_ESSENCIAL").length,
        media2025: ind.media2025,
        media2026: ind.media2026,
        evolucaoPp: ind.indiceEvolucaoPp,
        lacunas: ind.status.LACUNA_SEM_PLANO + ind.status.ACAO_SEM_EFEITO + ind.status.EM_DESENVOLVIMENTO,
        semPlano: ind.status.LACUNA_SEM_PLANO,
        status: ind.status,
      };
    });

    return {
      meta: META_PROFICIENCIA,
      geral: indicadores(itens),
      porUnidade,
      porEixo,
      matriz,
    };
  }),

  // Drill-down: empregados de um recorte com o status de cada eixo.
  detalhe: adminProcedure
    .input(
      z.object({
        cicloId: z.number().int().positive().optional(),
        unidade: z.string().trim().min(1).max(255).optional(),
        eixo: z.string().trim().min(1).max(255).optional(),
        status: z.enum(STATUS_EVOLUCAO).optional(),
        colaboradorId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      let itens = montarAvaliacao(await carregarBase(db, input.cicloId));
      if (input.unidade) itens = itens.filter((i) => i.unidade === input.unidade);
      if (input.eixo) itens = itens.filter((i) => normalizar(i.eixo) === normalizar(input.eixo!));
      if (input.status) itens = itens.filter((i) => i.status === input.status);
      if (input.colaboradorId) itens = itens.filter((i) => i.colaboradorId === input.colaboradorId);
      return itens.sort(
        (a, b) =>
          a.unidade.localeCompare(b.unidade, "pt-BR") ||
          a.colaboradorNome.localeCompare(b.colaboradorNome, "pt-BR") ||
          a.eixo.localeCompare(b.eixo, "pt-BR"),
      );
    }),

  // Checagem antes de publicar o Resultado Executivo: lista o que ainda falta.
  prontidaoPublicacao: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const base = await carregarBase(db);
    const itens = montarAvaliacao(base);

    const ativosSemMatriz = base.colaboradores
      .filter((c) => c.role !== "admin" && !c.matrizId)
      .map((c) => ({ colaboradorId: Number(c.id), nome: String(c.name), unidade: String(c.unidade) }));

    const matrizesPendentes = base.colaboradores
      .filter((c) => c.matrizId && c.matrizStatus === "PENDENTE_HISTORICO")
      .map((c) => ({
        colaboradorId: Number(c.id),
        nome: String(c.name),
        unidade: String(c.unidade),
        observacao: c.matrizObservacao ? String(c.matrizObservacao) : null,
      }));

    const ativos = new Set(base.colaboradores.map((c) => Number(c.id)));
    const eixosPendentes = base.eixosMatriz
      .filter((e) => ativos.has(Number(e.colaboradorId)) && (e.statusClassificacao === "PENDENTE" || !e.relacao))
      .length;

    const semResultado2026 = Array.from(
      agrupar(itens.filter((i) => i.status === "SEM_RESULTADO_2026"), (i) => `${i.colaboradorId}`).values(),
    ).map((lista) => ({
      colaboradorId: lista[0].colaboradorId,
      nome: lista[0].colaboradorNome,
      unidade: lista[0].unidade,
      eixos: lista.map((i) => i.eixo),
    }));

    // Sem linha de base 2025 só é aceito com o alerta de "confirmar avaliação no ciclo anterior".
    const alertaPorColab = new Map(
      base.colaboradores.map((c) => [Number(c.id), normalizar(String(c.matrizObservacao ?? "")).includes("confirmar")]),
    );
    const semBase2025SemAlerta = Array.from(
      agrupar(
        itens.filter((i) => comMeta(i.relacao) && i.base2025 === null && !alertaPorColab.get(i.colaboradorId)),
        (i) => `${i.colaboradorId}`,
      ).values(),
    ).map((lista) => ({ colaboradorId: lista[0].colaboradorId, nome: lista[0].colaboradorNome, unidade: lista[0].unidade }));

    const pronto =
      ativosSemMatriz.length === 0 &&
      matrizesPendentes.length === 0 &&
      eixosPendentes === 0 &&
      semResultado2026.length === 0 &&
      semBase2025SemAlerta.length === 0;

    return {
      pronto,
      ativosSemMatriz,
      matrizesPendentes,
      eixosPendentes,
      semResultado2026,
      semBase2025SemAlerta,
    };
  }),
});

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { ensureAcoesLastroSchema } from "../services/acoesLastro";
import { ensureHomologacaoTables } from "../services/homologacaoProvas";
import { ensureTechnicalMatrixTables } from "../services/technicalMatrixSchema";
import {
  agrupar,
  carregarBase,
  indicadores,
  legendas,
  montarAvaliacao,
  normalizar,
  porDimensao,
} from "../services/resultadoExecutivo";
import {
  DIMENSOES,
  META_PROFICIENCIA,
  MOTIVOS,
  STATUS_EVOLUCAO,
  comMeta,
  type Dimensao,
} from "../services/resultadoExecutivoRegras";

// Resultado Executivo — Evolução do Ciclo.
// Somente leitura e somente administradores enquanto o Resultado Executivo
// não for publicado. Para cada empregado cruza, separado por dimensão:
//   TÉCNICO        matriz (Essencial/Transversal/Não essencial), linha de base
//                  2025 (percentual_anterior) e prova de certificação 2026;
//   COMPORTAMENTAL competências da Avaliação de Desempenho (AD anterior × AD
//                  mais recente, escala 0–3 em % da escala). Atuação Colaborativa
//                  é transversal (todos); Liderança Transformadora e Gestão de
//                  Pessoas são esperadas só para gestores (perfil líder);
// e as ações/solicitações do PDI ligadas a cada eixo/competência, com o motivo
// de cada lacuna. Montagem em server/services/resultadoExecutivo.ts e regras
// puras em server/services/resultadoExecutivoRegras.ts.

export { META_PROFICIENCIA, STATUS_EVOLUCAO };

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await ensureTechnicalMatrixTables();
  await ensureHomologacaoTables(db);
  await ensureAcoesLastroSchema();
  return db;
}

const filtroInput = z
  .object({
    cicloId: z.number().int().positive().optional(),
    unidade: z.string().trim().min(1).max(255).optional(),
  })
  .optional();

export const evolucaoCicloRouter = router({
  // Painel geral: SEBRAE inteiro, por unidade, por eixo/competência e a matriz
  // unidade × eixo — tudo separado em Técnico e Comportamental.
  visaoGeral: adminProcedure.input(filtroInput).query(async ({ input }) => {
    const db = await dbObrigatorio();
    const { itens: todos, periodos } = montarAvaliacao(await carregarBase(db, input?.cicloId));
    const itens = input?.unidade ? todos.filter((i) => i.unidade === input.unidade) : todos;

    const porUnidade = Array.from(agrupar(itens, (i) => i.unidade).entries())
      .map(([unidade, lista]) => ({ unidade, ...porDimensao(lista) }))
      .sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR"));

    const porEixo = Array.from(agrupar(itens, (i) => `${i.dimensao}|||${i.eixo}`).entries())
      .map(([k, lista]) => {
        const [dimensao, eixo] = k.split("|||") as [Dimensao, string];
        return { dimensao, eixo, transversal: lista.some((i) => i.relacao === "TRANSVERSAL"), ...indicadores(lista) };
      })
      .sort(
        (a, b) =>
          a.dimensao.localeCompare(b.dimensao) ||
          b.itensComMeta - a.itensComMeta ||
          a.eixo.localeCompare(b.eixo, "pt-BR"),
      );

    const matriz = Array.from(agrupar(itens, (i) => `${i.dimensao}|||${i.unidade}|||${i.eixo}`).entries()).map(([k, lista]) => {
      const [dimensao, unidade, eixo] = k.split("|||") as [Dimensao, string, string];
      const ind = indicadores(lista);
      return {
        dimensao,
        unidade,
        eixo,
        essenciais: lista.filter((i) => i.relacao === "ESSENCIAL").length,
        transversais: lista.filter((i) => i.relacao === "TRANSVERSAL").length,
        naoEssenciais: lista.filter((i) => i.relacao === "NAO_ESSENCIAL").length,
        mediaBase: ind.mediaBase,
        mediaAtual: ind.mediaAtual,
        evolucaoPp: ind.indiceEvolucaoPp,
        lacunas:
          ind.status.LACUNA_SEM_PLANO +
          ind.status.ACAO_SEM_EFEITO +
          ind.status.EM_DESENVOLVIMENTO +
          ind.status.AGUARDANDO_NOVA_MEDICAO,
        semPlano: ind.status.LACUNA_SEM_PLANO,
        status: ind.status,
        motivos: ind.motivos,
      };
    });

    return {
      meta: META_PROFICIENCIA,
      periodos,
      geral: porDimensao(itens),
      porUnidade,
      porEixo,
      matriz,
      legendas: legendas(periodos),
    };
  }),

  // Drill-down: empregados de um recorte com status e motivo de cada eixo/competência.
  detalhe: adminProcedure
    .input(
      z.object({
        cicloId: z.number().int().positive().optional(),
        dimensao: z.enum(DIMENSOES).optional(),
        unidade: z.string().trim().min(1).max(255).optional(),
        eixo: z.string().trim().min(1).max(255).optional(),
        status: z.enum(STATUS_EVOLUCAO).optional(),
        motivo: z.enum(MOTIVOS).optional(),
        colaboradorId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      let { itens } = montarAvaliacao(await carregarBase(db, input.cicloId));
      if (input.dimensao) itens = itens.filter((i) => i.dimensao === input.dimensao);
      if (input.unidade) itens = itens.filter((i) => i.unidade === input.unidade);
      if (input.eixo) itens = itens.filter((i) => normalizar(i.eixo) === normalizar(input.eixo!));
      if (input.status) itens = itens.filter((i) => i.status === input.status);
      if (input.motivo) itens = itens.filter((i) => i.motivo === input.motivo);
      if (input.colaboradorId) itens = itens.filter((i) => i.colaboradorId === input.colaboradorId);
      return itens.sort(
        (a, b) =>
          a.unidade.localeCompare(b.unidade, "pt-BR") ||
          a.colaboradorNome.localeCompare(b.colaboradorNome, "pt-BR") ||
          a.dimensao.localeCompare(b.dimensao) ||
          a.eixo.localeCompare(b.eixo, "pt-BR"),
      );
    }),

  // Checagem antes de publicar o Resultado Executivo: lista o que ainda falta.
  prontidaoPublicacao: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const base = await carregarBase(db);
    const { itens } = montarAvaliacao(base);
    const tecnicos = itens.filter((i) => i.dimensao === "TECNICO");

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
      agrupar(tecnicos.filter((i) => i.status === "SEM_RESULTADO_ATUAL"), (i) => `${i.colaboradorId}`).values(),
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
        tecnicos.filter(
          (i) => comMeta(i.relacao) && i.base === null && i.status !== "SEM_MEDICAO" && !alertaPorColab.get(i.colaboradorId),
        ),
        (i) => `${i.colaboradorId}`,
      ).values(),
    ).map((lista) => ({ colaboradorId: lista[0].colaboradorId, nome: lista[0].colaboradorNome, unidade: lista[0].unidade }));

    // Informativo (não bloqueia): quem não tem a Avaliação de Desempenho mais recente.
    const semAvaliacaoDesempenhoAtual = Array.from(
      agrupar(
        itens.filter((i) => i.dimensao === "COMPORTAMENTAL"),
        (i) => `${i.colaboradorId}`,
      ).values(),
    )
      .filter((lista) => lista.every((i) => i.atual === null))
      .map((lista) => ({ colaboradorId: lista[0].colaboradorId, nome: lista[0].colaboradorNome, unidade: lista[0].unidade }));

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
      semAvaliacaoDesempenhoAtual,
    };
  }),
});

import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import {
  ensureHomologacaoTables,
  gerarHashSnapshot,
  marcarPendenciaHomologacao,
  obterHomologacaoAtual,
} from "../services/homologacaoProvas";

type QuestaoImportada = {
  id: string;
  enunciado: string;
  opcoes: Array<{ letra: string; texto: string; naoSei?: boolean }>;
  gabarito: string;
  eixos: Array<{ nome: string }>;
  macroarea?: string | null;
  microarea?: string | null;
  tagFonte?: string | null;
};

type ProvaSnapshot = {
  id: number;
  codigo: string;
  nome: string;
  unidade: string;
  ano: number;
  totalQuestoes: number;
  questoes: QuestaoImportada[];
};

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function parseJson<T>(valor: unknown): T {
  if (valor && typeof valor === "object") return valor as T;
  return JSON.parse(String(valor ?? "null")) as T;
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await ensureHomologacaoTables(db);
  return db;
}

async function obterProvaAtual(db: any, provaId: number) {
  const result = await db.execute(sql`
    SELECT id, codigo, nome, unidade, ano, total_questoes AS totalQuestoes,
           questoes_json AS questoesJson, status
      FROM provas_importadas
     WHERE id = ${provaId}
     LIMIT 1
  `);
  const prova = rowsOf<any>(result)[0];
  if (!prova) throw new TRPCError({ code: "NOT_FOUND", message: "Prova não encontrada." });
  if (String(prova.status) !== "VALIDADA") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A prova precisa estar VALIDADA para entrar em teste de homologação." });
  }

  let questoes: QuestaoImportada[];
  try {
    questoes = parseJson<QuestaoImportada[]>(prova.questoesJson);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível ler as questões desta prova." });
  }

  const snapshot: ProvaSnapshot = {
    id: Number(prova.id),
    codigo: String(prova.codigo),
    nome: String(prova.nome),
    unidade: String(prova.unidade),
    ano: Number(prova.ano),
    totalQuestoes: Number(prova.totalQuestoes),
    questoes,
  };
  return snapshot;
}

async function registrarHistorico(db: any, params: {
  provaId: number;
  acao: string;
  usuarioId: number;
  resumo: unknown;
  antes?: unknown;
  depois?: unknown;
}) {
  await db.execute(sql`
    INSERT INTO provas_importadas_historico
      (prova_id, acao, usuario_id, resumo_json, antes_json, depois_json)
    VALUES
      (${params.provaId}, ${params.acao}, ${params.usuarioId},
       ${JSON.stringify(params.resumo)},
       ${params.antes === undefined ? null : JSON.stringify(params.antes)},
       ${params.depois === undefined ? null : JSON.stringify(params.depois)})
  `);
}

async function criarAplicacaoTeste(db: any, provaId: number, usuarioId: number) {
  const prova = await obterProvaAtual(db, provaId);
  let homologacao = await obterHomologacaoAtual(db, provaId);

  const snapshotJson = JSON.stringify(prova);
  const snapshotHash = gerarHashSnapshot(prova);

  if (
    homologacao?.aplicacaoTesteId &&
    ["EM_TESTE", "TESTADA", "HOMOLOGADA"].includes(String(homologacao.status)) &&
    homologacao.snapshotHash &&
    String(homologacao.snapshotHash) === snapshotHash
  ) {
    return {
      prova,
      homologacao,
      aplicacaoId: Number(homologacao.aplicacaoTesteId),
      criada: false,
    };
  }

  if (
    homologacao?.aplicacaoTesteId &&
    ["EM_TESTE", "TESTADA", "HOMOLOGADA"].includes(String(homologacao.status)) &&
    (!homologacao.snapshotHash || String(homologacao.snapshotHash) !== snapshotHash)
  ) {
    await db.execute(sql`
      UPDATE provas_importadas_homologacao
         SET status = 'SUBSTITUIDA_POR_NOVO_TESTE',
             homologada_em = NULL,
             homologada_por = NULL,
             updated_at = NOW()
       WHERE id = ${Number(homologacao.id)}
    `);
    await registrarHistorico(db, {
      provaId,
      acao: "TESTE_DESATUALIZADO_SUBSTITUIDO",
      usuarioId,
      resumo: [
        { campo: "Aplicação de teste anterior", antes: Number(homologacao.aplicacaoTesteId), depois: "Substituída" },
        { campo: "Motivo", antes: null, depois: "A prova validada foi alterada após a criação do snapshot do teste." },
      ],
    });
    await db.execute(sql`
      INSERT INTO provas_importadas_homologacao (prova_id, status)
      VALUES (${provaId}, 'PENDENTE')
    `);
    homologacao = await obterHomologacaoAtual(db, provaId);
  }

  if (!homologacao || String(homologacao.status) !== "PENDENTE") {
    homologacao = await marcarPendenciaHomologacao(db, provaId);
  }

  const criado = await db.transaction(async (tx: any) => {
    const result = await tx.execute(sql`
      INSERT INTO aplicacoes_proficiencia
        (prova_id, prova_snapshot_json, titulo, agendada_para, status,
         liberada_em, liberada_por, created_by)
      VALUES
        (${provaId}, ${snapshotJson}, ${`TESTE ADMIN — ${prova.nome}`}, NOW(), 'LIBERADA',
         NOW(), ${usuarioId}, ${usuarioId})
    `);
    const info: any = Array.isArray(result) ? result[0] : result;
    const aplicacaoId = Number(info?.insertId ?? 0);
    if (!aplicacaoId) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a aplicação de teste." });
    }

    await tx.execute(sql`
      INSERT INTO aplicacoes_proficiencia_participantes
        (aplicacao_id, colaborador_id, situacao)
      VALUES
        (${aplicacaoId}, ${usuarioId}, 'SELECIONADO')
    `);

    await tx.execute(sql`
      UPDATE provas_importadas_homologacao
         SET aplicacao_teste_id = ${aplicacaoId},
             testado_por = ${usuarioId},
             status = 'EM_TESTE',
             snapshot_hash = ${snapshotHash},
             snapshot_json = ${snapshotJson},
             testada_em = NULL,
             homologada_em = NULL,
             homologada_por = NULL,
             updated_at = NOW()
       WHERE id = ${Number(homologacao.id)}
    `);

    await registrarHistorico(tx, {
      provaId,
      acao: "TESTE_ADMIN_CRIADO",
      usuarioId,
      resumo: [
        { campo: "Aplicação de teste", antes: null, depois: aplicacaoId },
        { campo: "Status de homologação", antes: "PENDENTE", depois: "EM_TESTE" },
      ],
      antes: { homologacao: "PENDENTE" },
      depois: { homologacao: "EM_TESTE", aplicacaoId, snapshotHash },
    });

    return aplicacaoId;
  });

  homologacao = await obterHomologacaoAtual(db, provaId);
  return { prova, homologacao, aplicacaoId: criado, criada: true };
}

export const homologacaoProvasRouter = router({
  statusTeste: adminProcedure
    .input(z.object({ provaId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const prova = await obterProvaAtual(db, input.provaId);
      const homologacao = await obterHomologacaoAtual(db, input.provaId);
      return {
        prova: { id: prova.id, codigo: prova.codigo, nome: prova.nome, unidade: prova.unidade },
        homologacao,
        url: homologacao?.aplicacaoTesteId
          ? `/avaliacoes/proficiencia/${Number(homologacao.aplicacaoTesteId)}`
          : null,
      };
    }),

  criarOuObterTeste: adminProcedure
    .input(z.object({ provaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const teste = await criarAplicacaoTeste(db, input.provaId, ctx.user.id);
      return {
        aplicacaoId: teste.aplicacaoId,
        criada: teste.criada,
        status: teste.homologacao?.status ?? "EM_TESTE",
        url: `/avaliacoes/proficiencia/${teste.aplicacaoId}`,
      };
    }),

  refazerTeste: adminProcedure
    .input(z.object({ provaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const atual = await obterHomologacaoAtual(db, input.provaId);
      if (atual) {
        await db.execute(sql`
          UPDATE provas_importadas_homologacao
             SET status = 'SUBSTITUIDA_POR_NOVO_TESTE',
                 homologada_em = NULL,
                 homologada_por = NULL,
                 updated_at = NOW()
           WHERE id = ${Number(atual.id)}
        `);
      }
      await db.execute(sql`
        INSERT INTO provas_importadas_homologacao (prova_id, status)
        VALUES (${input.provaId}, 'PENDENTE')
      `);
      await registrarHistorico(db, {
        provaId: input.provaId,
        acao: "RETESTE_ADMIN",
        usuarioId: ctx.user.id,
        resumo: [{ campo: "Novo teste", antes: atual?.aplicacaoTesteId ?? null, depois: "Nova aplicação de teste" }],
      });
      const teste = await criarAplicacaoTeste(db, input.provaId, ctx.user.id);
      return {
        aplicacaoId: teste.aplicacaoId,
        criada: true,
        status: teste.homologacao?.status ?? "EM_TESTE",
        url: `/avaliacoes/proficiencia/${teste.aplicacaoId}`,
      };
    }),

  resultadoTeste: adminProcedure
    .input(z.object({ provaId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const homologacao = await obterHomologacaoAtual(db, input.provaId);
      if (!homologacao?.aplicacaoTesteId) return null;

      const resultadoResult = await db.execute(sql`
        SELECT rp.id, rp.percentual_geral AS percentualGeral,
               rp.resultado_json AS resultadoJson, rp.calculado_em AS calculadoEm,
               a.titulo AS aplicacaoTitulo, u.name AS testadorNome, u.email AS testadorEmail
          FROM resultados_proficiencia rp
          JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
          LEFT JOIN users u ON u.id = rp.colaborador_id
         WHERE rp.aplicacao_id = ${Number(homologacao.aplicacaoTesteId)}
         ORDER BY rp.id DESC
         LIMIT 1
      `);
      const resultadoLinha = rowsOf<any>(resultadoResult)[0] ?? null;

      const monitoramentoResult = await db.execute(sql`
        SELECT t.id AS tentativaId, t.status AS tentativaStatus,
               t.iniciada_em AS iniciadaEm, t.ultima_atividade_em AS ultimaAtividadeEm,
               t.finalizada_em AS finalizadaEm, COUNT(r.id) AS respostasSalvas
          FROM aplicacoes_proficiencia_participantes ap
          LEFT JOIN tentativas_proficiencia t
            ON t.aplicacao_id = ap.aplicacao_id AND t.colaborador_id = ap.colaborador_id
          LEFT JOIN respostas_proficiencia r ON r.tentativa_id = t.id
         WHERE ap.aplicacao_id = ${Number(homologacao.aplicacaoTesteId)}
         GROUP BY t.id, t.status, t.iniciada_em, t.ultima_atividade_em, t.finalizada_em
         LIMIT 1
      `);
      const monitoramento = rowsOf<any>(monitoramentoResult)[0] ?? null;

      let resultado: any = null;
      if (resultadoLinha?.resultadoJson) {
        try {
          resultado = parseJson<any>(resultadoLinha.resultadoJson);
        } catch {
          resultado = null;
        }
      }

      return {
        modoTeste: true,
        linhaBaseDisponivel: false,
        homologacao,
        aplicacaoId: Number(homologacao.aplicacaoTesteId),
        url: `/avaliacoes/proficiencia/${Number(homologacao.aplicacaoTesteId)}`,
        testadorNome: resultadoLinha?.testadorNome ?? null,
        testadorEmail: resultadoLinha?.testadorEmail ?? null,
        calculadoEm: resultadoLinha?.calculadoEm ?? null,
        resultado,
        monitoramento,
      };
    }),

  homologar: adminProcedure
    .input(z.object({ provaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const prova = await obterProvaAtual(db, input.provaId);
      const homologacao = await obterHomologacaoAtual(db, input.provaId);

      if (!homologacao || String(homologacao.status) !== "TESTADA" || !homologacao.aplicacaoTesteId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Conclua o teste da prova e confira o resultado antes de homologar." });
      }

      const resultadoResult = await db.execute(sql`
        SELECT id
          FROM resultados_proficiencia
         WHERE aplicacao_id = ${Number(homologacao.aplicacaoTesteId)}
         LIMIT 1
      `);
      if (!rowsOf<any>(resultadoResult).length) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "O teste ainda não possui resultado calculado." });
      }

      const hashAtual = gerarHashSnapshot(prova);
      if (!homologacao.snapshotHash || String(homologacao.snapshotHash) !== hashAtual) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "A prova foi alterada depois do teste. Faça um novo teste antes de homologar.",
        });
      }

      await db.transaction(async (tx: any) => {
        await tx.execute(sql`
          UPDATE provas_importadas_homologacao
             SET status = 'HOMOLOGADA',
                 homologada_em = NOW(),
                 homologada_por = ${ctx.user.id},
                 updated_at = NOW()
           WHERE id = ${Number(homologacao.id)}
             AND status = 'TESTADA'
        `);
        await registrarHistorico(tx, {
          provaId: input.provaId,
          acao: "HOMOLOGACAO",
          usuarioId: ctx.user.id,
          resumo: [
            { campo: "Status de homologação", antes: "TESTADA", depois: "HOMOLOGADA" },
            { campo: "Aplicação de teste", antes: null, depois: Number(homologacao.aplicacaoTesteId) },
          ],
          antes: { status: "TESTADA" },
          depois: { status: "HOMOLOGADA", snapshotHash: hashAtual },
        });
      });

      return {
        homologada: true,
        status: "HOMOLOGADA" as const,
        aplicacaoId: Number(homologacao.aplicacaoTesteId),
      };
    }),
});

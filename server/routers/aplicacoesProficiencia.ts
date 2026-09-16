import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, assessmentProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

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

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function normalizar(valor: string) {
  return valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

async function obterProva(db: any, provaId: number, exigirValidada = true) {
  const result = await db.execute(sql`
    SELECT id, codigo, nome, unidade, ano, total_questoes AS totalQuestoes,
           questoes_json AS questoesJson, status
      FROM provas_importadas
     WHERE id = ${provaId}
     LIMIT 1
  `);
  const prova = rowsOf<any>(result)[0];
  if (!prova) throw new TRPCError({ code: "NOT_FOUND", message: "Prova não encontrada." });
  if (exigirValidada && prova.status !== "VALIDADA") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Somente provas VALIDADA podem ser usadas em uma aplicação." });
  }
  let questoes: QuestaoImportada[] = [];
  try {
    questoes = JSON.parse(String(prova.questoesJson ?? "[]"));
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível ler as questões desta prova." });
  }
  return { ...prova, questoes };
}

async function obterAplicacao(db: any, aplicacaoId: number) {
  const result = await db.execute(sql`
    SELECT a.id, a.prova_id AS provaId, a.titulo, a.agendada_para AS agendadaPara,
           a.status, a.liberada_em AS liberadaEm, a.encerrada_em AS encerradaEm,
           a.calculada_em AS calculadaEm, p.codigo AS provaCodigo, p.nome AS provaNome,
           p.unidade AS provaUnidade, p.ano AS provaAno, p.total_questoes AS totalQuestoes
      FROM aplicacoes_proficiencia a
      JOIN provas_importadas p ON p.id = a.prova_id
     WHERE a.id = ${aplicacaoId}
     LIMIT 1
  `);
  const aplicacao = rowsOf<any>(result)[0];
  if (!aplicacao) throw new TRPCError({ code: "NOT_FOUND", message: "Aplicação não encontrada." });
  return aplicacao;
}

async function obterAplicacaoDoParticipante(db: any, aplicacaoId: number, colaboradorId: number) {
  const result = await db.execute(sql`
    SELECT a.id, a.prova_id AS provaId, a.titulo, a.agendada_para AS agendadaPara,
           a.status, a.liberada_em AS liberadaEm,
           ap.situacao,
           t.id AS tentativaId, t.status AS tentativaStatus,
           t.iniciada_em AS iniciadaEm, t.finalizada_em AS finalizadaEm
      FROM aplicacoes_proficiencia a
      JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id = a.id
      LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = a.id AND t.colaborador_id = ap.colaborador_id
     WHERE a.id = ${aplicacaoId}
       AND ap.colaborador_id = ${colaboradorId}
     LIMIT 1
  `);
  const item = rowsOf<any>(result)[0];
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Esta aplicação não está atribuída a este participante." });
  return item;
}

async function obterRelacoesEixos(db: any, colaboradorId: number) {
  const result = await db.execute(sql`
    SELECT e.eixo_nome AS eixoNome, e.relacao, e.percentual_anterior AS percentualAnterior
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
     WHERE m.colaborador_id = ${colaboradorId}
       AND m.status IN ('VALIDADA_PROVISORIA','VALIDADA_DEFINITIVA')
  `);
  const mapa = new Map<string, { relacao: string; percentualAnterior: number | null }>();
  for (const item of rowsOf<any>(result)) {
    mapa.set(normalizar(String(item.eixoNome ?? "")), {
      relacao: String(item.relacao ?? ""),
      percentualAnterior: item.percentualAnterior === null ? null : Number(item.percentualAnterior),
    });
  }
  return mapa;
}

function calcularResultado(
  questoes: QuestaoImportada[],
  respostas: Array<{ questaoChave: string; resposta: string }>,
  relacoes: Map<string, { relacao: string; percentualAnterior: number | null }>,
) {
  const porQuestao = new Map(respostas.map(item => [String(item.questaoChave), String(item.resposta).toUpperCase()]));
  const eixoMap = new Map<string, {
    eixo: string;
    totalQuestoes: number;
    respondidas: number;
    acertos: number;
    naoSei: number;
  }>();

  let totalAcertos = 0;
  let totalRespondidas = 0;

  for (const questao of questoes) {
    const resposta = porQuestao.get(String(questao.id));
    const gabarito = String(questao.gabarito ?? "").toUpperCase();
    const acertou = Boolean(resposta && resposta === gabarito);
    const opcaoRespondida = questao.opcoes.find(opcao => String(opcao.letra).toUpperCase() === resposta);
    const naoSei = Boolean(opcaoRespondida?.naoSei);
    if (resposta) totalRespondidas += 1;
    if (acertou) totalAcertos += 1;

    for (const eixoQuestao of questao.eixos ?? []) {
      const nome = String(eixoQuestao.nome ?? "").trim();
      if (!nome) continue;
      const chave = normalizar(nome);
      const item = eixoMap.get(chave) ?? { eixo: nome, totalQuestoes: 0, respondidas: 0, acertos: 0, naoSei: 0 };
      item.totalQuestoes += 1;
      if (resposta) item.respondidas += 1;
      if (acertou) item.acertos += 1;
      if (naoSei) item.naoSei += 1;
      eixoMap.set(chave, item);
    }
  }

  const porEixo = Array.from(eixoMap.entries()).map(([chave, item]) => {
    const percentualAtual = item.totalQuestoes ? arredondar((item.acertos / item.totalQuestoes) * 100) : 0;
    const relacao = relacoes.get(chave) ?? { relacao: null, percentualAnterior: null };
    const linhaBase = relacao.percentualAnterior;
    return {
      ...item,
      erros: Math.max(0, item.respondidas - item.acertos - item.naoSei),
      percentualAtual,
      percentualConhecimento: percentualAtual,
      relacao: relacao.relacao,
      linhaBase,
      evolucaoPp: linhaBase === null ? null : arredondar(percentualAtual - linhaBase),
      comparavel: linhaBase !== null,
    };
  });

  return {
    totalQuestoes: questoes.length,
    totalRespondidas,
    totalNaoRespondidas: Math.max(0, questoes.length - totalRespondidas),
    totalAcertos,
    percentualGeral: questoes.length ? arredondar((totalAcertos / questoes.length) * 100) : 0,
    porEixo,
  };
}

export const aplicacoesProficienciaRouter = router({
  listarProvasValidas: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT id, codigo, nome, unidade, ano, total_questoes AS totalQuestoes
        FROM provas_importadas
       WHERE status = 'VALIDADA'
       ORDER BY ano DESC, unidade, nome
    `);
    return rowsOf<any>(result);
  }),

  listarParticipantesDisponiveis: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.cargo, u.role,
             d.nome AS departamentoNome
        FROM users u
        LEFT JOIN departamentos d ON d.id = u.departamentoId
       WHERE u.status = 'ativo'
         AND u.role IN ('colaborador','lider','gerente')
       ORDER BY d.nome, u.name
    `);
    return rowsOf<any>(result);
  }),

  criar: adminProcedure
    .input(z.object({
      provaId: z.number().int().positive(),
      titulo: z.string().trim().min(3).max(255),
      agendadaPara: z.string().min(10).max(40),
      colaboradorIds: z.array(z.number().int().positive()).min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      await obterProva(db, input.provaId, true);
      const ids = Array.from(new Set(input.colaboradorIds));
      const usuariosResult = await db.execute(sql`
        SELECT id FROM users
         WHERE status = 'ativo'
           AND role IN ('colaborador','lider','gerente')
           AND id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
      `);
      const usuarios = rowsOf<{ id: number }>(usuariosResult);
      if (usuarios.length !== ids.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Um ou mais participantes selecionados não estão ativos ou não podem receber a prova." });
      }

      const data = new Date(input.agendadaPara);
      if (Number.isNaN(data.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Data e horário inválidos." });

      return await db.transaction(async (tx: any) => {
        const result = await tx.execute(sql`
          INSERT INTO aplicacoes_proficiencia (prova_id, titulo, agendada_para, status, created_by)
          VALUES (${input.provaId}, ${input.titulo}, ${data}, 'AGENDADA', ${ctx.user.id})
        `);
        const info: any = Array.isArray(result) ? result[0] : result;
        const aplicacaoId = Number(info?.insertId ?? 0);
        if (!aplicacaoId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a aplicação." });
        for (const colaboradorId of ids) {
          await tx.execute(sql`
            INSERT INTO aplicacoes_proficiencia_participantes (aplicacao_id, colaborador_id, situacao)
            VALUES (${aplicacaoId}, ${colaboradorId}, 'SELECIONADO')
          `);
        }
        return { id: aplicacaoId, status: "AGENDADA", participantes: ids.length };
      });
    }),

  listar: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT a.id, a.titulo, a.agendada_para AS agendadaPara, a.status,
             a.liberada_em AS liberadaEm, a.calculada_em AS calculadaEm,
             p.id AS provaId, p.codigo AS provaCodigo, p.nome AS provaNome, p.unidade AS provaUnidade,
             COUNT(ap.id) AS totalParticipantes,
             SUM(CASE WHEN t.id IS NULL THEN 1 ELSE 0 END) AS naoIniciaram,
             SUM(CASE WHEN t.status IN ('EM_ANDAMENTO','BLOQUEADA','LIBERADA_CONTINUIDADE') THEN 1 ELSE 0 END) AS emAndamento,
             SUM(CASE WHEN t.status IN ('FINALIZADA','FINALIZADA_TEMPO') THEN 1 ELSE 0 END) AS finalizados
        FROM aplicacoes_proficiencia a
        JOIN provas_importadas p ON p.id = a.prova_id
        LEFT JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id = a.id
        LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = a.id AND t.colaborador_id = ap.colaborador_id
       GROUP BY a.id, a.titulo, a.agendada_para, a.status, a.liberada_em, a.calculada_em,
                p.id, p.codigo, p.nome, p.unidade
       ORDER BY a.agendada_para DESC, a.id DESC
    `);
    return rowsOf<any>(result);
  }),

  detalhe: adminProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      const participantesResult = await db.execute(sql`
        SELECT ap.colaborador_id AS colaboradorId,
               u.name AS colaboradorNome, u.email AS colaboradorEmail,
               d.nome AS departamentoNome,
               t.id AS tentativaId, t.status AS tentativaStatus,
               t.iniciada_em AS iniciadaEm, t.finalizada_em AS finalizadaEm,
               COUNT(r.id) AS respostasSalvas,
               CASE
                 WHEN p.total_questoes > 0 THEN ROUND((COUNT(r.id) / p.total_questoes) * 100, 1)
                 ELSE 0
               END AS percentualRealizacao,
               CASE
                 WHEN t.id IS NULL THEN 'NAO_INICIOU'
                 WHEN t.status IN ('FINALIZADA','FINALIZADA_TEMPO') THEN 'FINALIZOU'
                 ELSE 'EM_ANDAMENTO'
               END AS situacaoRealizacao,
               rp.percentual_geral AS percentualResultado
          FROM aplicacoes_proficiencia_participantes ap
          JOIN users u ON u.id = ap.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
          JOIN aplicacoes_proficiencia a ON a.id = ap.aplicacao_id
          JOIN provas_importadas p ON p.id = a.prova_id
          LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = ap.aplicacao_id AND t.colaborador_id = ap.colaborador_id
          LEFT JOIN respostas_proficiencia r ON r.tentativa_id = t.id
          LEFT JOIN resultados_proficiencia rp ON rp.aplicacao_id = ap.aplicacao_id AND rp.colaborador_id = ap.colaborador_id
         WHERE ap.aplicacao_id = ${input.aplicacaoId}
         GROUP BY ap.colaborador_id, u.name, u.email, d.nome, t.id, t.status, t.iniciada_em,
                  t.finalizada_em, p.total_questoes, rp.percentual_geral
         ORDER BY u.name
      `);
      return { aplicacao, participantes: rowsOf<any>(participantesResult) };
    }),

  liberar: adminProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      if (aplicacao.status !== "AGENDADA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Somente aplicações AGENDADA podem ser liberadas." });
      }
      if (Date.now() < new Date(aplicacao.agendadaPara).getTime()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A aplicação só pode ser liberada a partir da data e horário agendados." });
      }
      await db.execute(sql`
        UPDATE aplicacoes_proficiencia
           SET status = 'LIBERADA', liberada_em = NOW(), liberada_por = ${ctx.user.id}
         WHERE id = ${input.aplicacaoId} AND status = 'AGENDADA'
      `);
      return { liberada: true, status: "LIBERADA" };
    }),

  monitoramento: adminProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      const participantesResult = await db.execute(sql`
        SELECT ap.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
               d.nome AS departamentoNome, t.id AS tentativaId, t.status AS tentativaStatus,
               t.iniciada_em AS iniciadaEm, t.ultima_atividade_em AS ultimaAtividadeEm,
               t.finalizada_em AS finalizadaEm,
               COUNT(r.id) AS respostasSalvas,
               CASE WHEN p.total_questoes > 0 THEN ROUND((COUNT(r.id) / p.total_questoes) * 100, 1) ELSE 0 END AS percentualRealizacao,
               CASE
                 WHEN t.id IS NULL THEN 'NAO_INICIOU'
                 WHEN t.status IN ('FINALIZADA','FINALIZADA_TEMPO') THEN 'FINALIZOU'
                 ELSE 'EM_ANDAMENTO'
               END AS situacao
          FROM aplicacoes_proficiencia_participantes ap
          JOIN users u ON u.id = ap.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
          JOIN aplicacoes_proficiencia a ON a.id = ap.aplicacao_id
          JOIN provas_importadas p ON p.id = a.prova_id
          LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = ap.aplicacao_id AND t.colaborador_id = ap.colaborador_id
          LEFT JOIN respostas_proficiencia r ON r.tentativa_id = t.id
         WHERE ap.aplicacao_id = ${input.aplicacaoId}
         GROUP BY ap.colaborador_id, u.name, d.nome, t.id, t.status, t.iniciada_em,
                  t.ultima_atividade_em, t.finalizada_em, p.total_questoes
         ORDER BY u.name
      `);
      const participantes = rowsOf<any>(participantesResult);
      return {
        aplicacao,
        resumo: {
          total: participantes.length,
          naoIniciaram: participantes.filter(item => item.situacao === "NAO_INICIOU").length,
          emAndamento: participantes.filter(item => item.situacao === "EM_ANDAMENTO").length,
          finalizados: participantes.filter(item => item.situacao === "FINALIZOU").length,
          percentualConclusao: participantes.length
            ? arredondar((participantes.filter(item => item.situacao === "FINALIZOU").length / participantes.length) * 100)
            : 0,
        },
        participantes,
      };
    }),

  minhasAplicacoes: assessmentProcedure.query(async ({ ctx }) => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT a.id, a.titulo, a.agendada_para AS agendadaPara, a.status,
             a.liberada_em AS liberadaEm,
             p.nome AS provaNome, p.unidade AS provaUnidade, p.total_questoes AS totalQuestoes,
             t.id AS tentativaId, t.status AS tentativaStatus, t.finalizada_em AS finalizadaEm
        FROM aplicacoes_proficiencia_participantes ap
        JOIN aplicacoes_proficiencia a ON a.id = ap.aplicacao_id
        JOIN provas_importadas p ON p.id = a.prova_id
        LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = a.id AND t.colaborador_id = ap.colaborador_id
       WHERE ap.colaborador_id = ${ctx.user.id}
         AND a.status IN ('LIBERADA','ENCERRADA','CALCULADA')
       ORDER BY a.agendada_para DESC, a.id DESC
    `);
    return rowsOf<any>(result);
  }),

  abrirProva: assessmentProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const vinculo = await obterAplicacaoDoParticipante(db, input.aplicacaoId, ctx.user.id);
      if (vinculo.status !== "LIBERADA" && !vinculo.tentativaId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta prova ainda não está liberada para início." });
      }
      const prova = await obterProva(db, Number(vinculo.provaId), true);
      let tentativaId = Number(vinculo.tentativaId ?? 0);
      if (!tentativaId) {
        const result = await db.execute(sql`
          INSERT INTO tentativas_proficiencia (aplicacao_id, colaborador_id, status, iniciada_em, ultima_atividade_em)
          VALUES (${input.aplicacaoId}, ${ctx.user.id}, 'EM_ANDAMENTO', NOW(), NOW())
        `);
        const info: any = Array.isArray(result) ? result[0] : result;
        tentativaId = Number(info?.insertId ?? 0);
      }
      const respostasResult = await db.execute(sql`
        SELECT questao_chave AS questaoChave, resposta
          FROM respostas_proficiencia
         WHERE tentativa_id = ${tentativaId}
      `);
      return {
        aplicacao: { id: input.aplicacaoId, titulo: vinculo.titulo },
        tentativaId,
        tentativaStatus: vinculo.tentativaStatus ?? "EM_ANDAMENTO",
        prova: {
          id: prova.id,
          codigo: prova.codigo,
          nome: prova.nome,
          unidade: prova.unidade,
          totalQuestoes: prova.totalQuestoes,
          questoes: prova.questoes.map((questao: QuestaoImportada) => ({
            id: questao.id,
            enunciado: questao.enunciado,
            opcoes: questao.opcoes,
            macroarea: questao.macroarea ?? null,
            microarea: questao.microarea ?? null,
          })),
        },
        respostas: rowsOf<any>(respostasResult),
      };
    }),

  salvarResposta: assessmentProcedure
    .input(z.object({
      aplicacaoId: z.number().int().positive(),
      tentativaId: z.number().int().positive(),
      questaoChave: z.string().min(1).max(80),
      resposta: z.string().min(1).max(16),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const tentativaResult = await db.execute(sql`
        SELECT t.id, t.status, a.prova_id AS provaId
          FROM tentativas_proficiencia t
          JOIN aplicacoes_proficiencia a ON a.id = t.aplicacao_id
         WHERE t.id = ${input.tentativaId}
           AND t.aplicacao_id = ${input.aplicacaoId}
           AND t.colaborador_id = ${ctx.user.id}
         LIMIT 1
      `);
      const tentativa = rowsOf<any>(tentativaResult)[0];
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tentativa não está disponível para respostas." });
      }
      const prova = await obterProva(db, Number(tentativa.provaId), true);
      const questao = prova.questoes.find((item: QuestaoImportada) => String(item.id) === input.questaoChave);
      if (!questao) throw new TRPCError({ code: "BAD_REQUEST", message: "Questão não encontrada nesta prova." });
      const opcaoValida = questao.opcoes.some((opcao: any) => String(opcao.letra).toUpperCase() === input.resposta.toUpperCase());
      if (!opcaoValida) throw new TRPCError({ code: "BAD_REQUEST", message: "Alternativa inválida para esta questão." });
      await db.execute(sql`
        INSERT INTO respostas_proficiencia (tentativa_id, questao_chave, resposta, respondida_em)
        VALUES (${input.tentativaId}, ${input.questaoChave}, ${input.resposta.toUpperCase()}, NOW())
        ON DUPLICATE KEY UPDATE resposta = VALUES(resposta), respondida_em = NOW(), updated_at = NOW()
      `);
      await db.execute(sql`
        UPDATE tentativas_proficiencia SET ultima_atividade_em = NOW()
         WHERE id = ${input.tentativaId} AND colaborador_id = ${ctx.user.id}
      `);
      return { salvo: true };
    }),

  finalizar: assessmentProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive(), tentativaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const tentativaResult = await db.execute(sql`
        SELECT id, status FROM tentativas_proficiencia
         WHERE id = ${input.tentativaId}
           AND aplicacao_id = ${input.aplicacaoId}
           AND colaborador_id = ${ctx.user.id}
         LIMIT 1
      `);
      const tentativa = rowsOf<any>(tentativaResult)[0];
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tentativa não pode ser finalizada." });
      }
      await db.execute(sql`
        UPDATE tentativas_proficiencia
           SET status = 'FINALIZADA', finalizada_em = NOW(), ultima_atividade_em = NOW()
         WHERE id = ${input.tentativaId} AND status = 'EM_ANDAMENTO'
      `);
      await db.execute(sql`
        UPDATE aplicacoes_proficiencia_participantes
           SET situacao = 'FINALIZADO'
         WHERE aplicacao_id = ${input.aplicacaoId} AND colaborador_id = ${ctx.user.id}
      `);
      return { finalizada: true };
    }),

  calcular: adminProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      if (!["LIBERADA", "ENCERRADA", "CALCULADA"].includes(String(aplicacao.status))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A aplicação precisa ter sido liberada antes do cálculo." });
      }
      const prova = await obterProva(db, Number(aplicacao.provaId), true);
      const tentativasResult = await db.execute(sql`
        SELECT t.id, t.colaborador_id AS colaboradorId
          FROM tentativas_proficiencia t
         WHERE t.aplicacao_id = ${input.aplicacaoId}
           AND t.status IN ('FINALIZADA','FINALIZADA_TEMPO')
      `);
      const tentativas = rowsOf<any>(tentativasResult);
      let calculados = 0;

      for (const tentativa of tentativas) {
        const respostasResult = await db.execute(sql`
          SELECT questao_chave AS questaoChave, resposta
            FROM respostas_proficiencia
           WHERE tentativa_id = ${Number(tentativa.id)}
        `);
        const relacoes = await obterRelacoesEixos(db, Number(tentativa.colaboradorId));
        const resultado = calcularResultado(prova.questoes, rowsOf<any>(respostasResult), relacoes);
        await db.execute(sql`
          INSERT INTO resultados_proficiencia
            (aplicacao_id, colaborador_id, tentativa_id, percentual_geral, resultado_json, calculado_em)
          VALUES
            (${input.aplicacaoId}, ${Number(tentativa.colaboradorId)}, ${Number(tentativa.id)},
             ${String(resultado.percentualGeral)}, ${JSON.stringify(resultado)}, NOW())
          ON DUPLICATE KEY UPDATE tentativa_id = VALUES(tentativa_id),
                                  percentual_geral = VALUES(percentual_geral),
                                  resultado_json = VALUES(resultado_json),
                                  calculado_em = NOW()
        `);
        calculados += 1;
      }

      const contagemResult = await db.execute(sql`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN t.status IN ('FINALIZADA','FINALIZADA_TEMPO') THEN 1 ELSE 0 END) AS finalizados
          FROM aplicacoes_proficiencia_participantes ap
          LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = ap.aplicacao_id AND t.colaborador_id = ap.colaborador_id
         WHERE ap.aplicacao_id = ${input.aplicacaoId}
      `);
      const contagem = rowsOf<any>(contagemResult)[0] ?? { total: 0, finalizados: 0 };
      const todosFinalizados = Number(contagem.total) > 0 && Number(contagem.finalizados) === Number(contagem.total);
      if (todosFinalizados) {
        await db.execute(sql`
          UPDATE aplicacoes_proficiencia
             SET status = 'CALCULADA', calculada_em = NOW(), calculada_por = ${ctx.user.id}, encerrada_em = COALESCE(encerrada_em, NOW())
           WHERE id = ${input.aplicacaoId}
        `);
      } else {
        await db.execute(sql`
          UPDATE aplicacoes_proficiencia
             SET calculada_em = NOW(), calculada_por = ${ctx.user.id}
           WHERE id = ${input.aplicacaoId}
        `);
      }

      return {
        calculados,
        totalParticipantes: Number(contagem.total),
        finalizados: Number(contagem.finalizados),
        pendentes: Math.max(0, Number(contagem.total) - Number(contagem.finalizados)),
        status: todosFinalizados ? "CALCULADA" : aplicacao.status,
      };
    }),

  resultadoMaisRecente: adminProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const result = await db.execute(sql`
        SELECT rp.id, rp.aplicacao_id AS aplicacaoId, rp.percentual_geral AS percentualGeral,
               rp.resultado_json AS resultadoJson, rp.calculado_em AS calculadoEm,
               a.titulo AS aplicacaoTitulo, p.nome AS provaNome, p.unidade AS provaUnidade
          FROM resultados_proficiencia rp
          JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
          JOIN provas_importadas p ON p.id = a.prova_id
         WHERE rp.colaborador_id = ${input.colaboradorId}
         ORDER BY rp.calculado_em DESC, rp.id DESC
         LIMIT 1
      `);
      const linha = rowsOf<any>(result)[0];
      if (!linha) return null;
      return { ...linha, resultado: JSON.parse(String(linha.resultadoJson)) };
    }),
});

import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, assessmentProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { ensureHomologacaoTables, obterHomologacaoAtual, obterTestePorAplicacao } from "../services/homologacaoProvas";

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
  cicloId: number | null;
  totalQuestoes: number;
  questoes: QuestaoImportada[];
};

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function normalizar(valor: string) {
  return valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function normalizarUnidade(valor: string) {
  return valor
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

function parseJson<T>(valor: unknown): T {
  if (valor && typeof valor === "object") return valor as T;
  return JSON.parse(String(valor ?? "null")) as T;
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await ensureHomologacaoTables(db);
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS proficiencia_identidades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      aplicacao_id INT NOT NULL,
      colaborador_id INT NOT NULL,
      foto_data LONGTEXT NOT NULL,
      declaracao TEXT NOT NULL,
      confirmado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY prof_identidade_aplicacao_colaborador (aplicacao_id, colaborador_id),
      INDEX prof_identidade_aplicacao_idx (aplicacao_id),
      INDEX prof_identidade_colaborador_idx (colaborador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS proficiencia_ocorrencias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      aplicacao_id INT NOT NULL,
      tentativa_id INT NULL,
      colaborador_id INT NOT NULL,
      tipo VARCHAR(80) NOT NULL,
      detalhe VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX prof_ocorrencia_aplicacao_idx (aplicacao_id),
      INDEX prof_ocorrencia_tentativa_idx (tentativa_id),
      INDEX prof_ocorrencia_colaborador_idx (colaborador_id),
      INDEX prof_ocorrencia_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `));
  return db;
}

async function obterProvaValidada(db: any, provaId: number) {
  const result = await db.execute(sql`
    SELECT id, codigo, nome, unidade, ano, ciclo_id AS cicloId, total_questoes AS totalQuestoes,
           questoes_json AS questoesJson, status
      FROM provas_importadas
     WHERE id = ${provaId}
     LIMIT 1
  `);
  const prova = rowsOf<any>(result)[0];
  if (!prova) throw new TRPCError({ code: "NOT_FOUND", message: "Prova não encontrada." });
  if (prova.status !== "VALIDADA") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Somente provas VALIDADA podem ser usadas em uma aplicação." });
  }
  try {
    const questoes = parseJson<QuestaoImportada[]>(prova.questoesJson);
    return {
      id: Number(prova.id),
      codigo: String(prova.codigo),
      nome: String(prova.nome),
      unidade: String(prova.unidade),
      ano: Number(prova.ano),
      cicloId: prova.cicloId ? Number(prova.cicloId) : null,
      totalQuestoes: Number(prova.totalQuestoes),
      questoes,
    } satisfies ProvaSnapshot;
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível ler as questões desta prova." });
  }
}

async function obterAplicacao(db: any, aplicacaoId: number) {
  const result = await db.execute(sql`
    SELECT id, prova_id AS provaId, prova_snapshot_json AS provaSnapshotJson,
           titulo, agendada_para AS agendadaPara, status,
           liberada_em AS liberadaEm, encerrada_em AS encerradaEm,
           calculada_em AS calculadaEm
      FROM aplicacoes_proficiencia
     WHERE id = ${aplicacaoId}
     LIMIT 1
  `);
  const linha = rowsOf<any>(result)[0];
  if (!linha) throw new TRPCError({ code: "NOT_FOUND", message: "Aplicação não encontrada." });
  let prova: ProvaSnapshot;
  try {
    prova = parseJson<ProvaSnapshot>(linha.provaSnapshotJson);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O snapshot da prova desta aplicação está inválido." });
  }
  return { ...linha, prova };
}

async function obterVinculoParticipante(db: any, aplicacaoId: number, colaboradorId: number) {
  const result = await db.execute(sql`
    SELECT a.id, a.titulo, a.status, a.agendada_para AS agendadaPara,
           a.liberada_em AS liberadaEm, a.prova_snapshot_json AS provaSnapshotJson,
           ap.situacao,
           t.id AS tentativaId, t.status AS tentativaStatus,
           t.iniciada_em AS iniciadaEm, t.finalizada_em AS finalizadaEm
      FROM aplicacoes_proficiencia a
      JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id = a.id
      LEFT JOIN tentativas_proficiencia t
        ON t.aplicacao_id = a.id AND t.colaborador_id = ap.colaborador_id
     WHERE a.id = ${aplicacaoId}
       AND ap.colaborador_id = ${colaboradorId}
     LIMIT 1
  `);
  const item = rowsOf<any>(result)[0];
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Esta aplicação não está atribuída a este participante." });
  return { ...item, prova: parseJson<ProvaSnapshot>(item.provaSnapshotJson) };
}

async function obterRelacoesEixos(db: any, colaboradorId: number) {
  const result = await db.execute(sql`
    SELECT e.eixo_nome AS eixoNome, e.relacao, e.percentual_anterior AS percentualAnterior
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
     WHERE m.colaborador_id = ${colaboradorId}
       AND m.status IN ('VALIDADA_PROVISORIA','VALIDADA_DEFINITIVA')
  `);
  const mapa = new Map<string, { relacao: string | null; percentualAnterior: number | null }>();
  for (const item of rowsOf<any>(result)) {
    mapa.set(normalizar(String(item.eixoNome ?? "")), {
      relacao: item.relacao ? String(item.relacao) : null,
      percentualAnterior: item.percentualAnterior === null ? null : Number(item.percentualAnterior),
    });
  }
  return mapa;
}

function calcularResultado(
  questoes: QuestaoImportada[],
  respostas: Array<{ questaoChave: string; resposta: string }>,
  relacoes: Map<string, { relacao: string | null; percentualAnterior: number | null }>,
) {
  const porQuestao = new Map(respostas.map(item => [String(item.questaoChave), String(item.resposta).toUpperCase()]));
  const eixoMap = new Map<string, { eixo: string; totalQuestoes: number; respondidas: number; acertos: number; naoSei: number }>();
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

function provaParaParticipante(prova: ProvaSnapshot) {
  return {
    id: prova.id,
    codigo: prova.codigo,
    nome: prova.nome,
    unidade: prova.unidade,
    totalQuestoes: prova.totalQuestoes,
    questoes: prova.questoes.map(questao => ({
      id: questao.id,
      enunciado: questao.enunciado,
      opcoes: questao.opcoes,
      macroarea: questao.macroarea ?? null,
      microarea: questao.microarea ?? null,
    })),
  };
}

export const aplicacoesProficienciaRouter = router({
  listarProvasValidas: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT p.id, p.codigo, p.nome, p.unidade, p.ano,
             p.ciclo_id AS cicloId, c.nome AS cicloNome,
             p.total_questoes AS totalQuestoes
        FROM provas_importadas p
        LEFT JOIN ciclos c ON c.id = p.ciclo_id
        LEFT JOIN (
          SELECT h1.prova_id, h1.status
            FROM provas_importadas_homologacao h1
            JOIN (
              SELECT prova_id, MAX(id) AS max_id
                FROM provas_importadas_homologacao
               GROUP BY prova_id
            ) ult ON ult.max_id = h1.id
        ) ph ON ph.prova_id = p.id
       WHERE p.status = 'VALIDADA'
         AND (ph.status IS NULL OR ph.status = 'HOMOLOGADA')
       ORDER BY p.ano DESC, p.unidade, p.nome
    `);
    return rowsOf<any>(result);
  }),

  listarParticipantesDisponiveis: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.cargo, u.role, d.nome AS departamentoNome
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
      cicloId: z.number().int().positive(),
      titulo: z.string().trim().min(3).max(255),
      agendadaPara: z.string().min(10).max(40),
      colaboradorIds: z.array(z.number().int().positive()).min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const prova = await obterProvaValidada(db, input.provaId);
      if (!prova.cicloId || Number(prova.cicloId) !== Number(input.cicloId)) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A prova selecionada não pertence ao ciclo informado. Atualize a tela e selecione novamente." });
      }
      const homologacao = await obterHomologacaoAtual(db, input.provaId);
      if (homologacao && String(homologacao.status) !== "HOMOLOGADA") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Esta prova precisa ser testada e homologada antes de uma aplicação oficial." });
      }
      const ids = Array.from(new Set(input.colaboradorIds));
      const usuariosResult = await db.execute(sql.raw(`
        SELECT u.id, u.name, d.nome AS departamentoNome
          FROM users u
          LEFT JOIN departamentos d ON d.id = u.departamentoId
         WHERE u.status = 'ativo'
           AND u.role IN ('colaborador','lider','gerente')
           AND u.id IN (${ids.map(id => Number(id)).join(",")})
      `));
      const usuariosSelecionados = rowsOf<{ id: number; name: string | null; departamentoNome: string | null }>(usuariosResult);
      if (usuariosSelecionados.length !== ids.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Um ou mais participantes selecionados não estão ativos ou não podem receber a prova." });
      }

      const unidadeProva = normalizarUnidade(prova.unidade);
      const incompativeis = usuariosSelecionados.filter(usuario =>
        normalizarUnidade(String(usuario.departamentoNome ?? "")) !== unidadeProva,
      );
      if (incompativeis.length > 0) {
        const nomes = incompativeis.map(usuario => usuario.name || `ID ${usuario.id}`).slice(0, 10).join(", ");
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Aplicação bloqueada: a prova “${prova.codigo}” pertence à unidade “${prova.unidade}”. Há participante(s) de outra unidade na seleção: ${nomes}${incompativeis.length > 10 ? "..." : ""}.`,
        });
      }
      const data = new Date(input.agendadaPara);
      if (Number.isNaN(data.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Data e horário inválidos." });
      const snapshotJson = JSON.stringify(prova);

      return await db.transaction(async (tx: any) => {
        const result = await tx.execute(sql`
          INSERT INTO aplicacoes_proficiencia
            (prova_id, prova_snapshot_json, titulo, agendada_para, status, created_by)
          VALUES
            (${input.provaId}, ${snapshotJson}, ${input.titulo}, ${data}, 'AGENDADA', ${ctx.user.id})
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
        return { id: aplicacaoId, status: "AGENDADA" as const, participantes: ids.length };
      });
    }),

  listar: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT a.id, a.titulo, a.agendada_para AS agendadaPara, a.status,
             a.liberada_em AS liberadaEm, a.calculada_em AS calculadaEm,
             a.prova_snapshot_json AS provaSnapshotJson,
             MAX(CASE WHEN ph.id IS NOT NULL THEN 1 ELSE 0 END) AS modoTeste,
             COUNT(ap.id) AS totalParticipantes,
             SUM(CASE WHEN t.id IS NULL THEN 1 ELSE 0 END) AS naoIniciaram,
             SUM(CASE WHEN t.status IN ('EM_ANDAMENTO','BLOQUEADA','LIBERADA_CONTINUIDADE') THEN 1 ELSE 0 END) AS emAndamento,
             SUM(CASE WHEN t.status IN ('FINALIZADA','FINALIZADA_TEMPO') THEN 1 ELSE 0 END) AS finalizados
        FROM aplicacoes_proficiencia a
        LEFT JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id = a.id
        LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id = a.id AND t.colaborador_id = ap.colaborador_id
        LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
       GROUP BY a.id, a.titulo, a.agendada_para, a.status, a.liberada_em, a.calculada_em, a.prova_snapshot_json
       ORDER BY a.agendada_para DESC, a.id DESC
    `);
    return rowsOf<any>(result).map(item => {
      const prova = parseJson<ProvaSnapshot>(item.provaSnapshotJson);
      return { ...item, modoTeste: Boolean(Number(item.modoTeste ?? 0)), provaId: prova.id, provaCodigo: prova.codigo, provaNome: prova.nome, provaUnidade: prova.unidade };
    });
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
      return { liberada: true, status: "LIBERADA" as const };
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
               t.finalizada_em AS finalizadaEm, COUNT(r.id) AS respostasSalvas,
               MAX(CASE WHEN pi.id IS NOT NULL THEN 1 ELSE 0 END) AS identidadeConfirmada,
               (SELECT COUNT(*) FROM proficiencia_ocorrencias po
                 WHERE po.aplicacao_id = ap.aplicacao_id
                   AND po.colaborador_id = ap.colaborador_id) AS totalOcorrencias
          FROM aplicacoes_proficiencia_participantes ap
          JOIN users u ON u.id = ap.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
          LEFT JOIN tentativas_proficiencia t
            ON t.aplicacao_id = ap.aplicacao_id AND t.colaborador_id = ap.colaborador_id
          LEFT JOIN respostas_proficiencia r ON r.tentativa_id = t.id
          LEFT JOIN proficiencia_identidades pi
            ON pi.aplicacao_id = ap.aplicacao_id AND pi.colaborador_id = ap.colaborador_id
         WHERE ap.aplicacao_id = ${input.aplicacaoId}
         GROUP BY ap.colaborador_id, u.name, d.nome, t.id, t.status,
                  t.iniciada_em, t.ultima_atividade_em, t.finalizada_em
         ORDER BY u.name
      `);
      const totalQuestoes = Math.max(1, Number(aplicacao.prova.totalQuestoes || aplicacao.prova.questoes.length));
      const participantes = rowsOf<any>(participantesResult).map(item => ({
        ...item,
        percentualRealizacao: arredondar((Number(item.respostasSalvas ?? 0) / totalQuestoes) * 100),
        situacao: !item.tentativaId
          ? "NAO_INICIOU"
          : ["FINALIZADA", "FINALIZADA_TEMPO"].includes(String(item.tentativaStatus))
            ? "FINALIZOU"
            : "EM_ANDAMENTO",
      }));
      const finalizados = participantes.filter(item => item.situacao === "FINALIZOU").length;
      const testeAdmin = await obterTestePorAplicacao(db, input.aplicacaoId);
      return {
        aplicacao: { ...aplicacao, provaSnapshotJson: undefined },
        modoTeste: Boolean(testeAdmin),
        resumo: {
          total: participantes.length,
          naoIniciaram: participantes.filter(item => item.situacao === "NAO_INICIOU").length,
          emAndamento: participantes.filter(item => item.situacao === "EM_ANDAMENTO").length,
          finalizados,
          percentualConclusao: participantes.length ? arredondar((finalizados / participantes.length) * 100) : 0,
        },
        participantes,
      };
    }),


  estadoIdentidade: assessmentProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      await obterVinculoParticipante(db, input.aplicacaoId, ctx.user.id);
      const result = await db.execute(sql`
        SELECT confirmado_em AS confirmadoEm
          FROM proficiencia_identidades
         WHERE aplicacao_id = ${input.aplicacaoId}
           AND colaborador_id = ${ctx.user.id}
         LIMIT 1
      `);
      const identidade = rowsOf<any>(result)[0] ?? null;
      return { necessaria: true, identidadeConfirmada: Boolean(identidade), confirmadoEm: identidade?.confirmadoEm ?? null };
    }),

  registrarIdentidade: assessmentProcedure
    .input(z.object({
      aplicacaoId: z.number().int().positive(),
      fotoDataUrl: z.string().min(100).max(2500000),
      aceiteDeclaracao: z.literal(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      await obterVinculoParticipante(db, input.aplicacaoId, ctx.user.id);
      if (!input.fotoDataUrl.startsWith("data:image/")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A fotografia capturada é inválida." });
      }
      const nome = String(ctx.user.name || "Participante").trim();
      const declaracao = "Declaro que sou " + nome + ", participante identificado(a) nesta plataforma, e que sou a pessoa que realizará esta Avaliação de Proficiência para a Função. Confirmo que esta fotografia foi capturada por mim imediatamente antes do início da avaliação.";
      await db.execute(sql`
        INSERT INTO proficiencia_identidades
          (aplicacao_id, colaborador_id, foto_data, declaracao, confirmado_em)
        VALUES
          (${input.aplicacaoId}, ${ctx.user.id}, ${input.fotoDataUrl}, ${declaracao}, NOW())
        ON DUPLICATE KEY UPDATE
          foto_data = VALUES(foto_data),
          declaracao = VALUES(declaracao),
          confirmado_em = NOW(),
          updated_at = NOW()
      `);
      await db.execute(sql`
        INSERT INTO proficiencia_ocorrencias
          (aplicacao_id, tentativa_id, colaborador_id, tipo, detalhe)
        VALUES
          (${input.aplicacaoId}, NULL, ${ctx.user.id}, 'IDENTIDADE_CONFIRMADA', 'Fotografia e declaração registradas antes do início da avaliação.')
      `);
      return { confirmada: true };
    }),

  registrarOcorrencia: assessmentProcedure
    .input(z.object({
      aplicacaoId: z.number().int().positive(),
      tentativaId: z.number().int().positive().nullable().optional(),
      tipo: z.string().trim().min(2).max(80),
      detalhe: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      await obterVinculoParticipante(db, input.aplicacaoId, ctx.user.id);
      if (input.tentativaId) {
        const tentativaResult = await db.execute(sql`
          SELECT id FROM tentativas_proficiencia
           WHERE id = ${input.tentativaId}
             AND aplicacao_id = ${input.aplicacaoId}
             AND colaborador_id = ${ctx.user.id}
           LIMIT 1
        `);
        if (!rowsOf<any>(tentativaResult).length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Tentativa inválida para o registro de ocorrência." });
        }
      }
      await db.execute(sql`
        INSERT INTO proficiencia_ocorrencias
          (aplicacao_id, tentativa_id, colaborador_id, tipo, detalhe)
        VALUES
          (${input.aplicacaoId}, ${input.tentativaId ?? null}, ${ctx.user.id}, ${input.tipo}, ${input.detalhe ?? null})
      `);
      return { registrada: true };
    }),

  listarOcorrencias: adminProcedure
    .input(z.object({
      aplicacaoId: z.number().int().positive(),
      colaboradorId: z.number().int().positive().optional(),
    }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const result = input.colaboradorId
        ? await db.execute(sql`
            SELECT po.id, po.aplicacao_id AS aplicacaoId, po.tentativa_id AS tentativaId,
                   po.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
                   po.tipo, po.detalhe, po.created_at AS createdAt
              FROM proficiencia_ocorrencias po
              LEFT JOIN users u ON u.id = po.colaborador_id
             WHERE po.aplicacao_id = ${input.aplicacaoId}
               AND po.colaborador_id = ${input.colaboradorId}
             ORDER BY po.created_at DESC, po.id DESC
             LIMIT 500
          `)
        : await db.execute(sql`
            SELECT po.id, po.aplicacao_id AS aplicacaoId, po.tentativa_id AS tentativaId,
                   po.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
                   po.tipo, po.detalhe, po.created_at AS createdAt
              FROM proficiencia_ocorrencias po
              LEFT JOIN users u ON u.id = po.colaborador_id
             WHERE po.aplicacao_id = ${input.aplicacaoId}
             ORDER BY po.created_at DESC, po.id DESC
             LIMIT 500
          `);
      return rowsOf<any>(result);
    }),

  consultarIdentidade: adminProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive(), colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const result = await db.execute(sql`
        SELECT pi.aplicacao_id AS aplicacaoId, pi.colaborador_id AS colaboradorId,
               u.name AS nome, u.email, pi.foto_data AS fotoData,
               pi.declaracao, pi.confirmado_em AS confirmadoEm
          FROM proficiencia_identidades pi
          LEFT JOIN users u ON u.id = pi.colaborador_id
         WHERE pi.aplicacao_id = ${input.aplicacaoId}
           AND pi.colaborador_id = ${input.colaboradorId}
         LIMIT 1
      `);
      return rowsOf<any>(result)[0] ?? null;
    }),

  minhasAplicacoes: assessmentProcedure.query(async ({ ctx }) => {
    const db = await dbObrigatorio();
    const result = await db.execute(sql`
      SELECT a.id, a.titulo, a.agendada_para AS agendadaPara, a.status,
             a.liberada_em AS liberadaEm, a.prova_snapshot_json AS provaSnapshotJson,
             t.id AS tentativaId, t.status AS tentativaStatus, t.finalizada_em AS finalizadaEm
        FROM aplicacoes_proficiencia_participantes ap
        JOIN aplicacoes_proficiencia a ON a.id = ap.aplicacao_id
        LEFT JOIN tentativas_proficiencia t
          ON t.aplicacao_id = a.id AND t.colaborador_id = ap.colaborador_id
        LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
       WHERE ap.colaborador_id = ${ctx.user.id}
         AND a.status IN ('LIBERADA','ENCERRADA','CALCULADA')
         AND ph.id IS NULL
       ORDER BY a.agendada_para DESC, a.id DESC
    `);
    return rowsOf<any>(result).map(item => {
      const prova = parseJson<ProvaSnapshot>(item.provaSnapshotJson);
      return { ...item, provaNome: prova.nome, provaUnidade: prova.unidade, totalQuestoes: prova.totalQuestoes };
    });
  }),

  estadoProva: assessmentProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const vinculo = await obterVinculoParticipante(db, input.aplicacaoId, ctx.user.id);
      if (vinculo.status !== "LIBERADA" && !vinculo.tentativaId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta prova ainda não está liberada para início." });
      }
      const respostas = vinculo.tentativaId
        ? rowsOf<any>(await db.execute(sql`
            SELECT questao_chave AS questaoChave, resposta
              FROM respostas_proficiencia
             WHERE tentativa_id = ${Number(vinculo.tentativaId)}
          `))
        : [];
      const testeAdmin = await obterTestePorAplicacao(db, input.aplicacaoId);
      return {
        aplicacao: { id: input.aplicacaoId, titulo: vinculo.titulo },
        modoTeste: Boolean(testeAdmin),
        tentativaId: vinculo.tentativaId ? Number(vinculo.tentativaId) : null,
        tentativaStatus: vinculo.tentativaStatus ?? null,
        prova: provaParaParticipante(vinculo.prova),
        respostas,
      };
    }),

  iniciar: assessmentProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const vinculo = await obterVinculoParticipante(db, input.aplicacaoId, ctx.user.id);
      if (vinculo.status !== "LIBERADA") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta prova ainda não está liberada para início." });
      }
      const identidadeResult = await db.execute(sql`
        SELECT id FROM proficiencia_identidades
         WHERE aplicacao_id = ${input.aplicacaoId}
           AND colaborador_id = ${ctx.user.id}
         LIMIT 1
      `);
      if (!rowsOf<any>(identidadeResult).length) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Confirme sua identidade antes de iniciar a avaliação." });
      }
      if (vinculo.tentativaId) return { tentativaId: Number(vinculo.tentativaId), criada: false };
      try {
        const result = await db.execute(sql`
          INSERT INTO tentativas_proficiencia
            (aplicacao_id, colaborador_id, status, iniciada_em, ultima_atividade_em)
          VALUES
            (${input.aplicacaoId}, ${ctx.user.id}, 'EM_ANDAMENTO', NOW(), NOW())
        `);
        const info: any = Array.isArray(result) ? result[0] : result;
        const tentativaId = Number(info?.insertId ?? 0);
        if (!tentativaId) throw new Error("Sem identificador da tentativa.");
        return { tentativaId, criada: true };
      } catch {
        const existente = await obterVinculoParticipante(db, input.aplicacaoId, ctx.user.id);
        if (existente.tentativaId) return { tentativaId: Number(existente.tentativaId), criada: false };
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível iniciar a avaliação." });
      }
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
        SELECT t.id, t.status
          FROM tentativas_proficiencia t
         WHERE t.id = ${input.tentativaId}
           AND t.aplicacao_id = ${input.aplicacaoId}
           AND t.colaborador_id = ${ctx.user.id}
         LIMIT 1
      `);
      const tentativa = rowsOf<any>(tentativaResult)[0];
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tentativa não está disponível para respostas." });
      }
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      const questao = aplicacao.prova.questoes.find((item: QuestaoImportada) => String(item.id) === input.questaoChave);
      if (!questao) throw new TRPCError({ code: "BAD_REQUEST", message: "Questão não encontrada nesta prova." });
      const opcaoValida = questao.opcoes.some(opcao => String(opcao.letra).toUpperCase() === input.resposta.toUpperCase());
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
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      const countResult = await db.execute(sql`
        SELECT COUNT(*) AS total FROM respostas_proficiencia WHERE tentativa_id = ${input.tentativaId}
      `);
      const respondidas = Number(rowsOf<any>(countResult)[0]?.total ?? 0);
      if (respondidas < aplicacao.prova.totalQuestoes) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Ainda faltam ${aplicacao.prova.totalQuestoes - respondidas} questão(ões) para finalizar.` });
      }
      const testeAdmin = await obterTestePorAplicacao(db, input.aplicacaoId);
      await db.transaction(async (tx: any) => {
        await tx.execute(sql`
          UPDATE tentativas_proficiencia
             SET status = 'FINALIZADA', finalizada_em = NOW(), ultima_atividade_em = NOW()
           WHERE id = ${input.tentativaId} AND status = 'EM_ANDAMENTO'
        `);
        await tx.execute(sql`
          UPDATE aplicacoes_proficiencia_participantes
             SET situacao = 'FINALIZADO'
           WHERE aplicacao_id = ${input.aplicacaoId} AND colaborador_id = ${ctx.user.id}
        `);
      });

      if (testeAdmin) {
        const respostas = rowsOf<any>(await db.execute(sql`
          SELECT questao_chave AS questaoChave, resposta
            FROM respostas_proficiencia
           WHERE tentativa_id = ${input.tentativaId}
        `));
        const resultado = calcularResultado(aplicacao.prova.questoes, respostas, new Map());
        await db.transaction(async (tx: any) => {
          await tx.execute(sql`
            INSERT INTO resultados_proficiencia
              (aplicacao_id, colaborador_id, tentativa_id, percentual_geral, resultado_json, calculado_em)
            VALUES
              (${input.aplicacaoId}, ${ctx.user.id}, ${input.tentativaId},
               ${String(resultado.percentualGeral)}, ${JSON.stringify(resultado)}, NOW())
            ON DUPLICATE KEY UPDATE tentativa_id = VALUES(tentativa_id),
                                    percentual_geral = VALUES(percentual_geral),
                                    resultado_json = VALUES(resultado_json),
                                    calculado_em = NOW()
          `);
          await tx.execute(sql`
            UPDATE aplicacoes_proficiencia
               SET status = 'CALCULADA', calculada_em = NOW(), calculada_por = ${ctx.user.id}, encerrada_em = NOW()
             WHERE id = ${input.aplicacaoId}
          `);
          await tx.execute(sql`
            UPDATE provas_importadas_homologacao
               SET status = 'TESTADA', testada_em = NOW(), updated_at = NOW()
             WHERE id = ${Number(testeAdmin.id)}
               AND status = 'EM_TESTE'
          `);
        });
        return { finalizada: true, modoTeste: true, resultadoCalculado: true, percentualGeral: resultado.percentualGeral };
      }
      return { finalizada: true, modoTeste: false, resultadoCalculado: false };
    }),

  calcular: adminProcedure
    .input(z.object({ aplicacaoId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const aplicacao = await obterAplicacao(db, input.aplicacaoId);
      if (!["LIBERADA", "ENCERRADA", "CALCULADA"].includes(String(aplicacao.status))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A aplicação precisa ter sido liberada antes do cálculo." });
      }
      const tentativas = rowsOf<any>(await db.execute(sql`
        SELECT id, colaborador_id AS colaboradorId
          FROM tentativas_proficiencia
         WHERE aplicacao_id = ${input.aplicacaoId}
           AND status IN ('FINALIZADA','FINALIZADA_TEMPO')
      `));
      let calculados = 0;
      for (const tentativa of tentativas) {
        const respostas = rowsOf<any>(await db.execute(sql`
          SELECT questao_chave AS questaoChave, resposta
            FROM respostas_proficiencia
           WHERE tentativa_id = ${Number(tentativa.id)}
        `));
        const relacoes = await obterRelacoesEixos(db, Number(tentativa.colaboradorId));
        const resultado = calcularResultado(aplicacao.prova.questoes, respostas, relacoes);
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
      const contagem = rowsOf<any>(await db.execute(sql`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN t.status IN ('FINALIZADA','FINALIZADA_TEMPO') THEN 1 ELSE 0 END) AS finalizados
          FROM aplicacoes_proficiencia_participantes ap
          LEFT JOIN tentativas_proficiencia t
            ON t.aplicacao_id = ap.aplicacao_id AND t.colaborador_id = ap.colaborador_id
         WHERE ap.aplicacao_id = ${input.aplicacaoId}
      `))[0] ?? { total: 0, finalizados: 0 };
      const total = Number(contagem.total ?? 0);
      const finalizados = Number(contagem.finalizados ?? 0);
      const todosFinalizados = total > 0 && finalizados === total;
      await db.execute(sql`
        UPDATE aplicacoes_proficiencia
           SET calculada_em = NOW(), calculada_por = ${ctx.user.id},
               status = ${todosFinalizados ? "CALCULADA" : aplicacao.status},
               encerrada_em = ${todosFinalizados ? new Date() : aplicacao.encerradaEm ?? null}
         WHERE id = ${input.aplicacaoId}
      `);
      return {
        calculados,
        totalParticipantes: total,
        finalizados,
        pendentes: Math.max(0, total - finalizados),
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
               a.titulo AS aplicacaoTitulo, a.prova_snapshot_json AS provaSnapshotJson
          FROM resultados_proficiencia rp
          JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
          LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
         WHERE rp.colaborador_id = ${input.colaboradorId}
           AND ph.id IS NULL
         ORDER BY rp.calculado_em DESC, rp.id DESC
         LIMIT 1
      `);
      const linha = rowsOf<any>(result)[0];
      if (!linha) return null;
      const prova = parseJson<ProvaSnapshot>(linha.provaSnapshotJson);
      return { ...linha, provaNome: prova.nome, provaUnidade: prova.unidade, resultado: parseJson<any>(linha.resultadoJson) };
    }),
});

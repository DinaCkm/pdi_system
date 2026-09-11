import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { adminProcedure, assessmentProcedure, router } from "../_core/customTrpc";
import { storageDelete, storageGet, storagePut } from "../storage";

const DURACAO_TOTAL_SEGUNDOS = 3 * 60 * 60;
const LIMITE_INATIVIDADE_SEGUNDOS = 3 * 60;
const VALIDADE_IDENTIDADE_MINUTOS = 30;
const TAMANHO_MAX_FOTO_IDENTIDADE_BYTES = 1024 * 1024;

type TentativaStatus =
  | "EM_ANDAMENTO"
  | "BLOQUEADA"
  | "LIBERADA"
  | "FINALIZADA"
  | "CONCLUIDA"
  | "FINALIZADA_TEMPO"
  | "ANULADA";

type TentativaRow = {
  id: number;
  colaborador_id: number;
  status: TentativaStatus;
  started_at: string;
  expires_at: string;
  last_activity_at: string;
  blocked_at: string | null;
  block_reason: string | null;
  finished_at: string | null;
  released_at: string | null;
  released_by: number | null;
};

type IdentidadeRow = {
  id: number;
  colaborador_id: number;
  tentativa_id: number | null;
  nome_snapshot: string;
  foto_key: string;
  declaracao: string;
  confirmado_em: string;
};

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function declaracaoIdentidade(nome: string) {
  return `Declaro que sou ${nome}, participante identificado(a) nesta plataforma, e que sou a pessoa que realizará esta avaliação. Confirmo que esta fotografia foi capturada por mim imediatamente antes do início da prova e poderá ser utilizada exclusivamente para conferência da minha identidade em eventual auditoria do processo avaliativo.`;
}

function extrairFotoJpeg(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A fotografia de identidade deve ser capturada diretamente pela câmera no formato permitido.",
    });
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length < 1000 || buffer.length > TAMANHO_MAX_FOTO_IDENTIDADE_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A fotografia capturada é inválida ou excede o tamanho permitido.",
    });
  }
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem capturada não é um JPEG válido." });
  }
  return buffer;
}

async function ensureTables() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_tentativas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      colaborador_id INT NOT NULL,
      status ENUM('EM_ANDAMENTO','BLOQUEADA','LIBERADA','FINALIZADA','CONCLUIDA','FINALIZADA_TEMPO','ANULADA') NOT NULL DEFAULT 'EM_ANDAMENTO',
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      blocked_at DATETIME NULL,
      block_reason VARCHAR(100) NULL,
      finished_at DATETIME NULL,
      released_at DATETIME NULL,
      released_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_prova_utic_tentativas_colaborador (colaborador_id),
      INDEX idx_prova_utic_tentativas_status (status),
      CONSTRAINT fk_prova_utic_tentativas_colaborador FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_prova_utic_tentativas_liberado FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_respostas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tentativa_id INT NOT NULL,
      questao_id INT NOT NULL,
      resposta TEXT NOT NULL,
      respondida_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_prova_utic_resposta (tentativa_id, questao_id),
      INDEX idx_prova_utic_respostas_tentativa (tentativa_id),
      CONSTRAINT fk_prova_utic_respostas_tentativa FOREIGN KEY (tentativa_id) REFERENCES prova_utic_tentativas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_eventos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tentativa_id INT NOT NULL,
      tipo VARCHAR(80) NOT NULL,
      detalhe TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prova_utic_eventos_tentativa (tentativa_id),
      CONSTRAINT fk_prova_utic_eventos_tentativa FOREIGN KEY (tentativa_id) REFERENCES prova_utic_tentativas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_identidades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      colaborador_id INT NOT NULL,
      tentativa_id INT NULL,
      nome_snapshot VARCHAR(255) NOT NULL,
      foto_key VARCHAR(700) NOT NULL,
      declaracao TEXT NOT NULL,
      confirmado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_prova_utic_identidade_tentativa (tentativa_id),
      INDEX idx_prova_utic_identidade_colaborador (colaborador_id),
      INDEX idx_prova_utic_identidade_confirmado (confirmado_em),
      CONSTRAINT fk_prova_utic_identidade_colaborador FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_prova_utic_identidade_tentativa FOREIGN KEY (tentativa_id) REFERENCES prova_utic_tentativas(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  return db;
}

async function obterUltimaTentativa(colaboradorId: number) {
  const db = await ensureTables();
  const result = await db.execute(sql`
    SELECT id, colaborador_id, status, started_at, expires_at, last_activity_at,
           blocked_at, block_reason, finished_at, released_at, released_by
      FROM prova_utic_tentativas
     WHERE colaborador_id = ${colaboradorId}
     ORDER BY id DESC
     LIMIT 1
  `);
  return rowsOf<TentativaRow>(result)[0] ?? null;
}

async function obterTentativaPorId(tentativaId: number) {
  const db = await ensureTables();
  const result = await db.execute(sql`
    SELECT id, colaborador_id, status, started_at, expires_at, last_activity_at,
           blocked_at, block_reason, finished_at, released_at, released_by
      FROM prova_utic_tentativas
     WHERE id = ${tentativaId}
     LIMIT 1
  `);
  return rowsOf<TentativaRow>(result)[0] ?? null;
}

async function obterIdentidadePendente(colaboradorId: number) {
  const db = await ensureTables();
  const result = await db.execute(sql`
    SELECT id, colaborador_id, tentativa_id, nome_snapshot, foto_key, declaracao, confirmado_em
      FROM prova_utic_identidades
     WHERE colaborador_id = ${colaboradorId}
       AND tentativa_id IS NULL
       AND confirmado_em >= DATE_SUB(NOW(), INTERVAL ${VALIDADE_IDENTIDADE_MINUTOS} MINUTE)
     ORDER BY confirmado_em DESC, id DESC
     LIMIT 1
  `);
  return rowsOf<IdentidadeRow>(result)[0] ?? null;
}

async function registrarEvento(tentativaId: number, tipo: string, detalhe?: string | null) {
  const db = await ensureTables();
  await db.execute(sql`
    INSERT INTO prova_utic_eventos (tentativa_id, tipo, detalhe)
    VALUES (${tentativaId}, ${tipo}, ${detalhe ?? null})
  `);
}

async function normalizarExpiracaoEInatividade(tentativa: TentativaRow | null) {
  if (!tentativa || tentativa.status !== "EM_ANDAMENTO") return tentativa;
  const db = await ensureTables();
  const now = Date.now();
  const expira = new Date(tentativa.expires_at).getTime();
  const ultimaAtividade = new Date(tentativa.last_activity_at).getTime();

  if (Number.isFinite(expira) && now >= expira) {
    await db.execute(sql`
      UPDATE prova_utic_tentativas
         SET status = 'FINALIZADA_TEMPO', finished_at = NOW(), block_reason = 'TEMPO_TOTAL'
       WHERE id = ${tentativa.id} AND status = 'EM_ANDAMENTO'
    `);
    await registrarEvento(tentativa.id, "finalizada_tempo", "Tempo total de 3 horas encerrado.");
    return await obterUltimaTentativa(tentativa.colaborador_id);
  }

  if (Number.isFinite(ultimaAtividade) && now - ultimaAtividade >= LIMITE_INATIVIDADE_SEGUNDOS * 1000) {
    await db.execute(sql`
      UPDATE prova_utic_tentativas
         SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_3_MIN'
       WHERE id = ${tentativa.id} AND status = 'EM_ANDAMENTO'
    `);
    await registrarEvento(tentativa.id, "bloqueada_inatividade", "Avaliação bloqueada após 3 minutos sem atividade.");
    return await obterUltimaTentativa(tentativa.colaborador_id);
  }

  return tentativa;
}

async function validarTentativaDoUsuario(tentativaId: number, colaboradorId: number) {
  const db = await ensureTables();
  const result = await db.execute(sql`
    SELECT id, colaborador_id, status, started_at, expires_at, last_activity_at,
           blocked_at, block_reason, finished_at, released_at, released_by
      FROM prova_utic_tentativas
     WHERE id = ${tentativaId} AND colaborador_id = ${colaboradorId}
     LIMIT 1
  `);
  const tentativa = rowsOf<TentativaRow>(result)[0];
  if (!tentativa) throw new TRPCError({ code: "NOT_FOUND", message: "Tentativa não encontrada." });
  return await normalizarExpiracaoEInatividade(tentativa);
}

export const provaUticRouter = router({
  estado: assessmentProcedure.query(async ({ ctx }) => {
    const db = await ensureTables();
    let tentativa = await obterUltimaTentativa(ctx.user.id);
    tentativa = await normalizarExpiracaoEInatividade(tentativa);
    if (!tentativa) return { tentativa: null, respostas: [] as Array<{ questaoId: number; resposta: string }> };

    const respostasResult = await db.execute(sql`
      SELECT questao_id AS questaoId, resposta
        FROM prova_utic_respostas
       WHERE tentativa_id = ${tentativa.id}
       ORDER BY questao_id
    `);
    return { tentativa, respostas: rowsOf<{ questaoId: number; resposta: string }>(respostasResult) };
  }),

  estadoIdentidade: assessmentProcedure.query(async ({ ctx }) => {
    const db = await ensureTables();
    const tentativa = await obterUltimaTentativa(ctx.user.id);

    if (tentativa) {
      const vinculadaResult = await db.execute(sql`
        SELECT id, confirmado_em AS confirmadoEm
          FROM prova_utic_identidades
         WHERE tentativa_id = ${tentativa.id}
         LIMIT 1
      `);
      const vinculada = rowsOf<{ id: number; confirmadoEm: string }>(vinculadaResult)[0];
      return {
        necessaria: false,
        tentativaExistente: true,
        identidadeConfirmada: Boolean(vinculada),
        confirmadoEm: vinculada?.confirmadoEm ?? null,
      };
    }

    const pendente = await obterIdentidadePendente(ctx.user.id);
    return {
      necessaria: !pendente,
      tentativaExistente: false,
      identidadeConfirmada: Boolean(pendente),
      confirmadoEm: pendente?.confirmado_em ?? null,
      validadeMinutos: VALIDADE_IDENTIDADE_MINUTOS,
    };
  }),

  registrarIdentidade: assessmentProcedure
    .input(z.object({
      fotoDataUrl: z.string().min(1000).max(1_600_000),
      aceiteDeclaracao: z.literal(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await obterUltimaTentativa(ctx.user.id);
      if (tentativa) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma tentativa registrada. A identificação inicial não pode ser substituída pelo participante.",
        });
      }

      const anterioresResult = await db.execute(sql`
        SELECT id, foto_key AS fotoKey
          FROM prova_utic_identidades
         WHERE colaborador_id = ${ctx.user.id}
           AND tentativa_id IS NULL
      `);
      for (const anterior of rowsOf<{ id: number; fotoKey: string }>(anterioresResult)) {
        await storageDelete(anterior.fotoKey).catch(() => undefined);
      }
      await db.execute(sql`
        DELETE FROM prova_utic_identidades
         WHERE colaborador_id = ${ctx.user.id}
           AND tentativa_id IS NULL
      `);

      const nome = String(ctx.user.name || "Participante").trim();
      const foto = extrairFotoJpeg(input.fotoDataUrl);
      const chave = `prova-utic/identidade/${ctx.user.id}/${Date.now()}-${randomUUID()}.jpg`;
      const armazenada = await storagePut(chave, foto, "image/jpeg");
      const declaracao = declaracaoIdentidade(nome);

      try {
        await db.execute(sql`
          INSERT INTO prova_utic_identidades (
            colaborador_id, tentativa_id, nome_snapshot, foto_key, declaracao, confirmado_em
          ) VALUES (
            ${ctx.user.id}, NULL, ${nome}, ${armazenada.key}, ${declaracao}, NOW()
          )
        `);
      } catch (error) {
        await storageDelete(armazenada.key).catch(() => undefined);
        throw error;
      }

      return {
        confirmada: true,
        nome,
        declaracao,
        validadeMinutos: VALIDADE_IDENTIDADE_MINUTOS,
      };
    }),

  iniciar: assessmentProcedure.mutation(async ({ ctx }) => {
    const db = await ensureTables();
    let existente = await obterUltimaTentativa(ctx.user.id);
    existente = await normalizarExpiracaoEInatividade(existente);
    if (existente) {
      if (existente.status === "LIBERADA") {
        throw new TRPCError({ code: "CONFLICT", message: "Existe uma avaliação liberada para continuidade. Use Retomar avaliação." });
      }
      throw new TRPCError({ code: "CONFLICT", message: "Já existe uma tentativa registrada. Uma nova tentativa não pode ser iniciada pelo participante." });
    }

    const identidade = await obterIdentidadePendente(ctx.user.id);
    if (!identidade) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Antes de iniciar a avaliação, tire sua fotografia pela câmera e confirme a declaração de identidade.",
      });
    }

    const result = await db.execute(sql`
      INSERT INTO prova_utic_tentativas (colaborador_id, status, started_at, expires_at, last_activity_at)
      VALUES (${ctx.user.id}, 'EM_ANDAMENTO', NOW(), DATE_ADD(NOW(), INTERVAL ${DURACAO_TOTAL_SEGUNDOS} SECOND), NOW())
    `);
    const insertInfo: any = Array.isArray(result) ? result[0] : result;
    const id = Number(insertInfo?.insertId ?? 0);

    if (!id) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível iniciar a tentativa." });
    }

    try {
      const vinculoResult = await db.execute(sql`
        UPDATE prova_utic_identidades
           SET tentativa_id = ${id}, updated_at = NOW()
         WHERE id = ${identidade.id}
           AND colaborador_id = ${ctx.user.id}
           AND tentativa_id IS NULL
      `);
      const info: any = Array.isArray(vinculoResult) ? vinculoResult[0] : vinculoResult;
      if (Number(info?.affectedRows ?? 0) !== 1) throw new Error("Falha ao vincular identidade.");
    } catch {
      await db.execute(sql`DELETE FROM prova_utic_tentativas WHERE id = ${id} AND colaborador_id = ${ctx.user.id}`);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível vincular a confirmação de identidade à avaliação. Tente novamente.",
      });
    }

    await registrarEvento(id, "identidade_confirmada", "Fotografia capturada pela webcam e declaração de identidade vinculadas à tentativa.");
    await registrarEvento(id, "inicio", "Tentativa iniciada. Tempo total: 3 horas.");
    return { id, duracaoTotalSegundos: DURACAO_TOTAL_SEGUNDOS };
  }),

  salvarResposta: assessmentProcedure
    .input(z.object({ tentativaId: z.number().int().positive(), questaoId: z.number().int().positive(), resposta: z.string().min(1).max(5000) }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await validarTentativaDoUsuario(input.tentativaId, ctx.user.id);
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta avaliação não está disponível para respostas." });
      }
      await db.execute(sql`
        INSERT INTO prova_utic_respostas (tentativa_id, questao_id, resposta, respondida_em)
        VALUES (${input.tentativaId}, ${input.questaoId}, ${input.resposta}, NOW())
        ON DUPLICATE KEY UPDATE resposta = VALUES(resposta), respondida_em = NOW(), updated_at = NOW()
      `);
      await db.execute(sql`UPDATE prova_utic_tentativas SET last_activity_at = NOW() WHERE id = ${input.tentativaId}`);
      return { salvo: true };
    }),

  atividade: assessmentProcedure
    .input(z.object({ tentativaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await validarTentativaDoUsuario(input.tentativaId, ctx.user.id);
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") return { ativo: false, status: tentativa?.status ?? null };
      await db.execute(sql`UPDATE prova_utic_tentativas SET last_activity_at = NOW() WHERE id = ${input.tentativaId} AND status = 'EM_ANDAMENTO'`);
      return { ativo: true, status: "EM_ANDAMENTO" as const };
    }),

  bloquear: assessmentProcedure
    .input(z.object({ tentativaId: z.number().int().positive(), motivo: z.enum(["INATIVIDADE_3_MIN", "FECHAMENTO", "INTERRUPCAO_TECNICA", "SEGURANCA"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await validarTentativaDoUsuario(input.tentativaId, ctx.user.id);
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") return { bloqueada: false, status: tentativa?.status ?? null };
      await db.execute(sql`
        UPDATE prova_utic_tentativas
           SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = ${input.motivo}
         WHERE id = ${input.tentativaId} AND colaborador_id = ${ctx.user.id} AND status = 'EM_ANDAMENTO'
      `);
      await registrarEvento(input.tentativaId, "bloqueada", `Tentativa bloqueada: ${input.motivo}.`);
      return { bloqueada: true };
    }),

  finalizar: assessmentProcedure
    .input(z.object({ tentativaId: z.number().int().positive(), motivo: z.enum(["MANUAL", "CONCLUIDA", "TEMPO"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await validarTentativaDoUsuario(input.tentativaId, ctx.user.id);
      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tentativa não pode ser finalizada pelo participante." });
      }
      const novoStatus = input.motivo === "CONCLUIDA" ? "CONCLUIDA" : input.motivo === "TEMPO" ? "FINALIZADA_TEMPO" : "FINALIZADA";
      await db.execute(sql.raw(`UPDATE prova_utic_tentativas SET status = '${novoStatus}', finished_at = NOW(), block_reason = ${input.motivo === "MANUAL" ? "'FINALIZADA_PELO_PARTICIPANTE'" : input.motivo === "TEMPO" ? "'TEMPO_TOTAL'" : "NULL"} WHERE id = ${Number(input.tentativaId)} AND colaborador_id = ${Number(ctx.user.id)} AND status = 'EM_ANDAMENTO'`));
      await registrarEvento(input.tentativaId, "finalizacao", `Avaliação finalizada: ${input.motivo}.`);
      return { status: novoStatus };
    }),

  retomar: assessmentProcedure
    .input(z.object({ tentativaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await validarTentativaDoUsuario(input.tentativaId, ctx.user.id);
      if (!tentativa || tentativa.status !== "LIBERADA") {
        throw new TRPCError({ code: "FORBIDDEN", message: "A continuidade desta avaliação ainda não foi liberada pelo administrador." });
      }
      if (Date.now() >= new Date(tentativa.expires_at).getTime()) {
        await db.execute(sql`UPDATE prova_utic_tentativas SET status = 'FINALIZADA_TEMPO', finished_at = NOW(), block_reason = 'TEMPO_TOTAL' WHERE id = ${input.tentativaId}`);
        throw new TRPCError({ code: "FORBIDDEN", message: "O tempo total desta avaliação já terminou." });
      }
      await db.execute(sql`
        UPDATE prova_utic_tentativas
           SET status = 'EM_ANDAMENTO', last_activity_at = NOW(), blocked_at = NULL, block_reason = NULL
         WHERE id = ${input.tentativaId} AND colaborador_id = ${ctx.user.id} AND status = 'LIBERADA'
      `);
      const atualizada = await obterTentativaPorId(input.tentativaId);
      await registrarEvento(input.tentativaId, "retomada", "Continuidade iniciada após liberação administrativa.");
      return { retomada: true, expiresAt: atualizada?.expires_at ?? tentativa.expires_at };
    }),

  consultarIdentidade: adminProcedure
    .input(z.object({ tentativaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const result = await db.execute(sql`
        SELECT i.nome_snapshot AS nome,
               i.foto_key AS fotoKey,
               i.declaracao,
               i.confirmado_em AS confirmadoEm,
               u.email AS email
          FROM prova_utic_identidades i
          JOIN users u ON u.id = i.colaborador_id
         WHERE i.tentativa_id = ${input.tentativaId}
         LIMIT 1
      `);
      const identidade = rowsOf<any>(result)[0];
      if (!identidade) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Esta tentativa não possui registro de identidade visual." });
      }

      const foto = await storageGet(identidade.fotoKey);
      await registrarEvento(
        input.tentativaId,
        "identidade_consultada_admin",
        `Registro de identidade visual consultado pelo administrador ${ctx.user.id}.`
      );

      return {
        nome: identidade.nome,
        email: identidade.email,
        declaracao: identidade.declaracao,
        confirmadoEm: identidade.confirmadoEm,
        fotoUrl: foto.url,
        conferencia: "VISUAL_MANUAL" as const,
      };
    }),

  listarBloqueadas: adminProcedure.query(async () => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT t.id, t.colaborador_id AS colaboradorId, u.name AS colaboradorNome, t.status,
             t.started_at AS startedAt, t.expires_at AS expiresAt, t.blocked_at AS blockedAt,
             t.block_reason AS blockReason, t.last_activity_at AS lastActivityAt
        FROM prova_utic_tentativas t
        JOIN users u ON u.id = t.colaborador_id
       WHERE t.status IN ('BLOQUEADA','LIBERADA')
       ORDER BY t.updated_at DESC
    `);
    return rowsOf<any>(result);
  }),

  listarPainelAdministrativo: adminProcedure.query(async () => {
    const db = await ensureTables();

    const andamentoResult = await db.execute(sql`
      SELECT id, colaborador_id, status, started_at, expires_at, last_activity_at,
             blocked_at, block_reason, finished_at, released_at, released_by
        FROM prova_utic_tentativas
       WHERE status = 'EM_ANDAMENTO'
    `);
    for (const tentativa of rowsOf<TentativaRow>(andamentoResult)) {
      await normalizarExpiracaoEInatividade(tentativa);
    }

    const result = await db.execute(sql`
      SELECT t.id,
             t.colaborador_id AS colaboradorId,
             COALESCE(u.name, CONCAT('Empregado ', t.colaborador_id)) AS colaboradorNome,
             u.email AS colaboradorEmail,
             t.status,
             t.started_at AS startedAt,
             t.expires_at AS expiresAt,
             t.last_activity_at AS lastActivityAt,
             t.blocked_at AS blockedAt,
             t.block_reason AS blockReason,
             t.finished_at AS finishedAt,
             t.released_at AS releasedAt,
             EXISTS(SELECT 1 FROM prova_utic_identidades i WHERE i.tentativa_id = t.id) AS identidadeConfirmada,
             COUNT(r.id) AS respostasSalvas,
             CASE
               WHEN t.status = 'BLOQUEADA' AND t.block_reason = 'ADMINISTRADOR' AND t.blocked_at IS NOT NULL
                 THEN GREATEST(0, TIMESTAMPDIFF(SECOND, t.blocked_at, t.expires_at))
               WHEN t.status IN ('EM_ANDAMENTO','BLOQUEADA','LIBERADA')
                 THEN GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), t.expires_at))
               ELSE 0
             END AS segundosRestantes,
             GREATEST(0, TIMESTAMPDIFF(SECOND, t.last_activity_at, NOW())) AS segundosSemAtividade
        FROM prova_utic_tentativas t
        LEFT JOIN users u ON u.id = t.colaborador_id
        LEFT JOIN prova_utic_respostas r ON r.tentativa_id = t.id
       GROUP BY t.id, t.colaborador_id, u.name, u.email, t.status, t.started_at, t.expires_at,
                t.last_activity_at, t.blocked_at, t.block_reason, t.finished_at, t.released_at
       ORDER BY
         CASE t.status
           WHEN 'EM_ANDAMENTO' THEN 1
           WHEN 'BLOQUEADA' THEN 2
           WHEN 'LIBERADA' THEN 3
           WHEN 'CONCLUIDA' THEN 4
           WHEN 'FINALIZADA' THEN 5
           WHEN 'FINALIZADA_TEMPO' THEN 6
           WHEN 'ANULADA' THEN 7
           ELSE 8
         END,
         t.updated_at DESC
       LIMIT 200
    `);
    return rowsOf<any>(result);
  }),

  bloquearAdministrativamente: adminProcedure
    .input(z.object({ tentativaId: z.number().int().positive(), observacao: z.string().trim().max(300).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await obterTentativaPorId(input.tentativaId);
      if (!tentativa) throw new TRPCError({ code: "NOT_FOUND", message: "Tentativa não encontrada." });
      if (!["EM_ANDAMENTO", "LIBERADA"].includes(tentativa.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Somente uma avaliação em andamento ou liberada pode ser bloqueada pelo administrador." });
      }

      await db.execute(sql`
        UPDATE prova_utic_tentativas
           SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'ADMINISTRADOR',
               released_at = NULL, released_by = NULL
         WHERE id = ${input.tentativaId} AND status IN ('EM_ANDAMENTO','LIBERADA')
      `);
      const detalhe = input.observacao
        ? `Avaliação bloqueada pelo administrador ${ctx.user.id}. Observação: ${input.observacao}`
        : `Avaliação bloqueada pelo administrador ${ctx.user.id}.`;
      await registrarEvento(input.tentativaId, "bloqueada_admin", detalhe);
      return { bloqueada: true };
    }),

  liberarContinuacao: adminProcedure
    .input(z.object({ tentativaId: z.number().int().positive(), observacao: z.string().trim().max(300).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const tentativa = await obterTentativaPorId(input.tentativaId);
      if (!tentativa) throw new TRPCError({ code: "NOT_FOUND", message: "Tentativa não encontrada." });
      if (tentativa.status !== "BLOQUEADA") throw new TRPCError({ code: "BAD_REQUEST", message: "Somente tentativas bloqueadas podem ser liberadas." });

      const bloqueioAdministrativo = tentativa.block_reason === "ADMINISTRADOR" && Boolean(tentativa.blocked_at);
      if (!bloqueioAdministrativo && Date.now() >= new Date(tentativa.expires_at).getTime()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "O tempo total da avaliação já terminou; a continuidade não pode ser liberada." });
      }

      if (bloqueioAdministrativo) {
        await db.execute(sql`
          UPDATE prova_utic_tentativas
             SET status = 'LIBERADA',
                 expires_at = TIMESTAMPADD(SECOND, TIMESTAMPDIFF(SECOND, blocked_at, NOW()), expires_at),
                 released_at = NOW(), released_by = ${ctx.user.id},
                 blocked_at = NULL, block_reason = NULL
           WHERE id = ${input.tentativaId} AND status = 'BLOQUEADA'
        `);
      } else {
        await db.execute(sql`
          UPDATE prova_utic_tentativas
             SET status = 'LIBERADA', released_at = NOW(), released_by = ${ctx.user.id}
           WHERE id = ${input.tentativaId} AND status = 'BLOQUEADA'
        `);
      }

      const detalhe = input.observacao
        ? `Continuidade liberada pelo administrador ${ctx.user.id}. Observação: ${input.observacao}`
        : `Continuidade liberada pelo administrador ${ctx.user.id}.`;
      await registrarEvento(input.tentativaId, "liberada_admin", bloqueioAdministrativo
        ? `${detalhe} O período de bloqueio administrativo foi devolvido ao tempo restante da prova.`
        : detalhe);
      return { liberada: true, tempoPausadoPorAdmin: bloqueioAdministrativo };
    }),
});

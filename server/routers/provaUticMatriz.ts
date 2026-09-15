import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

async function ensureTables() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_matrizes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      colaborador_id INT NOT NULL,
      status ENUM('VALIDADA_PROVISORIA','VALIDADA_DEFINITIVA','PENDENTE_HISTORICO') NOT NULL,
      fonte TEXT NULL,
      observacao TEXT NULL,
      atualizado_por INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_prova_utic_matriz_colaborador (colaborador_id),
      INDEX idx_prova_utic_matrizes_status (status),
      CONSTRAINT fk_prova_utic_matrizes_colaborador FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_prova_utic_matrizes_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_matriz_eixos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      matriz_id INT NOT NULL,
      eixo_id VARCHAR(40) NOT NULL,
      eixo_nome VARCHAR(255) NOT NULL,
      relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_APLICAVEL','PENDENTE') NOT NULL,
      percentual_anterior DECIMAL(5,2) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_prova_utic_matriz_eixo (matriz_id, eixo_id),
      CONSTRAINT fk_prova_utic_matriz_eixos_matriz FOREIGN KEY (matriz_id) REFERENCES prova_utic_matrizes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS prova_utic_matriz_historico (
      id INT AUTO_INCREMENT PRIMARY KEY,
      matriz_id INT NOT NULL,
      eixo_id VARCHAR(40) NULL,
      valor_anterior TEXT NULL,
      valor_novo TEXT NOT NULL,
      motivo VARCHAR(255) NOT NULL,
      observacao TEXT NULL,
      alterado_por INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prova_utic_matriz_historico_matriz (matriz_id),
      CONSTRAINT fk_prova_utic_matriz_historico_matriz FOREIGN KEY (matriz_id) REFERENCES prova_utic_matrizes(id) ON DELETE CASCADE,
      CONSTRAINT fk_prova_utic_matriz_historico_usuario FOREIGN KEY (alterado_por) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  const colunaRelacaoResult = await db.execute(sql`
    SELECT COLUMN_TYPE AS columnType
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'prova_utic_matriz_eixos'
       AND COLUMN_NAME = 'relacao'
     LIMIT 1
  `);
  const colunaRelacao = rowsOf<any>(colunaRelacaoResult)[0];
  if (colunaRelacao && !String(colunaRelacao.columnType ?? "").includes("'PENDENTE'")) {
    await db.execute(sql.raw(
      "ALTER TABLE prova_utic_matriz_eixos MODIFY COLUMN relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_APLICAVEL','PENDENTE') NOT NULL",
    ));
  }

  return db;
}

export const provaUticMatrizRouter = router({
  listar: adminProcedure.query(async () => {
    const db = await ensureTables();
    const matrizesResult = await db.execute(sql`
      SELECT m.id, m.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
             u.email, u.cargo, u.departamentoId,
             d.nome AS unidadeNome,
             m.status, m.fonte, m.observacao,
             m.created_at AS createdAt, m.updated_at AS updatedAt
        FROM prova_utic_matrizes m
        JOIN users u ON u.id = m.colaborador_id
        LEFT JOIN departamentos d ON d.id = u.departamentoId
       ORDER BY COALESCE(d.nome, ''), u.name
    `);
    const matrizes = rowsOf<any>(matrizesResult);
    for (const matriz of matrizes) {
      const eixosResult = await db.execute(sql`
        SELECT id, eixo_id AS eixoId, eixo_nome AS eixo,
               relacao, percentual_anterior AS anterior
          FROM prova_utic_matriz_eixos
         WHERE matriz_id = ${matriz.id}
         ORDER BY id
      `);
      matriz.eixos = rowsOf<any>(eixosResult).map((eixo) => ({
        ...eixo,
        anterior: eixo.anterior === null ? null : Number(eixo.anterior),
      }));
    }
    return matrizes;
  }),

  listarHistorico: adminProcedure
    .input(z.object({ matrizId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await ensureTables();
      const result = await db.execute(sql`
        SELECT h.id, h.eixo_id AS eixoId,
               h.valor_anterior AS valorAnterior,
               h.valor_novo AS valorNovo,
               h.motivo, h.observacao,
               h.created_at AS createdAt,
               u.name AS alteradoPorNome
          FROM prova_utic_matriz_historico h
          JOIN users u ON u.id = h.alterado_por
         WHERE h.matriz_id = ${input.matrizId}
         ORDER BY h.created_at DESC, h.id DESC
      `);

      return rowsOf<any>(result).map((item) => {
        const parseJson = (valor: string | null) => {
          if (!valor) return null;
          try {
            return JSON.parse(valor);
          } catch {
            return valor;
          }
        };

        return {
          ...item,
          valorAnterior: parseJson(item.valorAnterior),
          valorNovo: parseJson(item.valorNovo),
        };
      });
    }),

  salvarEixo: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      eixoId: z.string().min(1).max(40),
      eixo: z.string().min(1).max(255),
      relacao: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_APLICAVEL", "PENDENTE"]),
      anterior: z.number().min(0).max(100).nullable(),
      motivo: z.string().min(3).max(255),
      observacao: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const anteriorResult = await db.execute(sql`
        SELECT eixo_nome AS eixo, relacao, percentual_anterior AS anterior
          FROM prova_utic_matriz_eixos
         WHERE matriz_id = ${input.matrizId} AND eixo_id = ${input.eixoId}
         LIMIT 1
      `);
      const anterior = rowsOf<any>(anteriorResult)[0] ?? null;
      await db.execute(sql`
        INSERT INTO prova_utic_matriz_eixos
          (matriz_id, eixo_id, eixo_nome, relacao, percentual_anterior)
        VALUES
          (${input.matrizId}, ${input.eixoId}, ${input.eixo}, ${input.relacao}, ${input.anterior})
        ON DUPLICATE KEY UPDATE
          eixo_nome = VALUES(eixo_nome),
          relacao = VALUES(relacao),
          percentual_anterior = VALUES(percentual_anterior),
          updated_at = NOW()
      `);
      await db.execute(sql`
        UPDATE prova_utic_matrizes SET atualizado_por = ${ctx.user.id}, updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);
      await db.execute(sql`
        INSERT INTO prova_utic_matriz_historico
          (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
        VALUES
          (${input.matrizId}, ${input.eixoId}, ${anterior ? JSON.stringify(anterior) : null},
           ${JSON.stringify({ eixo: input.eixo, relacao: input.relacao, anterior: input.anterior })},
           ${input.motivo}, ${input.observacao ?? null}, ${ctx.user.id})
      `);
      return { salvo: true };
    }),

  atualizarStatus: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      status: z.enum(["VALIDADA_PROVISORIA", "VALIDADA_DEFINITIVA", "PENDENTE_HISTORICO"]),
      fonte: z.string().max(2000).nullable().optional(),
      observacao: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTables();
      const anteriorResult = await db.execute(sql`
        SELECT status, fonte, observacao
          FROM prova_utic_matrizes
         WHERE id = ${input.matrizId}
         LIMIT 1
      `);
      const anterior = rowsOf<any>(anteriorResult)[0];
      if (!anterior) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Matriz do empregado não encontrada." });
      }

      const novo = {
        status: input.status,
        fonte: input.fonte ?? null,
        observacao: input.observacao ?? null,
      };
      const semAlteracao =
        anterior.status === novo.status &&
        (anterior.fonte ?? null) === novo.fonte &&
        (anterior.observacao ?? null) === novo.observacao;

      if (semAlteracao) return { atualizado: false };

      await db.execute(sql`
        UPDATE prova_utic_matrizes
           SET status = ${input.status},
               fonte = ${input.fonte ?? null},
               observacao = ${input.observacao ?? null},
               atualizado_por = ${ctx.user.id},
               updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);
      await db.execute(sql`
        INSERT INTO prova_utic_matriz_historico
          (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
        VALUES
          (${input.matrizId}, NULL, ${JSON.stringify(anterior)}, ${JSON.stringify(novo)},
           'Atualização da situação geral da matriz', ${input.observacao ?? null}, ${ctx.user.id})
      `);
      return { atualizado: true };
    }),
});

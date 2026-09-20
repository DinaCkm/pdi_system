import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export async function ensureTechnicalMatrixTables() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível.",
    });
  }

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
      relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_ESSENCIAL') NULL,
      status_classificacao ENUM('CLASSIFICADO','PENDENTE') NOT NULL DEFAULT 'PENDENTE',
      justificativa TEXT NULL,
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

  const colunasResult = await db.execute(sql`
    SELECT COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType, IS_NULLABLE AS isNullable
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'prova_utic_matriz_eixos'
  `);
  const colunas = rowsOf<any>(colunasResult);
  const porNome = new Map(colunas.map((item) => [String(item.columnName), item]));

  if (!porNome.has("status_classificacao")) {
    await db.execute(sql.raw(
      "ALTER TABLE prova_utic_matriz_eixos ADD COLUMN status_classificacao ENUM('CLASSIFICADO','PENDENTE') NOT NULL DEFAULT 'CLASSIFICADO' AFTER relacao",
    ));
  }

  if (!porNome.has("justificativa")) {
    await db.execute(sql.raw(
      "ALTER TABLE prova_utic_matriz_eixos ADD COLUMN justificativa TEXT NULL AFTER status_classificacao",
    ));
  }

  const relacao = porNome.get("relacao");
  const tipoRelacao = String(relacao?.columnType ?? "");
  const precisaMigrar =
    tipoRelacao.includes("'NAO_APLICAVEL'") ||
    tipoRelacao.includes("'PENDENTE'") ||
    !tipoRelacao.includes("'NAO_ESSENCIAL'") ||
    String(relacao?.isNullable ?? "").toUpperCase() !== "YES";

  if (precisaMigrar) {
    await db.execute(sql.raw(
      "ALTER TABLE prova_utic_matriz_eixos MODIFY COLUMN relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_ESSENCIAL','NAO_APLICAVEL','PENDENTE') NULL",
    ));

    await db.execute(sql.raw(
      "UPDATE prova_utic_matriz_eixos SET status_classificacao = 'PENDENTE', relacao = NULL WHERE relacao = 'PENDENTE'",
    ));

    await db.execute(sql.raw(
      "UPDATE prova_utic_matriz_eixos SET relacao = 'NAO_ESSENCIAL', status_classificacao = 'CLASSIFICADO' WHERE relacao = 'NAO_APLICAVEL'",
    ));

    await db.execute(sql.raw(
      "UPDATE prova_utic_matriz_eixos SET status_classificacao = 'CLASSIFICADO' WHERE relacao IN ('ESSENCIAL','TRANSVERSAL','NAO_ESSENCIAL')",
    ));

    await db.execute(sql.raw(
      "ALTER TABLE prova_utic_matriz_eixos MODIFY COLUMN relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_ESSENCIAL') NULL",
    ));
  }

  return db;
}

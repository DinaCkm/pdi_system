import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

export type StatusHomologacao =
  | "PENDENTE"
  | "EM_TESTE"
  | "TESTADA"
  | "HOMOLOGADA"
  | "INVALIDADA_POR_EDICAO"
  | "INVALIDADA_POR_PROVA"
  | "SUBSTITUIDA_POR_NOVO_TESTE";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export function gerarHashSnapshot(snapshot: unknown) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export async function ensureHomologacaoTables(db: any) {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS provas_importadas_homologacao (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prova_id INT NOT NULL,
      aplicacao_teste_id INT NULL,
      testado_por INT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
      snapshot_hash CHAR(64) NULL,
      snapshot_json LONGTEXT NULL,
      testada_em DATETIME NULL,
      homologada_em DATETIME NULL,
      homologada_por INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX provas_homologacao_prova_idx (prova_id),
      INDEX provas_homologacao_aplicacao_idx (aplicacao_teste_id),
      INDEX provas_homologacao_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));
}

export async function obterHomologacaoAtual(db: any, provaId: number) {
  const result = await db.execute(sql`
    SELECT id, prova_id AS provaId, aplicacao_teste_id AS aplicacaoTesteId,
           testado_por AS testadoPor, status, snapshot_hash AS snapshotHash,
           snapshot_json AS snapshotJson, testada_em AS testadaEm,
           homologada_em AS homologadaEm, homologada_por AS homologadaPor,
           created_at AS createdAt, updated_at AS updatedAt
      FROM provas_importadas_homologacao
     WHERE prova_id = ${provaId}
     ORDER BY id DESC
     LIMIT 1
  `);
  return rowsOf<any>(result)[0] ?? null;
}

export async function obterTestePorAplicacao(db: any, aplicacaoId: number) {
  const result = await db.execute(sql`
    SELECT id, prova_id AS provaId, aplicacao_teste_id AS aplicacaoTesteId,
           testado_por AS testadoPor, status, snapshot_hash AS snapshotHash,
           snapshot_json AS snapshotJson, testada_em AS testadaEm,
           homologada_em AS homologadaEm, homologada_por AS homologadaPor,
           created_at AS createdAt, updated_at AS updatedAt
      FROM provas_importadas_homologacao
     WHERE aplicacao_teste_id = ${aplicacaoId}
     ORDER BY id DESC
     LIMIT 1
  `);
  return rowsOf<any>(result)[0] ?? null;
}

export async function marcarPendenciaHomologacao(db: any, provaId: number) {
  const atual = await obterHomologacaoAtual(db, provaId);
  if (
    atual &&
    !["INVALIDADA_POR_EDICAO", "INVALIDADA_POR_PROVA", "SUBSTITUIDA_POR_NOVO_TESTE"].includes(String(atual.status))
  ) {
    return atual;
  }

  const result = await db.execute(sql`
    INSERT INTO provas_importadas_homologacao (prova_id, status)
    VALUES (${provaId}, 'PENDENTE')
  `);
  const info: any = Array.isArray(result) ? result[0] : result;
  return {
    id: Number(info?.insertId ?? 0),
    provaId,
    aplicacaoTesteId: null,
    testadoPor: null,
    status: "PENDENTE" as const,
    snapshotHash: null,
    snapshotJson: null,
    testadaEm: null,
    homologadaEm: null,
    homologadaPor: null,
  };
}

export async function invalidarHomologacoes(
  db: any,
  provaId: number,
  motivo: "INVALIDADA_POR_EDICAO" | "INVALIDADA_POR_PROVA" = "INVALIDADA_POR_EDICAO",
) {
  await db.execute(sql`
    UPDATE provas_importadas_homologacao
       SET status = ${motivo},
           homologada_em = NULL,
           homologada_por = NULL,
           updated_at = NOW()
     WHERE prova_id = ${provaId}
       AND status IN ('PENDENTE','EM_TESTE','TESTADA','HOMOLOGADA')
  `);
}

import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import type { Acao2025, Area2025, Resumo2025 } from "../../shared/pdi2025Planilha";

// PDI 2025: conduzido fora da plataforma e importado da planilha do ciclo 2025
// (tela Relatório do Empregado → Importar PDI 2025, só administradores).
// A importação só insere (INSERT IGNORE por chave), então reenviar a mesma planilha não duplica.

export function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export async function ensurePdi2025Tables(db: any) {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pdi_ciclo2025_resumo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      colaborador_id INT NULL,
      email VARCHAR(320) NOT NULL,
      nome VARCHAR(255) NULL,
      time_nome VARCHAR(255) NULL,
      lider_nome VARCHAR(255) NULL,
      aprovado_lider VARCHAR(20) NULL,
      total_areas INT NULL,
      nao_iniciadas INT NULL,
      em_progresso INT NULL,
      finalizadas INT NULL,
      pdi_finalizado VARCHAR(40) NULL,
      atualizado_em DATE NULL,
      UNIQUE KEY uq_pdi2025_resumo_email (email),
      KEY idx_pdi2025_resumo_colab (colaborador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pdi_ciclo2025_areas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave CHAR(32) NOT NULL,
      colaborador_id INT NULL,
      email VARCHAR(320) NOT NULL,
      area VARCHAR(255) NOT NULL,
      tipo VARCHAR(20) NULL,
      competencia VARCHAR(255) NULL,
      categoria VARCHAR(60) NULL,
      criado_em DATE NULL,
      atualizado_em DATE NULL,
      progresso VARCHAR(40) NULL,
      total_acoes INT NULL,
      finalizadas INT NULL,
      UNIQUE KEY uq_pdi2025_areas_chave (chave),
      KEY idx_pdi2025_areas_colab (colaborador_id),
      KEY idx_pdi2025_areas_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pdi_ciclo2025_acoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chave CHAR(32) NOT NULL,
      colaborador_id INT NULL,
      email VARCHAR(320) NOT NULL,
      area VARCHAR(255) NULL,
      tipo VARCHAR(20) NULL,
      competencia VARCHAR(255) NULL,
      acao VARCHAR(400) NOT NULL,
      tipo_acao VARCHAR(100) NULL,
      prazo DATE NULL,
      concluido_em DATE NULL,
      finalizada TINYINT(1) NOT NULL DEFAULT 1,
      UNIQUE KEY uq_pdi2025_acoes_chave (chave),
      KEY idx_pdi2025_acoes_colab (colaborador_id),
      KEY idx_pdi2025_acoes_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `));
}

const chave = (o: unknown) => createHash("md5").update(JSON.stringify(o)).digest("hex");

export async function importarLote2025(
  db: any,
  lote: { resumos: Resumo2025[]; areas: Area2025[]; acoes: Acao2025[] },
) {
  await ensurePdi2025Tables(db);
  let resumos = 0;
  let areas = 0;
  let acoes = 0;
  for (const r of lote.resumos) {
    const res: any = await db.execute(sql`
      INSERT IGNORE INTO pdi_ciclo2025_resumo
        (email, nome, time_nome, lider_nome, aprovado_lider, total_areas, nao_iniciadas, em_progresso, finalizadas, pdi_finalizado, atualizado_em)
      VALUES (${r.email}, ${r.nome}, ${r.time}, ${r.lider}, ${r.aprovadoLider}, ${r.totalAreas}, ${r.naoIniciadas}, ${r.emProgresso}, ${r.finalizadas}, ${r.pdiFinalizado}, ${r.atualizadoEm})
    `);
    resumos += Number(res?.[0]?.affectedRows ?? 0);
  }
  for (const a of lote.areas) {
    const res: any = await db.execute(sql`
      INSERT IGNORE INTO pdi_ciclo2025_areas
        (chave, email, area, tipo, competencia, categoria, criado_em, atualizado_em, progresso, total_acoes, finalizadas)
      VALUES (${chave(a)}, ${a.email}, ${a.area}, ${a.tipo}, ${a.competencia}, ${a.categoria}, ${a.criadoEm}, ${a.atualizadoEm}, ${a.progresso}, ${a.totalAcoes}, ${a.finalizadas})
    `);
    areas += Number(res?.[0]?.affectedRows ?? 0);
  }
  for (const a of lote.acoes) {
    const res: any = await db.execute(sql`
      INSERT IGNORE INTO pdi_ciclo2025_acoes
        (chave, email, area, tipo, competencia, acao, tipo_acao, prazo, concluido_em, finalizada)
      VALUES (${chave(a)}, ${a.email}, ${a.area}, ${a.tipo}, ${a.competencia}, ${a.acao}, ${a.tipoAcao}, ${a.prazo}, ${a.concluidoEm}, ${a.finalizada ? 1 : 0})
    `);
    acoes += Number(res?.[0]?.affectedRows ?? 0);
  }
  // Liga cada linha ao empregado pelo e-mail.
  for (const tabela of ["pdi_ciclo2025_resumo", "pdi_ciclo2025_areas", "pdi_ciclo2025_acoes"]) {
    await db.execute(sql.raw(`
      UPDATE ${tabela} t JOIN users u ON LOWER(u.email) = t.email
         SET t.colaborador_id = u.id
       WHERE t.colaborador_id IS NULL
    `));
  }
  return { resumos, areas, acoes };
}

export async function situacao2025(db: any) {
  await ensurePdi2025Tables(db);
  const [linha] = rowsOf<any>(
    await db.execute(sql`
      SELECT (SELECT COUNT(*) FROM pdi_ciclo2025_resumo) AS empregados,
             (SELECT COUNT(*) FROM pdi_ciclo2025_resumo WHERE colaborador_id IS NULL) AS semCadastro,
             (SELECT COUNT(*) FROM pdi_ciclo2025_areas) AS areas,
             (SELECT COUNT(*) FROM pdi_ciclo2025_acoes) AS acoes
    `),
  );
  const semCadastro = rowsOf<any>(
    await db.execute(sql`SELECT nome, email FROM pdi_ciclo2025_resumo WHERE colaborador_id IS NULL ORDER BY nome LIMIT 50`),
  );
  return {
    empregados: Number(linha?.empregados ?? 0),
    semCadastro: Number(linha?.semCadastro ?? 0),
    areas: Number(linha?.areas ?? 0),
    acoes: Number(linha?.acoes ?? 0),
    nomesSemCadastro: semCadastro.map((r) => String(r.nome || r.email)),
  };
}

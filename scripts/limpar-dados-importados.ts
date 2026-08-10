/**
 * Limpa as tabelas populadas pelos nossos próprios importadores (Etapa 6),
 * pra poder rodar run-import-relatorio-individual.ts de novo sem duplicar.
 *
 * SEGURO rodar: no banco de teste, essas 7 tabelas só têm dado que a gente
 * mesmo inseriu nos testes de hoje (actions/pdis estavam vazias antes,
 * confirmado - não veio nada da sincronização de produção). NÃO mexe em
 * users, departamentos, competencias_macros nem ciclos.
 *
 * Como rodar (Console do Railway, ambiente TESTE):
 *   npx tsx scripts/limpar-dados-importados.ts
 */
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ DB não conectado.");
    process.exit(1);
  }

  console.log("--- Limpando tabelas de importação (teste) ---");
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.execute(sql`TRUNCATE TABLE import_rows`);
  await db.execute(sql`TRUNCATE TABLE import_batches`);
  await db.execute(sql`TRUNCATE TABLE certification_results`);
  await db.execute(sql`TRUNCATE TABLE performance_evaluation_results`);
  await db.execute(sql`TRUNCATE TABLE performance_evaluations`);
  await db.execute(sql`TRUNCATE TABLE actions`);
  await db.execute(sql`TRUNCATE TABLE pdis`);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log("✅ Limpo. Pode rodar run-import-relatorio-individual.ts de novo com segurança.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

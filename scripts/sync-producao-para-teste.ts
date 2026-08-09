/**
 * Traz users, departamentos e competencias_macros REAIS da produção para o
 * banco de teste (só leitura na produção - nenhum UPDATE/DELETE/INSERT lá).
 * Não mexe em ciclos, pdis nem actions.
 *
 * Como rodar (Console do Railway, ambiente TESTE, serviço pdi_system):
 *
 *   PRODUCTION_DATABASE_URL='mysql://usuario:senha@host:porta/banco' npx tsx scripts/sync-producao-para-teste.ts
 *
 * A URL de produção (MYSQL_PUBLIC_URL) fica só na memória deste comando -
 * não é salva em nenhum arquivo nem commitada em lugar nenhum.
 */
import mysql from "mysql2/promise";
import { getDb } from "../server/db";
import { users, departamentos, competenciasMacros } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  const prodUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodUrl) {
    console.error("❌ Defina PRODUCTION_DATABASE_URL antes de rodar este script. Abortando.");
    process.exit(1);
  }

  console.log("--- Conectando na PRODUÇÃO (somente leitura) ---");
  const prodConn = await mysql.createConnection(prodUrl);

  console.log("--- Conectando no TESTE ---");
  const testeDb = await getDb();
  if (!testeDb) {
    console.error("❌ DB de teste não conectado. Abortando.");
    process.exit(1);
  }

  const [prodUsers] = await prodConn.query("SELECT * FROM users");
  const [prodDepartamentos] = await prodConn.query("SELECT * FROM departamentos");
  const [prodMacros] = await prodConn.query("SELECT * FROM competencias_macros");

  console.log(`Lido da produção: ${(prodUsers as any[]).length} users, ${(prodDepartamentos as any[]).length} departamentos, ${(prodMacros as any[]).length} competencias_macros`);

  await prodConn.end();
  console.log("--- Conexão com produção encerrada (só leitura, nada foi alterado lá) ---");

  console.log("\n--- Limpando dados de teste (placeholder) ---");
  await testeDb.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await testeDb.execute(sql`TRUNCATE TABLE users`);
  await testeDb.execute(sql`TRUNCATE TABLE departamentos`);
  await testeDb.execute(sql`TRUNCATE TABLE competencias_macros`);
  await testeDb.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log("--- Inserindo dados reais no teste ---");
  if ((prodDepartamentos as any[]).length) {
    await testeDb.insert(departamentos).values(prodDepartamentos as any[]);
  }
  if ((prodMacros as any[]).length) {
    await testeDb.insert(competenciasMacros).values(prodMacros as any[]);
  }
  if ((prodUsers as any[]).length) {
    // Em lotes de 200 pra não estourar limite de placeholders do driver
    const lote = 200;
    const linhas = prodUsers as any[];
    for (let i = 0; i < linhas.length; i += lote) {
      await testeDb.insert(users).values(linhas.slice(i, i + lote));
      console.log(`  users: ${Math.min(i + lote, linhas.length)}/${linhas.length}`);
    }
  }

  console.log("\n✅ Sincronização concluída.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

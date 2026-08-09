import { getDb } from "../server/db";
import { competenciasMacros, users, importRows } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ DB não conectado.");
    process.exit(1);
  }

  const macros = await db.select().from(competenciasMacros);
  console.log(`\n=== competencias_macros: ${macros.length} linha(s) ===`);
  macros.slice(0, 10).forEach((m: any) => console.log(`  - id=${m.id} "${m.nome}"`));
  if (macros.length > 10) console.log(`  ... e mais ${macros.length - 10}`);

  const [{ count: totalUsuarios }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  console.log(`\n=== users: ${totalUsuarios} linha(s) totais ===`);

  // Amostra de 5 linhas bloqueadas do lote mais recente de cada tipo, pra ver o motivo real
  const bloqueadas = await db
    .select({ importBatchId: importRows.importBatchId, erro: importRows.erro })
    .from(importRows)
    .where(eq(importRows.status, "bloqueado_revisao"))
    .limit(15);

  console.log(`\n=== Amostra de erros de linhas bloqueadas ===`);
  bloqueadas.forEach((b: any) => console.log(`  [batch ${b.importBatchId}] ${b.erro}`));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

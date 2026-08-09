import { getDb } from "../server/db";
import { competenciasMacros, users, importRows, importBatches } from "../drizzle/schema";
import { eq, sql, inArray, desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ DB não conectado.");
    process.exit(1);
  }

  const macros = await db.select().from(competenciasMacros);
  console.log(`\n=== competencias_macros: ${macros.length} linha(s) TOTAIS ===`);
  macros.forEach((m: any) => console.log(`  - id=${m.id} "${m.nome}"`));

  const [{ count: totalUsuarios }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  console.log(`\n=== users: ${totalUsuarios} linha(s) totais ===`);

  // Pega os 5 lotes de importação mais recentes
  const lotesRecentes = await db
    .select()
    .from(importBatches)
    .orderBy(desc(importBatches.id))
    .limit(5);
  console.log(`\n=== Últimos ${lotesRecentes.length} lotes de importação ===`);
  lotesRecentes.forEach((l: any) =>
    console.log(`  batch ${l.id} | tipo=${l.tipo} | ok=${l.linhasOk} erro=${l.linhasErro} bloqueadas=${l.linhasBloqueadas}`)
  );

  const idsRecentes = lotesRecentes.map((l: any) => l.id);

  const bloqueadas = await db
    .select({ importBatchId: importRows.importBatchId, status: importRows.status, erro: importRows.erro })
    .from(importRows)
    .where(inArray(importRows.importBatchId, idsRecentes))
    .orderBy(desc(importRows.id))
    .limit(2000);

  // Agrupa por mensagem de erro "normalizada" (removendo o nome específico) pra ver os padrões
  const contagem = new Map<string, number>();
  for (const b of bloqueadas) {
    const chave = String(b.erro ?? "").replace(/"[^"]*"/g, '"X"');
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  console.log(`\n=== Padrões de erro nos últimos lotes (${bloqueadas.length} linhas analisadas) ===`);
  [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([msg, n]) => console.log(`  ${n}x  ${msg}`));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

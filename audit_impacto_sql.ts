import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
    const db = await getDb();
    if (!db) return;

    console.log("--- AUDITORIA DE IMPACTO PRÁTICO ---");

    // 1. Média Geral
    const geral = await db.execute(sql`
        SELECT AVG(CAST(impactoPercentual AS UNSIGNED)) as media 
        FROM evidences 
        WHERE status = 'aprovada'
    `);
    console.log("Média Geral (Banco):", geral[0]);

    // 2. Distribuição de Notas
    const dist = await db.execute(sql`
        SELECT impactoPercentual, COUNT(*) as qtd 
        FROM evidences 
        WHERE status = 'aprovada' 
        GROUP BY impactoPercentual 
        ORDER BY impactoPercentual DESC
    `);
    console.log("\nDistribuição de Notas:");
    console.table(dist[0]);

    // 3. Notas Recentes (Últimos 15 dias)
    const recentes = await db.execute(sql`
        SELECT impactoPercentual, updatedAt 
        FROM evidences 
        WHERE status = 'aprovada' 
        AND updatedAt >= DATE_SUB(NOW(), INTERVAL 15 DAY)
        ORDER BY updatedAt DESC
    `);
    console.log("\nAprovações nos últimos 15 dias:", recentes[0]);

    process.exit(0);
}

run();

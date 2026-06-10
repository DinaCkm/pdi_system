import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
    const db = await getDb();
    if (!db) return;

    console.log("--- AUDITORIA DE STATUS DO BANCO ---");

    // 1. Status de Evidências
    const evStatus = await db.execute(sql`SELECT status, COUNT(*) as qtd FROM evidences GROUP BY status`);
    console.log("\nStatus de Evidências:");
    console.table(evStatus[0]);

    // 2. Status de Solicitações
    const solStatus = await db.execute(sql`SELECT statusGeral, COUNT(*) as qtd FROM solicitacoes_acoes GROUP BY statusGeral`);
    console.log("\nStatus de Solicitações:");
    console.table(solStatus[0]);

    // 3. Status de Ajustes
    const ajStatus = await db.execute(sql`SELECT status, COUNT(*) as qtd FROM adjustment_requests GROUP BY status`);
    console.log("\nStatus de Ajustes:");
    console.table(ajStatus[0]);

    process.exit(0);
}

run();

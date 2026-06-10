import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

async function run() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL não encontrada no .env");
        return;
    }

    const db = drizzle(dbUrl);
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
        ORDER BY CAST(impactoPercentual AS UNSIGNED) DESC
    `);
    console.log("\nDistribuição de Notas:");
    console.table(dist[0]);

    // 3. Comparação: Últimos 15 dias vs Anterior
    const recentes = await db.execute(sql`
        SELECT AVG(CAST(impactoPercentual AS UNSIGNED)) as mediaRecente
        FROM evidences 
        WHERE status = 'aprovada' 
        AND updatedAt >= DATE_SUB(NOW(), INTERVAL 15 DAY)
    `);
    
    const anteriores = await db.execute(sql`
        SELECT AVG(CAST(impactoPercentual AS UNSIGNED)) as mediaAnterior
        FROM evidences 
        WHERE status = 'aprovada' 
        AND updatedAt < DATE_SUB(NOW(), INTERVAL 15 DAY)
    `);

    console.log("\nComparação de Períodos:");
    console.log("Média nos últimos 15 dias:", recentes[0][0].mediaRecente);
    console.log("Média antes dos últimos 15 dias:", anteriores[0][0].mediaAnterior);

    process.exit(0);
}

run();

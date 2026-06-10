import { getDb } from "./server/db";
import { evidences } from "./drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
    const db = await getDb();
    if (!db) {
        console.log("DB não disponível. Certifique-se de que o DATABASE_URL está definido.");
        return;
    }

    console.log("--- DIAGNÓSTICO DE IMPACTO PRÁTICO ---");

    // Buscar todas as evidências aprovadas
    const aprovadas = await db.select({
        id: evidences.id,
        impacto: evidences.impactoPercentual,
        updatedAt: evidences.updatedAt,
        status: evidences.status
    })
    .from(evidences)
    .where(eq(evidences.status, 'aprovada'));

    console.log(`Total de evidências aprovadas: ${aprovadas.length}`);

    if (aprovadas.length > 0) {
        const notas = aprovadas.map(a => Number(a.impacto) || 0);
        const media = notas.reduce((acc, curr) => acc + curr, 0) / notas.length;
        console.log(`Média Geral Calculada: ${media.toFixed(2)}%`);

        // Distribuição
        const dist: Record<number, number> = {};
        notas.forEach(n => dist[n] = (dist[n] || 0) + 1);
        console.log("\nDistribuição de Notas:");
        console.table(dist);

        // Verificação de queda recente (últimos 15 dias)
        const quinzeDiasAtras = new Date();
        quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);

        const recentes = aprovadas.filter(a => a.updatedAt && new Date(a.updatedAt) >= quinzeDiasAtras);
        const antigas = aprovadas.filter(a => !a.updatedAt || new Date(a.updatedAt) < quinzeDiasAtras);

        if (recentes.length > 0) {
            const mediaRecente = recentes.reduce((acc, curr) => acc + (Number(curr.impacto) || 0), 0) / recentes.length;
            console.log(`\nMédia dos últimos 15 dias (${recentes.length} evidências): ${mediaRecente.toFixed(2)}%`);
        } else {
            console.log("\nNenhuma evidência aprovada nos últimos 15 dias.");
        }

        if (antigas.length > 0) {
            const mediaAntiga = antigas.reduce((acc, curr) => acc + (Number(curr.impacto) || 0), 0) / antigas.length;
            console.log(`Média anterior aos últimos 15 dias (${antigas.length} evidências): ${mediaAntiga.toFixed(2)}%`);
        }
    }

    process.exit(0);
}

run();

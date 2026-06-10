const { getDb } = require('./dist/db.js'); // Tentando carregar do dist se existir
const { evidences } = require('./drizzle/schema.js');

async function auditImpacto() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("DB não disponível");
      return;
    }

    const res = await db.execute('SELECT impactoPercentual, status, actionId FROM evidences WHERE status = "aprovada"');
    const rows = res[0];

    console.log(`Total de evidências aprovadas: ${rows.length}`);
    
    if (rows.length === 0) {
      console.log("Nenhuma evidência aprovada encontrada.");
      return;
    }

    const notas = rows.map(r => Number(r.impactoPercentual) || 0);
    const soma = notas.reduce((a, b) => a + b, 0);
    const media = soma / notas.length;

    console.log("Distribuição de notas:");
    const distribuicao = {};
    notas.forEach(n => {
      distribuicao[n] = (distribuicao[n] || 0) + 1;
    });
    console.table(distribuicao);

    console.log(`\nMédia calculada manualmente: ${media.toFixed(2)}%`);
    
    // Verificar as últimas 10 para ver se houve queda recente
    const ultimas = rows.slice(-10);
    console.log("\nÚltimas 10 notas aprovadas:");
    console.table(ultimas);

  } catch (err) {
    console.error("Erro na auditoria:", err);
  }
}

auditImpacto();

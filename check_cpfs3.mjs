import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

// CPFs da lista fornecida (alguns exemplos que não foram encontrados)
const cpfsNaoEncontrados = [
  '151959097', '702288175', '888269101', '925595137', 
  '3313815160', '3331188121', '64385647100', '85624314191', '86622536104'
];

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os CPFs do banco
  const result = await db.execute(sql`SELECT cpf, name FROM users WHERE cpf IS NOT NULL`);
  const rows = result[0];
  
  console.log('\n=== TODOS OS CPFs NO BANCO ===');
  const cpfsBanco = [];
  for (const row of rows) {
    if (row.cpf) {
      const cpfLimpo = row.cpf.replace(/\D/g, '');
      cpfsBanco.push({ original: row.cpf, limpo: cpfLimpo, nome: row.name });
    }
  }
  
  // Ordenar por CPF como string com padding
  cpfsBanco.sort((a, b) => a.limpo.padStart(11, '0').localeCompare(b.limpo.padStart(11, '0')));
  
  // Mostrar todos os CPFs do banco
  console.log('\nCPFs no banco (ordenados):');
  for (const { original, limpo, nome } of cpfsBanco) {
    console.log(`${limpo.padStart(11, '0')} (stored: "${original}") -> ${nome}`);
  }
  
  console.log('\n\n=== VERIFICAÇÃO DOS CPFs NÃO ENCONTRADOS ===');
  for (const cpfBusca of cpfsNaoEncontrados) {
    console.log(`\nBuscando: ${cpfBusca} (padded: ${cpfBusca.padStart(11, '0')})`);
    
    let encontrado = false;
    for (const { original, limpo, nome } of cpfsBanco) {
      const cpfBuscaPadded = cpfBusca.padStart(11, '0');
      const cpfBancoPadded = limpo.padStart(11, '0');
      
      // Comparação direta com padding
      if (cpfBuscaPadded === cpfBancoPadded) {
        console.log(`  ✅ ENCONTRADO! Banco: ${limpo} (${original}) -> ${nome}`);
        encontrado = true;
        break;
      }
    }
    
    if (!encontrado) {
      console.log(`  ❌ NÃO encontrado no banco`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);

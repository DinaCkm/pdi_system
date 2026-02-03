import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Ler o arquivo CSV
  const csvContent = fs.readFileSync('/home/ubuntu/upload/lote_completo_leonardo_utf8.csv', 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  console.log(`Total de linhas (incluindo cabeçalho): ${lines.length}`);
  
  // Verificar CPF
  const cpf = '88020673253';
  const userResult = await db.execute(sql`SELECT id, name, cpf FROM users WHERE cpf = ${cpf}`);
  
  if (userResult[0].length === 0) {
    console.log(`\n❌ CPF ${cpf} NÃO encontrado no banco!`);
    process.exit(1);
  }
  
  const user = userResult[0][0];
  console.log(`\n✅ Usuário encontrado: ${user.name} (ID: ${user.id})`);
  
  // Verificar PDI
  const pdiResult = await db.execute(sql`
    SELECT p.id, c.nome as ciclo 
    FROM pdis p 
    JOIN ciclos c ON p.cicloId = c.id 
    WHERE p.colaboradorId = ${user.id} AND c.nome = '2026/1'
  `);
  
  if (pdiResult[0].length === 0) {
    console.log(`\n❌ Usuário não tem PDI no ciclo 2026/1!`);
    process.exit(1);
  }
  
  console.log(`✅ PDI encontrado (ID: ${pdiResult[0][0].id})`);
  
  // Verificar macrocompetências
  const macrosNoArquivo = new Set();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length >= 3) {
      macrosNoArquivo.add(parts[2]);
    }
  }
  
  console.log(`\n=== Macrocompetências no arquivo ===`);
  for (const macro of macrosNoArquivo) {
    const macroResult = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE nome = ${macro}`);
    if (macroResult[0].length === 0) {
      console.log(`❌ "${macro}" - NÃO encontrada`);
    } else {
      console.log(`✅ "${macro}" - OK`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);

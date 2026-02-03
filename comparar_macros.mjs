import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler o arquivo CSV do usuário
const csvContent = fs.readFileSync('/home/ubuntu/upload/acoes_ultimo_formatado.csv', 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());

console.log(`Total de linhas no arquivo: ${lines.length}`);

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar macrocompetências do banco
  const macrosResult = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE ativo = 1`);
  const macrosRows = macrosResult[0];
  
  console.log(`\n=== MACROCOMPETÊNCIAS NO BANCO (${macrosRows.length}) ===`);
  const macrosBanco = new Map();
  for (const row of macrosRows) {
    const nomeNormalizado = row.nome?.toLowerCase().trim();
    macrosBanco.set(nomeNormalizado, row.nome);
    console.log(`- "${row.nome}"`);
  }
  
  // Extrair macros do arquivo
  console.log(`\n=== MACROCOMPETÊNCIAS NO ARQUIVO ===`);
  const macrosArquivo = new Map(); // macro -> linhas
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length >= 3) {
      const macro = parts[2];
      if (!macrosArquivo.has(macro)) {
        macrosArquivo.set(macro, []);
      }
      macrosArquivo.get(macro).push(i + 1);
    }
  }
  
  console.log(`Macrocompetências únicas no arquivo: ${macrosArquivo.size}`);
  
  // Verificar quais macros não existem
  const macrosNaoExistem = [];
  const macrosExistem = [];
  
  for (const [macro, linhas] of macrosArquivo) {
    const macroNormalizado = macro?.toLowerCase().trim();
    if (macrosBanco.has(macroNormalizado)) {
      macrosExistem.push({ macro, linhas: linhas.length });
    } else {
      macrosNaoExistem.push({ macro, linhas });
    }
  }
  
  console.log(`\n✅ Macrocompetências encontradas: ${macrosExistem.length}`);
  console.log(`❌ Macrocompetências NÃO encontradas: ${macrosNaoExistem.length}`);
  
  if (macrosNaoExistem.length > 0) {
    console.log(`\n=== MACROCOMPETÊNCIAS NÃO ENCONTRADAS ===`);
    for (const { macro, linhas } of macrosNaoExistem) {
      console.log(`\n❌ "${macro}"`);
      console.log(`   Linhas afetadas (${linhas.length}): ${linhas.slice(0, 10).join(', ')}${linhas.length > 10 ? '...' : ''}`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);

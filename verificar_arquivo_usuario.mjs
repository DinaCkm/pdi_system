import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler o arquivo CSV do usuário
const csvContent = fs.readFileSync('/home/ubuntu/upload/acoes_ultimo_formatado.csv', 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());

console.log(`Total de linhas no arquivo: ${lines.length}`);
console.log(`Cabeçalho: ${lines[0]}`);

// Extrair CPFs únicos (pular cabeçalho)
const cpfsArquivo = new Map(); // cpf -> linhas
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const cpf = line.split(';')[0];
  if (cpf) {
    if (!cpfsArquivo.has(cpf)) {
      cpfsArquivo.set(cpf, []);
    }
    cpfsArquivo.get(cpf).push(i + 1); // linha no arquivo (1-indexed)
  }
}

console.log(`\nCPFs únicos no arquivo: ${cpfsArquivo.size}`);

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os CPFs do banco
  const result = await db.execute(sql`SELECT cpf, name, email FROM users WHERE cpf IS NOT NULL`);
  const rows = result[0];
  
  // Criar mapa de CPFs do banco (com e sem zeros à esquerda)
  const cpfsBanco = new Map();
  for (const row of rows) {
    if (row.cpf) {
      const cpfLimpo = row.cpf.replace(/\D/g, '');
      cpfsBanco.set(cpfLimpo, { nome: row.name, email: row.email, cpfOriginal: row.cpf });
      // Também adicionar versão com padding
      const cpfPadded = cpfLimpo.padStart(11, '0');
      cpfsBanco.set(cpfPadded, { nome: row.name, email: row.email, cpfOriginal: row.cpf });
    }
  }
  
  console.log(`CPFs no banco: ${rows.length}`);
  
  // Verificar quais CPFs existem
  const naoExistem = [];
  
  for (const [cpf, linhas] of cpfsArquivo) {
    const cpfPadded = cpf.padStart(11, '0');
    const cpfSemZeros = cpf.replace(/^0+/, '');
    
    if (!cpfsBanco.has(cpf) && !cpfsBanco.has(cpfPadded) && !cpfsBanco.has(cpfSemZeros)) {
      naoExistem.push({ cpf, linhas });
    }
  }
  
  console.log(`\nCPFs NÃO encontrados: ${naoExistem.length}`);
  
  if (naoExistem.length > 0) {
    console.log(`\n=== CPFs NÃO ENCONTRADOS ===`);
    for (const { cpf, linhas } of naoExistem) {
      console.log(`CPF: ${cpf} (${cpf.padStart(11, '0')}) - Linhas: ${linhas.join(', ')}`);
    }
  }
  
  // Verificar macrocompetências
  console.log(`\n=== VERIFICANDO MACROCOMPETÊNCIAS ===`);
  const macrosResult = await db.execute(sql`SELECT id, name FROM macro_competencies`);
  const macrosRows = macrosResult[0];
  
  const macrosBanco = new Set();
  for (const row of macrosRows) {
    macrosBanco.add(row.name);
  }
  
  console.log(`Macrocompetências no banco: ${macrosBanco.size}`);
  
  // Extrair macros do arquivo
  const macrosArquivo = new Set();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length >= 3) {
      macrosArquivo.add(parts[2]); // macroNome é a 3ª coluna
    }
  }
  
  console.log(`Macrocompetências no arquivo: ${macrosArquivo.size}`);
  
  // Verificar quais macros não existem
  const macrosNaoExistem = [];
  for (const macro of macrosArquivo) {
    if (!macrosBanco.has(macro)) {
      macrosNaoExistem.push(macro);
    }
  }
  
  if (macrosNaoExistem.length > 0) {
    console.log(`\n=== MACROCOMPETÊNCIAS NÃO ENCONTRADAS (${macrosNaoExistem.length}) ===`);
    for (const macro of macrosNaoExistem) {
      console.log(`- "${macro}"`);
    }
  } else {
    console.log(`\n✅ Todas as macrocompetências existem no banco!`);
  }
  
  process.exit(0);
}

main().catch(console.error);

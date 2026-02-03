import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler CPFs do arquivo CSV gerado
const csvContent = fs.readFileSync('/home/ubuntu/acoes_para_importar.csv', 'utf-8');
const lines = csvContent.split('\n').slice(1).filter(l => l.trim()); // Pular cabeçalho

// Extrair CPFs únicos
const cpfsArquivo = new Set();
for (const line of lines) {
  const cpf = line.split(';')[0];
  if (cpf) cpfsArquivo.add(cpf);
}

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os CPFs do banco
  const result = await db.execute(sql`SELECT cpf, name, email FROM users WHERE cpf IS NOT NULL`);
  const rows = result[0];
  
  // Criar mapa de CPFs do banco
  const cpfsBanco = new Map();
  for (const row of rows) {
    if (row.cpf) {
      const cpfLimpo = row.cpf.replace(/\D/g, '').padStart(11, '0');
      cpfsBanco.set(cpfLimpo, { nome: row.name, email: row.email });
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`CPFs únicos no arquivo: ${cpfsArquivo.size}`);
  console.log(`CPFs no banco: ${cpfsBanco.size}`);
  
  // Verificar quais CPFs existem
  const existem = [];
  const naoExistem = [];
  
  for (const cpf of cpfsArquivo) {
    const cpfPadded = cpf.padStart(11, '0');
    if (cpfsBanco.has(cpfPadded)) {
      existem.push({ cpf, ...cpfsBanco.get(cpfPadded) });
    } else {
      naoExistem.push(cpf);
    }
  }
  
  console.log(`CPFs encontrados no banco: ${existem.length}`);
  console.log(`CPFs NÃO encontrados: ${naoExistem.length}`);
  
  if (naoExistem.length > 0) {
    console.log(`\n=== CPFs NÃO ENCONTRADOS (${naoExistem.length}) ===`);
    for (const cpf of naoExistem) {
      console.log(cpf);
    }
  } else {
    console.log(`\n✅ TODOS os CPFs do arquivo existem no banco de dados!`);
  }
  
  process.exit(0);
}

main().catch(console.error);

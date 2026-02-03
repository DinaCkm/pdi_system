import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler emails do arquivo
const emailsText = fs.readFileSync('/home/ubuntu/upload/pasted_content.txt', 'utf-8');
const emailsLista = [...new Set(emailsText.split('\n').map(e => e.trim().toLowerCase()).filter(e => e))];

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os emails do banco
  const result = await db.execute(sql`SELECT email, cpf, name FROM users WHERE email IS NOT NULL`);
  const rows = result[0];
  
  // Criar mapa de emails do banco
  const emailsBanco = new Map();
  for (const row of rows) {
    if (row.email) {
      emailsBanco.set(row.email.toLowerCase(), { cpf: row.cpf, nome: row.name });
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Total de emails únicos na lista: ${emailsLista.length}`);
  console.log(`Total de emails no banco: ${emailsBanco.size}`);
  
  // Verificar quais emails existem
  const existem = [];
  const naoExistem = [];
  
  for (const email of emailsLista) {
    if (emailsBanco.has(email)) {
      const { cpf, nome } = emailsBanco.get(email);
      existem.push({ email, cpf, nome });
    } else {
      naoExistem.push(email);
    }
  }
  
  console.log(`Emails encontrados no banco: ${existem.length}`);
  console.log(`Emails NÃO encontrados: ${naoExistem.length}`);
  
  if (naoExistem.length > 0) {
    console.log(`\n=== EMAILS NÃO ENCONTRADOS (${naoExistem.length}) ===`);
    for (const email of naoExistem) {
      console.log(email);
    }
  }
  
  if (existem.length > 0) {
    console.log(`\n=== EMAILS ENCONTRADOS (${existem.length}) ===`);
    for (const { email, cpf, nome } of existem) {
      console.log(`${email} -> CPF: ${cpf} -> ${nome}`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);

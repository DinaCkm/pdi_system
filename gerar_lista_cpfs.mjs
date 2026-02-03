import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler emails do arquivo (mantendo ordem e repetições)
const emailsText = fs.readFileSync('/home/ubuntu/upload/pasted_content.txt', 'utf-8');
const emailsLista = emailsText.split('\n').map(e => e.trim().toLowerCase()).filter(e => e);

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
  
  // Gerar lista com CPFs na mesma ordem
  let output = 'email;cpf;nome\n';
  
  for (const email of emailsLista) {
    if (emailsBanco.has(email)) {
      const { cpf, nome } = emailsBanco.get(email);
      output += `${email};${cpf};${nome}\n`;
    } else {
      output += `${email};NAO_ENCONTRADO;NAO_ENCONTRADO\n`;
    }
  }
  
  // Salvar arquivo
  fs.writeFileSync('/home/ubuntu/lista_emails_com_cpfs.csv', output);
  console.log('Arquivo salvo em: /home/ubuntu/lista_emails_com_cpfs.csv');
  console.log(`Total de linhas: ${emailsLista.length}`);
  
  process.exit(0);
}

main().catch(console.error);

import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler o arquivo CSV corrigido
const csvContent = fs.readFileSync('/home/ubuntu/acoes_corrigidas_utf8bom.csv', 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os usuários por CPF
  const usersResult = await db.execute(sql`SELECT id, cpf, name FROM users WHERE cpf IS NOT NULL`);
  const usersRows = usersResult[0];
  
  const usersByCpf = new Map();
  for (const row of usersRows) {
    const cpfLimpo = row.cpf?.replace(/\D/g, '');
    usersByCpf.set(cpfLimpo, { id: row.id, nome: row.name });
  }
  
  // Buscar PDIs
  const pdisResult = await db.execute(sql`SELECT id, colaboradorId, cicloId FROM pdis`);
  const pdisRows = pdisResult[0];
  const pdisByUser = new Map();
  for (const row of pdisRows) {
    if (!pdisByUser.has(row.colaboradorId)) {
      pdisByUser.set(row.colaboradorId, []);
    }
    pdisByUser.get(row.colaboradorId).push(row);
  }
  
  // Verificar cada linha
  const erros = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length < 3) continue;
    
    const cpf = parts[0];
    const cpfLimpo = cpf?.replace(/\D/g, '');
    const user = usersByCpf.get(cpfLimpo);
    
    if (!user) {
      erros.push({ linha: i + 1, cpf, motivo: 'Usuário não encontrado' });
      continue;
    }
    
    const pdis = pdisByUser.get(user.id) || [];
    if (pdis.length === 0) {
      erros.push({ linha: i + 1, cpf, nome: user.nome, motivo: 'Usuário sem PDI' });
    }
  }
  
  console.log(`\n=== LINHAS COM ERRO (${erros.length}) ===`);
  for (const erro of erros) {
    console.log(`Linha ${erro.linha}: CPF ${erro.cpf} - ${erro.nome || ''} - ${erro.motivo}`);
  }
  
  // Listar CPFs únicos com erro
  const cpfsErro = [...new Set(erros.map(e => e.cpf))];
  console.log(`\n=== CPFs ÚNICOS COM ERRO (${cpfsErro.length}) ===`);
  for (const cpf of cpfsErro) {
    console.log(cpf);
  }
  
  process.exit(0);
}

main().catch(console.error);

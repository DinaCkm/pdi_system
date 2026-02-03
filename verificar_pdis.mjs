import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler o arquivo CSV do usuário
const csvContent = fs.readFileSync('/home/ubuntu/upload/acoes_ultimo_formatado.csv', 'utf-8');
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
  
  // Buscar todos os PDIs
  const pdisResult = await db.execute(sql`SELECT id, colaboradorId, cicloId FROM pdis`);
  const pdisRows = pdisResult[0];
  
  const pdisByUserId = new Map();
  for (const row of pdisRows) {
    if (!pdisByUserId.has(row.colaboradorId)) {
      pdisByUserId.set(row.colaboradorId, []);
    }
    pdisByUserId.get(row.colaboradorId).push(row);
  }
  
  // Buscar ciclos
  const ciclosResult = await db.execute(sql`SELECT id, nome FROM ciclos`);
  const ciclosRows = ciclosResult[0];
  const ciclosByNome = new Map();
  for (const row of ciclosRows) {
    ciclosByNome.set(row.nome?.toLowerCase().trim(), row.id);
  }
  
  console.log(`Usuários no banco: ${usersRows.length}`);
  console.log(`PDIs no banco: ${pdisRows.length}`);
  console.log(`Ciclos no banco: ${ciclosRows.length}`);
  console.log(`Ciclos:`, Array.from(ciclosByNome.keys()));
  
  // Verificar cada linha do arquivo
  const semPdi = [];
  const cpfsUnicos = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length < 3) continue;
    
    const cpf = parts[0];
    const cicloNome = parts[1];
    
    const cpfLimpo = cpf?.replace(/\D/g, '');
    const user = usersByCpf.get(cpfLimpo);
    
    if (!user) continue; // Já verificamos que todos os CPFs existem
    
    const pdis = pdisByUserId.get(user.id) || [];
    
    // Verificar se tem PDI para o ciclo especificado
    const cicloId = ciclosByNome.get(cicloNome?.toLowerCase().trim());
    
    if (pdis.length === 0) {
      if (!cpfsUnicos.has(cpfLimpo)) {
        cpfsUnicos.add(cpfLimpo);
        semPdi.push({ linha: i + 1, cpf, nome: user.nome, ciclo: cicloNome, userId: user.id });
      }
    } else if (cicloId) {
      const temPdiNoCiclo = pdis.some(p => p.cicloId === cicloId);
      if (!temPdiNoCiclo && !cpfsUnicos.has(cpfLimpo + '_' + cicloNome)) {
        cpfsUnicos.add(cpfLimpo + '_' + cicloNome);
        semPdi.push({ linha: i + 1, cpf, nome: user.nome, ciclo: cicloNome, userId: user.id, temOutroPdi: true });
      }
    }
  }
  
  console.log(`\n=== USUÁRIOS SEM PDI PARA O CICLO ESPECIFICADO (${semPdi.length}) ===`);
  for (const item of semPdi) {
    console.log(`Linha ${item.linha}: ${item.nome} (CPF: ${item.cpf}) - Ciclo: ${item.ciclo}${item.temOutroPdi ? ' (tem PDI em outro ciclo)' : ' (sem nenhum PDI)'}`);
  }
  
  process.exit(0);
}

main().catch(console.error);

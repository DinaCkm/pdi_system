import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar IDs dos usuários
  const usersResult = await db.execute(sql`SELECT id, name, cpf FROM users WHERE cpf IN ('58571478134', '49954237372')`);
  const users = usersResult[0];
  console.log('Usuários encontrados:');
  for (const u of users) {
    console.log(`  ID: ${u.id}, Nome: ${u.name}, CPF: ${u.cpf}`);
  }
  
  // Buscar ID do ciclo 2026/1
  const cicloResult = await db.execute(sql`SELECT id, nome FROM ciclos WHERE nome = '2026/1'`);
  const ciclo = cicloResult[0][0];
  console.log(`\nCiclo: ID ${ciclo.id}, Nome: ${ciclo.nome}`);
  
  // Buscar líderes dos usuários
  const lidersResult = await db.execute(sql`SELECT id, liderId FROM users WHERE cpf IN ('58571478134', '49954237372')`);
  const liders = lidersResult[0];
  
  // Inserir PDIs
  for (const user of users) {
    const liderInfo = liders.find(l => l.id === user.id);
    const liderId = liderInfo?.liderId || null;
    
    console.log(`\nCriando PDI para ${user.name} (ID: ${user.id}, Líder: ${liderId})...`);
    
    await db.execute(sql`
      INSERT INTO pdis (colaboradorId, cicloId, liderId, status, createdAt, updatedAt)
      VALUES (${user.id}, ${ciclo.id}, ${liderId}, 'em_andamento', NOW(), NOW())
    `);
    
    console.log(`  ✅ PDI criado com sucesso!`);
  }
  
  // Verificar PDIs criados
  const pdisResult = await db.execute(sql`SELECT id, colaboradorId, cicloId FROM pdis WHERE colaboradorId IN (SELECT id FROM users WHERE cpf IN ('58571478134', '49954237372'))`);
  console.log(`\nPDIs criados:`, pdisResult[0]);
  
  process.exit(0);
}

main().catch(console.error);

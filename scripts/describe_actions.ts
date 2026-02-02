import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Estrutura da tabela actions
  const [columns] = await db.execute(sql`DESCRIBE actions`);
  console.log('=== ESTRUTURA DA TABELA ACTIONS ===');
  console.log(JSON.stringify(columns, null, 2));
  
  // Verificar competencias macros
  const [macros] = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE ativo = 1 ORDER BY nome`);
  console.log('\n=== COMPETENCIAS MACRO DISPONIVEIS ===');
  (macros as any[]).forEach((m: any) => console.log(`ID: ${m.id} - ${m.nome}`));
  
  // Verificar ciclos
  const [ciclos] = await db.execute(sql`SELECT id, nome FROM ciclos ORDER BY id`);
  console.log('\n=== CICLOS DISPONIVEIS ===');
  (ciclos as any[]).forEach((c: any) => console.log(`ID: ${c.id} - ${c.nome}`));
  
  process.exit(0);
}

main().catch(console.error);

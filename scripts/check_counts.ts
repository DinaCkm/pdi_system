import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const [actions] = await db.execute(sql`SELECT COUNT(*) as total FROM actions`);
  const [pdis] = await db.execute(sql`SELECT COUNT(*) as total FROM pdis`);
  const [users] = await db.execute(sql`SELECT COUNT(*) as total FROM users`);
  const [competencias] = await db.execute(sql`SELECT COUNT(*) as total FROM competencias_macros WHERE ativo = 1`);
  const [ciclos] = await db.execute(sql`SELECT COUNT(*) as total FROM ciclos`);

  console.log('=== CONTAGENS DO BANCO ===');
  console.log('Acoes:', (actions as any)[0].total);
  console.log('PDIs:', (pdis as any)[0].total);
  console.log('Usuarios:', (users as any)[0].total);
  console.log('Competencias Macro (ativas):', (competencias as any)[0].total);
  console.log('Ciclos:', (ciclos as any)[0].total);
  
  process.exit(0);
}

main().catch(console.error);

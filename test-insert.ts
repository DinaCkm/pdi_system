import { getDb } from './server/db';
import { departamentos } from './drizzle/schema';

async function test() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    return;
  }
  
  const result = await db.insert(departamentos).values({
    nome: 'TEST_DEPT',
    descricao: 'Test',
    status: 'ativo',
    leaderId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  console.log('Result:', result);
  console.log('insertId type:', typeof result.insertId);
  console.log('insertId value:', result.insertId);
  console.log('insertId as string:', String(result.insertId));
  console.log('parseInt:', parseInt(String(result.insertId)));
  
  process.exit(0);
}

test();

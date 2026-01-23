import { getDb } from './server/db.ts';

try {
  const db = await getDb();
  
  console.log('\n=== VERIFICANDO DADOS ===\n');
  
  // Verificar evidências
  const [evCount]: any = await db.execute('SELECT COUNT(*) as cnt, GROUP_CONCAT(DISTINCT status) as statuses FROM evidences');
  console.log('EVIDÊNCIAS:');
  console.log('  Total:', evCount[0]?.cnt);
  console.log('  Status:', evCount[0]?.statuses);
  
  // Verificar adjustment_requests
  const [adjCount]: any = await db.execute('SELECT COUNT(*) as cnt, GROUP_CONCAT(DISTINCT status) as statuses FROM adjustment_requests');
  console.log('\nADJUSTMENT_REQUESTS:');
  console.log('  Total:', adjCount[0]?.cnt);
  console.log('  Status:', adjCount[0]?.statuses);
  
  // Verificar um registro de cada
  const [ev]: any = await db.execute('SELECT id, status, colaboradorId, actionId FROM evidences LIMIT 1');
  console.log('\nPRIMEIRA EVIDÊNCIA:');
  console.log(JSON.stringify(ev[0], null, 2));
  
  const [adj]: any = await db.execute('SELECT id, status, solicitanteId, actionId FROM adjustment_requests LIMIT 1');
  console.log('\nPRIMEIRO ADJUSTMENT:');
  console.log(JSON.stringify(adj[0], null, 2));
  
} catch (err) {
  console.error('ERRO:', err.message);
}

process.exit(0);

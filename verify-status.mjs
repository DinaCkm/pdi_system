import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: 'root',
  password: process.env.DATABASE_URL?.split(':')[1]?.split('@')[0] || '',
  database: 'pdi_system'
});

console.log('\n=== EVIDÊNCIAS ===');
const [evidences] = await connection.execute(`
  SELECT DISTINCT status, evidence_status, COUNT(*) as count 
  FROM evidences 
  GROUP BY status, evidence_status
`);
console.table(evidences);

console.log('\n=== ADJUSTMENT REQUESTS ===');
const [adjustments] = await connection.execute(`
  SELECT DISTINCT status, COUNT(*) as count 
  FROM adjustment_requests 
  GROUP BY status
`);
console.table(adjustments);

console.log('\n=== QUERIES ESPERADAS ===');
const [pendingEvs] = await connection.execute(`
  SELECT COUNT(*) as count FROM evidences WHERE status = 'aguardando_avaliacao'
`);
console.log('Evidências com status=aguardando_avaliacao:', pendingEvs[0].count);

const [pendingAdj] = await connection.execute(`
  SELECT COUNT(*) as count FROM adjustment_requests WHERE status IN ('pendente', 'pending')
`);
console.log('Ajustes com status IN (pendente, pending):', pendingAdj[0].count);

await connection.end();

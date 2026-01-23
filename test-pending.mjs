import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pdi_db'
});

console.log('=== EVIDÊNCIAS ===');
const [evidences] = await connection.execute(`
  SELECT DISTINCT status FROM evidences
`);
console.log('Status distintos em evidências:', evidences);

console.log('\n=== ADJUSTMENT REQUESTS ===');
const [adjustments] = await connection.execute(`
  SELECT DISTINCT status FROM adjustment_requests
`);
console.log('Status distintos em adjustment_requests:', adjustments);

console.log('\n=== ADJUSTMENT REQUESTS COM PENDENTE ===');
const [pending] = await connection.execute(`
  SELECT id, status FROM adjustment_requests WHERE status IN ('pendente', 'pending')
`);
console.log('Solicitações com status pendente/pending:', pending);

console.log('\n=== EVIDÊNCIAS COM AGUARDANDO_AVALIACAO ===');
const [pendingEv] = await connection.execute(`
  SELECT id, status FROM evidences WHERE status = 'aguardando_avaliacao'
`);
console.log('Evidências com status aguardando_avaliacao:', pendingEv);

await connection.end();

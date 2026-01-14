import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const url = new URL(DATABASE_URL);

const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.split('/')[1],
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('========== VERIFICANDO ADJUSTMENT_REQUESTS ==========\n');
  
  // Contar total de registros
  const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM adjustment_requests');
  console.log(`Total de registros: ${countResult[0].total}`);
  
  // Contar por status
  const [statusResult] = await connection.execute('SELECT status, COUNT(*) as count FROM adjustment_requests GROUP BY status');
  console.log('\nRegistros por status:');
  statusResult.forEach(row => {
    console.log(`  - ${row.status}: ${row.count}`);
  });
  
  // Mostrar últimos 5 registros
  console.log('\nÚltimos 5 registros:');
  const [records] = await connection.execute(`
    SELECT 
      ar.id,
      ar.actionId,
      ar.solicitanteId,
      ar.status,
      ar.createdAt,
      a.nome as actionNome,
      u.name as solicitanteName
    FROM adjustment_requests ar
    LEFT JOIN actions a ON ar.actionId = a.id
    LEFT JOIN users u ON ar.solicitanteId = u.id
    ORDER BY ar.createdAt DESC
    LIMIT 5
  `);
  
  if (records.length === 0) {
    console.log('  Nenhum registro encontrado');
  } else {
    records.forEach(r => {
      console.log(`  ID: ${r.id} | Action: ${r.actionNome} | Solicitante: ${r.solicitanteName} | Status: ${r.status} | Data: ${r.createdAt}`);
    });
  }
  
} finally {
  await connection.end();
}

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
  `);
  
  console.log(`Total de registros: ${records.length}`);
  records.forEach(r => {
    console.log(`ID: ${r.id} | Action: ${r.actionNome} | Solicitante: ${r.solicitanteName} | Status: ${r.status} | Data: ${r.createdAt}`);
  });
} finally {
  await connection.end();
}

import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'pdi',
});

const [rows] = await connection.execute(`
  SELECT u.id, u.name, u.departamentoId, u.leaderId, d.nome as departamento, l.name as lider
  FROM users u
  LEFT JOIN departamentos d ON u.departamentoId = d.id
  LEFT JOIN users l ON u.leaderId = l.id
  WHERE u.name LIKE ? OR u.name LIKE ?
`, ['%Julia%', '%Dinica%']);

console.log('Users:', JSON.stringify(rows, null, 2));
connection.end();

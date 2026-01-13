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

// Buscar Ana Paula Alves Cunha entre os 20 líderes
const [users] = await connection.execute(
  `SELECT id, name, email, role, departamentoId, leaderId FROM users WHERE id >= 180000 AND id <= 180100 AND name LIKE '%Ana Paula%'`
);

console.log('\nAna Paula encontrada entre os líderes:');
users.forEach(u => {
  console.log(`ID: ${u.id} | Nome: ${u.name} | Email: ${u.email} | Role: ${u.role} | Depto: ${u.departamentoId} | Líder: ${u.leaderId}`);
});

await connection.end();

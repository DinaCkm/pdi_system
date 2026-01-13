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

// Buscar Ana Paula Alves Cunha
const [users] = await connection.execute(
  `SELECT id, name, email, role, departamentoId FROM users WHERE name LIKE '%Ana Paula%Alves%Cunha%'`
);

console.log('\nAna Paula Alves Cunha encontrada:');
users.forEach(u => {
  console.log(`ID: ${u.id} | Nome: ${u.name} | Email: ${u.email} | Role: ${u.role} | Depto: ${u.departamentoId}`);
});

await connection.end();

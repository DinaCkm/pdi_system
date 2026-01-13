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

const [users] = await connection.execute(
  `SELECT id, name, email, role, departamentoId, leaderId FROM users WHERE name LIKE '%Ana Paula%Santos%'`
);

console.log('\nAna Paula Alves Santos encontrada:\n');
users.forEach(u => {
  console.log(`ID: ${u.id}`);
  console.log(`Nome: ${u.name}`);
  console.log(`Email: ${u.email}`);
  console.log(`Role: ${u.role}`);
  console.log(`DepartamentoId: ${u.departamentoId}`);
  console.log(`LeaderId: ${u.leaderId}`);
});

await connection.end();

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

// Buscar Dina Makiyama com qualquer email
const [users] = await connection.execute(
  `SELECT id, name, email, cpf FROM users WHERE name LIKE '%Dina%Makiyama%'`
);

console.log('\nDina Makiyama encontrada:');
users.forEach(u => {
  console.log(`ID: ${u.id} | Nome: ${u.name} | Email: ${u.email} | CPF: ${u.cpf}`);
});

await connection.end();

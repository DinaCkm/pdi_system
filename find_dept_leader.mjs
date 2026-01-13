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

// Buscar departamento Ckm Talentos
const [depts] = await connection.execute(
  `SELECT id, nome FROM departamentos WHERE nome LIKE '%Ckm Talentos%' OR nome LIKE '%CKM%'`
);

console.log('\nDepartamentos encontrados:');
depts.forEach(d => {
  console.log(`ID: ${d.id} | Nome: ${d.nome}`);
});

// Buscar Dina Makiyama
const [users] = await connection.execute(
  `SELECT id, name, email FROM users WHERE name LIKE '%Dina%' AND email LIKE '%to.sebrae.com.br%'`
);

console.log('\nDina Makiyama encontrada:');
users.forEach(u => {
  console.log(`ID: ${u.id} | Nome: ${u.name} | Email: ${u.email}`);
});

await connection.end();

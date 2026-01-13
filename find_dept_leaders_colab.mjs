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

// Buscar departamentos
const [depts] = await connection.execute(
  `SELECT id, nome FROM departamentos WHERE nome LIKE '%UAS%' OR nome LIKE '%URI%'`
);

console.log('\nDepartamentos encontrados:');
depts.forEach(d => {
  console.log(`ID: ${d.id} | Nome: ${d.nome}`);
});

// Buscar líderes
const [leaders] = await connection.execute(
  `SELECT id, name FROM users WHERE name LIKE '%Ana Paula%Cunha%' OR name LIKE '%Gilzane%'`
);

console.log('\nLíderes encontrados:');
leaders.forEach(l => {
  console.log(`ID: ${l.id} | Nome: ${l.name}`);
});

await connection.end();

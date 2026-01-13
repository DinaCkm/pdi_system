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

console.log('\nBuscando usuários de teste...\n');

const [users] = await connection.execute(`
  SELECT id, name, email, role FROM users 
  WHERE name LIKE '%test%' OR name LIKE '%Test%' OR name = 'ttttttttttt'
  ORDER BY id
`);

console.log(`Encontrados ${users.length} usuários de teste:\n`);
users.forEach(u => {
  console.log(`ID: ${u.id} | ${u.name} | ${u.email} | Role: ${u.role}`);
});

await connection.end();

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
  const [users] = await connection.execute(`
    SELECT id, name, role FROM users WHERE name LIKE '%BRUNO%'
  `);
  
  console.log('Usuários encontrados:');
  users.forEach(u => {
    console.log(`ID: ${u.id} | Nome: ${u.name} | Role: ${u.role}`);
  });
} finally {
  await connection.end();
}

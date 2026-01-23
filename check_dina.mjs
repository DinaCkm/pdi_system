import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3]?.split('?')[0] || 'pdi',
});

const [rows] = await connection.execute(
  "SELECT id, name, email, role FROM users WHERE name LIKE ? OR name LIKE ?",
  ['%Dinica%', '%Dina%']
);

console.log('Dina User Info:', rows);
connection.end();

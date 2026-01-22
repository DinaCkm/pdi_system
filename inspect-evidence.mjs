import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pdi_system',
});

const [rows] = await connection.execute('SELECT * FROM evidences ORDER BY id DESC LIMIT 1');
console.log("CONTEÚDO REAL DA EVIDÊNCIA:", JSON.stringify(rows, null, 2));

await connection.end();

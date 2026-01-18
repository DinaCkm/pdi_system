import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pdi_system',
});

console.log('\n=== USUÁRIOS NO BANCO ===\n');
const [users] = await connection.execute('SELECT id, email, cpf, role, name FROM users LIMIT 10');
console.table(users);

console.log('\n=== CICLOS ===\n');
const [ciclos] = await connection.execute('SELECT id, nome, dataInicio, dataFim FROM ciclos');
console.table(ciclos);

console.log('\n=== ATUALIZANDO DATAS DO CICLO 2026 ===\n');

// Atualizar 1º Semestre 2026
await connection.execute(
  'UPDATE ciclos SET dataInicio = ?, dataFim = ? WHERE nome LIKE ?',
  ['2026-01-01', '2026-06-30', '%1º Semestre%']
);

// Atualizar 2º Semestre 2026
await connection.execute(
  'UPDATE ciclos SET dataInicio = ?, dataFim = ? WHERE nome LIKE ?',
  ['2026-07-01', '2026-12-31', '%2º Semestre%']
);

console.log('Datas atualizadas com sucesso!\n');

console.log('=== CICLOS APÓS ATUALIZAÇÃO ===\n');
const [ciclosAtualizados] = await connection.execute('SELECT id, nome, dataInicio, dataFim FROM ciclos');
console.table(ciclosAtualizados);

await connection.end();

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

const names = [
  'Alencar Hubner Borelli',
  'Ana Paula Cunha Soares',
  'Diogo Santos Barreto',
  'Durval Rego Nunes',
  'Emerson Eduardo Aires Nunes',
  'Getulio Rodrigues de Mendonca',
  'Hide Senna de Sousa Soares',
  'Higor Nichollas de Oliveira',
  'Ludmila Santana Barbosa',
  'Sebastiao Geraldo de Oliveira',
  'Thaina Silva de Alencar'
];

console.log('\nBuscando IDs dos 11 colaboradores órfãos...\n');

const [rows] = await connection.execute(
  `SELECT id, name, email, cpf, departamentoId, leaderId FROM users WHERE name IN (${names.map(() => '?').join(',')})`,
  names
);

console.log('Colaboradores encontrados:');
rows.forEach(row => {
  console.log(`${row.id} | ${row.name} | Depto: ${row.departamentoId} | Líder: ${row.leaderId}`);
});

console.log(`\nTotal: ${rows.length} colaboradores encontrados`);

await connection.end();

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
  'Aldeni Batista Torres',
  'Amaggeldo Barbosa',
  'Ana Paula Alves Cunha',
  'Andreia Rodrigues Facundes',
  'Antonio Louça Curcino',
  'Bruno Martins Vieira',
  'Dina Makiyama',
  'Edvaldo Pereira Lima Júnior',
  'Eliwania dos Santos Silva',
  'Gabriela Tomasi',
  'Gilzane Pereira Amaral',
  'Jackeline de Souza Lima',
  'Leonardo Campelo Leite Guedes',
  'Marcus Vinicius Vieira Queiroz',
  'Millena Pereira Lima Rodrigues',
  'Nemias Gomes',
  'Paula dos Reis Coelho Alencar Sousa',
  'Pedro Junior da Rocha Silva',
  'Renata Moura Alves Simas',
  'Vera Lucia Teodoro Braga'
];

console.log('\nBuscando IDs dos 20 líderes...\n');

const [rows] = await connection.execute(
  `SELECT id, name, email, cpf FROM users WHERE name IN (${names.map(() => '?').join(',')})`,
  names
);

console.log('IDs encontrados:');
rows.forEach(row => {
  console.log(`${row.id} | ${row.name} | ${row.email} | ${row.cpf}`);
});

console.log(`\nTotal: ${rows.length} líderes encontrados`);

// Salvar IDs para próximo passo
const ids = rows.map(r => r.id);
console.log(`\nIDs para deletar: ${ids.join(',')}`);

await connection.end();

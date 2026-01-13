import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const url = new URL(DATABASE_URL);

const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.split('/')[1],
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Query 1: Colaboradores órfãos
console.log('\n================================================================================');
console.log('PARTE 1: COLABORADORES ÓRFÃOS (15 usuários)');
console.log('================================================================================\n');

const [orfaos] = await connection.execute(`
SELECT 
  u.id,
  u.name,
  u.email,
  u.cpf,
  u.role,
  u.status,
  u.departamentoId,
  u.leaderId,
  d.nome as departamento_atual,
  ul.name as lider_atual,
  CASE 
    WHEN u.departamentoId IS NULL THEN 'SEM DEPARTAMENTO'
    WHEN u.leaderId IS NULL THEN 'SEM LÍDER'
    WHEN d.id IS NULL THEN 'DEPTO NÃO EXISTE'
    WHEN ul.id IS NULL THEN 'LÍDER NÃO EXISTE'
    ELSE 'OUTRO'
  END as problema
FROM users u
LEFT JOIN departamentos d ON d.id = u.departamentoId
LEFT JOIN users ul ON ul.id = u.leaderId
WHERE u.role = 'colaborador'
  AND (u.departamentoId IS NULL OR u.leaderId IS NULL OR d.id IS NULL OR ul.id IS NULL)
ORDER BY u.id
`);

orfaos.forEach((user, idx) => {
  console.log(`${idx + 1}. ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   CPF: ${user.cpf}`);
  console.log(`   Status: ${user.status}`);
  console.log(`   Problema: ${user.problema}`);
  console.log(`   Depto Atual: ${user.departamento_atual || 'NULL'}`);
  console.log(`   Líder Atual: ${user.lider_atual || 'NULL'}`);
  console.log('');
});

// Query 2: Líderes conflitados
console.log('\n================================================================================');
console.log('PARTE 2: LÍDERES CONFLITADOS (17 usuários)');
console.log('================================================================================\n');

const [conflitados] = await connection.execute(`
SELECT 
  u.id,
  u.name,
  u.email,
  u.cpf,
  u.role,
  u.status,
  u.departamentoId as depto_como_colaborador,
  u.leaderId as lider_superior,
  d.id as depto_liderado,
  d.nome as nome_depto_liderado
FROM users u
LEFT JOIN departamentos d ON d.leaderId = u.id
WHERE u.role = 'lider'
  AND u.departamentoId = d.id
ORDER BY u.id
`);

conflitados.forEach((user, idx) => {
  console.log(`${idx + 1}. ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   CPF: ${user.cpf}`);
  console.log(`   Status: ${user.status}`);
  console.log(`   Problema: LIDERA "${user.nome_depto_liderado}" E É MEMBRO DO MESMO DEPTO`);
  console.log(`   Depto Liderado: ${user.nome_depto_liderado}`);
  console.log(`   Líder Superior: ${user.lider_superior || 'NULL'}`);
  console.log('');
});

console.log('\n================================================================================');
console.log(`TOTAL: ${orfaos.length} órfãos + ${conflitados.length} conflitados = ${orfaos.length + conflitados.length} usuários`);
console.log('================================================================================\n');

await connection.end();

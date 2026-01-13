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

console.log('\n========== VERIFICANDO SCHEMA ==========\n');

// Verificar colunas da tabela users
const [columns] = await connection.execute(`
  SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE()
  ORDER BY ORDINAL_POSITION
`);

console.log('Colunas da tabela users:\n');
columns.forEach(col => {
  console.log(`  ${col.COLUMN_NAME} | ${col.COLUMN_TYPE} | Nullable: ${col.IS_NULLABLE} | Key: ${col.COLUMN_KEY || '-'}`);
});

// Verificar colunas da tabela user_department_roles
console.log('\n\nColunas da tabela user_department_roles:\n');

const [colsRoles] = await connection.execute(`
  SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'user_department_roles' AND TABLE_SCHEMA = DATABASE()
  ORDER BY ORDINAL_POSITION
`);

colsRoles.forEach(col => {
  console.log(`  ${col.COLUMN_NAME} | ${col.COLUMN_TYPE} | Nullable: ${col.IS_NULLABLE} | Key: ${col.COLUMN_KEY || '-'}`);
});

// Verificar departamentos
console.log('\n\nColunas da tabela departamentos:\n');

const [colsDept] = await connection.execute(`
  SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'departamentos' AND TABLE_SCHEMA = DATABASE()
  ORDER BY ORDINAL_POSITION
`);

colsDept.forEach(col => {
  console.log(`  ${col.COLUMN_NAME} | ${col.COLUMN_TYPE} | Nullable: ${col.IS_NULLABLE} | Key: ${col.COLUMN_KEY || '-'}`);
});

await connection.end();

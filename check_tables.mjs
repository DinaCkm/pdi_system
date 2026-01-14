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
  const [tables] = await connection.execute('SHOW TABLES');
  console.log('Tabelas existentes no banco:');
  tables.forEach(t => {
    const tableName = Object.values(t)[0];
    console.log(`  - ${tableName}`);
  });
  
  // Verificar especificamente se adjustmentRequests existe
  console.log('\n');
  const [result] = await connection.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'adjustment_requests'");
  
  if (result.length > 0) {
    console.log('✅ Tabela adjustment_requests EXISTE');
  } else {
    console.log('❌ Tabela adjustment_requests NÃO EXISTE');
  }
} finally {
  await connection.end();
}

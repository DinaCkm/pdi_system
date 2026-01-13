import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('Conectando ao banco...');
  
  const connection = await mysql.createConnection({
    uri: dbUrl,
    enableKeepAlive: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const [users] = await connection.execute('SELECT COUNT(*) as total, status FROM users GROUP BY status');
    console.log('=== USUÁRIOS POR STATUS ===');
    console.log(JSON.stringify(users, null, 2));

    const [activeUsers] = await connection.execute('SELECT id, name, email, role, departamentoId, leaderId, status FROM users WHERE status = "ativo" LIMIT 5');
    console.log('\n=== PRIMEIROS 5 USUÁRIOS ATIVOS ===');
    console.log(JSON.stringify(activeUsers, null, 2));

    const [dualRoles] = await connection.execute('SELECT COUNT(*) as total FROM user_department_roles');
    console.log('\n=== TOTAL DE DUAL ROLES ===');
    console.log(JSON.stringify(dualRoles, null, 2));

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await connection.end();
  }
}

main();

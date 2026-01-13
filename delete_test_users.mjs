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

console.log('\n========== DELETANDO USUÁRIOS DE TESTE ==========\n');

try {
  const idsToDelete = [210001, 210002, 210003];

  console.log('Deletando usuários de teste...\n');
  
  for (const id of idsToDelete) {
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    console.log(`  ✅ Deletado: ID ${id}`);
  }

  // Verificar resultado
  console.log('\n========== VERIFICANDO RESULTADO ==========\n');
  
  const [remaining] = await connection.execute(`
    SELECT id, name, role, departamentoId, leaderId FROM users 
    WHERE role = 'colaborador' AND (departamentoId IS NULL OR leaderId IS NULL)
  `);

  if (remaining.length === 0) {
    console.log('✅ NENHUM colaborador órfão restante!\n');
  } else {
    console.log(`⚠️ ${remaining.length} colaboradores órfãos ainda existem:\n`);
    remaining.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.name}`);
    });
  }

  console.log('\n========== LIMPEZA CONCLUÍDA ==========\n');

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}

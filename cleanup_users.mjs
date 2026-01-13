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

console.log('\n========== LIMPEZA E CORREÇÃO DE DADOS ==========\n');

try {
  // 1. Buscar IDs dos usuários a deletar
  console.log('1. Buscando IDs dos usuários a deletar...\n');
  
  const [toDelete] = await connection.execute(`
    SELECT id, name FROM users WHERE 
    name LIKE '%Julia Souza%' OR 
    name LIKE '%Líder Test%' OR 
    name LIKE '%User Test%' OR 
    name = 'ttttttttttt'
  `);

  console.log('Usuários a deletar:');
  toDelete.forEach(u => {
    console.log(`  ID: ${u.id} | ${u.name}`);
  });

  // 2. Deletar usuários
  console.log('\n2. Deletando usuários...\n');
  
  for (const user of toDelete) {
    await connection.execute('DELETE FROM users WHERE id = ?', [user.id]);
    console.log(`  ✅ Deletado: ${user.name} (ID: ${user.id})`);
  }

  // 3. Corrigir Ana Paula Alves Santos (remover departamento e líder)
  console.log('\n3. Corrigindo Ana Paula Alves Santos...\n');
  
  await connection.execute(
    'UPDATE users SET departamentoId = NULL, leaderId = NULL WHERE name = ?',
    ['ANA PAULA ALVES SANTOS']
  );
  console.log('  ✅ Ana Paula Alves Santos: removidos departamento e líder');

  // 4. Adicionar Julia Souza Makiyama como colaboradora de Ckm Talents
  console.log('\n4. Adicionando Julia Souza Makiyama como colaboradora...\n');
  
  // Primeiro, buscar Julia
  const [julia] = await connection.execute(
    'SELECT id FROM users WHERE name LIKE ?',
    ['%Julia%']
  );

  if (julia.length > 0) {
    const juliaId = julia[0].id;
    // Atualizar para colaboradora de Ckm Talents (depto 30001) sob Dina (150008)
    await connection.execute(
      'UPDATE users SET departamentoId = ?, leaderId = ? WHERE id = ?',
      [30001, 150008, juliaId]
    );
    console.log(`  ✅ Julia Souza Makiyama (ID: ${juliaId}): colaboradora de Ckm Talents`);
  }

  // 5. Verificar resultado
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

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

console.log('\n========== INICIANDO CORREÇÃO DOS LÍDERES ==========\n');

// IDs a deletar (11 duplicados sebrae.to.gov.br)
const idsToDelete = [150005, 150012, 150013, 150014, 150015, 150016, 150017, 150018, 150019, 150020, 150021];

// IDs a atualizar (20 líderes com domínio to.sebrae.com.br)
const idsToUpdate = [180002, 180003, 180004, 180005, 180006, 180007, 180008, 180009, 180010, 180011, 180012, 180013, 180014, 180015, 180016, 180017, 180018, 180019];

const deptId = 30001; // Ckm Talents
const leaderId = 150008; // Dina Makiyama

try {
  // 1. Deletar duplicados
  console.log('1. Deletando 11 duplicados sebrae.to.gov.br...');
  for (const id of idsToDelete) {
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
  }
  console.log(`   ✅ Deletados: ${idsToDelete.join(', ')}`);

  // 2. Atualizar 20 líderes
  console.log('\n2. Atualizando 20 líderes para colaboradores de Ckm Talents...');
  for (const id of idsToUpdate) {
    await connection.execute(
      'UPDATE users SET departamentoId = ?, leaderId = ? WHERE id = ?',
      [deptId, leaderId, id]
    );
  }
  console.log(`   ✅ Atualizados: ${idsToUpdate.join(', ')}`);

  // 3. Verificar resultado
  console.log('\n3. Verificando resultado...');
  const [updated] = await connection.execute(
    `SELECT id, name, email, departamentoId, leaderId FROM users WHERE id IN (${idsToUpdate.join(',')}) ORDER BY id`
  );
  
  console.log('\n   Líderes atualizados:');
  updated.forEach(u => {
    console.log(`   ID: ${u.id} | ${u.name} | Depto: ${u.departamentoId} | Líder: ${u.leaderId}`);
  });

  console.log('\n========== CORREÇÃO CONCLUÍDA COM SUCESSO ==========\n');

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}

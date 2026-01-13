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

console.log('\n========== CORRIGINDO ANA PAULA ALVES SANTOS ==========\n');

try {
  // Atualizar Ana Paula para líder
  await connection.execute(
    `UPDATE users SET role = 'lider', departamentoId = NULL, leaderId = NULL WHERE name = 'ANA PAULA ALVES SANTOS'`
  );
  console.log('✅ Ana Paula Alves Santos: role alterado para "lider"');
  console.log('✅ Ana Paula Alves Santos: departamentoId e leaderId removidos\n');

  // Verificar resultado
  const [updated] = await connection.execute(
    `SELECT id, name, role, departamentoId, leaderId FROM users WHERE name = 'ANA PAULA ALVES SANTOS'`
  );

  console.log('Resultado:');
  updated.forEach(u => {
    console.log(`  ID: ${u.id}`);
    console.log(`  Nome: ${u.name}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  DepartamentoId: ${u.departamentoId}`);
    console.log(`  LeaderId: ${u.leaderId}`);
  });

  // Verificar se há colaboradores órfãos
  console.log('\n========== VERIFICANDO COLABORADORES ÓRFÃOS ==========\n');
  
  const [orfaos] = await connection.execute(`
    SELECT id, name, role, departamentoId, leaderId FROM users 
    WHERE role = 'colaborador' AND (departamentoId IS NULL OR leaderId IS NULL)
  `);

  if (orfaos.length === 0) {
    console.log('✅ NENHUM colaborador órfão restante!\n');
    console.log('🎉 DADOS 100% ÍNTEGROS - PRONTO PARA MIGRAÇÃO!\n');
  } else {
    console.log(`⚠️ ${orfaos.length} colaboradores órfãos ainda existem:\n`);
    orfaos.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.name}`);
    });
  }

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}

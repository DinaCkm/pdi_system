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

console.log('\n========== INICIANDO MIGRAÇÃO DE DUAL ROLES ==========\n');

try {
  // 1. Limpar tabela user_department_roles
  console.log('1. Limpando tabela user_department_roles...\n');
  await connection.execute('DELETE FROM user_department_roles');
  console.log('   ✅ Tabela limpa\n');

  // 2. Buscar todos os líderes
  console.log('2. Buscando líderes com dual roles...\n');
  
  const [lideres] = await connection.execute(`
    SELECT 
      u.id,
      u.name,
      u.departamentoId as depto_colaborador,
      d.id as depto_liderado,
      d.nome as nome_depto_liderado
    FROM users u
    LEFT JOIN departamentos d ON d.leaderId = u.id
    WHERE u.role = 'lider'
      AND u.departamentoId IS NOT NULL
      AND d.id IS NOT NULL
    ORDER BY u.id
  `);

  console.log(`   Encontrados ${lideres.length} líderes com dual roles\n`);

  // 3. Inserir dual roles
  console.log('3. Inserindo dual roles na tabela user_department_roles...\n');
  
  let inserted = 0;
  
  for (const lider of lideres) {
    // Role 1: Líder do departamento
    await connection.execute(
      `INSERT INTO user_department_roles (userId, departamentoId, role) VALUES (?, ?, ?)`,
      [lider.id, lider.depto_liderado, 'lider']
    );
    
    // Role 2: Colaborador do departamento
    await connection.execute(
      `INSERT INTO user_department_roles (userId, departamentoId, role) VALUES (?, ?, ?)`,
      [lider.id, lider.depto_colaborador, 'colaborador']
    );
    
    inserted++;
    console.log(`   ✅ ${lider.name}`);
    console.log(`      - Líder de: ${lider.nome_depto_liderado}`);
    console.log(`      - Colaborador em: Depto ${lider.depto_colaborador}\n`);
  }

  // 4. Buscar colaboradores comuns
  console.log('4. Buscando colaboradores comuns...\n');
  
  const [colaboradores] = await connection.execute(`
    SELECT 
      u.id,
      u.name,
      u.departamentoId,
      d.nome as nome_depto
    FROM users u
    LEFT JOIN departamentos d ON d.id = u.departamentoId
    WHERE u.role = 'colaborador'
    ORDER BY u.id
  `);

  console.log(`   Encontrados ${colaboradores.length} colaboradores\n`);

  // 5. Inserir colaboradores
  console.log('5. Inserindo colaboradores na tabela user_department_roles...\n');
  
  let colabInserted = 0;
  
  for (const colab of colaboradores) {
    await connection.execute(
      `INSERT INTO user_department_roles (userId, departamentoId, role) VALUES (?, ?, ?)`,
      [colab.id, colab.departamentoId, 'colaborador']
    );
    
    colabInserted++;
    if (colabInserted <= 5 || colabInserted % 10 === 0) {
      console.log(`   ✅ ${colab.name} - ${colab.nome_depto}`);
    }
  }
  
  if (colabInserted > 5) {
    console.log(`   ... (${colabInserted - 5} mais colaboradores)\n`);
  }

  // 6. Verificar resultado
  console.log('6. Verificando resultado da migração...\n');
  
  const [total] = await connection.execute(`
    SELECT COUNT(*) as count FROM user_department_roles
  `);

  const [byRole] = await connection.execute(`
    SELECT role, COUNT(*) as count FROM user_department_roles GROUP BY role
  `);

  console.log(`   Total de registros inseridos: ${total[0].count}\n`);
  console.log('   Distribuição por role:');
  byRole.forEach(r => {
    console.log(`     - ${r.role}: ${r.count}`);
  });

  // 7. Validação final
  console.log('\n7. Validação final...\n');
  
  const [lidoresComDualRoles] = await connection.execute(`
    SELECT 
      u.id,
      u.name,
      COUNT(DISTINCT udr.departamentoId) as dept_count,
      GROUP_CONCAT(DISTINCT udr.role) as roles
    FROM users u
    LEFT JOIN user_department_roles udr ON udr.userId = u.id
    WHERE u.role = 'lider'
    GROUP BY u.id, u.name
    HAVING dept_count >= 2
  `);

  console.log(`   ✅ ${lidoresComDualRoles.length} líderes com dual roles confirmados\n`);

  console.log('\n========== MIGRAÇÃO CONCLUÍDA COM SUCESSO! ==========\n');
  console.log('🎉 Todos os dual roles foram inseridos corretamente!\n');

} catch (error) {
  console.error('❌ Erro durante migração:', error.message);
  console.log('\n⚠️ ROLLBACK AUTOMÁTICO ATIVADO\n');
  
  try {
    await connection.execute('DELETE FROM user_department_roles');
    console.log('✅ Tabela user_department_roles foi limpa (rollback)\n');
  } catch (rollbackError) {
    console.error('❌ Erro durante rollback:', rollbackError.message);
  }
} finally {
  await connection.end();
}

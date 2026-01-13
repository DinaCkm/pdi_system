import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     VALIDAÇÃO FINAL DO SISTEMA DE GESTÃO DE PDI           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Total de usuários
    const [users] = await connection.execute('SELECT COUNT(*) as total FROM users WHERE status = "ativo"');
    console.log(`✅ USUÁRIOS ATIVOS: ${users[0].total}`);

    // 2. Distribuição por role
    const [roles] = await connection.execute('SELECT role, COUNT(*) as total FROM users WHERE status = "ativo" GROUP BY role');
    console.log('\n📊 DISTRIBUIÇÃO POR ROLE:');
    roles.forEach(r => console.log(`   - ${r.role}: ${r.total}`));

    // 3. Líderes com dual roles
    const [leaders] = await connection.execute(`
      SELECT COUNT(DISTINCT userId) as total_lideres 
      FROM user_department_roles 
      WHERE assignmentType = 'LEADER'
    `);
    console.log(`\n👥 LÍDERES COM DUAL ROLES: ${leaders[0].total_lideres}`);

    // 4. Total de registros em user_department_roles
    const [totalRoles] = await connection.execute('SELECT COUNT(*) as total FROM user_department_roles');
    console.log(`📋 TOTAL DE REGISTROS EM USER_DEPARTMENT_ROLES: ${totalRoles[0].total}`);

    // 5. Distribuição de roles
    const [roleDistribution] = await connection.execute(`
      SELECT assignmentType, COUNT(*) as total 
      FROM user_department_roles 
      GROUP BY assignmentType
    `);
    console.log('\n📊 DISTRIBUIÇÃO DE ROLES:');
    roleDistribution.forEach(r => console.log(`   - ${r.assignmentType}: ${r.total}`));

    // 6. Verificar conflitos (líder lidera e é colaborador do mesmo depto)
    const [conflicts] = await connection.execute(`
      SELECT u.id, u.name
      FROM users u
      WHERE u.role = 'lider'
      AND u.departamentoId IS NOT NULL
      AND u.leaderId IS NOT NULL
      AND u.departamentoId = (
        SELECT departmentId FROM user_department_roles 
        WHERE userId = u.id AND assignmentType = 'LEADER'
      )
    `);
    console.log(`\n⚠️  CONFLITOS DETECTADOS: ${conflicts.length}`);
    if (conflicts.length > 0) {
      conflicts.forEach(c => console.log(`   - ${c.name} (ID: ${c.id})`));
    }

    // 7. Colaboradores órfãos
    const [orphans] = await connection.execute(`
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.role = 'colaborador'
      AND (u.departamentoId IS NULL OR u.leaderId IS NULL)
    `);
    console.log(`\n👤 COLABORADORES ÓRFÃOS: ${orphans.length}`);
    if (orphans.length > 0) {
      orphans.forEach(o => console.log(`   - ${o.name} (${o.email})`));
    }

    // 8. Departamentos
    const [depts] = await connection.execute('SELECT COUNT(*) as total FROM departamentos WHERE status = "ativo"');
    console.log(`\n🏢 DEPARTAMENTOS ATIVOS: ${depts[0].total}`);

    // 9. Verificar se todos os líderes têm 2 roles
    const [leaderRoles] = await connection.execute(`
      SELECT userId, COUNT(*) as role_count
      FROM user_department_roles
      WHERE assignmentType = 'LEADER'
      GROUP BY userId
      HAVING role_count != 2
    `);
    console.log(`\n🔍 LÍDERES SEM DUAL ROLES CORRETO: ${leaderRoles.length}`);
    if (leaderRoles.length > 0) {
      leaderRoles.forEach(lr => console.log(`   - ID: ${lr.userId} (roles: ${lr.role_count})`));
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   VALIDAÇÃO CONCLUÍDA                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

main();

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

console.log('\n========== VALIDAÇÃO COMPLETA DE INTEGRIDADE ==========\n');

try {
  // 1. Verificar líderes em dois departamentos (Lidera A + Colaborador em B)
  console.log('1. VERIFICANDO LÍDERES EM DOIS DEPARTAMENTOS\n');
  
  const [lideres] = await connection.execute(`
    SELECT 
      u.id,
      u.name,
      u.role,
      u.departamentoId as depto_colaborador,
      d.nome as nome_depto_colaborador,
      d2.id as depto_liderado,
      d2.nome as nome_depto_liderado,
      u.leaderId,
      ul.name as lider_superior
    FROM users u
    LEFT JOIN departamentos d ON d.id = u.departamentoId
    LEFT JOIN departamentos d2 ON d2.leaderId = u.id
    LEFT JOIN users ul ON ul.id = u.leaderId
    WHERE u.role = 'lider'
    ORDER BY u.id
  `);

  console.log(`Total de líderes: ${lideres.length}\n`);
  
  let lideres_ok = 0;
  let lideres_problema = 0;
  
  lideres.forEach(l => {
    const temDepto = l.depto_colaborador !== null;
    const temLider = l.depto_liderado !== null;
    const deptosDiferentes = l.depto_colaborador !== l.depto_liderado;
    
    if (temDepto && temLider && deptosDiferentes) {
      lideres_ok++;
      console.log(`✅ ${l.name}`);
      console.log(`   Lidera: ${l.nome_depto_liderado}`);
      console.log(`   Colaborador em: ${l.nome_depto_colaborador}`);
      console.log(`   Líder superior: ${l.lider_superior || 'NENHUM (Admin)'}\n`);
    } else {
      lideres_problema++;
      console.log(`❌ ${l.name}`);
      if (!temDepto) console.log(`   PROBLEMA: Sem departamento como colaborador`);
      if (!temLider) console.log(`   PROBLEMA: Não lidera nenhum departamento`);
      if (!deptosDiferentes && temDepto && temLider) console.log(`   PROBLEMA: Lidera e é colaborador do MESMO departamento`);
      console.log();
    }
  });

  console.log(`\nResumo Líderes: ${lideres_ok} OK, ${lideres_problema} COM PROBLEMA\n`);

  // 2. Verificar colaboradores sem líder ou departamento
  console.log('\n2. VERIFICANDO COLABORADORES SEM LÍDER OU DEPARTAMENTO\n');
  
  const [colaboradores_orfaos] = await connection.execute(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.departamentoId,
      u.leaderId,
      d.nome as nome_depto,
      ul.name as nome_lider
    FROM users u
    LEFT JOIN departamentos d ON d.id = u.departamentoId
    LEFT JOIN users ul ON ul.id = u.leaderId
    WHERE u.role = 'colaborador'
      AND (u.departamentoId IS NULL OR u.leaderId IS NULL OR d.id IS NULL OR ul.id IS NULL)
    ORDER BY u.id
  `);

  if (colaboradores_orfaos.length === 0) {
    console.log('✅ NENHUM colaborador órfão encontrado!\n');
  } else {
    console.log(`❌ ${colaboradores_orfaos.length} colaboradores órfãos encontrados:\n`);
    colaboradores_orfaos.forEach(c => {
      console.log(`ID: ${c.id} | ${c.name}`);
      if (c.departamentoId === null) console.log(`  - Sem departamento`);
      if (c.leaderId === null) console.log(`  - Sem líder`);
      if (c.nome_depto === null && c.departamentoId !== null) console.log(`  - Departamento não existe (ID: ${c.departamentoId})`);
      if (c.nome_lider === null && c.leaderId !== null) console.log(`  - Líder não existe (ID: ${c.leaderId})`);
      console.log();
    });
  }

  // 3. Verificar conflitos de líderes (lidera A e é colaborador de A)
  console.log('\n3. VERIFICANDO CONFLITOS (Lidera A e é colaborador de A)\n');
  
  const [conflitos] = await connection.execute(`
    SELECT 
      u.id,
      u.name,
      u.departamentoId,
      d.id as depto_liderado,
      d.nome
    FROM users u
    LEFT JOIN departamentos d ON d.leaderId = u.id
    WHERE u.role = 'lider'
      AND u.departamentoId = d.id
    ORDER BY u.id
  `);

  if (conflitos.length === 0) {
    console.log('✅ NENHUM conflito encontrado!\n');
  } else {
    console.log(`❌ ${conflitos.length} conflitos encontrados:\n`);
    conflitos.forEach(c => {
      console.log(`❌ ${c.name} lidera e é colaborador do MESMO departamento: ${c.nome}\n`);
    });
  }

  // 4. Resumo final
  console.log('\n========== RESUMO FINAL ==========\n');
  
  const [totalUsers] = await connection.execute(`
    SELECT role, COUNT(*) as count FROM users GROUP BY role
  `);

  console.log('Total de usuários por role:');
  totalUsers.forEach(t => {
    console.log(`  ${t.role}: ${t.count}`);
  });

  console.log('\n✅ VALIDAÇÃO CONCLUÍDA!\n');
  
  if (lideres_problema === 0 && colaboradores_orfaos.length === 0 && conflitos.length === 0) {
    console.log('🎉 DADOS 100% ÍNTEGROS - PRONTO PARA MIGRAÇÃO!\n');
  } else {
    console.log('⚠️ EXISTEM PROBLEMAS A RESOLVER\n');
  }

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}

import Database from 'better-sqlite3';

const db = new Database('./data.db');

console.log('🔍 Verificando dados existentes...\n');

// 1. Verificar departamentos
const departamentos = db.prepare('SELECT id, nome, leaderId FROM departamentos LIMIT 5').all();
console.log('📁 Departamentos existentes:', departamentos.length);
if (departamentos.length > 0) {
  console.log('   Primeiro:', departamentos[0]);
}

// 2. Verificar usuários admin/líder
const usuarios = db.prepare(`
  SELECT id, name, email, cpf, role, departamentoId, leaderId 
  FROM users 
  WHERE role IN ('admin', 'lider') 
  LIMIT 5
`).all();
console.log('\n👥 Usuários admin/líder:', usuarios.length);
if (usuarios.length > 0) {
  console.log('   Primeiro:', usuarios[0]);
}

// 3. Verificar ciclos ativos
const ciclos = db.prepare(`
  SELECT id, nome, dataInicio, dataFim 
  FROM ciclos 
  WHERE dataInicio <= date('now') AND dataFim >= date('now')
  LIMIT 1
`).all();
console.log('\n📅 Ciclos ativos:', ciclos.length);
if (ciclos.length > 0) {
  console.log('   Ciclo:', ciclos[0]);
}

// 4. Verificar competências
const competencias = db.prepare('SELECT id, nome FROM competencias_micro LIMIT 1').all();
console.log('\n🎯 Competências micro:', competencias.length);
if (competencias.length > 0) {
  console.log('   Primeira:', competencias[0]);
}

console.log('\n\n🚀 Criando dados de teste...\n');

// Criar departamento de teste se não existir
let deptId;
const deptExistente = db.prepare("SELECT id FROM departamentos WHERE nome = 'Departamento Teste'").get();
if (deptExistente) {
  deptId = deptExistente.id;
  console.log('✅ Departamento Teste já existe (ID:', deptId, ')');
} else {
  const insertDept = db.prepare(`
    INSERT INTO departamentos (nome, descricao, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insertDept.run(
    'Departamento Teste',
    'Departamento para testes de funcionalidade',
    'ativo',
    new Date().toISOString(),
    new Date().toISOString()
  );
  deptId = result.lastInsertRowid;
  console.log('✅ Departamento Teste criado (ID:', deptId, ')');
}

// Criar líder de teste
let liderId;
const liderExistente = db.prepare("SELECT id FROM users WHERE email = 'lider.teste@pdi.com'").get();
if (liderExistente) {
  liderId = liderExistente.id;
  console.log('✅ Líder Teste já existe (ID:', liderId, ')');
} else {
  const insertLider = db.prepare(`
    INSERT INTO users (openId, name, email, cpf, role, cargo, departamentoId, status, createdAt, updatedAt, lastSignedIn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insertLider.run(
    'lider-teste-' + Date.now(),
    'Líder Teste',
    'lider.teste@pdi.com',
    '111.111.111-11',
    'lider',
    'Líder de Equipe',
    deptId,
    'ativo',
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );
  liderId = result.lastInsertRowid;
  console.log('✅ Líder Teste criado (ID:', liderId, ')');
  
  // Atualizar departamento com o líder
  db.prepare('UPDATE departamentos SET leaderId = ? WHERE id = ?').run(liderId, deptId);
  console.log('✅ Líder vinculado ao departamento');
}

// Criar colaborador de teste
let colaboradorId;
const colaboradorExistente = db.prepare("SELECT id FROM users WHERE email = 'colaborador.teste@pdi.com'").get();
if (colaboradorExistente) {
  colaboradorId = colaboradorExistente.id;
  console.log('✅ Colaborador Teste já existe (ID:', colaboradorId, ')');
} else {
  const insertColaborador = db.prepare(`
    INSERT INTO users (openId, name, email, cpf, role, cargo, departamentoId, leaderId, status, createdAt, updatedAt, lastSignedIn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insertColaborador.run(
    'colaborador-teste-' + Date.now(),
    'Colaborador Teste',
    'colaborador.teste@pdi.com',
    '222.222.222-22',
    'colaborador',
    'Analista',
    deptId,
    liderId,
    'ativo',
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );
  colaboradorId = result.lastInsertRowid;
  console.log('✅ Colaborador Teste criado (ID:', colaboradorId, ')');
}

// Criar ciclo de teste se não existir ciclo ativo
let cicloId;
if (ciclos.length > 0) {
  cicloId = ciclos[0].id;
  console.log('✅ Usando ciclo ativo existente (ID:', cicloId, ')');
} else {
  const insertCiclo = db.prepare(`
    INSERT INTO ciclos (nome, dataInicio, dataFim, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 0);
  
  const result = insertCiclo.run(
    'Ciclo Teste 2026',
    inicioMes.toISOString().split('T')[0],
    fimMes.toISOString().split('T')[0],
    new Date().toISOString(),
    new Date().toISOString()
  );
  cicloId = result.lastInsertRowid;
  console.log('✅ Ciclo Teste criado (ID:', cicloId, ')');
}

// Criar PDI para o colaborador
let pdiId;
const pdiExistente = db.prepare(`
  SELECT id FROM pdis 
  WHERE colaboradorId = ? AND cicloId = ?
`).get(colaboradorId, cicloId);

if (pdiExistente) {
  pdiId = pdiExistente.id;
  console.log('✅ PDI já existe (ID:', pdiId, ')');
} else {
  const insertPDI = db.prepare(`
    INSERT INTO pdis (colaboradorId, cicloId, titulo, descricao, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insertPDI.run(
    colaboradorId,
    cicloId,
    'PDI Teste - Desenvolvimento de Competências',
    'Plano de desenvolvimento focado em habilidades técnicas e comportamentais',
    'em_andamento',
    new Date().toISOString(),
    new Date().toISOString()
  );
  pdiId = result.lastInsertRowid;
  console.log('✅ PDI criado (ID:', pdiId, ')');
}

// Pegar primeira microcompetência disponível
const microComp = db.prepare('SELECT id FROM competencias_micro LIMIT 1').get();
if (!microComp) {
  console.log('❌ Nenhuma microcompetência encontrada. Crie competências primeiro.');
  process.exit(1);
}

// Criar ação vinculada ao PDI
const acaoExistente = db.prepare(`
  SELECT id FROM acoes WHERE pdiId = ? LIMIT 1
`).get(pdiId);

if (acaoExistente) {
  console.log('✅ Ação já existe (ID:', acaoExistente.id, ')');
} else {
  const insertAcao = db.prepare(`
    INSERT INTO acoes (pdiId, microcompetenciaId, nome, descricao, prazo, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const prazo = new Date();
  prazo.setMonth(prazo.getMonth() + 3);
  
  const result = insertAcao.run(
    pdiId,
    microComp.id,
    'Ação Teste - Workshop de Desenvolvimento',
    'Participar de workshop sobre desenvolvimento de competências técnicas e comportamentais',
    prazo.toISOString().split('T')[0],
    'pendente_aprovacao_lider',
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log('✅ Ação criada (ID:', result.lastInsertRowid, ')');
}

console.log('\n\n📊 RESUMO DOS DADOS DE TESTE:\n');
console.log('🏢 Departamento:', deptId, '- Departamento Teste');
console.log('👤 Líder:', liderId, '- lider.teste@pdi.com / CPF: 111.111.111-11');
console.log('👤 Colaborador:', colaboradorId, '- colaborador.teste@pdi.com / CPF: 222.222.222-22');
console.log('📅 Ciclo:', cicloId);
console.log('📋 PDI:', pdiId);
console.log('\n✅ Dados de teste criados com sucesso!');
console.log('\n🔐 Para testar, faça login com:');
console.log('   Líder: lider.teste@pdi.com / CPF: 111.111.111-11');
console.log('   Colaborador: colaborador.teste@pdi.com / CPF: 222.222.222-22');

db.close();

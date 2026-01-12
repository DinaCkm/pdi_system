// Script para criar dados de teste via API HTTP
const API_URL = 'http://localhost:3000/api/trpc';

async function callTRPC(procedure, input = {}) {
  const url = `${API_URL}/${procedure}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

console.log('🚀 Criando dados de teste via tRPC...\n');

try {
  // 1. Criar departamento
  console.log('📁 Criando departamento...');
  const dept = await callTRPC('departamentos.create', {
    nome: 'Departamento Teste',
    descricao: 'Departamento para testes de funcionalidade',
  });
  console.log('✅ Departamento criado:', dept);

  // 2. Criar líder
  console.log('\n👤 Criando líder...');
  const lider = await callTRPC('users.create', {
    name: 'Líder Teste',
    email: 'lider.teste@pdi.com',
    cpf: '111.111.111-11',
    cargo: 'Líder de Equipe',
    role: 'lider',
  });
  console.log('✅ Líder criado:', lider);

  // 3. Atualizar departamento com líder
  console.log('\n🔗 Vinculando líder ao departamento...');
  await callTRPC('departamentos.update', {
    id: dept.result.data.id,
    leaderId: lider.result.data.id,
  });
  console.log('✅ Líder vinculado ao departamento');

  // 4. Configurar perfil do líder
  console.log('\n⚙️ Configurando perfil do líder...');
  await callTRPC('users.update', {
    id: lider.result.data.id,
    role: 'lider',
    departamentoId: dept.result.data.id,
  });
  console.log('✅ Perfil do líder configurado');

  // 5. Criar colaborador
  console.log('\n👤 Criando colaborador...');
  const colaborador = await callTRPC('users.create', {
    name: 'Colaborador Teste',
    email: 'colaborador.teste@pdi.com',
    cpf: '222.222.222-22',
    cargo: 'Analista',
    role: 'colaborador',
  });
  console.log('✅ Colaborador criado:', colaborador);

  // 6. Configurar perfil do colaborador
  console.log('\n⚙️ Configurando perfil do colaborador...');
  await callTRPC('users.update', {
    id: colaborador.result.data.id,
    role: 'colaborador',
    departamentoId: dept.result.data.id,
  });
  console.log('✅ Perfil do colaborador configurado');

  console.log('\n\n📊 RESUMO DOS DADOS DE TESTE:\n');
  console.log('🏢 Departamento:', dept.result.data.id, '- Departamento Teste');
  console.log('👤 Líder:', lider.result.data.id, '- lider.teste@pdi.com / CPF: 111.111.111-11');
  console.log('👤 Colaborador:', colaborador.result.data.id, '- colaborador.teste@pdi.com / CPF: 222.222.222-22');
  console.log('\n✅ Dados de teste criados com sucesso!');
  console.log('\n🔐 Para testar, faça login com:');
  console.log('   Líder: lider.teste@pdi.com / CPF: 111.111.111-11');
  console.log('   Colaborador: colaborador.teste@pdi.com / CPF: 222.222.222-22');

} catch (error) {
  console.error('\n❌ Erro ao criar dados:', error.message);
  process.exit(1);
}

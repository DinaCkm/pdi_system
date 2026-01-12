import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

// Ler dados processados
const users = JSON.parse(readFileSync('/home/ubuntu/pdi_system/users-to-import.json', 'utf-8'));

console.log(`🚀 Iniciando importação de ${users.length} usuários diretamente no banco...`);

// Conectar ao banco
const connection = await mysql.createConnection(process.env.DATABASE_URL);

const results = {
  success: 0,
  errors: [],
  departamentosCreated: 0,
  lidersCreated: 0,
  colaboradoresCreated: 0,
};

try {
  // 1. Criar departamentos únicos
  const departamentosUnicos = [...new Set(users.map(u => u.departamento))];
  const departamentosMap = new Map();

  console.log(`\n📁 Criando ${departamentosUnicos.length} departamentos...`);

  for (const deptNome of departamentosUnicos) {
    try {
      // Verificar se já existe
      const [existing] = await connection.execute(
        'SELECT id FROM departamentos WHERE nome = ?',
        [deptNome]
      );

      if (existing.length > 0) {
        departamentosMap.set(deptNome, existing[0].id);
        console.log(`  ✓ ${deptNome} (já existe)`);
      } else {
        const [result] = await connection.execute(
          'INSERT INTO departamentos (nome, status) VALUES (?, ?)',
          [deptNome, 'ativo']
        );
        departamentosMap.set(deptNome, result.insertId);
        results.departamentosCreated++;
        console.log(`  ✓ ${deptNome} (criado)`);
      }
    } catch (error) {
      results.errors.push(`Erro ao criar departamento ${deptNome}: ${error.message}`);
      console.log(`  ✗ ${deptNome} (erro: ${error.message})`);
    }
  }

  // 2. Criar líderes primeiro
  const lideres = users.filter(u => u.role === 'lider');
  const lideresMap = new Map();

  console.log(`\n👥 Criando ${lideres.length} líderes...`);

  for (const lider of lideres) {
    try {
      // Verificar se já existe
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE cpf = ?',
        [lider.cpf]
      );

      if (existing.length > 0) {
        lideresMap.set(lider.departamento, existing[0].id);
        console.log(`  ✓ ${lider.name} (já existe)`);
        continue;
      }

      const departamentoId = departamentosMap.get(lider.departamento);
      const email = lider.email || `${lider.cpf}@temp.com`;

      await connection.execute(
        `INSERT INTO users (openId, name, email, cpf, role, cargo, departamentoId, status, loginMethod) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`local_${lider.cpf}`, lider.name, email, lider.cpf, 'lider', lider.cargo, departamentoId, 'ativo', 'local']
      );

      const [newUser] = await connection.execute(
        'SELECT id FROM users WHERE cpf = ?',
        [lider.cpf]
      );

      if (newUser.length > 0) {
        const userId = newUser[0].id;
        lideresMap.set(lider.departamento, userId);
        results.lidersCreated++;
        results.success++;

        // Atualizar departamento com o líder
        await connection.execute(
          'UPDATE departamentos SET leaderId = ? WHERE id = ?',
          [userId, departamentoId]
        );

        console.log(`  ✓ ${lider.name}`);
      }
    } catch (error) {
      results.errors.push(`Erro ao criar líder ${lider.name}: ${error.message}`);
      console.log(`  ✗ ${lider.name} (erro: ${error.message})`);
    }
  }

  // 3. Criar colaboradores
  const colaboradores = users.filter(u => u.role === 'colaborador');

  console.log(`\n👤 Criando ${colaboradores.length} colaboradores...`);

  for (const colab of colaboradores) {
    try {
      // Verificar se já existe
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE cpf = ?',
        [colab.cpf]
      );

      if (existing.length > 0) {
        console.log(`  ✓ ${colab.name} (já existe)`);
        continue;
      }

      const departamentoId = departamentosMap.get(colab.departamento);
      const leaderId = lideresMap.has(colab.departamento) ? lideresMap.get(colab.departamento) : null;
      const email = colab.email && colab.email !== 'undefined' ? colab.email : `${colab.cpf}@temp.com`;

      // Validar que nenhum parâmetro seja undefined
      const params = [
        `local_${colab.cpf}`,
        colab.name,
        email,
        colab.cpf,
        'colaborador',
        colab.cargo,
        departamentoId,
        leaderId,
        'ativo',
        'local'
      ];

      // Verificar se algum parâmetro é undefined
      if (params.some(p => p === undefined)) {
        throw new Error(`Parâmetro undefined detectado: ${JSON.stringify({name: colab.name, departamentoId, leaderId, email})}`);
      }

      await connection.execute(
        `INSERT INTO users (openId, name, email, cpf, role, cargo, departamentoId, leaderId, status, loginMethod) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );

      results.colaboradoresCreated++;
      results.success++;
      console.log(`  ✓ ${colab.name}`);
    } catch (error) {
      results.errors.push(`Erro ao criar colaborador ${colab.name}: ${error.message}`);
      console.log(`  ✗ ${colab.name} (erro: ${error.message})`);
    }
  }

  console.log('\n✅ IMPORTAÇÃO CONCLUÍDA!\n');
  console.log(`📊 Resultados:`);
  console.log(`   ✅ Usuários criados: ${results.success}`);
  console.log(`   🏢 Departamentos criados: ${results.departamentosCreated}`);
  console.log(`   👥 Líderes criados: ${results.lidersCreated}`);
  console.log(`   👤 Colaboradores criados: ${results.colaboradoresCreated}`);

  if (results.errors.length > 0) {
    console.log(`\n⚠️  Erros encontrados (${results.errors.length}):`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

} catch (error) {
  console.error('❌ Erro fatal na importação:', error);
} finally {
  await connection.end();
}

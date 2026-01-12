import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Lista de líderes e departamentos
const lideresData = [
  { nome: "Aldeni Batista Torres", departamento: "Regional Médio Norte Colinas" },
  { nome: "Amaggeldo Barbosa", departamento: "Regional Metropolitana" },
  { nome: "Ana Paula Alves Cunha", departamento: "UAS-UNIDADE DE ADMINISTRAÇÃO E SUPRIMENTOS" },
  { nome: "Andreia Rodrigues Facundes", departamento: "UGOC-UNIDADE DE GESTÃO ORÇ. CONTABILIDADE E FINANÇAS" },
  { nome: "Antonio Louça Curcino", departamento: "Regional Sudeste" },
  { nome: "Bruno Martins Vieira", departamento: "UAC-UNIDADE DE ARTICULAÇÃO E COMPETITIVIDADE" },
  { nome: "Dina Makiyama", departamento: "CKM Talents" },
  { nome: "Edvaldo Pereira Lima Júnior", departamento: "Regional Bico do Papagaio" },
  { nome: "Eliwania dos Santos Silva", departamento: "AUD-UNIDADE DE AUDITORIA INTERNA" },
  { nome: "Gabriela Tomasi", departamento: "URC - UNIDADE DE RELACIONAMENTO COM O CLIENTE" },
  { nome: "Gilzane Pereira Amaral", departamento: "URI-UNIDADE DE RELACIONAMENTO INSTITUCIONAL" },
  { nome: "Jackeline de Souza Lima", departamento: "CDE-ASSESSORIA" },
  { nome: "Leonardo Campelo Leite Guedes", departamento: "UTIC-UNIDADE DE TECNOLOGIA DA INFORM. E COMUNICAÇÃO DE DADOS" },
  { nome: "Marcus Vinicius Vieira Queiroz", departamento: "Regional Norte" },
  { nome: "Millena Pereira Lima Rodrigues", departamento: "Regional Portal do Jalapao" },
  { nome: "Nemias Gomes", departamento: "UMC-UNIDADE DE MARKETING E COMUNICAÇÃO" },
  { nome: "Paula dos Reis Coelho Alencar Sousa", departamento: "Regional Sul" },
  { nome: "Pedro Junior da Rocha Silva", departamento: "UGE-UNIDADE DE GESTÃO ESTRATÉGICA E INTEGRIDADE" },
  { nome: "Renata Moura Alves Simas", departamento: "Regional Vale do Araguaia" },
  { nome: "Vera Lucia Teodoro Braga", departamento: "UGP-UNIDADE DE GESTÃO DE PESSOAS" }
];

console.log('🚀 Iniciando inserção de líderes e departamentos...\n');

try {
  for (const liderData of lideresData) {
    console.log(`📋 Processando: ${liderData.nome} - ${liderData.departamento}`);
    
    // 1. Verificar se departamento já existe
    const [deptExistente] = await db.select()
      .from(schema.departamentos)
      .where(schema.eq(schema.departamentos.nome, liderData.departamento))
      .limit(1);
    
    let departamentoId;
    
    if (deptExistente) {
      console.log(`   ✓ Departamento já existe (ID: ${deptExistente.id})`);
      departamentoId = deptExistente.id;
    } else {
      // Criar departamento
      const [novoDept] = await db.insert(schema.departamentos).values({
        nome: liderData.departamento,
        descricao: `Departamento ${liderData.departamento}`,
        status: 'ativo',
        leaderId: null, // Será atualizado depois
        createdAt: new Date(),
        updatedAt: new Date()
      });
      departamentoId = novoDept.insertId;
      console.log(`   ✓ Departamento criado (ID: ${departamentoId})`);
    }
    
    // 2. Gerar email e CPF fictícios
    const primeiroNome = liderData.nome.split(' ')[0].toLowerCase();
    const ultimoNome = liderData.nome.split(' ').pop().toLowerCase();
    const email = `${primeiroNome}.${ultimoNome}@sebrae.to.gov.br`;
    const cpfFicticio = `${Math.floor(10000000000 + Math.random() * 90000000000)}`;
    
    // 3. Verificar se usuário já existe
    const [userExistente] = await db.select()
      .from(schema.users)
      .where(schema.eq(schema.users.email, email))
      .limit(1);
    
    let userId;
    
    if (userExistente) {
      console.log(`   ✓ Usuário já existe (ID: ${userExistente.id})`);
      userId = userExistente.id;
      
      // Atualizar perfil e departamento
      await db.update(schema.users)
        .set({
          role: 'lider',
          departamentoId: departamentoId,
          updatedAt: new Date()
        })
        .where(schema.eq(schema.users.id, userId));
      console.log(`   ✓ Perfil atualizado para Líder`);
    } else {
      // Criar usuário
      const [novoUser] = await db.insert(schema.users).values({
        openId: `local_${cpfFicticio}`,
        name: liderData.nome,
        email: email,
        cpf: cpfFicticio,
        loginMethod: 'cpf',
        role: 'lider',
        cargo: 'Líder',
        leaderId: null, // Líderes não têm líder
        departamentoId: departamentoId,
        status: 'ativo',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date()
      });
      userId = novoUser.insertId;
      console.log(`   ✓ Usuário criado (ID: ${userId})`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   🆔 CPF: ${cpfFicticio}`);
    }
    
    // 4. Atualizar departamento com o líder
    await db.update(schema.departamentos)
      .set({
        leaderId: userId,
        updatedAt: new Date()
      })
      .where(schema.eq(schema.departamentos.id, departamentoId));
    console.log(`   ✓ Líder vinculado ao departamento\n`);
  }
  
  console.log('✅ Processo concluído com sucesso!');
  console.log(`\n📊 Resumo:`);
  console.log(`   - ${lideresData.length} líderes processados`);
  console.log(`   - ${lideresData.length} departamentos configurados`);
  console.log(`\n🔐 Credenciais de acesso:`);
  console.log(`   Email: [primeironome].[ultimonome]@sebrae.to.gov.br`);
  console.log(`   CPF: Gerado automaticamente (veja logs acima)`);
  
} catch (error) {
  console.error('❌ Erro durante a inserção:', error);
  process.exit(1);
} finally {
  await connection.end();
}

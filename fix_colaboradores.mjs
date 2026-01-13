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

console.log('\n========== CORRIGINDO 11 COLABORADORES ÓRFÃOS ==========\n');

// Mapeamento de colaboradores
const colaboradores = [
  // UAS - Ana Paula Alves Santos (ID 180085)
  { id: 180079, name: 'DIOGO SANTOS BARRETO', depto: 10, lider: 180085 },
  { id: 180080, name: 'ALENCAR HUBNER BORELLI', depto: 10, lider: 180085 },
  { id: 180081, name: 'EMERSON EDUARDO AIRES NUNES', depto: 10, lider: 180085 },
  { id: 180082, name: 'THAINA SILVA DE ALENCAR', depto: 10, lider: 180085 },
  { id: 180083, name: 'HIGOR NICHOLLAS DE OLIVEIRA', depto: 10, lider: 180085 },
  { id: 180084, name: 'SEBASTIAO GERALDO DE OLIVEIRA', depto: 10, lider: 180085 },
  { id: 180086, name: 'GETULIO RODRIGUES DE MENDONCA', depto: 10, lider: 180085 },
  { id: 180087, name: 'ANA PAULA CUNHA SOARES', depto: 10, lider: 180085 },
  { id: 180088, name: 'LUDMILA SANTANA BARBOSA', depto: 10, lider: 180085 },
  
  // URI - Gilzane Pereira Amaral (ID 180018)
  { id: 180091, name: 'DURVAL REGO NUNES', depto: 19, lider: 180018 },
  { id: 180092, name: 'HIDE SENNA DE SOUSA SOARES', depto: 19, lider: 180018 }
];

try {
  console.log('Atualizando colaboradores...\n');
  
  for (const colab of colaboradores) {
    await connection.execute(
      'UPDATE users SET departamentoId = ?, leaderId = ? WHERE id = ?',
      [colab.depto, colab.lider, colab.id]
    );
    console.log(`✅ ${colab.name} (ID: ${colab.id}) → Depto: ${colab.depto}, Líder: ${colab.lider}`);
  }

  // Verificar resultado
  console.log('\n========== VERIFICANDO RESULTADO ==========\n');
  
  const ids = colaboradores.map(c => c.id);
  const [updated] = await connection.execute(
    `SELECT id, name, departamentoId, leaderId FROM users WHERE id IN (${ids.join(',')}) ORDER BY id`
  );
  
  console.log('Colaboradores atualizados:');
  updated.forEach(u => {
    console.log(`ID: ${u.id} | ${u.name} | Depto: ${u.departamentoId} | Líder: ${u.leaderId}`);
  });

  console.log('\n========== CORREÇÃO CONCLUÍDA COM SUCESSO ==========\n');

} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await connection.end();
}

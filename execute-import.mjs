import { readFileSync } from 'fs';

// Ler dados processados
const users = JSON.parse(readFileSync('/home/ubuntu/pdi_system/users-to-import.json', 'utf-8'));

console.log(`🚀 Iniciando importação de ${users.length} usuários...`);

// Fazer requisição para API local
const response = await fetch('http://localhost:3000/api/trpc/users.importBulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    users: users
  })
});

const result = await response.json();

if (result.error) {
  console.error('❌ Erro na importação:', result.error);
  process.exit(1);
}

const data = result.result.data;

console.log('\n✅ IMPORTAÇÃO CONCLUÍDA!\n');
console.log(`📊 Resultados:`);
console.log(`   ✅ Usuários criados: ${data.success}`);
console.log(`   🏢 Departamentos criados: ${data.departamentosCreated}`);
console.log(`   👥 Líderes criados: ${data.lidersCreated}`);
console.log(`   👤 Colaboradores criados: ${data.colaboradoresCreated}`);

if (data.errors.length > 0) {
  console.log(`\n⚠️  Erros encontrados (${data.errors.length}):`);
  data.errors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error}`);
  });
}

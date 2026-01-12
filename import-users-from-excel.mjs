import XLSX from 'xlsx';
import { readFileSync } from 'fs';

// Ler arquivo Excel
const filePath = '/home/ubuntu/upload/SEBRAE-TO-CONTATOS-NOME-EMAILECPF(2).xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet);

console.log(`📊 Total de linhas no Excel: ${rawData.length}`);

// Transformar dados
const users = rawData.map((row) => {
  // Limpar CPF
  const cpf = String(row.CPF || '').replace(/\D/g, '');
  
  // Normalizar perfil
  let role = "colaborador";
  const perfilUpper = String(row.PERFIL || '').toUpperCase();
  if (perfilUpper === 'LIDER') {
    role = 'lider';
  } else if (perfilUpper === 'ADMIN' || perfilUpper === 'ADMINISTRADOR') {
    role = 'admin';
  }

  return {
    name: String(row.Colaborador || '').trim(),
    email: row.email ? String(row.email).trim() : undefined,
    cpf: cpf,
    cargo: String(row['FUNÇÃO'] || row.FUNCAO || '').trim(),
    role: role,
    departamento: String(row.Departamento || '').trim().replace(/\s+/g, ' '),
  };
});

// Filtrar válidos
const validUsers = users.filter(u => u.name && u.cpf && u.departamento);

console.log(`✅ Usuários válidos: ${validUsers.length}`);
console.log(`👥 Líderes: ${validUsers.filter(u => u.role === 'lider').length}`);
console.log(`👤 Colaboradores: ${validUsers.filter(u => u.role === 'colaborador').length}`);

// Salvar JSON para importação
import { writeFileSync } from 'fs';
writeFileSync('/home/ubuntu/pdi_system/users-to-import.json', JSON.stringify(validUsers, null, 2));

console.log('\n📁 Arquivo JSON criado: users-to-import.json');
console.log('\n🎯 Próximo passo: Importar via API tRPC');

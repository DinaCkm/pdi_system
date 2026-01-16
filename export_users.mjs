import { createConnection } from 'mysql2/promise';

const connection = await createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pdi_system'
});

const [rows] = await connection.execute('SELECT id, name, email, cpf, role, status, cargo FROM users ORDER BY id');

// Criar CSV
let csv = 'ID,Nome,Email,CPF,Role,Status,Cargo\n';
rows.forEach(row => {
  csv += `${row.id},"${row.name}","${row.email}","${row.cpf}","${row.role}","${row.status}","${row.cargo}"\n`;
});

// Salvar arquivo
import fs from 'fs';
fs.writeFileSync('/home/ubuntu/pdi_system/USUARIOS_BANCO.csv', csv);
console.log('Arquivo exportado com sucesso!');
console.log(`Total de usuários: ${rows.length}`);

// Mostrar primeiros 10
console.log('\nPrimeiros 10 usuários:');
rows.slice(0, 10).forEach(row => {
  console.log(`${row.id} | ${row.name} | ${row.email} | ${row.cpf}`);
});

await connection.end();

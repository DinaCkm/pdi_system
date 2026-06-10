const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkRVA() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // RVA ID is likely 2 based on previous observations, but let's check by name first
  const [depts] = await connection.execute('SELECT id, nome FROM departamentos WHERE nome LIKE "%ARAGUAIA%"');
  console.log('Departamentos encontrados:', depts);
  
  if (depts.length === 0) {
    console.log('Departamento RVA não encontrado.');
    await connection.end();
    return;
  }
  
  const rvaId = depts[0].id;
  
  // Total de ações na RVA
  const [totalAcoes] = await connection.execute(`
    SELECT COUNT(a.id) as count 
    FROM acoes a 
    JOIN pdis p ON a.pdi_id = p.id 
    JOIN usuarios u ON p.colaborador_id = u.id 
    WHERE u.departamento_id = ?
  `, [rvaId]);
  console.log('Total de ações na RVA:', totalAcoes[0].count);

  // Evidências Aguardando na RVA
  const [aguardando] = await connection.execute(`
    SELECT COUNT(e.id) as count 
    FROM evidencias e 
    JOIN acoes a ON e.action_id = a.id 
    JOIN pdis p ON a.pdi_id = p.id 
    JOIN usuarios u ON p.colaborador_id = u.id 
    WHERE u.departamento_id = ? AND e.status = "aguardando_avaliacao"
  `, [rvaId]);
  console.log('Evidências Aguardando na RVA:', aguardando[0].count);

  // Evidências Devolvidas na RVA
  const [devolvidas] = await connection.execute(`
    SELECT COUNT(e.id) as count 
    FROM evidencias e 
    JOIN acoes a ON e.action_id = a.id 
    JOIN pdis p ON a.pdi_id = p.id 
    JOIN usuarios u ON p.colaborador_id = u.id 
    WHERE u.departamento_id = ? AND e.status = "correcao_solicitada"
  `, [rvaId]);
  console.log('Evidências Devolvidas na RVA:', devolvidas[0].count);

  await connection.end();
}

checkRVA().catch(console.error);

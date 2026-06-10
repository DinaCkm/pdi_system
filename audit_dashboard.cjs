const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function audit() {
  const connection = await mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
  });

  const [depts] = await connection.execute('SELECT id, nome FROM departamentos WHERE nome LIKE "%ARAGUAIA%"');
  const rvaId = depts[0]?.id;
  console.log(`Auditoria para RVA (ID: ${rvaId}):`);

  // 1. Ações
  const [acoes] = await connection.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
      SUM(CASE WHEN prazo < CURDATE() AND status != 'concluida' THEN 1 ELSE 0 END) as vencidas
    FROM acoes a
    JOIN pdis p ON a.pdi_id = p.id
    JOIN usuarios u ON p.colaborador_id = u.id
    WHERE u.departamento_id = ?
  `, [rvaId]);
  console.log('Ações:', acoes[0]);

  // 2. Evidências
  const [evidencias] = await connection.execute(`
    SELECT 
      SUM(CASE WHEN e.status = 'aguardando_avaliacao' THEN 1 ELSE 0 END) as aguardando,
      SUM(CASE WHEN e.status = 'correcao_solicitada' THEN 1 ELSE 0 END) as devolvidas
    FROM evidencias e
    JOIN acoes a ON e.action_id = a.id
    JOIN pdis p ON a.pdi_id = p.id
    JOIN usuarios u ON p.colaborador_id = u.id
    WHERE u.departamento_id = ?
  `, [rvaId]);
  console.log('Evidências:', evidencias[0]);

  // 3. Solicitações de Inserção
  const [solicitacoes] = await connection.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status_geral = 'aprovada' THEN 1 ELSE 0 END) as aprovadas,
      SUM(CASE WHEN status_geral IN ('aguardando_ckm', 'aguardando_gestor', 'aguardando_rh', 'em_revisao', 'aguardando_solicitante') THEN 1 ELSE 0 END) as em_andamento,
      SUM(CASE WHEN status_geral IN ('vetada_gestor', 'vetada_rh', 'encerrada_lider') THEN 1 ELSE 0 END) as reprovadas
    FROM solicitacoes_acoes s
    JOIN usuarios u ON s.solicitante_id = u.id
    WHERE u.departamento_id = ?
  `, [rvaId]);
  console.log('Solicitações:', solicitacoes[0]);

  // 4. Ajustes
  const [ajustes] = await connection.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN ar.status = 'aguardando_lider' THEN 1 ELSE 0 END) as com_lider,
      SUM(CASE WHEN ar.status = 'pendente' THEN 1 ELSE 0 END) as com_rh
    FROM adjustment_requests ar
    JOIN acoes a ON ar.action_id = a.id
    JOIN pdis p ON a.pdi_id = p.id
    JOIN usuarios u ON p.colaborador_id = u.id
    WHERE u.departamento_id = ? AND ar.status IN ('pendente', 'aguardando_lider', 'mais_informacoes')
  `, [rvaId]);
  console.log('Ajustes:', ajustes[0]);

  await connection.end();
}

audit().catch(console.error);

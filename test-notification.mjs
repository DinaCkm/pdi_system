import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Buscar admins
  const [admins] = await conn.execute('SELECT id, name, email, role FROM users WHERE role = ?', ['admin']);
  console.log('Admins encontrados:', admins.length);
  
  // Criar notificação de teste para o primeiro admin
  if (admins.length > 0) {
    const admin = admins[0];
    console.log('Criando notificação para:', admin.name);
    
    const [result] = await conn.execute(
      `INSERT INTO notifications (destinatarioId, tipo, titulo, mensagem, lida, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
      [admin.id, 'comentario_lider', 'Teste de Notificação', 'Esta é uma notificação de teste criada diretamente no banco', false]
    );
    console.log('Notificação criada:', result.insertId);
    
    // Verificar se foi criada
    const [notifs] = await conn.execute('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
    console.log('Notificação:', notifs[0]);
  }
  
  await conn.end();
}

main().catch(console.error);

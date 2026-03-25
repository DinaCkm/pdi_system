import { readFileSync } from 'fs';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { users } from '../../drizzle/schema'; // Assumindo que 'users' é uma tabela chave para verificar dados

export async function importInitialData() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Erro: Conexão com o banco de dados não disponível.');
    return;
  }

  try {
    // Verifica se a tabela 'users' está vazia como um indicador de que o banco de dados está vazio
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('ℹ️ Banco de dados já contém dados. Pulando importação inicial.');
      return;
    }

    console.log('🚀 Banco de dados vazio. Iniciando importação de dados iniciais...');

    // O arquivo load_data.sql precisa estar na raiz do projeto para este caminho funcionar no Railway
    const sqlContent = readFileSync('./load_data.sql', 'utf-8');
    console.log('📖 Arquivo load_data.sql lido com sucesso.');

    // Executa múltiplas declarações SQL
    await db.execute(sql`${sqlContent}`);
    console.log('✅ Dados do load_data.sql importados com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a importação de dados iniciais:', error);
    process.exit(1);
  }
}

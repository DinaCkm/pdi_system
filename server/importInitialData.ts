import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { users } from '../../drizzle/schema'; // Assumindo que 'users' é uma tabela chave para verificar dados
import axios from 'axios';

const SQL_DATA_URL = 'https://pastebin.com/raw/U7j18M19'; // URL RAW do Pastebin

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

    // Baixa o conteúdo SQL da URL
    const response = await axios.get(SQL_DATA_URL);
    const sqlContent = response.data;
    console.log('📖 Conteúdo SQL baixado com sucesso da URL.');

    // Executa múltiplas declarações SQL
    await db.execute(sql`${sqlContent}`);
    console.log('✅ Dados SQL importados com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a importação de dados iniciais:', error);
    process.exit(1);
  }
}

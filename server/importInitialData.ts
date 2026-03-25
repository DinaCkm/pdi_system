import { getDb } from './db';
import { sql } from 'drizzle-orm';
import { users } from '../drizzle/schema'; // Assumindo que 'users' é uma tabela chave para verificar dados
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
    const sqlContent: string = response.data;
    console.log('📖 Conteúdo SQL baixado com sucesso da URL.');

    // Divide o conteúdo SQL em declarações individuais separadas por ponto-e-vírgula
    const statements = sqlContent
      .split(';')
      .map((stmt: string) => stmt.trim())
      .filter((stmt: string) => stmt.length > 0);

    console.log(`📋 ${statements.length} declarações SQL encontradas para execução.`);

    // Desabilita verificações de chave estrangeira antes da importação
    await db.execute(sql.raw('SET FOREIGN_KEY_CHECKS = 0'));

    // Executa cada declaração SQL individualmente
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }

    // Reabilita verificações de chave estrangeira após a importação
    await db.execute(sql.raw('SET FOREIGN_KEY_CHECKS = 1'));

    console.log('✅ Dados SQL importados com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a importação de dados iniciais:', error);
    process.exit(1);
  }
}

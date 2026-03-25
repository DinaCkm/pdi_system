import { db } from "../db";
import { sql } from "drizzle-orm";
import axios from "axios";

async function importInitialData() {
  console.log("🚀 Iniciando Carga Total de Elite (Garantindo PDIs e Ações)...");

  try {
    const sqlUrl = "https://pdi-ckm.s3.us-east-1.amazonaws.com/backup_pdi_system_20250324_223405.sql";
    const response = await axios.get(sqlUrl);
    const sqlContent = response.data;

    if (!sqlContent) {
      throw new Error("Conteúdo SQL vazio ou não encontrado.");
    }

    // Desabilitar checks de FK para permitir a carga em qualquer ordem
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    console.log("🔓 Verificação de Chaves Estrangeiras desabilitada.");

    // Dividir o conteúdo em comandos individuais por ponto e vírgula
    // Regex aprimorada para lidar com strings que podem conter ponto e vírgula
    const commands = sqlContent
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map((cmd: string) => cmd.trim())
      .filter((cmd: string) => cmd.length > 5);

    console.log(`📖 Total de comandos SQL encontrados: ${commands.length}`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const tableStats: Record<string, number> = {};

    for (const command of commands) {
      try {
        // Limpeza do comando para MySQL (substituir aspas duplas por crases se necessário)
        // O backup do PostgreSQL usa aspas duplas em nomes de tabelas/colunas, o MySQL usa crases
        let finalCommand = command
          .replace(/"(\w+)"/g, '`$1`') // Substitui "tabela" por `tabela`
          .replace(/INSERT INTO/i, "INSERT IGNORE INTO"); // Ignora duplicatas

        // Executar o comando SQL bruto
        await db.execute(sql.raw(finalCommand));
        
        // Extrair nome da tabela para o resumo
        const tableMatch = finalCommand.match(/INSERT IGNORE INTO\s+`?(\w+)`?/i);
        const tableName = tableMatch ? tableMatch[1] : "outros";
        tableStats[tableName] = (tableStats[tableName] || 0) + 1;
        
        successCount++;
      } catch (err: any) {
        if (err.message && err.message.includes("Duplicate entry")) {
          skipCount++;
        } else {
          // Logar apenas os primeiros 100 caracteres do comando com erro para não poluir o log
          console.error(`❌ Erro no comando: ${command.substring(0, 100)}...`);
          console.error(`Mensagem: ${err.message}`);
          errorCount++;
        }
      }
    }

    // Reabilitar checks de FK
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("🔒 Verificação de Chaves Estrangeiras reabilitada.");

    console.log("\n--- 📊 RESUMO DA CARGA DE DADOS ---");
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`⏭️ Ignorados (duplicados): ${skipCount}`);
    console.log(`❌ Erros reais: ${errorCount}`);
    console.log("\n--- Detalhamento por Tabela ---");
    Object.entries(tableStats).forEach(([table, count]) => {
      console.log(`- ${table}: ${count} registros carregados`);
    });
    console.log("-----------------------------------\n");

  } catch (error) {
    console.error("❌ Erro fatal na importação:", error);
    process.exit(1);
  }
}

importInitialData();

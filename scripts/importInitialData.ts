import { db } from "../db";
import { sql } from "drizzle-orm";
import axios from "axios";

async function importInitialData() {
  console.log("🚀 Iniciando Carga Total de Elite 3.0 (Mestre de Mapeamento)...");

  try {
    const sqlUrl = "https://pdi-ckm.s3.us-east-1.amazonaws.com/backup_pdi_system_20250324_223405.sql";
    const response = await axios.get(sqlUrl);
    const sqlContent = response.data;

    if (!sqlContent) {
      throw new Error("Conteúdo SQL vazio ou não encontrado.");
    }

    // Desabilitar checks de FK
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    console.log("🔓 Verificação de Chaves Estrangeiras desabilitada.");

    // Mapeamento de tabelas (Backup -> Novo Sistema)
    const tableMap: Record<string, string> = {
      "actions": "action",
      "pdis": "pdi",
      "users": "user",
      "ciclos": "ciclo",
      "evidences": "evidence",
      "notifications": "notification",
      "audit_log": "audit_log",
      "acoes_historico": "acoes_historico",
      "adjustment_requests": "adjustment_request",
      "adjustment_comments": "adjustment_comment",
      "normas_regras": "normas_regra"
    };

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
        let finalCommand = command.replace(/"(\w+)"/g, '`$1`');
        
        // Aplicar mapeamento de nomes de tabelas
        Object.entries(tableMap).forEach(([oldName, newName]) => {
          const regex = new RegExp(`INSERT INTO \`?${oldName}\`?`, 'gi');
          finalCommand = finalCommand.replace(regex, `INSERT IGNORE INTO \`${newName}\``);
        });

        // Garantir INSERT IGNORE mesmo se não mapeado
        if (!finalCommand.includes("INSERT IGNORE")) {
          finalCommand = finalCommand.replace(/INSERT INTO/i, "INSERT IGNORE INTO");
        }

        await db.execute(sql.raw(finalCommand));
        
        const tableMatch = finalCommand.match(/INSERT IGNORE INTO\s+`?(\w+)`?/i);
        const tableName = tableMatch ? tableMatch[1] : "outros";
        tableStats[tableName] = (tableStats[tableName] || 0) + 1;
        
        successCount++;
      } catch (err: any) {
        if (err.message && err.message.includes("Duplicate entry")) {
          skipCount++;
        } else {
          errorCount++;
        }
      }
    }

    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("🔒 Verificação de Chaves Estrangeiras reabilitada.");

    console.log("\n--- 📊 RESUMO DA CARGA 3.0 ---");
    Object.entries(tableStats).forEach(([table, count]) => {
      console.log(`- ${table}: ${count} comandos executados`);
    });
    console.log(`✅ Sucesso: ${successCount} | ⏭️ Ignorados: ${skipCount} | ❌ Erros: ${errorCount}`);

  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}

importInitialData();

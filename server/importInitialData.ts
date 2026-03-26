import { getDb } from "./db";
import { sql } from "drizzle-orm";
import axios from "axios";

async function importInitialData() {
  console.log("🚀 Iniciando importação do backup (MySQL)...");

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available (falha ao conectar no DB)");

    const sqlUrl =
      "https://pdi-ckm.s3.us-east-1.amazonaws.com/backup_pdi_system_20250324_223405.sql";

    console.log("📥 Baixando arquivo SQL...");
    const response = await axios.get(sqlUrl, { timeout: 120000 }); // 2 min
    const sqlContent = response.data;

    if (!sqlContent || typeof sqlContent !== "string") {
      throw new Error("Conteúdo SQL vazio ou inválido.");
    }

    // Desabilitar checks de FK
    await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 0"));
    console.log("🔓 FOREIGN_KEY_CHECKS = 0");

    // Quebrar em comandos por ponto e vírgula (sem quebrar dentro de strings)
    const commands = sqlContent
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map((cmd: string) => cmd.trim())
      .filter((cmd: string) => cmd.length > 0);

    console.log(`📖 Total de comandos encontrados no arquivo: ${commands.length}`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const tableStats: Record<string, number> = {};

    for (const command of commands) {
      // Ignorar comentários e comandos vazios
      if (!command || command.startsWith("--") || command.startsWith("/*")) continue;

      // ✅ Importar só INSERT (o resto do dump geralmente dá ruído / erro)
      // Se seu dump tiver COPY (Postgres), este importador não executa COPY.
      if (!/^insert\s+into/i.test(command)) continue;

      try {
        // Ajustes de compatibilidade:
        // 1) "tabela" -> `tabela`
        // 2) INSERT INTO -> INSERT IGNORE INTO (evita quebrar por duplicidade)
        const finalCommand = command
          .replace(/"([a-zA-Z0-9_]+)"/g, "`$1`")
          .replace(/^INSERT\s+INTO/i, "INSERT IGNORE INTO");

        await db.execute(sql.raw(finalCommand));

        // Extrair nome da tabela para estatística
        const tableMatch = finalCommand.match(/INSERT IGNORE INTO\s+`?([a-zA-Z0-9_]+)`?/i);
        const tableName = tableMatch ? tableMatch[1] : "outros";
        tableStats[tableName] = (tableStats[tableName] || 0) + 1;

        successCount++;
      } catch (err: any) {
        const msg = String(err?.message || err);

        // Duplicidade: conta como "ignorado"
        if (msg.includes("Duplicate entry")) {
          skipCount++;
          continue;
        }

        console.error(`❌ Erro no comando: ${command.substring(0, 120)}...`);
        console.error(`Mensagem: ${msg}`);
        errorCount++;
      }
    }

    // Reabilitar FK
    await db.execute(sql.raw("SET FOREIGN_KEY_CHECKS = 1"));
    console.log("🔒 FOREIGN_KEY_CHECKS = 1");

    console.log("\n--- 📊 RESUMO DA IMPORTAÇÃO ---");
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`⏭️ Ignorados (duplicados): ${skipCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log("\n--- Por Tabela (comandos INSERT executados) ---");
    Object.entries(tableStats).forEach(([table, count]) => {
      console.log(`- ${table}: ${count}`);
    });
    console.log("--------------------------------------------\n");
  } catch (error) {
    console.error("❌ Erro fatal na importação:", error);
    process.exit(1);
  }
}

importInitialData();

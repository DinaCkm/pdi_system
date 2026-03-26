import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import * as XLSX from "xlsx";

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function buildMysqlConfig() {
  // 1) Preferir DATABASE_URL (é o que seu app usa no Railway)
  const databaseUrl = getEnv("DATABASE_URL") || getEnv("MYSQL_PUBLIC_URL");

  if (databaseUrl) {
    try {
      const u = new URL(databaseUrl);

      const host = u.hostname;
      const port = Number(u.port || "3306");
      const user = decodeURIComponent(u.username || "root");
      const password = decodeURIComponent(u.password || "");
      const database = (u.pathname || "/railway").replace("/", "") || "railway";

      // Se vier sem senha (raro), cai no fallback abaixo
      if (password) {
        return { host, port, user, password, database };
      }
    } catch (e) {
      // se der erro ao ler a URL, cai no fallback abaixo
    }
  }

  // 2) Fallback: variáveis MYSQL* (caso existam no ambiente)
  const host = getEnv("MYSQLHOST") || getEnv("DB_HOST") || "mysql.railway.internal";
  const port = Number(getEnv("MYSQLPORT") || getEnv("DB_PORT") || "3306");
  const user = getEnv("MYSQLUSER") || getEnv("DB_USER") || "root";
  const password =
    getEnv("MYSQLPASSWORD") ||
    getEnv("MYSQL_ROOT_PASSWORD") ||
    getEnv("DB_PASSWORD") ||
    "";
  const database = getEnv("MYSQLDATABASE") || getEnv("DB_NAME") || "railway";

  return { host, port, user, password, database };
}

function findLatestCsv(csvDir: string, tableName: string): string | null {
  const files = fs.readdirSync(csvDir).filter((f) => f.toLowerCase().endsWith(".csv"));
  // Ex.: pdis_20260326_014144.csv  -> tableName = pdis
  const candidates = files
    .filter((f) => f.startsWith(tableName + "_") && f.toLowerCase().endsWith(".csv"))
    .sort(); // o sufixo de data/hora deixa o mais novo no final
  if (!candidates.length) return null;
  return path.join(csvDir, candidates[candidates.length - 1]);
}

function readCsvAsObjects(filePath: string): Record<string, any>[] {
  // XLSX lê CSV muito bem e já está nas dependências do projeto
  const wb = XLSX.readFile(filePath, { raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const csvDir = path.resolve("backups/csv");
  if (!fs.existsSync(csvDir)) {
    console.error(`❌ Pasta não encontrada: ${csvDir}`);
    process.exit(1);
  }

  // Ordem segura (respeita dependências)
  const importOrder = [
    "departamentos",
    "ciclos",
    "competencias_macros",
    "users",                 // só importa se existir CSV de users
    "user_department_roles",
    "pdis",
    "actions",
    "pdi_validacoes",
    "solicitacoes_acoes",
    "adjustment_requests",
    "adjustment_comments",
    "audit_log",
    "evidences",
    "evidence_texts",
    "evidence_files",
    "notifications",
    "deletion_audit_log",
    "acoes_historico",
    // tabelas extras (só se existirem no banco e no CSV)
    "blocos",
    "backups",
    "macros",
    "micros",
    "normas_regras",
  ];

  // Vamos limpar só o que vamos importar (não apaga users se não tiver CSV de users)
  const deleteOrder = [...importOrder].reverse();

  const cfg = buildMysqlConfig();
  console.log("🔌 Conectando no MySQL:", { host: cfg.host, port: cfg.port, database: cfg.database, user: cfg.user });

  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: false,
  });

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  console.log("🔓 FOREIGN_KEY_CHECKS = 0");

  // Descobrir quais tabelas existem no banco
  const [tables] = await conn.query<any[]>("SHOW TABLES");
  const tableKey = Object.keys(tables[0] || {})[0]; // ex.: "Tables_in_railway"
  const existingTables = new Set((tables || []).map((r: any) => r[tableKey]));

  // Limpar dados (apenas das tabelas que têm CSV e existem no banco)
  console.log("🧹 Limpando tabelas que serão importadas...");
  for (const table of deleteOrder) {
    const csvPath = findLatestCsv(csvDir, table);
    if (!csvPath) continue; // não tem CSV, não mexe
    if (!existingTables.has(table)) {
      console.log(`⚠️ Tabela não existe no banco, pulando limpeza: ${table}`);
      continue;
    }
    if (table === "users") {
      console.log("ℹ️ users.csv encontrado — vou limpar users antes de importar.");
    }
    await conn.query(`TRUNCATE TABLE \`${table}\``);
    console.log(`🗑️ TRUNCATE ${table}`);
  }

  // Importar dados
  console.log("📦 Importando CSVs...");
  for (const table of importOrder) {
    const csvPath = findLatestCsv(csvDir, table);
    if (!csvPath) {
      continue; // sem CSV, pula
    }
    if (!existingTables.has(table)) {
      console.log(`⚠️ Tabela não existe no banco, pulando import: ${table}`);
      continue;
    }

    console.log(`\n➡️ Importando ${table} de ${path.basename(csvPath)} ...`);
    const rows = readCsvAsObjects(csvPath);

    if (!rows.length) {
      console.log(`⚠️ CSV vazio, pulando: ${table}`);
      continue;
    }

    const cols = Object.keys(rows[0]).filter((c) => c && c.trim().length > 0);

    // Montar array de valores por linha
    const values = rows.map((r) =>
      cols.map((c) => {
        const v = r[c];
        // Normalização simples
        if (v === "") return null;
        return v;
      })
    );

    const sql = `INSERT IGNORE INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES ?`;

    let inserted = 0;
    for (const part of chunk(values, 500)) {
      await conn.query(sql, [part]);
      inserted += part.length;
    }
    console.log(`✅ ${table}: ${inserted} linhas processadas`);
  }

  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("\n🔒 FOREIGN_KEY_CHECKS = 1");
  await conn.end();

  console.log("\n🎉 Importação concluída.");
}

main().catch((e) => {
  console.error("❌ Falha geral na importação:", e);
  process.exit(1);
});

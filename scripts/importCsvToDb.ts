// updated importer
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import * as XLSX from "xlsx";

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

type MysqlCfg = { host: string; port: number; user: string; password: string; database: string };

function buildMysqlConfig(): MysqlCfg {
  // 1) Preferir DATABASE_URL (é o que o app usa no Railway)
  const databaseUrl = getEnv("DATABASE_URL") || getEnv("MYSQL_PUBLIC_URL");

  if (databaseUrl) {
    try {
      const u = new URL(databaseUrl);

      const host = u.hostname;
      const port = Number(u.port || "3306");
      const user = decodeURIComponent(u.username || "root");
      const password = decodeURIComponent(u.password || "");
      const database = (u.pathname || "/railway").replace("/", "") || "railway";

      if (password) return { host, port, user, password, database };
    } catch {
      // cai no fallback abaixo
    }
  }

  // 2) Fallback: variáveis MYSQL*
  const host = getEnv("MYSQLHOST") || getEnv("DB_HOST") || "mysql.railway.internal";
  const port = Number(getEnv("MYSQLPORT") || getEnv("DB_PORT") || "3306");
  const user = getEnv("MYSQLUSER") || getEnv("DB_USER") || "root";
  const password =
    getEnv("MYSQLPASSWORD") || getEnv("MYSQL_ROOT_PASSWORD") || getEnv("DB_PASSWORD") || "";
  const database = getEnv("MYSQLDATABASE") || getEnv("DB_NAME") || "railway";

  return { host, port, user, password, database };
}

function findLatestCsv(csvDir: string, tableName: string): string | null {
  const files = fs.readdirSync(csvDir).filter((f) => f.toLowerCase().endsWith(".csv"));
  const candidates = files
    .filter((f) => f.startsWith(tableName + "_") && f.toLowerCase().endsWith(".csv"))
    .sort();
  if (!candidates.length) return null;
  return path.join(csvDir, candidates[candidates.length - 1]);
}

function readCsvAsObjects(filePath: string): Record<string, any>[] {
  const wb = XLSX.readFile(filePath, { raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getTableColumns(conn: mysql.Connection, table: string): Promise<Set<string>> {
  // Descobre colunas reais da tabela no MySQL (pra evitar erro se CSV tiver colunas extras)
  const [rows] = await conn.query<any[]>(`SHOW COLUMNS FROM \`${table}\``);
  return new Set(rows.map((r: any) => String(r.Field)));
}

function normalizeValue(v: any) {
  if (v === "") return null;
  return v;
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
    "users", // só importa se existir CSV de users
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
    // extras (só se existirem no banco E tiver CSV)
    "blocos",
    "backups",
    "macros",
    "micros",
    "normas_regras",
  ];

  const deleteOrder = [...importOrder].reverse();

  const cfg = buildMysqlConfig();
  console.log("🔌 Conectando no MySQL:", {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    usingPassword: cfg.password ? "YES" : "NO",
  });

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

  // Mapear tabelas -> csv mais recente (pra ficar bem explícito no log)
  const csvByTable: Record<string, string> = {};
  for (const t of importOrder) {
    const p = findLatestCsv(csvDir, t);
    if (p) csvByTable[t] = p;
  }

  console.log("📁 CSVs detectados:");
  Object.entries(csvByTable).forEach(([t, p]) => console.log(`- ${t}: ${path.basename(p)}`));

  // Limpar dados (apenas das tabelas que têm CSV e existem no banco)
  console.log("\n🧹 Limpando tabelas que serão importadas...");
  for (const table of deleteOrder) {
    const csvPath = csvByTable[table];
    if (!csvPath) continue;
    if (!existingTables.has(table)) {
      console.log(`⚠️ Tabela não existe no banco, pulando limpeza: ${table}`);
      continue;
    }
    await conn.query(`TRUNCATE TABLE \`${table}\``);
    console.log(`🗑️ TRUNCATE ${table}`);
  }

  // Importar dados
  console.log("\n📦 Importando CSVs...");
  for (const table of importOrder) {
    const csvPath = csvByTable[table];
    if (!csvPath) continue;

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

    // Colunas existentes na tabela
    const tableCols = await getTableColumns(conn, table);

    // Colunas do CSV, filtradas para só as que existem no MySQL
    const csvCols = Object.keys(rows[0]).filter((c) => c && c.trim().length > 0);
    const cols = csvCols.filter((c) => tableCols.has(c));

    // Se nenhuma coluna bate, não tem como importar
    if (!cols.length) {
      console.log(`❌ Nenhuma coluna do CSV corresponde à tabela ${table}. Pulando.`);
      console.log(`CSV cols: ${csvCols.join(", ")}`);
      continue;
    }

    // Avisar colunas ignoradas (muito útil pra entender por que algo não aparece)
    const ignored = csvCols.filter((c) => !tableCols.has(c));
    if (ignored.length) {
      console.log(`ℹ️ Colunas ignoradas (não existem na tabela ${table}): ${ignored.join(", ")}`);
    }

    const values = rows.map((r) => cols.map((c) => normalizeValue(r[c])));

    const insertSql = `INSERT IGNORE INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES ?`;

    let processed = 0;
    for (const part of chunk(values, 500)) {
      await conn.query(insertSql, [part]);
      processed += part.length;
    }

    console.log(`✅ ${table}: ${processed} linhas processadas`);
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

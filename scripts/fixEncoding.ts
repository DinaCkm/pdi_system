import mysql from "mysql2/promise";

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

type MysqlCfg = { host: string; port: number; user: string; password: string; database: string };

function buildMysqlConfig(): MysqlCfg {
  const databaseUrl = getEnv("DATABASE_URL") || getEnv("MYSQL_PUBLIC_URL");

  if (databaseUrl) {
    const u = new URL(databaseUrl);
    return {
      host: u.hostname,
      port: Number(u.port || "3306"),
      user: decodeURIComponent(u.username || "root"),
      password: decodeURIComponent(u.password || ""),
      database: (u.pathname || "/railway").replace("/", "") || "railway",
    };
  }

  return {
    host: getEnv("MYSQLHOST") || "mysql.railway.internal",
    port: Number(getEnv("MYSQLPORT") || "3306"),
    user: getEnv("MYSQLUSER") || "root",
    password: getEnv("MYSQLPASSWORD") || getEnv("MYSQL_ROOT_PASSWORD") || "",
    database: getEnv("MYSQLDATABASE") || "railway",
  };
}

// Corrige "Ã§Ã£" etc: interpreta o texto como latin1 e converte para utf8mb4
function fixExpr(col: string) {
  return `CONVERT(BINARY CONVERT(${col} USING latin1) USING utf8mb4)`;
}

// Só tenta corrigir linhas “suspeitas”
const WHERE_BAD = `(${/* sinais comuns */""}
  %s LIKE '%Ã%' OR %s LIKE '%Â%' OR %s LIKE '%�%'
)`;

async function fixColumn(conn: mysql.Connection, table: string, col: string) {
  const where = WHERE_BAD.replaceAll("%s", `\`${col}\``);
  const sql = `UPDATE \`${table}\`
               SET \`${col}\` = ${fixExpr(`\`${col}\``)}
               WHERE ${where};`;

  const [res] = await conn.query<any>(sql);
  const changed = Number(res?.affectedRows || 0);
  if (changed > 0) console.log(`✅ ${table}.${col}: ${changed} linhas corrigidas`);
}

async function main() {
  const cfg = buildMysqlConfig();
  console.log("🔌 Conectando para corrigir acentos:", {
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
  });

  // Lista “manual” das colunas que normalmente aparecem na tela e podem ter texto
  const targets: Array<[string, string[]]> = [
    ["users", ["name", "email", "cpf", "cargo", "loginMethod"]],
    ["departamentos", ["nome", "descricao"]],
    ["competencias_macros", ["nome", "descricao"]],
    ["pdis", ["titulo", "objetivoGeral", "relatorioAnalise", "relatorioArquivoNome"]],
    ["actions", ["microcompetencia", "titulo", "descricao", "status"]],
    ["acoes_historico", ["campo", "valorAnterior", "valorNovo", "motivoAlteracao"]],
    ["evidences", ["descricao", "arquivo", "oQueRealizou", "comoAplicou", "resultadoPratico", "principalAprendizado", "parecerImpacto", "linkExterno"]],
    ["evidence_texts", ["titulo", "texto"]],
    ["evidence_files", ["fileName", "fileType", "fileUrl", "fileKey"]],
    ["notifications", ["tipo", "titulo", "mensagem"]],
    ["adjustment_requests", ["justificativa", "camposAjustar", "justificativaAdmin", "dadosAntesAjuste", "dadosAposAjuste"]],
    ["adjustment_comments", ["comentario"]],
    ["audit_log", ["campo", "valorAnterior", "valorNovo"]],
    ["deletion_audit_log", ["entidadeNome", "dadosExcluidos", "excluidoPorNome", "motivoExclusao"]],
    ["solicitacoes_acoes", ["titulo", "descricao", "porqueFazer", "ondeFazer", "linkEvento", "previsaoInvestimento", "historicoRodadas", "ckmParecerTexto", "liderMotivoRevisao", "gestorJustificativa", "rhJustificativa"]],
    ["normas_regras", ["titulo", "subtitulo", "conteudo", "icone", "imagemUrl", "categoria"]],
  ];

  console.log("🛠️ Iniciando correção… (isso pode levar alguns minutos)");
  let total = 0;

  for (const [table, cols] of targets) {
    for (const col of cols) {
      try {
        await fixColumn(conn, table, col);
        total++;
      } catch (e: any) {
        // Se alguma coluna não existir, apenas avisa e segue
        const msg = String(e?.message || e);
        if (msg.includes("Unknown column") || msg.includes("doesn't exist")) {
          console.log(`ℹ️ ${table}.${col}: coluna não existe (ok, pulei)`);
        } else if (msg.includes("Table") && msg.includes("doesn't exist")) {
          console.log(`ℹ️ ${table}: tabela não existe (ok, pulei)`);
          break;
        } else {
          console.log(`⚠️ ${table}.${col}: não consegui corrigir (${msg})`);
        }
      }
    }
  }

  await conn.end();
  console.log(`🎉 Correção finalizada. Verifique o sistema agora. (colunas processadas: ${total})`);
}

main().catch((e) => {
  console.error("❌ Erro fatal na correção:", e);
  process.exit(1);
});
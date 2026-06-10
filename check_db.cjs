const { mysqlTable, int, varchar, text, date, timestamp, mysqlEnum, boolean } = require("drizzle-orm/mysql-core");
const { sql } = require("drizzle-orm");
const mysql = require("mysql2/promise");

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.execute('SELECT statusGeral, COUNT(*) as total FROM solicitacoes_acoes GROUP BY statusGeral');
  console.log(rows);
  await connection.end();
}

run().catch(console.error);

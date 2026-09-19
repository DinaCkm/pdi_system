const mysql = require("mysql2/promise");

const ORIGENS = ["Administradora", "Administradora2", "Administradora5"];
const DESTINO = "Administrador";

async function main() {
  if (process.env.CONFIRMAR_AJUSTE_ADMINISTRADORAS !== "SIM") {
    throw new Error("Ajuste bloqueado. Defina CONFIRMAR_AJUSTE_ADMINISTRADORAS=SIM somente após autorização explícita.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const connection = await mysql.createConnection(url);
  try {
    const [antes] = await connection.query("SELECT cargo, COUNT(*) AS quantidade FROM users WHERE cargo IN (?, ?, ?) GROUP BY cargo ORDER BY cargo", ORIGENS);
    const contagens = Object.fromEntries(antes.map(row => [String(row.cargo), Number(row.quantidade)]));
    for (const origem of ORIGENS) {
      if (contagens[origem] !== 1) {
        throw new Error("Ajuste bloqueado: esperado exatamente 1 registro com cargo \"" + origem + "\", encontrado " + (contagens[origem] || 0) + ".");
      }
    }
    await connection.beginTransaction();
    for (const origem of ORIGENS) {
      const [result] = await connection.query("UPDATE users SET cargo = ? WHERE cargo = ?", [DESTINO, origem]);
      if (result.affectedRows !== 1) {
        throw new Error("Falha no ajuste de \"" + origem + "\": esperado 1 registro alterado, obtido " + result.affectedRows + ".");
      }
    }
    const [depois] = await connection.query("SELECT cargo, COUNT(*) AS quantidade FROM users WHERE cargo IN (?, ?, ?, ?) GROUP BY cargo ORDER BY cargo", [...ORIGENS, DESTINO]);
    const pos = Object.fromEntries(depois.map(row => [String(row.cargo), Number(row.quantidade)]));
    for (const origem of ORIGENS) {
      if ((pos[origem] || 0) !== 0) throw new Error("Validação final falhou: ainda existe cargo \"" + origem + "\".");
    }
    await connection.commit();
    console.log(JSON.stringify({
      status: "APLICADO",
      alteracoes: ORIGENS.map(origem => ({ de: origem, para: DESTINO, quantidade: 1 })),
      administradorTotalAposAjuste: pos[DESTINO] || 0,
    }, null, 2));
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => { console.error(error); process.exit(1); });

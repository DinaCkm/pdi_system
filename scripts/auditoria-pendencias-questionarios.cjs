const mysql = require("mysql2/promise");

const pessoas = [
  {
    alvo: "Maryellen Leite de Araujo",
    email: "maryellen.carneiro@to.sebrae.com.br",
    fragments: ["maryellen","mary","leite","araujo","carneiro"]
  },
  {
    alvo: "Welligton dos Passos Silva",
    email: "welligton.passos@to.sebrae.com.br",
    fragments: ["welligton","wellington","passos","silva"]
  },
  {
    alvo: "Viviane Fernandes de",
    email: "viviane.teixeira@to.sebrae.com.br",
    fragments: ["viviane","vivian","fernandes","teixeira"]
  }
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
  const db = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    for (const p of pessoas) {
      const terms = p.fragments.map(() => "(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)").join(" OR ");
      const params = [];
      for (const f of p.fragments) {
        params.push("%" + f + "%", "%" + f + "%");
      }

      const [users] = await db.execute(
        "SELECT id,name,email,status,cargo,departamentoId,createdAt,updatedAt,lastSignedIn FROM users WHERE " + terms + " ORDER BY status DESC,name ASC",
        params
      );

      const delTerms = p.fragments.map(() => "(LOWER(entidadeNome) LIKE ? OR LOWER(dadosExcluidos) LIKE ?)").join(" OR ");
      const delParams = [];
      for (const f of p.fragments) {
        delParams.push("%" + f + "%", "%" + f + "%");
      }
      const [deleted] = await db.execute(
        "SELECT id,entidadeId,entidadeNome,dadosExcluidos,motivoExclusao,createdAt FROM deletion_audit_log WHERE entidadeTipo='usuario' AND (" + delTerms + ") ORDER BY createdAt DESC",
        delParams
      );

      console.log("[AUDIT] TARGET", JSON.stringify({alvo:p.alvo,email:p.email}));
      console.log("[AUDIT] USERS", JSON.stringify(users));
      console.log("[AUDIT] DELETED", JSON.stringify(deleted));
    }
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error("[AUDIT] ERROR", e);
  process.exit(1);
});

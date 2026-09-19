const mysql = require("mysql2/promise");
const crypto = require("crypto");

const MAPA = new Map([
  ["ANALISTA REGIONAL", "Analista Técnico I"],
  ["ANALISTA TÉCNICO I", "Analista Técnico I"],
  ["ANALISTA TÉCNICO II", "Analista Técnico III"],
  ["GERENTE DE UNIDADE", "Gerente"],
  ["Analista Técnico I", "Analista Técnico I"],
  ["ASSISTENTE II", "Assistente"],
  ["ASSISTENTE", "Assistente"],
  ["ASSISTENTE REGIONAL", "Assistente"],
  ["GERENTE REGIONAL", "Gerente"],
  ["Analista Técnico II", "Analista Técnico III"],
  ["Gestor do Projeto Evoluir", "Gerente"],
  ["ANALISTA TÉCNICO III", "Analista Técnico III"],
  ["ASSISTENTE I", "Assistente I"],
  ["Analista Regional", "Analista Técnico I"],
  ["Assistente II", "Assistente"],
  ["TESTE", "Teste"],
  ["0140", "Teste"],
  ["Administradora", "Administrador"],
  ["Administradora2", "Administrador"],
  ["Administradora5", "Administrador"],
  ["Analista", "Analista Técnico I"],
  ["Analista de Relacionamento", "Analista Técnico I"],
  ["ANALISTA I", "Analista Técnico I"],
  ["Analista Técnico III", "Analista Técnico III"],
  ["Colaborador", "Administrador"],
  ["Gerente de Unidade", "Gerente"],
  ["Gestor do Projeto Evoluir - Apoio", "Gerente"],
  ["Líder", "Gerente"],
]);

const CONTAGENS_APROVADAS = {
  "ANALISTA REGIONAL": 43,
  "ANALISTA TÉCNICO I": 29,
  "ANALISTA TÉCNICO II": 26,
  "GERENTE DE UNIDADE": 11,
  "Analista Técnico I": 9,
  "ASSISTENTE II": 9,
  "ASSISTENTE": 8,
  "ASSISTENTE REGIONAL": 8,
  "GERENTE REGIONAL": 8,
  "Analista Técnico II": 7,
  "Gestor do Projeto Evoluir": 5,
  "ANALISTA TÉCNICO III": 3,
  "ASSISTENTE I": 3,
  "Analista Regional": 2,
  "Assistente II": 2,
  "TESTE": 2,
  "0140": 1,
  "Administradora": 1,
  "Administradora2": 1,
  "Administradora5": 1,
  "Analista": 1,
  "Analista de Relacionamento": 1,
  "ANALISTA I": 1,
  "Analista Técnico III": 1,
  "Colaborador": 1,
  "Gerente de Unidade": 1,
  "Gestor do Projeto Evoluir - Apoio": 1,
  "Líder": 1,
};

const DESTINOS_ESPERADOS = {
  "Analista Técnico I": 86,
  "Analista Técnico III": 37,
  "Gerente": 27,
  "Assistente": 27,
  "Administrador": 4,
  "Assistente I": 3,
  "Teste": 3,
};

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--dry-run")) return { mode: "dry-run" };
  if (args.includes("--apply")) return { mode: "apply" };
  const idx = args.indexOf("--rollback");
  if (idx >= 0 && args[idx + 1]) return { mode: "rollback", operationId: args[idx + 1] };
  throw new Error("Uso: node scripts/normalizar-cargos.cjs --dry-run | --apply | --rollback <operationId>");
}

function toCount(value) {
  return Number(value ?? 0);
}

async function lerContagens(connection) {
  const [rows] = await connection.query(
    `SELECT cargo, COUNT(*) AS quantidade
       FROM users
      GROUP BY cargo
      ORDER BY cargo`,
  );
  const contagens = new Map();
  for (const row of rows) {
    const cargo = String(row.cargo ?? "").trim();
    contagens.set(cargo, (contagens.get(cargo) ?? 0) + toCount(row.quantidade));
  }
  return contagens;
}

function validarSnapshot(contagens) {
  const erros = [];
  for (const [cargo, esperado] of Object.entries(CONTAGENS_APROVADAS)) {
    const atual = contagens.get(cargo) || 0;
    if (atual !== esperado) erros.push({ cargo, esperado, atual });
  }

  const desconhecidos = [];
  for (const [cargo, quantidade] of contagens.entries()) {
    if (!MAPA.has(cargo)) desconhecidos.push({ cargo, quantidade });
  }

  return { erros, desconhecidos };
}

function consolidar(contagens) {
  const destino = {};
  let totalMapeado = 0;
  let alteracoes = 0;

  for (const [origem, quantidade] of contagens.entries()) {
    if (!MAPA.has(origem)) continue;
    const novo = MAPA.get(origem);
    totalMapeado += quantidade;
    if (origem !== novo) alteracoes += quantidade;
    destino[novo] = (destino[novo] || 0) + quantidade;
  }

  return { destino, totalMapeado, alteracoes };
}

function validarDestinos(destino) {
  const erros = [];
  for (const [cargo, esperado] of Object.entries(DESTINOS_ESPERADOS)) {
    const atual = destino[cargo] || 0;
    if (atual !== esperado) erros.push({ cargo, esperado, atual });
  }
  const extras = Object.entries(destino)
    .filter(([cargo]) => !(cargo in DESTINOS_ESPERADOS))
    .map(([cargo, quantidade]) => ({ cargo, quantidade }));
  return { erros, extras };
}

async function ensureBackupTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS cargo_normalizacao_backup (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation_id VARCHAR(64) NOT NULL,
      user_id INT NOT NULL,
      cargo_anterior VARCHAR(255) NOT NULL,
      cargo_novo VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY cargo_norm_backup_oper_user_uq (operation_id, user_id),
      INDEX cargo_norm_backup_operation_idx (operation_id),
      CONSTRAINT cargo_norm_backup_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function dryRun(connection) {
  await connection.query("SET TRANSACTION READ ONLY");
  await connection.beginTransaction();
  try {
    const contagens = await lerContagens(connection);
    const snapshot = validarSnapshot(contagens);
    const consolidado = consolidar(contagens);
    const destinos = validarDestinos(consolidado.destino);

    console.log(JSON.stringify({
      modo: "DRY_RUN_SOMENTE_LEITURA",
      snapshotAprovado: snapshot.erros.length === 0 && snapshot.desconhecidos.length === 0,
      divergenciasSnapshot: snapshot.erros,
      cargosNaoMapeados: snapshot.desconhecidos,
      totalUsuariosMapeados: consolidado.totalMapeado,
      usuariosQueMudariamCargo: consolidado.alteracoes,
      usuariosQuePermaneceriamComMesmoTexto: consolidado.totalMapeado - consolidado.alteracoes,
      distribuicaoFinalPrevista: consolidado.destino,
      distribuicaoFinalConfere: destinos.erros.length === 0 && destinos.extras.length === 0,
      divergenciasDistribuicaoFinal: destinos.erros,
      destinosNaoPrevistos: destinos.extras,
    }, null, 2));
  } finally {
    await connection.rollback();
  }
}

async function apply(connection) {
  if (process.env.CONFIRMAR_NORMALIZACAO_CARGOS !== "SIM") {
    throw new Error("Aplicação bloqueada. Defina CONFIRMAR_NORMALIZACAO_CARGOS=SIM somente após autorização explícita.");
  }

  const antes = await lerContagens(connection);
  const snapshot = validarSnapshot(antes);
  const consolidadoAntes = consolidar(antes);
  const destinosAntes = validarDestinos(consolidadoAntes.destino);

  if (snapshot.erros.length || snapshot.desconhecidos.length || destinosAntes.erros.length || destinosAntes.extras.length) {
    throw new Error(`Snapshot divergente. Aplicação abortada. Detalhes: ${JSON.stringify({ snapshot, destinosAntes })}`);
  }

  await ensureBackupTable(connection);
  const operationId = `cargo-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(3).toString("hex")}`;

  await connection.beginTransaction();
  try {
    const [users] = await connection.query("SELECT id, cargo FROM users FOR UPDATE");

    for (const user of users) {
      const cargoAtual = String(user.cargo ?? "");
      const cargoNormalizado = cargoAtual.trim();
      const novo = MAPA.get(cargoNormalizado);
      if (!novo) throw new Error(`Cargo sem mapeamento durante aplicação: ${cargoAtual}`);
      if (novo === cargoAtual) continue;

      await connection.query(
        `INSERT INTO cargo_normalizacao_backup
          (operation_id, user_id, cargo_anterior, cargo_novo)
         VALUES (?, ?, ?, ?)`,
        [operationId, user.id, cargoAtual, novo],
      );
      await connection.query("UPDATE users SET cargo = ? WHERE id = ?", [novo, user.id]);
    }

    const depois = await lerContagens(connection);
    const snapshotDepois = validarDestinos(Object.fromEntries(depois));
    const totalDepois = Array.from(depois.values()).reduce((acc, n) => acc + n, 0);

    if (snapshotDepois.erros.length || snapshotDepois.extras.length || totalDepois !== 187) {
      throw new Error(`Validação final falhou. Rollback automático. ${JSON.stringify({ snapshotDepois, totalDepois })}`);
    }

    await connection.commit();
    console.log(JSON.stringify({
      status: "APLICADO",
      operationId,
      backupPersistente: "cargo_normalizacao_backup",
      usuariosAlterados: consolidadoAntes.alteracoes,
      distribuicaoFinal: Object.fromEntries(depois),
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function rollbackOperation(connection, operationId) {
  if (process.env.CONFIRMAR_ROLLBACK_CARGOS !== "SIM") {
    throw new Error("Rollback bloqueado. Defina CONFIRMAR_ROLLBACK_CARGOS=SIM somente após autorização explícita.");
  }

  await ensureBackupTable(connection);
  const [rows] = await connection.query(
    `SELECT user_id, cargo_anterior, cargo_novo
       FROM cargo_normalizacao_backup
      WHERE operation_id = ?
      ORDER BY id`,
    [operationId],
  );

  if (!rows.length) throw new Error("Nenhum backup encontrado para a operação informada.");

  await connection.beginTransaction();
  try {
    for (const row of rows) {
      const [[atual]] = await connection.query("SELECT cargo FROM users WHERE id = ? FOR UPDATE", [row.user_id]);
      if (!atual) throw new Error(`Usuário ${row.user_id} não encontrado.`);
      if (atual.cargo !== row.cargo_novo) {
        throw new Error(`Rollback abortado: usuário ${row.user_id} não está mais com o cargo esperado ${row.cargo_novo}.`);
      }
      await connection.query("UPDATE users SET cargo = ? WHERE id = ?", [row.cargo_anterior, row.user_id]);
    }

    await connection.commit();
    console.log(JSON.stringify({
      status: "ROLLBACK_APLICADO",
      operationId,
      usuariosRestaurados: rows.length,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const { mode, operationId } = parseArgs();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");

  const connection = await mysql.createConnection(url);
  try {
    if (mode === "dry-run") return await dryRun(connection);
    if (mode === "apply") return await apply(connection);
    if (mode === "rollback") return await rollbackOperation(connection, operationId);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Falha na normalização de cargos:", error.message || error);
  process.exit(1);
});

const mysql = require("mysql2/promise");
const crypto = require("crypto");

const CARGOS = [
  "Analista Técnico I",
  "Analista Técnico III",
  "Gerente",
  "Assistente",
  "Administrador",
  "Assistente I",
  "Teste",
];

const ESPERADO = {
  "Analista Técnico I": 86,
  "Analista Técnico III": 37,
  "Gerente": 27,
  "Assistente": 27,
  "Administrador": 4,
  "Assistente I": 3,
  "Teste": 3,
};

function slugCargo(cargo) {
  return `CARGO-${cargo
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()}`;
}

async function garantirTabelaAuditoria(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS carga_inicial_funcoes_backup (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation_id VARCHAR(64) NOT NULL,
      entity_type ENUM('ORGANIZACAO','FUNCAO','VINCULO') NOT NULL,
      entity_id INT NOT NULL,
      user_id INT NULL,
      cargo_referencia VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY carga_funcoes_oper_entity_uq (operation_id, entity_type, entity_id),
      INDEX carga_funcoes_oper_idx (operation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function conferirContagens(rows) {
  const contagens = {};
  for (const cargo of CARGOS) contagens[cargo] = 0;

  for (const row of rows) {
    const cargo = String(row.cargo ?? "").trim();
    if (!CARGOS.includes(cargo)) {
      throw new Error(`Cargo não previsto na carga inicial: "${row.cargo}" (user ${row.id}).`);
    }
    contagens[cargo] += 1;
  }

  if (rows.length !== 187) {
    throw new Error(`Carga bloqueada: esperados 187 usuários, encontrados ${rows.length}.`);
  }

  for (const [cargo, esperado] of Object.entries(ESPERADO)) {
    if (contagens[cargo] !== esperado) {
      throw new Error(
        `Carga bloqueada: ${cargo} esperado ${esperado}, encontrado ${contagens[cargo]}.`,
      );
    }
  }

  return contagens;
}

async function main() {
  if (process.env.CONFIRMAR_CARGA_INICIAL_FUNCOES !== "SIM") {
    throw new Error(
      "Carga bloqueada. Defina CONFIRMAR_CARGA_INICIAL_FUNCOES=SIM somente após autorização explícita.",
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");

  const connection = await mysql.createConnection(url);
  const operationId = `funcoes-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto
    .randomBytes(3)
    .toString("hex")}`;
  const hoje = new Date().toISOString().slice(0, 10);

  try {
    await garantirTabelaAuditoria(connection);

    const [usuarios] = await connection.query(
      "SELECT id, cargo FROM users ORDER BY id",
    );
    const contagens = conferirContagens(usuarios);

    const [vinculosAtivos] = await connection.query(
      `SELECT id, usuario_id, funcao_organizacional_id
         FROM usuarios_funcoes_organizacionais
        WHERE tipo_vinculo = 'PRINCIPAL'
          AND ativo = TRUE`,
    );

    if (vinculosAtivos.length > 0) {
      throw new Error(
        `Carga bloqueada: já existem ${vinculosAtivos.length} vínculos principais ativos. Nenhuma gravação foi feita.`,
      );
    }

    await connection.beginTransaction();

    let organizacaoCriada = false;
    let organizacaoId;

    const [orgRows] = await connection.query(
      "SELECT id FROM organizacoes WHERE codigo = ? LIMIT 1",
      ["SEBRAE-TO"],
    );

    if (orgRows.length) {
      organizacaoId = orgRows[0].id;
    } else {
      const [orgInsert] = await connection.query(
        `INSERT INTO organizacoes (nome, nome_fantasia, codigo, ativa)
         VALUES (?, ?, ?, TRUE)`,
        ["Sebrae Tocantins", "Sebrae TO", "SEBRAE-TO"],
      );
      organizacaoId = orgInsert.insertId;
      organizacaoCriada = true;
      await connection.query(
        `INSERT INTO carga_inicial_funcoes_backup
          (operation_id, entity_type, entity_id)
         VALUES (?, 'ORGANIZACAO', ?)`,
        [operationId, organizacaoId],
      );
    }

    const funcaoPorCargo = new Map();

    for (const cargo of CARGOS) {
      const [existentes] = await connection.query(
        `SELECT id
           FROM funcoes_organizacionais
          WHERE organizacao_id = ?
            AND cargo_referencia = ?
            AND ativa = TRUE
          ORDER BY id`,
        [organizacaoId, cargo],
      );

      if (existentes.length > 1) {
        throw new Error(
          `Carga bloqueada: há mais de uma função ativa para o cargo ${cargo}.`,
        );
      }

      let funcaoId;
      if (existentes.length === 1) {
        funcaoId = existentes[0].id;
      } else {
        const [insert] = await connection.query(
          `INSERT INTO funcoes_organizacionais
            (organizacao_id, departamento_id, nome, codigo, cargo_referencia, descricao,
             origem, versao, vigencia_inicio, ativa)
           VALUES (?, NULL, ?, ?, ?, ?, 'IMPORTACAO', 1, ?, TRUE)`,
          [
            organizacaoId,
            cargo,
            slugCargo(cargo),
            cargo,
            "Função inicial criada automaticamente a partir do cargo padronizado. Deve ser refinada posteriormente pela análise da função real no Bloco 1.",
            hoje,
          ],
        );
        funcaoId = insert.insertId;
        await connection.query(
          `INSERT INTO carga_inicial_funcoes_backup
            (operation_id, entity_type, entity_id, cargo_referencia)
           VALUES (?, 'FUNCAO', ?, ?)`,
          [operationId, funcaoId, cargo],
        );
      }

      funcaoPorCargo.set(cargo, funcaoId);
    }

    let vinculosCriados = 0;
    for (const usuario of usuarios) {
      const cargo = String(usuario.cargo ?? "").trim();
      const funcaoId = funcaoPorCargo.get(cargo);
      if (!funcaoId) {
        throw new Error(`Função não localizada para o cargo ${cargo}.`);
      }

      const [insert] = await connection.query(
        `INSERT INTO usuarios_funcoes_organizacionais
          (usuario_id, funcao_organizacional_id, tipo_vinculo, origem,
           vigencia_inicio, ativo)
         VALUES (?, ?, 'PRINCIPAL', 'IMPORTACAO', ?, TRUE)`,
        [usuario.id, funcaoId, hoje],
      );

      await connection.query(
        `INSERT INTO carga_inicial_funcoes_backup
          (operation_id, entity_type, entity_id, user_id, cargo_referencia)
         VALUES (?, 'VINCULO', ?, ?, ?)`,
        [operationId, insert.insertId, usuario.id, cargo],
      );
      vinculosCriados += 1;
    }

    const [validacao] = await connection.query(
      `SELECT f.cargo_referencia AS cargo, COUNT(*) AS quantidade
         FROM usuarios_funcoes_organizacionais uf
         JOIN funcoes_organizacionais f ON f.id = uf.funcao_organizacional_id
        WHERE uf.tipo_vinculo = 'PRINCIPAL'
          AND uf.ativo = TRUE
          AND f.organizacao_id = ?
        GROUP BY f.cargo_referencia
        ORDER BY f.cargo_referencia`,
      [organizacaoId],
    );

    const final = {};
    let totalFinal = 0;
    for (const row of validacao) {
      final[row.cargo] = Number(row.quantidade);
      totalFinal += Number(row.quantidade);
    }

    if (totalFinal !== 187) {
      throw new Error(
        `Validação final falhou: esperados 187 vínculos principais, encontrados ${totalFinal}.`,
      );
    }

    for (const [cargo, esperado] of Object.entries(ESPERADO)) {
      if ((final[cargo] || 0) !== esperado) {
        throw new Error(
          `Validação final falhou: ${cargo} esperado ${esperado}, encontrado ${final[cargo] || 0}.`,
        );
      }
    }

    await connection.commit();

    console.log(
      JSON.stringify(
        {
          status: "APLICADO",
          operationId,
          organizacaoId,
          organizacaoCriada,
          funcoesIniciais: CARGOS.length,
          usuariosTotal: usuarios.length,
          vinculosCriados,
          distribuicaoValidada: final,
          contagemCargosOrigem: contagens,
          auditoria: "carga_inicial_funcoes_backup",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

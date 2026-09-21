const mysql = require("mysql2/promise");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const connection = await mysql.createConnection(databaseUrl);

  try {
    console.log("[questionario-atividades] iniciando migracao segura");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questionarios_atividades_funcao (
        id INT NOT NULL AUTO_INCREMENT,
        colaborador_id INT NOT NULL,
        ano INT NOT NULL,
        versao INT NOT NULL DEFAULT 1,
        status ENUM('rascunho','preenchido','validado') NOT NULL DEFAULT 'rascunho',
        fonte ENUM('manual','importado_historico') NOT NULL DEFAULT 'manual',
        arquivo_origem_nome VARCHAR(255) NULL,
        arquivo_origem_url TEXT NULL,
        observacoes TEXT NULL,
        preenchido_por INT NULL,
        validado_por INT NULL,
        validado_em TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX questionarios_atividades_colaborador_idx (colaborador_id),
        INDEX questionarios_atividades_ano_idx (ano),
        CONSTRAINT questionarios_atividades_colaborador_fk
          FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT questionarios_atividades_preenchido_por_fk
          FOREIGN KEY (preenchido_por) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT questionarios_atividades_validado_por_fk
          FOREIGN KEY (validado_por) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questionario_atividades_respostas (
        id INT NOT NULL AUTO_INCREMENT,
        questionario_id INT NOT NULL,
        chave VARCHAR(100) NOT NULL,
        pergunta TEXT NOT NULL,
        resposta TEXT NULL,
        ordem INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX questionario_respostas_questionario_idx (questionario_id),
        INDEX questionario_respostas_chave_idx (chave),
        CONSTRAINT questionario_respostas_questionario_fk
          FOREIGN KEY (questionario_id) REFERENCES questionarios_atividades_funcao(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS questionario_atividades_historico (
        id INT NOT NULL AUTO_INCREMENT,
        questionario_id INT NOT NULL,
        campo VARCHAR(150) NOT NULL,
        valor_anterior TEXT NULL,
        valor_novo TEXT NULL,
        alterado_por INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX questionario_historico_questionario_idx (questionario_id),
        CONSTRAINT questionario_historico_questionario_fk
          FOREIGN KEY (questionario_id) REFERENCES questionarios_atividades_funcao(id) ON DELETE CASCADE,
        CONSTRAINT questionario_historico_alterado_por_fk
          FOREIGN KEY (alterado_por) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    const [rows] = await connection.query(`
      SELECT table_name
        FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN (
           'questionarios_atividades_funcao',
           'questionario_atividades_respostas',
           'questionario_atividades_historico'
         )
       ORDER BY table_name
    `);

    const nomes = rows.map((row) => row.TABLE_NAME || row.table_name);
    if (nomes.length !== 3) {
      throw new Error(
        "Migracao incompleta. Tabelas encontradas: " + nomes.join(", ")
      );
    }

    console.log("[questionario-atividades] migracao concluida:", nomes.join(", "));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[questionario-atividades] erro:", error);
  process.exit(1);
});

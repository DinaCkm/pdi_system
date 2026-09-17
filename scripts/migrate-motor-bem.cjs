const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Migração não executada.');

  const connection = await mysql.createConnection(url);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS organizacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255) NULL,
        codigo VARCHAR(100) NOT NULL,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY organizacoes_codigo_uq (codigo),
        INDEX organizacoes_ativa_idx (ativa)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS funcoes_organizacionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organizacao_id INT NOT NULL,
        departamento_id INT NULL,
        nome VARCHAR(255) NOT NULL,
        codigo VARCHAR(100) NULL,
        cargo_referencia VARCHAR(255) NULL,
        descricao TEXT NULL,
        origem ENUM('VALIDACAO_ADMIN','QUESTIONARIO','IMPORTACAO','OUTRA') NOT NULL DEFAULT 'VALIDACAO_ADMIN',
        versao INT NOT NULL DEFAULT 1,
        vigencia_inicio DATE NULL,
        vigencia_fim DATE NULL,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY funcao_org_nome_versao_uq (organizacao_id, departamento_id, nome, versao),
        INDEX funcao_org_organizacao_idx (organizacao_id),
        INDEX funcao_org_dept_idx (departamento_id),
        INDEX funcao_org_ativa_idx (ativa),
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE RESTRICT,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios_funcoes_organizacionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        funcao_organizacional_id INT NOT NULL,
        tipo_vinculo ENUM('PRINCIPAL','SECUNDARIA','TEMPORARIA') NOT NULL DEFAULT 'PRINCIPAL',
        origem ENUM('VALIDACAO_ADMIN','QUESTIONARIO','IMPORTACAO','OUTRA') NOT NULL DEFAULT 'VALIDACAO_ADMIN',
        vigencia_inicio DATE NULL,
        vigencia_fim DATE NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY usuario_funcao_uq (usuario_id, funcao_organizacional_id, tipo_vinculo, vigencia_inicio),
        INDEX usuario_funcao_usuario_idx (usuario_id),
        INDEX usuario_funcao_funcao_idx (funcao_organizacional_id),
        INDEX usuario_funcao_ativo_idx (ativo),
        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (funcao_organizacional_id) REFERENCES funcoes_organizacionais(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS metodologia_competencias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        familia ENUM('BASICA','ESSENCIAL','MASTER','JORNADA_FUTURO') NOT NULL,
        descricao TEXT NULL,
        comportamentos_observaveis TEXT NULL,
        versao INT NOT NULL DEFAULT 1,
        vigencia_inicio DATE NULL,
        vigencia_fim DATE NULL,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY metodologia_nome_versao_uq (nome, versao),
        INDEX metodologia_familia_idx (familia),
        INDEX metodologia_ativa_idx (ativa)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS competencias_organizacionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organizacao_id INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT NULL,
        versao INT NOT NULL DEFAULT 1,
        vigencia_inicio DATE NULL,
        vigencia_fim DATE NULL,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY competencia_org_nome_versao_uq (organizacao_id, nome, versao),
        INDEX competencia_org_organizacao_idx (organizacao_id),
        INDEX competencia_org_ativa_idx (ativa),
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS competencias_organizacionais_comportamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        competencia_organizacional_id INT NOT NULL,
        descricao TEXT NOT NULL,
        ordem INT NOT NULL DEFAULT 0,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX comportamento_competencia_idx (competencia_organizacional_id),
        INDEX comportamento_ativo_idx (ativo),
        FOREIGN KEY (competencia_organizacional_id) REFERENCES competencias_organizacionais(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS competencia_organizacional_bem (
        id INT AUTO_INCREMENT PRIMARY KEY,
        competencia_organizacional_id INT NOT NULL,
        comportamento_organizacional_id INT NULL,
        metodologia_competencia_id INT NOT NULL,
        tipo_relacao ENUM('SUSTENTA','FAVORECE','COMPLEMENTAR') NOT NULL,
        relevancia ENUM('PRINCIPAL','SECUNDARIA') NOT NULL DEFAULT 'PRINCIPAL',
        justificativa TEXT NULL,
        versao INT NOT NULL DEFAULT 1,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY comp_org_bem_uq (competencia_organizacional_id, metodologia_competencia_id, versao),
        INDEX comp_org_bem_competencia_idx (competencia_organizacional_id),
        INDEX comp_org_bem_metodologia_idx (metodologia_competencia_id),
        FOREIGN KEY (competencia_organizacional_id) REFERENCES competencias_organizacionais(id) ON DELETE CASCADE,
        FOREIGN KEY (comportamento_organizacional_id) REFERENCES competencias_organizacionais_comportamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (metodologia_competencia_id) REFERENCES metodologia_competencias(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS competencias_requeridas_funcao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organizacao_id INT NOT NULL,
        departamento_id INT NULL,
        cargo_funcao VARCHAR(255) NOT NULL,
        competencia_organizacional_id INT NOT NULL,
        classificacao_funcao ENUM('ESSENCIAL_FUNCAO','TRANSVERSAL_FUNCAO') NOT NULL,
        origem ENUM('QUESTIONARIO','VALIDACAO_ADMIN','OUTRA') NOT NULL,
        justificativa TEXT NULL,
        nivel_responsabilidade ENUM('EXECUTA_COM_ORIENTACAO','EXECUTA_COM_AUTONOMIA','ANALISA_RECOMENDA','DECIDE','COORDENA','RESPONDE_PELO_RESULTADO') NULL,
        validada BOOLEAN NOT NULL DEFAULT FALSE,
        validada_por INT NULL,
        validada_em TIMESTAMP NULL,
        versao INT NOT NULL DEFAULT 1,
        vigencia_inicio DATE NULL,
        vigencia_fim DATE NULL,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY comp_req_funcao_uq (organizacao_id, departamento_id, cargo_funcao, competencia_organizacional_id, versao),
        INDEX comp_req_funcao_org_idx (organizacao_id),
        INDEX comp_req_funcao_dept_idx (departamento_id),
        INDEX comp_req_funcao_comp_idx (competencia_organizacional_id),
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE RESTRICT,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (competencia_organizacional_id) REFERENCES competencias_organizacionais(id) ON DELETE RESTRICT,
        FOREIGN KEY (validada_por) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS competencias_emergentes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organizacao_id INT NOT NULL,
        departamento_id INT NULL,
        colaborador_id INT NULL,
        cargo_funcao VARCHAR(255) NULL,
        atividade_origem TEXT NULL,
        nome_sugerido VARCHAR(255) NOT NULL,
        descricao TEXT NULL,
        justificativa TEXT NULL,
        competencia_organizacional_relacionada_id INT NULL,
        status ENUM('AGUARDANDO_ANALISE','RELACIONADA_EXISTENTE','CRIADA_NOVA_COMPETENCIA','COMPLEMENTAR','DESCARTADA') NOT NULL DEFAULT 'AGUARDANDO_ANALISE',
        decisao TEXT NULL,
        analisada_por INT NULL,
        analisada_em TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX comp_emerg_org_idx (organizacao_id),
        INDEX comp_emerg_dept_idx (departamento_id),
        INDEX comp_emerg_colab_idx (colaborador_id),
        INDEX comp_emerg_status_idx (status),
        FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE RESTRICT,
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
        FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (competencia_organizacional_relacionada_id) REFERENCES competencias_organizacionais(id) ON DELETE SET NULL,
        FOREIGN KEY (analisada_por) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const tabelas = [
      'organizacoes',
      'funcoes_organizacionais',
      'usuarios_funcoes_organizacionais',
      'metodologia_competencias',
      'competencias_organizacionais',
      'competencias_organizacionais_comportamentos',
      'competencia_organizacional_bem',
      'competencias_requeridas_funcao',
      'competencias_emergentes',
    ];

    const placeholders = tabelas.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME`,
      tabelas,
    );

    if (!Array.isArray(rows) || rows.length !== tabelas.length) {
      throw new Error(`Migração incompleta: esperadas ${tabelas.length} tabelas, encontradas ${Array.isArray(rows) ? rows.length : 0}.`);
    }

    console.log(`Migração do Motor B.E.M. concluída: ${rows.length} tabelas verificadas.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha na migração do Motor B.E.M.:', error);
  process.exit(1);
});

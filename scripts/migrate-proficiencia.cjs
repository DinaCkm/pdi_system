const mysql = require('mysql2/promise');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Migração não executada.');

  const connection = await mysql.createConnection(url);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS aplicacoes_proficiencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prova_id INT NOT NULL,
        prova_snapshot_json JSON NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        agendada_para TIMESTAMP NOT NULL,
        status ENUM('AGENDADA','LIBERADA','ENCERRADA','CALCULADA','CANCELADA') NOT NULL DEFAULT 'AGENDADA',
        liberada_em TIMESTAMP NULL,
        liberada_por INT NULL,
        encerrada_em TIMESTAMP NULL,
        calculada_em TIMESTAMP NULL,
        calculada_por INT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX aplicacoes_proficiencia_prova_idx (prova_id),
        INDEX aplicacoes_proficiencia_status_idx (status),
        INDEX aplicacoes_proficiencia_agenda_idx (agendada_para),
        FOREIGN KEY (liberada_por) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (calculada_por) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS aplicacoes_proficiencia_participantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aplicacao_id INT NOT NULL,
        colaborador_id INT NOT NULL,
        situacao ENUM('SELECIONADO','FINALIZADO','AUSENTE') NOT NULL DEFAULT 'SELECIONADO',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY aplicacoes_prof_participante_unico_idx (aplicacao_id, colaborador_id),
        INDEX aplicacoes_prof_participante_aplicacao_idx (aplicacao_id),
        INDEX aplicacoes_prof_participante_colaborador_idx (colaborador_id),
        FOREIGN KEY (aplicacao_id) REFERENCES aplicacoes_proficiencia(id) ON DELETE CASCADE,
        FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tentativas_proficiencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aplicacao_id INT NOT NULL,
        colaborador_id INT NOT NULL,
        status ENUM('EM_ANDAMENTO','BLOQUEADA','LIBERADA_CONTINUIDADE','FINALIZADA','FINALIZADA_TEMPO') NOT NULL DEFAULT 'EM_ANDAMENTO',
        iniciada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ultima_atividade_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finalizada_em TIMESTAMP NULL,
        bloqueada_em TIMESTAMP NULL,
        motivo_bloqueio VARCHAR(100) NULL,
        liberada_continuacao_em TIMESTAMP NULL,
        liberada_continuacao_por INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY tentativas_prof_aplicacao_colaborador_unico_idx (aplicacao_id, colaborador_id),
        INDEX tentativas_prof_aplicacao_idx (aplicacao_id),
        INDEX tentativas_prof_colaborador_idx (colaborador_id),
        INDEX tentativas_prof_status_idx (status),
        FOREIGN KEY (aplicacao_id) REFERENCES aplicacoes_proficiencia(id) ON DELETE CASCADE,
        FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (liberada_continuacao_por) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS respostas_proficiencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tentativa_id INT NOT NULL,
        questao_chave VARCHAR(80) NOT NULL,
        resposta VARCHAR(16) NOT NULL,
        respondida_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY respostas_prof_tentativa_questao_unica_idx (tentativa_id, questao_chave),
        INDEX respostas_prof_tentativa_idx (tentativa_id),
        FOREIGN KEY (tentativa_id) REFERENCES tentativas_proficiencia(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS resultados_proficiencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aplicacao_id INT NOT NULL,
        colaborador_id INT NOT NULL,
        tentativa_id INT NOT NULL,
        percentual_geral VARCHAR(20) NOT NULL,
        resultado_json TEXT NOT NULL,
        observacao TEXT NULL,
        calculado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY resultados_prof_aplicacao_colaborador_unico_idx (aplicacao_id, colaborador_id),
        INDEX resultados_prof_aplicacao_idx (aplicacao_id),
        INDEX resultados_prof_colaborador_idx (colaborador_id),
        FOREIGN KEY (aplicacao_id) REFERENCES aplicacoes_proficiencia(id) ON DELETE CASCADE,
        FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (tentativa_id) REFERENCES tentativas_proficiencia(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await connection.query(`
      SELECT TABLE_NAME
        FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (
           'aplicacoes_proficiencia',
           'aplicacoes_proficiencia_participantes',
           'tentativas_proficiencia',
           'respostas_proficiencia',
           'resultados_proficiencia'
         )
       ORDER BY TABLE_NAME
    `);

    if (!Array.isArray(rows) || rows.length !== 5) {
      throw new Error(`Migração incompleta: esperadas 5 tabelas, encontradas ${Array.isArray(rows) ? rows.length : 0}.`);
    }

    console.log('Migração de proficiência concluída: 5 tabelas verificadas.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha na migração de proficiência:', error);
  process.exit(1);
});

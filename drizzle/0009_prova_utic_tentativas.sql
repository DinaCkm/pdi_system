-- Estrutura aditiva para tentativas da Avaliacao Tecnica UTIC.
-- As mesmas tabelas sao criadas com IF NOT EXISTS pelo router no primeiro uso,
-- garantindo implantacao segura sem alterar tabelas existentes.

CREATE TABLE IF NOT EXISTS prova_utic_tentativas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL,
  status ENUM('EM_ANDAMENTO','BLOQUEADA','LIBERADA','FINALIZADA','CONCLUIDA','FINALIZADA_TEMPO','ANULADA') NOT NULL DEFAULT 'EM_ANDAMENTO',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_at DATETIME NULL,
  block_reason VARCHAR(100) NULL,
  finished_at DATETIME NULL,
  released_at DATETIME NULL,
  released_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prova_utic_tentativas_colaborador (colaborador_id),
  INDEX idx_prova_utic_tentativas_status (status),
  CONSTRAINT fk_prova_utic_tentativas_colaborador FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_prova_utic_tentativas_liberado FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prova_utic_respostas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tentativa_id INT NOT NULL,
  questao_id INT NOT NULL,
  resposta TEXT NOT NULL,
  respondida_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_prova_utic_resposta (tentativa_id, questao_id),
  INDEX idx_prova_utic_respostas_tentativa (tentativa_id),
  CONSTRAINT fk_prova_utic_respostas_tentativa FOREIGN KEY (tentativa_id) REFERENCES prova_utic_tentativas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prova_utic_eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tentativa_id INT NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  detalhe TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prova_utic_eventos_tentativa (tentativa_id),
  CONSTRAINT fk_prova_utic_eventos_tentativa FOREIGN KEY (tentativa_id) REFERENCES prova_utic_tentativas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

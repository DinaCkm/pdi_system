-- Identidade visual da Avaliacao Tecnica UTIC
-- Estrutura aditiva: nao altera nem remove dados existentes.
-- A mesma tabela tambem e criada com IF NOT EXISTS pelo router,
-- permitindo implantacao segura no ambiente atual.

CREATE TABLE IF NOT EXISTS prova_utic_identidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador_id INT NOT NULL,
  tentativa_id INT NULL,
  nome_snapshot VARCHAR(255) NOT NULL,
  foto_key VARCHAR(700) NOT NULL,
  declaracao TEXT NOT NULL,
  confirmado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_prova_utic_identidade_tentativa (tentativa_id),
  INDEX idx_prova_utic_identidade_colaborador (colaborador_id),
  INDEX idx_prova_utic_identidade_confirmado (confirmado_em),
  CONSTRAINT fk_prova_utic_identidade_colaborador
    FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_prova_utic_identidade_tentativa
    FOREIGN KEY (tentativa_id) REFERENCES prova_utic_tentativas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

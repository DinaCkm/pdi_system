CREATE TABLE IF NOT EXISTS `avaliacoes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cicloId` int NOT NULL,
  `tipo` enum('DESEMPENHO','TECNICA') NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descricao` text,
  `data_referencia` date NOT NULL,
  `departamentoId` int,
  `origem` enum('IMPORTACAO','SISTEMA','MANUAL') NOT NULL DEFAULT 'SISTEMA',
  `status` enum('RASCUNHO','EM_CONFERENCIA','FINALIZADA','CANCELADA') NOT NULL DEFAULT 'RASCUNHO',
  `arquivo_origem_nome` varchar(255),
  `arquivo_origem_url` text,
  `observacoes` text,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `avaliacoes_id` PRIMARY KEY (`id`),
  CONSTRAINT `avaliacoes_ciclo_fk` FOREIGN KEY (`cicloId`) REFERENCES `ciclos`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `avaliacoes_departamento_fk` FOREIGN KEY (`departamentoId`) REFERENCES `departamentos`(`id`) ON DELETE SET NULL,
  CONSTRAINT `avaliacoes_created_by_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `avaliacoes_ciclo_idx` ON `avaliacoes` (`cicloId`);
--> statement-breakpoint
CREATE INDEX `avaliacoes_tipo_idx` ON `avaliacoes` (`tipo`);
--> statement-breakpoint
CREATE INDEX `avaliacoes_departamento_idx` ON `avaliacoes` (`departamentoId`);
--> statement-breakpoint
CREATE INDEX `avaliacoes_status_idx` ON `avaliacoes` (`status`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `medicoes_competencias` (
  `id` int AUTO_INCREMENT NOT NULL,
  `avaliacaoId` int NOT NULL,
  `colaboradorId` int NOT NULL,
  `competenciaMacroId` int NOT NULL,
  `tipoCompetencia` enum('COMPORTAMENTAL','TECNICA') NOT NULL,
  `fonte` enum('AVALIACAO_DESEMPENHO','AVALIACAO_TECNICA') NOT NULL,
  `valor` decimal(10,4) NOT NULL,
  `escala_min` decimal(10,4) NOT NULL,
  `escala_max` decimal(10,4) NOT NULL,
  `classificacao` varchar(255),
  `observacao` text,
  `medicao_anterior_id` int,
  `validada` boolean NOT NULL DEFAULT false,
  `validada_por` int,
  `validada_em` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `medicoes_competencias_id` PRIMARY KEY (`id`),
  CONSTRAINT `medicoes_avaliacao_fk` FOREIGN KEY (`avaliacaoId`) REFERENCES `avaliacoes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `medicoes_colaborador_fk` FOREIGN KEY (`colaboradorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `medicoes_competencia_fk` FOREIGN KEY (`competenciaMacroId`) REFERENCES `competencias_macros`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `medicoes_anterior_fk` FOREIGN KEY (`medicao_anterior_id`) REFERENCES `medicoes_competencias`(`id`) ON DELETE SET NULL,
  CONSTRAINT `medicoes_validada_por_fk` FOREIGN KEY (`validada_por`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `medicoes_unica_por_avaliacao_idx` UNIQUE (`avaliacaoId`,`colaboradorId`,`competenciaMacroId`)
);
--> statement-breakpoint
CREATE INDEX `medicoes_avaliacao_idx` ON `medicoes_competencias` (`avaliacaoId`);
--> statement-breakpoint
CREATE INDEX `medicoes_colaborador_idx` ON `medicoes_competencias` (`colaboradorId`);
--> statement-breakpoint
CREATE INDEX `medicoes_competencia_idx` ON `medicoes_competencias` (`competenciaMacroId`);
--> statement-breakpoint
CREATE INDEX `medicoes_colaborador_competencia_idx` ON `medicoes_competencias` (`colaboradorId`,`competenciaMacroId`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `trilha_competencias` (
  `id` int AUTO_INCREMENT NOT NULL,
  `colaboradorId` int NOT NULL,
  `cicloId` int NOT NULL,
  `competenciaMacroId` int NOT NULL,
  `tipoCompetencia` enum('COMPORTAMENTAL','TECNICA') NOT NULL,
  `origemGap` enum('DISC','AVALIACAO_DESEMPENHO','AVALIACAO_TECNICA','HISTORICO_2025','OUTRO') NOT NULL,
  `prioridade` enum('ALTA','MEDIA','BAIXA'),
  `status` enum('PRIORIZADA','EM_DESENVOLVIMENTO','AGUARDANDO_NOVA_MEDICAO','ENCERRADA') NOT NULL DEFAULT 'PRIORIZADA',
  `medicao_origem_id` int,
  `observacao` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `trilha_competencias_id` PRIMARY KEY (`id`),
  CONSTRAINT `trilha_colaborador_fk` FOREIGN KEY (`colaboradorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `trilha_ciclo_fk` FOREIGN KEY (`cicloId`) REFERENCES `ciclos`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `trilha_competencia_fk` FOREIGN KEY (`competenciaMacroId`) REFERENCES `competencias_macros`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `trilha_medicao_origem_fk` FOREIGN KEY (`medicao_origem_id`) REFERENCES `medicoes_competencias`(`id`) ON DELETE SET NULL,
  CONSTRAINT `trilha_unica_por_ciclo_idx` UNIQUE (`colaboradorId`,`cicloId`,`competenciaMacroId`)
);
--> statement-breakpoint
CREATE INDEX `trilha_colaborador_ciclo_idx` ON `trilha_competencias` (`colaboradorId`,`cicloId`);
--> statement-breakpoint
CREATE INDEX `trilha_competencia_idx` ON `trilha_competencias` (`competenciaMacroId`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `historico_desenvolvimento` (
  `id` int AUTO_INCREMENT NOT NULL,
  `colaboradorId` int NOT NULL,
  `competenciaMacroId` int,
  `tipoCompetencia` enum('COMPORTAMENTAL','TECNICA') NOT NULL,
  `fonte` enum('PLANILHA_2025','SISTEMA_ANTERIOR','OUTRA') NOT NULL,
  `identificador_externo` varchar(255),
  `titulo_acao` varchar(500) NOT NULL,
  `descricao_acao` text,
  `status_original` varchar(100),
  `data_inicio` date,
  `data_fim` date,
  `concluida` boolean NOT NULL DEFAULT false,
  `transferida_para_pdi_atual` boolean NOT NULL DEFAULT false,
  `action_atual_id` int,
  `dados_originais` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `historico_desenvolvimento_id` PRIMARY KEY (`id`),
  CONSTRAINT `historico_colaborador_fk` FOREIGN KEY (`colaboradorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `historico_competencia_fk` FOREIGN KEY (`competenciaMacroId`) REFERENCES `competencias_macros`(`id`) ON DELETE SET NULL,
  CONSTRAINT `historico_action_atual_fk` FOREIGN KEY (`action_atual_id`) REFERENCES `actions`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `historico_colaborador_idx` ON `historico_desenvolvimento` (`colaboradorId`);
--> statement-breakpoint
CREATE INDEX `historico_competencia_idx` ON `historico_desenvolvimento` (`competenciaMacroId`);
--> statement-breakpoint
CREATE INDEX `historico_fonte_idx` ON `historico_desenvolvimento` (`fonte`);

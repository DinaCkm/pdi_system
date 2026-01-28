CREATE TABLE `deletion_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entidadeTipo` enum('acao','pdi','usuario','evidencia','solicitacao') NOT NULL,
	`entidadeId` int NOT NULL,
	`entidadeNome` varchar(255) NOT NULL,
	`dadosExcluidos` text NOT NULL,
	`excluidoPor` int NOT NULL,
	`excluidoPorNome` varchar(255) NOT NULL,
	`motivoExclusao` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `pdi_validacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pdiId` int NOT NULL,
	`liderId` int NOT NULL,
	`aprovadoEm` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`justificativa` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
DROP TABLE `competencias_blocos`;--> statement-breakpoint
DROP TABLE `competencias_micros`;--> statement-breakpoint
ALTER TABLE `pdis` DROP INDEX `uq_colaborador_ciclo`;--> statement-breakpoint
ALTER TABLE `actions` DROP FOREIGN KEY `actions_pdiId_pdis_id_fk`;
--> statement-breakpoint
ALTER TABLE `actions` MODIFY COLUMN `descricao` text;--> statement-breakpoint
ALTER TABLE `actions` MODIFY COLUMN `prazo` date NOT NULL;--> statement-breakpoint
ALTER TABLE `actions` MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'nao_iniciada';--> statement-breakpoint
ALTER TABLE `adjustment_requests` MODIFY COLUMN `status` enum('pendente','mais_informacoes','aprovada','reprovada','aguardando_lider') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `competencias_macros` MODIFY COLUMN `descricao` text NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence_files` MODIFY COLUMN `fileSize` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `actions` ADD `microcompetencia` varchar(255);--> statement-breakpoint
ALTER TABLE `actions` ADD `titulo` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `competencias_macros` ADD `ativo` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `evidences` ADD `descricao` text;--> statement-breakpoint
ALTER TABLE `evidences` ADD `arquivo` varchar(255);--> statement-breakpoint
ALTER TABLE `competencias_macros` ADD CONSTRAINT `competencias_macros_nome_unique` UNIQUE(`nome`);--> statement-breakpoint
ALTER TABLE `pdi_validacoes` ADD CONSTRAINT `pdi_validacoes_pdiId_pdis_id_fk` FOREIGN KEY (`pdiId`) REFERENCES `pdis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pdi_validacoes` ADD CONSTRAINT `pdi_validacoes_liderId_users_id_fk` FOREIGN KEY (`liderId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `actions` DROP COLUMN `blocoId`;--> statement-breakpoint
ALTER TABLE `actions` DROP COLUMN `microId`;--> statement-breakpoint
ALTER TABLE `actions` DROP COLUMN `nome`;--> statement-breakpoint
ALTER TABLE `actions` DROP COLUMN `justificativaReprovacaoLider`;--> statement-breakpoint
ALTER TABLE `actions` DROP COLUMN `createdBy`;--> statement-breakpoint
ALTER TABLE `adjustment_requests` DROP COLUMN `comentarioLider`;--> statement-breakpoint
ALTER TABLE `competencias_macros` DROP COLUMN `blocoId`;--> statement-breakpoint
ALTER TABLE `competencias_macros` DROP COLUMN `status`;
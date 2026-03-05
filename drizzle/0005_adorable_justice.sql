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
CREATE TABLE `normas_regras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`subtitulo` varchar(500),
	`conteudo` text NOT NULL,
	`icone` varchar(50) DEFAULT 'BookOpen',
	`imagemUrl` varchar(1000),
	`categoria` varchar(100) DEFAULT 'geral',
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
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
CREATE TABLE `solicitacoes_acoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pdiId` int NOT NULL,
	`macroId` int NOT NULL,
	`microcompetencia` varchar(255),
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`prazo` date NOT NULL,
	`porqueFazer` text,
	`ondeFazer` text,
	`linkEvento` varchar(1000),
	`previsaoInvestimento` varchar(100),
	`outrosProfissionaisParticipando` enum('sim','nao'),
	`solicitanteId` int NOT NULL,
	`statusGeral` enum('aguardando_ckm','aguardando_gestor','aguardando_rh','aprovada','vetada_gestor','vetada_rh','em_revisao','encerrada_lider') NOT NULL DEFAULT 'aguardando_ckm',
	`rodadaAtual` int NOT NULL DEFAULT 1,
	`historicoRodadas` text,
	`ckmParecerTipo` enum('com_aderencia','sem_aderencia'),
	`ckmParecerTexto` text,
	`ckmParecerPor` int,
	`ckmParecerEm` timestamp,
	`liderRevisaoSolicitada` boolean NOT NULL DEFAULT false,
	`liderMotivoRevisao` text,
	`gestorDecisao` enum('aprovado','reprovado','encerrada'),
	`gestorJustificativa` text,
	`gestorId` int,
	`gestorDecisaoEm` timestamp,
	`rhDecisao` enum('aprovado','reprovado'),
	`rhJustificativa` text,
	`rhId` int,
	`rhDecisaoEm` timestamp,
	`acaoIncluidaId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
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
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','gerente','lider','colaborador') NOT NULL;--> statement-breakpoint
ALTER TABLE `actions` ADD `microcompetencia` varchar(255);--> statement-breakpoint
ALTER TABLE `actions` ADD `titulo` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `competencias_macros` ADD `ativo` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `evidences` ADD `descricao` text;--> statement-breakpoint
ALTER TABLE `evidences` ADD `arquivo` varchar(255);--> statement-breakpoint
ALTER TABLE `pdis` ADD `relatorioAnalise` text;--> statement-breakpoint
ALTER TABLE `pdis` ADD `relatorioArquivoUrl` text;--> statement-breakpoint
ALTER TABLE `pdis` ADD `relatorioArquivoNome` varchar(255);--> statement-breakpoint
ALTER TABLE `pdis` ADD `relatorioArquivoKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `viuNormasVersao` int DEFAULT 0 NOT NULL;--> statement-breakpoint
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
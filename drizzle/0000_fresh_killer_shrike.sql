CREATE TABLE `acoes_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`campo` varchar(50) NOT NULL,
	`valorAnterior` text,
	`valorNovo` text,
	`motivoAlteracao` text,
	`alteradoPor` int NOT NULL,
	`solicitacaoAjusteId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `acoes_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pdiId` int NOT NULL,
	`blocoId` int NOT NULL,
	`macroId` int NOT NULL,
	`microId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text NOT NULL,
	`prazo` timestamp NOT NULL,
	`status` enum('pendente_aprovacao_lider','aprovada_lider','reprovada_lider','em_andamento','em_discussao','evidencia_enviada','evidencia_aprovada','evidencia_reprovada','correcao_solicitada','concluida','vencida','cancelada') NOT NULL DEFAULT 'pendente_aprovacao_lider',
	`justificativaReprovacaoLider` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adjustment_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentRequestId` int NOT NULL,
	`autorId` int NOT NULL,
	`comentario` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adjustment_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adjustment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`solicitanteId` int NOT NULL,
	`tipoSolicitante` enum('colaborador','lider') NOT NULL,
	`justificativa` text NOT NULL,
	`camposAjustar` text NOT NULL,
	`status` enum('pendente','aprovada','reprovada') NOT NULL DEFAULT 'pendente',
	`justificativaAdmin` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`evaluatedAt` timestamp,
	`evaluatedBy` int,
	CONSTRAINT `adjustment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ciclos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`dataInicio` timestamp NOT NULL,
	`dataFim` timestamp NOT NULL,
	`status` enum('ativo','encerrado') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `ciclos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competencias_blocos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competencias_blocos_id` PRIMARY KEY(`id`),
	CONSTRAINT `competencias_blocos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `competencias_macros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blocoId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competencias_macros_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competencias_micros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`macroId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competencias_micros_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`leaderId` int,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `departamentos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `evidence_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(100) NOT NULL,
	`fileSize` bigint NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_texts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceId` int NOT NULL,
	`titulo` varchar(255),
	`texto` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_texts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionId` int NOT NULL,
	`colaboradorId` int NOT NULL,
	`status` enum('aguardando_avaliacao','aprovada','reprovada','correcao_solicitada') NOT NULL DEFAULT 'aguardando_avaliacao',
	`justificativaAdmin` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`evaluatedAt` timestamp,
	`evaluatedBy` int,
	CONSTRAINT `evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinatarioId` int NOT NULL,
	`tipo` varchar(100) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`mensagem` text NOT NULL,
	`referenciaId` int,
	`lida` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pdis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`colaboradorId` int NOT NULL,
	`cicloId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`objetivoGeral` text,
	`status` enum('em_andamento','concluido','cancelado') NOT NULL DEFAULT 'em_andamento',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `pdis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`email` varchar(320) NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`loginMethod` varchar(64),
	`role` enum('admin','lider','colaborador') NOT NULL,
	`cargo` varchar(255) NOT NULL,
	`leaderId` int,
	`departamentoId` int,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_cpf_unique` UNIQUE(`cpf`)
);

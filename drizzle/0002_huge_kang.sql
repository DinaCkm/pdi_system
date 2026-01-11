CREATE TABLE `departamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `departamentos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `departamentoId` int;
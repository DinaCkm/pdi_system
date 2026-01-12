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

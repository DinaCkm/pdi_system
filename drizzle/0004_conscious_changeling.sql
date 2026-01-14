CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentRequestId` int NOT NULL,
	`adminId` int NOT NULL,
	`campo` varchar(100) NOT NULL,
	`valorAnterior` text,
	`valorNovo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);

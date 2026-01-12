CREATE TABLE `adjustment_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentRequestId` int NOT NULL,
	`autorId` int NOT NULL,
	`comentario` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adjustment_comments_id` PRIMARY KEY(`id`)
);

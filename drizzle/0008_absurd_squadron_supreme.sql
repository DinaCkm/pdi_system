DROP TABLE `acoes_historico`;--> statement-breakpoint
DROP TABLE `actions`;--> statement-breakpoint
DROP TABLE `adjustment_comments`;--> statement-breakpoint
DROP TABLE `adjustment_requests`;--> statement-breakpoint
DROP TABLE `ciclos`;--> statement-breakpoint
DROP TABLE `competencias_blocos`;--> statement-breakpoint
DROP TABLE `competencias_macros`;--> statement-breakpoint
DROP TABLE `competencias_micros`;--> statement-breakpoint
DROP TABLE `departamentos`;--> statement-breakpoint
DROP TABLE `evidence_files`;--> statement-breakpoint
DROP TABLE `evidence_texts`;--> statement-breakpoint
DROP TABLE `evidences`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
DROP TABLE `pdis`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_cpf_unique`;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `cpf`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `cargo`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `leaderId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `departamentoId`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `status`;
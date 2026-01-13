ALTER TABLE `adjustment_requests` MODIFY COLUMN `status` enum('pendente','mais_informacoes','aprovada','reprovada','aguardando_lider') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `adjustment_requests` ADD `dadosAntesAjuste` text;--> statement-breakpoint
ALTER TABLE `adjustment_requests` ADD `dadosAposAjuste` text;--> statement-breakpoint
ALTER TABLE `adjustment_requests` ADD `approvedByLeaderAt` timestamp;--> statement-breakpoint
ALTER TABLE `adjustment_requests` ADD `approvedByLeaderId` int;
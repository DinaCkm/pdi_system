ALTER TABLE `adjustment_requests` MODIFY COLUMN `status` enum('pendente','aprovada','reprovada') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `adjustment_requests` DROP COLUMN `dadosAntesAjuste`;--> statement-breakpoint
ALTER TABLE `adjustment_requests` DROP COLUMN `dadosAposAjuste`;--> statement-breakpoint
ALTER TABLE `adjustment_requests` DROP COLUMN `approvedByLeaderAt`;--> statement-breakpoint
ALTER TABLE `adjustment_requests` DROP COLUMN `approvedByLeaderId`;
ALTER TABLE `pdis` DROP INDEX `uq_colaborador_ciclo`;--> statement-breakpoint
ALTER TABLE `actions` DROP FOREIGN KEY `actions_pdiId_pdis_id_fk`;
--> statement-breakpoint
ALTER TABLE `adjustment_requests` MODIFY COLUMN `status` enum('pendente','mais_informacoes','aprovada','reprovada','aguardando_lider') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `evidence_files` MODIFY COLUMN `fileSize` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `adjustment_requests` DROP COLUMN `comentarioLider`;
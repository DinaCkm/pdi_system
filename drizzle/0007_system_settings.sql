CREATE TABLE IF NOT EXISTS `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pdi_execution_locked` boolean NOT NULL DEFAULT false,
	`lock_scheduled_at` timestamp NULL,
	`lock_message` text,
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT IGNORE INTO `system_settings` (`id`, `pdi_execution_locked`) VALUES (1, false);

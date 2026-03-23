ALTER TABLE `solicitacoes_acoes` MODIFY COLUMN `statusGeral` enum('aguardando_ckm','aguardando_gestor','aguardando_rh','aprovada','vetada_gestor','vetada_rh','em_revisao','encerrada_lider','aguardando_solicitante') NOT NULL DEFAULT 'aguardando_ckm';--> statement-breakpoint
ALTER TABLE `evidences` ADD `tipoEvidencia` enum('certificado','relatorio','projeto','apresentacao','evento','mentoria','outro');--> statement-breakpoint
ALTER TABLE `evidences` ADD `data_realizacao` date;--> statement-breakpoint
ALTER TABLE `evidences` ADD `cargaHoraria` int;--> statement-breakpoint
ALTER TABLE `evidences` ADD `oQueRealizou` text;--> statement-breakpoint
ALTER TABLE `evidences` ADD `comoAplicou` text;--> statement-breakpoint
ALTER TABLE `evidences` ADD `resultadoPratico` text;--> statement-breakpoint
ALTER TABLE `evidences` ADD `impactoPercentual` int;--> statement-breakpoint
ALTER TABLE `evidences` ADD `principalAprendizado` text;--> statement-breakpoint
ALTER TABLE `evidences` ADD `linkExterno` varchar(1000);--> statement-breakpoint
ALTER TABLE `evidences` ADD `evidenciaComprova` enum('sim','nao');--> statement-breakpoint
ALTER TABLE `evidences` ADD `impactoComprova` enum('sim','nao','parcialmente');--> statement-breakpoint
ALTER TABLE `evidences` ADD `impactoValidadoAdmin` int;--> statement-breakpoint
ALTER TABLE `evidences` ADD `parecerImpacto` text;
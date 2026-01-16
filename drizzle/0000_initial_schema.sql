-- Initial schema creation
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(255) NOT NULL UNIQUE,
  `cpf` varchar(20) NOT NULL UNIQUE,
  `nome` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `departamentoId` int,
  `liderUserId` int,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `departamentos` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `leaderId` int NOT NULL,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `ciclos` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` varchar(100) NOT NULL,
  `dataInicio` timestamp NOT NULL,
  `dataFim` timestamp NOT NULL,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `pdis` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `colaboradorId` int NOT NULL,
  `cicloId` int NOT NULL,
  `status` enum('rascunho','em_preenchimento','aguardando_aprovacao','aprovada','rejeitada') NOT NULL DEFAULT 'rascunho',
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_colaborador_ciclo` (`colaboradorId`, `cicloId`)
);

CREATE TABLE IF NOT EXISTS `actions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `pdiId` int NOT NULL,
  `blocoId` int NOT NULL,
  `macroId` int NOT NULL,
  `microId` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text NOT NULL,
  `prazo` timestamp NOT NULL,
  `status` enum('pendente_aprovacao_lider','aprovada_lider','reprovada_lider','em_andamento','em_discussao','evidencia_enviada','evidencia_aprovada','evidencia_reprovada','correcao_solicitada','concluida','vencida','cancelada') NOT NULL DEFAULT 'pendente_aprovacao_lider',
  `justificativaReprovacaoLider` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdBy` int NOT NULL,
  FOREIGN KEY (`pdiId`) REFERENCES `pdis` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `adjustment_requests` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `actionId` int NOT NULL,
  `solicitanteId` int NOT NULL,
  `tipoSolicitante` enum('colaborador','lider') NOT NULL,
  `tipoSolicitacao` varchar(100),
  `descricaoSolicitacao` text,
  `liderConfirmacao` boolean DEFAULT false,
  `justificativa` text NOT NULL,
  `camposAjustar` text NOT NULL,
  `status` enum('pendente','mais_informacoes','aprovada','reprovada','aguardando_lider','lider_de_acordo') NOT NULL DEFAULT 'pendente',
  `justificativaAdmin` text,
  `comentarioLider` text,
  `approvedByLeaderId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `evaluatedAt` timestamp,
  `evaluatedBy` int
);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `destinatarioId` int NOT NULL,
  `referenciaId` int,
  `tipo` varchar(100) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensagem` text NOT NULL,
  `lida` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `readAt` timestamp
);

CREATE TABLE IF NOT EXISTS `competencias_blocos` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `competencias_macros` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `blocoId` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `competencias_micros` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `macroId` int NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `evidences` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `actionId` int NOT NULL,
  `colaboradorId` int NOT NULL,
  `tipo` enum('arquivo','texto') NOT NULL,
  `descricao` text,
  `status` enum('pendente_analise','aprovada','reprovada') NOT NULL DEFAULT 'pendente_analise',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `evaluatedAt` timestamp
);

CREATE TABLE IF NOT EXISTS `evidence_files` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `evidenceId` int NOT NULL,
  `nomeArquivo` varchar(255) NOT NULL,
  `caminhoArquivo` text NOT NULL,
  `tipoMime` varchar(100),
  `tamanho` int,
  `uploadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uploadedBy` int NOT NULL
);

CREATE TABLE IF NOT EXISTS `evidence_texts` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `evidenceId` int NOT NULL,
  `conteudo` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `user_department_roles` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `departmentId` int NOT NULL,
  `leaderUserId` int NOT NULL,
  `tipo` enum('lider','colaborador') NOT NULL,
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_dept_role` (`userId`, `departmentId`, `tipo`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`departmentId`) REFERENCES `departamentos` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`leaderUserId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `acoes_historico` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `actionId` int NOT NULL,
  `campo` varchar(50) NOT NULL,
  `valorAnterior` text,
  `valorNovo` text,
  `motivoAlteracao` text,
  `alteradoPor` int NOT NULL,
  `solicitacaoAjusteId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tabela` varchar(100) NOT NULL,
  `operacao` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `registroId` int NOT NULL,
  `alteracoes` text,
  `usuarioId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `adjustment_comments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `adjustmentRequestId` int NOT NULL,
  `autorId` int NOT NULL,
  `comentario` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

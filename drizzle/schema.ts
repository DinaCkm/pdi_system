import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, mysqlEnum, index, foreignKey, bigint, boolean, decimal } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"
import { date } from "drizzle-orm/mysql-core"

export const acoesHistorico = mysqlTable("acoes_historico", {
	id: int().autoincrement().notNull().primaryKey(),
	actionId: int().notNull(),
	campo: varchar({ length: 50 }).notNull(),
	valorAnterior: text(),
	valorNovo: text(),
	motivoAlteracao: text(),
	alteradoPor: int().notNull(),
	solicitacaoAjusteId: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const actions = mysqlTable("actions", {
	id: int().autoincrement().notNull().primaryKey(),
	pdiId: int().notNull(),
	macroId: int().notNull(),
	microcompetencia: varchar({ length: 255 }),
	titulo: varchar({ length: 255 }).notNull(),
	descricao: text(),
	prazo: date("prazo"),
	status: varchar({ length: 50 }).default("nao_iniciada").notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
	// Campos novos - Relatorio Individual de Evolucao (Etapa 4)
	cicloId: int().references(() => ciclos.id, { onDelete: "set null" }),
	tipoCompetencia: mysqlEnum([`comportamental`, `tecnica`]),
	competenciaOriginal: varchar({ length: 500 }),
	categoriaDesenvolvimento: varchar({ length: 100 }),
	dataConclusaoReal: date("data_conclusao_real"),
	sourceImportRowId: int(),
});

export const adjustmentComments = mysqlTable("adjustment_comments", {
	id: int().autoincrement().notNull().primaryKey(),
	adjustmentRequestId: int().notNull(),
	autorId: int().notNull(),
	comentario: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const adjustmentRequests = mysqlTable("adjustment_requests", {
	id: int().autoincrement().notNull().primaryKey(),
	actionId: int().notNull(),
	solicitanteId: int().notNull(),
	tipoSolicitante: mysqlEnum([`colaborador`,`lider`]).notNull(),
	justificativa: text().notNull(),
	camposAjustar: text().notNull(),
	status: mysqlEnum([`pendente`,`mais_informacoes`,`aprovada`,`reprovada`,`aguardando_lider`]).default(`pendente`).notNull(),
	justificativaAdmin: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	evaluatedAt: timestamp({ mode: 'string' }),
	evaluatedBy: int(),
	dadosAntesAjuste: text(),
	dadosAposAjuste: text(),
	approvedByLeaderAt: timestamp({ mode: 'string' }),
	approvedByLeaderId: int(),
});

export const auditLog = mysqlTable("audit_log", {
	id: int().autoincrement().notNull().primaryKey(),
	adjustmentRequestId: int().notNull(),
	adminId: int().notNull(),
	campo: varchar({ length: 100 }).notNull(),
	valorAnterior: text(),
	valorNovo: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ciclos = mysqlTable("ciclos", {
	id: int().autoincrement().notNull().primaryKey(),
	nome: varchar({ length: 255 }).notNull(),
	dataInicio: timestamp({ mode: 'string' }).notNull(),
	dataFim: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum([`ativo`,`encerrado`]).default(`ativo`).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: int().notNull(),
});

export const competenciasMacros = mysqlTable("competencias_macros", {
	id: int().autoincrement().notNull().primaryKey(),
	nome: varchar({ length: 255 }).notNull().unique(),
	descricao: text().notNull(),
	ativo: boolean().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const departamentos = mysqlTable("departamentos", {
	id: int().autoincrement().notNull().primaryKey(),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text(),
	leaderId: int(),
	status: mysqlEnum([`ativo`,`inativo`]).default(`ativo`).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		name: index("name").on(table.nome),
	}
});

export const evidenceFiles = mysqlTable("evidence_files", {
	id: int().autoincrement().notNull().primaryKey(),
	evidenceId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileType: varchar({ length: 100 }).notNull(),
	fileSize: bigint("fileSize", { mode: "number" }).notNull(),
	fileUrl: text().notNull(),
	fileKey: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const evidenceTexts = mysqlTable("evidence_texts", {
	id: int().autoincrement().notNull().primaryKey(),
	evidenceId: int().notNull(),
	titulo: varchar({ length: 255 }),
	texto: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const evidences = mysqlTable("evidences", {
	id: int().autoincrement().notNull().primaryKey(),
	actionId: int().notNull(),
	colaboradorId: int().notNull(),
	descricao: text(),
	arquivo: varchar({ length: 255 }),
	status: mysqlEnum([`aguardando_avaliacao`,`aprovada`,`reprovada`,`correcao_solicitada`]).default(`aguardando_avaliacao`).notNull(),
	justificativaAdmin: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	evaluatedAt: timestamp({ mode: 'string' }),
	evaluatedBy: int(),
	satisfactionScore: int(),
	// Novos campos - Formulário guiado
	tipoEvidencia: mysqlEnum([`certificado`,`relatorio`,`projeto`,`apresentacao`,`evento`,`mentoria`,`outro`]),
	dataRealizacao: date("data_realizacao"),
	cargaHoraria: int(),
	oQueRealizou: text(),
	comoAplicou: text(),
	resultadoPratico: text(),
	impactoPercentual: int(),
	principalAprendizado: text(),
	linkExterno: varchar({ length: 1000 }),
	// Novos campos - Avaliação do admin
	evidenciaComprova: mysqlEnum([`sim`,`nao`]),
	impactoComprova: mysqlEnum([`sim`,`nao`,`parcialmente`]),
	impactoValidadoAdmin: int(),
	parecerImpacto: text(),
});

export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull().primaryKey(),
	destinatarioId: int().notNull(),
	tipo: varchar({ length: 100 }).notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	mensagem: text().notNull(),
	referenciaId: int(),
	lida: boolean("lida").default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	readAt: timestamp({ mode: 'string' }),
});

export const pdis = mysqlTable("pdis", {
	id: int().autoincrement().notNull().primaryKey(),
	colaboradorId: int().notNull(),
	cicloId: int().notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	objetivoGeral: text(),
	relatorioAnalise: text(),
	relatorioArquivoUrl: text(),
	relatorioArquivoNome: varchar({ length: 255 }),
	relatorioArquivoKey: text(),
	status: mysqlEnum([`em_andamento`,`concluido`,`cancelado`]).default(`em_andamento`).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
		createdBy: int().notNull(),
	});

export const userDepartmentRoles = mysqlTable("user_department_roles", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	departmentId: int().notNull().references(() => departamentos.id, { onDelete: "cascade" } ),
	assignmentType: mysqlEnum([`LEADER`,`MEMBER`]).notNull(),
	leaderUserId: int().references(() => users.id, { onDelete: "set null" } ),
	status: mysqlEnum([`ativo`,`inativo`]).default(`ativo`).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
},
(table) => {
	return {
		uq_user_dept_type: index("uq_user_dept_type").on(table.userId, table.departmentId, table.assignmentType),
		user_department_roles_userId_idx: index("user_department_roles_userId_idx").on(table.userId),
		user_department_roles_departmentId_idx: index("user_department_roles_departmentId_idx").on(table.departmentId),
		user_department_roles_leaderUserId_idx: index("user_department_roles_leaderUserId_idx").on(table.leaderUserId),
		user_department_roles_assignmentType_idx: index("user_department_roles_assignmentType_idx").on(table.assignmentType),
	}
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull().primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	passwordHash: varchar({ length: 255 }),
	passwordUpdatedAt: timestamp({ mode: 'string' }),
	passwordResetTokenHash: varchar({ length: 255 }),
	passwordResetExpiresAt: timestamp({ mode: 'string' }),
	mustChangePassword: boolean().default(false).notNull(),
	temporaryPasswordGeneratedAt: timestamp({ mode: 'string' }),
	authTokenVersion: int().default(0).notNull(),
	failedLoginAttempts: int().default(0).notNull(),
	lastFailedLoginAt: timestamp({ mode: 'string' }),
	loginBlockedUntil: timestamp({ mode: 'string' }),
	role: mysqlEnum([`admin`,`gerente`,`lider`,`colaborador`]).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	cpf: varchar({ length: 14 }),
	studentId: varchar({ length: 50 }),
	cargo: varchar({ length: 255 }).notNull(),
	leaderId: int(),
	status: mysqlEnum([`ativo`,`inativo`]).default(`ativo`).notNull(),
	departamentoId: int(),
	viuNormasVersao: int().default(0).notNull(),
},
(table) => {
	return {
		users_openId_unique: index("users_openId_unique").on(table.openId),
	}
});

export const deletionAuditLog = mysqlTable("deletion_audit_log", {
	id: int().autoincrement().notNull().primaryKey(),
	entidadeTipo: mysqlEnum([`acao`,`pdi`,`usuario`,`evidencia`,`solicitacao`]).notNull(),
	entidadeId: int().notNull(),
	entidadeNome: varchar({ length: 255 }).notNull(),
	dadosExcluidos: text().notNull(),
	excluidoPor: int().notNull(),
	excluidoPorNome: varchar({ length: 255 }).notNull(),
	motivoExclusao: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const pdiValidacoes = mysqlTable("pdi_validacoes", {
	id: int().autoincrement().notNull().primaryKey(),
	pdiId: int().notNull().references(() => pdis.id, { onDelete: "cascade" }),
	liderId: int().notNull().references(() => users.id, { onDelete: "cascade" }),
	aprovadoEm: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	justificativa: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const solicitacoesAcoes = mysqlTable("solicitacoes_acoes", {
	id: int().autoincrement().notNull().primaryKey(),
	// Dados da ação (mesmos campos de actions)
	pdiId: int().notNull(),
	macroId: int().notNull(),
	microcompetencia: varchar({ length: 255 }),
	titulo: varchar({ length: 255 }).notNull(),
	descricao: text(),
	prazo: date("prazo").notNull(),
	// Campos informativos para análise de aprovação
	porqueFazer: text(),
	ondeFazer: text(),
	linkEvento: varchar({ length: 1000 }),
	previsaoInvestimento: varchar({ length: 100 }),
	outrosProfissionaisParticipando: mysqlEnum([`sim`,`nao`]),
	// Quem solicitou
	solicitanteId: int().notNull(),
	// Fluxo de aprovação
	statusGeral: mysqlEnum([`aguardando_ckm`,`aguardando_gestor`,`aguardando_rh`,`aprovada`,`vetada_gestor`,`vetada_rh`,`em_revisao`,`encerrada_lider`,`aguardando_solicitante`]).default(`aguardando_ckm`).notNull(),
	// Controle de rodadas de revisão
	rodadaAtual: int().default(1).notNull(),
	historicoRodadas: text(),
	// Etapa 1: Parecer CKM (Admin)
	ckmParecerTipo: mysqlEnum([`com_aderencia`,`sem_aderencia`]),
	ckmParecerTexto: text(),
	ckmParecerPor: int(),
	ckmParecerEm: timestamp({ mode: 'string' }),
	// Controle de revisão do Líder
	liderRevisaoSolicitada: boolean().default(false).notNull(),
	liderMotivoRevisao: text(),
	// Etapa 2: Decisão do Gestor (Líder)
	gestorDecisao: mysqlEnum([`aprovado`,`reprovado`,`encerrada`]),
	gestorJustificativa: text(),
	gestorId: int(),
	gestorDecisaoEm: timestamp({ mode: 'string' }),
	// Etapa 3: Decisão do RH (Gerente)
	rhDecisao: mysqlEnum([`aprovado`,`reprovado`]),
	rhJustificativa: text(),
	rhId: int(),
	rhDecisaoEm: timestamp({ mode: 'string' }),
	// Ação criada (quando incluída no PDI)
	acaoIncluidaId: int(),
	// Timestamps
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const systemSettings = mysqlTable("system_settings", {
	id: int().autoincrement().notNull().primaryKey(),
	pdiExecutionLocked: boolean("pdi_execution_locked").default(false).notNull(),
	lockScheduledAt: timestamp("lock_scheduled_at", { mode: 'string' }),
	lockMessage: text("lock_message"),
	updatedBy: int("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const normasRegras = mysqlTable("normas_regras", {
	id: int().autoincrement().notNull().primaryKey(),
	titulo: varchar({ length: 255 }).notNull(),
	subtitulo: varchar({ length: 500 }),
	conteudo: text().notNull(),
	icone: varchar({ length: 50 }).default(`BookOpen`),
	imagemUrl: varchar({ length: 1000 }),
	categoria: varchar({ length: 100 }).default(`geral`),
	ordem: int().default(0).notNull(),
	ativo: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

// ==========================================================
// Relatorio Individual de Evolucao - Etapa 4 (modelagem MySQL)
// Todas as tabelas abaixo sao aditivas, sem alterar nada existente.
// ==========================================================

export const importBatches = mysqlTable("import_batches", {
	id: int().autoincrement().notNull().primaryKey(),
	cicloId: int().notNull().references(() => ciclos.id),
	tipo: mysqlEnum([`pdi_comportamental`, `certificacao_tecnica`, `avaliacao_desempenho`]).notNull(),
	nomeArquivo: varchar({ length: 500 }).notNull(),
	status: mysqlEnum([`processando`, `concluido`, `concluido_com_erros`, `erro`]).default(`processando`).notNull(),
	totalLinhas: int().default(0).notNull(),
	linhasOk: int().default(0).notNull(),
	linhasErro: int().default(0).notNull(),
	linhasBloqueadas: int().default(0).notNull(),
	importadoPor: int().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	concluidoEm: timestamp({ mode: 'string' }),
});

export const importRows = mysqlTable("import_rows", {
	id: int().autoincrement().notNull().primaryKey(),
	importBatchId: int().notNull().references(() => importBatches.id, { onDelete: "cascade" }),
	numeroLinha: int().notNull(),
	status: mysqlEnum([`pendente`, `ok`, `erro`, `bloqueado_revisao`]).default(`pendente`).notNull(),
	erro: text(),
	dadosOriginais: text().notNull(),
	entidadeTipo: varchar({ length: 50 }),
	entidadeId: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		import_rows_batchId_idx: index("import_rows_batchId_idx").on(table.importBatchId),
	}
});

export const performanceEvaluations = mysqlTable("performance_evaluations", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int().notNull().references(() => users.id),
	cicloId: int().notNull().references(() => ciclos.id),
	importBatchId: int().references(() => importBatches.id),
	dataAvaliacao: date("data_avaliacao"),
	avaliador: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		performance_evaluations_userId_idx: index("performance_evaluations_userId_idx").on(table.userId),
		performance_evaluations_cicloId_idx: index("performance_evaluations_cicloId_idx").on(table.cicloId),
	}
});

export const performanceEvaluationResults = mysqlTable("performance_evaluation_results", {
	id: int().autoincrement().notNull().primaryKey(),
	performanceEvaluationId: int().notNull().references(() => performanceEvaluations.id, { onDelete: "cascade" }),
	competencia: varchar({ length: 255 }).notNull(),
	competenciaMacroId: int().references(() => competenciasMacros.id),
	nota: decimal({ precision: 4, scale: 2 }).notNull(),
	escala: varchar({ length: 20 }).default(`0-3`).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const certificationResults = mysqlTable("certification_results", {
	id: int().autoincrement().notNull().primaryKey(),
	userId: int().notNull().references(() => users.id),
	cicloId: int().notNull().references(() => ciclos.id),
	importBatchId: int().references(() => importBatches.id),
	unidadeRegional: varchar({ length: 255 }),
	cargo: varchar({ length: 255 }),
	perfil: varchar({ length: 100 }),
	macrocompetenciaOriginal: varchar({ length: 500 }).notNull(),
	macrocompetenciaId: int().references(() => competenciasMacros.id),
	percentual: int().notNull(),
	leitura: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => {
	return {
		certification_results_userId_idx: index("certification_results_userId_idx").on(table.userId),
		certification_results_cicloId_idx: index("certification_results_cicloId_idx").on(table.cicloId),
	}
});

export const competencyAliases = mysqlTable("competency_aliases", {
	id: int().autoincrement().notNull().primaryKey(),
	grafiaOriginal: varchar({ length: 500 }).notNull().unique(),
	macrocompetenciaId: int().notNull().references(() => competenciasMacros.id),
	status: mysqlEnum([`sugerido`, `aprovado`]).default(`sugerido`).notNull(),
	sugeridoPorSimilaridade: boolean().default(false).notNull(),
	aprovadoPor: int().references(() => users.id),
	aprovadoEm: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

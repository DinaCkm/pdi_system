import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, mysqlEnum, index, foreignKey, bigint, boolean } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const acoesHistorico = mysqlTable("acoes_historico", {
	id: int().autoincrement().notNull(),
	actionId: int().notNull(),
	campo: varchar({ length: 50 }).notNull(),
	valorAnterior: text(),
	valorNovo: text(),
	motivoAlteracao: text(),
	alteradoPor: int().notNull(),
	solicitacaoAjusteId: int(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const actions = mysqlTable("actions", {
	id: int().autoincrement().notNull(),
	pdiId: int().notNull(),
	blocoId: int().notNull(),
	macroId: int().notNull(),
	microId: int().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text().notNull(),
	prazo: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['pendente_aprovacao_lider','aprovada_lider','reprovada_lider','em_andamento','em_discussao','evidencia_enviada','evidencia_aprovada','evidencia_reprovada','correcao_solicitada','concluida','vencida','cancelada']).default('pendente_aprovacao_lider').notNull(),
	justificativaReprovacaoLider: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().notNull(),
});

export const adjustmentComments = mysqlTable("adjustment_comments", {
	id: int().autoincrement().notNull(),
	adjustmentRequestId: int().notNull(),
	autorId: int().notNull(),
	comentario: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const adjustmentRequests = mysqlTable("adjustment_requests", {
	id: int().autoincrement().notNull(),
	actionId: int().notNull(),
	solicitanteId: int().notNull(),
	tipoSolicitante: mysqlEnum(['colaborador','lider']).notNull(),
	justificativa: text().notNull(),
	camposAjustar: text().notNull(),
	status: mysqlEnum(['pendente','mais_informacoes','aprovada','reprovada','aguardando_lider']).default('pendente').notNull(),
	justificativaAdmin: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	evaluatedAt: timestamp({ mode: 'string' }),
	evaluatedBy: int(),
	dadosAntesAjuste: text(),
	dadosAposAjuste: text(),
	approvedByLeaderAt: timestamp({ mode: 'string' }),
	approvedByLeaderId: int(),
});

export const auditLog = mysqlTable("audit_log", {
	id: int().autoincrement().notNull(),
	adjustmentRequestId: int().notNull(),
	adminId: int().notNull(),
	campo: varchar({ length: 100 }).notNull(),
	valorAnterior: text(),
	valorNovo: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const ciclos = mysqlTable("ciclos", {
	id: int().autoincrement().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	dataInicio: timestamp({ mode: 'string' }).notNull(),
	dataFim: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['ativo','encerrado']).default('ativo').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdBy: int().notNull(),
});

export const competenciasBlocos = mysqlTable("competencias_blocos", {
	id: int().autoincrement().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text(),
	status: mysqlEnum(['ativo','inativo']).default('ativo'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const competenciasMacros = mysqlTable("competencias_macros", {
	id: int().autoincrement().notNull(),
	blocoId: int().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text(),
	status: mysqlEnum(['ativo','inativo']).default('ativo'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const competenciasMicros = mysqlTable("competencias_micros", {
	id: int().autoincrement().notNull(),
	macroId: int().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text(),
	status: mysqlEnum(['ativo','inativo']).default('ativo'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const departamentos = mysqlTable("departamentos", {
	id: int().autoincrement().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	descricao: text(),
	leaderId: int(),
	status: mysqlEnum(['ativo','inativo']).default('ativo').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("nome").on(table.nome),
]);

export const evidenceFiles = mysqlTable("evidence_files", {
	id: int().autoincrement().notNull(),
	evidenceId: int().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileType: varchar({ length: 100 }).notNull(),
	fileSize: bigint("fileSize", { mode: "number" }).notNull(),
	fileUrl: text().notNull(),
	fileKey: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const evidenceTexts = mysqlTable("evidence_texts", {
	id: int().autoincrement().notNull(),
	evidenceId: int().notNull(),
	titulo: varchar({ length: 255 }),
	texto: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const evidences = mysqlTable("evidences", {
	id: int().autoincrement().notNull(),
	actionId: int().notNull(),
	colaboradorId: int().notNull(),
	status: mysqlEnum(['aguardando_avaliacao','aprovada','reprovada','correcao_solicitada']).default('aguardando_avaliacao').notNull(),
	justificativaAdmin: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	evaluatedAt: timestamp({ mode: 'string' }),
	evaluatedBy: int(),
	satisfactionScore: int(),
});

export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull(),
	destinatarioId: int().notNull(),
	tipo: varchar({ length: 100 }).notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	mensagem: text().notNull(),
	referenciaId: int(),
	lida: boolean("lida").default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	readAt: timestamp({ mode: 'string' }),
});

export const pdis = mysqlTable("pdis", {
	id: int().autoincrement().notNull(),
	colaboradorId: int().notNull(),
	cicloId: int().notNull(),
	titulo: varchar({ length: 255 }).notNull(),
	objetivoGeral: text(),
	status: mysqlEnum(['em_andamento','concluido','cancelado']).default('em_andamento').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdBy: int().notNull(),
});

export const userDepartmentRoles = mysqlTable("user_department_roles", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	departmentId: int().notNull().references(() => departamentos.id, { onDelete: "cascade" } ),
	assignmentType: mysqlEnum(['LEADER','MEMBER']).notNull(),
	leaderUserId: int().references(() => users.id, { onDelete: "set null" } ),
	status: mysqlEnum(['ativo','inativo']).default('ativo').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("uq_user_dept_type").on(table.userId, table.departmentId, table.assignmentType),
	index("user_department_roles_userId_idx").on(table.userId),
	index("user_department_roles_departmentId_idx").on(table.departmentId),
	index("user_department_roles_leaderUserId_idx").on(table.leaderUserId),
	index("user_department_roles_assignmentType_idx").on(table.assignmentType),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['admin','lider','colaborador']).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	cpf: varchar({ length: 14 }).notNull(),
	cargo: varchar({ length: 255 }).notNull(),
	leaderId: int(),
	status: mysqlEnum(['ativo','inativo']).default('ativo').notNull(),
	departamentoId: int(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

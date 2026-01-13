import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * USUÁRIOS - Tabela principal de autenticação e perfis
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(), // CPF único
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "lider", "colaborador"]).notNull(),
  cargo: varchar("cargo", { length: 255 }).notNull(),
  leaderId: int("leaderId"), // ID do líder (para colaboradores e líderes)
  departamentoId: int("departamentoId"), // ID do departamento
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  leader: one(users, {
    fields: [users.leaderId],
    references: [users.id],
    relationName: "leader_subordinates",
  }),
  subordinates: many(users, { relationName: "leader_subordinates" }),
  departamento: one(departamentos, {
    fields: [users.departamentoId],
    references: [departamentos.id],
  }),
  pdis: many(pdis),
  notifications: many(notifications),
  createdActions: many(actions),
  sentEvidences: many(evidences),
  adjustmentRequests: many(adjustmentRequests),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * DEPARTAMENTOS - Organização de usuários
 */
export const departamentos = mysqlTable("departamentos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  descricao: text("descricao"),
  leaderId: int("leaderId"), // Líder do departamento (Admin ou Líder)
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const departamentosRelations = relations(departamentos, ({ one, many }) => ({
  users: many(users),
  leader: one(users, {
    fields: [departamentos.leaderId],
    references: [users.id],
  }),
}));

export type Departamento = typeof departamentos.$inferSelect;
export type InsertDepartamento = typeof departamentos.$inferInsert;

/**
 * COMPETÊNCIAS - Hierarquia Bloco → Macro → Micro
 */
export const competenciasBlocos = mysqlTable("competencias_blocos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  descricao: text("descricao"),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const competenciasBlocosRelations = relations(competenciasBlocos, ({ many }) => ({
  macros: many(competenciasMacros),
}));

export const competenciasMacros = mysqlTable("competencias_macros", {
  id: int("id").autoincrement().primaryKey(),
  blocoId: int("blocoId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const competenciasMacrosRelations = relations(competenciasMacros, ({ one, many }) => ({
  bloco: one(competenciasBlocos, {
    fields: [competenciasMacros.blocoId],
    references: [competenciasBlocos.id],
  }),
  micros: many(competenciasMicros),
}));

export const competenciasMicros = mysqlTable("competencias_micros", {
  id: int("id").autoincrement().primaryKey(),
  macroId: int("macroId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const competenciasMicrosRelations = relations(competenciasMicros, ({ one, many }) => ({
  macro: one(competenciasMacros, {
    fields: [competenciasMicros.macroId],
    references: [competenciasMacros.id],
  }),
  actions: many(actions),
}));

/**
 * CICLOS SEMESTRAIS
 */
export const ciclos = mysqlTable("ciclos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  dataInicio: timestamp("dataInicio").notNull(),
  dataFim: timestamp("dataFim").notNull(),
  status: mysqlEnum("status", ["ativo", "encerrado"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export const ciclosRelations = relations(ciclos, ({ one, many }) => ({
  creator: one(users, {
    fields: [ciclos.createdBy],
    references: [users.id],
  }),
  pdis: many(pdis),
}));

/**
 * PDI - Plano de Desenvolvimento Individual
 */
export const pdis = mysqlTable("pdis", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaboradorId").notNull(),
  cicloId: int("cicloId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  objetivoGeral: text("objetivoGeral"),
  status: mysqlEnum("status", ["em_andamento", "concluido", "cancelado"]).default("em_andamento").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export const pdisRelations = relations(pdis, ({ one, many }) => ({
  colaborador: one(users, {
    fields: [pdis.colaboradorId],
    references: [users.id],
  }),
  ciclo: one(ciclos, {
    fields: [pdis.cicloId],
    references: [ciclos.id],
  }),
  creator: one(users, {
    fields: [pdis.createdBy],
    references: [users.id],
  }),
  actions: many(actions),
}));

/**
 * AÇÕES - 11 status possíveis
 */
export const actions = mysqlTable("actions", {
  id: int("id").autoincrement().primaryKey(),
  pdiId: int("pdiId").notNull(),
  blocoId: int("blocoId").notNull(),
  macroId: int("macroId").notNull(),
  microId: int("microId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  prazo: timestamp("prazo").notNull(),
  status: mysqlEnum("status", [
    "pendente_aprovacao_lider",
    "aprovada_lider",
    "reprovada_lider",
    "em_andamento",
    "em_discussao",
    "evidencia_enviada",
    "evidencia_aprovada",
    "evidencia_reprovada",
    "correcao_solicitada",
    "concluida",
    "vencida",
    "cancelada"
  ]).default("pendente_aprovacao_lider").notNull(),
  justificativaReprovacaoLider: text("justificativaReprovacaoLider"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").notNull(),
});

export const actionsRelations = relations(actions, ({ one, many }) => ({
  pdi: one(pdis, {
    fields: [actions.pdiId],
    references: [pdis.id],
  }),
  bloco: one(competenciasBlocos, {
    fields: [actions.blocoId],
    references: [competenciasBlocos.id],
  }),
  macro: one(competenciasMacros, {
    fields: [actions.macroId],
    references: [competenciasMacros.id],
  }),
  micro: one(competenciasMicros, {
    fields: [actions.microId],
    references: [competenciasMicros.id],
  }),
  creator: one(users, {
    fields: [actions.createdBy],
    references: [users.id],
  }),
  evidences: many(evidences),
  adjustmentRequests: many(adjustmentRequests),
}));

/**
 * EVIDÊNCIAS - Pacote único de evidências
 */
export const evidences = mysqlTable("evidences", {
  id: int("id").autoincrement().primaryKey(),
  actionId: int("actionId").notNull(),
  colaboradorId: int("colaboradorId").notNull(),
  status: mysqlEnum("status", [
    "aguardando_avaliacao",
    "aprovada",
    "reprovada",
    "correcao_solicitada"
  ]).default("aguardando_avaliacao").notNull(),
  justificativaAdmin: text("justificativaAdmin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  evaluatedAt: timestamp("evaluatedAt"),
  evaluatedBy: int("evaluatedBy"),
});

export const evidencesRelations = relations(evidences, ({ one, many }) => ({
  action: one(actions, {
    fields: [evidences.actionId],
    references: [actions.id],
  }),
  colaborador: one(users, {
    fields: [evidences.colaboradorId],
    references: [users.id],
  }),
  evaluator: one(users, {
    fields: [evidences.evaluatedBy],
    references: [users.id],
  }),
  files: many(evidenceFiles),
  texts: many(evidenceTexts),
}));

/**
 * ARQUIVOS DE EVIDÊNCIA
 */
export const evidenceFiles = mysqlTable("evidence_files", {
  id: int("id").autoincrement().primaryKey(),
  evidenceId: int("evidenceId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidenceFilesRelations = relations(evidenceFiles, ({ one }) => ({
  evidence: one(evidences, {
    fields: [evidenceFiles.evidenceId],
    references: [evidences.id],
  }),
}));

/**
 * TEXTOS DESCRITIVOS DE EVIDÊNCIA
 */
export const evidenceTexts = mysqlTable("evidence_texts", {
  id: int("id").autoincrement().primaryKey(),
  evidenceId: int("evidenceId").notNull(),
  titulo: varchar("titulo", { length: 255 }),
  texto: text("texto").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evidenceTextsRelations = relations(evidenceTexts, ({ one }) => ({
  evidence: one(evidences, {
    fields: [evidenceTexts.evidenceId],
    references: [evidences.id],
  }),
}));

/**
 * SOLICITAÇÕES DE AJUSTE
 */
export const adjustmentRequests = mysqlTable("adjustment_requests", {
  id: int("id").autoincrement().primaryKey(),
  actionId: int("actionId").notNull(),
  solicitanteId: int("solicitanteId").notNull(),
  tipoSolicitante: mysqlEnum("tipoSolicitante", ["colaborador", "lider"]).notNull(),
  justificativa: text("justificativa").notNull(),
  camposAjustar: text("camposAjustar").notNull(), // JSON string com campos que o colaborador quer ajustar
  status: mysqlEnum("status", [
    "pendente",           // Aguardando ação do Admin
    "mais_informacoes",   // Admin solicitou mais informações ao Colaborador
    "aprovada",           // Admin aprovou e ajustou a ação
    "reprovada",          // Admin reprovou a solicitação
    "aguardando_lider"    // Admin ajustou, aguardando aprovação final do Líder
  ]).default("pendente").notNull(),
  justificativaAdmin: text("justificativaAdmin"), // Justificativa do Admin (aprovar/reprovar/solicitar mais info)
  dadosAntesAjuste: text("dadosAntesAjuste"), // JSON com dados da ação antes do ajuste (auditoria)
  dadosAposAjuste: text("dadosAposAjuste"), // JSON com dados da ação após o ajuste (auditoria)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  evaluatedAt: timestamp("evaluatedAt"), // Data da avaliação do Admin
  evaluatedBy: int("evaluatedBy"), // ID do Admin que avaliou
  approvedByLeaderAt: timestamp("approvedByLeaderAt"), // Data da aprovação final do Líder
  approvedByLeaderId: int("approvedByLeaderId"), // ID do Líder que aprovou
});

export const adjustmentRequestsRelations = relations(adjustmentRequests, ({ one }) => ({
  action: one(actions, {
    fields: [adjustmentRequests.actionId],
    references: [actions.id],
  }),
  solicitante: one(users, {
    fields: [adjustmentRequests.solicitanteId],
    references: [users.id],
  }),
  evaluator: one(users, {
    fields: [adjustmentRequests.evaluatedBy],
    references: [users.id],
  }),
}));

/**
 * HISTÓRICO DE ALTERAÇÕES DE AÇÕES
 */
export const acoesHistorico = mysqlTable("acoes_historico", {
  id: int("id").autoincrement().primaryKey(),
  actionId: int("actionId").notNull(),
  campo: varchar("campo", { length: 50 }).notNull(), // nome, descricao, prazo, status, etc.
  valorAnterior: text("valorAnterior"),
  valorNovo: text("valorNovo"),
  motivoAlteracao: text("motivoAlteracao"),
  alteradoPor: int("alteradoPor").notNull(), // Admin que fez a alteração
  solicitacaoAjusteId: int("solicitacaoAjusteId"), // Se foi por solicitação
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const acoesHistoricoRelations = relations(acoesHistorico, ({ one }) => ({
  action: one(actions, {
    fields: [acoesHistorico.actionId],
    references: [actions.id],
  }),
  alterador: one(users, {
    fields: [acoesHistorico.alteradoPor],
    references: [users.id],
  }),
  solicitacaoAjuste: one(adjustmentRequests, {
    fields: [acoesHistorico.solicitacaoAjusteId],
    references: [adjustmentRequests.id],
  }),
}));

export type AcaoHistorico = typeof acoesHistorico.$inferSelect;
export type InsertAcaoHistorico = typeof acoesHistorico.$inferInsert;

/**
 * COMENTÁRIOS DE SOLICITAÇÕES DE AJUSTE
 */
export const adjustmentComments = mysqlTable("adjustment_comments", {
  id: int("id").autoincrement().primaryKey(),
  adjustmentRequestId: int("adjustmentRequestId").notNull(),
  autorId: int("autorId").notNull(),
  comentario: text("comentario").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const adjustmentCommentsRelations = relations(adjustmentComments, ({ one }) => ({
  adjustmentRequest: one(adjustmentRequests, {
    fields: [adjustmentComments.adjustmentRequestId],
    references: [adjustmentRequests.id],
  }),
  autor: one(users, {
    fields: [adjustmentComments.autorId],
    references: [users.id],
  }),
}));

export type AdjustmentComment = typeof adjustmentComments.$inferSelect;
export type InsertAdjustmentComment = typeof adjustmentComments.$inferInsert;

/**
 * NOTIFICAÇÕES
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  destinatarioId: int("destinatarioId").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  referenciaId: int("referenciaId"), // ID da ação/PDI relacionado
  lida: boolean("lida").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  destinatario: one(users, {
    fields: [notifications.destinatarioId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

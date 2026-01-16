import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, unique } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * USUÁRIOS - Tabela principal de autenticação e perfis
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "lider", "colaborador"]).notNull(),
  cargo: varchar("cargo", { length: 255 }).notNull(),
  leaderId: int("leaderId"),
  departamentoId: int("departamentoId"),
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
 * USER_DEPARTMENT_ROLES - Vínculo dual de usuário com departamento
 */
export const userDepartmentRoles = mysqlTable("user_department_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  departmentId: int("departmentId").notNull(),
  assignmentType: mysqlEnum("assignmentType", ["LEADER", "MEMBER"]).notNull(),
  leaderUserId: int("leaderUserId"),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userDepartmentRolesRelations = relations(userDepartmentRoles, ({ one }) => ({
  user: one(users, {
    fields: [userDepartmentRoles.userId],
    references: [users.id],
  }),
  department: one(departamentos, {
    fields: [userDepartmentRoles.departmentId],
    references: [departamentos.id],
  }),
  leader: one(users, {
    fields: [userDepartmentRoles.leaderUserId],
    references: [users.id],
    relationName: "leader_members",
  }),
}));

export type UserDepartmentRole = typeof userDepartmentRoles.$inferSelect;
export type InsertUserDepartmentRole = typeof userDepartmentRoles.$inferInsert;

/**
 * DEPARTAMENTOS - Organização de usuários
 */
export const departamentos = mysqlTable("departamentos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
  descricao: text("descricao"),
  leaderId: int("leaderId"),
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
 * REGRA CRÍTICA #7: Apenas ADMINISTRADOR pode criar PDI
 * REGRA CRÍTICA #8: PDI é único por ciclo
 */
export const pdis = mysqlTable(
  "pdis",
  {
    id: int("id").autoincrement().primaryKey(),
    colaboradorId: int("colaboradorId").notNull(),
    cicloId: int("cicloId").notNull(),
    titulo: varchar("titulo", { length: 255 }).notNull(),
    objetivoGeral: text("objetivoGeral"),
    status: mysqlEnum("status", [
      "rascunho",
      "aguardando_aprovacao",
      "ativo",
      "concluido",
      "cancelado"
    ]).default("rascunho").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdBy: int("createdBy").notNull(),
  },
  (table) => ({
    uniquePdiPerCiclo: unique().on(table.colaboradorId, table.cicloId),
  })
);

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
 * REGRA CRÍTICA #9: Ações devem estar sempre dentro do ciclo de duração do PDI
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
  satisfactionScore: int("satisfactionScore"),
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
  fileUrl: text("fileUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export const evidenceFilesRelations = relations(evidenceFiles, ({ one }) => ({
  evidence: one(evidences, {
    fields: [evidenceFiles.evidenceId],
    references: [evidences.id],
  }),
}));

/**
 * TEXTOS DE EVIDÊNCIA
 */
export const evidenceTexts = mysqlTable("evidence_texts", {
  id: int("id").autoincrement().primaryKey(),
  evidenceId: int("evidenceId").notNull(),
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
 * SOLICITAÇÕES DE AJUSTE - Fluxo de alteração de ações
 * REGRA CRÍTICA #10: Colaborador solicita → Líder confirma → Admin aprova e edita
 * 
 * Permissões:
 * - Colaborador: Pode SOLICITAR ajuste
 * - Líder: Pode CONFIRMAR concordância com a solicitação
 * - Admin: APENAS Admin pode APROVAR e FAZER O AJUSTE na ação
 */
export const adjustmentRequests = mysqlTable("adjustment_requests", {
  id: int("id").autoincrement().primaryKey(),
  actionId: int("actionId").notNull(),
  solicitanteId: int("solicitanteId").notNull(),
  tipoSolicitacao: mysqlEnum("tipoSolicitacao", [
    "alteracao_descricao",
    "alteracao_prazo",
    "alteracao_competencia",
    "cancelamento"
  ]).notNull(),
  descricaoSolicitacao: text("descricaoSolicitacao").notNull(),
  // REGRA CRÍTICA #10: Confirmação do Líder
  liderConfirmacao: boolean("liderConfirmacao"),
  liderConfirmadoPor: int("liderConfirmadoPor"),
  liderJustificativa: text("liderJustificativa"),
  liderConfirmadoAt: timestamp("liderConfirmadoAt"),
  // Resposta e Edição do Admin (APENAS Admin edita)
  status: mysqlEnum("status", [
    "pendente_confirmacao_lider",
    "pendente_admin",
    "aprovada",
    "rejeitada"
  ]).default("pendente_confirmacao_lider").notNull(),
  respondidoPor: int("respondidoPor"),
  justificativaResposta: text("justificativaResposta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondidoAt: timestamp("respondidoAt"),
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
  liderConfirmador: one(users, {
    fields: [adjustmentRequests.liderConfirmadoPor],
    references: [users.id],
  }),
  respondedor: one(users, {
    fields: [adjustmentRequests.respondidoPor],
    references: [users.id],
  }),
}));

/**
 * NOTIFICAÇÕES - Sistema de notificações
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  usuarioId: int("usuarioId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", [
    "pdi_criado",
    "pdi_aprovado",
    "pdi_rejeitado",
    "acao_aguardando_aprovacao",
    "acao_aprovada",
    "acao_reprovada",
    "evidencia_enviada",
    "evidencia_aprovada",
    "evidencia_reprovada",
    "ajuste_solicitado",
    "ajuste_confirmacao_lider",
    "ajuste_aprovado",
    "ajuste_rejeitado"
  ]).notNull(),
  lido: boolean("lido").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  usuario: one(users, {
    fields: [notifications.usuarioId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

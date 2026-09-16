import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./schema";

/**
 * Novo fluxo genérico de aplicação de provas de proficiência.
 *
 * Regras de segurança:
 * - não altera nem reutiliza as tabelas históricas da UTIC;
 * - provaId referencia logicamente provas_importadas.id, validado pelo backend;
 * - cada aplicação guarda um snapshot imutável da prova usada;
 * - a criação física destas tabelas só deve ocorrer após revisão e autorização explícita.
 */
export const aplicacoesProficiencia = mysqlTable(
  "aplicacoes_proficiencia",
  {
    id: int().autoincrement().notNull().primaryKey(),
    provaId: int("prova_id").notNull(),
    provaSnapshotJson: json("prova_snapshot_json").notNull(),
    titulo: varchar({ length: 255 }).notNull(),
    agendadaPara: timestamp("agendada_para", { mode: "string" }).notNull(),
    status: mysqlEnum(["AGENDADA", "LIBERADA", "ENCERRADA", "CALCULADA", "CANCELADA"])
      .default("AGENDADA")
      .notNull(),
    liberadaEm: timestamp("liberada_em", { mode: "string" }),
    liberadaPor: int("liberada_por").references(() => users.id, { onDelete: "set null" }),
    encerradaEm: timestamp("encerrada_em", { mode: "string" }),
    calculadaEm: timestamp("calculada_em", { mode: "string" }),
    calculadaPor: int("calculada_por").references(() => users.id, { onDelete: "set null" }),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    provaIdx: index("aplicacoes_proficiencia_prova_idx").on(table.provaId),
    statusIdx: index("aplicacoes_proficiencia_status_idx").on(table.status),
    agendaIdx: index("aplicacoes_proficiencia_agenda_idx").on(table.agendadaPara),
  }),
);

export const aplicacoesProficienciaParticipantes = mysqlTable(
  "aplicacoes_proficiencia_participantes",
  {
    id: int().autoincrement().notNull().primaryKey(),
    aplicacaoId: int("aplicacao_id")
      .notNull()
      .references(() => aplicacoesProficiencia.id, { onDelete: "cascade" }),
    colaboradorId: int("colaborador_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    situacao: mysqlEnum(["SELECIONADO", "FINALIZADO", "AUSENTE"])
      .default("SELECIONADO")
      .notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    unicoIdx: uniqueIndex("aplicacoes_prof_participante_unico_idx").on(table.aplicacaoId, table.colaboradorId),
    aplicacaoIdx: index("aplicacoes_prof_participante_aplicacao_idx").on(table.aplicacaoId),
    colaboradorIdx: index("aplicacoes_prof_participante_colaborador_idx").on(table.colaboradorId),
  }),
);

export const tentativasProficiencia = mysqlTable(
  "tentativas_proficiencia",
  {
    id: int().autoincrement().notNull().primaryKey(),
    aplicacaoId: int("aplicacao_id")
      .notNull()
      .references(() => aplicacoesProficiencia.id, { onDelete: "cascade" }),
    colaboradorId: int("colaborador_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: mysqlEnum(["EM_ANDAMENTO", "BLOQUEADA", "LIBERADA_CONTINUIDADE", "FINALIZADA", "FINALIZADA_TEMPO"])
      .default("EM_ANDAMENTO")
      .notNull(),
    iniciadaEm: timestamp("iniciada_em", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    ultimaAtividadeEm: timestamp("ultima_atividade_em", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    finalizadaEm: timestamp("finalizada_em", { mode: "string" }),
    bloqueadaEm: timestamp("bloqueada_em", { mode: "string" }),
    motivoBloqueio: varchar("motivo_bloqueio", { length: 100 }),
    liberadaContinuacaoEm: timestamp("liberada_continuacao_em", { mode: "string" }),
    liberadaContinuacaoPor: int("liberada_continuacao_por").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    unicoIdx: uniqueIndex("tentativas_prof_aplicacao_colaborador_unico_idx").on(table.aplicacaoId, table.colaboradorId),
    aplicacaoIdx: index("tentativas_prof_aplicacao_idx").on(table.aplicacaoId),
    colaboradorIdx: index("tentativas_prof_colaborador_idx").on(table.colaboradorId),
    statusIdx: index("tentativas_prof_status_idx").on(table.status),
  }),
);

export const respostasProficiencia = mysqlTable(
  "respostas_proficiencia",
  {
    id: int().autoincrement().notNull().primaryKey(),
    tentativaId: int("tentativa_id")
      .notNull()
      .references(() => tentativasProficiencia.id, { onDelete: "cascade" }),
    questaoChave: varchar("questao_chave", { length: 80 }).notNull(),
    resposta: varchar({ length: 16 }).notNull(),
    respondidaEm: timestamp("respondida_em", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    unicaIdx: uniqueIndex("respostas_prof_tentativa_questao_unica_idx").on(table.tentativaId, table.questaoChave),
    tentativaIdx: index("respostas_prof_tentativa_idx").on(table.tentativaId),
  }),
);

export const resultadosProficiencia = mysqlTable(
  "resultados_proficiencia",
  {
    id: int().autoincrement().notNull().primaryKey(),
    aplicacaoId: int("aplicacao_id")
      .notNull()
      .references(() => aplicacoesProficiencia.id, { onDelete: "cascade" }),
    colaboradorId: int("colaborador_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tentativaId: int("tentativa_id")
      .notNull()
      .references(() => tentativasProficiencia.id, { onDelete: "restrict" }),
    percentualGeral: varchar("percentual_geral", { length: 20 }).notNull(),
    resultadoJson: text("resultado_json").notNull(),
    observacao: text(),
    calculadoEm: timestamp("calculado_em", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  table => ({
    unicoIdx: uniqueIndex("resultados_prof_aplicacao_colaborador_unico_idx").on(table.aplicacaoId, table.colaboradorId),
    aplicacaoIdx: index("resultados_prof_aplicacao_idx").on(table.aplicacaoId),
    colaboradorIdx: index("resultados_prof_colaborador_idx").on(table.colaboradorId),
  }),
);

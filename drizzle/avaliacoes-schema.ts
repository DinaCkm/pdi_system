import {
  AnyMySqlColumn,
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import {
  actions,
  ciclos,
  competenciasMacros,
  departamentos,
  users,
} from "./schema";

/**
 * Base de dados do modulo Avaliacoes e Evolucao.
 *
 * Regras de seguranca metodologica:
 * - conclusao de acao nao equivale a evolucao;
 * - evolucao somente pode ser calculada entre medicoes comparaveis;
 * - resultados comportamentais e tecnicos permanecem separados;
 * - o historico importado e preservado como registro, sem recriar acoes antigas como ativas.
 */

export const avaliacoes = mysqlTable(
  "avaliacoes",
  {
    id: int().autoincrement().notNull().primaryKey(),
    cicloId: int()
      .notNull()
      .references(() => ciclos.id, { onDelete: "restrict" }),
    tipo: mysqlEnum(["DESEMPENHO", "TECNICA"]).notNull(),
    titulo: varchar({ length: 255 }).notNull(),
    descricao: text(),
    dataReferencia: date("data_referencia").notNull(),
    departamentoId: int().references(() => departamentos.id, {
      onDelete: "set null",
    }),
    origem: mysqlEnum(["IMPORTACAO", "SISTEMA", "MANUAL"])
      .default("SISTEMA")
      .notNull(),
    status: mysqlEnum([
      "RASCUNHO",
      "EM_CONFERENCIA",
      "FINALIZADA",
      "CANCELADA",
    ])
      .default("RASCUNHO")
      .notNull(),
    arquivoOrigemNome: varchar("arquivo_origem_nome", { length: 255 }),
    arquivoOrigemUrl: text("arquivo_origem_url"),
    observacoes: text(),
    createdBy: int()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp({ mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    avaliacoesCicloIdx: index("avaliacoes_ciclo_idx").on(table.cicloId),
    avaliacoesTipoIdx: index("avaliacoes_tipo_idx").on(table.tipo),
    avaliacoesDepartamentoIdx: index("avaliacoes_departamento_idx").on(
      table.departamentoId,
    ),
    avaliacoesStatusIdx: index("avaliacoes_status_idx").on(table.status),
  }),
);

export const medicoesCompetencias = mysqlTable(
  "medicoes_competencias",
  {
    id: int().autoincrement().notNull().primaryKey(),
    avaliacaoId: int()
      .notNull()
      .references(() => avaliacoes.id, { onDelete: "cascade" }),
    colaboradorId: int()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    competenciaMacroId: int()
      .notNull()
      .references(() => competenciasMacros.id, { onDelete: "restrict" }),
    tipoCompetencia: mysqlEnum(["COMPORTAMENTAL", "TECNICA"]).notNull(),
    fonte: mysqlEnum(["AVALIACAO_DESEMPENHO", "AVALIACAO_TECNICA"]).notNull(),
    valor: decimal({ precision: 10, scale: 4 }).notNull(),
    escalaMin: decimal("escala_min", { precision: 10, scale: 4 }).notNull(),
    escalaMax: decimal("escala_max", { precision: 10, scale: 4 }).notNull(),
    classificacao: varchar({ length: 255 }),
    observacao: text(),
    medicaoAnteriorId: int("medicao_anterior_id").references(
      (): AnyMySqlColumn => medicoesCompetencias.id,
      { onDelete: "set null" },
    ),
    validada: boolean().default(false).notNull(),
    validadaPor: int("validada_por").references(() => users.id, {
      onDelete: "set null",
    }),
    validadaEm: timestamp("validada_em", { mode: "string" }),
    createdAt: timestamp({ mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => ({
    medicoesAvaliacaoIdx: index("medicoes_avaliacao_idx").on(table.avaliacaoId),
    medicoesColaboradorIdx: index("medicoes_colaborador_idx").on(
      table.colaboradorId,
    ),
    medicoesCompetenciaIdx: index("medicoes_competencia_idx").on(
      table.competenciaMacroId,
    ),
    medicoesColaboradorCompetenciaIdx: index(
      "medicoes_colaborador_competencia_idx",
    ).on(table.colaboradorId, table.competenciaMacroId),
    medicoesUnicaPorAvaliacaoIdx: uniqueIndex(
      "medicoes_unica_por_avaliacao_idx",
    ).on(table.avaliacaoId, table.colaboradorId, table.competenciaMacroId),
  }),
);

export const trilhaCompetencias = mysqlTable(
  "trilha_competencias",
  {
    id: int().autoincrement().notNull().primaryKey(),
    colaboradorId: int()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    cicloId: int()
      .notNull()
      .references(() => ciclos.id, { onDelete: "restrict" }),
    competenciaMacroId: int()
      .notNull()
      .references(() => competenciasMacros.id, { onDelete: "restrict" }),
    tipoCompetencia: mysqlEnum(["COMPORTAMENTAL", "TECNICA"]).notNull(),
    origemGap: mysqlEnum([
      "DISC",
      "AVALIACAO_DESEMPENHO",
      "AVALIACAO_TECNICA",
      "HISTORICO_2025",
      "OUTRO",
    ]).notNull(),
    prioridade: mysqlEnum(["ALTA", "MEDIA", "BAIXA"]),
    status: mysqlEnum([
      "PRIORIZADA",
      "EM_DESENVOLVIMENTO",
      "AGUARDANDO_NOVA_MEDICAO",
      "ENCERRADA",
    ])
      .default("PRIORIZADA")
      .notNull(),
    medicaoOrigemId: int("medicao_origem_id").references(
      () => medicoesCompetencias.id,
      { onDelete: "set null" },
    ),
    observacao: text(),
    createdAt: timestamp({ mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    trilhaColaboradorCicloIdx: index("trilha_colaborador_ciclo_idx").on(
      table.colaboradorId,
      table.cicloId,
    ),
    trilhaCompetenciaIdx: index("trilha_competencia_idx").on(
      table.competenciaMacroId,
    ),
    trilhaUnicaPorCicloIdx: uniqueIndex("trilha_unica_por_ciclo_idx").on(
      table.colaboradorId,
      table.cicloId,
      table.competenciaMacroId,
    ),
  }),
);

export const historicoDesenvolvimento = mysqlTable(
  "historico_desenvolvimento",
  {
    id: int().autoincrement().notNull().primaryKey(),
    colaboradorId: int()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    competenciaMacroId: int().references(() => competenciasMacros.id, {
      onDelete: "set null",
    }),
    tipoCompetencia: mysqlEnum(["COMPORTAMENTAL", "TECNICA"]).notNull(),
    fonte: mysqlEnum(["PLANILHA_2025", "SISTEMA_ANTERIOR", "OUTRA"])
      .notNull(),
    identificadorExterno: varchar("identificador_externo", { length: 255 }),
    tituloAcao: varchar("titulo_acao", { length: 500 }).notNull(),
    descricaoAcao: text("descricao_acao"),
    statusOriginal: varchar("status_original", { length: 100 }),
    dataInicio: date("data_inicio"),
    dataFim: date("data_fim"),
    concluida: boolean().default(false).notNull(),
    transferidaParaPdiAtual: boolean("transferida_para_pdi_atual")
      .default(false)
      .notNull(),
    actionAtualId: int("action_atual_id").references(() => actions.id, {
      onDelete: "set null",
    }),
    dadosOriginais: text("dados_originais"),
    createdAt: timestamp({ mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => ({
    historicoColaboradorIdx: index("historico_colaborador_idx").on(
      table.colaboradorId,
    ),
    historicoCompetenciaIdx: index("historico_competencia_idx").on(
      table.competenciaMacroId,
    ),
    historicoFonteIdx: index("historico_fonte_idx").on(table.fonte),
  }),
);

import {
  boolean,
  date,
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
import { departamentos, users } from "./schema";

/**
 * Estrutura-base do Motor Comportamental B.E.M.
 *
 * Esta camada e aditiva e nao substitui as tabelas atuais de competencias,
 * avaliacoes, trilhas ou PDIs.
 *
 * Regras estruturais:
 * - o sistema continua mono-organizacao na operacao atual;
 * - organizacoes prepara a evolucao futura para multiplas organizacoes;
 * - a metodologia CKM e global e independente da organizacao;
 * - competencias organizacionais sao versionaveis por organizacao;
 * - ESSENCIAL_FUNCAO nao se confunde com a familia ESSENCIAL da metodologia B.E.M.;
 * - competencias emergentes nunca entram automaticamente no catalogo oficial;
 * - nenhuma relacao organizacional x B.E.M. representa equivalencia direta;
 * - cargo cadastrado em users continua sendo preservado como dado historico/operacional;
 * - funcao organizacional e uma camada metodologica adicional; a carga inicial pode partir do cargo padronizado e depois ser refinada pela funcao real.
 */

export const organizacoes = mysqlTable(
  "organizacoes",
  {
    id: int().autoincrement().notNull().primaryKey(),
    nome: varchar({ length: 255 }).notNull(),
    nomeFantasia: varchar("nome_fantasia", { length: 255 }),
    codigo: varchar({ length: 100 }).notNull(),
    ativa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    organizacoesCodigoUq: uniqueIndex("organizacoes_codigo_uq").on(table.codigo),
    organizacoesAtivaIdx: index("organizacoes_ativa_idx").on(table.ativa),
  }),
);

export const funcoesOrganizacionais = mysqlTable(
  "funcoes_organizacionais",
  {
    id: int().autoincrement().notNull().primaryKey(),
    organizacaoId: int("organizacao_id")
      .notNull()
      .references(() => organizacoes.id, { onDelete: "restrict" }),
    departamentoId: int("departamento_id").references(() => departamentos.id, {
      onDelete: "set null",
    }),
    nome: varchar({ length: 255 }).notNull(),
    codigo: varchar({ length: 100 }),
    cargoReferencia: varchar("cargo_referencia", { length: 255 }),
    descricao: text(),
    origem: mysqlEnum(["VALIDACAO_ADMIN", "QUESTIONARIO", "IMPORTACAO", "OUTRA"])
      .default("VALIDACAO_ADMIN")
      .notNull(),
    versao: int().default(1).notNull(),
    vigenciaInicio: date("vigencia_inicio"),
    vigenciaFim: date("vigencia_fim"),
    ativa: boolean().default(true).notNull(),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    funcaoOrgOrganizacaoIdx: index("funcao_org_organizacao_idx").on(table.organizacaoId),
    funcaoOrgDeptIdx: index("funcao_org_dept_idx").on(table.departamentoId),
    funcaoOrgAtivaIdx: index("funcao_org_ativa_idx").on(table.ativa),
    funcaoOrgNomeVersaoUq: uniqueIndex("funcao_org_nome_versao_uq").on(
      table.organizacaoId,
      table.departamentoId,
      table.nome,
      table.versao,
    ),
  }),
);

export const usuariosFuncoesOrganizacionais = mysqlTable(
  "usuarios_funcoes_organizacionais",
  {
    id: int().autoincrement().notNull().primaryKey(),
    usuarioId: int("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    funcaoOrganizacionalId: int("funcao_organizacional_id")
      .notNull()
      .references(() => funcoesOrganizacionais.id, { onDelete: "restrict" }),
    tipoVinculo: mysqlEnum("tipo_vinculo", ["PRINCIPAL", "SECUNDARIA", "TEMPORARIA"])
      .default("PRINCIPAL")
      .notNull(),
    origem: mysqlEnum(["VALIDACAO_ADMIN", "QUESTIONARIO", "IMPORTACAO", "OUTRA"])
      .default("VALIDACAO_ADMIN")
      .notNull(),
    vigenciaInicio: date("vigencia_inicio"),
    vigenciaFim: date("vigencia_fim"),
    ativo: boolean().default(true).notNull(),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    usuarioFuncaoUsuarioIdx: index("usuario_funcao_usuario_idx").on(table.usuarioId),
    usuarioFuncaoFuncaoIdx: index("usuario_funcao_funcao_idx").on(table.funcaoOrganizacionalId),
    usuarioFuncaoAtivoIdx: index("usuario_funcao_ativo_idx").on(table.ativo),
    usuarioFuncaoUq: uniqueIndex("usuario_funcao_uq").on(
      table.usuarioId,
      table.funcaoOrganizacionalId,
      table.tipoVinculo,
      table.vigenciaInicio,
    ),
  }),
);

export const metodologiaCompetencias = mysqlTable(
  "metodologia_competencias",
  {
    id: int().autoincrement().notNull().primaryKey(),
    nome: varchar({ length: 255 }).notNull(),
    familia: mysqlEnum(["BASICA", "ESSENCIAL", "MASTER", "JORNADA_FUTURO"]).notNull(),
    descricao: text(),
    comportamentosObservaveis: text("comportamentos_observaveis"),
    versao: int().default(1).notNull(),
    vigenciaInicio: date("vigencia_inicio"),
    vigenciaFim: date("vigencia_fim"),
    ativa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    metodologiaNomeVersaoUq: uniqueIndex("metodologia_nome_versao_uq").on(
      table.nome,
      table.versao,
    ),
    metodologiaFamiliaIdx: index("metodologia_familia_idx").on(table.familia),
    metodologiaAtivaIdx: index("metodologia_ativa_idx").on(table.ativa),
  }),
);

export const competenciasOrganizacionais = mysqlTable(
  "competencias_organizacionais",
  {
    id: int().autoincrement().notNull().primaryKey(),
    organizacaoId: int("organizacao_id")
      .notNull()
      .references(() => organizacoes.id, { onDelete: "restrict" }),
    nome: varchar({ length: 255 }).notNull(),
    descricao: text(),
    versao: int().default(1).notNull(),
    vigenciaInicio: date("vigencia_inicio"),
    vigenciaFim: date("vigencia_fim"),
    ativa: boolean().default(true).notNull(),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    competenciaOrgNomeVersaoUq: uniqueIndex("competencia_org_nome_versao_uq").on(
      table.organizacaoId,
      table.nome,
      table.versao,
    ),
    competenciaOrgOrganizacaoIdx: index("competencia_org_organizacao_idx").on(
      table.organizacaoId,
    ),
    competenciaOrgAtivaIdx: index("competencia_org_ativa_idx").on(table.ativa),
  }),
);

export const competenciasOrganizacionaisComportamentos = mysqlTable(
  "competencias_organizacionais_comportamentos",
  {
    id: int().autoincrement().notNull().primaryKey(),
    competenciaOrganizacionalId: int("competencia_organizacional_id")
      .notNull()
      .references(() => competenciasOrganizacionais.id, { onDelete: "cascade" }),
    descricao: text().notNull(),
    ordem: int().default(0).notNull(),
    ativo: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    comportamentoCompetenciaIdx: index("comportamento_competencia_idx").on(
      table.competenciaOrganizacionalId,
    ),
    comportamentoAtivoIdx: index("comportamento_ativo_idx").on(table.ativo),
  }),
);

export const competenciaOrganizacionalBem = mysqlTable(
  "competencia_organizacional_bem",
  {
    id: int().autoincrement().notNull().primaryKey(),
    competenciaOrganizacionalId: int("competencia_organizacional_id")
      .notNull()
      .references(() => competenciasOrganizacionais.id, { onDelete: "cascade" }),
    comportamentoOrganizacionalId: int("comportamento_organizacional_id").references(
      () => competenciasOrganizacionaisComportamentos.id,
      { onDelete: "set null" },
    ),
    metodologiaCompetenciaId: int("metodologia_competencia_id")
      .notNull()
      .references(() => metodologiaCompetencias.id, { onDelete: "restrict" }),
    tipoRelacao: mysqlEnum(["SUSTENTA", "FAVORECE", "COMPLEMENTAR"]).notNull(),
    relevancia: mysqlEnum(["PRINCIPAL", "SECUNDARIA"]).default("PRINCIPAL").notNull(),
    justificativa: text(),
    versao: int().default(1).notNull(),
    ativa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    compOrgBemCompetenciaIdx: index("comp_org_bem_competencia_idx").on(
      table.competenciaOrganizacionalId,
    ),
    compOrgBemMetodologiaIdx: index("comp_org_bem_metodologia_idx").on(
      table.metodologiaCompetenciaId,
    ),
    compOrgBemUq: uniqueIndex("comp_org_bem_uq").on(
      table.competenciaOrganizacionalId,
      table.metodologiaCompetenciaId,
      table.versao,
    ),
  }),
);

export const competenciasRequeridasFuncao = mysqlTable(
  "competencias_requeridas_funcao",
  {
    id: int().autoincrement().notNull().primaryKey(),
    organizacaoId: int("organizacao_id")
      .notNull()
      .references(() => organizacoes.id, { onDelete: "restrict" }),
    departamentoId: int("departamento_id").references(() => departamentos.id, {
      onDelete: "set null",
    }),
    funcaoOrganizacionalId: int("funcao_organizacional_id").references(
      () => funcoesOrganizacionais.id,
      { onDelete: "set null" },
    ),
    cargoFuncao: varchar("cargo_funcao", { length: 255 }).notNull(),
    competenciaOrganizacionalId: int("competencia_organizacional_id")
      .notNull()
      .references(() => competenciasOrganizacionais.id, { onDelete: "restrict" }),
    classificacaoFuncao: mysqlEnum(["ESSENCIAL_FUNCAO", "TRANSVERSAL_FUNCAO"]).notNull(),
    origem: mysqlEnum(["QUESTIONARIO", "VALIDACAO_ADMIN", "OUTRA"]).notNull(),
    justificativa: text(),
    nivelResponsabilidade: mysqlEnum([
      "EXECUTA_COM_ORIENTACAO",
      "EXECUTA_COM_AUTONOMIA",
      "ANALISA_RECOMENDA",
      "DECIDE",
      "COORDENA",
      "RESPONDE_PELO_RESULTADO",
    ]),
    validada: boolean().default(false).notNull(),
    validadaPor: int("validada_por").references(() => users.id, { onDelete: "set null" }),
    validadaEm: timestamp("validada_em", { mode: "string" }),
    versao: int().default(1).notNull(),
    vigenciaInicio: date("vigencia_inicio"),
    vigenciaFim: date("vigencia_fim"),
    ativa: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    compReqFuncaoOrgIdx: index("comp_req_funcao_org_idx").on(table.organizacaoId),
    compReqFuncaoDeptIdx: index("comp_req_funcao_dept_idx").on(table.departamentoId),
    compReqFuncaoEstruturadaIdx: index("comp_req_funcao_estruturada_idx").on(
      table.funcaoOrganizacionalId,
    ),
    compReqFuncaoCompIdx: index("comp_req_funcao_comp_idx").on(
      table.competenciaOrganizacionalId,
    ),
    compReqFuncaoUq: uniqueIndex("comp_req_funcao_uq").on(
      table.organizacaoId,
      table.departamentoId,
      table.cargoFuncao,
      table.competenciaOrganizacionalId,
      table.versao,
    ),
  }),
);

export const competenciasEmergentes = mysqlTable(
  "competencias_emergentes",
  {
    id: int().autoincrement().notNull().primaryKey(),
    organizacaoId: int("organizacao_id")
      .notNull()
      .references(() => organizacoes.id, { onDelete: "restrict" }),
    departamentoId: int("departamento_id").references(() => departamentos.id, {
      onDelete: "set null",
    }),
    funcaoOrganizacionalId: int("funcao_organizacional_id").references(
      () => funcoesOrganizacionais.id,
      { onDelete: "set null" },
    ),
    colaboradorId: int("colaborador_id").references(() => users.id, {
      onDelete: "set null",
    }),
    cargoFuncao: varchar("cargo_funcao", { length: 255 }),
    atividadeOrigem: text("atividade_origem"),
    nomeSugerido: varchar("nome_sugerido", { length: 255 }).notNull(),
    descricao: text(),
    justificativa: text(),
    competenciaOrganizacionalRelacionadaId: int(
      "competencia_organizacional_relacionada_id",
    ).references(() => competenciasOrganizacionais.id, { onDelete: "set null" }),
    status: mysqlEnum([
      "AGUARDANDO_ANALISE",
      "RELACIONADA_EXISTENTE",
      "CRIADA_NOVA_COMPETENCIA",
      "COMPLEMENTAR",
      "DESCARTADA",
    ])
      .default("AGUARDANDO_ANALISE")
      .notNull(),
    decisao: text(),
    analisadaPor: int("analisada_por").references(() => users.id, { onDelete: "set null" }),
    analisadaEm: timestamp("analisada_em", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  table => ({
    compEmergOrgIdx: index("comp_emerg_org_idx").on(table.organizacaoId),
    compEmergDeptIdx: index("comp_emerg_dept_idx").on(table.departamentoId),
    compEmergFuncaoIdx: index("comp_emerg_funcao_idx").on(table.funcaoOrganizacionalId),
    compEmergColabIdx: index("comp_emerg_colab_idx").on(table.colaboradorId),
    compEmergStatusIdx: index("comp_emerg_status_idx").on(table.status),
  }),
);

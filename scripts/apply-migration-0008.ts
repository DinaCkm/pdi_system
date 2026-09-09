import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL nao configurada");
}

const expectedTables = [
  "avaliacoes",
  "medicoes_competencias",
  "trilha_competencias",
  "historico_desenvolvimento",
];

const statements = [
  `CREATE TABLE IF NOT EXISTS \`avaliacoes\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`cicloId\` int NOT NULL,
    \`tipo\` enum('DESEMPENHO','TECNICA') NOT NULL,
    \`titulo\` varchar(255) NOT NULL,
    \`descricao\` text,
    \`data_referencia\` date NOT NULL,
    \`departamentoId\` int,
    \`origem\` enum('IMPORTACAO','SISTEMA','MANUAL') NOT NULL DEFAULT 'SISTEMA',
    \`status\` enum('RASCUNHO','EM_CONFERENCIA','FINALIZADA','CANCELADA') NOT NULL DEFAULT 'RASCUNHO',
    \`arquivo_origem_nome\` varchar(255),
    \`arquivo_origem_url\` text,
    \`observacoes\` text,
    \`createdBy\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`avaliacoes_ciclo_idx\` (\`cicloId\`),
    KEY \`avaliacoes_tipo_idx\` (\`tipo\`),
    KEY \`avaliacoes_departamento_idx\` (\`departamentoId\`),
    KEY \`avaliacoes_status_idx\` (\`status\`),
    CONSTRAINT \`avaliacoes_ciclo_fk\` FOREIGN KEY (\`cicloId\`) REFERENCES \`ciclos\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`avaliacoes_departamento_fk\` FOREIGN KEY (\`departamentoId\`) REFERENCES \`departamentos\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`avaliacoes_created_by_fk\` FOREIGN KEY (\`createdBy\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS \`medicoes_competencias\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`avaliacaoId\` int NOT NULL,
    \`colaboradorId\` int NOT NULL,
    \`competenciaMacroId\` int NOT NULL,
    \`tipoCompetencia\` enum('COMPORTAMENTAL','TECNICA') NOT NULL,
    \`fonte\` enum('AVALIACAO_DESEMPENHO','AVALIACAO_TECNICA') NOT NULL,
    \`valor\` decimal(10,4) NOT NULL,
    \`escala_min\` decimal(10,4) NOT NULL,
    \`escala_max\` decimal(10,4) NOT NULL,
    \`classificacao\` varchar(255),
    \`observacao\` text,
    \`medicao_anterior_id\` int,
    \`validada\` boolean NOT NULL DEFAULT false,
    \`validada_por\` int,
    \`validada_em\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`medicoes_unica_por_avaliacao_idx\` (\`avaliacaoId\`,\`colaboradorId\`,\`competenciaMacroId\`),
    KEY \`medicoes_avaliacao_idx\` (\`avaliacaoId\`),
    KEY \`medicoes_colaborador_idx\` (\`colaboradorId\`),
    KEY \`medicoes_competencia_idx\` (\`competenciaMacroId\`),
    KEY \`medicoes_colaborador_competencia_idx\` (\`colaboradorId\`,\`competenciaMacroId\`),
    KEY \`medicoes_anterior_idx\` (\`medicao_anterior_id\`),
    KEY \`medicoes_validada_por_idx\` (\`validada_por\`),
    CONSTRAINT \`medicoes_avaliacao_fk\` FOREIGN KEY (\`avaliacaoId\`) REFERENCES \`avaliacoes\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`medicoes_colaborador_fk\` FOREIGN KEY (\`colaboradorId\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`medicoes_competencia_fk\` FOREIGN KEY (\`competenciaMacroId\`) REFERENCES \`competencias_macros\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`medicoes_anterior_fk\` FOREIGN KEY (\`medicao_anterior_id\`) REFERENCES \`medicoes_competencias\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`medicoes_validada_por_fk\` FOREIGN KEY (\`validada_por\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS \`trilha_competencias\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`colaboradorId\` int NOT NULL,
    \`cicloId\` int NOT NULL,
    \`competenciaMacroId\` int NOT NULL,
    \`tipoCompetencia\` enum('COMPORTAMENTAL','TECNICA') NOT NULL,
    \`origemGap\` enum('DISC','AVALIACAO_DESEMPENHO','AVALIACAO_TECNICA','HISTORICO_2025','OUTRO') NOT NULL,
    \`prioridade\` enum('ALTA','MEDIA','BAIXA'),
    \`status\` enum('PRIORIZADA','EM_DESENVOLVIMENTO','AGUARDANDO_NOVA_MEDICAO','ENCERRADA') NOT NULL DEFAULT 'PRIORIZADA',
    \`medicao_origem_id\` int,
    \`observacao\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`trilha_unica_por_ciclo_idx\` (\`colaboradorId\`,\`cicloId\`,\`competenciaMacroId\`),
    KEY \`trilha_colaborador_ciclo_idx\` (\`colaboradorId\`,\`cicloId\`),
    KEY \`trilha_competencia_idx\` (\`competenciaMacroId\`),
    KEY \`trilha_ciclo_idx\` (\`cicloId\`),
    KEY \`trilha_medicao_origem_idx\` (\`medicao_origem_id\`),
    CONSTRAINT \`trilha_colaborador_fk\` FOREIGN KEY (\`colaboradorId\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`trilha_ciclo_fk\` FOREIGN KEY (\`cicloId\`) REFERENCES \`ciclos\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`trilha_competencia_fk\` FOREIGN KEY (\`competenciaMacroId\`) REFERENCES \`competencias_macros\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`trilha_medicao_origem_fk\` FOREIGN KEY (\`medicao_origem_id\`) REFERENCES \`medicoes_competencias\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS \`historico_desenvolvimento\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`colaboradorId\` int NOT NULL,
    \`competenciaMacroId\` int,
    \`tipoCompetencia\` enum('COMPORTAMENTAL','TECNICA') NOT NULL,
    \`fonte\` enum('PLANILHA_2025','SISTEMA_ANTERIOR','OUTRA') NOT NULL,
    \`identificador_externo\` varchar(255),
    \`titulo_acao\` varchar(500) NOT NULL,
    \`descricao_acao\` text,
    \`status_original\` varchar(100),
    \`data_inicio\` date,
    \`data_fim\` date,
    \`concluida\` boolean NOT NULL DEFAULT false,
    \`transferida_para_pdi_atual\` boolean NOT NULL DEFAULT false,
    \`action_atual_id\` int,
    \`dados_originais\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`historico_colaborador_idx\` (\`colaboradorId\`),
    KEY \`historico_competencia_idx\` (\`competenciaMacroId\`),
    KEY \`historico_fonte_idx\` (\`fonte\`),
    KEY \`historico_action_atual_idx\` (\`action_atual_id\`),
    CONSTRAINT \`historico_colaborador_fk\` FOREIGN KEY (\`colaboradorId\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
    CONSTRAINT \`historico_competencia_fk\` FOREIGN KEY (\`competenciaMacroId\`) REFERENCES \`competencias_macros\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`historico_action_atual_fk\` FOREIGN KEY (\`action_atual_id\`) REFERENCES \`actions\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
];

const connection = await mysql.createConnection(databaseUrl);

try {
  console.log("[Migration 0008] Iniciando migracao controlada...");
  for (const statement of statements) {
    await connection.execute(statement);
  }

  const placeholders = expectedTables.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME`,
    expectedTables,
  );

  const found = (rows as Array<{ TABLE_NAME: string }>).map(row => row.TABLE_NAME);
  const missing = expectedTables.filter(table => !found.includes(table));
  if (missing.length > 0) {
    throw new Error(`Migracao incompleta. Tabelas ausentes: ${missing.join(", ")}`);
  }

  console.log(`[Migration 0008] OK. Tabelas validadas: ${found.join(", ")}`);
} finally {
  await connection.end();
}

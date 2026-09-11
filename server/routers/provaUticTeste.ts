import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/customTrpc";
import { generateTemporaryPassword, hashPassword } from "../_core/password";

const NOME_BASE = "Daniel Caio Lemos Penno";
const NOME_TESTE = `${NOME_BASE} [TESTE UTIC]`;
const EMAIL_TESTE = "teste.utic@ckmtalents.net";
const OPEN_ID_TESTE = "local_teste_utic_daniel";
const STUDENT_ID_TESTE = "TESTE-UTIC-DANIEL";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function insertIdOf(result: any): number {
  const info: any = Array.isArray(result) ? result[0] : result;
  return Number(info?.insertId ?? 0);
}

type UsuarioBase = {
  id: number;
  name: string | null;
  cargo: string;
  departamentoId: number | null;
  leaderId: number | null;
  viuNormasVersao: number | null;
};

type PdiBase = {
  id: number;
  cicloId: number;
  titulo: string;
  objetivoGeral: string | null;
  relatorioAnalise: string | null;
  relatorioArquivoUrl: string | null;
  relatorioArquivoNome: string | null;
  relatorioArquivoKey: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
};

type ActionBase = {
  id: number;
  pdiId: number;
  macroId: number;
  microcompetencia: string | null;
  titulo: string;
  descricao: string | null;
  prazo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type MedicaoBase = {
  id: number;
  avaliacaoId: number;
  competenciaMacroId: number;
  tipoCompetencia: string;
  fonte: string;
  valor: string | number;
  escalaMin: string | number;
  escalaMax: string | number;
  classificacao: string | null;
  observacao: string | null;
  medicaoAnteriorId: number | null;
  validada: number | boolean;
  validadaPor: number | null;
  validadaEm: string | null;
  createdAt: string;
};

type TrilhaBase = {
  id: number;
  cicloId: number;
  competenciaMacroId: number;
  tipoCompetencia: string;
  origemGap: string;
  prioridade: string | null;
  status: string;
  medicaoOrigemId: number | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
};

type HistoricoBase = {
  competenciaMacroId: number | null;
  tipoCompetencia: string;
  fonte: string;
  identificadorExterno: string | null;
  tituloAcao: string;
  descricaoAcao: string | null;
  statusOriginal: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  concluida: number | boolean;
  transferidaParaPdiAtual: number | boolean;
  actionAtualId: number | null;
  dadosOriginais: string | null;
  createdAt: string;
};

async function limparTentativasDeTeste(db: any, usuarioId: number) {
  // Exclusivo para a conta fake administrada por este endpoint.
  // As respostas e eventos são removidos por ON DELETE CASCADE.
  try {
    await db.execute(sql`DELETE FROM prova_utic_tentativas WHERE colaborador_id = ${usuarioId}`);
  } catch {
    // Na primeira utilização, a tabela ainda pode não ter sido criada pelo router da prova.
  }
}

async function contar(db: any, tabela: "pdis" | "medicoes_competencias" | "trilha_competencias" | "historico_desenvolvimento", usuarioId: number) {
  const coluna = tabela === "pdis" ? sql.raw("colaboradorId") : sql.raw("colaboradorId");
  const result = await db.execute(sql`SELECT COUNT(*) AS total FROM ${sql.raw(tabela)} WHERE ${coluna} = ${usuarioId}`);
  return Number(rowsOf<{ total: number | string }>(result)[0]?.total ?? 0);
}

async function espelharDadosDesenvolvimento(db: any, origemId: number, usuarioId: number) {
  const resumo = {
    papeisUnidade: 0,
    pdis: 0,
    acoes: 0,
    medicoes: 0,
    trilhas: 0,
    historicos: 0,
    jaExistia: false,
  };

  // O espelhamento é criado uma única vez para não duplicar registros a cada troca de senha.
  const [pdisExistentes, medicoesExistentes, trilhasExistentes, historicosExistentes] = await Promise.all([
    contar(db, "pdis", usuarioId),
    contar(db, "medicoes_competencias", usuarioId).catch(() => 0),
    contar(db, "trilha_competencias", usuarioId).catch(() => 0),
    contar(db, "historico_desenvolvimento", usuarioId).catch(() => 0),
  ]);

  if (pdisExistentes || medicoesExistentes || trilhasExistentes || historicosExistentes) {
    resumo.jaExistia = true;
    resumo.pdis = pdisExistentes;
    resumo.medicoes = medicoesExistentes;
    resumo.trilhas = trilhasExistentes;
    resumo.historicos = historicosExistentes;
    const acoesResult = await db.execute(sql`
      SELECT COUNT(*) AS total
        FROM actions a
        JOIN pdis p ON p.id = a.pdiId
       WHERE p.colaboradorId = ${usuarioId}
    `);
    resumo.acoes = Number(rowsOf<{ total: number | string }>(acoesResult)[0]?.total ?? 0);
    return resumo;
  }

  // Mesmas associações de unidade/departamento do empregado-base.
  try {
    const rolesResult = await db.execute(sql`
      SELECT departmentId, assignmentType, leaderUserId, status, createdAt, updatedAt
        FROM user_department_roles
       WHERE userId = ${origemId}
    `);
    for (const role of rowsOf<any>(rolesResult)) {
      await db.execute(sql`
        INSERT INTO user_department_roles (
          userId, departmentId, assignmentType, leaderUserId, status, createdAt, updatedAt
        ) VALUES (
          ${usuarioId}, ${role.departmentId}, ${role.assignmentType}, ${role.leaderUserId ?? null},
          ${role.status}, ${role.createdAt}, ${role.updatedAt}
        )
      `);
      resumo.papeisUnidade += 1;
    }
  } catch {
    // Compatibilidade com bases em que a tabela de papéis departamentais ainda não existe.
  }

  const pdiMap = new Map<number, number>();
  const actionMap = new Map<number, number>();

  const pdisResult = await db.execute(sql`
    SELECT id, cicloId, titulo, objetivoGeral, relatorioAnalise,
           relatorioArquivoUrl, relatorioArquivoNome, relatorioArquivoKey,
           status, createdAt, updatedAt, createdBy
      FROM pdis
     WHERE colaboradorId = ${origemId}
     ORDER BY id ASC
  `);

  for (const pdi of rowsOf<PdiBase>(pdisResult)) {
    const insertPdi = await db.execute(sql`
      INSERT INTO pdis (
        colaboradorId, cicloId, titulo, objetivoGeral, relatorioAnalise,
        relatorioArquivoUrl, relatorioArquivoNome, relatorioArquivoKey,
        status, createdAt, updatedAt, createdBy
      ) VALUES (
        ${usuarioId}, ${pdi.cicloId}, ${pdi.titulo}, ${pdi.objetivoGeral}, ${pdi.relatorioAnalise},
        ${pdi.relatorioArquivoUrl}, ${pdi.relatorioArquivoNome}, ${pdi.relatorioArquivoKey},
        ${pdi.status}, ${pdi.createdAt}, ${pdi.updatedAt}, ${pdi.createdBy}
      )
    `);
    const novoPdiId = insertIdOf(insertPdi);
    if (!novoPdiId) continue;
    pdiMap.set(Number(pdi.id), novoPdiId);
    resumo.pdis += 1;

    const actionsResult = await db.execute(sql`
      SELECT id, pdiId, macroId, microcompetencia, titulo, descricao, prazo, status, createdAt, updatedAt
        FROM actions
       WHERE pdiId = ${pdi.id}
       ORDER BY id ASC
    `);
    for (const action of rowsOf<ActionBase>(actionsResult)) {
      const insertAction = await db.execute(sql`
        INSERT INTO actions (
          pdiId, macroId, microcompetencia, titulo, descricao, prazo, status, createdAt, updatedAt
        ) VALUES (
          ${novoPdiId}, ${action.macroId}, ${action.microcompetencia}, ${action.titulo},
          ${action.descricao}, ${action.prazo}, ${action.status}, ${action.createdAt}, ${action.updatedAt}
        )
      `);
      const novaActionId = insertIdOf(insertAction);
      if (novaActionId) {
        actionMap.set(Number(action.id), novaActionId);
        resumo.acoes += 1;
      }
    }

    try {
      const validacoesResult = await db.execute(sql`
        SELECT liderId, aprovadoEm, justificativa, createdAt
          FROM pdi_validacoes
         WHERE pdiId = ${pdi.id}
      `);
      for (const validacao of rowsOf<any>(validacoesResult)) {
        await db.execute(sql`
          INSERT INTO pdi_validacoes (pdiId, liderId, aprovadoEm, justificativa, createdAt)
          VALUES (${novoPdiId}, ${validacao.liderId}, ${validacao.aprovadoEm}, ${validacao.justificativa}, ${validacao.createdAt})
        `);
      }
    } catch {
      // Tabela opcional em versões anteriores.
    }
  }

  const medicaoMap = new Map<number, number>();
  try {
    const medicoesResult = await db.execute(sql`
      SELECT id, avaliacaoId, competenciaMacroId, tipoCompetencia, fonte, valor,
             escala_min AS escalaMin, escala_max AS escalaMax, classificacao, observacao,
             medicao_anterior_id AS medicaoAnteriorId, validada,
             validada_por AS validadaPor, validada_em AS validadaEm, createdAt
        FROM medicoes_competencias
       WHERE colaboradorId = ${origemId}
       ORDER BY id ASC
    `);
    const medicoes = rowsOf<MedicaoBase>(medicoesResult);
    for (const medicao of medicoes) {
      const insertMedicao = await db.execute(sql`
        INSERT INTO medicoes_competencias (
          avaliacaoId, colaboradorId, competenciaMacroId, tipoCompetencia, fonte,
          valor, escala_min, escala_max, classificacao, observacao,
          medicao_anterior_id, validada, validada_por, validada_em, createdAt
        ) VALUES (
          ${medicao.avaliacaoId}, ${usuarioId}, ${medicao.competenciaMacroId}, ${medicao.tipoCompetencia}, ${medicao.fonte},
          ${medicao.valor}, ${medicao.escalaMin}, ${medicao.escalaMax}, ${medicao.classificacao}, ${medicao.observacao},
          NULL, ${Boolean(medicao.validada)}, ${medicao.validadaPor}, ${medicao.validadaEm}, ${medicao.createdAt}
        )
      `);
      const novaMedicaoId = insertIdOf(insertMedicao);
      if (novaMedicaoId) {
        medicaoMap.set(Number(medicao.id), novaMedicaoId);
        resumo.medicoes += 1;
      }
    }
    for (const medicao of medicoes) {
      if (!medicao.medicaoAnteriorId) continue;
      const novaMedicaoId = medicaoMap.get(Number(medicao.id));
      const novaAnteriorId = medicaoMap.get(Number(medicao.medicaoAnteriorId));
      if (novaMedicaoId && novaAnteriorId) {
        await db.execute(sql`
          UPDATE medicoes_competencias
             SET medicao_anterior_id = ${novaAnteriorId}
           WHERE id = ${novaMedicaoId}
        `);
      }
    }
  } catch {
    // O espelhamento do PDI continua válido mesmo se o módulo de avaliações ainda não tiver medições estruturadas do empregado-base.
  }

  try {
    const trilhasResult = await db.execute(sql`
      SELECT id, cicloId, competenciaMacroId, tipoCompetencia, origemGap, prioridade,
             status, medicao_origem_id AS medicaoOrigemId, observacao, createdAt, updatedAt
        FROM trilha_competencias
       WHERE colaboradorId = ${origemId}
       ORDER BY id ASC
    `);
    for (const trilha of rowsOf<TrilhaBase>(trilhasResult)) {
      const medicaoOrigemEspelhada = trilha.medicaoOrigemId
        ? medicaoMap.get(Number(trilha.medicaoOrigemId)) ?? null
        : null;
      await db.execute(sql`
        INSERT INTO trilha_competencias (
          colaboradorId, cicloId, competenciaMacroId, tipoCompetencia, origemGap,
          prioridade, status, medicao_origem_id, observacao, createdAt, updatedAt
        ) VALUES (
          ${usuarioId}, ${trilha.cicloId}, ${trilha.competenciaMacroId}, ${trilha.tipoCompetencia}, ${trilha.origemGap},
          ${trilha.prioridade}, ${trilha.status}, ${medicaoOrigemEspelhada}, ${trilha.observacao}, ${trilha.createdAt}, ${trilha.updatedAt}
        )
      `);
      resumo.trilhas += 1;
    }
  } catch {
    // Compatibilidade com instalações anteriores ao módulo de evolução.
  }

  try {
    const historicosResult = await db.execute(sql`
      SELECT competenciaMacroId, tipoCompetencia, fonte, identificador_externo AS identificadorExterno,
             titulo_acao AS tituloAcao, descricao_acao AS descricaoAcao, status_original AS statusOriginal,
             data_inicio AS dataInicio, data_fim AS dataFim, concluida,
             transferida_para_pdi_atual AS transferidaParaPdiAtual,
             action_atual_id AS actionAtualId, dados_originais AS dadosOriginais, createdAt
        FROM historico_desenvolvimento
       WHERE colaboradorId = ${origemId}
       ORDER BY id ASC
    `);
    for (const historico of rowsOf<HistoricoBase>(historicosResult)) {
      const actionEspelhada = historico.actionAtualId
        ? actionMap.get(Number(historico.actionAtualId)) ?? null
        : null;
      await db.execute(sql`
        INSERT INTO historico_desenvolvimento (
          colaboradorId, competenciaMacroId, tipoCompetencia, fonte, identificador_externo,
          titulo_acao, descricao_acao, status_original, data_inicio, data_fim,
          concluida, transferida_para_pdi_atual, action_atual_id, dados_originais, createdAt
        ) VALUES (
          ${usuarioId}, ${historico.competenciaMacroId}, ${historico.tipoCompetencia}, ${historico.fonte}, ${historico.identificadorExterno},
          ${historico.tituloAcao}, ${historico.descricaoAcao}, ${historico.statusOriginal}, ${historico.dataInicio}, ${historico.dataFim},
          ${Boolean(historico.concluida)}, ${Boolean(historico.transferidaParaPdiAtual)}, ${actionEspelhada}, ${historico.dadosOriginais}, ${historico.createdAt}
        )
      `);
      resumo.historicos += 1;
    }
  } catch {
    // Compatibilidade com instalações anteriores ao histórico estruturado.
  }

  return resumo;
}

export const provaUticTesteRouter = router({
  prepararParticipante: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Banco de dados indisponível.",
      });
    }

    const origemResult = await db.execute(sql`
      SELECT id, name, cargo,
             departamentoId AS departamentoId,
             leaderId AS leaderId,
             viuNormasVersao AS viuNormasVersao
        FROM users
       WHERE name = ${NOME_BASE}
         AND status = 'ativo'
       ORDER BY id ASC
       LIMIT 1
    `);

    const origem = rowsOf<UsuarioBase>(origemResult)[0];
    if (!origem) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Não localizei o empregado-base ${NOME_BASE} entre os usuários ativos.`,
      });
    }

    const senhaTemporaria = generateTemporaryPassword(12);
    const passwordHash = hashPassword(senhaTemporaria);

    const existenteResult = await db.execute(sql`
      SELECT id
        FROM users
       WHERE email = ${EMAIL_TESTE}
          OR openId = ${OPEN_ID_TESTE}
       ORDER BY id ASC
       LIMIT 1
    `);
    const existente = rowsOf<{ id: number }>(existenteResult)[0];

    let usuarioId: number;
    let criadoAgora = false;

    if (existente) {
      usuarioId = Number(existente.id);
      await db.execute(sql`
        UPDATE users
           SET openId = ${OPEN_ID_TESTE},
               name = ${NOME_TESTE},
               email = ${EMAIL_TESTE},
               loginMethod = 'password',
               passwordHash = ${passwordHash},
               passwordUpdatedAt = NOW(),
               mustChangePassword = 0,
               authTokenVersion = authTokenVersion + 1,
               failedLoginAttempts = 0,
               lastFailedLoginAt = NULL,
               loginBlockedUntil = NULL,
               role = 'colaborador',
               cpf = NULL,
               studentId = ${STUDENT_ID_TESTE},
               cargo = ${origem.cargo},
               leaderId = ${origem.leaderId},
               status = 'ativo',
               departamentoId = ${origem.departamentoId},
               viuNormasVersao = ${Number(origem.viuNormasVersao ?? 0)},
               updatedAt = NOW()
         WHERE id = ${usuarioId}
      `);
      await limparTentativasDeTeste(db, usuarioId);
    } else {
      const insertResult = await db.execute(sql`
        INSERT INTO users (
          openId, name, email, loginMethod, passwordHash, passwordUpdatedAt,
          mustChangePassword, role, cpf, studentId, cargo, leaderId, status,
          departamentoId, viuNormasVersao
        ) VALUES (
          ${OPEN_ID_TESTE}, ${NOME_TESTE}, ${EMAIL_TESTE}, 'password', ${passwordHash}, NOW(),
          0, 'colaborador', NULL, ${STUDENT_ID_TESTE}, ${origem.cargo}, ${origem.leaderId}, 'ativo',
          ${origem.departamentoId}, ${Number(origem.viuNormasVersao ?? 0)}
        )
      `);
      usuarioId = insertIdOf(insertResult);
      criadoAgora = true;
    }

    if (!usuarioId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível preparar o funcionário de teste UTIC.",
      });
    }

    const espelhamento = await espelharDadosDesenvolvimento(db, origem.id, usuarioId);

    return {
      success: true,
      criadoAgora,
      usuarioId,
      nome: NOME_TESTE,
      baseadoEm: NOME_BASE,
      email: EMAIL_TESTE,
      senhaTemporaria,
      cargo: origem.cargo,
      departamentoId: origem.departamentoId,
      tentativaAnteriorLimpa: !criadoAgora,
      espelhamento,
    };
  }),
});

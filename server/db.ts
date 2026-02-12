import { eq, and, isNull, not, inArray, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, pdis, competenciasMacros, actions, acoesHistorico, adjustmentRequests, adjustmentComments, departamentos, ciclos, evidences, evidenceFiles, evidenceTexts, notifications, pdiValidacoes, deletionAuditLog, solicitacoesAcoes, userDepartmentRoles, normasRegras } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

// ============= DATABASE CONNECTION =============

let dbInstance: any = null;

export async function getDb() {
  console.log('--- TENTANDO CONEXÃO DB ---');
  if (dbInstance) {
    console.log('--- DB JÁ CONECTADO ---');
    return dbInstance;
  }

  try {
    if (process.env.DATABASE_URL) {
      console.log('--- DATABASE_URL ENCONTRADA ---');
      dbInstance = drizzle(process.env.DATABASE_URL);
      console.log('--- DB CONECTADO COM SUCESSO ---');
      return dbInstance;
    }
    console.log('--- DATABASE_URL NÃO ENCONTRADA ---');
    return null;
  } catch (error) {
    console.error("Database connection error:", error);
    return null;
  }
}

// ============= FUNÇÕES DE COMPETÊNCIAS MACROS =============

export async function getAllMacros() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(competenciasMacros)
    .orderBy(competenciasMacros.nome);

  return result;
}

export async function createMacro(data: {
  nome: string;
  descricao: string;
  ativo?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(competenciasMacros).values({
    nome: data.nome,
    descricao: data.descricao,
    ativo: data.ativo ?? true,
    createdAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function updateMacro(
  id: number,
  data: { nome?: string; descricao?: string; ativo?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(competenciasMacros).set(data).where(eq(competenciasMacros.id, id));
}

export async function deleteMacro(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(competenciasMacros).where(eq(competenciasMacros.id, id));
}

// ============= FUNÇÕES DE AÇÕES =============

export async function createAction(data: {
  pdiId: number;
  macroId: number;
  microcompetencia?: string | null;
  titulo: string;
  descricao?: string;
  prazo: Date;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(actions).values({
    pdiId: data.pdiId,
    macroId: data.macroId,
    microcompetencia: data.microcompetencia || null,
    titulo: data.titulo,
    descricao: data.descricao || "",
    prazo: data.prazo,
    status: data.status || "nao_iniciada",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function getActionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select().from(actions).where(eq(actions.id, id));
  return result;
}

export async function getAllActions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Query com JOINs para trazer colaborador e departamento
    const result = await db
      .select({
        id: actions.id,
        pdiId: actions.pdiId,
        macroId: actions.macroId,
        titulo: actions.titulo,
        descricao: actions.descricao,
        prazo: actions.prazo,
        status: actions.status,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
        microcompetencia: actions.microcompetencia,
        pdiTitulo: pdis.titulo,
        macroNome: competenciasMacros.nome,
        colaboradorId: pdis.colaboradorId,
        responsavelId: pdis.colaboradorId,
        colaboradorNome: users.name,
        departamentoNome: departamentos.nome,
        departamentoId: users.departamentoId,
        leaderId: users.leaderId
      })
      .from(actions)
      .innerJoin(pdis, eq(actions.pdiId, pdis.id))
      .leftJoin(competenciasMacros, eq(actions.macroId, competenciasMacros.id))
      .innerJoin(users, eq(pdis.colaboradorId, users.id))
      .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
      .where(eq(users.status, 'ativo'))
      .orderBy(desc(actions.createdAt));

    return result;
  } catch (error) {
    console.error('Erro em getAllActions:', error);
    return [];
  }
}

export async function getActionsByPDIId(pdiId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(actions)
    .where(eq(actions.pdiId, pdiId))
    .orderBy(desc(actions.createdAt));

  return result;
}

export async function getActionsByColaboradorId(colaboradorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: actions.id,
      pdiId: actions.pdiId,
      macroId: actions.macroId,
      titulo: actions.titulo,
      descricao: actions.descricao,
      prazo: actions.prazo,
      status: actions.status,
      createdAt: actions.createdAt,
      updatedAt: actions.updatedAt,
      pdiTitulo: pdis.titulo,
      macroNome: competenciasMacros.nome,
      microcompetenciaNome: competenciasMacros.nome,
      colaboradorId: pdis.colaboradorId,
      responsavelId: pdis.colaboradorId,
      colaboradorNome: users.name,
      departamentoNome: departamentos.nome
    })
    .from(actions)
    .leftJoin(pdis, eq(actions.pdiId, pdis.id))
    .leftJoin(competenciasMacros, eq(actions.macroId, competenciasMacros.id))
    .leftJoin(users, eq(pdis.colaboradorId, users.id))
    .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
    .where(eq(pdis.colaboradorId, colaboradorId))
    .orderBy(desc(actions.createdAt));

  return result;
}

export async function updateAction(
  id: number,
  data: Partial<{
    nome: string;
    descricao: string;
    blocoId: number;
    macroId: number;
    microId: number;
    prazo: string | Date;
    status: string;
    titulo?: string;
  }>,
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar ação antiga para comparação
  const [acaoAntiga] = await db.select().from(actions).where(eq(actions.id, id));
  if (!acaoAntiga) throw new Error("Ação não encontrada");

  const normalizedData = {
    ...data,
    prazo: data.prazo instanceof Date ? data.prazo.toISOString().slice(0, 19).replace('T', ' ') : data.prazo,
  };

  // ========== COMPARAR E GRAVAR HISTÓRICO ==========
  if (userId) {
    // TÍTULO
    if (data.titulo && data.titulo !== acaoAntiga.titulo) {
      await db.insert(acoesHistorico).values({
        actionId: id,
        campo: 'Título',
        valorAnterior: acaoAntiga.titulo,
        valorNovo: data.titulo,
        alteradoPor: userId,
      });
    }

    // DESCRIÇÃO
    if (data.descricao !== undefined && data.descricao !== acaoAntiga.descricao) {
      await db.insert(acoesHistorico).values({
        actionId: id,
        campo: 'Descrição',
        valorAnterior: acaoAntiga.descricao || '',
        valorNovo: data.descricao,
        alteradoPor: userId,
      });
    }

    // PRAZO (Converter para YYYY-MM-DD antes de comparar)
    if (data.prazo) {
      const dataAntiga = new Date(acaoAntiga.prazo).toISOString().split('T')[0];
      const dataNova = new Date(normalizedData.prazo).toISOString().split('T')[0];
      
      if (dataAntiga !== dataNova) {
        const [anoAntigo, mesAntigo, diaAntigo] = dataAntiga.split('-');
        const [anoNovo, mesNovo, diaNovo] = dataNova.split('-');
        
        await db.insert(acoesHistorico).values({
          actionId: id,
          campo: 'Prazo',
          valorAnterior: `${diaAntigo}/${mesAntigo}/${anoAntigo}`,
          valorNovo: `${diaNovo}/${mesNovo}/${anoNovo}`,
          alteradoPor: userId,
        });
      }
    }

    // STATUS
    if (data.status && data.status !== acaoAntiga.status) {
      await db.insert(acoesHistorico).values({
        actionId: id,
        campo: 'Status',
        valorAnterior: acaoAntiga.status,
        valorNovo: data.status,
        alteradoPor: userId,
      });
    }

    // MACRO/COMPETÊNCIA
    if (data.macroId && data.macroId !== acaoAntiga.macroId) {
      await db.insert(acoesHistorico).values({
        actionId: id,
        campo: 'Competência',
        valorAnterior: acaoAntiga.macroId.toString(),
        valorNovo: data.macroId.toString(),
        alteradoPor: userId,
      });
    }
  }

  await db.update(actions).set(normalizedData as any).where(eq(actions.id, id));
}

export async function deleteAction(id: number, excluidoPor?: number, excluidoPorNome?: string, motivoExclusao?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // 0. Buscar dados da ação antes de excluir para auditoria
    const [acaoData] = await db.select().from(actions).where(eq(actions.id, id));
    if (acaoData && excluidoPor && excluidoPorNome) {
      await registrarExclusao({
        entidadeTipo: 'acao',
        entidadeId: id,
        entidadeNome: acaoData.titulo,
        dadosExcluidos: acaoData,
        excluidoPor,
        excluidoPorNome,
        motivoExclusao,
      });
    }
    
    // 1. Buscar todas as evidências da ação para deletar arquivos e textos
    const evidenciasAcao = await db.select({ id: evidences.id }).from(evidences).where(eq(evidences.actionId, id));
    const evidenceIds = evidenciasAcao.map(e => e.id);
    
    // 2. Deletar arquivos e textos das evidências
    if (evidenceIds.length > 0) {
      for (const evId of evidenceIds) {
        await db.execute(sql`DELETE FROM evidence_files WHERE evidenceId = ${evId}`);
        await db.execute(sql`DELETE FROM evidence_texts WHERE evidenceId = ${evId}`);
      }
    }
    
    // 3. Buscar todas as solicitações de ajuste para deletar comentários
    const solicitacoesAcao = await db.select({ id: adjustmentRequests.id }).from(adjustmentRequests).where(eq(adjustmentRequests.actionId, id));
    const solicitacaoIds = solicitacoesAcao.map(s => s.id);
    
    // 4. Deletar comentários das solicitações de ajuste
    if (solicitacaoIds.length > 0) {
      for (const solId of solicitacaoIds) {
        await db.delete(adjustmentComments).where(eq(adjustmentComments.adjustmentRequestId, solId));
      }
    }
    
    // 5. Deletar em cascata: evidências, ajustes, histórico, depois a ação
    await db.delete(evidences).where(eq(evidences.actionId, id));
    await db.delete(adjustmentRequests).where(eq(adjustmentRequests.actionId, id));
    await db.delete(acoesHistorico).where(eq(acoesHistorico.actionId, id));
    await db.delete(actions).where(eq(actions.id, id));
    
    console.log('[deleteAction] Ação deletada com cascata completa:', id);
  } catch (error) {
    console.error('[deleteAction] Erro ao deletar ação:', error);
    throw error;
  }
}

// ============= FUNÇÕES DE HISTÓRICO =============

export async function createAcaoHistorico(data: {
  actionId: number;
  campo: string;
  valorAnterior?: string;
  valorNovo?: string;
  motivoAlteracao?: string;
  alteradoPor: number;
  solicitacaoAjusteId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(acoesHistorico).values(data).execute();
  return result[0]?.insertId || 0;
}

export async function getActionHistory(actionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: acoesHistorico.id,
      actionId: acoesHistorico.actionId,
      campo: acoesHistorico.campo,
      valorAnterior: acoesHistorico.valorAnterior,
      valorNovo: acoesHistorico.valorNovo,
      motivoAlteracao: acoesHistorico.motivoAlteracao,
      alteradoPor: acoesHistorico.alteradoPor,
      createdAt: acoesHistorico.createdAt,
      userName: users.name,
    })
    .from(acoesHistorico)
    .leftJoin(users, eq(acoesHistorico.alteradoPor, users.id))
    .where(eq(acoesHistorico.actionId, actionId))
    .orderBy(desc(acoesHistorico.createdAt));

  return result;
}

// ============= FUNÇÕES DE PDI =============

export async function getPDIById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [pdi] = await db.select().from(pdis).where(eq(pdis.id, id));
  if (!pdi) return null;

  // Enriquecer com dados do colaborador, departamento e ciclo
  const [user] = await db.select().from(users).where(eq(users.id, pdi.colaboradorId));
  const [ciclo] = await db.select().from(ciclos).where(eq(ciclos.id, pdi.cicloId));
  const [dept] = user ? await db.select().from(departamentos).where(eq(departamentos.id, user.departamentoId)) : [null];
  
  // Buscar líder do colaborador
  const [lider] = user?.leaderId ? await db.select().from(users).where(eq(users.id, user.leaderId)) : [null];
  
  // Buscar validação do líder
  const [validacao] = await db.select().from(pdiValidacoes).where(eq(pdiValidacoes.pdiId, pdi.id));
  
  return {
    ...pdi,
    colaboradorNome: user?.name || "—",
    departamentoNome: dept?.nome || "—",
    cicloNome: ciclo?.nome || "—",
    liderNome: lider?.name || "—",
    validadoEm: validacao?.aprovadoEm || null,
    validadoPor: validacao?.liderId || null,
    objetivoGeral: pdi.objetivoGeral || pdi.titulo,
  };
}

export async function getAllPDIs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(pdis)
    .orderBy(desc(pdis.createdAt));

  const enriched = await Promise.all(
    result.map(async (pdi) => {
      const [user] = await db.select().from(users).where(eq(users.id, pdi.colaboradorId));
      const [ciclo] = await db.select().from(ciclos).where(eq(ciclos.id, pdi.cicloId));
      const [dept] = user ? await db.select().from(departamentos).where(eq(departamentos.id, user.departamentoId)) : [null];
      
      // Buscar líder do colaborador (não o próprio colaborador)
      const [lider] = user?.leaderId ? await db.select().from(users).where(eq(users.id, user.leaderId)) : [null];
      
      // Buscar contagem real de ações da tabela actions
      const pdiActions = await db.select().from(actions).where(eq(actions.pdiId, pdi.id));
      const actionCount = pdiActions.length;
      const completedCount = pdiActions.filter((a: any) => a.status === 'concluida').length;
      const inProgressCount = pdiActions.filter((a: any) => a.status === 'em_andamento' || a.status === 'aguardando_avaliacao').length;
      const pendingCount = pdiActions.filter((a: any) => a.status === 'nao_iniciada' || a.status === 'atrasada').length;
      const progressPercentage = actionCount > 0 ? Math.round((completedCount / actionCount) * 100) : 0;
      
      // Buscar validação do líder na tabela pdi_validacoes
      const [validacao] = await db.select().from(pdiValidacoes).where(eq(pdiValidacoes.pdiId, pdi.id));
      
      return {
        pdiId: pdi.id,
        id: pdi.id,
        titulo: pdi.titulo,
        status: pdi.status,
        progresso: pdi.progresso || 0,
        colaboradorId: pdi.colaboradorId,
        usuarioId: pdi.colaboradorId,
        colaboradorNome: user?.name || "—",
        colaborador: user ? { name: user.name, email: user.email } : null,
        departamentoNome: dept?.nome || "—",
        cicloNome: ciclo?.nome || "—",
        ciclo: ciclo || null,
        lider: lider || null,
        liderNome: lider?.name || "—",
        departamentoId: user?.departamentoId || 0,
        totalAcoes: pdi.totalAcoes || 0,
        acoesConcluidasTotal: pdi.acoesConcluidasTotal || 0,
        // Campos calculados em tempo real
        actionCount,
        completedCount,
        inProgressCount,
        pendingCount,
        progressPercentage,
        // Campo de validação do líder
        validadoEm: validacao?.aprovadoEm || null,
        validadoPor: validacao?.liderId || null,
        // Relatório de Análise
        relatorioAnalise: pdi.relatorioAnalise || null,
        relatorioArquivoUrl: pdi.relatorioArquivoUrl || null,
        relatorioArquivoNome: pdi.relatorioArquivoNome || null,
        objetivoGeral: pdi.objetivoGeral || null,
      };
    })
  );

  return enriched;
}

export async function createPDI(data: {
  colaboradorId: number;
  cicloId: number;
  titulo: string;
  objetivoGeral?: string;
  relatorioAnalise?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pdis).values({
    colaboradorId: data.colaboradorId,
    cicloId: data.cicloId,
    titulo: data.titulo,
    objetivoGeral: data.objetivoGeral || "",
    relatorioAnalise: data.relatorioAnalise || null,
    status: "em_andamento",
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function updatePDI(
  id: number,
  data: Partial<{ titulo: string; descricao: string; status: string; relatorioAnalise: string | null; relatorioArquivoUrl: string | null; relatorioArquivoNome: string | null; relatorioArquivoKey: string | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pdis).set({ ...data, updatedAt: new Date() }).where(eq(pdis.id, id));
}

export async function deletePDI(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Primeiro deletar as ações vinculadas ao PDI
  await db.delete(actions).where(eq(actions.pdiId, id));
  
  // Depois deletar o PDI
  await db.delete(pdis).where(eq(pdis.id, id));
  
  return { success: true };
}

// ============= FUNÇÕES DE USUÁRIOS =============

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(users).orderBy(users.name);
  return result;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select().from(users).where(eq(users.id, id));
  
  if (!result) return null;
  
  // Buscar nome do departamento
  let departamentoNome = null;
  if (result.departamentoId) {
    const [dept] = await db.select({ nome: departamentos.nome })
      .from(departamentos)
      .where(eq(departamentos.id, result.departamentoId));
    departamentoNome = dept?.nome || null;
  }
  
  // Buscar nome do líder
  let leaderName = null;
  if (result.leaderId) {
    const [leader] = await db.select({ name: users.name })
      .from(users)
      .where(eq(users.id, result.leaderId));
    leaderName = leader?.name || null;
  }
  
  return {
    ...result,
    departamentoNome,
    leaderName
  };
}

export async function getUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select().from(users).where(eq(users.cpf, cpf));
  return result;
}

export async function getUserByEmailAndCpf(email: string, cpf: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select().from(users).where(
    and(eq(users.email, email), eq(users.cpf, cpf))
  );
  return result;
}

export async function countUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select({ count: sql`COUNT(*)` }).from(users);
  return result?.count || 0;
}

export async function createUser(data: {
  openId: string;
  name: string;
  email: string;
  cpf: string;
  role: string;
  cargo: string;
  leaderId?: number;
  departamentoId?: number | null;
  status: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    cpf: data.cpf,
    role: data.role,
    cargo: data.cargo,
    leaderId: data.leaderId,
    departamentoId: data.departamentoId,
    status: data.status,
    createdAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function updateUser(
  id: number,
  data: Partial<{
    name: string;
    email: string;
    cpf: string;
    role: string;
    cargo: string;
    leaderId: number | null;
    departamentoId: number | null;
    status: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, id));
}

// ============= FUNÇÕES DE DEPARTAMENTOS =============

export async function getAllDepartamentos() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(departamentos).orderBy(departamentos.nome);
  return result;
}

export async function getDepartamentoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select().from(departamentos).where(eq(departamentos.id, id));
  return result;
}

export async function createDepartamento(data: {
  nome: string;
  descricao?: string;
  leaderId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(departamentos).values({
    nome: data.nome,
    descricao: data.descricao || "",
    leaderId: data.leaderId,
    createdAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function updateDepartamento(
  id: number,
  data: Partial<{ nome: string; descricao: string; leaderId: number; status: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(departamentos).set(data).where(eq(departamentos.id, id));
}

export async function deleteDepartamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(departamentos).where(eq(departamentos.id, id));
}

export async function syncDepartmentLeader(departamentoId: number, leaderId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (leaderId === null) {
    await db.update(users).set({ leaderId: null }).where(eq(users.departamentoId, departamentoId));
  } else {
    await db.update(users).set({ leaderId }).where(eq(users.departamentoId, departamentoId));
  }
}

export async function getSubordinates(leaderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.leaderId, leaderId), eq(users.status, 'ativo')))
    .orderBy(users.name);

  return result;
}

// ============= FUNÇÕES DE CICLOS =============

export async function getAllCiclos() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Traz TUDO do banco (sem groupBy para garantir que o ID venha)
  const todosCiclos = await db
    .select()
    .from(ciclos)
    .orderBy(ciclos.dataInicio);

  // 2. Filtra duplicados via Código (Mais seguro)
  const ciclosUnicos = [];
  const nomesVistos = new Set();

  for (const c of todosCiclos) {
    if (!nomesVistos.has(c.nome)) {
      nomesVistos.add(c.nome);
      ciclosUnicos.push(c);
    }
  }

  return ciclosUnicos;
}

export async function getCicloById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.select().from(ciclos).where(eq(ciclos.id, id));
  return result;
}

// ============= FUNÇÕES DE EVIDÊNCIAS =============

export async function createEvidence(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('[createEvidence] Iniciando com data:', JSON.stringify(data, null, 2));
  
  const dataWithDefaults = {
    ...data,
    createdAt: new Date(),
    status: data.status || 'aguardando_avaliacao'
  };
  
  console.log('[createEvidence] Dados com defaults:', JSON.stringify(dataWithDefaults, null, 2));
  
  try {
    const result = await db.insert(evidences).values(dataWithDefaults);
    console.log('[createEvidence] Resultado do insert:', JSON.stringify(result, null, 2));
    
    const generatedId = result?.[0]?.insertId || result?.insertId;
    console.log('[createEvidence] GeneratedId extraido:', generatedId);
    
    if (!generatedId) {
      console.error('[createEvidence] Falha ao gerar ID - result:', result);
      throw new Error("Falha ao gerar ID no MySQL");
    }
    
    console.log('[createEvidence] SUCESSO - ID:', generatedId);
    return generatedId;
  } catch (error) {
    console.error('[createEvidence] ERRO ao inserir:', error);
    throw error;
  }
}

export async function getEvidenceById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(evidences)
    .where(eq(evidences.id, id));

  return result[0];
}

export async function updateEvidenceStatus(
  id: number,
  data: Partial<{
    status: string;
    justificativaAdmin: string;
    evaluatedBy: number;
    evaluatedAt: Date;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(evidences).set(data).where(eq(evidences.id, id));
}

export async function createEvidenceFile(
  evidenceId: number, 
  file: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    fileKey: string;
  }
) {
  const db = await getDb();
  console.log('[createEvidenceFile] Salvando arquivo:', file);
  
  try {
    const result = await db.insert(evidenceFiles).values({ 
      evidenceId, 
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      fileUrl: file.fileUrl,
      fileKey: file.fileKey
    });
    console.log('[createEvidenceFile] Arquivo salvo com sucesso');
    return result;
  } catch (error) {
    console.error('[createEvidenceFile] Erro ao salvar arquivo:', error);
    throw error;
  }
}

export async function createEvidenceText(evidenceId: number, conteudo: string) {
  const db = await getDb();
  console.log('[createEvidenceText] Salvando texto para evidence:', evidenceId);
  
  try {
    const result = await db.insert(evidenceTexts).values({ 
      evidenceId, 
      texto: conteudo
    });
    console.log('[createEvidenceText] Texto salvo com sucesso');
    return result;
  } catch (error) {
    console.error('[createEvidenceText] Erro ao salvar texto:', error);
    throw error;
  }
}

// ============= FUNÇÕES DE NOTIFICAÇÕES =============

export async function createNotification(data: {
  destinatarioId: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  referenciaId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values({
    destinatarioId: data.destinatarioId,
    tipo: data.tipo,
    titulo: data.titulo,
    mensagem: data.mensagem,
    referenciaId: data.referenciaId,
    lida: false,
    createdAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.destinatarioId, userId))
    .orderBy(desc(notifications.createdAt));

  return result;
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ lida: true }).where(eq(notifications.id, id));
}

// ============= FUNÇÕES ADICIONAIS PARA COMPETÊNCIAS =============

export async function getTop3CompetenciasComGaps() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar todas as ações com suas competências macro
  const todasAcoes = await db
    .select({
      macroId: actions.macroId,
    })
    .from(actions);

  // Contar ações por competência macro
  const contagemPorMacro: Record<number, number> = {};
  for (const acao of todasAcoes) {
    if (acao.macroId) {
      contagemPorMacro[acao.macroId] = (contagemPorMacro[acao.macroId] || 0) + 1;
    }
  }

  const totalAcoes = todasAcoes.length;

  // Buscar nomes das competências macro
  const macros = await db
    .select({
      id: competenciasMacros.id,
      nome: competenciasMacros.nome,
    })
    .from(competenciasMacros)
    .where(eq(competenciasMacros.ativo, true));

  // Montar resultado com contagem e percentual
  const resultado = macros
    .map((macro: { id: number; nome: string }) => ({
      id: macro.id,
      nome: macro.nome,
      totalAcoes: contagemPorMacro[macro.id] || 0,
      percentual: totalAcoes > 0 
        ? Math.round(((contagemPorMacro[macro.id] || 0) / totalAcoes) * 100) 
        : 0,
    }))
    .filter((item: { id: number; nome: string; totalAcoes: number; percentual: number }) => item.totalAcoes > 0) // Apenas competências com ações
    .sort((a: { totalAcoes: number }, b: { totalAcoes: number }) => b.totalAcoes - a.totalAcoes) // Ordenar por quantidade de ações (decrescente)
    .slice(0, 3); // Top 3

  return resultado;
}

// ============= FUNÇÕES PARA IMPORTAÇÃO =============

export async function importBulkUsers(users: Array<{
  name: string;
  email: string;
  cpf: string;
  cargo: string;
  role: string;
  departamento: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = [];

  for (const user of users) {
    try {
      const departamento = await db
        .select()
        .from(departamentos)
        .where(eq(departamentos.nome, user.departamento))
        .limit(1);

      const departamentoId = departamento[0]?.id;

      const result = await db.insert(users).values({
        openId: `imported_${user.cpf}`,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        cargo: user.cargo,
        departamentoId,
        status: 'ativo',
        createdAt: new Date(),
      });

      results.push({ success: true, userId: result[0]?.insertId });
    } catch (error) {
      results.push({ success: false, error: (error as Error).message });
    }
  }

  return results;
}

// ============= FUNÇÕES DE PDI FALTANDO =============

export async function getPDIsByColaboradorId(colaboradorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(pdis)
    .where(eq(pdis.colaboradorId, colaboradorId))
    .orderBy(pdis.createdAt);

  return result;
}

export async function getPDIsByCicloId(cicloId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(pdis)
    .where(eq(pdis.cicloId, cicloId))
    .orderBy(pdis.createdAt);

  return result;
}

// ============= FUNÇÕES DE USUÁRIO FALTANDO =============

export async function getUsersByRole(role: 'admin' | 'gerente' | 'lider' | 'colaborador') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .orderBy(users.name);

  return result;
}

// ============= FUNÇÕES DE EVIDÊNCIAS FALTANDO =============

export async function getEvidencesByActionId(actionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(evidences)
    .where(eq(evidences.actionId, actionId))
    .orderBy(evidences.createdAt);

  return result;
}

export async function getPendingEvidences() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Destruturamos para pegar apenas as linhas [rows]
  const [rows]: any = await db.execute(sql`
    SELECT 
      e.*, 
      u.name as colaboradorNome,
      u.email as colaboradorEmail,
      a.titulo as actionNome
    FROM evidences e
    LEFT JOIN users u ON e.colaboradorId = u.id
    LEFT JOIN actions a ON e.actionId = a.id
    WHERE e.status IN ('aguardando_avaliacao', 'aguardando_analise', 'pending', 'pendente')
    ORDER BY e.createdAt DESC
  `);

  // Mapeamos os nomes do SQL para o que o Frontend espera
  return rows.map((ev: any) => ({
    ...ev,
    solicitante: { name: ev.colaboradorNome, email: ev.colaboradorEmail },
    acao: { titulo: ev.actionNome }
  }));
}

export async function getMacroById(macroId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(competenciasMacros)
    .where(eq(competenciasMacros.id, macroId))
    .limit(1);
  
  return result[0] || null;
}


// ============= FUNÇÕES DE VALIDAÇÃO DE PDI =============

export async function getPDIValidacao(pdiId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(pdiValidacoes)
    .where(eq(pdiValidacoes.pdiId, pdiId))
    .limit(1);
  
  return result[0] || null;
}

export async function createPDIValidacao(data: {
  pdiId: number;
  liderId: number;
  justificativa?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pdiValidacoes).values({
    pdiId: data.pdiId,
    liderId: data.liderId,
    justificativa: data.justificativa,
  });
  
  return result;
}

export async function isPDIAguardandoAprovacao(pdiId: number) {
  const validacao = await getPDIValidacao(pdiId);
  return !validacao; // Se não existe validação, está aguardando aprovação
}

// ============= FUNÇÕES DE ATUALIZAÇÃO DE PDI =============
export async function updatePDIStatus(pdiId: number, status: 'em_andamento' | 'concluido' | 'cancelado') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .update(pdis)
    .set({ status })
    .where(eq(pdis.id, pdiId));
  
  return result;
}


// ============= FUNÇÕES DE ADJUSTMENT REQUESTS =============

export async function createAdjustmentRequest(data: {
  actionId: number;
  solicitanteId: number;
  tipoSolicitante: 'colaborador' | 'lider';
  justificativa: string;
  camposAjustar: string;
  dadosAntesAjuste?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(adjustmentRequests)
    .values({
      actionId: data.actionId,
      solicitanteId: data.solicitanteId,
      tipoSolicitante: data.tipoSolicitante,
      justificativa: data.justificativa,
      camposAjustar: data.camposAjustar,
      dadosAntesAjuste: data.dadosAntesAjuste || null,
      status: 'pendente',
      createdAt: new Date().toISOString(),
    });

  return result;
}

export async function getPendingAdjustmentRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log('[getPendingAdjustmentRequests] Iniciando busca de TODAS as solicitações...');

  try {
    // Usar sql template para garantir compatibilidade
    const [rows]: any = await db.execute(sql`
      SELECT 
        ar.id,
        ar.actionId,
        ar.solicitanteId,
        ar.tipoSolicitante,
        ar.justificativa,
        ar.camposAjustar,
        ar.dadosAntesAjuste,
        ar.status,
        ar.justificativaAdmin,
        ar.createdAt,
        ar.evaluatedAt,
        ar.evaluatedBy,
        a.id as action_id,
        a.titulo as action_title,
        a.descricao as action_desc,
        a.prazo as action_prazo,
        a.macroId as action_macro_id,
        a.microcompetencia as action_micro,
        u.name as user_name,
        u.email as user_email
      FROM adjustment_requests ar
      LEFT JOIN actions a ON ar.actionId = a.id
      LEFT JOIN users u ON ar.solicitanteId = u.id
      ORDER BY ar.createdAt DESC
    `);

    console.log('[getPendingAdjustmentRequests] Encontradas', rows?.length || 0, 'solicitações no banco');

    if (!rows || rows.length === 0) {
      console.log('[getPendingAdjustmentRequests] Nenhuma solicitação encontrada');
      return [];
    }

    // Buscar comentários do líder para cada solicitação usando sql template
    const result = await Promise.all(rows.map(async (row: any) => {
      const requestId = row.id;
      const [commentsRows]: any = await db.execute(sql`
        SELECT 
          ac.id,
          ac.comentario,
          ac.createdAt,
          u.name as autor_name,
          u.role as autor_role
        FROM adjustment_comments ac
        LEFT JOIN users u ON ac.autorId = u.id
        WHERE ac.adjustmentRequestId = ${requestId}
        ORDER BY ac.createdAt DESC
      `);
      
      return {
        id: row.id,
        actionId: row.actionId,
        solicitanteId: row.solicitanteId,
        tipoSolicitante: row.tipoSolicitante,
        justificativa: row.justificativa,
        camposAjustar: row.camposAjustar,
        dadosAntesAjuste: row.dadosAntesAjuste,
        status: row.status,
        justificativaAdmin: row.justificativaAdmin,
        createdAt: row.createdAt,
        evaluatedAt: row.evaluatedAt,
        evaluatedBy: row.evaluatedBy,
        acao: {
          id: row.action_id,
          titulo: row.action_title,
          descricao: row.action_desc,
          prazo: row.action_prazo,
          macroId: row.action_macro_id,
          microcompetencia: row.action_micro,
        },
        solicitante: {
          name: row.user_name,
          email: row.user_email,
        },
        comentariosLider: (commentsRows || []).map((c: any) => ({
          id: c.id,
          comentario: c.comentario,
          createdAt: c.createdAt,
          autorName: c.autor_name,
          autorRole: c.autor_role,
        })),
      };
    }));

    console.log('[getPendingAdjustmentRequests] Retornando', result.length, 'solicitações processadas');
    return result;
  } catch (error) {
    console.error('[getPendingAdjustmentRequests] Erro:', error);
    throw error;
  }
}

export async function getAdjustmentRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Retorna TODAS as solicitações do usuário, independente do status
  // Isso permite que o colaborador veja o feedback de solicitações aprovadas/reprovadas
  const result = await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      actionTitulo: actions.titulo,
      solicitanteId: adjustmentRequests.solicitanteId,
      tipoSolicitante: adjustmentRequests.tipoSolicitante,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      status: adjustmentRequests.status,
      justificativaAdmin: adjustmentRequests.justificativaAdmin,
      createdAt: adjustmentRequests.createdAt,
      evaluatedAt: adjustmentRequests.evaluatedAt,
    })
    .from(adjustmentRequests)
    .leftJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .where(eq(adjustmentRequests.solicitanteId, userId))
    .orderBy(adjustmentRequests.createdAt);

  return result;
}

export async function getAdjustmentRequestById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      actionTitulo: actions.titulo,
      solicitanteId: adjustmentRequests.solicitanteId,
      solicitanteNome: users.name,
      tipoSolicitante: adjustmentRequests.tipoSolicitante,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      status: adjustmentRequests.status,
      justificativaAdmin: adjustmentRequests.justificativaAdmin,
      createdAt: adjustmentRequests.createdAt,
      evaluatedAt: adjustmentRequests.evaluatedAt,
      evaluatedBy: adjustmentRequests.evaluatedBy,
    })
    .from(adjustmentRequests)
    .leftJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .leftJoin(users, eq(adjustmentRequests.solicitanteId, users.id))
    .where(eq(adjustmentRequests.id, id));

  return result[0] || null;
}

export async function updateAdjustmentRequest(id: number, data: Partial<{
  status: 'pendente' | 'mais_informacoes' | 'aprovada' | 'reprovada' | 'aguardando_lider';
  justificativaAdmin: string;
  evaluatedBy: number;
  evaluatedAt: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(adjustmentRequests)
    .set(data)
    .where(eq(adjustmentRequests.id, id));

  return result;
}

export async function addAdjustmentComment(data: {
  adjustmentRequestId: number;
  autorId: number;
  comentario: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(adjustmentComments)
    .values({
      adjustmentRequestId: data.adjustmentRequestId,
      autorId: data.autorId,
      comentario: data.comentario,
      createdAt: new Date().toISOString(),
    });

  return result;
}

export async function getAdjustmentComments(adjustmentRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: adjustmentComments.id,
      adjustmentRequestId: adjustmentComments.adjustmentRequestId,
      autorId: adjustmentComments.autorId,
      autorNome: users.name,
      comentario: adjustmentComments.comentario,
      createdAt: adjustmentComments.createdAt,
    })
    .from(adjustmentComments)
    .leftJoin(users, eq(adjustmentComments.autorId, users.id))
    .where(eq(adjustmentComments.adjustmentRequestId, adjustmentRequestId))
    .orderBy(adjustmentComments.createdAt);

  return result;
}


// ============= FUNÇÕES DE EVIDÊNCIAS PARA LÍDER =============

export async function getPendingEvidencesByLeader(leaderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar evidências pendentes dos subordinados do líder
  const [rows]: any = await db.execute(sql`
    SELECT 
      e.*, 
      u.name as colaboradorNome,
      u.email as colaboradorEmail,
      a.titulo as actionNome,
      a.descricao as actionDescricao,
      a.prazo as actionPrazo,
      p.titulo as pdiTitulo,
      d.nome as departamentoNome
    FROM evidences e
    LEFT JOIN users u ON e.colaboradorId = u.id
    LEFT JOIN actions a ON e.actionId = a.id
    LEFT JOIN pdis p ON a.pdiId = p.id
    LEFT JOIN departamentos d ON u.departamentoId = d.id
    WHERE e.status IN ('aguardando_avaliacao', 'aguardando_analise', 'pending', 'pendente')
      AND u.leaderId = ${leaderId}
      AND u.status = 'ativo'
    ORDER BY e.createdAt DESC
  `);

  // Mapeamos os nomes do SQL para o que o Frontend espera
  return rows.map((ev: any) => ({
    ...ev,
    solicitante: { name: ev.colaboradorNome, email: ev.colaboradorEmail },
    acao: { 
      titulo: ev.actionNome, 
      descricao: ev.actionDescricao,
      prazo: ev.actionPrazo 
    },
    pdi: { titulo: ev.pdiTitulo },
    departamento: { nome: ev.departamentoNome }
  }));
}


// ============= FUNÇÕES DE SOLICITAÇÕES DE AJUSTE PARA LÍDER =============

// Buscar TODAS as solicitações de ajuste (para admin)
export async function getAllAdjustmentRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [rows]: any = await db.execute(sql`
    SELECT 
      ar.id,
      ar.actionId,
      ar.solicitanteId,
      ar.tipoSolicitante,
      ar.justificativa,
      ar.camposAjustar,
      ar.status,
      ar.justificativaAdmin,
      ar.createdAt,
      ar.evaluatedAt,
      ar.evaluatedBy,
      ar.dadosAntesAjuste,
      ar.dadosAposAjuste,
      a.titulo as actionTitulo,
      a.descricao as actionDescricao,
      a.prazo as actionPrazo,
      a.macroId as actionMacroId,
      u.name as solicitanteNome,
      u.email as solicitanteEmail,
      u.departamentoId as departamentoId,
      p.titulo as pdiTitulo,
      d.nome as departamentoNome,
      cm.nome as macroNome
    FROM adjustment_requests ar
    LEFT JOIN actions a ON ar.actionId = a.id
    LEFT JOIN users u ON ar.solicitanteId = u.id
    LEFT JOIN pdis p ON a.pdiId = p.id
    LEFT JOIN departamentos d ON u.departamentoId = d.id
    LEFT JOIN competencias_macros cm ON a.macroId = cm.id
    ORDER BY ar.createdAt DESC
  `);

  return rows.map((row: any) => ({
    id: row.id,
    actionId: row.actionId,
    solicitanteId: row.solicitanteId,
    tipoSolicitante: row.tipoSolicitante,
    justificativa: row.justificativa,
    camposAjustar: row.camposAjustar,
    status: row.status,
    justificativaAdmin: row.justificativaAdmin,
    createdAt: row.createdAt,
    evaluatedAt: row.evaluatedAt,
    evaluatedBy: row.evaluatedBy,
    dadosAntesAjuste: row.dadosAntesAjuste,
    dadosAposAjuste: row.dadosAposAjuste,
    actionTitulo: row.actionTitulo,
    actionDescricao: row.actionDescricao,
    actionPrazo: row.actionPrazo,
    actionMacroId: row.actionMacroId,
    solicitanteNome: row.solicitanteNome,
    solicitanteEmail: row.solicitanteEmail,
    departamentoId: row.departamentoId,
    pdiTitulo: row.pdiTitulo,
    departamentoNome: row.departamentoNome,
    macroNome: row.macroNome
  }));
}

export async function getAdjustmentRequestsByLeader(leaderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar solicitações de ajuste dos subordinados do líder
  const [rows]: any = await db.execute(sql`
    SELECT 
      ar.id,
      ar.actionId,
      ar.solicitanteId,
      ar.tipoSolicitante,
      ar.justificativa,
      ar.camposAjustar,
      ar.status,
      ar.justificativaAdmin,
      ar.createdAt,
      ar.evaluatedAt,
      ar.evaluatedBy,
      ar.dadosAntesAjuste,
      ar.dadosAposAjuste,
      a.titulo as actionTitulo,
      a.descricao as actionDescricao,
      a.prazo as actionPrazo,
      a.macroId as actionMacroId,
      u.name as solicitanteNome,
      u.email as solicitanteEmail,
      p.titulo as pdiTitulo,
      d.nome as departamentoNome,
      cm.nome as macroNome
    FROM adjustment_requests ar
    LEFT JOIN actions a ON ar.actionId = a.id
    LEFT JOIN users u ON ar.solicitanteId = u.id
    LEFT JOIN pdis p ON a.pdiId = p.id
    LEFT JOIN departamentos d ON u.departamentoId = d.id
    LEFT JOIN competencias_macros cm ON a.macroId = cm.id
    WHERE u.leaderId = ${leaderId}
      AND u.status = 'ativo'
    ORDER BY ar.createdAt DESC
  `);

  return rows.map((row: any) => ({
    id: row.id,
    actionId: row.actionId,
    solicitanteId: row.solicitanteId,
    tipoSolicitante: row.tipoSolicitante,
    justificativa: row.justificativa,
    camposAjustar: row.camposAjustar,
    status: row.status,
    justificativaAdmin: row.justificativaAdmin,
    createdAt: row.createdAt,
    evaluatedAt: row.evaluatedAt,
    evaluatedBy: row.evaluatedBy,
    dadosAntesAjuste: row.dadosAntesAjuste,
    dadosAposAjuste: row.dadosAposAjuste,
    actionTitulo: row.actionTitulo,
    actionDescricao: row.actionDescricao,
    actionPrazo: row.actionPrazo,
    actionMacroId: row.actionMacroId,
    solicitanteNome: row.solicitanteNome,
    solicitanteEmail: row.solicitanteEmail,
    pdiTitulo: row.pdiTitulo,
    departamentoNome: row.departamentoNome,
    macroNome: row.macroNome
  }));
}


// ============= FUNÇÕES GENÉRICAS PARA QUERIES =============

export async function select(fields: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select(fields);
}

export async function execute(query: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.execute(query);
}

// Função para buscar evidências por IDs de ações (retorna a mais recente de cada ação)
export async function getEvidencesByActionIds(actionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar todas as evidências ordenadas por data (mais recente primeiro)
  const allEvidences = await db
    .select({
      id: evidences.id,
      actionId: evidences.actionId,
      colaboradorId: evidences.colaboradorId,
      status: evidences.status,
      descricao: evidences.descricao,
      createdAt: evidences.createdAt,
      evaluatedAt: evidences.evaluatedAt,
      evaluatedBy: evidences.evaluatedBy,
      justificativaAdmin: evidences.justificativaAdmin,
    })
    .from(evidences)
    .where(inArray(evidences.actionId, actionIds))
    .orderBy(desc(evidences.createdAt));

  // Retornar apenas a evidência mais recente de cada ação
  const latestByAction = new Map<number, typeof allEvidences[0]>();
  for (const ev of allEvidences) {
    if (!latestByAction.has(ev.actionId)) {
      latestByAction.set(ev.actionId, ev);
    }
  }

  return Array.from(latestByAction.values());
}


// ============= FUNÇÕES DE BACKUP =============

export async function createBackup(data: {
  filename: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  totalRecords: number;
  status: 'gerando' | 'concluido' | 'erro';
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Usar os nomes corretos das colunas da tabela: nome, tamanho, totalRegistros, geradoPor
  const result = await db.execute(
    sql`INSERT INTO backups (nome, fileUrl, fileKey, tamanho, totalRegistros, status, geradoPor) 
        VALUES (${data.filename}, ${data.fileUrl}, ${data.fileKey}, ${data.fileSize}, ${data.totalRecords}, ${data.status}, ${data.createdBy})`
  );

  return { insertId: Number((result as any)[0].insertId) };
}

export async function updateBackupStatus(id: number, status: 'gerando' | 'concluido' | 'erro') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(
    sql`UPDATE backups SET status = ${status} WHERE id = ${id}`
  );
}

export async function markBackupDownloaded(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(
    sql`UPDATE backups SET downloadedAt = NOW() WHERE id = ${id}`
  );
}

export async function getAllBackups() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT b.id, b.nome as filename, b.fileUrl, b.fileKey, b.tamanho as fileSize, 
               b.totalRegistros as totalRecords, b.status, b.geradoPor as createdBy,
               b.downloadedAt, b.createdAt, u.name as createdByName 
        FROM backups b 
        LEFT JOIN users u ON b.geradoPor = u.id 
        ORDER BY b.createdAt DESC 
        LIMIT 50`
  );

  return (result as any)[0];
}

export async function getBackupById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT * FROM backups WHERE id = ${id}`
  );

  return (result as any)[0][0];
}

export async function generateBackupData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar TODAS as tabelas do banco automaticamente
  const [tableRows] = await db.execute(sql.raw('SHOW TABLES'));
  const tables = (tableRows as any[]).map((row: any) => Object.values(row)[0] as string)
    .filter((name: string) => name !== '__drizzle_migrations'); // Excluir tabela interna de migrações

  let csvContent = '';
  let totalRecords = 0;

  for (const tableName of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
      const rows = (result as any)[0];
      
      if (rows && rows.length > 0) {
        totalRecords += rows.length;

        // Separador de tabela
        csvContent += `\n=== ${tableName.toUpperCase()} (${rows.length} registros) ===\n`;

        // Cabeçalhos
        const headers = Object.keys(rows[0]);
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

        // Dados
        for (const row of rows) {
          const values = headers.map(h => {
            let val = (row as any)[h];
            if (val === null || val === undefined) return '""';
            if (val instanceof Date) {
              val = val.toISOString().slice(0, 19).replace('T', ' ');
            }
            // Escapar aspas duplas e envolver em aspas
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvContent += values.join(',') + '\n';
        }
      }
    } catch (error) {
      console.log(`Tabela ${tableName} não encontrada ou erro:`, error);
    }
  }

  // Adicionar BOM para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  const csvBuffer = Buffer.from(bom + csvContent, 'utf-8');

  return { csvBuffer, totalRecords };
}


// Função para restaurar backup a partir de conteúdo SQL
export async function restoreBackupFromSQL(sqlContent: string): Promise<{ success: boolean; executedStatements: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const errors: string[] = [];
  let executedStatements = 0;

  // Separar os comandos SQL (ignorando comentários e linhas vazias)
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  // Tabelas na ordem correta para limpar (ordem inversa das dependências)
  const tablesToClear = [
    'evidenceTexts', 'evidenceFiles', 'evidences',
    'acoesHistorico', 'adjustmentComments', 'adjustmentRequests',
    'notifications', 'pdi_validacoes',
    'actions', 'pdis', 'ciclos',
    'competenciasMicros', 'competenciasMacros', 'competenciasBlocos',
    'users', 'departamentos'
  ];

  // Primeiro, limpar as tabelas existentes (na ordem correta para evitar erros de FK)
  console.log('Iniciando limpeza das tabelas...');
  for (const table of tablesToClear) {
    try {
      await db.execute(sql.raw(`DELETE FROM ${table}`));
      console.log(`Tabela ${table} limpa com sucesso`);
    } catch (error: any) {
      console.log(`Aviso ao limpar tabela ${table}:`, error.message);
      // Continuar mesmo com erro (tabela pode não existir)
    }
  }

  // Executar cada statement do backup
  console.log(`Executando ${statements.length} comandos SQL...`);
  for (const statement of statements) {
    if (statement.toLowerCase().startsWith('insert')) {
      try {
        await db.execute(sql.raw(statement));
        executedStatements++;
      } catch (error: any) {
        console.error(`Erro ao executar: ${statement.substring(0, 100)}...`);
        console.error(error.message);
        errors.push(`Erro: ${error.message} - SQL: ${statement.substring(0, 50)}...`);
      }
    }
  }

  console.log(`Restauração concluída: ${executedStatements} comandos executados, ${errors.length} erros`);

  return {
    success: errors.length === 0,
    executedStatements,
    errors
  };
}


// ============= FUNÇÕES DE EXPORTAÇÃO DE RELATÓRIOS =============

// Relatório geral único com todos os dados do sistema
export async function getRelatorioGeral() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT 
          u.id as usuario_id,
          u.name as usuario_nome,
          u.email as usuario_email,
          u.cpf as usuario_cpf,
          u.cargo as usuario_cargo,
          u.role as usuario_perfil,
          u.status as usuario_status,
          d.nome as departamento_nome,
          l.name as lider_nome,
          p.id as pdi_id,
          p.titulo as pdi_titulo,
          p.status as pdi_status,
          c.nome as ciclo_nome,
          a.id as acao_id,
          a.titulo as acao_titulo,
          a.status as acao_status,
          a.prazo as acao_prazo,
          m.nome as competencia_macro
        FROM users u
        LEFT JOIN departamentos d ON u.departamentoId = d.id
        LEFT JOIN users l ON u.leaderId = l.id
        LEFT JOIN pdis p ON p.colaboradorId = u.id
        LEFT JOIN ciclos c ON p.cicloId = c.id
        LEFT JOIN actions a ON a.pdiId = p.id
        LEFT JOIN competencias_macros m ON a.macroId = m.id
        ORDER BY u.name, p.id, a.id`
  );

  return (result as any)[0];
}

export async function getAllUsersForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT u.id, u.name, u.email, u.cpf, u.cargo, u.role, u.status, u.createdAt,
               d.nome as departamentoNome,
               l.name as leaderName
        FROM users u
        LEFT JOIN departamentos d ON u.departamentoId = d.id
        LEFT JOIN users l ON u.leaderId = l.id
        ORDER BY u.name`
  );

  return (result as any)[0];
}

export async function getAllPdisForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT p.id, p.titulo, p.status, p.createdAt, p.updatedAt,
               u.name as userName,
               c.nome as cicloNome
        FROM pdis p
        LEFT JOIN users u ON p.colaboradorId = u.id
        LEFT JOIN ciclos c ON p.cicloId = c.id
        ORDER BY p.createdAt DESC`
  );

  return (result as any)[0];
}

export async function getAllAcoesForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT a.id, a.pdiId, a.titulo, a.status, a.prazo, a.createdAt, a.updatedAt,
               u.name as userName,
               m.nome as macroNome
        FROM actions a
        LEFT JOIN pdis p ON a.pdiId = p.id
        LEFT JOIN users u ON p.colaboradorId = u.id
        LEFT JOIN competencias_macros m ON a.macroId = m.id
        ORDER BY a.createdAt DESC`
  );

  return (result as any)[0];
}

export async function getAllCompetenciasForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const competencias: any[] = [];

  // Macros (única tabela de competências existente)
  const macros = await db.execute(sql`SELECT id, nome, descricao, ativo FROM competencias_macros ORDER BY nome`);
  for (const m of (macros as any)[0]) {
    competencias.push({ tipo: 'Macro', ...m });
  }

  return competencias;
}

export async function getAllDepartamentosForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT d.id, d.nome, d.descricao, d.status,
               (SELECT COUNT(*) FROM users WHERE departamentoId = d.id) as totalUsuarios
        FROM departamentos d
        ORDER BY d.nome`
  );

  return (result as any)[0];
}


// ============= FUNÇÕES DE IMPORTAÇÃO EM MASSA =============

// Importar usuários em massa
export async function importUsers(users: Array<{
  name: string;
  email: string;
  cpf: string;
  cargo?: string;
  departamentoNome?: string;
  leaderEmail?: string;
  role: 'admin' | 'gerente' | 'lider' | 'colaborador';
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: { success: boolean; email: string; error?: string }[] = [];
  
  // Primeiro, buscar todos os departamentos e criar um mapa
  const depsResult = await db.execute(sql`SELECT id, nome FROM departamentos`);
  const departamentos = new Map((depsResult as any)[0].map((d: any) => [d.nome.toLowerCase(), d.id]));
  
  // Buscar todos os usuários existentes para validar CPF e encontrar líderes
  const usersResult = await db.execute(sql`SELECT id, email, cpf FROM users`);
  const existingCpfs = new Set((usersResult as any)[0].map((u: any) => u.cpf));
  const usersByEmail = new Map((usersResult as any)[0].map((u: any) => [u.email.toLowerCase(), u.id]));

  for (const user of users) {
    try {
      // Validar CPF duplicado
      if (existingCpfs.has(user.cpf)) {
        results.push({ success: false, email: user.email, error: 'CPF já cadastrado no sistema' });
        continue;
      }

      // Buscar departamento
      let departamentoId: number | null = null;
      if (user.departamentoNome) {
        const deptId = departamentos.get(user.departamentoNome.toLowerCase());
        departamentoId = deptId !== undefined ? deptId as number : null;
        if (!departamentoId) {
          results.push({ success: false, email: user.email, error: `Departamento "${user.departamentoNome}" não encontrado` });
          continue;
        }
      }

      // Buscar líder
      let leaderId: number | null = null;
      if (user.leaderEmail) {
        const ldrId = usersByEmail.get(user.leaderEmail.toLowerCase());
        leaderId = ldrId !== undefined ? ldrId as number : null;
        if (!leaderId) {
          results.push({ success: false, email: user.email, error: `Líder com email "${user.leaderEmail}" não encontrado` });
          continue;
        }
      }

      // Gerar openId único para o usuário
      const openId = `import-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Inserir usuário
      await db.execute(
        sql`INSERT INTO users (openId, name, email, cpf, cargo, departamentoId, leaderId, role, status, createdAt, updatedAt, lastSignedIn)
            VALUES (${openId}, ${user.name}, ${user.email}, ${user.cpf}, ${user.cargo || 'Não informado'}, ${departamentoId}, ${leaderId}, ${user.role}, 'ativo', NOW(), NOW(), NOW())`
      );

      // Adicionar ao mapa para que próximos usuários possam referenciar como líder
      const newUserResult = await db.execute(sql`SELECT id FROM users WHERE email = ${user.email}`);
      const newUserId = (newUserResult as any)[0][0]?.id;
      if (newUserId) {
        usersByEmail.set(user.email.toLowerCase(), newUserId);
        existingCpfs.add(user.cpf);
      }

      results.push({ success: true, email: user.email });
    } catch (error: any) {
      results.push({ success: false, email: user.email, error: error.message });
    }
  }

  return results;
}

// Importar ações em massa
export async function importAcoes(acoes: Array<{
  cpf?: string;
  userEmail?: string;
  cicloNome?: string;
  macroNome?: string;
  microcompetencia?: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  tipo?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: { success: boolean; identificador: string; titulo: string; error?: string }[] = [];

  // Buscar todos os usuários por email e CPF
  const usersResult = await db.execute(sql`SELECT id, email, cpf FROM users`);
  const usersByEmail = new Map((usersResult as any)[0].map((u: any) => [u.email?.toLowerCase(), u.id]));
  const usersByCpf = new Map((usersResult as any)[0].map((u: any) => [u.cpf?.replace(/\D/g, ''), u.id]));

  // Buscar todas as competências macro
  const macrosResult = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE ativo = 1`);
  const macrosByNome = new Map((macrosResult as any)[0].map((m: any) => [m.nome?.toLowerCase().trim(), m.id]));

  // Buscar todos os ciclos
  const ciclosResult = await db.execute(sql`SELECT id, nome FROM ciclos`);
  const ciclosByNome = new Map((ciclosResult as any)[0].map((c: any) => [c.nome?.toLowerCase().trim(), c.id]));

  for (const acao of acoes) {
    const identificador = acao.cpf || acao.userEmail || 'desconhecido';
    try {
      // Buscar usuário por CPF ou email
      let userId: number | undefined;
      if (acao.cpf) {
        const cpfLimpo = acao.cpf.replace(/\D/g, '');
        userId = usersByCpf.get(cpfLimpo) as number | undefined;
      }
      if (!userId && acao.userEmail) {
        userId = usersByEmail.get(acao.userEmail.toLowerCase()) as number | undefined;
      }
      
      if (!userId) {
        results.push({ success: false, identificador, titulo: acao.titulo, error: `Usuário não encontrado (CPF: ${acao.cpf || 'N/A'}, Email: ${acao.userEmail || 'N/A'})` });
        continue;
      }

      // Buscar ciclo pelo nome (se fornecido)
      let cicloId: number | undefined;
      if (acao.cicloNome) {
        cicloId = ciclosByNome.get(acao.cicloNome.toLowerCase().trim()) as number | undefined;
      }

      // Buscar PDI do usuário (pelo ciclo se fornecido, senão o mais recente)
      let pdiId: number | undefined;
      if (cicloId) {
        const pdiResult = await db.execute(
          sql`SELECT id FROM pdis WHERE colaboradorId = ${userId} AND cicloId = ${cicloId} LIMIT 1`
        );
        pdiId = (pdiResult as any)[0][0]?.id;
      }
      if (!pdiId) {
        const pdiResult = await db.execute(
          sql`SELECT id FROM pdis WHERE colaboradorId = ${userId} ORDER BY createdAt DESC LIMIT 1`
        );
        pdiId = (pdiResult as any)[0][0]?.id;
      }

      if (!pdiId) {
        results.push({ success: false, identificador, titulo: acao.titulo, error: `Usuário não possui PDI cadastrado` });
        continue;
      }

      // Buscar macrocompetência pelo nome (se fornecido) ou usar padrão
      let macroId: number | undefined;
      if (acao.macroNome) {
        macroId = macrosByNome.get(acao.macroNome.toLowerCase().trim()) as number | undefined;
        if (!macroId) {
          results.push({ success: false, identificador, titulo: acao.titulo, error: `Competência Macro "${acao.macroNome}" não encontrada no sistema` });
          continue;
        }
      } else {
        // Usar primeira macro disponível como padrão
        const macroResult = await db.execute(
          sql`SELECT id FROM competencias_macros WHERE ativo = 1 LIMIT 1`
        );
        macroId = (macroResult as any)[0][0]?.id || 1;
      }

      // Converter prazo para formato de data
      let prazoDate: string | null = null;
      if (acao.prazo) {
        // Tentar converter dd/mm/yyyy para yyyy-mm-dd
        const partes = acao.prazo.split('/');
        if (partes.length === 3) {
          prazoDate = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        } else {
          prazoDate = acao.prazo;
        }
      } else if (acao.dataFim) {
        prazoDate = acao.dataFim;
      } else {
        prazoDate = new Date().toISOString().split('T')[0];
      }

      // Inserir ação com todos os campos
      await db.execute(
        sql`INSERT INTO actions (pdiId, macroId, microcompetencia, titulo, descricao, prazo, status, createdAt, updatedAt)
            VALUES (${pdiId}, ${macroId}, ${acao.microcompetencia || null}, ${acao.titulo}, ${acao.descricao || null}, ${prazoDate}, ${acao.status || 'nao_iniciada'}, NOW(), NOW())`
      );

      results.push({ success: true, identificador, titulo: acao.titulo });
    } catch (error: any) {
      results.push({ success: false, identificador, titulo: acao.titulo, error: error.message });
    }
  }

  return results;
}

// Validar ações antes de importar (não insere no banco, apenas valida)
export async function validarAcoes(acoes: Array<{
  linha: number;
  cpf?: string;
  userEmail?: string;
  cicloNome?: string;
  macroNome?: string;
  microcompetencia?: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: { linha: number; valido: boolean; cpf: string; titulo: string; erro?: string }[] = [];

  // Buscar todos os usuários por email e CPF
  const usersResult = await db.execute(sql`SELECT id, email, cpf, name FROM users`);
  const usersByEmail = new Map((usersResult as any)[0].map((u: any) => [u.email?.toLowerCase(), { id: u.id, name: u.name }]));
  const usersByCpf = new Map((usersResult as any)[0].map((u: any) => [u.cpf?.replace(/\D/g, ''), { id: u.id, name: u.name }]));

  // Buscar todas as competências macro
  const macrosResult = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE ativo = 1`);
  const macrosByNome = new Map((macrosResult as any)[0].map((m: any) => [m.nome?.toLowerCase().trim(), m.id]));

  // Buscar todos os ciclos
  const ciclosResult = await db.execute(sql`SELECT id, nome FROM ciclos`);
  const ciclosByNome = new Map((ciclosResult as any)[0].map((c: any) => [c.nome?.toLowerCase().trim(), c.id]));

  for (const acao of acoes) {
    const identificador = acao.cpf || acao.userEmail || 'desconhecido';
    const erros: string[] = [];

    // Validar usuário por CPF ou email
    let userId: number | undefined;
    let userName: string | undefined;
    if (acao.cpf) {
      const cpfLimpo = acao.cpf.replace(/\D/g, '');
      const user = usersByCpf.get(cpfLimpo) as { id: number; name: string } | undefined;
      userId = user?.id;
      userName = user?.name;
    }
    if (!userId && acao.userEmail) {
      const user = usersByEmail.get(acao.userEmail.toLowerCase()) as { id: number; name: string } | undefined;
      userId = user?.id;
      userName = user?.name;
    }
    
    if (!userId) {
      erros.push(`Usuário não encontrado (CPF: ${acao.cpf || 'N/A'})`);
    }

    // Validar ciclo
    let cicloId: number | undefined;
    if (acao.cicloNome) {
      cicloId = ciclosByNome.get(acao.cicloNome.toLowerCase().trim()) as number | undefined;
      if (!cicloId) {
        erros.push(`Ciclo "${acao.cicloNome}" não encontrado`);
      }
    } else {
      erros.push('Ciclo não informado');
    }

    // Validar PDI do usuário (se usuário foi encontrado)
    if (userId && cicloId) {
      const pdiResult = await db.execute(
        sql`SELECT id FROM pdis WHERE colaboradorId = ${userId} AND cicloId = ${cicloId} LIMIT 1`
      );
      const pdiId = (pdiResult as any)[0][0]?.id;
      if (!pdiId) {
        erros.push(`Usuário não possui PDI no ciclo ${acao.cicloNome}`);
      }
    }

    // Validar competência macro
    if (acao.macroNome) {
      const macroId = macrosByNome.get(acao.macroNome.toLowerCase().trim()) as number | undefined;
      if (!macroId) {
        erros.push(`Competência Macro "${acao.macroNome}" não encontrada`);
      }
    } else {
      erros.push('Competência Macro não informada');
    }

    // Validar título
    if (!acao.titulo || acao.titulo.trim() === '') {
      erros.push('Título da ação não informado');
    }

    // Validar prazo
    if (!acao.prazo || acao.prazo.trim() === '') {
      erros.push('Prazo não informado');
    } else {
      // Validar formato da data
      const partes = acao.prazo.split('/');
      if (partes.length !== 3) {
        erros.push('Prazo em formato inválido (use DD/MM/YYYY)');
      }
    }

    results.push({
      linha: acao.linha,
      valido: erros.length === 0,
      cpf: identificador,
      titulo: acao.titulo || '(sem título)',
      erro: erros.length > 0 ? erros.join('; ') : undefined
    });
  }

  return results;
}

// Importar PDIs em massa
export async function importPdis(pdis: Array<{
  userEmail: string;
  cicloNome: string;
  status?: string;
  observacoes?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: { success: boolean; userEmail: string; error?: string }[] = [];

  // Buscar usuários
  const usersResult = await db.execute(sql`SELECT id, email FROM users`);
  const usersByEmail = new Map((usersResult as any)[0].map((u: any) => [u.email.toLowerCase(), u.id]));

  // Buscar ciclos
  const ciclosResult = await db.execute(sql`SELECT id, nome FROM ciclos`);
  const ciclosByNome = new Map((ciclosResult as any)[0].map((c: any) => [c.nome.toLowerCase(), c.id]));

  for (const pdi of pdis) {
    try {
      // Buscar usuário
      const userId = usersByEmail.get(pdi.userEmail.toLowerCase());
      if (!userId) {
        results.push({ success: false, userEmail: pdi.userEmail, error: `Usuário com email "${pdi.userEmail}" não encontrado` });
        continue;
      }

      // Buscar ciclo
      const cicloId = ciclosByNome.get(pdi.cicloNome.toLowerCase());
      if (!cicloId) {
        results.push({ success: false, userEmail: pdi.userEmail, error: `Ciclo "${pdi.cicloNome}" não encontrado` });
        continue;
      }

      // Verificar se já existe PDI para este usuário e ciclo
      const existingPdi = await db.execute(
        sql`SELECT id FROM pdis WHERE colaboradorId = ${userId} AND cicloId = ${cicloId}`
      );
      
      if ((existingPdi as any)[0].length > 0) {
        // Atualizar PDI existente
        await db.execute(
          sql`UPDATE pdis SET status = ${pdi.status || 'em_andamento'}, objetivoGeral = ${pdi.observacoes || null}, updatedAt = NOW()
              WHERE colaboradorId = ${userId} AND cicloId = ${cicloId}`
        );
        results.push({ success: true, userEmail: pdi.userEmail });
      } else {
        // Criar novo PDI
        await db.execute(
          sql`INSERT INTO pdis (colaboradorId, cicloId, titulo, status, objetivoGeral, createdAt, updatedAt, createdBy)
              VALUES (${userId}, ${cicloId}, 'PDI Importado', ${pdi.status || 'em_andamento'}, ${pdi.observacoes || null}, NOW(), NOW(), ${userId})`
        );
        results.push({ success: true, userEmail: pdi.userEmail });
      }
    } catch (error: any) {
      results.push({ success: false, userEmail: pdi.userEmail, error: error.message });
    }
  }

  return results;
}


// ============= FUNÇÕES DE AUDITORIA DE EXCLUSÕES =============

export async function registrarExclusao(data: {
  entidadeTipo: 'acao' | 'pdi' | 'usuario' | 'evidencia' | 'solicitacao';
  entidadeId: number;
  entidadeNome: string;
  dadosExcluidos: object;
  excluidoPor: number;
  excluidoPorNome: string;
  motivoExclusao?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(deletionAuditLog).values({
      entidadeTipo: data.entidadeTipo,
      entidadeId: data.entidadeId,
      entidadeNome: data.entidadeNome,
      dadosExcluidos: JSON.stringify(data.dadosExcluidos),
      excluidoPor: data.excluidoPor,
      excluidoPorNome: data.excluidoPorNome,
      motivoExclusao: data.motivoExclusao || null,
    });
    console.log('[registrarExclusao] Exclusão registrada:', data.entidadeTipo, data.entidadeId);
  } catch (error) {
    console.error('[registrarExclusao] Erro ao registrar exclusão:', error);
    // Não lançar erro para não interromper a exclusão principal
  }
}

export async function getAuditoriasExclusao(filtros?: {
  entidadeTipo?: 'acao' | 'pdi' | 'usuario' | 'evidencia' | 'solicitacao';
  dataInicio?: string;
  dataFim?: string;
  excluidoPor?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let query = `
      SELECT 
        id,
        entidadeTipo,
        entidadeId,
        entidadeNome,
        dadosExcluidos,
        excluidoPor,
        excluidoPorNome,
        motivoExclusao,
        createdAt
      FROM deletion_audit_log
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filtros?.entidadeTipo) {
      query += ` AND entidadeTipo = ?`;
      params.push(filtros.entidadeTipo);
    }
    
    if (filtros?.dataInicio) {
      query += ` AND createdAt >= ?`;
      params.push(filtros.dataInicio);
    }
    
    if (filtros?.dataFim) {
      query += ` AND createdAt <= ?`;
      params.push(filtros.dataFim);
    }
    
    if (filtros?.excluidoPor) {
      query += ` AND excluidoPor = ?`;
      params.push(filtros.excluidoPor);
    }
    
    query += ` ORDER BY createdAt DESC`;
    
    const [rows]: any = await db.execute(sql.raw(query));
    
    return (rows || []).map((row: any) => ({
      id: row.id,
      entidadeTipo: row.entidadeTipo,
      entidadeId: row.entidadeId,
      entidadeNome: row.entidadeNome,
      dadosExcluidos: typeof row.dadosExcluidos === 'string' ? JSON.parse(row.dadosExcluidos) : row.dadosExcluidos,
      excluidoPor: row.excluidoPor,
      excluidoPorNome: row.excluidoPorNome,
      motivoExclusao: row.motivoExclusao,
      createdAt: row.createdAt,
    }));
  } catch (error) {
    console.error('[getAuditoriasExclusao] Erro:', error);
    throw error;
  }
}

export async function getEstatisticasAuditoria() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [rows]: any = await db.execute(sql`
      SELECT 
        entidadeTipo,
        COUNT(*) as total
      FROM deletion_audit_log
      GROUP BY entidadeTipo
    `);
    
    const estatisticas: Record<string, number> = {
      acao: 0,
      pdi: 0,
      usuario: 0,
      evidencia: 0,
      solicitacao: 0,
      total: 0,
    };
    
    (rows || []).forEach((row: any) => {
      estatisticas[row.entidadeTipo] = Number(row.total);
      estatisticas.total += Number(row.total);
    });
    
    return estatisticas;
  } catch (error) {
    console.error('[getEstatisticasAuditoria] Erro:', error);
    throw error;
  }
}


// ============= FUNÇÕES DE ESTATÍSTICAS DE PRAZO =============

export async function getEstatisticasPrazo(filtros?: {
  departamentoId?: number | null;
  leaderId?: number;
  colaboradorId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let whereClause = "WHERE a.status != 'concluida' AND u.status = 'ativo'";
    
    if (filtros?.departamentoId) {
      whereClause += ` AND u.departamentoId = ${filtros.departamentoId}`;
    }
    
    if (filtros?.leaderId) {
      whereClause += ` AND u.leaderId = ${filtros.leaderId}`;
    }
    
    if (filtros?.colaboradorId) {
      whereClause += ` AND p.colaboradorId = ${filtros.colaboradorId}`;
    }

    const [rows]: any = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN a.prazo < CURDATE() THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN a.prazo >= CURDATE() AND a.prazo <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as proximas,
        SUM(CASE WHEN a.prazo > DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as noPrazo
      FROM actions a
      LEFT JOIN pdis p ON a.pdiId = p.id
      LEFT JOIN users u ON p.colaboradorId = u.id
      ${whereClause}
    `));

    const result = rows[0] || { total: 0, vencidas: 0, proximas: 0, noPrazo: 0 };
    
    return {
      total: Number(result.total) || 0,
      vencidas: Number(result.vencidas) || 0,
      proximas: Number(result.proximas) || 0,
      noPrazo: Number(result.noPrazo) || 0,
    };
  } catch (error) {
    console.error('[getEstatisticasPrazo] Erro:', error);
    throw error;
  }
}

export async function getAcoesVencidas(filtros?: {
  departamentoId?: number | null;
  leaderId?: number;
  colaboradorId?: number;
  limite?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let whereClause = "WHERE a.prazo < CURDATE() AND a.status != 'concluida' AND u.status = 'ativo'";
    
    if (filtros?.departamentoId) {
      whereClause += ` AND u.departamentoId = ${filtros.departamentoId}`;
    }
    
    if (filtros?.leaderId) {
      whereClause += ` AND u.leaderId = ${filtros.leaderId}`;
    }
    
    if (filtros?.colaboradorId) {
      whereClause += ` AND p.colaboradorId = ${filtros.colaboradorId}`;
    }

    const limite = filtros?.limite || 50;

    const [rows]: any = await db.execute(sql.raw(`
      SELECT 
        a.id,
        a.titulo,
        a.prazo,
        a.status,
        DATEDIFF(CURDATE(), a.prazo) as diasVencido,
        u.name as colaboradorNome,
        u.email as colaboradorEmail,
        d.nome as departamentoNome,
        cm.nome as macroNome
      FROM actions a
      LEFT JOIN pdis p ON a.pdiId = p.id
      LEFT JOIN users u ON p.colaboradorId = u.id
      LEFT JOIN departamentos d ON u.departamentoId = d.id
      LEFT JOIN competencias_macros cm ON a.macroId = cm.id
      ${whereClause}
      ORDER BY a.prazo ASC
      LIMIT ${limite}
    `));

    return (rows || []).map((row: any) => ({
      id: row.id,
      titulo: row.titulo,
      prazo: row.prazo,
      status: row.status,
      diasVencido: Number(row.diasVencido) || 0,
      colaboradorNome: row.colaboradorNome,
      colaboradorEmail: row.colaboradorEmail,
      departamentoNome: row.departamentoNome,
      macroNome: row.macroNome,
    }));
  } catch (error) {
    console.error('[getAcoesVencidas] Erro:', error);
    throw error;
  }
}

export async function getAcoesProximasVencer(filtros?: {
  departamentoId?: number | null;
  leaderId?: number;
  colaboradorId?: number;
  diasAntecedencia?: number;
  limite?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const dias = filtros?.diasAntecedencia || 7;
    let whereClause = `WHERE a.prazo >= CURDATE() AND a.prazo <= DATE_ADD(CURDATE(), INTERVAL ${dias} DAY) AND a.status != 'concluida' AND u.status = 'ativo'`;
    
    if (filtros?.departamentoId) {
      whereClause += ` AND u.departamentoId = ${filtros.departamentoId}`;
    }
    
    if (filtros?.leaderId) {
      whereClause += ` AND u.leaderId = ${filtros.leaderId}`;
    }
    
    if (filtros?.colaboradorId) {
      whereClause += ` AND p.colaboradorId = ${filtros.colaboradorId}`;
    }

    const limite = filtros?.limite || 50;

    const [rows]: any = await db.execute(sql.raw(`
      SELECT 
        a.id,
        a.titulo,
        a.prazo,
        a.status,
        DATEDIFF(a.prazo, CURDATE()) as diasRestantes,
        u.name as colaboradorNome,
        u.email as colaboradorEmail,
        d.nome as departamentoNome,
        cm.nome as macroNome
      FROM actions a
      LEFT JOIN pdis p ON a.pdiId = p.id
      LEFT JOIN users u ON p.colaboradorId = u.id
      LEFT JOIN departamentos d ON u.departamentoId = d.id
      LEFT JOIN competencias_macros cm ON a.macroId = cm.id
      ${whereClause}
      ORDER BY a.prazo ASC
      LIMIT ${limite}
    `));

    return (rows || []).map((row: any) => ({
      id: row.id,
      titulo: row.titulo,
      prazo: row.prazo,
      status: row.status,
      diasRestantes: Number(row.diasRestantes) || 0,
      colaboradorNome: row.colaboradorNome,
      colaboradorEmail: row.colaboradorEmail,
      departamentoNome: row.departamentoNome,
      macroNome: row.macroNome,
    }));
  } catch (error) {
    console.error('[getAcoesProximasVencer] Erro:', error);
    throw error;
  }
}


// ============= RELATÓRIO DE AÇÕES VENCIDAS =============

export async function getRelatorioAcoesVencidas(filtros?: {
  departamentoId?: number | null;
  colaboradorId?: number;
  dataInicio?: string;
  dataFim?: string;
  agruparPor?: 'departamento' | 'colaborador';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let whereClause = "WHERE a.prazo < CURDATE() AND a.status != 'concluida' AND u.status = 'ativo'";
    
    if (filtros?.departamentoId) {
      whereClause += ` AND u.departamentoId = ${filtros.departamentoId}`;
    }
    
    if (filtros?.colaboradorId) {
      whereClause += ` AND p.colaboradorId = ${filtros.colaboradorId}`;
    }

    if (filtros?.dataInicio) {
      whereClause += ` AND a.prazo >= '${filtros.dataInicio}'`;
    }

    if (filtros?.dataFim) {
      whereClause += ` AND a.prazo <= '${filtros.dataFim}'`;
    }

    // Query detalhada de ações vencidas
    const [rows]: any = await db.execute(sql.raw(`
      SELECT 
        a.id,
        a.titulo,
        a.descricao,
        a.prazo,
        a.status,
        DATEDIFF(CURDATE(), a.prazo) as diasVencido,
        u.id as colaboradorId,
        u.name as colaboradorNome,
        u.email as colaboradorEmail,
        d.id as departamentoId,
        d.nome as departamentoNome,
        cm.nome as macroNome,
        l.name as liderNome
      FROM actions a
      INNER JOIN pdis p ON a.pdiId = p.id
      INNER JOIN users u ON p.colaboradorId = u.id
      LEFT JOIN departamentos d ON u.departamentoId = d.id
      LEFT JOIN competencias_macros cm ON a.macroId = cm.id
      LEFT JOIN users l ON u.leaderId = l.id
      ${whereClause}
      ORDER BY d.nome ASC, u.name ASC, a.prazo ASC
    `));

    // Query de resumo por departamento
    const [resumoDepartamento]: any = await db.execute(sql.raw(`
      SELECT 
        d.id as departamentoId,
        d.nome as departamentoNome,
        COUNT(a.id) as totalVencidas,
        COUNT(DISTINCT p.colaboradorId) as colaboradoresAfetados,
        AVG(DATEDIFF(CURDATE(), a.prazo)) as mediadiasVencido
      FROM actions a
      INNER JOIN pdis p ON a.pdiId = p.id
      INNER JOIN users u ON p.colaboradorId = u.id
      LEFT JOIN departamentos d ON u.departamentoId = d.id
      ${whereClause}
      GROUP BY d.id, d.nome
      ORDER BY totalVencidas DESC
    `));

    // Query de resumo por colaborador
    const [resumoColaborador]: any = await db.execute(sql.raw(`
      SELECT 
        u.id as colaboradorId,
        u.name as colaboradorNome,
        u.email as colaboradorEmail,
        d.nome as departamentoNome,
        l.name as liderNome,
        COUNT(a.id) as totalVencidas,
        MIN(a.prazo) as prazoMaisAntigo,
        MAX(DATEDIFF(CURDATE(), a.prazo)) as maiorAtraso
      FROM actions a
      INNER JOIN pdis p ON a.pdiId = p.id
      INNER JOIN users u ON p.colaboradorId = u.id
      LEFT JOIN departamentos d ON u.departamentoId = d.id
      LEFT JOIN users l ON u.leaderId = l.id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, d.nome, l.name
      ORDER BY totalVencidas DESC
    `));

    return {
      acoes: (rows || []).map((row: any) => ({
        id: row.id,
        titulo: row.titulo,
        descricao: row.descricao,
        prazo: row.prazo,
        status: row.status,
        diasVencido: Number(row.diasVencido) || 0,
        colaboradorId: row.colaboradorId,
        colaboradorNome: row.colaboradorNome,
        colaboradorEmail: row.colaboradorEmail,
        departamentoId: row.departamentoId,
        departamentoNome: row.departamentoNome || 'Sem Departamento',
        macroNome: row.macroNome,
        liderNome: row.liderNome,
      })),
      resumoPorDepartamento: (resumoDepartamento || []).map((row: any) => ({
        departamentoId: row.departamentoId,
        departamentoNome: row.departamentoNome || 'Sem Departamento',
        totalVencidas: Number(row.totalVencidas) || 0,
        colaboradoresAfetados: Number(row.colaboradoresAfetados) || 0,
        mediaDiasVencido: Math.round(Number(row.mediadiasVencido) || 0),
      })),
      resumoPorColaborador: (resumoColaborador || []).map((row: any) => ({
        colaboradorId: row.colaboradorId,
        colaboradorNome: row.colaboradorNome,
        colaboradorEmail: row.colaboradorEmail,
        departamentoNome: row.departamentoNome || 'Sem Departamento',
        liderNome: row.liderNome,
        totalVencidas: Number(row.totalVencidas) || 0,
        prazoMaisAntigo: row.prazoMaisAntigo,
        maiorAtraso: Number(row.maiorAtraso) || 0,
      })),
      totalGeral: rows?.length || 0,
      dataGeracao: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[getRelatorioAcoesVencidas] Erro:', error);
    throw error;
  }
}


// ============= FUNÇÕES DE ANÁLISE DE LIDERANÇA =============

export async function getLeadershipAnalysis() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Buscar todos os líderes ativos (usuários que têm subordinados)
    // Busca o departamento que o líder GERENCIA (via leaderId) em vez do departamento ao qual pertence
    const [lideres]: any = await db.execute(sql`
      SELECT DISTINCT 
        l.id as liderId,
        l.name as liderNome,
        l.email as liderEmail,
        dg.id as departamentoGerenciadoId,
        dg.nome as departamentoGerenciadoNome,
        dp.id as departamentoId,
        dp.nome as departamentoNome
      FROM users l
      INNER JOIN users subordinado ON subordinado.leaderId = l.id
      LEFT JOIN departamentos dg ON dg.leaderId = l.id
      LEFT JOIN departamentos dp ON l.departamentoId = dp.id
      WHERE l.status = 'ativo'
      ORDER BY l.name
    `);

    const resultado = await Promise.all(
      (lideres || []).map(async (lider: any) => {
        // Buscar PDI do líder (como colaborador)
        const [pdiLider]: any = await db.execute(sql`
          SELECT p.id as pdiId
          FROM pdis p
          WHERE p.colaboradorId = ${lider.liderId}
          AND p.status != 'cancelado'
          ORDER BY p.createdAt DESC
          LIMIT 1
        `);

        // Buscar ações do líder (suas próprias ações)
        let acoesLider: any[] = [];
        let liderCompletedCount = 0;
        let liderTotalCount = 0;
        
        if (pdiLider && pdiLider.length > 0) {
          const [acoes]: any = await db.execute(sql`
            SELECT a.id, a.status, a.macroId
            FROM actions a
            WHERE a.pdiId = ${pdiLider[0].pdiId}
          `);
          acoesLider = acoes || [];
          liderTotalCount = acoesLider.length;
          liderCompletedCount = acoesLider.filter((a: any) => a.status === 'concluida').length;
        }

        // Buscar subordinados ativos do líder
        const [subordinados]: any = await db.execute(sql`
          SELECT u.id, u.name, u.email
          FROM users u
          WHERE u.leaderId = ${lider.liderId}
          AND u.status = 'ativo'
        `);

        // Contar PDIs dos subordinados e quantos foram validados pelo líder
        const [pdisSubordinados]: any = await db.execute(sql`
          SELECT 
            p.id as pdiId,
            p.colaboradorId,
            CASE WHEN pv.id IS NOT NULL THEN 1 ELSE 0 END as validado
          FROM pdis p
          INNER JOIN users u ON p.colaboradorId = u.id
          LEFT JOIN pdi_validacoes pv ON pv.pdiId = p.id AND pv.liderId = ${lider.liderId}
          WHERE u.leaderId = ${lider.liderId}
          AND u.status = 'ativo'
          AND p.status != 'cancelado'
        `);

        const totalPdisSubordinados = (pdisSubordinados || []).length;
        const pdisValidados = (pdisSubordinados || []).filter((p: any) => p.validado === 1).length;
        const pdisPendentesValidacao = totalPdisSubordinados - pdisValidados;

        // Buscar ações de toda a equipe
        const [acoesEquipe]: any = await db.execute(sql`
          SELECT 
            a.id, 
            a.status, 
            a.macroId,
            p.colaboradorId
          FROM actions a
          INNER JOIN pdis p ON a.pdiId = p.id
          INNER JOIN users u ON p.colaboradorId = u.id
          WHERE u.leaderId = ${lider.liderId}
          AND u.status = 'ativo'
          AND p.status != 'cancelado'
        `);

        const equipeTotalCount = (acoesEquipe || []).length;
        const equipeCompletedCount = (acoesEquipe || []).filter((a: any) => a.status === 'concluida').length;

        // Calcular taxa de conclusão
        const liderTaxaConclusao = liderTotalCount > 0 
          ? Math.round((liderCompletedCount / liderTotalCount) * 100) 
          : 0;
        const equipeTaxaConclusao = equipeTotalCount > 0 
          ? Math.round((equipeCompletedCount / equipeTotalCount) * 100) 
          : 0;

        // Buscar competências focais do líder
        const competenciasLider: Record<number, number> = {};
        for (const acao of acoesLider) {
          if (acao.macroId) {
            competenciasLider[acao.macroId] = (competenciasLider[acao.macroId] || 0) + 1;
          }
        }

        // Buscar competências focais da equipe
        const competenciasEquipe: Record<number, number> = {};
        const competenciasEquipeConcluidas: Record<number, number> = {};
        for (const acao of (acoesEquipe || [])) {
          if (acao.macroId) {
            competenciasEquipe[acao.macroId] = (competenciasEquipe[acao.macroId] || 0) + 1;
            if (acao.status === 'concluida') {
              competenciasEquipeConcluidas[acao.macroId] = (competenciasEquipeConcluidas[acao.macroId] || 0) + 1;
            }
          }
        }

        // Buscar nomes das competências
        const macroIds = Array.from(new Set([...Object.keys(competenciasLider), ...Object.keys(competenciasEquipe)])).map(Number);
        let macrosMap: Record<number, string> = {};
        
        if (macroIds.length > 0) {
          const macros = await db
            .select({ id: competenciasMacros.id, nome: competenciasMacros.nome })
            .from(competenciasMacros)
            .where(inArray(competenciasMacros.id, macroIds));
          
          macrosMap = macros.reduce((acc: Record<number, string>, m: any) => {
            acc[m.id] = m.nome;
            return acc;
          }, {});
        }

        // Formatar competências do líder
        const competenciasLiderFormatadas = Object.entries(competenciasLider)
          .map(([macroId, count]) => ({
            macroId: Number(macroId),
            nome: macrosMap[Number(macroId)] || 'Desconhecida',
            quantidade: count as number,
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        // Formatar competências da equipe com taxa de conclusão
        const competenciasEquipeFormatadas = Object.entries(competenciasEquipe)
          .map(([macroId, count]) => {
            const concluidas = competenciasEquipeConcluidas[Number(macroId)] || 0;
            return {
              macroId: Number(macroId),
              nome: macrosMap[Number(macroId)] || 'Desconhecida',
              quantidade: count as number,
              concluidas,
              taxaConclusao: Math.round((concluidas / (count as number)) * 100),
            };
          })
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        // Buscar detalhes dos colaboradores da equipe
        const colaboradoresDetalhes = await Promise.all(
          (subordinados || []).map(async (sub: any) => {
            const [pdiSub]: any = await db.execute(sql`
              SELECT p.id as pdiId
              FROM pdis p
              WHERE p.colaboradorId = ${sub.id}
              AND p.status != 'cancelado'
              ORDER BY p.createdAt DESC
              LIMIT 1
            `);

            let subTotal = 0;
            let subConcluidas = 0;

            if (pdiSub && pdiSub.length > 0) {
              const [acoesSub]: any = await db.execute(sql`
                SELECT status FROM actions WHERE pdiId = ${pdiSub[0].pdiId}
              `);
              subTotal = (acoesSub || []).length;
              subConcluidas = (acoesSub || []).filter((a: any) => a.status === 'concluida').length;
            }

            return {
              id: sub.id,
              nome: sub.name,
              email: sub.email,
              totalAcoes: subTotal,
              acoesConcluidas: subConcluidas,
              taxaConclusao: subTotal > 0 ? Math.round((subConcluidas / subTotal) * 100) : 0,
            };
          })
        );

        // Gerar insights automáticos
        const insights: Array<{ tipo: string; mensagem: string }> = [];

        // Insight: Competência com menor taxa de conclusão na equipe
        const compMenorTaxa = competenciasEquipeFormatadas
          .filter(c => c.quantidade >= 3)
          .sort((a, b) => a.taxaConclusao - b.taxaConclusao)[0];
        
        if (compMenorTaxa && compMenorTaxa.taxaConclusao < 50) {
          insights.push({
            tipo: 'atencao',
            mensagem: `A competência "${compMenorTaxa.nome}" possui ${compMenorTaxa.quantidade} ações na equipe com apenas ${compMenorTaxa.taxaConclusao}% de conclusão. Considere um treinamento coletivo ou mentoria focada.`,
          });
        }

        // Insight: Competência com maior taxa de conclusão
        const compMaiorTaxa = competenciasEquipeFormatadas
          .filter(c => c.quantidade >= 2)
          .sort((a, b) => b.taxaConclusao - a.taxaConclusao)[0];
        
        if (compMaiorTaxa && compMaiorTaxa.taxaConclusao >= 70) {
          insights.push({
            tipo: 'destaque',
            mensagem: `Ponto forte: "${compMaiorTaxa.nome}" tem ${compMaiorTaxa.taxaConclusao}% de conclusão na equipe.`,
          });
        }

        // Insight: Alinhamento líder/equipe
        const competenciasComuns = competenciasLiderFormatadas.filter(cl => 
          competenciasEquipeFormatadas.some(ce => ce.macroId === cl.macroId)
        );
        
        if (competenciasComuns.length > 0) {
          insights.push({
            tipo: 'alinhamento',
            mensagem: `Líder e equipe compartilham foco em: ${competenciasComuns.map(c => c.nome).join(', ')}.`,
          });
        }

        // Insight: Líder com baixa conclusão, equipe alta
        if (liderTaxaConclusao < 50 && equipeTaxaConclusao > 70) {
          insights.push({
            tipo: 'oportunidade',
            mensagem: `A equipe está engajada (${equipeTaxaConclusao}%) mas o líder tem baixa conclusão pessoal (${liderTaxaConclusao}%). Verificar priorização.`,
          });
        }

        // Insight: Líder com alta conclusão, equipe baixa
        if (liderTaxaConclusao > 70 && equipeTaxaConclusao < 50) {
          insights.push({
            tipo: 'atencao',
            mensagem: `O líder executa bem (${liderTaxaConclusao}%) mas a equipe precisa de mais acompanhamento (${equipeTaxaConclusao}%).`,
          });
        }

        return {
          liderId: lider.liderId,
          liderNome: lider.liderNome,
          liderEmail: lider.liderEmail,
          // Usar o departamento GERENCIADO para filtro (via leaderId)
          departamentoId: lider.departamentoGerenciadoId || lider.departamentoId,
          departamentoNome: lider.departamentoGerenciadoNome || lider.departamentoNome || 'Sem Departamento',
          // Métricas do líder
          liderTotalAcoes: liderTotalCount,
          liderAcoesConcluidas: liderCompletedCount,
          liderTaxaConclusao,
          // Métricas da equipe
          equipeTotalColaboradores: (subordinados || []).length,
          equipeTotalAcoes: equipeTotalCount,
          equipeAcoesConcluidas: equipeCompletedCount,
          equipeTaxaConclusao,
          // Validação de PDIs
          totalPdisSubordinados,
          pdisValidados,
          pdisPendentesValidacao,
          // Competências
          competenciasLider: competenciasLiderFormatadas,
          competenciasEquipe: competenciasEquipeFormatadas,
          // Colaboradores
          colaboradores: colaboradoresDetalhes.sort((a, b) => b.taxaConclusao - a.taxaConclusao),
          // Insights
          insights,
        };
      })
    );

    // Ordenar por taxa de conclusão da equipe (decrescente)
    return resultado.sort((a: any, b: any) => b.equipeTaxaConclusao - a.equipeTaxaConclusao);
  } catch (error) {
    console.error('[getLeadershipAnalysis] Erro:', error);
    throw error;
  }
}


// ============= FUNÇÕES DE SOLICITAÇÕES DE AÇÕES =============

export async function createSolicitacaoAcao(data: {
  pdiId: number;
  macroId: number;
  microcompetencia?: string | null;
  titulo: string;
  descricao?: string;
  prazo: Date;
  solicitanteId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(solicitacoesAcoes).values({
    pdiId: data.pdiId,
    macroId: data.macroId,
    microcompetencia: data.microcompetencia || null,
    titulo: data.titulo,
    descricao: data.descricao || "",
    prazo: data.prazo,
    solicitanteId: data.solicitanteId,
    statusGeral: "aguardando_ckm",
  });

  return result[0]?.insertId || 0;
}

export async function listSolicitacoesAcoes(filtros?: {
  solicitanteId?: number;
  statusGeral?: string;
  gestorId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: any[] = [];

  if (filtros?.solicitanteId) {
    conditions.push(eq(solicitacoesAcoes.solicitanteId, filtros.solicitanteId));
  }
  if (filtros?.statusGeral) {
    conditions.push(eq(solicitacoesAcoes.statusGeral, filtros.statusGeral as any));
  }

  const result = await db
    .select({
      id: solicitacoesAcoes.id,
      pdiId: solicitacoesAcoes.pdiId,
      macroId: solicitacoesAcoes.macroId,
      microcompetencia: solicitacoesAcoes.microcompetencia,
      titulo: solicitacoesAcoes.titulo,
      descricao: solicitacoesAcoes.descricao,
      prazo: solicitacoesAcoes.prazo,
      solicitanteId: solicitacoesAcoes.solicitanteId,
      statusGeral: solicitacoesAcoes.statusGeral,
      ckmParecerTipo: solicitacoesAcoes.ckmParecerTipo,
      ckmParecerTexto: solicitacoesAcoes.ckmParecerTexto,
      ckmParecerPor: solicitacoesAcoes.ckmParecerPor,
      ckmParecerEm: solicitacoesAcoes.ckmParecerEm,
      gestorDecisao: solicitacoesAcoes.gestorDecisao,
      gestorJustificativa: solicitacoesAcoes.gestorJustificativa,
      gestorId: solicitacoesAcoes.gestorId,
      gestorDecisaoEm: solicitacoesAcoes.gestorDecisaoEm,
      rhDecisao: solicitacoesAcoes.rhDecisao,
      rhJustificativa: solicitacoesAcoes.rhJustificativa,
      rhId: solicitacoesAcoes.rhId,
      rhDecisaoEm: solicitacoesAcoes.rhDecisaoEm,
      acaoIncluidaId: solicitacoesAcoes.acaoIncluidaId,
      createdAt: solicitacoesAcoes.createdAt,
      updatedAt: solicitacoesAcoes.updatedAt,
      // Joins
      solicitanteNome: users.name,
      solicitanteEmail: users.email,
      pdiTitulo: pdis.titulo,
      macroNome: competenciasMacros.nome,
    })
    .from(solicitacoesAcoes)
    .leftJoin(users, eq(solicitacoesAcoes.solicitanteId, users.id))
    .leftJoin(pdis, eq(solicitacoesAcoes.pdiId, pdis.id))
    .leftJoin(competenciasMacros, eq(solicitacoesAcoes.macroId, competenciasMacros.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(solicitacoesAcoes.createdAt));

  // Buscar nomes dos avaliadores
  const solicitacoesComNomes = await Promise.all(
    result.map(async (s: any) => {
      let ckmNome = null;
      let gestorNome = null;
      let rhNome = null;
      let solicitanteDepartamento = null;
      let solicitanteLiderId = null;

      if (s.ckmParecerPor) {
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, s.ckmParecerPor));
        ckmNome = u?.name;
      }
      if (s.gestorId) {
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, s.gestorId));
        gestorNome = u?.name;
      }
      if (s.rhId) {
        const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, s.rhId));
        rhNome = u?.name;
      }

      // Buscar departamento e líder do solicitante
      if (s.solicitanteId) {
        const [solicitante] = await db
          .select({ departamentoId: users.departamentoId, leaderId: users.leaderId })
          .from(users)
          .where(eq(users.id, s.solicitanteId));
        if (solicitante) {
          solicitanteLiderId = solicitante.leaderId;
          if (solicitante.departamentoId) {
            const [dept] = await db.select({ nome: departamentos.nome }).from(departamentos).where(eq(departamentos.id, solicitante.departamentoId));
            solicitanteDepartamento = dept?.nome;
          }
        }
      }

      return {
        ...s,
        ckmNome,
        gestorNome,
        rhNome,
        solicitanteDepartamento,
        solicitanteLiderId,
      };
    })
  );

  return solicitacoesComNomes;
}

export async function getSolicitacaoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db
    .select()
    .from(solicitacoesAcoes)
    .where(eq(solicitacoesAcoes.id, id));

  return result || null;
}

export async function emitirParecerCKM(id: number, data: {
  parecerTipo: 'com_aderencia' | 'sem_aderencia';
  parecerTexto: string;
  adminId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(solicitacoesAcoes).set({
    ckmParecerTipo: data.parecerTipo,
    ckmParecerTexto: data.parecerTexto,
    ckmParecerPor: data.adminId,
    ckmParecerEm: new Date(),
    statusGeral: "aguardando_gestor",
  }).where(eq(solicitacoesAcoes.id, id));
}

export async function decisaoGestor(id: number, data: {
  decisao: 'aprovado' | 'reprovado';
  justificativa: string;
  gestorId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const novoStatus = data.decisao === 'aprovado' ? 'aguardando_rh' : 'vetada_gestor';

  await db.update(solicitacoesAcoes).set({
    gestorDecisao: data.decisao,
    gestorJustificativa: data.justificativa,
    gestorId: data.gestorId,
    gestorDecisaoEm: new Date(),
    statusGeral: novoStatus,
  }).where(eq(solicitacoesAcoes.id, id));
}

export async function decisaoRH(id: number, data: {
  decisao: 'aprovado' | 'reprovado';
  justificativa: string;
  rhId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.decisao === 'reprovado') {
    await db.update(solicitacoesAcoes).set({
      rhDecisao: data.decisao,
      rhJustificativa: data.justificativa,
      rhId: data.rhId,
      rhDecisaoEm: new Date(),
      statusGeral: "vetada_rh",
    }).where(eq(solicitacoesAcoes.id, id));
    return null;
  }

  // RH aprovou - incluir ação no PDI automaticamente
  const solicitacao = await getSolicitacaoById(id);
  if (!solicitacao) throw new Error("Solicitação não encontrada");

  // Criar a ação no PDI
  const acaoId = await createAction({
    pdiId: solicitacao.pdiId,
    macroId: solicitacao.macroId,
    microcompetencia: solicitacao.microcompetencia,
    titulo: solicitacao.titulo,
    descricao: solicitacao.descricao || undefined,
    prazo: new Date(solicitacao.prazo),
    status: "nao_iniciada",
  });

  // Atualizar solicitação
  await db.update(solicitacoesAcoes).set({
    rhDecisao: data.decisao,
    rhJustificativa: data.justificativa,
    rhId: data.rhId,
    rhDecisaoEm: new Date(),
    statusGeral: "aprovada",
    acaoIncluidaId: acaoId,
  }).where(eq(solicitacoesAcoes.id, id));

  return acaoId;
}


// ============= NORMAS E REGRAS =============

import { asc } from "drizzle-orm";

export async function listNormasRegras(apenasAtivas = true) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não conectado" });
  
  const conditions = apenasAtivas ? eq(normasRegras.ativo, true) : undefined;
  
  const result = await db
    .select()
    .from(normasRegras)
    .where(conditions)
    .orderBy(asc(normasRegras.ordem), asc(normasRegras.id));
  
  return result;
}

export async function createNormaRegra(data: {
  titulo: string;
  subtitulo?: string;
  conteudo: string;
  icone?: string;
  imagemUrl?: string;
  categoria?: string;
  ordem?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não conectado" });
  
  const result = await db.insert(normasRegras).values({
    titulo: data.titulo,
    subtitulo: data.subtitulo || null,
    conteudo: data.conteudo,
    icone: data.icone || 'BookOpen',
    imagemUrl: data.imagemUrl || null,
    categoria: data.categoria || 'geral',
    ordem: data.ordem || 0,
  });
  
  return { id: result[0].insertId };
}

export async function updateNormaRegra(id: number, data: {
  titulo?: string;
  subtitulo?: string;
  conteudo?: string;
  icone?: string;
  imagemUrl?: string | null;
  categoria?: string;
  ordem?: number;
  ativo?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não conectado" });
  
  await db.update(normasRegras).set(data).where(eq(normasRegras.id, id));
  return { success: true };
}

export async function deleteNormaRegra(id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não conectado" });
  
  await db.delete(normasRegras).where(eq(normasRegras.id, id));
  return { success: true };
}

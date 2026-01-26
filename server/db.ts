import { eq, and, isNull, not, inArray, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, pdis, competenciasMacros, actions, acoesHistorico, adjustmentRequests, adjustmentComments, departamentos, ciclos, evidences, evidenceFiles, evidenceTexts, notifications, pdiValidacoes } from "../drizzle/schema";
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
      .leftJoin(pdis, eq(actions.pdiId, pdis.id))
      .leftJoin(competenciasMacros, eq(actions.macroId, competenciasMacros.id))
      .leftJoin(users, eq(pdis.colaboradorId, users.id))
      .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
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

export async function deleteAction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Deletar em cascata: evidências, ajustes, histórico, depois a ação
    await db.delete(evidences).where(eq(evidences.actionId, id));
    await db.delete(adjustmentRequests).where(eq(adjustmentRequests.actionId, id));
    await db.delete(acoesHistorico).where(eq(acoesHistorico.actionId, id));
    await db.delete(actions).where(eq(actions.id, id));
    
    console.log('[deleteAction] Ação deletada com cascata:', id);
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
  
  // Buscar validação do líder
  const [validacao] = await db.select().from(pdiValidacoes).where(eq(pdiValidacoes.pdiId, pdi.id));
  
  return {
    ...pdi,
    colaboradorNome: user?.name || "—",
    departamentoNome: dept?.nome || "—",
    cicloNome: ciclo?.nome || "—",
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
      
      // Buscar contagem real de ações da tabela actions
      const pdiActions = await db.select().from(actions).where(eq(actions.pdiId, pdi.id));
      const actionCount = pdiActions.length;
      const completedCount = pdiActions.filter(a => a.status === 'concluida').length;
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
        departamentoNome: dept?.nome || "—",
        cicloNome: ciclo?.nome || "—",
        ciclo: ciclo || null,
        lider: user || null,
        liderNome: user?.name || "—",
        departamentoId: user?.departamentoId || 0,
        totalAcoes: pdi.totalAcoes || 0,
        acoesConcluidasTotal: pdi.acoesConcluidasTotal || 0,
        // Campos calculados em tempo real
        actionCount,
        completedCount,
        progressPercentage,
        // Campo de validação do líder
        validadoEm: validacao?.aprovadoEm || null,
        validadoPor: validacao?.liderId || null,
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
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pdis).values({
    colaboradorId: data.colaboradorId,
    cicloId: data.cicloId,
    titulo: data.titulo,
    objetivoGeral: data.objetivoGeral || "",
    status: "em_andamento",
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result[0]?.insertId || 0;
}

export async function updatePDI(
  id: number,
  data: Partial<{ titulo: string; descricao: string; status: string }>
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
  departamentoId?: number;
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
    departamentoId: number;
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
    .where(eq(users.leaderId, leaderId))
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
    .map(macro => ({
      id: macro.id,
      nome: macro.nome,
      totalAcoes: contagemPorMacro[macro.id] || 0,
      percentual: totalAcoes > 0 
        ? Math.round(((contagemPorMacro[macro.id] || 0) / totalAcoes) * 100) 
        : 0,
    }))
    .filter(item => item.totalAcoes > 0) // Apenas competências com ações
    .sort((a, b) => b.totalAcoes - a.totalAcoes) // Ordenar por quantidade de ações (decrescente)
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

export async function getUsersByRole(role: string) {
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

// Função para buscar evidências por IDs de ações
export async function getEvidencesByActionIds(actionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
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
    .where(inArray(evidences.actionId, actionIds));

  return result;
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

  // Buscar todas as tabelas e seus dados
  const tables = [
    'users', 'departamentos', 'ciclos', 'pdis', 'actions', 
    'competenciasBlocos', 'competenciasMacros', 'competenciasMicros',
    'evidences', 'evidenceFiles', 'evidenceTexts', 'notifications',
    'adjustmentRequests', 'adjustmentComments', 'acoesHistorico', 'pdi_validacoes'
  ];

  let sqlContent = `-- BACKUP DO SISTEMA PDI\n-- Gerado em: ${new Date().toISOString()}\n\n`;
  let totalRecords = 0;

  for (const tableName of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
      const rows = (result as any)[0];
      
      if (rows && rows.length > 0) {
        sqlContent += `-- Tabela: ${tableName} (${rows.length} registros)\n`;
        totalRecords += rows.length;

        for (const row of rows) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row).map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'number') return v;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          
          sqlContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
        }
        sqlContent += '\n';
      }
    } catch (error) {
      console.log(`Tabela ${tableName} não encontrada ou erro:`, error);
    }
  }

  return { sqlContent, totalRecords };
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

export async function getAllUsersForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT u.id, u.name, u.email, u.cpf, u.cargo, u.role, u.ativo, u.createdAt,
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
    sql`SELECT p.id, p.status, p.progresso, p.createdAt, p.updatedAt,
               u.name as userName,
               c.nome as cicloNome
        FROM pdis p
        LEFT JOIN users u ON p.userId = u.id
        LEFT JOIN ciclos c ON p.cicloId = c.id
        ORDER BY p.createdAt DESC`
  );

  return (result as any)[0];
}

export async function getAllAcoesForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT a.id, a.pdiId, a.titulo, a.tipo, a.status, a.dataInicio, a.dataFim, a.progresso,
               u.name as userName
        FROM actions a
        LEFT JOIN pdis p ON a.pdiId = p.id
        LEFT JOIN users u ON p.userId = u.id
        ORDER BY a.createdAt DESC`
  );

  return (result as any)[0];
}

export async function getAllCompetenciasForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const competencias: any[] = [];

  // Blocos
  const blocos = await db.execute(sql`SELECT id, nome, descricao, ativo FROM competenciasBlocos ORDER BY nome`);
  for (const b of (blocos as any)[0]) {
    competencias.push({ tipo: 'Bloco', ...b });
  }

  // Macros
  const macros = await db.execute(sql`SELECT id, nome, descricao, ativo FROM competenciasMacros ORDER BY nome`);
  for (const m of (macros as any)[0]) {
    competencias.push({ tipo: 'Macro', ...m });
  }

  // Micros
  const micros = await db.execute(sql`SELECT id, nome, descricao, ativo FROM competenciasMicros ORDER BY nome`);
  for (const mi of (micros as any)[0]) {
    competencias.push({ tipo: 'Micro', ...mi });
  }

  return competencias;
}

export async function getAllDepartamentosForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`SELECT d.id, d.nome, d.descricao, d.ativo,
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
  role: 'admin' | 'lider' | 'colaborador';
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
        departamentoId = departamentos.get(user.departamentoNome.toLowerCase()) || null;
        if (!departamentoId) {
          results.push({ success: false, email: user.email, error: `Departamento "${user.departamentoNome}" não encontrado` });
          continue;
        }
      }

      // Buscar líder
      let leaderId: number | null = null;
      if (user.leaderEmail) {
        leaderId = usersByEmail.get(user.leaderEmail.toLowerCase()) || null;
        if (!leaderId) {
          results.push({ success: false, email: user.email, error: `Líder com email "${user.leaderEmail}" não encontrado` });
          continue;
        }
      }

      // Inserir usuário
      await db.execute(
        sql`INSERT INTO users (name, email, cpf, cargo, departamentoId, leaderId, role, ativo, createdAt, updatedAt)
            VALUES (${user.name}, ${user.email}, ${user.cpf}, ${user.cargo || null}, ${departamentoId}, ${leaderId}, ${user.role}, true, NOW(), NOW())`
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
  userEmail: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: { success: boolean; userEmail: string; titulo: string; error?: string }[] = [];

  // Buscar todos os usuários e seus PDIs ativos
  const usersResult = await db.execute(sql`SELECT id, email FROM users`);
  const usersByEmail = new Map((usersResult as any)[0].map((u: any) => [u.email.toLowerCase(), u.id]));

  for (const acao of acoes) {
    try {
      // Buscar usuário
      const userId = usersByEmail.get(acao.userEmail.toLowerCase());
      if (!userId) {
        results.push({ success: false, userEmail: acao.userEmail, titulo: acao.titulo, error: `Usuário com email "${acao.userEmail}" não encontrado` });
        continue;
      }

      // Buscar PDI ativo do usuário
      const pdiResult = await db.execute(
        sql`SELECT id FROM pdis WHERE userId = ${userId} ORDER BY createdAt DESC LIMIT 1`
      );
      const pdiId = (pdiResult as any)[0][0]?.id;

      if (!pdiId) {
        results.push({ success: false, userEmail: acao.userEmail, titulo: acao.titulo, error: `Usuário não possui PDI cadastrado` });
        continue;
      }

      // Inserir ação
      await db.execute(
        sql`INSERT INTO actions (pdiId, titulo, descricao, tipo, status, dataInicio, dataFim, progresso, createdAt, updatedAt)
            VALUES (${pdiId}, ${acao.titulo}, ${acao.descricao || null}, ${acao.tipo}, ${acao.status || 'pendente'}, 
                    ${acao.dataInicio || null}, ${acao.dataFim || null}, 0, NOW(), NOW())`
      );

      results.push({ success: true, userEmail: acao.userEmail, titulo: acao.titulo });
    } catch (error: any) {
      results.push({ success: false, userEmail: acao.userEmail, titulo: acao.titulo, error: error.message });
    }
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
        sql`SELECT id FROM pdis WHERE userId = ${userId} AND cicloId = ${cicloId}`
      );
      
      if ((existingPdi as any)[0].length > 0) {
        // Atualizar PDI existente
        await db.execute(
          sql`UPDATE pdis SET status = ${pdi.status || 'rascunho'}, observacoes = ${pdi.observacoes || null}, updatedAt = NOW()
              WHERE userId = ${userId} AND cicloId = ${cicloId}`
        );
        results.push({ success: true, userEmail: pdi.userEmail });
      } else {
        // Criar novo PDI
        await db.execute(
          sql`INSERT INTO pdis (userId, cicloId, status, observacoes, progresso, createdAt, updatedAt)
              VALUES (${userId}, ${cicloId}, ${pdi.status || 'rascunho'}, ${pdi.observacoes || null}, 0, NOW(), NOW())`
        );
        results.push({ success: true, userEmail: pdi.userEmail });
      }
    } catch (error: any) {
      results.push({ success: false, userEmail: pdi.userEmail, error: error.message });
    }
  }

  return results;
}

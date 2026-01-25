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

  const [result] = await db.select().from(pdis).where(eq(pdis.id, id));
  return result;
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
  return result;
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

  console.log('[createNotification] Criando notificação:', data);

  const result = await db.insert(notifications).values({
    destinatarioId: data.destinatarioId,
    tipo: data.tipo,
    titulo: data.titulo,
    mensagem: data.mensagem,
    referenciaId: data.referenciaId,
    lida: false,
    createdAt: new Date(),
  });

  console.log('[createNotification] Resultado:', result);
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

export async function getTop3CompetenciasComGaps(pdiId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: competenciasMacros.id,
      nome: competenciasMacros.nome,
      descricao: competenciasMacros.descricao,
    })
    .from(competenciasMacros)
    .limit(3);

  return result;
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

export async function getUsersByRole(role: "admin" | "lider" | "colaborador") {
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

  const [rows]: any = await db.execute(`
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
    LEFT JOIN actions a ON CAST(ar.actionId AS UNSIGNED) = a.id
    LEFT JOIN users u ON ar.solicitanteId = u.id
    WHERE ar.status IN ('pendente', 'pending')
    ORDER BY ar.createdAt DESC
  `);

  const result = rows.map((row: any) => ({
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
    }));
  return result;
}
export async function getAdjustmentRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
    .where(and(eq(adjustmentRequests.solicitanteId, userId), eq(adjustmentRequests.status, 'pendente')))
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


// ============= FUNÇÃO PARA BUSCAR SOLICITAÇÕES COM COMENTÁRIO DO LÍDER =============

export async function getAdjustmentRequestsWithLeaderComments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar solicitações pendentes que têm pelo menos um comentário de um líder
  const [rows]: any = await db.execute(sql`
    SELECT DISTINCT
      ar.id,
      ar.actionId,
      ar.solicitanteId,
      ar.tipoSolicitante,
      ar.justificativa,
      ar.camposAjustar,
      ar.dadosAntesAjuste,
      ar.status,
      ar.createdAt,
      ar.updatedAt,
      u_solicitante.name as solicitanteNome,
      u_solicitante.email as solicitanteEmail,
      d.nome as departamentoNome,
      a.titulo as acaoTitulo,
      a.descricao as acaoDescricao,
      a.prazo as acaoPrazo,
      p.titulo as pdiTitulo,
      cm.nome as competenciaNome,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', ac.id,
            'autorId', ac.autorId,
            'autorNome', u_autor.name,
            'autorRole', u_autor.role,
            'comentario', ac.comentario,
            'createdAt', ac.createdAt
          )
        )
        FROM adjustment_comments ac
        LEFT JOIN users u_autor ON ac.autorId = u_autor.id
        WHERE ac.adjustmentRequestId = ar.id
        AND u_autor.role = 'lider'
      ) as comentariosLider
    FROM adjustment_requests ar
    LEFT JOIN users u_solicitante ON ar.solicitanteId = u_solicitante.id
    LEFT JOIN departamentos d ON u_solicitante.departamentoId = d.id
    LEFT JOIN actions a ON ar.actionId = a.id
    LEFT JOIN pdis p ON a.pdiId = p.id
    LEFT JOIN competencias_macros cm ON a.macroId = cm.id
    WHERE ar.status = 'pendente'
    AND EXISTS (
      SELECT 1 FROM adjustment_comments ac2
      LEFT JOIN users u2 ON ac2.autorId = u2.id
      WHERE ac2.adjustmentRequestId = ar.id
      AND u2.role = 'lider'
    )
    ORDER BY ar.createdAt DESC
  `);

  return rows || [];
}

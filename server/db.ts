import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  departamentos,
  competenciasBlocos,
  competenciasMacros,
  competenciasMicros,
  ciclos,
  pdis,
  actions,
  evidences,
  evidenceFiles,
  evidenceTexts,
  adjustmentRequests,
  notifications,
  acoesHistorico
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      name: user.name || "Usuário",
      email: user.email || "",
      cpf: user.cpf || "",
      role: user.role || (user.openId === ENV.ownerOpenId ? 'admin' : 'colaborador'),
      cargo: user.cargo || "Não especificado",
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "cpf", "cargo"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      values[field] = value as any;
      updateSet[field] = value;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.leaderId !== undefined) {
      values.leaderId = user.leaderId;
      updateSet.leaderId = user.leaderId;
    }
    if (user.status !== undefined) {
      values.status = user.status;
      updateSet.status = user.status;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= GESTÃO DE USUÁRIOS =============

export async function countUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(users);
  return result.length;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(asc(users.name));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.cpf, cpf)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmailAndCpf(email: string, cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users)
    .where(and(eq(users.email, email), eq(users.cpf, cpf)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(userData: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(users).values(userData);
  return result;
}

export async function updateUser(id: number, userData: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(userData).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(users).where(eq(users.id, id));
}

export async function getSubordinates(leaderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.leaderId, leaderId));
}

// ============= GESTÃO DE DEPARTAMENTOS =============

export async function getAllDepartamentos() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(departamentos).orderBy(asc(departamentos.nome));
}

export async function getDepartamentoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(departamentos).where(eq(departamentos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDepartamento(data: { nome: string; descricao?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(departamentos).values(data);
  return result;
}

export async function updateDepartamento(id: number, data: Partial<{ nome: string; descricao: string; status: "ativo" | "inativo" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(departamentos).set(data).where(eq(departamentos.id, id));
}

export async function deleteDepartamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(departamentos).where(eq(departamentos.id, id));
}

// ============= GESTÃO DE COMPETÊNCIAS =============

export async function getAllBlocos() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(competenciasBlocos).orderBy(asc(competenciasBlocos.nome));
}

export async function getBlocoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competenciasBlocos).where(eq(competenciasBlocos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBloco(data: { nome: string; descricao?: string; status?: "ativo" | "inativo" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(competenciasBlocos).values(data);
  return result;
}

export async function updateBloco(id: number, data: Partial<{ nome: string; descricao: string; status: "ativo" | "inativo" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(competenciasBlocos).set(data).where(eq(competenciasBlocos.id, id));
}

export async function deleteBloco(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(competenciasBlocos).where(eq(competenciasBlocos.id, id));
}

export async function getAllMacros() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(competenciasMacros).orderBy(asc(competenciasMacros.nome));
}

export async function getMacrosByBlocoId(blocoId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(competenciasMacros).where(eq(competenciasMacros.blocoId, blocoId)).orderBy(asc(competenciasMacros.nome));
}

export async function getMacroById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competenciasMacros).where(eq(competenciasMacros.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMacro(data: { blocoId: number; nome: string; descricao?: string; status?: "ativo" | "inativo" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(competenciasMacros).values(data);
  return result;
}

export async function updateMacro(id: number, data: Partial<{ nome: string; descricao: string; status: "ativo" | "inativo" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(competenciasMacros).set(data).where(eq(competenciasMacros.id, id));
}

export async function deleteMacro(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(competenciasMacros).where(eq(competenciasMacros.id, id));
}

export async function getAllMicros() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(competenciasMicros).orderBy(asc(competenciasMicros.nome));
}

export async function getMicrosByMacroId(macroId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(competenciasMicros).where(eq(competenciasMicros.macroId, macroId)).orderBy(asc(competenciasMicros.nome));
}

export async function getMicroById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competenciasMicros).where(eq(competenciasMicros.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMicro(data: { macroId: number; nome: string; descricao?: string; status?: "ativo" | "inativo" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(competenciasMicros).values(data);
  return result;
}

export async function updateMicro(id: number, data: Partial<{ nome: string; descricao: string; status: "ativo" | "inativo" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(competenciasMicros).set(data).where(eq(competenciasMicros.id, id));
}

export async function deleteMicro(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(competenciasMicros).where(eq(competenciasMicros.id, id));
}

// ============= GESTÃO DE CICLOS =============

export async function getAllCiclos() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(ciclos).orderBy(desc(ciclos.dataInicio));
}

export async function getCicloById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ciclos).where(eq(ciclos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCiclo(data: { nome: string; dataInicio: Date; dataFim: Date; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(ciclos).values(data);
  return result;
}

export async function updateCiclo(id: number, data: Partial<{ nome: string; dataInicio: Date; dataFim: Date; status: "ativo" | "encerrado" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(ciclos).set(data).where(eq(ciclos.id, id));
}

export async function deleteCiclo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(ciclos).where(eq(ciclos.id, id));
}

// ============= GESTÃO DE NOTIFICAÇÕES =============

export async function createNotification(data: {
  destinatarioId: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  referenciaId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(notifications).values(data);
}

export async function getNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.destinatarioId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({ lida: true, readAt: new Date() }).where(eq(notifications.id, id));
}

export async function getUnreadNotificationsCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(notifications)
    .where(and(
      eq(notifications.destinatarioId, userId),
      eq(notifications.lida, false)
    ));
  return result.length;
}

// ============= GESTÃO DE PDIs =============

export async function getAllPDIs() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: pdis.id,
      colaboradorId: pdis.colaboradorId,
      cicloId: pdis.cicloId,
      titulo: pdis.titulo,
      objetivoGeral: pdis.objetivoGeral,
      status: pdis.status,
      createdAt: pdis.createdAt,
      updatedAt: pdis.updatedAt,
      createdBy: pdis.createdBy,
      colaborador: {
        id: users.id,
        nome: users.name,
        email: users.email,
      },
      ciclo: {
        id: ciclos.id,
        nome: ciclos.nome,
        dataInicio: ciclos.dataInicio,
        dataFim: ciclos.dataFim,
      },
    })
    .from(pdis)
    .leftJoin(users, eq(pdis.colaboradorId, users.id))
    .leftJoin(ciclos, eq(pdis.cicloId, ciclos.id))
    .orderBy(desc(pdis.createdAt));
  
  return result;
}

export async function getPDIById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pdis).where(eq(pdis.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPDIsByColaboradorId(colaboradorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pdis)
    .where(eq(pdis.colaboradorId, colaboradorId))
    .orderBy(desc(pdis.createdAt));
}

export async function getPDIsByCicloId(cicloId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(pdis)
    .where(eq(pdis.cicloId, cicloId))
    .orderBy(desc(pdis.createdAt));
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
  
  const result = await db.insert(pdis).values(data);
  return result;
}

export async function updatePDI(id: number, data: Partial<{
  status: "em_andamento" | "concluido" | "cancelado";
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(pdis).set(data).where(eq(pdis.id, id));
}

export async function deletePDI(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pdis).where(eq(pdis.id, id));
}

// ============= GESTÃO DE AÇÕES =============

export async function getAllActions() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: actions.id,
      pdiId: actions.pdiId,
      blocoCompetenciaId: actions.blocoId,
      macroCompetenciaId: actions.macroId,
      microCompetenciaId: actions.microId,
      nome: actions.nome,
      descricao: actions.descricao,
      prazo: actions.prazo,
      status: actions.status,
      createdAt: actions.createdAt,
      updatedAt: actions.updatedAt,
      createdBy: actions.createdBy,
      // PDI
      pdiTitulo: pdis.titulo,
      pdiColaboradorId: pdis.colaboradorId,
      // Colaborador
      colaboradorNome: users.name,
      colaboradorLeaderId: users.leaderId,
      colaboradorDepartamentoId: users.departamentoId,
      // Competências
      blocoNome: competenciasBlocos.nome,
      macroNome: competenciasMacros.nome,
      microNome: competenciasMicros.nome,
    })
    .from(actions)
    .leftJoin(pdis, eq(actions.pdiId, pdis.id))
    .leftJoin(users, eq(pdis.colaboradorId, users.id))
    .leftJoin(competenciasBlocos, eq(actions.blocoId, competenciasBlocos.id))
    .leftJoin(competenciasMacros, eq(actions.macroId, competenciasMacros.id))
    .leftJoin(competenciasMicros, eq(actions.microId, competenciasMicros.id))
    .orderBy(desc(actions.createdAt));
  
  // Reorganizar em objetos aninhados e adicionar contagem de solicitações
  const actionsWithAdjustments = await Promise.all(result.map(async (row) => {
    const adjustmentCount = await countAdjustmentRequestsByAction(row.id);
    
    return {
      id: row.id,
      pdiId: row.pdiId,
      blocoCompetenciaId: row.blocoCompetenciaId,
      macroCompetenciaId: row.macroCompetenciaId,
      microCompetenciaId: row.microCompetenciaId,
      nome: row.nome,
      descricao: row.descricao,
      prazo: row.prazo,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      adjustmentCount, // Adicionar contagem
      pdi: row.pdiTitulo ? {
        id: row.pdiId,
        titulo: row.pdiTitulo,
        colaboradorId: row.pdiColaboradorId,
        colaborador: row.colaboradorNome ? {
          nome: row.colaboradorNome,
          leaderId: row.colaboradorLeaderId,
          departamentoId: row.colaboradorDepartamentoId,
        } : null,
      } : null,
      blocoCompetencia: row.blocoNome ? { id: row.blocoCompetenciaId, nome: row.blocoNome } : null,
      macroCompetencia: row.macroNome ? { id: row.macroCompetenciaId, nome: row.macroNome } : null,
      microCompetencia: row.microNome ? { id: row.microCompetenciaId, nome: row.microNome } : null,
    };
  }));
  
  return actionsWithAdjustments;
}

export async function getActionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(actions).where(eq(actions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActionsByPDIId(pdiId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(actions)
    .where(eq(actions.pdiId, pdiId))
    .orderBy(desc(actions.createdAt));
  
  // Adicionar contagem de solicitações de ajuste
  const actionsWithAdjustments = await Promise.all(result.map(async (action) => {
    const adjustmentCount = await countAdjustmentRequestsByAction(action.id);
    return { ...action, adjustmentCount };
  }));
  
  return actionsWithAdjustments;
}

export async function getActionsByColaboradorId(colaboradorId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar PDIs do colaborador
  const colaboradorPDIs = await db.select().from(pdis)
    .where(eq(pdis.colaboradorId, colaboradorId));
  
  if (colaboradorPDIs.length === 0) return [];
  
  const pdiIds = colaboradorPDIs.map(p => p.id);
  
  // Buscar ações desses PDIs
  const result = await db.select().from(actions)
    .where(sql`${actions.pdiId} IN (${sql.join(pdiIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(actions.createdAt));
  
  // Adicionar contagem de solicitações de ajuste
  const actionsWithAdjustments = await Promise.all(result.map(async (action) => {
    const adjustmentCount = await countAdjustmentRequestsByAction(action.id);
    return { ...action, adjustmentCount };
  }));
  
  return actionsWithAdjustments;
}

export async function getPendingActionsForLeader(leaderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar colaboradores deste líder
  const colaboradores = await db.select().from(users)
    .where(eq(users.leaderId, leaderId));
  
  if (colaboradores.length === 0) return [];
  
  const colaboradorIds = colaboradores.map(c => c.id);
  
  // Buscar PDIs desses colaboradores
  const colaboradorPDIs = await db.select().from(pdis)
    .where(sql`${pdis.colaboradorId} IN (${sql.join(colaboradorIds.map(id => sql`${id}`), sql`, `)})`);
  
  if (colaboradorPDIs.length === 0) return [];
  
  const pdiIds = colaboradorPDIs.map(p => p.id);
  
  // Buscar ações pendentes de aprovação
  const result = await db.select().from(actions)
    .where(and(
      sql`${actions.pdiId} IN (${sql.join(pdiIds.map(id => sql`${id}`), sql`, `)})`,
      eq(actions.status, "pendente_aprovacao_lider")
    ))
    .orderBy(desc(actions.createdAt));
  
  // Adicionar contagem de solicitações de ajuste
  const actionsWithAdjustments = await Promise.all(result.map(async (action) => {
    const adjustmentCount = await countAdjustmentRequestsByAction(action.id);
    return { ...action, adjustmentCount };
  }));
  
  return actionsWithAdjustments;
}

export async function createAction(data: {
  pdiId: number;
  blocoId: number;
  macroId: number;
  microId: number;
  nome: string;
  descricao: string;
  prazo: Date;
  createdBy: number;
  status?: "pendente_aprovacao_lider" | "aprovada_lider" | "reprovada_lider" | "em_andamento" | "em_discussao" | "evidencia_enviada" | "evidencia_aprovada" | "evidencia_reprovada" | "correcao_solicitada" | "concluida" | "vencida" | "cancelada";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(actions).values({
    ...data,
    status: data.status || "pendente_aprovacao_lider"
  });
  return result;
}

export async function updateAction(id: number, data: Partial<{
  nome: string;
  descricao: string;
  blocoId: number;
  macroId: number;
  microId: number;
  prazo: Date;
  status: "pendente_aprovacao_lider" | "aprovada_lider" | "reprovada_lider" | "em_andamento" | "em_discussao" | "evidencia_enviada" | "evidencia_aprovada" | "evidencia_reprovada" | "correcao_solicitada" | "concluida" | "vencida" | "cancelada";
  justificativaReprovacaoLider: string;
}>)  {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(actions).set(data).where(eq(actions.id, id));
}

export async function deleteAction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(actions).where(eq(actions.id, id));
}

// ============= HISTÓRICO DE AÇÕES =============

export async function createAcaoHistorico(data: {
  actionId: number;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  motivoAlteracao: string | null;
  alteradoPor: number;
  solicitacaoAjusteId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(acoesHistorico).values(data);
  return result;
}

export async function getAcaoHistorico(actionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(acoesHistorico)
    .where(eq(acoesHistorico.actionId, actionId))
    .orderBy(desc(acoesHistorico.createdAt));
}

// ============= SOLICITAÇÕES DE AJUSTE =============

export async function createAdjustmentRequest(data: {
  actionId: number;
  solicitanteId: number;
  tipoSolicitante: "colaborador" | "lider";
  justificativa: string;
  camposAjustar: string; // JSON stringified
  status?: "pendente" | "aprovada" | "reprovada";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(adjustmentRequests).values({
    ...data,
    status: data.status || "pendente"
  });
  
  // Retornar o ID inserido
  const insertId = (result as any)[0]?.insertId || (result as any).insertId;
  return { id: insertId, ...data };
}

export async function getAdjustmentRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(adjustmentRequests)
    .where(eq(adjustmentRequests.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingAdjustmentRequests() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(adjustmentRequests)
    .where(eq(adjustmentRequests.status, "pendente"))
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function updateAdjustmentRequest(id: number, data: Partial<{
  status: "pendente" | "aprovada" | "reprovada";
  justificativaAdmin: string;
  evaluatedAt: Date;
  evaluatedBy: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(adjustmentRequests).set(data).where(eq(adjustmentRequests.id, id));
}

export async function countAdjustmentRequestsByAction(actionId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select().from(adjustmentRequests)
    .where(eq(adjustmentRequests.actionId, actionId));
  
  return result.length;
}

export async function getPendingAdjustmentRequestsByAction(actionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(adjustmentRequests)
    .where(and(
      eq(adjustmentRequests.actionId, actionId),
      eq(adjustmentRequests.status, "pendente")
    ))
    .orderBy(desc(adjustmentRequests.createdAt));
}

// ============= FUNÇÕES AUXILIARES PARA NOTIFICAÇÕES =============

export async function getUnreadNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(notifications)
    .where(and(
      eq(notifications.destinatarioId, userId),
      eq(notifications.lida, false)
    ))
    .orderBy(desc(notifications.createdAt));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({
    lida: true,
    readAt: new Date()
  }).where(and(
    eq(notifications.destinatarioId, userId),
    eq(notifications.lida, false)
  ));
}

export async function getAllMicrosWithMacroAndBloco() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: competenciasMicros.id,
      nome: competenciasMicros.nome,
      macroId: competenciasMicros.macroId,
      macroNome: competenciasMacros.nome,
      blocoId: competenciasMacros.blocoId,
      blocoNome: competenciasBlocos.nome,
    })
    .from(competenciasMicros)
    .innerJoin(competenciasMacros, eq(competenciasMicros.macroId, competenciasMacros.id))
    .innerJoin(competenciasBlocos, eq(competenciasMacros.blocoId, competenciasBlocos.id))
    .orderBy(asc(competenciasMicros.nome));
}

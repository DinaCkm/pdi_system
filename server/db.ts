import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { alias } from "drizzle-orm/mysql-core";
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
  adjustmentComments,
  InsertAdjustmentComment,
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

export async function getUsersByRole(role: "admin" | "lider" | "colaborador") {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.role, role));
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

export async function updateDepartamento(id: number, data: Partial<{ nome: string; descricao: string; status: "ativo" | "inativo"; leaderId: number | null }>) {
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

export async function getBlocoByNome(nome: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competenciasBlocos).where(eq(competenciasBlocos.nome, nome)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBloco(data: { nome: string; descricao?: string; status?: "ativo" | "inativo" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(competenciasBlocos).values(data);
  const insertId = (result as any).insertId || (result as any)[0]?.insertId;
  return { id: insertId };
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

export async function getMacroByNomeAndBlocoId(nome: string, blocoId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competenciasMacros)
    .where(and(eq(competenciasMacros.nome, nome), eq(competenciasMacros.blocoId, blocoId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMacro(data: { blocoId: number; nome: string; descricao?: string; status?: "ativo" | "inativo" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(competenciasMacros).values(data);
  const insertId = (result as any).insertId || (result as any)[0]?.insertId;
  return { id: insertId };
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

export async function getMicroByNomeAndMacroId(nome: string, macroId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competenciasMicros)
    .where(and(eq(competenciasMicros.nome, nome), eq(competenciasMicros.macroId, macroId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMicro(data: { macroId: number; nome: string; descricao?: string; status?: "ativo" | "inativo" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(competenciasMicros).values(data);
  const insertId = (result as any).insertId || (result as any)[0]?.insertId;
  return { id: insertId };
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
  const insertId = (result as any).insertId as number;
  return { id: insertId };
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
  
  // Buscar PDIs com dados de colaborador, ciclo e líder usando leftJoin
  // Criar alias para a tabela users para buscar o líder
  const liderTable = alias(users, 'lider');
  
  const pdisList = await db.select({
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
      name: users.name,
      email: users.email,
      leaderId: users.leaderId,
    },
    ciclo: {
      id: ciclos.id,
      nome: ciclos.nome,
      dataInicio: ciclos.dataInicio,
      dataFim: ciclos.dataFim,
    },
    lider: {
      id: liderTable.id,
      name: liderTable.name,
      email: liderTable.email,
    },
  })
  .from(pdis)
  .leftJoin(users, eq(pdis.colaboradorId, users.id))
  .leftJoin(liderTable, eq(users.leaderId, liderTable.id))
  .leftJoin(ciclos, eq(pdis.cicloId, ciclos.id))
  .where(eq(pdis.colaboradorId, colaboradorId))
  .orderBy(desc(pdis.createdAt));
  
  // Para cada PDI, buscar estatísticas de ações
  const pdisWithStats = await Promise.all(
    pdisList.map(async (pdi) => {
      const acoesList = await db.select().from(actions)
        .where(eq(actions.pdiId, pdi.id));
      
      const totalActions = acoesList.length;
      const completedActions = acoesList.filter(a => a.status === 'concluida').length;
      const inProgressActions = acoesList.filter(a => a.status === 'em_andamento').length;
      const pendingActions = acoesList.filter(a => 
        a.status === 'pendente_aprovacao_lider' || 
        a.status === 'aprovada_lider'
      ).length;
      
      return {
        ...pdi,
        actionCount: totalActions,
        completedCount: completedActions,
        inProgressCount: inProgressActions,
        pendingCount: pendingActions,
        progressPercentage: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0
      };
    })
  );
  
  return pdisWithStats;
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
  
  // Buscar ações desses PDIs com dados estruturados
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
    .where(sql`${actions.pdiId} IN (${sql.join(pdiIds.map(id => sql`${id}`), sql`, `)})`)
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
      adjustmentCount,
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
  
  // Retornar o ID da ação criada
  const insertId = (result as any).insertId as number;
  return { insertId };
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
  
  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      actionNome: actions.nome,
      actionDescricao: actions.descricao,
      actionPrazo: actions.prazo,
      solicitanteId: adjustmentRequests.solicitanteId,
      solicitanteName: users.name,
      tipoSolicitante: adjustmentRequests.tipoSolicitante,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
    })
    .from(adjustmentRequests)
    .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .innerJoin(users, eq(adjustmentRequests.solicitanteId, users.id))
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

// ============= FUNÇÕES PARA COMENTÁRIOS DE SOLICITAÇÕES DE AJUSTE =============

export async function createAdjustmentComment(data: InsertAdjustmentComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [comment] = await db.insert(adjustmentComments).values(data).$returningId();
  return await getAdjustmentCommentById(comment.id);
}

export async function getAdjustmentCommentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [comment] = await db
    .select({
      id: adjustmentComments.id,
      adjustmentRequestId: adjustmentComments.adjustmentRequestId,
      autorId: adjustmentComments.autorId,
      autorNome: users.name,
      autorRole: users.role,
      comentario: adjustmentComments.comentario,
      createdAt: adjustmentComments.createdAt,
    })
    .from(adjustmentComments)
    .innerJoin(users, eq(adjustmentComments.autorId, users.id))
    .where(eq(adjustmentComments.id, id));
  
  return comment || null;
}

export async function getCommentsByAdjustmentRequestId(adjustmentRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: adjustmentComments.id,
      adjustmentRequestId: adjustmentComments.adjustmentRequestId,
      autorId: adjustmentComments.autorId,
      autorNome: users.name,
      autorRole: users.role,
      comentario: adjustmentComments.comentario,
      createdAt: adjustmentComments.createdAt,
    })
    .from(adjustmentComments)
    .innerJoin(users, eq(adjustmentComments.autorId, users.id))
    .where(eq(adjustmentComments.adjustmentRequestId, adjustmentRequestId))
    .orderBy(asc(adjustmentComments.createdAt));
}

export async function getPendingAdjustmentRequestsWithDetails() {
  const db = await getDb();
  if (!db) {
    console.log('❌ Erro: Conexão com banco não estabelecida');
    return [];
  }
  
  console.log('🔍 Iniciando busca de solicitações pendentes...');
  
  try {
    const result = await db
      .select({
        id: adjustmentRequests.id,
        actionId: adjustmentRequests.actionId,
        actionNome: actions.nome,
        solicitanteId: adjustmentRequests.solicitanteId,
        solicitanteNome: users.name,
        tipoSolicitante: adjustmentRequests.tipoSolicitante,
        justificativa: adjustmentRequests.justificativa,
        camposAjustar: adjustmentRequests.camposAjustar,
        status: adjustmentRequests.status,
        createdAt: adjustmentRequests.createdAt,
      })
      .from(adjustmentRequests)
      .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
      .innerJoin(users, eq(adjustmentRequests.solicitanteId, users.id))
      .where(eq(adjustmentRequests.status, 'pendente'))
      .orderBy(desc(adjustmentRequests.createdAt));
    
    console.log(`✅ Query executada com sucesso. Total de solicitações: ${result.length}`);
    console.log('📊 Dados retornados:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
}

export async function getPendingAdjustmentRequestsByLeaderId(leaderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      actionNome: actions.nome,
      solicitanteId: adjustmentRequests.solicitanteId,
      solicitanteNome: users.name,
      tipoSolicitante: adjustmentRequests.tipoSolicitante,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
    })
    .from(adjustmentRequests)
    .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .innerJoin(pdis, eq(actions.pdiId, pdis.id))
    .innerJoin(users, eq(adjustmentRequests.solicitanteId, users.id))
    .where(and(
      eq(adjustmentRequests.status, 'pendente'),
      eq(users.leaderId, leaderId)
    ))
    .orderBy(desc(adjustmentRequests.createdAt));
}

// ============= SINCRONIZAÇÃO DE LÍDER POR DEPARTAMENTO =============

/**
 * Sincroniza o líder de todos os usuários de um departamento
 * Quando o líder do departamento é alterado, todos os usuários daquele departamento
 * automaticamente herdam o novo líder
 */
export async function syncDepartmentLeader(departamentoId: number, leaderId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Atualizar leaderId de todos os usuários do departamento
  await db.update(users)
    .set({ leaderId: leaderId })
    .where(eq(users.departamentoId, departamentoId));
}


// ============= FUNÇÕES AUXILIARES PARA IMPORTAÇÃO DE AÇÕES =============

/**
 * Busca ciclo por nome
 */
export async function getCicloByNome(nome: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(ciclos)
    .where(eq(ciclos.nome, nome))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca PDI por colaborador e ciclo
 */
export async function getPDIByColaboradorAndCiclo(colaboradorId: number, cicloId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(pdis)
    .where(and(
      eq(pdis.colaboradorId, colaboradorId),
      eq(pdis.cicloId, cicloId)
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca microcompetência por nome
 */
export async function getMicroByNome(nome: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(competenciasMicros)
    .where(eq(competenciasMicros.nome, nome))
    .limit(1);
  
  return result[0] || null;
}



/**
 * Busca ação por PDI e nome (para evitar duplicatas)
 */
export async function getActionByPDIAndNome(pdiId: number, nome: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(actions)
    .where(and(
      eq(actions.pdiId, pdiId),
      eq(actions.nome, nome)
    ))
    .limit(1);
  
  return result[0] || null;
}

// ============= GESTÃO DE EVIDÊNCIAS =============

export async function createEvidence(data: {
  actionId: number;
  colaboradorId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [evidence] = await db.insert(evidences).values(data).$returningId();
  return evidence.id;
}

export async function addEvidenceFile(data: {
  evidenceId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  fileKey: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(evidenceFiles).values(data);
}

export async function addEvidenceText(data: {
  evidenceId: number;
  titulo?: string;
  texto: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(evidenceTexts).values(data);
}

export async function getEvidencesByActionId(actionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const evidencesList = await db
    .select({
      id: evidences.id,
      actionId: evidences.actionId,
      colaboradorId: evidences.colaboradorId,
      status: evidences.status,
      justificativaAdmin: evidences.justificativaAdmin,
      createdAt: evidences.createdAt,
      evaluatedAt: evidences.evaluatedAt,
      evaluatedBy: evidences.evaluatedBy,
      colaboradorNome: users.name,
      evaluatorNome: sql<string>`evaluator.name`.as('evaluatorNome'),
    })
    .from(evidences)
    .leftJoin(users, eq(evidences.colaboradorId, users.id))
    .leftJoin(sql`${users} as evaluator`, sql`${evidences.evaluatedBy} = evaluator.id`)
    .where(eq(evidences.actionId, actionId))
    .orderBy(desc(evidences.createdAt));
  
  // Para cada evidência, buscar arquivos e textos
  const evidencesWithDetails = await Promise.all(
    evidencesList.map(async (evidence) => {
      const files = await db
        .select()
        .from(evidenceFiles)
        .where(eq(evidenceFiles.evidenceId, evidence.id));
      
      const texts = await db
        .select()
        .from(evidenceTexts)
        .where(eq(evidenceTexts.evidenceId, evidence.id));
      
      return {
        ...evidence,
        files,
        texts,
      };
    })
  );
  
  return evidencesWithDetails;
}

export async function getEvidenceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [evidence] = await db
    .select({
      id: evidences.id,
      actionId: evidences.actionId,
      colaboradorId: evidences.colaboradorId,
      status: evidences.status,
      justificativaAdmin: evidences.justificativaAdmin,
      createdAt: evidences.createdAt,
      evaluatedAt: evidences.evaluatedAt,
      evaluatedBy: evidences.evaluatedBy,
      colaboradorNome: users.name,
      colaboradorEmail: users.email,
    })
    .from(evidences)
    .leftJoin(users, eq(evidences.colaboradorId, users.id))
    .where(eq(evidences.id, id))
    .limit(1);
  
  if (!evidence) return null;
  
  // Buscar arquivos e textos
  const files = await db
    .select()
    .from(evidenceFiles)
    .where(eq(evidenceFiles.evidenceId, evidence.id));
  
  const texts = await db
    .select()
    .from(evidenceTexts)
    .where(eq(evidenceTexts.evidenceId, evidence.id));
  
  // Buscar informações da ação
  const action = await getActionById(evidence.actionId);
  
  return {
    ...evidence,
    files,
    texts,
    action,
  };
}

export async function getPendingEvidences() {
  const db = await getDb();
  if (!db) return [];
  
  const evidencesList = await db
    .select({
      id: evidences.id,
      actionId: evidences.actionId,
      colaboradorId: evidences.colaboradorId,
      status: evidences.status,
      createdAt: evidences.createdAt,
      colaboradorNome: users.name,
      colaboradorEmail: users.email,
      actionNome: actions.nome,
      actionDescricao: actions.descricao,
      pdiId: actions.pdiId,
    })
    .from(evidences)
    .leftJoin(users, eq(evidences.colaboradorId, users.id))
    .leftJoin(actions, eq(evidences.actionId, actions.id))
    .where(eq(evidences.status, "aguardando_avaliacao"))
    .orderBy(desc(evidences.createdAt));
  
  // Para cada evidência, buscar arquivos e textos
  const evidencesWithDetails = await Promise.all(
    evidencesList.map(async (evidence) => {
      const files = await db
        .select()
        .from(evidenceFiles)
        .where(eq(evidenceFiles.evidenceId, evidence.id));
      
      const texts = await db
        .select()
        .from(evidenceTexts)
        .where(eq(evidenceTexts.evidenceId, evidence.id));
      
      return {
        ...evidence,
        files,
        texts,
      };
    })
  );
  
  return evidencesWithDetails;
}

export async function updateEvidenceStatus(
  id: number,
  data: {
    status: "aguardando_avaliacao" | "aprovada" | "reprovada" | "correcao_solicitada";
    justificativaAdmin?: string;
    evaluatedBy?: number;
    evaluatedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(evidences).set(data).where(eq(evidences.id, id));
}

import { eq, and, or, desc, asc } from "drizzle-orm";
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
  notifications
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

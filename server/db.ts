import { eq, and, or, desc, asc, sql, inArray, ne, isNotNull } from "drizzle-orm";
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
  notifications,
  userDepartmentRoles,
  auditLog,
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

  // Verificar se o usuário já existe
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.openId, user.openId))
    .limit(1);

  if (existingUser.length > 0) {
    // Atualizar usuário existente
    const { openId, ...updateData } = user;
    await db.update(users).set(updateData).where(eq(users.openId, openId));
  } else {
    // Inserir novo usuário
    await db.insert(users).values(user);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0] || null;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(users.name);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.cpf, cpf)).limit(1);
  return result[0] || null;
}

export async function createUser(data: {
  name: string;
  email: string;
  cpf: string;
  role: "admin" | "lider" | "colaborador";
  cargo: string;
  leaderId?: number;
  departamentoId?: number;
  openId?: string;
  status?: "ativo" | "inativo";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(data).execute();
  return result[0]?.insertId || 0;
}

export async function updateUser(
  id: number,
  data: Partial<{
    name: string;
    email: string;
    cpf: string;
    role: "admin" | "lider" | "colaborador";
    cargo: string;
    leaderId: number | null;
    departamentoId: number | null;
    status: "ativo" | "inativo";
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

// ============= GESTÃO DE DEPARTAMENTOS =============

export async function getAllDepartamentos() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(departamentos).orderBy(departamentos.nome);
}

export async function getDepartamentoById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(departamentos)
    .where(eq(departamentos.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createDepartamento(data: {
  nome: string;
  descricao?: string;
  leaderId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Forçar status ativo se não fornecido
  const normalizedData = {
    ...data,
    status: "ativo",
  };

  const result = await db.insert(departamentos).values(normalizedData).execute();
  return result[0]?.insertId || 0;
}

export async function updateDepartamento(
  id: number,
  data: Partial<{
    nome: string;
    descricao: string;
    leaderId: number | null;
    status: "ativo" | "inativo";
  }>
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

// ============= GESTÃO DE CICLOS =============

export async function getAllCiclos() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ciclos).orderBy(desc(ciclos.createdAt));
}

export async function getCicloById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(ciclos).where(eq(ciclos.id, id)).limit(1);
  return result[0] || null;
}

export async function getCicloByNomeExato(nome: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(ciclos)
    .where(eq(ciclos.nome, nome))
    .limit(1);

  return result[0] || null;
}

export async function createCiclo(data: {
  nome: string;
  descricao?: string;
  dataInicio: Date;
  dataFim: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Normalizar datas para formato MySQL
  const normalizedData = {
    ...data,
    dataInicio: data.dataInicio instanceof Date ? data.dataInicio.toISOString().slice(0, 19).replace('T', ' ') : data.dataInicio,
    dataFim: data.dataFim instanceof Date ? data.dataFim.toISOString().slice(0, 19).replace('T', ' ') : data.dataFim,
  };

  const result = await db.insert(ciclos).values(normalizedData as any).execute();
  return result[0]?.insertId || 0;
}

export async function updateCiclo(
  id: number,
  data: Partial<{
    nome: string;
    descricao: string;
    dataInicio: Date;
    dataFim: Date;
    status: "ativo" | "inativo";
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(ciclos).set(data).where(eq(ciclos.id, id));
}

export async function deleteCiclo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(ciclos).where(eq(ciclos.id, id));
}

// ============= GESTÃO DE COMPETÊNCIAS =============

export async function getAllBlocos() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(competenciasBlocos).where(eq(competenciasBlocos.status, 'ativo')).orderBy(competenciasBlocos.nome);
}

export async function getBlocoById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(competenciasBlocos)
    .where(eq(competenciasBlocos.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createBloco(data: { nome: string; descricao?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!data.nome) throw new Error("nome é obrigatório");

  const result = await db.insert(competenciasBlocos).values({
    nome: data.nome,
    descricao: data.descricao || null,
    status: 'ativo',
  }).execute();
  
  const insertId = result[0]?.insertId;
  if (!insertId) throw new Error("Falha ao inserir bloco competência");
  
  return { id: insertId };
}

export async function updateBloco(id: number, data: Partial<{ nome: string; descricao: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(competenciasBlocos).set(data).where(eq(competenciasBlocos.id, id));
}

export async function deleteBloco(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete: marcar como inativo em vez de apagar
  await db.update(competenciasBlocos).set({ status: 'inativo' }).where(eq(competenciasBlocos.id, id));
  
  // Também marcar todas as macros e micros como inativas
  const macros = await db.select().from(competenciasMacros).where(eq(competenciasMacros.blocoId, id));
  for (const macro of macros) {
    await db.update(competenciasMacros).set({ status: 'inativo' }).where(eq(competenciasMacros.id, macro.id));
    const micros = await db.select().from(competenciasMicros).where(eq(competenciasMicros.macroId, macro.id));
    for (const micro of micros) {
      await db.update(competenciasMicros).set({ status: 'inativo' }).where(eq(competenciasMicros.id, micro.id));
    }
  }
}

export async function getMacrosByBlocoId(blocoId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(competenciasMacros)
    .where(and(eq(competenciasMacros.blocoId, blocoId), eq(competenciasMacros.status, 'ativo')))
    .orderBy(competenciasMacros.nome);
}

export async function getMacroById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(competenciasMacros)
    .where(eq(competenciasMacros.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createMacro(data: { blocoId: number; nome: string; descricao?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!data.blocoId) throw new Error("blocoId é obrigatório");
  if (!data.nome) throw new Error("nome é obrigatório");

  const result = await db.insert(competenciasMacros).values({
    blocoId: data.blocoId,
    nome: data.nome,
    descricao: data.descricao || null,
    status: 'ativo',
  }).execute();
  
  const insertId = result[0]?.insertId;
  if (!insertId) throw new Error("Falha ao inserir macro competência");
  
  return { id: insertId };
}

export async function updateMacro(
  id: number,
  data: Partial<{ nome: string; descricao: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(competenciasMacros).set(data).where(eq(competenciasMacros.id, id));
}

export async function deleteMacro(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete: marcar como inativo em vez de apagar
  await db.update(competenciasMacros).set({ status: 'inativo' }).where(eq(competenciasMacros.id, id));
  
  // Também marcar todas as micros como inativas
  const micros = await db.select().from(competenciasMicros).where(eq(competenciasMicros.macroId, id));
  for (const micro of micros) {
    await db.update(competenciasMicros).set({ status: 'inativo' }).where(eq(competenciasMicros.id, micro.id));
  }
}

export async function getMicrosByMacroId(macroId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(competenciasMicros)
    .where(and(eq(competenciasMicros.macroId, macroId), eq(competenciasMicros.status, 'ativo')))
    .orderBy(competenciasMicros.nome);
}

export async function getMicroById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(competenciasMicros)
    .where(eq(competenciasMicros.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createMicro(data: { macroId: number; nome: string; descricao?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!data.macroId) throw new Error("macroId é obrigatório");
  if (!data.nome) throw new Error("nome é obrigatório");

  const result = await db.insert(competenciasMicros).values({
    macroId: data.macroId,
    nome: data.nome,
    descricao: data.descricao || null,
    status: 'ativo',
  }).execute();
  
  const insertId = result[0]?.insertId;
  if (!insertId) throw new Error("Falha ao inserir micro competência");
  
  return { id: insertId };
}

export async function updateMicro(
  id: number,
  data: Partial<{ nome: string; descricao: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(competenciasMicros).set(data).where(eq(competenciasMicros.id, id));
}

export async function deleteMicro(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete: marcar como inativo em vez de apagar
  await db.update(competenciasMicros).set({ status: 'inativo' }).where(eq(competenciasMicros.id, id));
}

// ============= GESTÃO DE PDIs =============

export async function getAllPDIs() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: pdis.id,
      colaboradorId: pdis.colaboradorId,
      colaboradorNome: users.name,
      cicloId: pdis.cicloId,
      cicloNome: ciclos.nome,
      titulo: pdis.titulo,
      status: pdis.status,
      createdAt: pdis.createdAt,
    })
    .from(pdis)
    .leftJoin(users, eq(pdis.colaboradorId, users.id))
    .leftJoin(ciclos, eq(pdis.cicloId, ciclos.id))
    .orderBy(desc(pdis.createdAt));
}

export async function getPDIById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: pdis.id,
      colaboradorId: pdis.colaboradorId,
      colaboradorNome: users.name,
      cicloId: pdis.cicloId,
      cicloNome: ciclos.nome,
      dataInicio: ciclos.dataInicio,
      dataFim: ciclos.dataFim,
      titulo: pdis.titulo,
      objetivoGeral: pdis.objetivoGeral,
      status: pdis.status,
      createdAt: pdis.createdAt,
      updatedAt: pdis.updatedAt,
    })
    .from(pdis)
    .leftJoin(users, eq(pdis.colaboradorId, users.id))
    .leftJoin(ciclos, eq(pdis.cicloId, ciclos.id))
    .where(eq(pdis.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getPDIsByColaboradorId(colaboradorId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(pdis)
    .where(eq(pdis.colaboradorId, colaboradorId))
    .orderBy(desc(pdis.createdAt));
}

export async function createPDI(data: {
  colaboradorId: number;
  cicloId: number;
  titulo: string;
  objetivoGeral?: string;
  status?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pdis).values(data).execute();
  return result[0]?.insertId || 0;
}

export async function updatePDI(
  id: number,
  data: Partial<{
    titulo: string;
    objetivoGeral: string;
    status: "em_andamento" | "concluido" | "cancelado";
  }>
) {
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

  const pdiAlias = alias(pdis, 'pdi');
  const userAlias = alias(users, 'user');
  const cicloAlias = alias(ciclos, 'ciclo');
  
  return await db
    .select({
      id: actions.id,
      pdiId: actions.pdiId,
      nome: actions.nome,
      descricao: actions.descricao,
      status: actions.status,
      prazo: actions.prazo,
      createdAt: actions.createdAt,
      pdiColaboradorId: pdiAlias.colaboradorId,
      colaboradorNome: userAlias.name,
      cicloNome: cicloAlias.nome,
      cicloDataInicio: cicloAlias.dataInicio,
      cicloDataFim: cicloAlias.dataFim,
    })
    .from(actions)
    .leftJoin(pdiAlias, eq(actions.pdiId, pdiAlias.id))
    .leftJoin(userAlias, eq(pdiAlias.colaboradorId, userAlias.id))
    .leftJoin(cicloAlias, eq(pdiAlias.cicloId, cicloAlias.id))
    .orderBy(desc(actions.createdAt));
}

export async function getActionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const pdiAlias = alias(pdis, 'pdi');
  const userAlias = alias(users, 'user');
  const cicloAlias = alias(ciclos, 'ciclo');

  const result = await db
    .select({
      id: actions.id,
      pdiId: actions.pdiId,
      nome: actions.nome,
      descricao: actions.descricao,
      status: actions.status,
      prazo: actions.prazo,
      createdAt: actions.createdAt,
      updatedAt: actions.updatedAt,
      colaboradorNome: userAlias.name,
      cicloNome: cicloAlias.nome,
      cicloDataInicio: cicloAlias.dataInicio,
      cicloDataFim: cicloAlias.dataFim,
    })
    .from(actions)
    .leftJoin(pdiAlias, eq(actions.pdiId, pdiAlias.id))
    .leftJoin(userAlias, eq(pdiAlias.colaboradorId, userAlias.id))
    .leftJoin(cicloAlias, eq(pdiAlias.cicloId, cicloAlias.id))
    .where(eq(actions.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getActionsByPDIId(pdiId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(actions)
    .where(eq(actions.pdiId, pdiId))
    .orderBy(desc(actions.createdAt));
}

export async function createAction(data: {
  pdiId: number;
  nome: string;
  descricao?: string;
  blocoId?: number;
  macroId?: number;
  microId?: number;
  prazo?: string | Date;
  status?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Normalização de Timestamp para MySQL (YYYY-MM-DD HH:mm:ss)
  const normalizedData = {
    ...data,
    prazo: data.prazo instanceof Date ? data.prazo.toISOString().slice(0, 19).replace('T', ' ') : data.prazo,
  };

  const result = await db.insert(actions).values(normalizedData as any).execute();
  return result[0]?.insertId || 0;
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
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedData = {
    ...data,
    prazo: data.prazo instanceof Date ? data.prazo.toISOString().slice(0, 19).replace('T', ' ') : data.prazo,
  };

  await db.update(actions).set(normalizedData as any).where(eq(actions.id, id));
}

export async function deleteAction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(actions).where(eq(actions.id, id));
}

// ============= GESTÃO DE SOLICITAÇÕES DE AJUSTE =============

export async function getAllAdjustmentRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(adjustmentRequests)
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getAdjustmentRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(adjustmentRequests)
    .where(eq(adjustmentRequests.id, id))
    .limit(1);

  return result[0] || null;
}

export async function createAdjustmentRequest(data: {
  actionId: number;
  solicitanteId: number;
  tipoSolicitante: 'colaborador' | 'lider';
  justificativa: string;
  camposAjustar: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(adjustmentRequests).values(data).execute();
  return result[0]?.insertId || 0;
}

export async function updateAdjustmentRequest(
  id: number,
  data: Partial<{
    status: "pendente" | "aprovada" | "reprovada";
    evaluatedAt: Date;
    evaluatedBy: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(adjustmentRequests).set(data).where(eq(adjustmentRequests.id, id));
}

export async function getPendingAdjustmentRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(adjustmentRequests)
    .where(eq(adjustmentRequests.status, 'pendente'))
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getPendingAdjustmentRequestsWithDetails() {
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
      solicitanteNome: users.name,
      tipoSolicitante: adjustmentRequests.tipoSolicitante,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
      evaluatedAt: adjustmentRequests.evaluatedAt,
    })
    .from(adjustmentRequests)
    .innerJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .innerJoin(users, eq(adjustmentRequests.solicitanteId, users.id))
    .where(eq(adjustmentRequests.status, 'pendente'))
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getPendingAdjustmentRequestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(adjustmentRequests)
    .where(and(
      eq(adjustmentRequests.solicitanteId, userId),
      eq(adjustmentRequests.status, 'pendente')
    ))
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getPendingAdjustmentRequestsByLeaderId(leaderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os departamentos onde o líder é LEADER
  const leaderDepartments = await db
    .select({ departmentId: userDepartmentRoles.departmentId })
    .from(userDepartmentRoles)
    .where(and(
      eq(userDepartmentRoles.userId, leaderId),
      eq(userDepartmentRoles.assignmentType, 'LEADER'),
      eq(userDepartmentRoles.status, 'ativo')
    ));
  
  if (leaderDepartments.length === 0) return [];
  
  const departmentIds = leaderDepartments.map(d => d.departmentId);
  
  // Buscar solicitações onde o solicitante está no departamento do líder
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
    .innerJoin(userDepartmentRoles, and(
      eq(userDepartmentRoles.userId, users.id),
      inArray(userDepartmentRoles.departmentId, departmentIds),
      eq(userDepartmentRoles.status, 'ativo')
    ))
    .where(eq(adjustmentRequests.status, 'pendente'))
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
 * Busca bloco por nome
 */
export async function getBlocoByNome(nome: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(competenciasBlocos)
    .where(eq(competenciasBlocos.nome, nome))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca macro por nome e blocoId
 */
export async function getMacroByNome(nome: string, blocoId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(competenciasMacros)
    .where(and(
      eq(competenciasMacros.nome, nome),
      eq(competenciasMacros.blocoId, blocoId)
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca micro por nome e macroId
 */
export async function getMicroByNome(nome: string, macroId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(competenciasMicros)
    .where(and(
      eq(competenciasMicros.nome, nome),
      eq(competenciasMicros.macroId, macroId)
    ))
    .limit(1);
  
  return result[0] || null;
}

// ============= GESTÃO DE EVIDÊNCIAS =============

export async function createEvidence(data: {
  actionId: number;
  colaboradorId: number;
  satisfactionScore?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(evidences).values(data).execute();
  return result[0]?.insertId || 0;
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
      satisfactionScore: evidences.satisfactionScore,
      createdAt: evidences.createdAt,
    })
    .from(evidences)
    .where(eq(evidences.actionId, actionId))
    .orderBy(desc(evidences.createdAt));
  
  return evidencesList;
}

// ============= GESTÃO DE COMENTÁRIOS DE AJUSTE =============

export async function addComment(data: {
  adjustmentRequestId: number;
  autorId: number;
  comentario: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(adjustmentComments).values(data);
}

export async function getComments(adjustmentRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
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
    .orderBy(asc(adjustmentComments.createdAt));
}

// ============= HISTÓRICO DE AÇÕES =============

export async function addActionHistory(data: {
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
  
  await db.insert(acoesHistorico).values(data);
}

export async function getActionHistory(actionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const historico = await db
    .select({
      id: acoesHistorico.id,
      campo: acoesHistorico.campo,
      valorAnterior: acoesHistorico.valorAnterior,
      valorNovo: acoesHistorico.valorNovo,
      motivoAlteracao: acoesHistorico.motivoAlteracao,
      alteradoPor: acoesHistorico.alteradoPor,
      alteradorNome: users.name,
      solicitacaoAjusteId: acoesHistorico.solicitacaoAjusteId,
      createdAt: acoesHistorico.createdAt,
    })
    .from(acoesHistorico)
    .leftJoin(users, eq(acoesHistorico.alteradoPor, users.id))
    .where(eq(acoesHistorico.actionId, actionId))
    .orderBy(desc(acoesHistorico.createdAt));
  
  return historico;
}

// ============= DUAL PROFILE PERMISSIONS =============

/**
 * Obter todos os papéis de um usuário em todos os departamentos
 */
export async function getUserRolesByDepartment(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: userDepartmentRoles.id,
      userId: userDepartmentRoles.userId,
      departmentId: userDepartmentRoles.departmentId,
      assignmentType: userDepartmentRoles.assignmentType,
      leaderUserId: userDepartmentRoles.leaderUserId,
      status: userDepartmentRoles.status,
      departmentName: departamentos.nome,
    })
    .from(userDepartmentRoles)
    .leftJoin(departamentos, eq(userDepartmentRoles.departmentId, departamentos.id))
    .where(and(
      eq(userDepartmentRoles.userId, userId),
      eq(userDepartmentRoles.status, 'ativo')
    ))
    .orderBy(departamentos.nome);
}

/**
 * Verificar se usuário é LÍDER de um departamento específico
 */
export async function isUserLeaderOfDepartment(userId: number, departmentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(userDepartmentRoles)
    .where(and(
      eq(userDepartmentRoles.userId, userId),
      eq(userDepartmentRoles.departmentId, departmentId),
      eq(userDepartmentRoles.assignmentType, 'LEADER'),
      eq(userDepartmentRoles.status, 'ativo')
    ))
    .limit(1);
  
  return result.length > 0;
}

/**
 * Verificar se usuário é MEMBRO (colaborador) de um departamento específico
 */
export async function isUserMemberOfDepartment(userId: number, departmentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(userDepartmentRoles)
    .where(and(
      eq(userDepartmentRoles.userId, userId),
      eq(userDepartmentRoles.departmentId, departmentId),
      eq(userDepartmentRoles.assignmentType, 'MEMBER'),
      eq(userDepartmentRoles.status, 'ativo')
    ))
    .limit(1);
  
  return result.length > 0;
}

/**
 * Verificar se usuário pode solicitar ajuste em uma ação
 * (precisa ser membro do departamento da ação)
 */
export async function canRequestAdjustment(userId: number, actionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Buscar a ação e seu PDI
  const action = await db
    .select({
      pdiId: actions.pdiId,
    })
    .from(actions)
    .where(eq(actions.id, actionId))
    .limit(1);
  
  if (!action || !action[0]) return false;
  
  // Buscar o PDI e seu colaborador
  const pdi = await db
    .select({
      colaboradorId: pdis.colaboradorId,
    })
    .from(pdis)
    .where(eq(pdis.id, action[0].pdiId))
    .limit(1);
  
  if (!pdi || !pdi[0]) return false;
  
  // Verificar se usuário é o dono do PDI
  return pdi[0].colaboradorId === userId;
}

/**
 * Verificar se usuário pode aprovar ajuste em uma ação
 * (precisa ser admin OU líder do departamento da ação)
 */
export async function canApproveAdjustment(userId: number, actionId: number, userRole: string): Promise<boolean> {
  // Admin pode aprovar qualquer coisa
  if (userRole === 'admin') return true;
  
  const db = await getDb();
  if (!db) return false;
  
  // Buscar a ação e seu PDI
  const action = await db
    .select({
      pdiId: actions.pdiId,
    })
    .from(actions)
    .where(eq(actions.id, actionId))
    .limit(1);
  
  if (!action || !action[0]) return false;
  
  // Buscar o PDI e seu colaborador
  const pdi = await db
    .select({
      colaboradorId: pdis.colaboradorId,
    })
    .from(pdis)
    .where(eq(pdis.id, action[0].pdiId))
    .limit(1);
  
  if (!pdi || !pdi[0]) return false;
  
  // Buscar o colaborador para encontrar seu departamento
  const colaborador = await db
    .select({
      departamentoId: users.departamentoId,
    })
    .from(users)
    .where(eq(users.id, pdi[0].colaboradorId))
    .limit(1);
  
  if (!colaborador || !colaborador[0] || !colaborador[0].departamentoId) return false;
  
  // Verificar se usuário é líder do departamento
  return await isUserLeaderOfDepartment(userId, colaborador[0].departamentoId);
}

/**
 * Obter departamentos onde usuário é LÍDER
 */
export async function getUserLeaderDepartments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: departamentos.id,
      nome: departamentos.nome,
      descricao: departamentos.descricao,
    })
    .from(userDepartmentRoles)
    .innerJoin(departamentos, eq(userDepartmentRoles.departmentId, departamentos.id))
    .where(and(
      eq(userDepartmentRoles.userId, userId),
      eq(userDepartmentRoles.assignmentType, 'LEADER'),
      eq(userDepartmentRoles.status, 'ativo')
    ))
    .orderBy(departamentos.nome);
}

/**
 * Obter departamentos onde usuário é MEMBRO
 */
export async function getUserMemberDepartments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: departamentos.id,
      nome: departamentos.nome,
      descricao: departamentos.descricao,
    })
    .from(userDepartmentRoles)
    .innerJoin(departamentos, eq(userDepartmentRoles.departmentId, departamentos.id))
    .where(and(
      eq(userDepartmentRoles.userId, userId),
      eq(userDepartmentRoles.assignmentType, 'MEMBER'),
      eq(userDepartmentRoles.status, 'ativo')
    ))
    .orderBy(departamentos.nome);
}

/**
 * Migrar dados existentes para user_department_roles
 * Estratégia conservadora: não apaga nada, apenas cria novos registros
 */
export async function migrateUserDepartmentRoles() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar todos os usuários com departamento e papel definidos
  const allUsers = await db
    .select({
      id: users.id,
      role: users.role,
      departamentoId: users.departamentoId,
      leaderId: users.leaderId,
    })
    .from(users)
    .where(and(
      ne(users.role, 'admin'),
      isNotNull(users.departamentoId)
    ));
  
  let migratedCount = 0;
  
  for (const user of allUsers) {
    // Verificar se já existe registro
    const existing = await db
      .select()
      .from(userDepartmentRoles)
      .where(and(
        eq(userDepartmentRoles.userId, user.id),
        eq(userDepartmentRoles.departmentId, user.departamentoId!)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      // Criar novo registro baseado no papel antigo
      const assignmentType = user.role === 'lider' ? 'LEADER' : 'MEMBER';
      
      await db.insert(userDepartmentRoles).values({
        userId: user.id,
        departmentId: user.departamentoId!,
        assignmentType: assignmentType as any,
        leaderUserId: user.role === 'lider' ? null : user.leaderId,
        status: 'ativo',
      });
      
      migratedCount++;
    }
  }
  
  console.log(`\n📈 RESULTADO DA MIGRAÇÃO:`);
  console.log(`   ✅ Migrados: ${migratedCount}`);
  console.log(`   ⏭️  Pulados: ${allUsers.length - migratedCount}`);
  console.log(`   📊 Total processado: ${allUsers.length}\n`);
  
  return { 
    migratedCount, 
    skippedCount: allUsers.length - migratedCount,
    totalUsers: allUsers.length,
  };
}


// ============= FUNÇÕES ADICIONAIS PARA NOTIFICAÇÕES =============

export async function createNotification(data: {
  destinatarioId: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  referenciaId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notifications).values(data).execute();
  return result[0]?.insertId || 0;
}

export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.destinatarioId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications)
    .set({ lida: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

// ============= FUNÇÕES ADICIONAIS PARA HISTÓRICO =============

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

// ============= FUNÇÕES ADICIONAIS PARA EVIDÊNCIAS =============

export async function updateEvidenceStatus(
  evidenceId: number,
  data: {
    status: string;
    justificativaAdmin?: string;
    evaluatedBy?: number;
    evaluatedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(evidences)
    .set({
      status: data.status as any,
      justificativaAdmin: data.justificativaAdmin ?? null,
      evaluatedBy: data.evaluatedBy ?? null,
      evaluatedAt: data.evaluatedAt ?? null,
    })
    .where(eq(evidences.id, evidenceId));
}

export async function getEvidenceById(evidenceId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      // Evidence fields
      id: evidences.id,
      actionId: evidences.actionId,
      colaboradorId: evidences.colaboradorId,
      status: evidences.status,
      justificativaAdmin: evidences.justificativaAdmin,
      satisfactionScore: evidences.satisfactionScore,
      createdAt: evidences.createdAt,
      evaluatedAt: evidences.evaluatedAt,
      evaluatedBy: evidences.evaluatedBy,
      // Action fields
      actionNome: actions.nome,
      // Colaborador fields
      colaboradorNome: users.name,
    })
    .from(evidences)
    .leftJoin(actions, eq(evidences.actionId, actions.id))
    .leftJoin(users, eq(evidences.colaboradorId, users.id))
    .where(eq(evidences.id, evidenceId))
    .limit(1);
  
  return result[0] || null;
}

export async function getEvidenceFiles(evidenceId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(evidenceFiles)
    .where(eq(evidenceFiles.evidenceId, evidenceId))
    .orderBy(desc(evidenceFiles.createdAt));
}

export async function getEvidenceTexts(evidenceId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(evidenceTexts)
    .where(eq(evidenceTexts.evidenceId, evidenceId))
    .orderBy(desc(evidenceTexts.createdAt));
}


// ============= FUNÇÕES DE ESTATÍSTICAS DE AJUSTES =============

export async function countAdjustmentRequestsByAction(actionId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(adjustmentRequests)
    .where(eq(adjustmentRequests.actionId, actionId));
  
  return result[0]?.count || 0;
}

export async function getPendingAdjustmentRequestsByAction(actionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      solicitanteId: adjustmentRequests.solicitanteId,
      tipoSolicitante: adjustmentRequests.tipoSolicitante,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
    })
    .from(adjustmentRequests)
    .where(and(
      eq(adjustmentRequests.actionId, actionId),
      eq(adjustmentRequests.status, 'pendente')
    ))
    .orderBy(desc(adjustmentRequests.createdAt));
}

// ============= FUNÇÕES DE INFORMAÇÕES DE ALTERAÇÃO =============

export async function getActionAlterationInfo(actionId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Buscar informações sobre alterações solicitadas
  const alteracoes = await db
    .select({
      id: adjustmentRequests.id,
      status: adjustmentRequests.status,
      justificativa: adjustmentRequests.justificativa,
      camposAjustar: adjustmentRequests.camposAjustar,
      createdAt: adjustmentRequests.createdAt,
      solicitanteNome: users.name,
    })
    .from(adjustmentRequests)
    .leftJoin(users, eq(adjustmentRequests.solicitanteId, users.id))
    .where(eq(adjustmentRequests.actionId, actionId))
    .orderBy(desc(adjustmentRequests.createdAt));
  
  return {
    total: alteracoes.length,
    pendentes: alteracoes.filter(a => a.status === 'pendente').length,
    aprovadas: alteracoes.filter(a => a.status === 'aprovada').length,
    reprovadas: alteracoes.filter(a => a.status === 'reprovada').length,
    alteracoes: alteracoes,
  };
}

export async function getActionAlterationHistory(actionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: acoesHistorico.id,
      campo: acoesHistorico.campo,
      valorAnterior: acoesHistorico.valorAnterior,
      valorNovo: acoesHistorico.valorNovo,
      motivoAlteracao: acoesHistorico.motivoAlteracao,
      alteradoPor: acoesHistorico.alteradoPor,
      alteradorNome: users.name,
      solicitacaoAjusteId: acoesHistorico.solicitacaoAjusteId,
      createdAt: acoesHistorico.createdAt,
    })
    .from(acoesHistorico)
    .leftJoin(users, eq(acoesHistorico.alteradoPor, users.id))
    .where(eq(acoesHistorico.actionId, actionId))
    .orderBy(desc(acoesHistorico.createdAt));
}


// ============= FUNÇÕES DE AUDITORIA =============

export async function createAuditLog(
  adjustmentRequestId: number,
  adminId: number,
  campo: string,
  valorAnterior: string | null,
  valorNovo: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(auditLog)
    .values({
      adjustmentRequestId,
      adminId,
      campo,
      valorAnterior,
      valorNovo,
    })
    .execute();
  
  return result[0]?.insertId || 0;
}

export async function getAuditLogByAdjustmentRequest(adjustmentRequestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const logs = await db
    .select({
      id: auditLog.id,
      adjustmentRequestId: auditLog.adjustmentRequestId,
      adminId: auditLog.adminId,
      adminName: users.name,
      campo: auditLog.campo,
      valorAnterior: auditLog.valorAnterior,
      valorNovo: auditLog.valorNovo,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.adminId, users.id))
    .where(eq(auditLog.adjustmentRequestId, adjustmentRequestId))
    .orderBy(asc(auditLog.createdAt));
  
  return logs;
}


export async function getAdjustmentStats(actionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const total = await countAdjustmentRequestsByAction(actionId);
  const pendentes = await db
    .select({ count: sql<number>`count(*)` })
    .from(adjustmentRequests)
    .where(
      and(
        eq(adjustmentRequests.actionId, actionId),
        eq(adjustmentRequests.status, "pendente")
      )
    );

  const restantes = Math.max(0, 5 - total);
  const temPendente = (pendentes[0]?.count ?? 0) > 0;
  const podeAdicionar = total < 5 && !temPendente;
  
  let motivoBloqueio: string | null = null;
  if (total >= 5) {
    motivoBloqueio = "limit";
  } else if (temPendente) {
    motivoBloqueio = "pending";
  }

  return {
    total,
    pendentes: pendentes[0]?.count ?? 0,
    restantes,
    podeAdicionar,
    motivoBloqueio,
  };
}

// ============================================
// USER FUNCTIONS
// ============================================

export async function countUsers(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  return result[0]?.count ?? 0;
}


export async function getPDIsByCicloId(cicloId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(pdis)
    .where(eq(pdis.cicloId, cicloId));
}

// ============================================================================
// FUNÇÕES FALTANDO - IMPLEMENTADAS PARA CORRIGIR ERROS DE BUILD
// ============================================================================

export async function getUserByEmailAndCpf(email: string, cpf: string) {
  const db = await getDb();
  if (!db) return null;

  console.log("[DB DEBUG] Buscando usuário - Email:", email, "| CPF:", cpf, "| CPF Length:", cpf.length);
  
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.cpf, cpf)))
    .limit(1);

  console.log("[DB DEBUG] Resultado da busca:", result.length > 0 ? "Encontrado" : "Não encontrado");
  return result[0] || null;
}

export async function getPDIByColaboradorAndCiclo(colaboradorId: number, cicloId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(pdis)
    .where(
      and(
        eq(pdis.colaboradorId, colaboradorId),
        eq(pdis.cicloId, cicloId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getActionByPDIAndNome(pdiId: number, nome: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.pdiId, pdiId),
        eq(actions.nome, nome)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getSubordinates(leaderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(users)
    .where(eq(users.leaderId, leaderId))
    .orderBy(asc(users.name));
}

export async function getAllMacros() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(competenciasMacros)
    .orderBy(asc(competenciasMacros.nome));
}

export async function getUnreadNotificationsCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.destinatarioId, userId),
        eq(notifications.lido, false)
      )
    );

  return result[0]?.count || 0;
}

export async function getUsersByRole(role: "admin" | "lider" | "colaborador") {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .orderBy(asc(users.name));
}

export async function getPendingEvidences() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: evidences.id,
      actionId: evidences.actionId,
      colaboradorId: evidences.colaboradorId,
      status: evidences.status,
      createdAt: evidences.createdAt,
      actionNome: actions.nome,
      colaboradorNome: users.name,
    })
    .from(evidences)
    .leftJoin(actions, eq(evidences.actionId, actions.id))
    .leftJoin(users, eq(evidences.colaboradorId, users.id))
    .where(eq(evidences.status, 'aguardando_avaliacao'))
    .orderBy(desc(evidences.createdAt));
}

export async function getAllMicros() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(competenciasMicros)
    .orderBy(asc(competenciasMicros.nome));
}

export async function getAllMicrosWithMacroAndBloco() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: competenciasMicros.id,
      microNome: competenciasMicros.nome,
      microStatus: competenciasMicros.status,
      macroId: competenciasMicros.macroId,
      macroNome: competenciasMacros.nome,
      blocoId: competenciasBlocos.id,
      blocoNome: competenciasBlocos.nome,
    })
    .from(competenciasMicros)
    .leftJoin(competenciasMacros, eq(competenciasMicros.macroId, competenciasMacros.id))
    .leftJoin(competenciasBlocos, eq(competenciasMacros.blocoId, competenciasBlocos.id))
    .orderBy(asc(competenciasBlocos.nome), asc(competenciasMacros.nome), asc(competenciasMicros.nome));
}

export async function getMacroByNomeAndBlocoId(nome: string, blocoId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(competenciasMacros)
    .where(
      and(
        eq(competenciasMacros.nome, nome),
        eq(competenciasMacros.blocoId, blocoId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getMicroByNomeAndMacroId(nome: string, macroId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(competenciasMicros)
    .where(
      and(
        eq(competenciasMicros.nome, nome),
        eq(competenciasMicros.macroId, macroId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getActionsByColaboradorId(colaboradorId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar TODOS os PDIs do colaborador
  const pdiList = await db
    .select()
    .from(pdis)
    .where(eq(pdis.colaboradorId, colaboradorId));

  if (!pdiList || pdiList.length === 0) {
    return [];
  }

  // Extrair IDs de todos os PDIs
  const pdiIds = pdiList.map(p => p.id);

  // Buscar todas as ações de TODOS os PDIs
  return await db
    .select()
    .from(actions)
    .where(inArray(actions.pdiId, pdiIds))
    .orderBy(desc(actions.createdAt));
}

export async function getPendingActionsForLeader(leaderId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all subordinates of this leader
  const subordinates = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.leaderId, leaderId));

  const subordinateIds = subordinates.map(s => s.id);

  if (subordinateIds.length === 0) {
    return [];
  }

  return await db
    .select()
    .from(actions)
    .where(
      and(
        inArray(actions.colaboradorId, subordinateIds),
        eq(actions.status, 'pendente')
      )
    )
    .orderBy(desc(actions.createdAt));
}

export async function createAdjustmentComment(data: {
  adjustmentRequestId: number;
  userId: number;
  comentario: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(adjustmentComments)
    .values({
      adjustmentRequestId: data.adjustmentRequestId,
      autorId: data.userId,
      comentario: data.comentario,
      createdAt: new Date(),
    })
    .execute();

  return result[0]?.insertId || 0;
}

export async function getAcaoHistorico(actionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: acoesHistorico.id,
      actionId: acoesHistorico.actionId,
      campo: acoesHistorico.campo,
      valorAnterior: acoesHistorico.valorAnterior,
      valorNovo: acoesHistorico.valorNovo,
      motivoAlteracao: acoesHistorico.motivoAlteracao,
      alteradoPor: acoesHistorico.alteradoPor,
      alteradoPorNome: users.name,
      createdAt: acoesHistorico.createdAt,
    })
    .from(acoesHistorico)
    .leftJoin(users, eq(acoesHistorico.alteradoPor, users.id))
    .where(eq(acoesHistorico.actionId, actionId))
    .orderBy(desc(acoesHistorico.createdAt));
}

export async function getCommentsByAdjustmentRequestId(adjustmentRequestId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: adjustmentComments.id,
      adjustmentRequestId: adjustmentComments.adjustmentRequestId,
      userId: adjustmentComments.userId,
      userName: users.name,
      comentario: adjustmentComments.comentario,
      createdAt: adjustmentComments.createdAt,
    })
    .from(adjustmentComments)
    .leftJoin(users, eq(adjustmentComments.userId, users.id))
    .where(eq(adjustmentComments.adjustmentRequestId, adjustmentRequestId))
    .orderBy(asc(adjustmentComments.createdAt));
}

export async function getAllAdjustmentRequestsWithDetails() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      colaboradorId: adjustmentRequests.colaboradorId,
      status: adjustmentRequests.status,
      justificativaAdmin: adjustmentRequests.justificativaAdmin,
      createdAt: adjustmentRequests.createdAt,
      evaluatedAt: adjustmentRequests.evaluatedAt,
      evaluatedBy: adjustmentRequests.evaluatedBy,
      actionNome: actions.nome,
      colaboradorNome: users.name,
      evaluatedByName: users.name,
    })
    .from(adjustmentRequests)
    .leftJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .leftJoin(users, eq(adjustmentRequests.colaboradorId, users.id))
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getPendingAdjustmentRequestsOnly() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      colaboradorId: adjustmentRequests.colaboradorId,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
      actionNome: actions.nome,
      colaboradorNome: users.name,
    })
    .from(adjustmentRequests)
    .leftJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .leftJoin(users, eq(adjustmentRequests.colaboradorId, users.id))
    .where(eq(adjustmentRequests.status, 'pendente'))
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getPendingAdjustmentRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      colaboradorId: adjustmentRequests.colaboradorId,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
      actionNome: actions.nome,
      colaboradorNome: users.name,
    })
    .from(adjustmentRequests)
    .leftJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .leftJoin(users, eq(adjustmentRequests.colaboradorId, users.id))
    .where(
      and(
        eq(adjustmentRequests.status, 'pendente'),
        eq(adjustmentRequests.colaboradorId, userId)
      )
    )
    .orderBy(desc(adjustmentRequests.createdAt));
}

export async function getApprovedAndRejectedAdjustments() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: adjustmentRequests.id,
      actionId: adjustmentRequests.actionId,
      colaboradorId: adjustmentRequests.colaboradorId,
      status: adjustmentRequests.status,
      createdAt: adjustmentRequests.createdAt,
      evaluatedAt: adjustmentRequests.evaluatedAt,
      actionNome: actions.nome,
      colaboradorNome: users.name,
    })
    .from(adjustmentRequests)
    .leftJoin(actions, eq(adjustmentRequests.actionId, actions.id))
    .leftJoin(users, eq(adjustmentRequests.colaboradorId, users.id))
    .where(
      or(
        eq(adjustmentRequests.status, 'aprovada'),
        eq(adjustmentRequests.status, 'reprovada')
      )
    )
    .orderBy(desc(adjustmentRequests.evaluatedAt));
}

export async function getNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.destinatarioId, userId))
    .orderBy(desc(notifications.createdAt));
}


// ============= HELPER FUNCTIONS FOR PDI ROUTER =============

/**
 * Aprovar ação (muda status para "aprovada_lider")
 */
export async function approveAction(actionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(actions)
    .set({ status: "aprovada_lider", updatedAt: new Date() })
    .where(eq(actions.id, actionId));

  return { id: actionId, status: "aprovada_lider" };
}

/**
 * Rejeitar ação (muda status para "reprovada_lider")
 */
export async function rejectAction(actionId: number, motivo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(actions)
    .set({ status: "reprovada_lider", updatedAt: new Date() })
    .where(eq(actions.id, actionId));

  return { id: actionId, status: "reprovada_lider" };
}

/**
 * Obter ação com dados do PDI e colaborador
 */
export async function getActionWithDetails(actionId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: actions.id,
      pdiId: actions.pdiId,
      nome: actions.nome,
      status: actions.status,
      colaboradorId: pdis.colaboradorId,
      colaboradorNome: users.name,
      leaderId: users.leaderId,
    })
    .from(actions)
    .leftJoin(pdis, eq(actions.pdiId, pdis.id))
    .leftJoin(users, eq(pdis.colaboradorId, users.id))
    .where(eq(actions.id, actionId))
    .limit(1);

  return result[0] || null;
}

/**
 * Verificar se usuário é líder do colaborador
 */
export async function isUserLeaderOfColaborador(userId: number, colaboradorId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(users)
    .where(and(
      eq(users.id, colaboradorId),
      eq(users.leaderId, userId)
    ))
    .limit(1);

  return result.length > 0;
}


export async function getMicrosWithFilters(filters: {
  blocoId?: number;
  blocoNome?: string;
  macroId?: number;
  macroNome?: string;
  microNome?: string;
  status?: 'ativo' | 'inativo';
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters.blocoId) {
    conditions.push(eq(competenciasBlocos.id, filters.blocoId));
  }
  if (filters.blocoNome) {
    conditions.push(like(competenciasBlocos.nome, `%${filters.blocoNome}%`));
  }
  if (filters.macroId) {
    conditions.push(eq(competenciasMacros.id, filters.macroId));
  }
  if (filters.macroNome) {
    conditions.push(like(competenciasMacros.nome, `%${filters.macroNome}%`));
  }
  if (filters.microNome) {
    conditions.push(like(competenciasMicros.nome, `%${filters.microNome}%`));
  }
  if (filters.status) {
    conditions.push(eq(competenciasMicros.status, filters.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select({
      id: competenciasMicros.id,
      microNome: competenciasMicros.nome,
      microStatus: competenciasMicros.status,
      macroId: competenciasMicros.macroId,
      macroNome: competenciasMacros.nome,
      blocoId: competenciasBlocos.id,
      blocoNome: competenciasBlocos.nome,
    })
    .from(competenciasMicros)
    .leftJoin(competenciasMacros, eq(competenciasMicros.macroId, competenciasMacros.id))
    .leftJoin(competenciasBlocos, eq(competenciasMacros.blocoId, competenciasBlocos.id))
    .where(whereClause)
    .orderBy(asc(competenciasBlocos.nome), asc(competenciasMacros.nome), asc(competenciasMicros.nome));
}


// ============================================
// VALIDAÇÃO DE DEPENDÊNCIA ATIVA
// ============================================

/**
 * Conta quantas Microcompetências ativas estão vinculadas a uma Macro
 * @param macroId ID da Macro
 * @returns Número de Micros ativas
 */
export async function countActiveMicrosByMacroId(macroId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(competenciasMicros)
    .where(and(eq(competenciasMicros.macroId, macroId), eq(competenciasMicros.status, 'ativo')));

  return result[0]?.count || 0;
}

/**
 * Conta quantas Macrocompetências ativas estão vinculadas a um Bloco
 * @param blocoId ID do Bloco
 * @returns Número de Macros ativas
 */
export async function countActiveMacrosByBlocoId(blocoId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(competenciasMacros)
    .where(and(eq(competenciasMacros.blocoId, blocoId), eq(competenciasMacros.status, 'ativo')));

  return result[0]?.count || 0;
}


// ============= DIRECIONAMENTO ESTRATÉGICO (ADMIN ONLY) =============
/**
 * Busca o Top 3 de Macrocompetências com maior volume de ações
 * Calcula percentual em relação ao total global de ações
 * Ignora filtros de departamento - retorna dados globais
 * Retorna: { macroNome, totalAcoes, percentual }
 */
export async function getTop3CompetenciasComGaps() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot fetch Top 3 competencias: database not available");
      return [];
    }

    // Contar ações agrupadas por Macro com percentual
    const result = await db
      .select({
        macroNome: competenciasMacros.nome,
        totalAcoes: sql<number>`COUNT(${actions.id})`,
        percentual: sql<number>`ROUND((COUNT(${actions.id}) * 100.0 / (SELECT COUNT(*) FROM ${actions})), 1)`,
      })
      .from(competenciasMacros)
      .leftJoin(actions, eq(actions.macroId, competenciasMacros.id))
      .where(eq(competenciasMacros.status, "ativo"))
      .groupBy(competenciasMacros.id, competenciasMacros.nome)
      .having(sql`COUNT(${actions.id}) > 0`)
      .orderBy(
        desc(sql<number>`COUNT(${actions.id})`),
        desc(sql<number>`ROUND((COUNT(${actions.id}) * 100.0 / (SELECT COUNT(*) FROM ${actions})), 1)`)
      )
      .limit(3);

    return result || [];
  } catch (error: any) {
    console.error("Erro ao buscar Top 3 competências com gaps:", error);
    return [];
  }
}


// ============= PDI COM PROGRESSO (DATATABLE) =============
/**
 * Busca PDIs com cálculo de progresso e dados relacionados
 * Retorna: { pdiId, colaboradorNome, departamentoNome, liderNome, cicloNome, status, totalAcoes, acoesConcluidasTotal, progresso }
 */
export async function getPDIsComProgresso(filters?: {
  departamentoId?: number;
  colaboradorNome?: string;
  progressoMin?: number;
  progressoMax?: number;
}) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot fetch PDIs: database not available");
      return [];
    }

    // Alias para joins múltiplos de users
    const colaboradorAlias = alias(users, "colaborador");
    const liderAlias = alias(users, "lider");

    let query = db
      .select({
        pdiId: pdis.id,
        colaboradorNome: colaboradorAlias.nome,
        departamentoNome: departamentos.nome,
        liderNome: liderAlias.nome,
        cicloNome: ciclos.nome,
        status: pdis.status,
        totalAcoes: sql<number>`COUNT(DISTINCT ${actions.id})`,
        acoesConcluidasTotal: sql<number>`COUNT(DISTINCT CASE WHEN ${actions.status} = 'concluido' THEN ${actions.id} END)`,
        progresso: sql<number>`ROUND(COUNT(DISTINCT CASE WHEN ${actions.status} = 'concluido' THEN ${actions.id} END) * 100.0 / NULLIF(COUNT(DISTINCT ${actions.id}), 0), 1)`,
      })
      .from(pdis)
      .leftJoin(colaboradorAlias, eq(pdis.colaboradorId, colaboradorAlias.id))
      .leftJoin(departamentos, eq(colaboradorAlias.departamentoId, departamentos.id))
      .leftJoin(liderAlias, eq(colaboradorAlias.leaderId, liderAlias.id))
      .leftJoin(ciclos, eq(pdis.cicloId, ciclos.id))
      .leftJoin(actions, eq(pdis.id, actions.pdiId))
      .groupBy(pdis.id, colaboradorAlias.id, departamentos.id, liderAlias.id, ciclos.id);

    // Aplicar filtros
    const conditions = [];
    
    if (filters?.departamentoId) {
      conditions.push(eq(departamentos.id, filters.departamentoId));
    }
    
    if (filters?.colaboradorNome) {
      conditions.push(sql`${colaboradorAlias.nome} LIKE ${`%${filters.colaboradorNome}%`}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;

    // Filtrar por progresso no JavaScript (após cálculo)
    if (filters?.progressoMin !== undefined || filters?.progressoMax !== undefined) {
      return result.filter((item: any) => {
        const progresso = item.progresso || 0;
        const minOk = filters.progressoMin === undefined || progresso >= filters.progressoMin;
        const maxOk = filters.progressoMax === undefined || progresso <= filters.progressoMax;
        return minOk && maxOk;
      });
    }

    return result || [];
  } catch (error: any) {
    console.error("Erro ao buscar PDIs com progresso:", error);
    return [];
  }
}

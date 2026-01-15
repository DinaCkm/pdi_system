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
  InsertAdjustmentComment,
  notifications,
  acoesHistorico,
  auditLog,
  userDepartmentRoles
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
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.insert(users).values(data).$returningId();
  return user.id;
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

  const [dept] = await db.insert(departamentos).values(data).$returningId();
  return dept.id;
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

  const [ciclo] = await db.insert(ciclos).values(data).$returningId();
  return ciclo.id;
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

  return await db.select().from(competenciasBlocos).orderBy(competenciasBlocos.nome);
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

  const [bloco] = await db.insert(competenciasBlocos).values(data).$returningId();
  return bloco.id;
}

export async function updateBloco(id: number, data: Partial<{ nome: string; descricao: string }>) {
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

  return await db
    .select()
    .from(competenciasMacros)
    .where(eq(competenciasMacros.blocoId, blocoId))
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

  const [macro] = await db.insert(competenciasMacros).values(data).$returningId();
  return macro.id;
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

  await db.delete(competenciasMacros).where(eq(competenciasMacros.id, id));
}

export async function getMicrosByMacroId(macroId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(competenciasMicros)
    .where(eq(competenciasMicros.macroId, macroId))
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

  const [micro] = await db.insert(competenciasMicros).values(data).$returningId();
  return micro.id;
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

  await db.delete(competenciasMicros).where(eq(competenciasMicros.id, id));
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
      cicloId: pdis.cicloId,
      titulo: pdis.titulo,
      objetivoGeral: pdis.objetivoGeral,
      status: pdis.status,
      createdAt: pdis.createdAt,
      updatedAt: pdis.updatedAt,
    })
    .from(pdis)
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
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [pdi] = await db.insert(pdis).values(data).$returningId();
  return pdi.id;
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

  return await db
    .select({
      id: actions.id,
      pdiId: actions.pdiId,
      nome: actions.nome,
      descricao: actions.descricao,
      status: actions.status,
      createdAt: actions.createdAt,
    })
    .from(actions)
    .orderBy(desc(actions.createdAt));
}

export async function getActionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(actions)
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
  prazo?: Date;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [action] = await db.insert(actions).values(data).$returningId();
  return action.id;
}

export async function updateAction(
  id: number,
  data: Partial<{
    nome: string;
    descricao: string;
    blocoId: number;
    macroId: number;
    microId: number;
    prazo: Date;
    status: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(actions).set(data).where(eq(actions.id, id));
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
  tipoSolicitante: string;
  justificativa: string;
  camposAjustar: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [request] = await db.insert(adjustmentRequests).values(data).$returningId();
  return request.id;
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
  
  return { migratedCount, totalUsers: allUsers.length };
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
  
  await db.insert(notifications).values(data);
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
  
  await db.insert(acoesHistorico).values(data);
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
    .select()
    .from(evidences)
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

import { eq, and, isNull, not, inArray, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, pdis, competenciasMacros, actions, acoesHistorico, adjustmentRequests, departamentos, ciclos, evidences, notifications, pdiValidacoes } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

// ============= DATABASE CONNECTION =============

let dbInstance: any = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  try {
    if (process.env.DATABASE_URL) {
      dbInstance = drizzle(process.env.DATABASE_URL);
      return dbInstance;
    }
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
    .orderBy(desc(actions.createdAt));

  return result;
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

  await db.delete(actions).where(eq(actions.id, id));
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
    leaderId: number;
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

export async function createEvidence(data: {
  actionId: number;
  colaboradorId: number;
  descricao: string;
  arquivo?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(evidences).values({
    actionId: data.actionId,
    colaboradorId: data.colaboradorId,
    descricao: data.descricao,
    arquivo: data.arquivo,
    status: 'aguardando_avaliacao',
    createdAt: new Date(),
  });

  return result[0]?.insertId || 0;
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

  const result = await db
    .select()
    .from(evidences)
    .where(eq(evidences.status, 'pendente'))
    .orderBy(evidences.createdAt);

  return result;
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

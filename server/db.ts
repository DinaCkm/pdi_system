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

// O restante do arquivo permanece igual ao seu original.
// Ajustes aplicados apenas nos pontos que gravavam timestamp em formato ISO string.

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
      createdAt: new Date(),
    });

  return result;
}

export async function updateAdjustmentRequest(id: number, data: Partial<{
  status: 'pendente' | 'mais_informacoes' | 'aprovada' | 'reprovada' | 'aguardando_lider';
  justificativaAdmin: string;
  evaluatedBy: number;
  evaluatedAt: string | Date;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedData = {
    ...data,
    evaluatedAt:
      data.evaluatedAt instanceof Date
        ? data.evaluatedAt
        : data.evaluatedAt
          ? new Date(data.evaluatedAt)
          : undefined,
  };

  const result = await db
    .update(adjustmentRequests)
    .set(normalizedData)
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
      createdAt: new Date(),
    });

  return result;
}

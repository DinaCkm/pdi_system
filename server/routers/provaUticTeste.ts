import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/customTrpc";
import { generateTemporaryPassword, hashPassword } from "../_core/password";

const NOME_BASE = "Daniel Caio Lemos Penno";
const NOME_TESTE = `${NOME_BASE} [TESTE UTIC]`;
const EMAIL_TESTE = "teste.utic@ckmtalents.net";
const OPEN_ID_TESTE = "local_teste_utic_daniel";
const STUDENT_ID_TESTE = "TESTE-UTIC-DANIEL";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

type UsuarioBase = {
  id: number;
  name: string | null;
  cargo: string;
  departamentoId: number | null;
  leaderId: number | null;
  viuNormasVersao: number | null;
};

export const provaUticTesteRouter = router({
  prepararParticipante: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Banco de dados indisponível.",
      });
    }

    const origemResult = await db.execute(sql`
      SELECT id, name, cargo,
             departamentoId AS departamentoId,
             leaderId AS leaderId,
             viuNormasVersao AS viuNormasVersao
        FROM users
       WHERE name = ${NOME_BASE}
         AND status = 'ativo'
       ORDER BY id ASC
       LIMIT 1
    `);

    const origem = rowsOf<UsuarioBase>(origemResult)[0];
    if (!origem) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Não localizei o empregado-base ${NOME_BASE} entre os usuários ativos.`,
      });
    }

    const senhaTemporaria = generateTemporaryPassword(12);
    const passwordHash = hashPassword(senhaTemporaria);

    const existenteResult = await db.execute(sql`
      SELECT id
        FROM users
       WHERE email = ${EMAIL_TESTE}
          OR openId = ${OPEN_ID_TESTE}
       ORDER BY id ASC
       LIMIT 1
    `);
    const existente = rowsOf<{ id: number }>(existenteResult)[0];

    let usuarioId: number;
    let criadoAgora = false;

    if (existente) {
      usuarioId = Number(existente.id);
      await db.execute(sql`
        UPDATE users
           SET openId = ${OPEN_ID_TESTE},
               name = ${NOME_TESTE},
               email = ${EMAIL_TESTE},
               loginMethod = 'password',
               passwordHash = ${passwordHash},
               passwordUpdatedAt = NOW(),
               mustChangePassword = 0,
               authTokenVersion = authTokenVersion + 1,
               failedLoginAttempts = 0,
               lastFailedLoginAt = NULL,
               loginBlockedUntil = NULL,
               role = 'colaborador',
               cpf = NULL,
               studentId = ${STUDENT_ID_TESTE},
               cargo = ${origem.cargo},
               leaderId = ${origem.leaderId},
               status = 'ativo',
               departamentoId = ${origem.departamentoId},
               viuNormasVersao = ${Number(origem.viuNormasVersao ?? 0)},
               updatedAt = NOW()
         WHERE id = ${usuarioId}
      `);
    } else {
      const insertResult = await db.execute(sql`
        INSERT INTO users (
          openId, name, email, loginMethod, passwordHash, passwordUpdatedAt,
          mustChangePassword, role, cpf, studentId, cargo, leaderId, status,
          departamentoId, viuNormasVersao
        ) VALUES (
          ${OPEN_ID_TESTE}, ${NOME_TESTE}, ${EMAIL_TESTE}, 'password', ${passwordHash}, NOW(),
          0, 'colaborador', NULL, ${STUDENT_ID_TESTE}, ${origem.cargo}, ${origem.leaderId}, 'ativo',
          ${origem.departamentoId}, ${Number(origem.viuNormasVersao ?? 0)}
        )
      `);
      const info: any = Array.isArray(insertResult) ? insertResult[0] : insertResult;
      usuarioId = Number(info?.insertId ?? 0);
      criadoAgora = true;
    }

    if (!usuarioId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível preparar o funcionário de teste UTIC.",
      });
    }

    return {
      success: true,
      criadoAgora,
      usuarioId,
      nome: NOME_TESTE,
      baseadoEm: NOME_BASE,
      email: EMAIL_TESTE,
      senhaTemporaria,
      cargo: origem.cargo,
      departamentoId: origem.departamentoId,
    };
  }),
});

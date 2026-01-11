import type { Request, Response } from "express";
import { verifySessionToken } from "./customAuth";
import * as db from "../db";
import type { User } from "../../drizzle/schema";

const CUSTOM_AUTH_COOKIE = "pdi_session";

export interface CustomTrpcContext {
  req: Request;
  res: Response;
  user: User | null;
}

/**
 * Cria contexto customizado para tRPC com autenticação via cookie
 */
export async function createCustomContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<CustomTrpcContext> {
  let user: User | null = null;

  // Tentar obter token do cookie
  const token = req.cookies?.[CUSTOM_AUTH_COOKIE];

  if (token) {
    try {
      // Verificar e decodificar token
      const payload = await verifySessionToken(token);

      if (payload) {
        // Buscar usuário atualizado do banco
        const dbUser = await db.getUserById(payload.userId);
        
        if (dbUser && dbUser.status === "ativo") {
          user = dbUser;
        }
      }
    } catch (error) {
      // Token inválido ou expirado - não fazer nada, user permanece null
      console.warn("[CustomAuth] Token verification failed:", error);
    }
  }

  return {
    req,
    res,
    user,
  };
}

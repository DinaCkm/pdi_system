import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

/**
 * "Acessar como" (impersonação) — somente leitura.
 *
 * O administrador continua autenticado com o próprio auth_token.
 * Este cookie adicional indica qual empregado ele está visualizando.
 * Regras:
 *  - vale apenas enquanto o admin que o criou estiver logado (adminId confere);
 *  - expira em 30 minutos;
 *  - toda mutation é recusada no servidor enquanto estiver ativo.
 */
export const IMPERSONACAO_COOKIE = "acessar_como";
export const IMPERSONACAO_MINUTOS = 30;

export type ImpersonacaoPayload = {
  adminId: number;
  alvoId: number;
};

function getSecret() {
  const secret = ENV.cookieSecret?.trim();
  if (!secret) throw new Error("JWT_SECRET não configurado.");
  return new TextEncoder().encode(secret);
}

export async function criarTokenImpersonacao(payload: ImpersonacaoPayload) {
  return await new SignJWT({ tipo: "impersonacao", adminId: payload.adminId, alvoId: payload.alvoId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${IMPERSONACAO_MINUTOS}m`)
    .sign(getSecret());
}

export async function verificarTokenImpersonacao(token: string): Promise<(ImpersonacaoPayload & { expiraEm: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.tipo !== "impersonacao" || typeof payload.adminId !== "number" || typeof payload.alvoId !== "number") {
      return null;
    }
    return { adminId: payload.adminId, alvoId: payload.alvoId, expiraEm: Number(payload.exp ?? 0) * 1000 };
  } catch {
    return null;
  }
}

export const opcoesCookieImpersonacao = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

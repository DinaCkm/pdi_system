import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

const TOKEN_EXPIRATION = "8h";

export type AuthTokenPayload = {
  id: number;
  role: string;
  name: string;
  email: string;
  departmentId: number | null;
};

function getJwtSecret() {
  const secret = ENV.cookieSecret?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET não configurado.");
  }

  return new TextEncoder().encode(secret);
}

export async function createAuthToken(payload: AuthTokenPayload) {
  const secret = getJwtSecret();

  return await new SignJWT({
    id: payload.id,
    role: payload.role,
    name: payload.name,
    email: payload.email,
    departmentId: payload.departmentId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const secret = getJwtSecret();

    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.id !== "number" ||
      typeof payload.role !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return {
      id: payload.id,
      role: payload.role,
      name: payload.name,
      email: payload.email,
      departmentId:
        typeof payload.departmentId === "number" ? payload.departmentId : null,
    };
  } catch {
    return null;
  }
}

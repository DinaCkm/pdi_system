import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import * as db from "../db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default-secret-key-change-in-production");

export interface CustomAuthPayload {
  userId: number;
  email: string;
  cpf: string;
  role: string;
}

/**
 * Autentica usuário com email e CPF
 */
export async function authenticateUser(email: string, cpf: string) {
  // Buscar usuário por email e CPF
  const user = await db.getUserByEmailAndCpf(email, cpf);
  
  if (!user) {
    return null;
  }

  // Atualizar último login
  await db.updateUser(user.id, {
    lastSignedIn: new Date(),
  });

  return user;
}

/**
 * Cria token JWT para sessão
 */
export async function createSessionToken(user: CustomAuthPayload): Promise<string> {
  const token = await new SignJWT({
    userId: user.userId,
    email: user.email,
    cpf: user.cpf,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifica e decodifica token JWT
 */
export async function verifySessionToken(token: string): Promise<CustomAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    return payload as unknown as CustomAuthPayload;
  } catch (error) {
    return null;
  }
}

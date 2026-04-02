import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const RESET_TOKEN_LENGTH = 32;

export function hashPassword(password: string): string {
  const normalized = password.normalize("NFKC").trim();

  if (normalized.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(normalized, salt, HASH_KEY_LENGTH).toString("hex");

  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;

  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;

  const [salt, originalKey] = parts;

  const derivedKey = scryptSync(
    password.normalize("NFKC").trim(),
    salt,
    HASH_KEY_LENGTH
  );

  const originalBuffer = Buffer.from(originalKey, "hex");

  if (originalBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(originalBuffer, derivedKey);
}

export function generatePasswordResetToken() {
  const token = randomBytes(RESET_TOKEN_LENGTH).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  return {
    token,
    tokenHash,
  };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateTemporaryPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += alphabet[bytes[i] % alphabet.length];
  }

  return password;
}

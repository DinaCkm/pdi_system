import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const RESET_TOKEN_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 8;

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIALS = "!@#$%";
const ALL_PASSWORD_CHARS = `${LETTERS}${DIGITS}${SPECIALS}`;

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
} {
  const normalized = password.normalize("NFKC");

  if (!normalized.trim()) {
    return {
      isValid: false,
      message: "Informe a senha.",
    };
  }

  if (normalized.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (!/[0-9]/.test(normalized)) {
    return {
      isValid: false,
      message: "A senha deve conter ao menos 1 número.",
    };
  }

  if (!/[!@#$%]/.test(normalized)) {
    return {
      isValid: false,
      message: "A senha deve conter ao menos 1 caractere especial (!@#$%).",
    };
  }

  return { isValid: true };
}

function pickRandomChar(charset: string): string {
  return charset[randomBytes(1)[0] % charset.length];
}

function shuffleString(value: string): string {
  const chars = value.split("");

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export function hashPassword(password: string): string {
  const validation = validatePasswordStrength(password);

  if (!validation.isValid) {
    throw new Error(validation.message || "Senha inválida.");
  }

  const normalized = password.normalize("NFKC").trim();
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

export function generateTemporaryPassword(length = MIN_PASSWORD_LENGTH): string {
  const safeLength = Math.max(length, MIN_PASSWORD_LENGTH);

  const chars = [
    pickRandomChar(DIGITS),
    pickRandomChar(SPECIALS),
  ];

  for (let i = chars.length; i < safeLength; i++) {
    chars.push(pickRandomChar(ALL_PASSWORD_CHARS));
  }

  return shuffleString(chars.join(""));
}

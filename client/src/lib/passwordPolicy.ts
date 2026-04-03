export const PASSWORD_POLICY_TEXT =
  "Mínimo de 8 caracteres, com pelo menos 1 número e 1 caractere especial (!@#$%).";

export function validatePasswordStrength(password: string): string | null {
  const normalized = password.normalize("NFKC");

  if (!normalized.trim()) {
    return "Informe a senha.";
  }

  if (normalized.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }

  if (!/[0-9]/.test(normalized)) {
    return "A senha deve conter ao menos 1 número.";
  }

  if (!/[!@#$%]/.test(normalized)) {
    return "A senha deve conter ao menos 1 caractere especial (!@#$%).";
  }

  return null;
}

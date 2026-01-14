import { ENV } from "./env";

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Envia email para um usuário
 * Utiliza a API de email do Manus
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, body } = payload;

  if (!ENV.forgeApiUrl) {
    console.warn("[Email] Email service URL is not configured.");
    return false;
  }

  if (!ENV.forgeApiKey) {
    console.warn("[Email] Email service API key is not configured.");
    return false;
  }

  try {
    const response = await fetch(`${ENV.forgeApiUrl}/email/send`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to, subject, body }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Email] Failed to send email (${response.status} ${response.statusText})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Email] Error calling email service:", error);
    return false;
  }
}

/**
 * Envia email para o líder informando sobre solicitação de alteração
 */
export async function sendEmailSolicitacaoAjuste(params: {
  leaderEmail: string;
  leaderName: string;
  colaboradorName: string;
  acaoNome: string;
  justificativa: string;
  camposAlterar: string[];
}): Promise<boolean> {
  const { leaderEmail, leaderName, colaboradorName, acaoNome, justificativa, camposAlterar } = params;

  const camposText = camposAlterar.join(", ");

  const body = `
Prezado(a) ${leaderName},

O colaborador ${colaboradorName} solicitou ALTERAÇÕES na ação do PDI: ${acaoNome}

Segue a alteração solicitada:
${justificativa}

Campos a alterar: ${camposText}

Não é necessário responder a este email.

---
Sistema de Gestão de PDI
  `.trim();

  return sendEmail({
    to: leaderEmail,
    subject: "PARA A SUA CIÊNCIA - ALTERAÇÃO NO PDI",
    body,
  });
}

import { ENV } from "./env";
import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  html?: string;
};

type BrandedEmailTemplateParams = {
  preheader?: string;
  title: string;
  greeting?: string;
  intro?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

type BrandedNotificationEmailParams = {
  to: string;
  subject: string;
  plainTextBody: string;
  greeting: string;
  title: string;
  intro: string;
  bodyHtml: string;
  cc?: string;
  preheader?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

const EMAIL_LOGO_URL = "https://iili.io/B0LHiej.png";

const AVISO_NAO_RESPONDA = `
⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA ⚠️`;

const ASSINATURA = `
---
Sistema de Gestão de PDI — Eco do Bem - Ecossistema de Desenvolvimento`;

const TEXTO_PADRAO_ACESSE =
  "Acesse o Sistema para tomar ciência e providências. Você possui notificações pendentes.";

function stripHtmlForEmail(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
  if (!value) return "";
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function getSystemUrl(): string {
  return "https://pdi.ecodobem.com";
}

function plainTextToHtml(text: string): string {
  if (!text) return "";

  const highlightedParts: string[] = [];

  const preparedText = text.replace(/"([^"]+?)"/g, (_, content) => {
    const token = `__EMAIL_HIGHLIGHT_${highlightedParts.length}__`;
    highlightedParts.push(
      `<span style="display:inline-block;font-weight:700;color:#5b21b6;background-color:#f4edff;padding:2px 8px;border-radius:999px;">${escapeHtml(
        content
      )}</span>`
    );
    return token;
  });

  let html = escapeHtml(preparedText);

  html = html.replace(
    /^(IMPORTANTE:|O QUE FAZER AGORA:|MOTIVO DA DEVOLUÇÃO:|RESUMO DA VARREDURA:|PRÓXIMO PASSO:)/gim,
    `<span style="display:inline-block;margin:10px 0 8px;padding:6px 10px;border-radius:10px;background-color:#f4edff;color:#5b21b6;font-size:12px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;">$1</span>`
  );

  html = html.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>");

  highlightedParts.forEach((highlighted, index) => {
    html = html.replace(`__EMAIL_HIGHLIGHT_${index}__`, highlighted);
  });

  return html;
}

function richTextToEmailHtml(content: string): string {
  if (!content) return "";

  const decoded = decodeHtmlEntities(content).trim();
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(decoded);

  if (!hasHtml) {
    return plainTextToHtml(decoded);
  }

  return decoded
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<p[^>]*>/gi, '<p style="margin: 0 0 12px;">')
    .replace(/<ul[^>]*>/gi, '<ul style="margin: 0; padding-left: 18px;">')
    .replace(/<ol[^>]*>/gi, '<ol style="margin: 0; padding-left: 18px;">')
   .replace(/<li[^>]*>/gi, '<li style="margin: 0 0 8px;">')
   .replace(/<span[^>]*>/gi, '<span>')
   .replace(/<\/span>/gi, '</span>')
   .replace(/<(?!\/?(p|br|strong|b|em|i|u|span|ul|ol|li)\b)[^>]+>/gi, "");
}

function toEmailInlineText(value?: string | null): string {
  if (!value) return "";
  return stripHtmlForEmail(value).replace(/\s+/g, " ").trim();
}

function buildBrandedEmailTemplate(params: BrandedEmailTemplateParams): string {
  const {
    preheader,
    title,
    greeting,
    intro,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote,
  } = params;

  const preheaderText = preheader || "";

  const greetingHtml = greeting
    ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#17313a;font-weight:600;">${escapeHtml(
        greeting
      )}</p>`
    : "";

  const introHtml = intro
    ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#475467;">${escapeHtml(
        intro
      )}</p>`
    : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 18px;">
          <tr>
            <td
              align="center"
              bgcolor="#5b21b6"
              style="
                border-radius:14px;
                background-color:#5b21b6;
                background-image:linear-gradient(135deg, #5b21b6 0%, #0f766e 100%);
              "
            >
              <a
                href="${escapeHtml(ctaUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display:inline-block;
                  padding:14px 24px;
                  font-size:15px;
                  font-weight:700;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:14px;
                "
              >
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>
      `
      : "";

  const footerNoteHtml = footerNote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#667085;">${escapeHtml(
        footerNote
      )}</p>`
    : "";

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheaderText)}
    </div>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="width:100%;border-collapse:collapse;background-color:#f4f6fb;margin:0;padding:24px 0;"
    >
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              max-width:640px;
              border-collapse:collapse;
              background-color:#ffffff;
              border:1px solid #e5e7eb;
              border-radius:24px;
              overflow:hidden;
            "
          >
            <tr>
              <td
                style="
                  padding:26px 30px 22px;
                  background-color:#5b21b6;
                  background-image:linear-gradient(135deg, #5b21b6 0%, #0f766e 100%);
                "
              >
                <img
                  src="${EMAIL_LOGO_URL}"
                  alt="Eco do Bem"
                  width="150"
                  style="display:block;width:150px;max-width:150px;height:auto;border:0;"
                />

                <div
                  style="
                    display:inline-block;
                    margin-top:18px;
                    padding:7px 12px;
                    border-radius:999px;
                    background-color:rgba(255,255,255,0.16);
                    color:#ffffff;
                    font-size:11px;
                    font-weight:700;
                    letter-spacing:0.06em;
                    text-transform:uppercase;
                  "
                >
                  Sistema de Gestão de PDI
                </div>

                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#eef2ff;">
                  EVOLUIR • Eco do Bem
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 32px 30px;">
                <h1 style="margin:0 0 10px;font-size:30px;line-height:1.15;color:#111827;font-weight:800;letter-spacing:-0.02em;">
                  ${escapeHtml(title)}
                </h1>

                <div style="width:56px;height:4px;border-radius:999px;background:linear-gradient(135deg, #5b21b6 0%, #0f766e 100%);margin:0 0 22px;"></div>

                ${greetingHtml}
                ${introHtml}

                <div style="font-size:15px;line-height:1.85;color:#344054;">
                  ${bodyHtml}
                </div>

                ${ctaHtml}
                ${footerNoteHtml}
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px 28px;background-color:#fafafa;border-top:1px solid #eceff3;">
                <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:#667085;">
                  Este é um e-mail automático do <strong>Sistema de Gestão de PDI — EVOLUIR</strong>.
                </p>
                <p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:#667085;">
                  Não responda esta mensagem. Em caso de necessidade, acesse a plataforma para acompanhar a solicitação.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:#98a2b3;">
                  Eco do Bem - Ecossistema de Desenvolvimento
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function buildInfoBox(label: string, value: string): string {
  if (!value) return "";

  return `
    <div style="margin:0 0 12px;">
      <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6941c6;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">
        ${escapeHtml(label)}
      </p>
      <div style="padding:14px 16px;background-color:#f8f7ff;border:1px solid #e9d7fe;border-radius:14px;font-size:14px;line-height:1.7;color:#344054;">
        ${escapeHtml(value)}
      </div>
    </div>
  `.trim();
}

function buildNoticeBox(title: string, content: string): string {
  if (!content) return "";

  return `
    <div style="margin:18px 0;padding:16px 18px;background-color:#f8f7ff;border:1px solid #d9d6fe;border-radius:16px;">
      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5b21b6;font-weight:700;">
        ${escapeHtml(title)}
      </p>
      <div style="font-size:14px;line-height:1.75;color:#475467;">
        ${richTextToEmailHtml(content)}
      </div>
    </div>
  `.trim();
}

function buildActionBox(title: string, items: string[]): string {
  const validItems = items.filter(Boolean);
  if (!validItems.length) return "";

  const itemsHtml = validItems
    .map(
      item => `
        <li style="margin:0 0 8px;color:#344054;">
          ${escapeHtml(item)}
        </li>
      `
    )
    .join("");

  return `
    <div style="margin:20px 0;padding:16px 18px;background-color:#fffaf5;border:1px solid #fed7aa;border-radius:16px;">
      <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#b54708;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">
        ${escapeHtml(title)}
      </p>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.75;">
        ${itemsHtml}
      </ol>
    </div>
  `.trim();
}

function buildMetricGrid(items: Array<{ label: string; value: string | number }>): string {
  const validItems = items.filter(
    item =>
      item.value !== undefined &&
      item.value !== null &&
      String(item.value).trim() !== ""
  );
  if (!validItems.length) return "";

  const cardsHtml = validItems
    .map(
      item => `
        <td style="padding:0 6px 12px;vertical-align:top;">
          <div style="min-width:140px;padding:16px 14px;background-color:#f8f7ff;border:1px solid #e9d7fe;border-radius:16px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6941c6;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">
              ${escapeHtml(item.label)}
            </p>
            <p style="margin:0;font-size:24px;line-height:1.2;color:#111827;font-weight:800;">
              ${escapeHtml(String(item.value))}
            </p>
          </div>
        </td>
      `
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px;border-collapse:collapse;">
      <tr>
        ${cardsHtml}
      </tr>
    </table>
  `.trim();
}

function buildDataGroup(items: Array<{ label: string; value?: string | null }>): string {
  const validItems = items.filter(
    item => item.value && String(item.value).trim() !== ""
  );
  if (!validItems.length) return "";

  const rowsHtml = validItems
    .map(
      item => `
        <tr>
          <td style="padding:0 0 10px;font-size:13px;line-height:1.5;color:#6941c6;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">
            ${escapeHtml(item.label)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 14px;font-size:14px;line-height:1.7;color:#344054;">
            ${escapeHtml(String(item.value))}
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;padding:18px 18px 4px;background-color:#f8fafc;border:1px solid #e4e7ec;border-radius:16px;">
      ${rowsHtml}
    </table>
  `.trim();
}

function buildListBox(
  title: string,
  items: string[],
  tone: "purple" | "orange" | "neutral" = "purple"
): string {
  const validItems = items.filter(Boolean);
  if (!validItems.length) return "";

  const palette =
    tone === "orange"
      ? {
          bg: "#fffaf5",
          border: "#fed7aa",
          title: "#b54708",
          text: "#344054",
        }
      : tone === "neutral"
      ? {
          bg: "#f8fafc",
          border: "#e4e7ec",
          title: "#475467",
          text: "#344054",
        }
      : {
          bg: "#f8f7ff",
          border: "#d9d6fe",
          title: "#5b21b6",
          text: "#344054",
        };

  const itemsHtml = validItems
    .map(
      item => `
        <li style="margin:0 0 10px;color:${palette.text};">
          ${richTextToEmailHtml(item)}
        </li>
      `
    )
    .join("");

  return `
    <div style="margin:20px 0;padding:16px 18px;background-color:${palette.bg};border:1px solid ${palette.border};border-radius:16px;">
      <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${palette.title};font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">
        ${escapeHtml(title)}
      </p>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.75;">
        ${itemsHtml}
      </ul>
    </div>
  `.trim();
}

function buildTextCard(title: string, content: string): string {
  if (!content) return "";
  return `
    <div style="margin:18px 0;padding:16px 18px;background-color:#f8fafc;border:1px solid #e4e7ec;border-radius:16px;">
      <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#475467;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">
        ${escapeHtml(title)}
      </p>
      <div style="font-size:14px;line-height:1.8;color:#344054;">
        ${richTextToEmailHtml(content)}
      </div>
    </div>
  `.trim();
}

function buildStandardNotificationEmail(params: {
  title: string;
  greeting: string;
  intro: string;
  dataItems?: Array<{ label: string; value?: string | null }>;
  noticeTitle?: string;
  noticeContent?: string;
  actionTitle?: string;
  actionItems?: string[];
  extraHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  preheader?: string;
}): string {
  const {
    title,
    greeting,
    intro,
    dataItems = [],
    noticeTitle,
    noticeContent,
    actionTitle,
    actionItems = [],
    extraHtml,
    ctaLabel,
    ctaUrl,
    footerNote,
    preheader,
  } = params;

  const sections = [
    buildDataGroup(dataItems),
    noticeTitle && noticeContent ? buildNoticeBox(noticeTitle, noticeContent) : "",
    actionTitle && actionItems.length ? buildActionBox(actionTitle, actionItems) : "",
    extraHtml || "",
  ]
    .filter(Boolean)
    .join("");

  return buildBrandedEmailTemplate({
    preheader: preheader || intro,
    title,
    greeting,
    intro,
    bodyHtml:
      sections ||
      `<p style="margin:0;">Acesse o sistema para acompanhar esta atualização.</p>`,
    ctaLabel,
    ctaUrl,
    footerNote,
  });
}

function deriveTitleFromSubject(subject: string): string {
  return subject
    .replace(/^AÇÃO NECESSÁRIA\s*[-—]\s*/i, "")
    .replace(/^INFORMATIVO\s*[-—]\s*/i, "")
    .replace(/^RELATÓRIO\s*[-—]\s*/i, "")
    .replace(/^PARA A SUA CIÊNCIA\s*[-—]\s*/i, "")
    .replace(/^🎉\s*PARABÉNS\s*[-—]\s*/i, "")
    .replace(/\s+[-—]\s+[^—-]+$/, "")
    .trim();
}

function buildAutomaticBrandedHtmlFromBody(subject: string, body: string): string {
  const normalizedBody = body.trim();

  const parts = normalizedBody
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean);

  let greeting = "";
  let intro = "";
  const contentParts: string[] = [];

  for (const part of parts) {
    if (!greeting && /^(Prezado\(a\)|Olá[,!]?)/i.test(part)) {
      greeting = part;
      continue;
    }

    if (
      part.includes("NÃO RESPONDA ESTE EMAIL") ||
      part.includes("Sistema de Gestão de PDI") ||
      part === "---"
    ) {
      continue;
    }

    if (!intro) {
      intro = part;
      continue;
    }

    contentParts.push(part);
  }

  const cleanedGreeting = greeting.replace(/,$/, "").trim();
  const title = deriveTitleFromSubject(subject) || "Notificação do sistema";

  const bodyHtml = contentParts.length
    ? contentParts
        .map(part => `<p style="margin:0 0 16px;">${plainTextToHtml(part)}</p>`)
        .join("")
    : `<p style="margin:0;">Acesse o sistema para acompanhar esta atualização.</p>`;

  const needsAction =
    /AÇÃO NECESSÁRIA|pendente|aguarda|aguardando|ajuste|providências|vencidas/i.test(
      subject + " " + body
    );

  return buildBrandedEmailTemplate({
    preheader: intro || title,
    title,
    greeting: cleanedGreeting || undefined,
    intro:
      intro ||
      "Você recebeu uma atualização no Sistema de Gestão de PDI — EVOLUIR.",
    bodyHtml,
    ctaLabel: needsAction ? "Acessar o sistema" : "Ver no sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });
}

async function sendBrandedNotificationEmail(
  params: BrandedNotificationEmailParams
): Promise<boolean> {
  const {
    to,
    subject,
    plainTextBody,
    greeting,
    title,
    intro,
    bodyHtml,
    cc,
    preheader,
    ctaLabel,
    ctaUrl,
    footerNote,
  } = params;

  const html = buildBrandedEmailTemplate({
    preheader: preheader || title,
    title,
    greeting,
    intro,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote,
  });

  return sendEmail({
    to,
    subject,
    body: plainTextBody,
    cc,
    html,
  });
}

function createTransporter() {
  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, body } = payload;

  if (!ENV.smtpUser || !ENV.smtpPass) {
    console.warn("[Email] SMTP credentials not configured (SMTP_USER / SMTP_PASS).");
    return false;
  }

  try {
    const transporter = createTransporter();
    const htmlBody = payload.html || buildAutomaticBrandedHtmlFromBody(subject, body);

    const info = await transporter.sendMail({
      from: `"Eco do Bem - EVOLUIR" <${ENV.smtpUser}>`,
      to,
      ...(payload.cc ? { cc: payload.cc } : {}),
      subject,
      text: stripHtmlForEmail(body),
      html: htmlBody,
    });

    console.log(
      `[Email] Email enviado com sucesso para ${to} (messageId: ${info.messageId})`
    );
    return true;
  } catch (error: any) {
    console.warn(`[Email] Erro ao enviar email para ${to}:`, error.message || error);
    return false;
  }
}

function formatarTipoAjuste(tipoAjuste?: string, camposAjustar?: string): string {
  if (camposAjustar) {
    try {
      const parsed = JSON.parse(camposAjustar);
      if (parsed.camposSelecionados && Array.isArray(parsed.camposSelecionados)) {
        return `Alteração de: ${parsed.camposSelecionados.join(", ")}`;
      }
    } catch {
      return camposAjustar;
    }
  }

  if (tipoAjuste) {
    return tipoAjuste
      .replace("alteracao_descricao", "Alteração de Descrição")
      .replace("alteracao_prazo", "Alteração de Prazo")
      .replace("alteracao_competencia", "Alteração de Competência")
      .replace("cancelamento", "Cancelamento da Ação");
  }

  return "Ajuste Geral";
}

export async function sendEmailSolicitacaoAjuste(params: {
  leaderEmail: string;
  leaderName: string;
  colaboradorName: string;
  acaoNome: string;
  justificativa: string;
  camposAlterar: string[];
}): Promise<boolean> {
  const { leaderEmail, leaderName, colaboradorName, acaoNome, justificativa, camposAlterar } = params;

  const acaoNomeTexto = toEmailInlineText(acaoNome);
  const subject = `Informativo | Solicitação de ajuste respondida — ${colaboradorName}`;

  const body = `
Prezado(a) ${leaderName},

Informamos que a solicitação de ajuste na ação "${acaoNomeTexto}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    camposAlterar?.length
      ? buildListBox("Campos solicitados para alteração", camposAlterar, "purple")
      : "",
    justificativa ? buildTextCard("Justificativa", justificativa) : "",
  ]
    .filter(Boolean)
    .join("");

  const html = buildStandardNotificationEmail({
    preheader: `A solicitação de ajuste da ação ${acaoNomeTexto} foi respondida.`,
    title: "Solicitação de ajuste respondida",
    greeting: `Prezado(a) ${leaderName},`,
    intro:
      "A solicitação de ajuste enviada no contexto do PDI já foi analisada e está disponível para consulta.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Ação", value: acaoNomeTexto },
      { label: "Status", value: "Solicitação respondida" },
    ],
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse a plataforma para consultar a resposta registrada e acompanhar o andamento da solicitação.",
    extraHtml,
    ctaLabel: "Acessar o sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({
    to: leaderEmail,
    subject,
    body,
    html,
  });
}

export async function sendEmailParecerCKMParaLider(params: {
  liderEmail: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  parecerTipo: string;
  parecerTexto: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    liderEmail,
    liderName,
    colaboradorName,
    tituloAcao,
    parecerTipo,
    parecerTexto,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const subject = `Ação necessária | Solicitação aguardando seu parecer — ${colaboradorName}`;

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} aguarda seu parecer.

Acesse o Sistema para analisar a solicitação e registrar seu parecer.

Colaborador: ${colaboradorName}${departamento ? `\nDepartamento: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    parecerTipo ? buildInfoBox("Tipo de parecer", parecerTipo) : "",
    parecerTexto ? buildTextCard("Parecer registrado", parecerTexto) : "",
  ]
    .filter(Boolean)
    .join("");

  const html = buildStandardNotificationEmail({
    preheader: `A solicitação da ação ${tituloAcaoTexto} aguarda seu parecer.`,
    title: "Solicitação aguardando seu parecer",
    greeting: `Prezado(a) ${liderName},`,
    intro:
      "Uma solicitação de inclusão de nova ação foi analisada pela administração e agora depende do seu parecer para avançar no fluxo.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Aguardando parecer do líder" },
    ],
    noticeTitle: "Ação necessária",
    noticeContent:
      "Acesse o sistema para analisar a solicitação e registrar seu parecer.",
    extraHtml,
    ctaLabel: "Registrar parecer",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: liderEmail, subject, body, html });
}

export async function sendEmailParecerLiderParaGerente(params: {
  gerenteEmail: string;
  gerenteName: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  decisaoLider: string;
  justificativaLider: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    gerenteEmail,
    gerenteName,
    liderName,
    colaboradorName,
    tituloAcao,
    decisaoLider,
    justificativaLider,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const subject = `Ação necessária | Solicitação aguardando decisão final — ${colaboradorName}`;

  const body = `
Prezado(a) ${gerenteName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} aguarda sua decisão final.

Acesse o Sistema para analisar a solicitação e registrar sua decisão.

Colaborador: ${colaboradorName}${departamento ? `\nDepartamento: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    decisaoLider ? buildInfoBox("Decisão do líder", decisaoLider) : "",
    justificativaLider ? buildTextCard("Justificativa do líder", justificativaLider) : "",
  ]
    .filter(Boolean)
    .join("");

  const html = buildStandardNotificationEmail({
    preheader: `A solicitação da ação ${tituloAcaoTexto} aguarda sua decisão final.`,
    title: "Solicitação aguardando decisão final",
    greeting: `Prezado(a) ${gerenteName},`,
    intro:
      "Após o parecer do líder, a solicitação agora depende da sua decisão final para conclusão do fluxo.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Líder", value: liderName },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Aguardando decisão final" },
    ],
    noticeTitle: "Ação necessária",
    noticeContent:
      "Acesse o sistema para analisar a solicitação e registrar sua decisão final.",
    extraHtml,
    ctaLabel: "Analisar solicitação",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: gerenteEmail, subject, body, html });
}

export async function sendEmailAcaoAprovadaParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  pdiTitulo?: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao, pdiTitulo, departamento } =
    params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const subject = "Informativo | Sua solicitação de ação foi respondida";

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildStandardNotificationEmail({
    preheader: `Sua solicitação de ação ${tituloAcaoTexto} foi respondida.`,
    title: "Sua solicitação foi respondida",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "A sua solicitação de inclusão de nova ação no PDI foi analisada e já está disponível para consulta na plataforma.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "PDI", value: pdiTitulo || "" },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Solicitação respondida" },
    ],
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse o sistema para tomar ciência da resposta e acompanhar os próximos desdobramentos da sua solicitação.",
    ctaLabel: "Acessar o sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: colaboradorEmail, subject, body, html });
}

export async function sendEmailAcaoReprovadaParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao, departamento } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const subject = "Informativo | Sua solicitação de ação foi respondida";

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildStandardNotificationEmail({
    preheader: `Sua solicitação de ação ${tituloAcaoTexto} foi respondida.`,
    title: "Sua solicitação foi respondida",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "A sua solicitação de inclusão de nova ação no PDI foi analisada e já está disponível para consulta na plataforma.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Solicitação respondida" },
    ],
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse o sistema para consultar a resposta registrada e acompanhar os próximos desdobramentos da sua solicitação.",
    ctaLabel: "Acessar o sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: colaboradorEmail, subject, body, html });
}

export async function sendEmailAjusteSolicitadoParaLider(params: {
  liderEmail: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  tipoAjuste?: string;
  camposAjustar?: string;
  justificativa: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    liderEmail,
    liderName,
    colaboradorName,
    tituloAcao,
    tipoAjuste,
    camposAjustar,
    justificativa,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const tipoAjusteFormatado = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const subject = `Ação necessária | Ajuste aguardando validação — ${colaboradorName}`;

  const body = `
Prezado(a) ${liderName},

Informamos que o(a) colaborador(a) ${colaboradorName} solicitou ajuste na ação "${tituloAcaoTexto}".

A solicitação aguarda sua validação no Sistema.

Colaborador: ${colaboradorName}${departamento ? `\n- Departamento: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    buildInfoBox("Tipo de ajuste", tipoAjusteFormatado),
    buildTextCard("Justificativa apresentada", justificativa),
  ].join("");

  const html = buildStandardNotificationEmail({
    preheader: `Solicitação de ajuste aguardando sua validação.`,
    title: "Solicitação de ajuste aguardando validação",
    greeting: `Prezado(a) ${liderName},`,
    intro:
      "O colaborador registrou um pedido de ajuste em uma ação do PDI e a solicitação depende da sua validação para seguir no fluxo.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Aguardando validação do líder" },
    ],
    noticeTitle: "Ação necessária",
    noticeContent:
      "Acesse o sistema para validar a solicitação e orientar o próximo passo.",
    extraHtml,
    ctaLabel: "Validar ajuste",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: liderEmail, subject, body, html });
}

export async function sendEmailAjusteValidadoParaAdmin(params: {
  adminEmail: string;
  adminName: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  tipoAjuste?: string;
  camposAjustar?: string;
  justificativa: string;
  feedbackLider: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    adminEmail,
    adminName,
    liderName,
    colaboradorName,
    tituloAcao,
    tipoAjuste,
    camposAjustar,
    justificativa,
    feedbackLider,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const tipoAjusteFormatado = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const subject = `Ação necessária | Ajuste aguardando execução — ${colaboradorName}`;

  const body = `
Prezado(a) ${adminName},

Informamos que o ajuste solicitado para a ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} foi validado pelo líder.

A solicitação aguarda sua execução no Sistema.

Colaborador: ${colaboradorName}${departamento ? `\n- Departamento: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    buildInfoBox("Tipo de ajuste", tipoAjusteFormatado),
    buildTextCard("Justificativa do colaborador", justificativa),
    buildTextCard("Feedback do líder", feedbackLider),
  ].join("");

  const html = buildStandardNotificationEmail({
    preheader: `Ajuste autorizado pelo líder e aguardando execução.`,
    title: "Ajuste aguardando execução",
    greeting: `Prezado(a) ${adminName},`,
    intro:
      "O líder validou a solicitação de ajuste e agora a demanda está pronta para execução administrativa no sistema.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Líder", value: liderName },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Aguardando execução" },
    ],
    noticeTitle: "Ação necessária",
    noticeContent: "Acesse o sistema para executar ou concluir o ajuste solicitado.",
    extraHtml,
    ctaLabel: "Executar ajuste",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: adminEmail, subject, body, html });
}

export async function sendEmailAjusteAprovadoParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tipoAjuste?: string;
  camposAjustar?: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    colaboradorEmail,
    colaboradorName,
    tituloAcao,
    tipoAjuste,
    camposAjustar,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const tipoAjusteFormatado = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const subject = "Informativo | Sua solicitação de ajuste foi respondida";

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de ajuste na ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = buildInfoBox("Tipo de ajuste", tipoAjusteFormatado);

  const html = buildStandardNotificationEmail({
    preheader: `Sua solicitação de ajuste foi respondida.`,
    title: "Sua solicitação de ajuste foi respondida",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "O pedido de ajuste relacionado à sua ação do PDI foi analisado e já está disponível para consulta na plataforma.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Tipo de ajuste", value: tipoAjusteFormatado },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Solicitação respondida" },
    ],
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse o sistema para consultar o retorno registrado e acompanhar os próximos desdobramentos.",
    extraHtml,
    ctaLabel: "Acessar o sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: colaboradorEmail, subject, body, html });
}

export async function sendEmailAjusteReprovadoParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tipoAjuste?: string;
  camposAjustar?: string;
  justificativa?: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    colaboradorEmail,
    colaboradorName,
    tituloAcao,
    tipoAjuste,
    camposAjustar,
    justificativa,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const tipoAjusteFormatado = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const subject = "Informativo | Sua solicitação de ajuste foi respondida";

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de ajuste na ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    buildInfoBox("Tipo de ajuste", tipoAjusteFormatado),
    justificativa ? buildTextCard("Observação", justificativa) : "",
  ].join("");

  const html = buildStandardNotificationEmail({
    preheader: `Sua solicitação de ajuste foi respondida.`,
    title: "Sua solicitação de ajuste foi respondida",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "O pedido de ajuste relacionado à sua ação do PDI foi analisado e já está disponível para consulta na plataforma.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Tipo de ajuste", value: tipoAjusteFormatado },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Solicitação respondida" },
    ],
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse o sistema para consultar o retorno registrado e acompanhar os próximos desdobramentos.",
    extraHtml,
    ctaLabel: "Acessar o sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: colaboradorEmail, subject, body, html });
}

export async function sendEmailRevisaoSolicitadaParaCKM(params: {
  adminEmail: string;
  adminName: string | null;
  rhName: string | null;
  colaboradorName: string | null;
  tituloAcao: string;
  motivoRevisao: string;
  departamento?: string;
}) {
  const {
    adminEmail,
    adminName,
    rhName,
    colaboradorName,
    tituloAcao,
    motivoRevisao,
    departamento,
  } = params;

  const adminDisplay = adminName || "Administrador";
  const colaboradorDisplay = colaboradorName || "N/A";
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const subject = `Ação necessária | Nova análise necessária — ${colaboradorDisplay}`;

  const body = `
Prezado(a) ${adminDisplay},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorDisplay} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorDisplay}${departamento ? ` | Depto: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    rhName ? buildInfoBox("Solicitado por", rhName) : "",
    buildTextCard("Motivo da revisão", motivoRevisao),
  ].join("");

  const html = buildStandardNotificationEmail({
    preheader: `Nova revisão necessária para a solicitação.`,
    title: "Nova análise necessária",
    greeting: `Prezado(a) ${adminDisplay},`,
    intro:
      "Uma solicitação de inclusão de nova ação retornou para nova análise administrativa.",
    dataItems: [
      { label: "Colaborador", value: colaboradorDisplay },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Revisão solicitada" },
    ],
    extraHtml,
    ctaLabel: "Analisar solicitação",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: adminEmail, subject, body, html });
}

export async function sendEmailRevisaoLiderParaCKM(params: {
  adminEmail: string;
  adminName: string | null;
  liderName: string | null;
  colaboradorName: string | null;
  tituloAcao: string;
  motivoRevisao: string;
  departamento?: string;
}) {
  const {
    adminEmail,
    adminName,
    liderName,
    colaboradorName,
    tituloAcao,
    motivoRevisao,
    departamento,
  } = params;

  const adminDisplay = adminName || "Administrador";
  const colaboradorDisplay = colaboradorName || "N/A";
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const subject = `Ação necessária | Esclarecimento solicitado — ${colaboradorDisplay}`;

  const body = `
Prezado(a) ${adminDisplay},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorDisplay} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorDisplay}${departamento ? ` | Depto: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    liderName ? buildInfoBox("Líder", liderName) : "",
    buildTextCard("Motivo do esclarecimento", motivoRevisao),
  ].join("");

  const html = buildStandardNotificationEmail({
    preheader: `Esclarecimento solicitado pelo líder.`,
    title: "Esclarecimento solicitado",
    greeting: `Prezado(a) ${adminDisplay},`,
    intro:
      "O líder registrou a necessidade de esclarecimento adicional sobre a solicitação de inclusão de nova ação.",
    dataItems: [
      { label: "Colaborador", value: colaboradorDisplay },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Esclarecimento solicitado" },
    ],
    extraHtml,
    ctaLabel: "Abrir solicitação",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({ to: adminEmail, subject, body, html });
}

export async function sendEmailSolicitacaoVetada(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  liderEmail: string;
  liderName: string;
  tituloAcao: string;
  vetadoPor: "gestor" | "rh";
  justificativa?: string;
  departamento?: string;
}): Promise<boolean> {
  const {
    colaboradorEmail,
    colaboradorName,
    liderEmail,
    liderName,
    tituloAcao,
    vetadoPor,
    justificativa,
    departamento,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const deptText = departamento ? ` | Depto: ${departamento}` : "";
  const vetadoPorTexto = vetadoPor === "gestor" ? "Gestor" : "RH";
  const CC_RELACIONAMENTO = "relacionamento@ckmtalents.net";

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${deptText}
Líder: ${liderName}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const bodyLider = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtmlColaborador = [
    buildInfoBox("Líder", liderName),
    buildInfoBox("Encerrado por", vetadoPorTexto),
    justificativa ? buildTextCard("Observação", justificativa) : "",
  ].join("");

  const extraHtmlLider = [
    buildInfoBox("Encerrado por", vetadoPorTexto),
    justificativa ? buildTextCard("Observação", justificativa) : "",
  ].join("");

  const htmlColaborador = buildStandardNotificationEmail({
    preheader: `Sua solicitação de ação não foi aprovada.`,
    title: "Solicitação não aprovada",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "A sua solicitação de inclusão de nova ação foi encerrada e já está disponível para consulta na plataforma.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Colaborador", value: colaboradorName },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Solicitação encerrada" },
    ],
    extraHtml: extraHtmlColaborador,
    ctaLabel: "Ver retorno",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  const htmlLider = buildStandardNotificationEmail({
    preheader: `Solicitação de ação encerrada.`,
    title: "Solicitação encerrada",
    greeting: `Prezado(a) ${liderName},`,
    intro:
      "A solicitação de inclusão de nova ação do colaborador foi encerrada e já está disponível para consulta na plataforma.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Colaborador", value: colaboradorName },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Solicitação encerrada" },
    ],
    extraHtml: extraHtmlLider,
    ctaLabel: "Consultar no sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: "Informativo | Sua solicitação de ação não foi aprovada",
    body: bodyColaborador,
    cc: CC_RELACIONAMENTO,
    html: htmlColaborador,
  });

  const envioLider = await sendEmail({
    to: liderEmail,
    subject: `Informativo | Solicitação de ação não aprovada — ${colaboradorName}`,
    body: bodyLider,
    cc: CC_RELACIONAMENTO,
    html: htmlLider,
  });

  return envioColaborador && envioLider;
}

export async function sendEmailAcaoAprovadaParaLider(params: {
  liderEmail: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  departamento?: string;
}): Promise<boolean> {
  const { liderEmail, liderName, colaboradorName, tituloAcao, departamento } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const CC_RELACIONAMENTO = "relacionamento@ckmtalents.net";
  const subject = `Informativo | Ação aprovada e incluída no PDI — ${colaboradorName}`;

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${departamento ? ` | Depto: ${departamento}` : ""}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildStandardNotificationEmail({
    preheader: `Ação aprovada e incluída no PDI.`,
    title: "Ação aprovada e incluída no PDI",
    greeting: `Prezado(a) ${liderName},`,
    intro:
      "A solicitação de inclusão de nova ação do colaborador foi aprovada e já consta no PDI.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "Departamento", value: departamento || "" },
      { label: "Status", value: "Ação aprovada" },
    ],
    ctaLabel: "Ver no sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({
    to: liderEmail,
    subject,
    body,
    cc: CC_RELACIONAMENTO,
    html,
  });
}

export async function sendEmailRelatorioIncluidoNoPDI(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  liderEmail?: string;
  liderName?: string;
  tituloPdi: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, liderEmail, liderName, tituloPdi } = params;

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

Gostaríamos de informar que foi incluído o Relatório de Performance no seu PDI "${tituloPdi}".

Acesse o link ${getSystemUrl()} para ter acesso.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const htmlColaborador = buildStandardNotificationEmail({
    preheader: `Relatório de performance incluído no PDI.`,
    title: "Relatório incluído no PDI",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "Foi incluído um novo Relatório de Performance em seu Plano de Desenvolvimento Individual.",
    dataItems: [
      { label: "PDI", value: tituloPdi },
      { label: "Status", value: "Relatório disponível" },
    ],
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse a plataforma para visualizar o relatório e acompanhar os registros vinculados ao seu PDI.",
    ctaLabel: "Acessar plataforma",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: "Informativo | Relatório incluído no seu PDI",
    body: bodyColaborador,
    html: htmlColaborador,
  });

  let envioLider = true;

  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Gostaríamos de informar que foi incluído o Relatório de Performance no PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName}.

Acesse o link ${getSystemUrl()} para ter acesso.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    const htmlLider = buildStandardNotificationEmail({
      preheader: `Relatório de performance incluído no PDI da equipe.`,
      title: "Relatório incluído no PDI",
      greeting: `Prezado(a) ${liderName},`,
      intro:
        "Foi incluído um novo Relatório de Performance no PDI do colaborador abaixo.",
      dataItems: [
        { label: "Colaborador", value: colaboradorName },
        { label: "PDI", value: tituloPdi },
        { label: "Status", value: "Relatório disponível" },
      ],
      ctaLabel: "Acessar plataforma",
      ctaUrl: getSystemUrl(),
      footerNote: "Mensagem enviada automaticamente pela plataforma.",
    });

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `Informativo | Relatório incluído no PDI — ${colaboradorName}`,
      body: bodyLider,
      html: htmlLider,
    });
  }

  return envioColaborador && envioLider;
}

export async function sendEmailParabensEvidenciaAprovada(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tituloPdi: string;
  liderEmail?: string;
  liderName?: string;
}): Promise<boolean> {
  const {
    colaboradorEmail,
    colaboradorName,
    tituloAcao,
    tituloPdi,
    liderEmail,
    liderName,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

🎉 PARABÉNS! Sua evidência foi APROVADA!

A evidência da ação "${tituloAcaoTexto}" do seu PDI "${tituloPdi}" foi aprovada pelo administrador. Isso significa que você concluiu mais uma etapa importante do seu Plano de Desenvolvimento Individual.

Cada meta alcançada é um passo a mais na construção da sua trajetória profissional. Continue com essa dedicação e comprometimento!

💼 PUBLIQUE SUA CONQUISTA NO LINKEDIN!

O LinkedIn é a vitrine dos profissionais de alta performance. Compartilhe essa conquista com a sua rede! Mostre ao mercado que você investe no seu desenvolvimento contínuo e que está sempre evoluindo.

Dica: Ao publicar, mencione a competência desenvolvida e como ela contribui para o seu crescimento profissional.

👉 Acesse agora: https://www.linkedin.com

Continue evoluindo! 🚀

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtmlColaborador = [
    buildNoticeBox(
      "Parabéns",
      "Sua evidência foi aprovada e mais uma etapa do seu desenvolvimento foi concluída com sucesso."
    ),
    buildTextCard(
      "Compartilhe sua conquista",
      "Você pode divulgar esse marco profissional no LinkedIn, destacando a competência desenvolvida e o impacto do aprendizado em sua trajetória."
    ),
  ].join("");

  const htmlColaborador = buildStandardNotificationEmail({
    preheader: `Sua evidência foi aprovada.`,
    title: "Parabéns! Sua evidência foi aprovada",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "A evidência enviada foi aprovada e agora consta como mais uma etapa concluída em seu Plano de Desenvolvimento Individual.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "PDI", value: tituloPdi },
      { label: "Status", value: "Evidência aprovada" },
    ],
    extraHtml: extraHtmlColaborador,
    ctaLabel: "Ver no sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: "Parabéns | Sua evidência foi aprovada",
    body: bodyColaborador,
    html: htmlColaborador,
  });

  let envioLider = true;

  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Informamos que a evidência da ação "${tituloAcaoTexto}" do PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName} foi APROVADA pelo administrador.

O(A) colaborador(a) concluiu mais uma etapa do seu Plano de Desenvolvimento Individual. Parabenize-o(a) pela conquista!

${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    const extraHtmlLider = buildNoticeBox(
      "Sugestão de desenvolvimento da Competência",
      "Parabenize o(a) colaborador(a) pela conquista e reforce a importância de manter a consistência na execução do PDI."
    );

    const htmlLider = buildStandardNotificationEmail({
      preheader: `Evidência aprovada no PDI da equipe.`,
      title: "Evidência aprovada",
      greeting: `Prezado(a) ${liderName},`,
      intro:
        "A evidência enviada pelo colaborador foi aprovada e uma nova etapa do PDI foi concluída com sucesso.",
      dataItems: [
        { label: "Colaborador", value: colaboradorName },
        { label: "Ação", value: tituloAcaoTexto },
        { label: "PDI", value: tituloPdi },
        { label: "Status", value: "Evidência aprovada" },
      ],
      extraHtml: extraHtmlLider,
      ctaLabel: "Ver no sistema",
      ctaUrl: getSystemUrl(),
      footerNote: "Mensagem enviada automaticamente pela plataforma.",
    });

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `Informativo | Evidência aprovada — ${colaboradorName}`,
      body: bodyLider,
      html: htmlLider,
    });
  }

  return envioColaborador && envioLider;
}

export async function sendEmailEvidenciaReprovada(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tituloPdi: string;
  justificativa: string;
  avaliadorName: string;
  liderEmail?: string;
  liderName?: string;
}): Promise<boolean> {
  const {
    colaboradorEmail,
    colaboradorName,
    tituloAcao,
    tituloPdi,
    justificativa,
    avaliadorName,
    liderEmail,
    liderName,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

Informamos que a evidência enviada para a ação "${tituloAcaoTexto}" do seu PDI "${tituloPdi}" foi DEVOLVIDA para ajustes.

📋 MOTIVO DA DEVOLUÇÃO:

"${justificativa}"

O QUE FAZER AGORA:

1. Acesse o sistema em ${getSystemUrl()}
2. Verifique a justificativa acima com atenção
3. Faça os ajustes necessários na sua evidência
4. Reenvie a evidência corrigida pelo sistema

Lembre-se: a devolução de uma evidência é uma oportunidade de aprimorar o seu trabalho.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtmlColaborador = [
    buildTextCard("Motivo da devolução", justificativa),
    buildActionBox("O que fazer agora", [
      "Acesse o sistema para consultar o registro completo da devolução.",
      "Verifique a justificativa apresentada pelo avaliador.",
      "Realize os ajustes necessários na evidência.",
      "Reenvie a evidência corrigida pela plataforma.",
    ]),
  ].join("");

  const htmlColaborador = buildStandardNotificationEmail({
    preheader: `Sua evidência foi devolvida para ajustes.`,
    title: "Evidência devolvida para ajustes",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "A evidência enviada foi devolvida para ajustes e precisa de revisão antes de novo envio.",
    dataItems: [
      { label: "Ação", value: tituloAcaoTexto },
      { label: "PDI", value: tituloPdi },
      { label: "Avaliador", value: avaliadorName },
      { label: "Status", value: "Aguardando correção" },
    ],
    extraHtml: extraHtmlColaborador,
    ctaLabel: "Corrigir evidência",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: "Ação necessária | Evidência devolvida para ajustes",
    body: bodyColaborador,
    html: htmlColaborador,
  });

  let envioLider = true;

  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Informamos que a evidência da ação "${tituloAcaoTexto}" do PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName} foi DEVOLVIDA para ajustes pelo avaliador ${avaliadorName}.

Motivo da devolução: "${justificativa}"

O(A) colaborador(a) foi notificado(a) e orientado(a) a realizar os ajustes necessários e reenviar a evidência.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    const extraHtmlLider = buildTextCard("Motivo da devolução", justificativa);

    const htmlLider = buildStandardNotificationEmail({
      preheader: `Evidência devolvida para ajustes.`,
      title: "Evidência devolvida",
      greeting: `Prezado(a) ${liderName},`,
      intro:
        "A evidência enviada pelo colaborador foi devolvida para ajustes e o colaborador já foi orientado a revisar o material.",
      dataItems: [
        { label: "Colaborador", value: colaboradorName },
        { label: "Ação", value: tituloAcaoTexto },
        { label: "PDI", value: tituloPdi },
        { label: "Avaliador", value: avaliadorName },
      ],
      extraHtml: extraHtmlLider,
      ctaLabel: "Acompanhar ajuste",
      ctaUrl: getSystemUrl(),
      footerNote: "Mensagem enviada automaticamente pela plataforma.",
    });

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `Informativo | Evidência devolvida — ${colaboradorName}`,
      body: bodyLider,
      html: htmlLider,
    });
  }

  return envioColaborador && envioLider;
}

export async function sendEmailAcoesVencidasEmpregado(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  pdisComAcoesVencidas: Array<{ tituloPdi: string; qtdAcoesVencidas: number }>;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, pdisComAcoesVencidas } = params;

  const listaPdis = pdisComAcoesVencidas.map(
    p => `${p.tituloPdi} — ${p.qtdAcoesVencidas} ação(ões) vencida(s)`
  );

  const body = `
Prezado(a) ${colaboradorName},

Informamos que há ações vencidas no seu Plano de Desenvolvimento Individual (PDI):

${listaPdis.map(item => `• ${item}`).join("\n")}

Acesse o sistema em ${getSystemUrl()} e providencie a inclusão das evidências das ações pendentes.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildStandardNotificationEmail({
    preheader: `Você possui ações vencidas no PDI.`,
    title: "Você possui ações vencidas",
    greeting: `Prezado(a) ${colaboradorName},`,
    intro:
      "Identificamos ações vencidas em seu Plano de Desenvolvimento Individual que exigem regularização.",
    extraHtml: buildListBox("PDIs com pendências", listaPdis, "orange"),
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse o sistema e providencie a inclusão das evidências das ações pendentes o quanto antes.",
    ctaLabel: "Regularizar pendências",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({
    to: colaboradorEmail,
    subject: "Ação necessária | Ações vencidas no seu PDI",
    body,
    html,
  });
}

export async function sendEmailAcoesVencidasLider(params: {
  liderEmail: string;
  liderName: string;
  subordinadosComPendencias: Array<{ nomeColaborador: string; qtdAcoesVencidas: number }>;
}): Promise<boolean> {
  const { liderEmail, liderName, subordinadosComPendencias } = params;

  const listaSubordinados = subordinadosComPendencias.map(
    s => `${s.nomeColaborador} — ${s.qtdAcoesVencidas} ação(ões) vencida(s)`
  );

  const body = `
Prezado(a) ${liderName},

Informamos que há ações vencidas nos PDIs da sua equipe:

${listaSubordinados.map(item => `• ${item}`).join("\n")}

Acesse o sistema em ${getSystemUrl()} e converse com sua equipe para regularizar as pendências.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildStandardNotificationEmail({
    preheader: `Sua equipe possui ações vencidas.`,
    title: "Sua equipe possui pendências",
    greeting: `Prezado(a) ${liderName},`,
    intro:
      "Foram identificadas ações vencidas nos PDIs de colaboradores da sua equipe que precisam de acompanhamento.",
    extraHtml: buildListBox("Colaboradores com pendências", listaSubordinados, "orange"),
    noticeTitle: "Próximo passo",
    noticeContent:
      "Acesse a plataforma e acompanhe com sua equipe a regularização das ações pendentes.",
    ctaLabel: "Acompanhar equipe",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({
    to: liderEmail,
    subject: "Ação necessária | Ações vencidas na equipe",
    body,
    html,
  });
}

export async function sendEmailResumoVarreduraAdmin(params: {
  adminEmail: string;
  adminName: string;
  totalAcoesVencidas: number;
  empregadosNotificados: number;
  lideresNotificados: number;
  dataVarredura: string;
}): Promise<boolean> {
  const {
    adminEmail,
    adminName,
    totalAcoesVencidas,
    empregadosNotificados,
    lideresNotificados,
    dataVarredura,
  } = params;

  const body = `
Prezado(a) ${adminName},

Informamos que a varredura quinzenal de ações vencidas foi executada com sucesso em ${dataVarredura}.

• Total de ações vencidas há mais de 15 dias: ${totalAcoesVencidas}
• Empregados notificados: ${empregadosNotificados}
• Líderes notificados: ${lideresNotificados}

Acesse o sistema para mais detalhes: ${getSystemUrl()}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildStandardNotificationEmail({
    preheader: `Resumo da varredura quinzenal.`,
    title: "Resumo da varredura quinzenal",
    greeting: `Prezado(a) ${adminName},`,
    intro:
      `A varredura quinzenal de ações vencidas foi executada com sucesso em ${dataVarredura}.`,
    extraHtml: buildMetricGrid([
      { label: "Ações vencidas", value: totalAcoesVencidas },
      { label: "Empregados", value: empregadosNotificados },
      { label: "Líderes", value: lideresNotificados },
    ]),
    noticeTitle: "Resumo",
    noticeContent:
      "Os empregados foram notificados para inclusão das evidências pendentes e os líderes foram informados sobre as pendências da equipe.",
    ctaLabel: "Ver no sistema",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({
    to: adminEmail,
    subject: "Relatório | Varredura quinzenal de ações vencidas",
    body,
    html,
  });
}

export async function sendEmailEvidenciaEnviadaParaLider(params: {
  liderEmail: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  tituloPdi: string;
  oQueRealizou?: string;
  comoAplicou?: string;
  resultadoPratico?: string;
  impactoPercentual?: number;
  principalAprendizado?: string;
}): Promise<boolean> {
  const {
    liderEmail,
    liderName,
    colaboradorName,
    tituloAcao,
    tituloPdi,
    oQueRealizou,
    comoAplicou,
    resultadoPratico,
    impactoPercentual,
    principalAprendizado,
  } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${liderName},

Seu empregado ${colaboradorName} enviou uma nova evidência referente à ação "${tituloAcaoTexto}" do PDI "${tituloPdi}".

Acesse o sistema para visualizar os detalhes e acompanhar a evolução registrada.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const extraHtml = [
    oQueRealizou ? buildTextCard("O que realizou", oQueRealizou) : "",
    comoAplicou ? buildTextCard("Como aplicou na prática", comoAplicou) : "",
    resultadoPratico ? buildTextCard("Resultado prático", resultadoPratico) : "",
    impactoPercentual != null
      ? buildInfoBox("Impacto declarado", `${impactoPercentual}%`)
      : "",
    principalAprendizado
      ? buildTextCard("Principal aprendizado", principalAprendizado)
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = buildStandardNotificationEmail({
    preheader: `Nova evidência enviada para acompanhamento.`,
    title: "Nova evidência enviada",
    greeting: `Prezado(a) ${liderName},`,
    intro:
      "O colaborador registrou uma nova evidência e relatou a aplicação prática do aprendizado no contexto do trabalho.",
    dataItems: [
      { label: "Colaborador", value: colaboradorName },
      { label: "Ação", value: tituloAcaoTexto },
      { label: "PDI", value: tituloPdi },
      { label: "Status", value: "Evidência enviada" },
    ],
    noticeTitle: "Sugestão de desenvolvimento da Competência",
    noticeContent:
      "Reconheça a entrega do colaborador e acompanhe a consistência da aplicação prática relatada.",
    extraHtml,
    ctaLabel: "Avaliar evidência",
    ctaUrl: getSystemUrl(),
    footerNote: "Mensagem enviada automaticamente pela plataforma.",
  });

  return sendEmail({
    to: liderEmail,
    subject: `Informativo | Nova evidência enviada — ${colaboradorName}`,
    body,
    html,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  resetLink: string;
}): Promise<boolean> {
  const { to, name, resetLink } = params;

  const nomeExibicao = name || "usuário(a)";
  const subject = "Acesso | Redefinição de senha";

  const body = `
Prezado(a) ${nomeExibicao},

Recebemos uma solicitação para redefinir a sua senha de acesso ao Sistema de Gestão de PDI — EVOLUIR.

Para cadastrar uma nova senha, acesse o link abaixo:
${resetLink}

IMPORTANTE:
- Este link é pessoal e temporário.
- O link expira em 1 hora.
- Se você não solicitou a redefinição, ignore este e-mail.
- Por segurança, após definir a nova senha, este link deixará de funcionar.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const html = buildBrandedEmailTemplate({
    preheader: "Recebemos uma solicitação para redefinir sua senha de acesso.",
    title: "Redefinição de senha",
    greeting: `Olá, ${nomeExibicao}.`,
    intro:
      "Recebemos uma solicitação para redefinir a sua senha de acesso ao Sistema de Gestão de PDI — EVOLUIR.",
    bodyHtml: `
      <p style="margin:0 0 16px;">
        Para cadastrar uma nova senha, use o botão abaixo:
      </p>

      <div
        style="
          margin:0 0 18px;
          padding:16px 18px;
          border:1px solid #d9d6fe;
          border-radius:16px;
          background-color:#f8f7ff;
        "
      >
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#5b21b6;">
          Importante
        </p>
        <ul style="margin:0;padding-left:18px;color:#475569;">
          <li>Este link é pessoal e temporário.</li>
          <li>O link expira em <strong>1 hora</strong>.</li>
          <li>Se você não solicitou a redefinição, ignore este e-mail.</li>
          <li>Após definir a nova senha, este link deixará de funcionar.</li>
        </ul>
      </div>

      <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;word-break:break-word;">
        Se o botão não abrir, copie e cole este link no navegador:<br />
        <span style="color:#0f766e;">${escapeHtml(resetLink)}</span>
      </p>
    `,
    ctaLabel: "Redefinir minha senha",
    ctaUrl: resetLink,
    footerNote:
      "Por segurança, este acesso é temporário e deve ser utilizado apenas por você.",
  });

  return sendEmail({
    to,
    subject,
    body,
    html,
  });
}

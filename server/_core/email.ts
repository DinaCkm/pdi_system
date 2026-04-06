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

const EMAIL_LOGO_URL =
  "https://iili.io/BRQZgfI.png";

// CC global removido a pedido do administrador

/**
 * Remove tags HTML de uma string para uso em emails plain text
 */
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

function plainTextToHtml(text: string): string {
  if (!text) return "";

  return escapeHtml(text)
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

/**
 * Converte qualquer conteúdo potencialmente rico/HTML em texto simples
 * e em uma única linha, para uso seguro em assunto e corpo do email.
 */
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
    ? `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #17313a;">${escapeHtml(greeting)}</p>`
    : "";

  const introHtml = intro
    ? `<p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #425466;">${escapeHtml(intro)}</p>`
    : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 18px;">
          <tr>
            <td
              align="center"
              bgcolor="#5b21b6"
              style="
                border-radius: 14px;
                background-color: #5b21b6;
                background-image: linear-gradient(135deg, #5b21b6 0%, #0f766e 100%);
              "
            >
              <a
                href="${escapeHtml(ctaUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display: inline-block;
                  padding: 14px 24px;
                  font-size: 15px;
                  font-weight: 700;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 14px;
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
    ? `<p style="margin: 18px 0 0; font-size: 12px; line-height: 1.7; color: #667085;">${escapeHtml(
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
  <body style="margin: 0; padding: 0; background-color: #f4f6fb;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
      ${escapeHtml(preheaderText)}
    </div>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="width: 100%; border-collapse: collapse; background-color: #f4f6fb; margin: 0; padding: 24px 0;"
    >
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width: 100%;
              max-width: 640px;
              border-collapse: collapse;
              background-color: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 24px;
              overflow: hidden;
            "
          >
            <tr>
              <td
                style="
                  padding: 26px 30px 22px;
                  background-color: #5b21b6;
                  background-image: linear-gradient(135deg, #5b21b6 0%, #0f766e 100%);
                "
              >
                <img
                  src="${EMAIL_LOGO_URL}"
                  alt="Eco do Bem"
                  style="display: block; max-width: 150px; width: 100%; height: auto;"
                />

                <div
                  style="
                    display: inline-block;
                    margin-top: 18px;
                    padding: 7px 12px;
                    border-radius: 999px;
                    background-color: rgba(255, 255, 255, 0.16);
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                  "
                >
                  Sistema de Gestão de PDI
                </div>

                <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #eef2ff;">
                  EVOLUIR • Eco do Bem
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 32px 32px 28px;">
                <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.2; color: #111827;">
                  ${escapeHtml(title)}
                </h1>

                ${greetingHtml}
                ${introHtml}

                <div style="font-size: 15px; line-height: 1.75; color: #344054;">
                  ${bodyHtml}
                </div>

                ${ctaHtml}
                ${footerNoteHtml}
              </td>
            </tr>

            <tr>
              <td style="padding: 18px 32px 26px; background-color: #fafafa; border-top: 1px solid #eceff3;">
                <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #667085;">
                  Este é um e-mail automático do Sistema de Gestão de PDI — EVOLUIR. Não responda esta mensagem.
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #667085;">
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

/**
 * Cria o transporter SMTP reutilizável (Nodemailer + Google SMTP)
 */
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

/**
 * Envia email para um usuário
 * Utiliza Nodemailer com SMTP do Google (relacionamento@ckmtalents.net)
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, body } = payload;

  if (!ENV.smtpUser || !ENV.smtpPass) {
    console.warn("[Email] SMTP credentials not configured (SMTP_USER / SMTP_PASS).");
    return false;
  }

  try {
    const transporter = createTransporter();

    const htmlBody =
      payload.html ||
      `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222;">
          <p>${plainTextToHtml(body)}</p>
        </div>
      `;

    const info = await transporter.sendMail({
      from: `"Eco do Bem - EVOLUIR" <${ENV.smtpUser}>`,
      to,
      ...(payload.cc ? { cc: payload.cc } : {}),
      subject,
      text: stripHtmlForEmail(body),
      html: htmlBody,
    });

    console.log(`[Email] Email enviado com sucesso para ${to} (messageId: ${info.messageId})`);
    return true;
  } catch (error: any) {
    console.warn(`[Email] Erro ao enviar email para ${to}:`, error.message || error);
    return false;
  }
}

const AVISO_NAO_RESPONDA = `
⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA ⚠️`;

const ASSINATURA = `
---
Sistema de Gestão de PDI — Eco do Bem - Ecossistema de Desenvolvimento`;

const TEXTO_PADRAO_ACESSE = 'Acesse o Sistema para tomar ciência e providências. Você possui notificações pendentes.';

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

  const acaoNomeTexto = toEmailInlineText(acaoNome);

  const body = `
Prezado(a) ${leaderName},

Informamos que a solicitação de ajuste na ação "${acaoNomeTexto}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: leaderEmail,
    subject: "PARA A SUA CIÊNCIA - ALTERAÇÃO NO PDI",
    body,
  });
}

/**
 * Envia email para o Líder quando o Administrador (CKM) emite parecer na solicitação de nova ação.
 * O líder deve acessar o sistema e dar seu parecer.
 */
export async function sendEmailParecerCKMParaLider(params: {
  liderEmail: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  parecerTipo: string;
  parecerTexto: string;
  departamento?: string;
}): Promise<boolean> {
  const { liderEmail, liderName, colaboradorName, tituloAcao, parecerTipo, parecerTexto, departamento } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const deptText = departamento ? `\nDepartamento: ${departamento}` : '';

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} aguarda seu parecer.

Acesse o Sistema para analisar a solicitação e registrar seu parecer.

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: liderEmail,
    subject: `AÇÃO NECESSÁRIA - Solicitação de Ação Aguardando seu Parecer — ${colaboradorName}`,
    body,
  });
}

/**
 * Envia email para o Gerente quando o Líder dá seu parecer na solicitação de nova ação.
 * O gerente deve acessar o sistema e dar a aprovação final.
 */
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
  const { gerenteEmail, gerenteName, liderName, colaboradorName, tituloAcao, decisaoLider, justificativaLider, departamento } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const deptText = departamento ? `\nDepartamento: ${departamento}` : '';

  const body = `
Prezado(a) ${gerenteName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} aguarda sua decisão final.

Acesse o Sistema para analisar a solicitação e registrar sua decisão.

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: gerenteEmail,
    subject: `AÇÃO NECESSÁRIA - Solicitação de Ação Aguardando sua Decisão Final — ${colaboradorName}`,
    body,
  });
}

/**
 * Envia email para o Colaborador quando o Gerente aprova a ação e ela é incluída no PDI.
 */
export async function sendEmailAcaoAprovadaParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  pdiTitulo?: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ação foi Respondida — ${tituloAcaoTexto}`,
    body,
  });
}

/**
 * Envia email para o Colaborador quando o Gerente reprova a ação.
 */
export async function sendEmailAcaoReprovadaParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ação foi Respondida — ${tituloAcaoTexto}`,
    body,
  });
}


/**
 * FLUXO DE SOLICITAÇÃO DE AJUSTE - E-MAILS
 */

/**
 * Função auxiliar para formatar o tipo de ajuste.
 * Suporta tanto o formato antigo (tipoAjuste string) quanto o novo (camposAjustar JSON).
 */
function formatarTipoAjuste(tipoAjuste?: string, camposAjustar?: string): string {
  if (camposAjustar) {
    try {
      const parsed = JSON.parse(camposAjustar);
      if (parsed.camposSelecionados && Array.isArray(parsed.camposSelecionados)) {
        return `Alteração de: ${parsed.camposSelecionados.join(', ')}`;
      }
    } catch {
      return camposAjustar;
    }
  }

  if (tipoAjuste) {
    return tipoAjuste
      .replace('alteracao_descricao', 'Alteração de Descrição')
      .replace('alteracao_prazo', 'Alteração de Prazo')
      .replace('alteracao_competencia', 'Alteração de Competência')
      .replace('cancelamento', 'Cancelamento da Ação');
  }

  return 'Ajuste Geral';
}

/**
 * Etapa 1: Envia email para o Líder quando o Colaborador solicita ajuste na ação.
 * O líder deve acessar o sistema e validar o ajuste.
 */
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
  const { liderEmail, liderName, colaboradorName, tituloAcao, tipoAjuste, camposAjustar, justificativa, departamento } = params;

  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${liderName},

Informamos que o(a) colaborador(a) ${colaboradorName} solicitou ajuste na ação "${tituloAcaoTexto}".

A solicitação aguarda sua validação no Sistema.

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: liderEmail,
    subject: `AÇÃO NECESSÁRIA - Solicitação de Ajuste Aguardando sua Validação — ${colaboradorName}`,
    body,
  });
}

/**
 * Etapa 2: Envia email para o Admin (CKM) quando o Líder valida o ajuste.
 * A CKM deve acessar o sistema e realizar ou reprovar o ajuste.
 */
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
  const { adminEmail, adminName, liderName, colaboradorName, tituloAcao, tipoAjuste, camposAjustar, justificativa, feedbackLider, departamento } = params;

  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${adminName},

Informamos que o ajuste solicitado para a ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} foi validado pelo líder.

A solicitação aguarda sua execução no Sistema.

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: adminEmail,
    subject: `AÇÃO NECESSÁRIA - Ajuste Autorizado pelo Líder Aguardando Execução — ${colaboradorName}`,
    body,
  });
}

/**
 * Etapa 3: Envia email para o Colaborador quando a CKM aprova o ajuste.
 */
export async function sendEmailAjusteAprovadoParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tipoAjuste?: string;
  camposAjustar?: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de ajuste na ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ajuste foi Respondida — ${tituloAcaoTexto}`,
    body,
  });
}

/**
 * Etapa 3 (alternativa): Envia email para o Colaborador quando a CKM reprova o ajuste.
 */
export async function sendEmailAjusteReprovadoParaColaborador(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tipoAjuste?: string;
  camposAjustar?: string;
  justificativa?: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de ajuste na ação "${tituloAcaoTexto}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ajuste foi Respondida — ${tituloAcaoTexto}`,
    body,
  });
}

/**
 * Envia email para o CKM/Admin informando que o RH solicitou revisão
 */
export async function sendEmailRevisaoSolicitadaParaCKM(params: {
  adminEmail: string;
  adminName: string | null;
  rhName: string | null;
  colaboradorName: string | null;
  tituloAcao: string;
  motivoRevisao: string;
  departamento?: string;
}) {
  const { adminEmail, adminName, rhName, colaboradorName, tituloAcao, motivoRevisao, departamento } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${adminName || 'Administrador'},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName || 'N/A'} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName || 'N/A'}${departamento ? ` | Depto: ${departamento}` : ''}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: adminEmail,
    subject: `REVISÃO SOLICITADA — Nova Análise Necessária — ${tituloAcaoTexto}`,
    body,
  });
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
  const { adminEmail, adminName, liderName, colaboradorName, tituloAcao, motivoRevisao, departamento } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const body = `
Prezado(a) ${adminName || 'Administrador'},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName || 'N/A'} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName || 'N/A'}${departamento ? ` | Depto: ${departamento}` : ''}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: adminEmail,
    subject: `ESCLARECIMENTO SOLICITADO PELO LÍDER — ${tituloAcaoTexto}`,
    body,
  });
}


/**
 * Envia email para o Líder e Empregado (com CC para relacionamento@ckmtalents.net)
 * quando uma solicitação de ação é vetada/encerrada.
 * Informa que devem acessar o Sistema para tomar ciência e providências.
 */
export async function sendEmailSolicitacaoVetada(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  liderEmail: string;
  liderName: string;
  tituloAcao: string;
  vetadoPor: 'gestor' | 'rh';
  justificativa?: string;
  departamento?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, liderEmail, liderName, tituloAcao, vetadoPor, justificativa, departamento } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const deptText = departamento ? ` | Depto: ${departamento}` : '';

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

  const CC_RELACIONAMENTO = 'relacionamento@ckmtalents.net';

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Solicitação de Ação NÃO APROVADA — ${tituloAcaoTexto}`,
    body: bodyColaborador,
    cc: CC_RELACIONAMENTO,
  });

  const envioLider = await sendEmail({
    to: liderEmail,
    subject: `INFORMATIVO — Solicitação de Ação NÃO APROVADA — ${colaboradorName} — ${tituloAcaoTexto}`,
    body: bodyLider,
    cc: CC_RELACIONAMENTO,
  });

  return envioColaborador && envioLider;
}


/**
 * Envia email para o Líder informando que a ação do colaborador foi APROVADA pelo RH
 * e incluída no PDI. CC para relacionamento@ckmtalents.net.
 */
export async function sendEmailAcaoAprovadaParaLider(params: {
  liderEmail: string;
  liderName: string;
  colaboradorName: string;
  tituloAcao: string;
  departamento?: string;
}): Promise<boolean> {
  const { liderEmail, liderName, colaboradorName, tituloAcao, departamento } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);
  const deptText = departamento ? ` | Depto: ${departamento}` : '';

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcaoTexto}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const CC_RELACIONAMENTO = 'relacionamento@ckmtalents.net';

  return sendEmail({
    to: liderEmail,
    subject: `INFORMATIVO — Ação APROVADA e Incluída no PDI — ${colaboradorName} — ${tituloAcaoTexto}`,
    body,
    cc: CC_RELACIONAMENTO,
  });
}


/**
 * Envia email informativo ao empregado e ao líder quando um relatório de performance
 * é incluído no PDI do empregado.
 */
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

Acesse o link https://pdi.ecodobem.com para ter acesso.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Relatório de Performance Incluído no seu PDI — ${tituloPdi}`,
    body: bodyColaborador,
  });

  let envioLider = true;
  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Gostaríamos de informar que foi incluído o Relatório de Performance no PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName}.

Acesse o link https://pdi.ecodobem.com para ter acesso.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `INFORMATIVO — Relatório de Performance Incluído no PDI — ${colaboradorName} — ${tituloPdi}`,
      body: bodyLider,
    });
  }

  return envioColaborador && envioLider;
}


/**
 * Envia e-mail de parabéns ao empregado quando sua evidência é aprovada pelo administrador.
 * Inclui incentivo para publicar a conquista no LinkedIn.
 */
export async function sendEmailParabensEvidenciaAprovada(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  tituloAcao: string;
  tituloPdi: string;
  liderEmail?: string;
  liderName?: string;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, tituloAcao, tituloPdi, liderEmail, liderName } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

🎉 PARABÉNS! Sua evidência foi APROVADA!

A evidência da ação "${tituloAcaoTexto}" do seu PDI "${tituloPdi}" foi aprovada pelo administrador. Isso significa que você concluiu mais uma etapa importante do seu Plano de Desenvolvimento Individual.

Cada meta alcançada é um passo a mais na construção da sua trajetória profissional. Continue com essa dedicação e comprometimento!

💼 PUBLIQUE SUA CONQUISTA NO LINKEDIN!

O LinkedIn é a vitrine dos profissionais de alta performance. Compartilhe essa conquista com a sua rede! Mostre ao mercado que você investe no seu desenvolvimento contínuo e que está sempre evoluindo.

Dica: Ao publicar, mencione a competência desenvolvida e como ela contribui para o seu crescimento profissional. Profissionais que compartilham suas conquistas no LinkedIn têm até 3x mais visibilidade para novas oportunidades.

👉 Acesse agora: https://www.linkedin.com

Continue evoluindo! 🚀

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `🎉 PARABÉNS — Evidência Aprovada — ${tituloAcaoTexto}`,
    body: bodyColaborador,
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

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `INFORMATIVO — Evidência Aprovada — ${colaboradorName} — ${tituloAcaoTexto}`,
      body: bodyLider,
    });
  }

  return envioColaborador && envioLider;
}


/**
 * Envia e-mail ao empregado quando sua evidência é reprovada pelo administrador ou líder.
 * Inclui a justificativa do avaliador para que o empregado saiba o que precisa ajustar.
 */
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
  const { colaboradorEmail, colaboradorName, tituloAcao, tituloPdi, justificativa, avaliadorName, liderEmail, liderName } = params;
  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

Informamos que a evidência enviada para a ação "${tituloAcaoTexto}" do seu PDI "${tituloPdi}" foi DEVOLVIDA para ajustes.

📋 MOTIVO DA DEVOLUÇÃO:

"${justificativa}"

O QUE FAZER AGORA:

1. Acesse o sistema em https://pdi.ecodobem.com
2. Verifique a justificativa acima com atenção
3. Faça os ajustes necessários na sua evidência
4. Reenvie a evidência corrigida pelo sistema

Lembre-se: a devolução de uma evidência é uma oportunidade de aprimorar o seu trabalho. Revise os pontos indicados e reenvie com as correções solicitadas.

Em caso de dúvidas, entre em contato com o seu líder direto.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `AÇÃO NECESSÁRIA — Evidência Devolvida para Ajustes — ${tituloAcaoTexto}`,
    body: bodyColaborador,
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

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `INFORMATIVO — Evidência Devolvida — ${colaboradorName} — ${tituloAcaoTexto}`,
      body: bodyLider,
    });
  }

  return envioColaborador && envioLider;
}

/**
 * Envia e-mail ao empregado informando que há ações vencidas no seu PDI.
 * Um único e-mail por empregado, listando os PDIs com ações vencidas.
 */
export async function sendEmailAcoesVencidasEmpregado(params: {
  colaboradorEmail: string;
  colaboradorName: string;
  pdisComAcoesVencidas: Array<{ tituloPdi: string; qtdAcoesVencidas: number }>;
}): Promise<boolean> {
  const { colaboradorEmail, colaboradorName, pdisComAcoesVencidas } = params;

  const listaPdis = pdisComAcoesVencidas
    .map(p => `  • ${p.tituloPdi} — ${p.qtdAcoesVencidas} ação(ões) vencida(s)`)
    .join('\n');

  const body = `
Prezado(a) ${colaboradorName},

Informamos que há ações vencidas no seu Plano de Desenvolvimento Individual (PDI):

${listaPdis}

Acesse o sistema em https://pdi.ecodobem.com e providencie a inclusão das evidências das ações pendentes.

Lembre-se: manter seu PDI atualizado é fundamental para o seu desenvolvimento profissional e para o acompanhamento da sua evolução.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return await sendEmail({
    to: colaboradorEmail,
    subject: `AÇÃO NECESSÁRIA — Ações Vencidas no seu PDI`,
    body,
  });
}

/**
 * Envia e-mail ao líder informando que há ações vencidas na sua equipe.
 * Um único e-mail por líder, consolidando todos os subordinados com pendências.
 */
export async function sendEmailAcoesVencidasLider(params: {
  liderEmail: string;
  liderName: string;
  subordinadosComPendencias: Array<{ nomeColaborador: string; qtdAcoesVencidas: number }>;
}): Promise<boolean> {
  const { liderEmail, liderName, subordinadosComPendencias } = params;

  const listaSubordinados = subordinadosComPendencias
    .map(s => `  • ${s.nomeColaborador} — ${s.qtdAcoesVencidas} ação(ões) vencida(s)`)
    .join('\n');

  const body = `
Prezado(a) ${liderName},

Informamos que há ações vencidas nos PDIs da sua equipe:

${listaSubordinados}

Acesse o sistema em https://pdi.ecodobem.com e converse com sua equipe para regularizar as pendências.

O acompanhamento próximo do desenvolvimento da sua equipe é essencial para garantir a evolução de todos.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return await sendEmail({
    to: liderEmail,
    subject: `AÇÃO NECESSÁRIA — Ações Vencidas na Sua Equipe`,
    body,
  });
}


/**
 * Envia e-mail ao administrador com o resumo da varredura quinzenal de ações vencidas
 */
export async function sendEmailResumoVarreduraAdmin(params: {
  adminEmail: string;
  adminName: string;
  totalAcoesVencidas: number;
  empregadosNotificados: number;
  lideresNotificados: number;
  dataVarredura: string;
}): Promise<boolean> {
  const { adminEmail, adminName, totalAcoesVencidas, empregadosNotificados, lideresNotificados, dataVarredura } = params;

  const body = `
Prezado(a) ${adminName},

Informamos que a varredura quinzenal de ações vencidas foi executada com sucesso em ${dataVarredura}.

📊 RESUMO DA VARREDURA:

• Total de ações vencidas há mais de 15 dias: ${totalAcoesVencidas}
• Empregados notificados: ${empregadosNotificados}
• Líderes notificados: ${lideresNotificados}

Os empregados receberam um e-mail solicitando que acessem o sistema e incluam as evidências pendentes.
Os líderes receberam um e-mail informando sobre as ações vencidas na sua equipe.

Acesse o sistema para mais detalhes: https://pdi.ecodobem.com

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return await sendEmail({
    to: adminEmail,
    subject: `RELATÓRIO — Varredura Quinzenal de Ações Vencidas (${dataVarredura})`,
    body,
  });
}


/**
 * Envia e-mail ao líder quando o empregado envia uma evidência de ação realizada,
 * destacando a aplicabilidade prática e incentivando o líder a parabenizar o empregado.
 */
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
  const { liderEmail, liderName, colaboradorName, tituloAcao, tituloPdi,
    oQueRealizou, comoAplicou, resultadoPratico, impactoPercentual, principalAprendizado } = params;

  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  let relatoDetalhado = '';
  if (oQueRealizou) relatoDetalhado += `\n📋 O QUE REALIZOU:\n${oQueRealizou}\n`;
  if (comoAplicou) relatoDetalhado += `\n🔧 COMO APLICOU NA PRÁTICA:\n${comoAplicou}\n`;
  if (resultadoPratico) relatoDetalhado += `\n📊 RESULTADO PRÁTICO:\n${resultadoPratico}\n`;
  if (impactoPercentual != null) relatoDetalhado += `\n📈 IMPACTO DECLARADO: ${impactoPercentual}%\n`;
  if (principalAprendizado) relatoDetalhado += `\n💡 PRINCIPAL APRENDIZADO:\n${principalAprendizado}\n`;

  const body = `
Prezado(a) ${liderName},

Seu empregado ${colaboradorName} enviou a evidência de uma ação realizada e ele destacou que a realização dela possibilitou que ele aplicasse no dia a dia e que isto se configurou como um aprendizado prático no seu dia a dia, evidenciando uma evolução na sua performance.

Parabenize ele por esta conquista!

Veja abaixo o relato:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 AÇÃO: ${tituloAcaoTexto}
📄 PDI: ${tituloPdi}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${relatoDetalhado}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return await sendEmail({
    to: liderEmail,
    subject: `EVIDÊNCIA ENVIADA — ${colaboradorName} — ${tituloAcaoTexto}`,
    body,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  resetLink: string;
}): Promise<boolean> {
  const { to, name, resetLink } = params;

  const nomeExibicao = name || "usuário(a)";
  const subject = "Redefinição de senha — EVOLUIR";

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
      <p style="margin: 0 0 16px;">
        Para cadastrar uma nova senha, use o botão abaixo:
      </p>

      <div
        style="
          margin: 0 0 18px;
          padding: 16px 18px;
          border: 1px solid #d9d6fe;
          border-radius: 16px;
          background-color: #f8f7ff;
        "
      >
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #5b21b6;">
          Importante
        </p>
        <ul style="margin: 0; padding-left: 18px; color: #475569;">
          <li>Este link é pessoal e temporário.</li>
          <li>O link expira em <strong>1 hora</strong>.</li>
          <li>Se você não solicitou a redefinição, ignore este e-mail.</li>
          <li>Após definir a nova senha, este link deixará de funcionar.</li>
        </ul>
      </div>

      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #64748b; word-break: break-word;">
        Se o botão não abrir, copie e cole este link no navegador:<br />
        <span style="color: #0f766e;">${escapeHtml(resetLink)}</span>
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

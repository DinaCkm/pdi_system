import { ENV } from "./env";
import { Resend } from "resend";

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  cc?: string;
};

// CC global: todos os emails enviados pelo sistema terão cópia para este endereço
const GLOBAL_CC_EMAIL = 'jumakiyama@gmail.com';

/**
 * Remove tags HTML de uma string para uso em emails plain text
 */
function stripHtmlForEmail(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Envia email para um usuário
 * Utiliza Resend API para envio de emails transacionais
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, body } = payload;

  if (!ENV.resendApiKey) {
    console.warn("[Email] Resend API key not configured (RESEND_API_KEY).");
    return false;
  }

  try {
    const resend = new Resend(ENV.resendApiKey);
    const ccList = payload.cc
      ? [payload.cc, GLOBAL_CC_EMAIL].filter(Boolean)
      : [GLOBAL_CC_EMAIL];

    const { data, error } = await resend.emails.send({
      from: 'Eco do Bem - EVOLUIR <onboarding@resend.dev>',
      to: [to],
      cc: ccList,
      subject,
      text: stripHtmlForEmail(body),
      html: body,
    });

    if (error) {
      console.warn(`[Email] Erro Resend ao enviar para ${to}:`, error.message);
      return false;
    }

    console.log(`[Email] Email enviado com sucesso para ${to} (id: ${data?.id})`);
    return true;
  } catch (error: any) {
    console.warn(`[Email] Erro ao enviar email para ${to}:`, error.message || error);
    return false;
  }
}

const AVISO_NAO_RESPONDA = `
⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA ECO_EVOLUIR ⚠️`;

const ASSINATURA = `
---
Sistema de Gestão de PDI — Eco do Bem - Ecossistema de Desenvolvimento
Eco_Evoluir`;

const TEXTO_PADRAO_ACESSE = 'Acesse o Sistema Eco_Evoluir para tomar ciência e providências. Você possui notificações pendentes.';

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

Informamos que a solicitação de ajuste na ação "${acaoNome}" do(a) colaborador(a) ${colaboradorName} foi respondida.

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

  const tipoParecer = parecerTipo === 'com_aderencia' ? 'COM ADERÊNCIA' : 'SEM ADERÊNCIA';
  const deptText = departamento ? `\nDepartamento: ${departamento}` : '';

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

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

  const decisaoText = decisaoLider === 'aprovado' ? 'APROVADA' : 'REPROVADA';
  const deptText = departamento ? `\nDepartamento: ${departamento}` : '';

  const body = `
Prezado(a) ${gerenteName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

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

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcao}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ação foi Respondida — ${tituloAcao}`,
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

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcao}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ação foi Respondida — ${tituloAcao}`,
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
  // Formato novo: camposAjustar é um JSON com array de campos selecionados
  if (camposAjustar) {
    try {
      const parsed = JSON.parse(camposAjustar);
      if (parsed.camposSelecionados && Array.isArray(parsed.camposSelecionados)) {
        return `Alteração de: ${parsed.camposSelecionados.join(', ')}`;
      }
    } catch {
      // Se não for JSON válido, usa como texto direto
      return camposAjustar;
    }
  }

  // Formato antigo: tipoAjuste é uma string com código
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

  const tipoText = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de ajuste na ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

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

  const tipoText = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';

  const body = `
Prezado(a) ${adminName},

Informamos que a solicitação de ajuste na ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

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

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de ajuste na ação "${tituloAcao}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ajuste foi Respondida — ${tituloAcao}`,
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

  const body = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de ajuste na ação "${tituloAcao}" foi respondida.

${TEXTO_PADRAO_ACESSE}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Sua Solicitação de Ajuste foi Respondida — ${tituloAcao}`,
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

  const body = `
Prezado(a) ${adminName || 'Administrador'},

Informamos que a solicitação de inclusão de nova ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName || 'N/A'} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName || 'N/A'}${departamento ? ` | Depto: ${departamento}` : ''}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: adminEmail,
    subject: `REVISÃO SOLICITADA — Nova Análise Necessária — ${tituloAcao}`,
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

  const body = `
Prezado(a) ${adminName || 'Administrador'},

Informamos que a solicitação de inclusão de nova ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName || 'N/A'} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName || 'N/A'}${departamento ? ` | Depto: ${departamento}` : ''}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: adminEmail,
    subject: `ESCLARECIMENTO SOLICITADO PELO LÍDER — ${tituloAcao}`,
    body,
  });
}


/**
 * Envia email para o Líder e Empregado (com CC para relacionamento@ckmtalents.net)
 * quando uma solicitação de ação é vetada/encerrada.
 * Informa que devem acessar o Sistema Eco_Evoluir para tomar ciência e providências.
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

  const quemVetou = vetadoPor === 'gestor' ? 'Gestor (Líder)' : 'RH';
  const deptText = departamento ? ` | Depto: ${departamento}` : '';

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

Informamos que a sua solicitação de inclusão de nova ação "${tituloAcao}" foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${deptText}
Líder: ${liderName}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const bodyLider = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const CC_RELACIONAMENTO = 'relacionamento@ckmtalents.net';

  // Enviar para o colaborador com CC para relacionamento
  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Solicitação de Ação NÃO APROVADA — ${tituloAcao}`,
    body: bodyColaborador,
    cc: `${CC_RELACIONAMENTO}, ${GLOBAL_CC_EMAIL}`,
  });

  // Enviar para o líder com CC para relacionamento
  const envioLider = await sendEmail({
    to: liderEmail,
    subject: `INFORMATIVO — Solicitação de Ação NÃO APROVADA — ${colaboradorName} — ${tituloAcao}`,
    body: bodyLider,
    cc: `${CC_RELACIONAMENTO}, ${GLOBAL_CC_EMAIL}`,
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
  const deptText = departamento ? ` | Depto: ${departamento}` : '';

  const body = `
Prezado(a) ${liderName},

Informamos que a solicitação de inclusão de nova ação "${tituloAcao}" do(a) colaborador(a) ${colaboradorName} foi respondida.

${TEXTO_PADRAO_ACESSE}

Colaborador: ${colaboradorName}${deptText}

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  const CC_RELACIONAMENTO = 'relacionamento@ckmtalents.net';

  return sendEmail({
    to: liderEmail,
    subject: `INFORMATIVO — Ação APROVADA e Incluída no PDI — ${colaboradorName} — ${tituloAcao}`,
    body,
    cc: `${CC_RELACIONAMENTO}, ${GLOBAL_CC_EMAIL}`,
  });
}

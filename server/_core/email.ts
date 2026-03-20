import { ENV } from "./env";
import nodemailer from "nodemailer";

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
    const ccList = payload.cc
      ? `${payload.cc}, ${GLOBAL_CC_EMAIL}`
      : GLOBAL_CC_EMAIL;

    const info = await transporter.sendMail({
      from: `"Eco do Bem - EVOLUIR" <${ENV.smtpUser}>`,
      to,
      cc: ccList,
      subject,
      text: stripHtmlForEmail(body),
      html: body,
    });

    console.log(`[Email] Email enviado com sucesso para ${to} (messageId: ${info.messageId})`);
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

Acesse o link https://www.evoluirckm.com para ter acesso.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  // Enviar para o colaborador
  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO — Relatório de Performance Incluído no seu PDI — ${tituloPdi}`,
    body: bodyColaborador,
  });

  // Enviar para o líder, se disponível
  let envioLider = true;
  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Gostaríamos de informar que foi incluído o Relatório de Performance no PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName}.

Acesse o link https://www.evoluirckm.com para ter acesso.

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

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

🎉 PARABÉNS! Sua evidência foi APROVADA!

A evidência da ação "${tituloAcao}" do seu PDI "${tituloPdi}" foi aprovada pelo administrador. Isso significa que você concluiu mais uma etapa importante do seu Plano de Desenvolvimento Individual.

Cada meta alcançada é um passo a mais na construção da sua trajetória profissional. Continue com essa dedicação e comprometimento!

💼 PUBLIQUE SUA CONQUISTA NO LINKEDIN!

O LinkedIn é a vitrine dos profissionais de alta performance. Compartilhe essa conquista com a sua rede! Mostre ao mercado que você investe no seu desenvolvimento contínuo e que está sempre evoluindo.

Dica: Ao publicar, mencione a competência desenvolvida e como ela contribui para o seu crescimento profissional. Profissionais que compartilham suas conquistas no LinkedIn têm até 3x mais visibilidade para novas oportunidades.

👉 Acesse agora: https://www.linkedin.com

Continue evoluindo! 🚀

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  // Enviar para o colaborador
  const envioColaborador = await sendEmail({
    to: colaboradorEmail,
    subject: `🎉 PARABÉNS — Evidência Aprovada — ${tituloAcao}`,
    body: bodyColaborador,
  });

  // Enviar cópia informativa para o líder, se disponível
  let envioLider = true;
  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Informamos que a evidência da ação "${tituloAcao}" do PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName} foi APROVADA pelo administrador.

O(A) colaborador(a) concluiu mais uma etapa do seu Plano de Desenvolvimento Individual. Parabenize-o(a) pela conquista!

${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `INFORMATIVO — Evidência Aprovada — ${colaboradorName} — ${tituloAcao}`,
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

  const bodyColaborador = `
Prezado(a) ${colaboradorName},

Informamos que a evidência enviada para a ação "${tituloAcao}" do seu PDI "${tituloPdi}" foi DEVOLVIDA para ajustes.

📋 MOTIVO DA DEVOLUÇÃO:

"${justificativa}"

O QUE FAZER AGORA:

1. Acesse o sistema em https://www.evoluirckm.com
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
    subject: `AÇÃO NECESSÁRIA — Evidência Devolvida para Ajustes — ${tituloAcao}`,
    body: bodyColaborador,
  });

  // Enviar cópia informativa para o líder, se disponível
  let envioLider = true;
  if (liderEmail && liderName) {
    const bodyLider = `
Prezado(a) ${liderName},

Informamos que a evidência da ação "${tituloAcao}" do PDI "${tituloPdi}" do(a) colaborador(a) ${colaboradorName} foi DEVOLVIDA para ajustes pelo avaliador ${avaliadorName}.

Motivo da devolução: "${justificativa}"

O(A) colaborador(a) foi notificado(a) e orientado(a) a realizar os ajustes necessários e reenviar a evidência.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    envioLider = await sendEmail({
      to: liderEmail,
      subject: `INFORMATIVO — Evidência Devolvida — ${colaboradorName} — ${tituloAcao}`,
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

Acesse o sistema em https://www.evoluirckm.com e providencie a inclusão das evidências das ações pendentes.

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

Acesse o sistema em https://www.evoluirckm.com e converse com sua equipe para regularizar as pendências.

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

Acesse o sistema para mais detalhes: https://www.evoluirckm.com

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return await sendEmail({
    to: adminEmail,
    subject: `RELATÓRIO — Varredura Quinzenal de Ações Vencidas (${dataVarredura})`,
    body,
  });
}

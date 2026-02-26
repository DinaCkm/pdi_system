import { ENV } from "./env";

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  cc?: string;
};

// CC global: todos os emails enviados pelo sistema terão cópia para este endereço
const GLOBAL_CC_EMAIL = 'jumakiyama@gmail.com';

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
      body: JSON.stringify({ to, subject, body, cc: payload.cc || GLOBAL_CC_EMAIL }),
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

const AVISO_NAO_RESPONDA = `
⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA EVOLUIR CKM ⚠️`;

const ASSINATURA = `
---
Sistema de Gestão de PDI — CKM Talents
Evoluir CKM`;

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

Informamos que a CKM Talents analisou a solicitação de inclusão de nova ação no PDI do seu liderado e emitiu seu parecer técnico. Agora é necessário que você acesse o sistema e registre sua decisão (aprovar ou reprovar).

DETALHES DA SOLICITAÇÃO:
- Colaborador: ${colaboradorName}${deptText}
- Título da Ação: ${tituloAcao}
- Parecer CKM: ${tipoParecer}
- Observação CKM: ${parecerTexto}

Acesse o sistema Evoluir CKM para avaliar e registrar seu parecer sobre esta solicitação.
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

Informamos que o líder ${liderName} registrou seu parecer sobre a solicitação de inclusão de nova ação no PDI. Agora é necessário que você acesse o sistema e registre sua decisão final.

DETALHES DA SOLICITAÇÃO:
- Colaborador: ${colaboradorName}${deptText}
- Título da Ação: ${tituloAcao}
- Decisão do Líder: ${decisaoText}
- Justificativa do Líder: ${justificativaLider}

Acesse o sistema Evoluir CKM para avaliar e registrar sua decisão final sobre esta solicitação.
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
  const { colaboradorEmail, colaboradorName, tituloAcao, pdiTitulo, departamento } = params;

  const pdiText = pdiTitulo ? `\n- PDI: ${pdiTitulo}` : '';
  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';

  const body = `
Prezado(a) ${colaboradorName},

Temos o prazer de informar que sua solicitação de inclusão de nova ação foi APROVADA e já foi incluída automaticamente no seu PDI!

DETALHES DA AÇÃO APROVADA:
- Título da Ação: ${tituloAcao}${pdiText}${deptText}

Acesse o sistema Evoluir CKM para visualizar a ação no seu PDI e iniciar o desenvolvimento.
${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `PARABÉNS - Sua Solicitação de Ação foi Aprovada e Incluída no PDI — ${tituloAcao}`,
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
  const { colaboradorEmail, colaboradorName, tituloAcao, departamento } = params;

  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';

  const body = `
Prezado(a) ${colaboradorName},

Informamos que sua solicitação de inclusão de nova ação NÃO foi aprovada na etapa final de análise.

DETALHES DA SOLICITAÇÃO:
- Título da Ação: ${tituloAcao}${deptText}

Solicite feedback ao seu gestor sobre a motivação da decisão.
${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO - Sua Solicitação de Ação Não Foi Aprovada — ${tituloAcao}`,
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

Informamos que seu liderado ${colaboradorName} solicitou um AJUSTE em uma ação do PDI. É necessário que você acesse o sistema e registre se está de acordo ou não com a alteração solicitada.

DETALHES DA SOLICITAÇÃO DE AJUSTE:
- Colaborador: ${colaboradorName}${deptText}
- Ação: ${tituloAcao}
- Tipo de Ajuste: ${tipoText}
- Justificativa do Colaborador: ${justificativa}

Acesse o sistema Evoluir CKM para avaliar e registrar seu parecer sobre esta solicitação de ajuste.
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

Informamos que o líder ${liderName} AUTORIZOU a solicitação de ajuste do colaborador ${colaboradorName}. Agora é necessário que você acesse o sistema e realize o ajuste ou reprove a solicitação.

DETALHES DA SOLICITAÇÃO DE AJUSTE:
- Colaborador: ${colaboradorName}${deptText}
- Líder: ${liderName}
- Ação: ${tituloAcao}
- Tipo de Ajuste: ${tipoText}
- Justificativa do Colaborador: ${justificativa}
- Parecer do Líder: DE ACORDO
- Feedback do Líder: ${feedbackLider}

Acesse o sistema Evoluir CKM para realizar o ajuste solicitado.
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
  const { colaboradorEmail, colaboradorName, tituloAcao, tipoAjuste, camposAjustar, departamento } = params;

  const tipoText = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';

  const body = `
Prezado(a) ${colaboradorName},

Informamos que sua solicitação de ajuste na ação do PDI foi APROVADA e as alterações já foram aplicadas!

DETALHES DO AJUSTE APROVADO:
- Ação: ${tituloAcao}${deptText}
- Tipo de Ajuste: ${tipoText}

Acesse o sistema Evoluir CKM para visualizar as alterações aplicadas na sua ação.
${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `APROVADO - Sua Solicitação de Ajuste foi Realizada — ${tituloAcao}`,
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
  const { colaboradorEmail, colaboradorName, tituloAcao, tipoAjuste, camposAjustar, justificativa, departamento } = params;

  const tipoText = formatarTipoAjuste(tipoAjuste, camposAjustar);
  const deptText = departamento ? `\n- Departamento: ${departamento}` : '';
  const justText = justificativa ? `\n- Justificativa: ${justificativa}` : '';

  const body = `
Prezado(a) ${colaboradorName},

Informamos que sua solicitação de ajuste na ação do PDI NÃO foi aprovada.

DETALHES DA SOLICITAÇÃO:
- Ação: ${tituloAcao}${deptText}
- Tipo de Ajuste: ${tipoText}${justText}

Solicite feedback ao seu gestor sobre a motivação da decisão.
${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: colaboradorEmail,
    subject: `INFORMATIVO - Sua Solicitação de Ajuste Não Foi Aprovada — ${tituloAcao}`,
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

O RH (${rhName || 'Gerente'}) solicitou uma REVISÃO na solicitação de inclusão de ação no PDI.

📋 DETALHES DA SOLICITAÇÃO:
• Ação: ${tituloAcao}
• Colaborador: ${colaboradorName || 'N/A'}${departamento ? `\n• Departamento: ${departamento}` : ''}

📝 MOTIVO DA REVISÃO:
${motivoRevisao}

⚠️ AÇÃO NECESSÁRIA:
É necessário emitir um novo parecer técnico (Rodada 2) para esta solicitação.
Acesse o sistema para reanalisar e emitir seu parecer.

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

O Líder ${liderName || '(Gestor)'} solicitou um ESCLARECIMENTO sobre o parecer técnico da solicitação de inclusão de ação no PDI.

📋 DETALHES DA SOLICITAÇÃO:
• Ação: ${tituloAcao}
• Colaborador: ${colaboradorName || 'N/A'}${departamento ? `\n• Departamento: ${departamento}` : ''}

📝 MOTIVO DO ESCLARECIMENTO:
${motivoRevisao}

⚠️ AÇÃO NECESSÁRIA:
É necessário complementar/atualizar o parecer técnico para esta solicitação.
Acesse o sistema para reanalisar e emitir seu parecer atualizado.

${AVISO_NAO_RESPONDA}
${ASSINATURA}
  `.trim();

  return sendEmail({
    to: adminEmail,
    subject: `ESCLARECIMENTO SOLICITADO PELO LÍDER — ${tituloAcao}`,
    body,
  });
}

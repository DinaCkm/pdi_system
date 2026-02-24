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

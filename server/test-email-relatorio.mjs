/**
 * Script de teste: envia e-mail de relatório incluído no PDI para 2 colaboradores.
 * Uso: node server/test-email-relatorio.mjs
 */
import nodemailer from 'nodemailer';

// Carregar variáveis de ambiente do .env
import { config } from 'dotenv';
config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const GLOBAL_CC = 'jumakiyama@gmail.com';

if (!SMTP_USER || !SMTP_PASS) {
  console.error('SMTP_USER e SMTP_PASS devem estar configurados no .env');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

const AVISO = '⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA ECO_EVOLUIR ⚠️';
const ASSINATURA = `---\nSistema de Gestão de PDI — Eco do Bem - Ecossistema de Desenvolvimento\nEco_Evoluir`;

// 2 colaboradores de teste (primeiros da lista com relatório)
const testes = [
  {
    colaboradorEmail: 'amaggeldo@to.sebrae.com.br',
    colaboradorName: 'AMAGGELDO BARBOSA',
    liderEmail: 'lidergenerico@ckmtalents.net',
    liderName: 'Operacional - Equipe CKM Talents',
    tituloPdi: 'PDI - 01/2026 - BASE: CERTIFICAÇÃO',
  },
  {
    colaboradorEmail: 'aldeni.torres@to.sebrae.com.br',
    colaboradorName: 'ALDENI BATISTA TORRES',
    liderEmail: 'lidergenerico@ckmtalents.net',
    liderName: 'Operacional - Equipe CKM Talents',
    tituloPdi: 'PDI – Consolidação de Ações Pendentes de 2025 Transferidas para 2026 (Vedada Inclusão de Novas Ações)',
  },
];

async function enviarTeste(dados) {
  // Email para o colaborador
  const bodyColaborador = `Prezado(a) ${dados.colaboradorName},

Gostaríamos de informar que foi incluído o Relatório de Performance no seu PDI "${dados.tituloPdi}".

Acesse o link https://www.evoluirckm.com para ter acesso.

${AVISO}
${ASSINATURA}`;

  try {
    const info1 = await transporter.sendMail({
      from: `"Eco do Bem - EVOLUIR" <${SMTP_USER}>`,
      to: dados.colaboradorEmail,
      cc: GLOBAL_CC,
      subject: `INFORMATIVO — Relatório de Performance Incluído no seu PDI — ${dados.tituloPdi}`,
      text: bodyColaborador,
      html: bodyColaborador.replace(/\n/g, '<br>'),
    });
    console.log(`✅ Email enviado para COLABORADOR ${dados.colaboradorName} (${dados.colaboradorEmail}) — messageId: ${info1.messageId}`);
  } catch (err) {
    console.error(`❌ Erro ao enviar para ${dados.colaboradorEmail}:`, err.message);
  }

  // Email para o líder
  const bodyLider = `Prezado(a) ${dados.liderName},

Gostaríamos de informar que foi incluído o Relatório de Performance no PDI "${dados.tituloPdi}" do(a) colaborador(a) ${dados.colaboradorName}.

Acesse o link https://www.evoluirckm.com para ter acesso.

${AVISO}
${ASSINATURA}`;

  try {
    const info2 = await transporter.sendMail({
      from: `"Eco do Bem - EVOLUIR" <${SMTP_USER}>`,
      to: dados.liderEmail,
      cc: GLOBAL_CC,
      subject: `INFORMATIVO — Relatório de Performance Incluído no PDI — ${dados.colaboradorName} — ${dados.tituloPdi}`,
      text: bodyLider,
      html: bodyLider.replace(/\n/g, '<br>'),
    });
    console.log(`✅ Email enviado para LÍDER ${dados.liderName} (${dados.liderEmail}) — messageId: ${info2.messageId}`);
  } catch (err) {
    console.error(`❌ Erro ao enviar para ${dados.liderEmail}:`, err.message);
  }
}

async function main() {
  console.log('=== TESTE DE ENVIO DE EMAIL - RELATÓRIO INCLUÍDO NO PDI ===');
  console.log(`SMTP: ${SMTP_HOST}:${SMTP_PORT} | User: ${SMTP_USER}`);
  console.log(`Enviando para ${testes.length} colaboradores de teste...\n`);

  for (const t of testes) {
    await enviarTeste(t);
    console.log('---');
    // Esperar 2 segundos entre envios para não sobrecarregar
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=== TESTE CONCLUÍDO ===');
}

main();

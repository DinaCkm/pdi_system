/**
 * Script para enviar e-mails retroativos para os líderes de solicitações
 * que já possuem parecer da CKM e estão aguardando o parecer do líder.
 * 
 * Uso: node scripts/send-retroactive-emails.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env do projeto
dotenv.config({ path: resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada');
  process.exit(1);
}

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error('FORGE_API_URL ou FORGE_API_KEY não encontradas');
  process.exit(1);
}

// Função para enviar email
async function sendEmail(to, subject, body) {
  try {
    const response = await fetch(`${FORGE_API_URL}/email/send`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${FORGE_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ to, subject, body }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn(`  ❌ Falha ao enviar email para ${to} (${response.status}): ${detail}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`  ❌ Erro ao enviar email para ${to}:`, error.message);
    return false;
  }
}

const AVISO_NAO_RESPONDA = `
⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA EVOLUIR CKM ⚠️`;

const ASSINATURA = `
---
Sistema de Gestão de PDI — CKM Talents
Evoluir CKM`;

async function main() {
  console.log('=== Envio de E-mails Retroativos - Solicitações Aguardando Gestor ===\n');

  // Conectar ao banco
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('✅ Conectado ao banco de dados\n');

  // Buscar solicitações aguardando_gestor com dados do solicitante e líder
  const [rows] = await connection.execute(`
    SELECT 
      sa.id,
      sa.titulo,
      sa.statusGeral,
      sa.ckmParecerTipo,
      sa.ckmParecerTexto,
      sa.solicitanteId,
      u_sol.name AS solicitante_nome,
      u_sol.email AS solicitante_email,
      u_sol.leaderId,
      u_lider.name AS lider_nome,
      u_lider.email AS lider_email
    FROM solicitacoes_acoes sa
    JOIN users u_sol ON sa.solicitanteId = u_sol.id
    LEFT JOIN users u_lider ON u_sol.leaderId = u_lider.id
    WHERE sa.statusGeral = 'aguardando_gestor'
    ORDER BY sa.id
  `);

  console.log(`📋 Encontradas ${rows.length} solicitações aguardando parecer do líder\n`);

  if (rows.length === 0) {
    console.log('Nenhuma solicitação pendente. Nada a fazer.');
    await connection.end();
    return;
  }

  let enviados = 0;
  let falhas = 0;

  for (const row of rows) {
    console.log(`--- Solicitação #${row.id} ---`);
    console.log(`  Título: ${row.titulo}`);
    console.log(`  Colaborador: ${row.solicitante_nome} (${row.solicitante_email})`);
    console.log(`  Líder: ${row.lider_nome || 'SEM LÍDER'} (${row.lider_email || 'SEM EMAIL'})`);
    console.log(`  Parecer CKM: ${row.ckmParecerTipo}`);

    if (!row.lider_email) {
      console.log(`  ⚠️ PULANDO - Líder sem email cadastrado`);
      falhas++;
      continue;
    }

    const tipoParecer = row.ckmParecerTipo === 'com_aderencia' ? 'COM ADERÊNCIA' : 'SEM ADERÊNCIA';

    const body = `
Prezado(a) ${row.lider_nome},

Informamos que a CKM Talents analisou a solicitação de inclusão de nova ação no PDI do seu liderado e emitiu seu parecer técnico. Agora é necessário que você acesse o sistema e registre sua decisão (aprovar ou reprovar).

DETALHES DA SOLICITAÇÃO:
- Colaborador: ${row.solicitante_nome}
- Título da Ação: ${row.titulo}
- Parecer CKM: ${tipoParecer}
- Observação CKM: ${row.ckmParecerTexto || 'Sem observação'}

Acesse o sistema Evoluir CKM para avaliar e registrar seu parecer sobre esta solicitação.
${AVISO_NAO_RESPONDA}
${ASSINATURA}
    `.trim();

    const subject = `AÇÃO NECESSÁRIA - Solicitação de Ação Aguardando seu Parecer — ${row.solicitante_nome}`;

    const ok = await sendEmail(row.lider_email, subject, body);
    if (ok) {
      console.log(`  ✅ Email enviado com sucesso para ${row.lider_nome} (${row.lider_email})`);
      enviados++;
    } else {
      falhas++;
    }

    console.log('');
  }

  console.log('=== RESUMO ===');
  console.log(`Total de solicitações: ${rows.length}`);
  console.log(`E-mails enviados com sucesso: ${enviados}`);
  console.log(`Falhas: ${falhas}`);

  await connection.end();
  console.log('\n✅ Processo finalizado.');
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});

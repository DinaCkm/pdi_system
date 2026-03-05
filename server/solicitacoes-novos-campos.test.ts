import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { solicitacoesAcoes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Novos Campos Informativos na Solicitação de Ação', { timeout: 60000 }, () => {
  let testPdiId: number;
  let testMacroId: number;
  const testSolicitanteId = 2;
  const testAdminId = 1;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    const pdis = await db.getAllPDIs();
    if (pdis.length > 0) {
      testPdiId = pdis[0].id;
    } else {
      throw new Error('Nenhum PDI disponível para teste');
    }

    const macros = await db.getAllMacros();
    if (macros.length > 0) {
      testMacroId = macros[0].id;
    } else {
      throw new Error('Nenhuma macro competência disponível para teste');
    }
  }, 30000);

  afterAll(async () => {
    const database = await getDb();
    if (database) {
      for (const id of cleanupIds) {
        try {
          await database.delete(solicitacoesAcoes).where(eq(solicitacoesAcoes.id, id));
        } catch (error) {
          console.error('Erro ao limpar solicitação de teste:', error);
        }
      }
    }
  });

  it('deve criar solicitação com os 5 novos campos informativos', async () => {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      microcompetencia: 'Comunicação assertiva',
      titulo: 'Curso de Comunicação Empresarial',
      descricao: 'Curso para melhorar comunicação',
      prazo: new Date('2026-08-15'),
      solicitanteId: testSolicitanteId,
      porqueFazer: 'Necessidade de melhorar a comunicação com stakeholders internos e externos',
      ondeFazer: 'SENAI - Unidade Centro',
      linkEvento: 'https://www.senai.br/curso-comunicacao',
      previsaoInvestimento: 'R$ 2.500,00',
      outrosProfissionaisParticipando: 'sim',
    });

    cleanupIds.push(id);
    expect(id).toBeGreaterThan(0);

    const solicitacao = await db.getSolicitacaoById(id);
    expect(solicitacao).toBeDefined();
    expect(solicitacao!.porqueFazer).toBe('Necessidade de melhorar a comunicação com stakeholders internos e externos');
    expect(solicitacao!.ondeFazer).toBe('SENAI - Unidade Centro');
    expect(solicitacao!.linkEvento).toBe('https://www.senai.br/curso-comunicacao');
    expect(solicitacao!.previsaoInvestimento).toBe('R$ 2.500,00');
    expect(solicitacao!.outrosProfissionaisParticipando).toBe('sim');
  });

  it('deve criar solicitação sem link (campo opcional)', async () => {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Workshop Interno de Liderança',
      descricao: 'Workshop interno',
      prazo: new Date('2026-09-01'),
      solicitanteId: testSolicitanteId,
      porqueFazer: 'Desenvolvimento de competências de liderança',
      ondeFazer: 'Interno - Sala de Treinamento',
      previsaoInvestimento: 'Sem custo',
      outrosProfissionaisParticipando: 'nao',
    });

    cleanupIds.push(id);
    expect(id).toBeGreaterThan(0);

    const solicitacao = await db.getSolicitacaoById(id);
    expect(solicitacao).toBeDefined();
    expect(solicitacao!.porqueFazer).toBe('Desenvolvimento de competências de liderança');
    expect(solicitacao!.ondeFazer).toBe('Interno - Sala de Treinamento');
    expect(solicitacao!.linkEvento).toBeNull();
    expect(solicitacao!.previsaoInvestimento).toBe('Sem custo');
    expect(solicitacao!.outrosProfissionaisParticipando).toBe('nao');
  });

  it('deve reenviar solicitação com campos atualizados após revisão do RH', async () => {
    // Criar solicitação
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Congresso de Inovação',
      descricao: 'Participação em congresso',
      prazo: new Date('2026-10-15'),
      solicitanteId: testSolicitanteId,
      porqueFazer: 'Atualização sobre tendências de inovação',
      ondeFazer: 'Expo Center Norte - São Paulo',
      linkEvento: 'https://congresso-inovacao.com.br',
      previsaoInvestimento: 'R$ 5.000,00',
      outrosProfissionaisParticipando: 'sim',
    });
    cleanupIds.push(id);

    // Simular fluxo: CKM → Gestor → RH solicita revisão
    await db.emitirParecerCKM(id, {
      parecerTipo: 'com_aderencia',
      parecerTexto: 'Aderente aos gaps.',
      adminId: testAdminId,
    });

    await db.decisaoGestor(id, {
      decisao: 'aprovado',
      justificativa: 'Concordo.',
      gestorId: 3,
    });

    // RH solicita revisão → status deve ir para aguardando_solicitante
    await db.solicitarRevisaoRH(id, {
      motivoRevisao: 'Valor do investimento precisa ser detalhado.',
      rhId: testAdminId,
    });

    let solicitacao = await db.getSolicitacaoById(id);
    expect(solicitacao!.statusGeral).toBe('aguardando_solicitante');

    // Solicitante reenvia com dados atualizados
    await db.reenviarSolicitacao(id, {
      titulo: 'Congresso de Inovação 2026',
      descricao: 'Participação em congresso - atualizado',
      prazo: new Date('2026-10-20'),
      porqueFazer: 'Atualização sobre tendências de inovação e networking',
      ondeFazer: 'Expo Center Norte - São Paulo',
      linkEvento: 'https://congresso-inovacao.com.br/2026',
      previsaoInvestimento: 'R$ 3.200,00 (inscrição) + R$ 1.800,00 (hospedagem) = R$ 5.000,00',
      outrosProfissionaisParticipando: 'nao',
    });

    solicitacao = await db.getSolicitacaoById(id);
    expect(solicitacao!.statusGeral).toBe('aguardando_ckm');
    expect(solicitacao!.titulo).toBe('Congresso de Inovação 2026');
    expect(solicitacao!.previsaoInvestimento).toBe('R$ 3.200,00 (inscrição) + R$ 1.800,00 (hospedagem) = R$ 5.000,00');
    expect(solicitacao!.outrosProfissionaisParticipando).toBe('nao');
  });

  it('deve listar solicitações com os novos campos', async () => {
    const lista = await db.listSolicitacoesAcoes({ solicitanteId: testSolicitanteId });
    expect(lista.length).toBeGreaterThan(0);

    // Verificar que as solicitações criadas neste teste aparecem na lista
    const found = lista.find((s: any) => cleanupIds.includes(s.id));
    expect(found).toBeDefined();
  });
});

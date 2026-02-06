import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { solicitacoesAcoes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Solicitações de Ações por Empregados', () => {
  let testPdiId: number;
  let testMacroId: number;
  let testSolicitacaoId: number;
  const testSolicitanteId = 2; // Um colaborador existente
  const testAdminId = 1; // Admin/CKM
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    // Buscar um PDI existente para vincular
    const pdis = await db.getAllPDIs();
    if (pdis.length > 0) {
      testPdiId = pdis[0].id;
    } else {
      throw new Error('Nenhum PDI disponível para teste');
    }

    // Buscar uma macro competência existente
    const macros = await db.getAllMacros();
    if (macros.length > 0) {
      testMacroId = macros[0].id;
    } else {
      throw new Error('Nenhuma macro competência disponível para teste');
    }
  });

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

  it('deve criar uma solicitação de ação', async () => {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      microcompetencia: 'Teste micro',
      titulo: 'Curso de Liderança Avançada',
      descricao: 'Curso para desenvolvimento de habilidades de liderança',
      prazo: new Date('2026-06-30'),
      solicitanteId: testSolicitanteId,
    });

    cleanupIds.push(id);
    testSolicitacaoId = id;
    expect(id).toBeGreaterThan(0);
  });

  it('deve buscar solicitação por ID', async () => {
    const solicitacao = await db.getSolicitacaoById(testSolicitacaoId);
    expect(solicitacao).toBeDefined();
    expect(solicitacao!.titulo).toBe('Curso de Liderança Avançada');
    expect(solicitacao!.statusGeral).toBe('aguardando_ckm');
    expect(solicitacao!.solicitanteId).toBe(testSolicitanteId);
  });

  it('deve listar solicitações', async () => {
    const lista = await db.listSolicitacoesAcoes();
    expect(lista.length).toBeGreaterThan(0);
    const found = lista.find((s: any) => s.id === testSolicitacaoId);
    expect(found).toBeDefined();
  });

  it('deve emitir parecer CKM', async () => {
    await db.emitirParecerCKM(testSolicitacaoId, {
      parecerTipo: 'com_aderencia',
      parecerTexto: 'A ação está alinhada com os gaps identificados no relatório de análise.',
      adminId: testAdminId,
    });

    const solicitacao = await db.getSolicitacaoById(testSolicitacaoId);
    expect(solicitacao!.statusGeral).toBe('aguardando_gestor');
    expect(solicitacao!.ckmParecerTipo).toBe('com_aderencia');
    expect(solicitacao!.ckmParecerTexto).toContain('alinhada');
  });

  it('deve registrar decisão do gestor (aprovação)', async () => {
    const gestorId = 3; // Um líder existente
    await db.decisaoGestor(testSolicitacaoId, {
      decisao: 'aprovado',
      justificativa: 'Concordo com a inclusão, o colaborador precisa deste desenvolvimento.',
      gestorId,
    });

    const solicitacao = await db.getSolicitacaoById(testSolicitacaoId);
    expect(solicitacao!.statusGeral).toBe('aguardando_rh');
    expect(solicitacao!.gestorDecisao).toBe('aprovado');
  });

  it('deve registrar decisão do RH (aprovação) e criar ação no PDI', async () => {
    const rhId = 1; // Gerente de RH
    const acaoId = await db.decisaoRH(testSolicitacaoId, {
      decisao: 'aprovado',
      justificativa: 'Aprovado. Ação dentro do orçamento e relevante para o desenvolvimento.',
      rhId,
    });

    expect(acaoId).toBeGreaterThan(0);

    const solicitacao = await db.getSolicitacaoById(testSolicitacaoId);
    expect(solicitacao!.statusGeral).toBe('aprovada');
    expect(solicitacao!.acaoIncluidaId).toBe(acaoId);
  });

  // Teste de fluxo com reprovação do gestor
  it('deve encerrar solicitação quando gestor reprova', async () => {
    // Criar nova solicitação
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Curso Vetado pelo Gestor',
      descricao: 'Este curso será vetado',
      prazo: new Date('2026-12-31'),
      solicitanteId: testSolicitanteId,
    });
    cleanupIds.push(id);

    // CKM emite parecer
    await db.emitirParecerCKM(id, {
      parecerTipo: 'sem_aderencia',
      parecerTexto: 'Não tem aderência aos gaps identificados.',
      adminId: testAdminId,
    });

    // Gestor reprova
    await db.decisaoGestor(id, {
      decisao: 'reprovado',
      justificativa: 'Não vejo necessidade neste momento.',
      gestorId: 3,
    });

    const solicitacao = await db.getSolicitacaoById(id);
    expect(solicitacao!.statusGeral).toBe('vetada_gestor');
    expect(solicitacao!.gestorDecisao).toBe('reprovado');
  });
});

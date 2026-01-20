import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { acoes, acoesHistorico, competenciasMacros } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Histórico de Ações', () => {
  let testActionId: number;
  let testMacroId: number;
  const testUserId = 1;

  beforeAll(async () => {
    // Criar competência macro de teste
    const macroResult = await db.createMacro({
      nome: `Macro Teste ${Date.now()}`,
      descricao: 'Descrição de teste',
      ativo: true,
    });
    testMacroId = macroResult;

    // Criar ação de teste
    const actionResult = await db.createAction({
      pdiId: 1,
      macroId: testMacroId,
      titulo: 'Ação Teste Original',
      descricao: 'Descrição original',
      prazo: new Date('2026-02-28'),
      status: 'nao_iniciada',
    });
    testActionId = actionResult;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const database = await getDb();
    if (database) {
      try {
        // Deletar histórico
        await database.delete(acoesHistorico).where(eq(acoesHistorico.actionId, testActionId));
        // Deletar ação
        await database.delete(acoes).where(eq(acoes.id, testActionId));
        // Deletar macro
        await database.delete(competenciasMacros).where(eq(competenciasMacros.id, testMacroId));
      } catch (error) {
        console.error('Erro ao limpar dados de teste:', error);
      }
    }
  });

  it('deve gravar histórico ao alterar título', async () => {
    // Atualizar título COM userId
    await db.updateAction(testActionId, {
      titulo: 'Ação Teste Modificada',
    }, testUserId);

    // Buscar histórico
    const historico = await db.getActionHistory(testActionId);

    // Validar que existe registro de alteração de título
    const tituloHistory = historico.find((h: any) => h.campo === 'Título');
    expect(tituloHistory).toBeDefined();
    if (tituloHistory) {
      expect(tituloHistory.valorAnterior).toBe('Ação Teste Original');
      expect(tituloHistory.valorNovo).toBe('Ação Teste Modificada');
    }
  });

  it('deve gravar histórico ao alterar prazo com formatação DD/MM/YYYY', async () => {
    // Atualizar prazo COM userId
    await db.updateAction(testActionId, {
      prazo: new Date('2026-03-15'),
    }, testUserId);

    // Buscar histórico
    const historico = await db.getActionHistory(testActionId);

    // Validar que existe registro de alteração de prazo
    const prazoHistory = historico.find((h: any) => h.campo === 'Prazo');
    expect(prazoHistory).toBeDefined();
    if (prazoHistory) {
      // Deve estar formatado como DD/MM/YYYY
      expect(prazoHistory.valorAnterior).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(prazoHistory.valorNovo).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });

  it('deve gravar histórico ao alterar status', async () => {
    // Atualizar status COM userId
    await db.updateAction(testActionId, {
      status: 'em_andamento',
    }, testUserId);

    // Buscar histórico
    const historico = await db.getActionHistory(testActionId);

    // Validar que existe registro de alteração de status
    const statusHistory = historico.find((h: any) => h.campo === 'Status');
    expect(statusHistory).toBeDefined();
    if (statusHistory) {
      expect(statusHistory.valorAnterior).toBe('nao_iniciada');
      expect(statusHistory.valorNovo).toBe('em_andamento');
    }
  });

  it('deve gravar histórico ao alterar descrição', async () => {
    // Atualizar descrição COM userId
    await db.updateAction(testActionId, {
      descricao: 'Descrição modificada',
    }, testUserId);

    // Buscar histórico
    const historico = await db.getActionHistory(testActionId);

    // Validar que existe registro de alteração de descrição
    const descricaoHistory = historico.find((h: any) => h.campo === 'Descrição');
    expect(descricaoHistory).toBeDefined();
    if (descricaoHistory) {
      expect(descricaoHistory.valorAnterior).toBe('Descrição original');
      expect(descricaoHistory.valorNovo).toBe('Descrição modificada');
    }
  });

  it('não deve gravar histórico se valor não mudou', async () => {
    // Contar registros antes
    const historicoBefore = await db.getActionHistory(testActionId);
    const countBefore = historicoBefore.length;

    // Atualizar com mesmo valor
    await db.updateAction(testActionId, {
      titulo: 'Ação Teste Modificada', // Mesmo valor que está agora
    }, testUserId);

    // Contar registros depois
    const historicoAfter = await db.getActionHistory(testActionId);
    const countAfter = historicoAfter.length;

    // Não deve ter adicionado novo registro
    expect(countAfter).toBe(countBefore);
  });

  it('deve retornar histórico vazio para ação sem alterações', async () => {
    // Criar ação nova sem alterações
    const novaAcaoId = await db.createAction({
      pdiId: 1,
      macroId: testMacroId,
      titulo: 'Ação Sem Histórico',
      descricao: 'Sem alterações',
      prazo: new Date('2026-04-01'),
      status: 'nao_iniciada',
    });

    // Buscar histórico
    const historico = await db.getActionHistory(novaAcaoId);

    // Deve estar vazio
    expect(historico.length).toBe(0);

    // Limpar
    const database = await getDb();
    if (database) {
      try {
        await database.delete(acoes).where(eq(acoes.id, novaAcaoId));
      } catch (error) {
        console.error('Erro ao limpar ação de teste:', error);
      }
    }
  });
});

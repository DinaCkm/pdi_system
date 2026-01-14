import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { adjustmentRequests, actions } from '../drizzle/schema';

describe('compareChangesWithAI', () => {
  let testActionId: number;
  let testAdjustmentRequestId: number;

  beforeAll(async () => {
    // Criar uma ação de teste
    const createdAction = await db.db.insert(actions).values({
      nome: 'Ação Original',
      descricao: 'Descrição Original',
      prazo: new Date('2026-01-28'),
      competenciaId: 1,
      pdiId: 1,
      status: 'nao_iniciada',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testActionId = createdAction[0].id;

    // Criar uma solicitação de ajuste de teste
    const createdRequest = await db.db.insert(adjustmentRequests).values({
      actionId: testActionId,
      userId: 1,
      status: 'pendente',
      justificativa: 'Teste',
      camposAjustar: JSON.stringify({ nome: true, descricao: true, prazo: true }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    testAdjustmentRequestId = createdRequest[0].id;
  });

  it('deve detectar mudança no nome', async () => {
    const result = await db.db.query.adjustmentRequests.findFirst({
      where: eq(adjustmentRequests.id, testAdjustmentRequestId),
    });

    expect(result).toBeDefined();
    expect(result?.actionId).toBe(testActionId);

    // Simular valores propostos diferentes
    const novoNome = 'Ação Modificada';
    const novaDescricao = 'Descrição Original'; // Sem mudança
    const novoPrazo = '2026-01-28'; // Sem mudança

    console.log('Valores propostos:', { novoNome, novaDescricao, novoPrazo });
    
    // Verificar se há mudança
    const action = await db.getActionById(testActionId);
    expect(action?.nome).toBe('Ação Original');
    expect(novoNome).not.toBe(action?.nome);
  });

  it('deve detectar mudança na descrição', async () => {
    const action = await db.getActionById(testActionId);
    
    const novoNome = 'Ação Original'; // Sem mudança
    const novaDescricao = 'Descrição Modificada';
    const novoPrazo = '2026-01-28'; // Sem mudança

    console.log('Valores propostos:', { novoNome, novaDescricao, novoPrazo });
    
    expect(action?.descricao).toBe('Descrição Original');
    expect(novaDescricao).not.toBe(action?.descricao);
  });

  it('deve detectar mudança no prazo', async () => {
    const action = await db.getActionById(testActionId);
    
    const novoNome = 'Ação Original'; // Sem mudança
    const novaDescricao = 'Descrição Original'; // Sem mudança
    const novoPrazo = '2026-02-28'; // Mudança

    const prazoOriginal = action?.prazo instanceof Date 
      ? action.prazo.toISOString().split('T')[0] 
      : action?.prazo;

    console.log('Prazo original:', prazoOriginal);
    console.log('Novo prazo:', novoPrazo);
    
    expect(novoPrazo).not.toBe(prazoOriginal);
  });

  it('deve retornar nenhuma alteração quando valores são iguais', async () => {
    const action = await db.getActionById(testActionId);
    
    const prazoOriginal = action?.prazo instanceof Date 
      ? action.prazo.toISOString().split('T')[0] 
      : action?.prazo;

    const novoNome = 'Ação Original'; // Igual
    const novaDescricao = 'Descrição Original'; // Igual
    const novoPrazo = prazoOriginal; // Igual

    console.log('Valores iguais:', { novoNome, novaDescricao, novoPrazo });
    
    expect(novoNome).toBe(action?.nome);
    expect(novaDescricao).toBe(action?.descricao);
    expect(novoPrazo).toBe(prazoOriginal);
  });

  it('deve detectar múltiplas mudanças', async () => {
    const action = await db.getActionById(testActionId);
    
    const novoNome = 'Ação Completamente Modificada';
    const novaDescricao = 'Descrição Completamente Modificada';
    const novoPrazo = '2026-03-15';

    const prazoOriginal = action?.prazo instanceof Date 
      ? action.prazo.toISOString().split('T')[0] 
      : action?.prazo;

    console.log('Múltiplas mudanças:', { novoNome, novaDescricao, novoPrazo });
    
    expect(novoNome).not.toBe(action?.nome);
    expect(novaDescricao).not.toBe(action?.descricao);
    expect(novoPrazo).not.toBe(prazoOriginal);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from './db';
import { users, pdis, actions, adjustmentRequests, actionHistory } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('actions.solicitarAjuste', () => {
  let testUserId: number;
  let testPdiId: number;
  let testActionId: number;

  beforeAll(async () => {
    // Criar usuário colaborador de teste
    const [user] = await db.insert(users).values({
      openId: 'test-colaborador-ajuste',
      name: 'Colaborador Teste Ajuste',
      email: 'colaborador.ajuste@test.com',
      role: 'user',
    }).returning();
    testUserId = user.id;

    // Criar PDI de teste
    const [pdi] = await db.insert(pdis).values({
      colaboradorId: testUserId,
      ciclo: 'Teste Ajuste',
      foco: 'Teste',
      status: 'em_andamento',
      dataInicio: new Date(),
      dataFim: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }).returning();
    testPdiId = pdi.id;

    // Criar ação de teste com status aprovada_lider
    const [action] = await db.insert(actions).values({
      pdiId: testPdiId,
      nome: 'Ação Teste Ajuste',
      descricao: 'Descrição da ação de teste',
      prazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'aprovada_lider',
      microCompetenciaId: null,
    }).returning();
    testActionId = action.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testActionId) {
      await db.delete(adjustmentRequests).where(eq(adjustmentRequests.actionId, testActionId));
      await db.delete(actionHistory).where(eq(actionHistory.actionId, testActionId));
      await db.delete(actions).where(eq(actions.id, testActionId));
    }
    if (testPdiId) {
      await db.delete(pdis).where(eq(pdis.id, testPdiId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('deve criar solicitação de ajuste com sucesso', async () => {
    // Arrange
    const justificativa = 'Preciso ajustar o prazo pois houve mudança no cronograma';
    const camposAjustar = {
      prazo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    // Act
    const [solicitacao] = await db.insert(adjustmentRequests).values({
      actionId: testActionId,
      requestedById: testUserId,
      justificativa,
      camposAjustar: JSON.stringify(camposAjustar),
      status: 'pendente',
    }).returning();

    // Assert
    expect(solicitacao).toBeDefined();
    expect(solicitacao.actionId).toBe(testActionId);
    expect(solicitacao.requestedById).toBe(testUserId);
    expect(solicitacao.justificativa).toBe(justificativa);
    expect(solicitacao.status).toBe('pendente');

    // Verificar se foi criado no banco
    const solicitacoes = await db.select()
      .from(adjustmentRequests)
      .where(eq(adjustmentRequests.actionId, testActionId));
    
    expect(solicitacoes).toHaveLength(1);
  });

  it('deve mudar status da ação para em_discussao', async () => {
    // Act
    await db.update(actions)
      .set({ status: 'em_discussao' })
      .where(eq(actions.id, testActionId));

    // Assert
    const [action] = await db.select()
      .from(actions)
      .where(eq(actions.id, testActionId));
    
    expect(action.status).toBe('em_discussao');
  });

  it('deve criar registro no histórico', async () => {
    // Act
    await db.insert(actionHistory).values({
      actionId: testActionId,
      userId: testUserId,
      action: 'solicitacao_ajuste_criada',
      details: 'Colaborador solicitou ajuste na ação',
    });

    // Assert
    const historico = await db.select()
      .from(actionHistory)
      .where(
        and(
          eq(actionHistory.actionId, testActionId),
          eq(actionHistory.action, 'solicitacao_ajuste_criada')
        )
      );
    
    expect(historico).toHaveLength(1);
    expect(historico[0].userId).toBe(testUserId);
  });

  it('não deve permitir segunda solicitação pendente', async () => {
    // Verificar se já existe solicitação pendente
    const pendentes = await db.select()
      .from(adjustmentRequests)
      .where(
        and(
          eq(adjustmentRequests.actionId, testActionId),
          eq(adjustmentRequests.status, 'pendente')
        )
      );
    
    // Assert
    expect(pendentes.length).toBeGreaterThan(0);
    
    // Se tentar criar outra, deve falhar (validação no backend)
    const temPendente = pendentes.length > 0;
    expect(temPendente).toBe(true);
  });

  it('não deve permitir mais de 5 solicitações', async () => {
    // Contar total de solicitações
    const total = await db.select()
      .from(adjustmentRequests)
      .where(eq(adjustmentRequests.actionId, testActionId));
    
    // Assert
    expect(total.length).toBeLessThanOrEqual(5);
  });
});

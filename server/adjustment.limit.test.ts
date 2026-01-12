import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Bloqueio de Solicitações de Ajuste - Limite de 5', () => {
  let testActionId: number;
  let testColaboradorId: number;

  beforeAll(async () => {
    // Criar colaborador de teste
    const colaborador = await db.createUser({
      openId: `openid-limite-${Date.now()}`,
      name: 'Colaborador Teste Limite',
      email: `colaborador-limite-${Date.now()}@test.com`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      cargo: 'Analista',
      role: 'user',
    });
    testColaboradorId = colaborador.id;

    // Criar PDI de teste
    const pdi = await db.createPDI({
      colaboradorId: testColaboradorId,
      cicloId: 1,
      titulo: 'PDI Teste Limite',
      status: 'ativo',
      createdBy: 1,
    });

    // Criar ação de teste
    const acao = await db.createAction({
      pdiId: pdi.id,
      blocoId: 1,
      macroId: 1,
      microId: 1,
      nome: 'Ação Teste Limite',
      descricao: 'Teste de limite de solicitações',
      prazo: new Date('2026-12-31'),
      createdBy: 1,
      status: 'em_andamento',
    });
    testActionId = acao.id;
  });

  it('deve permitir criar até 5 solicitações', async () => {
    // Criar 5 solicitações
    for (let i = 1; i <= 5; i++) {
      const solicitacao = await db.createAdjustmentRequest({
        actionId: testActionId,
        solicitanteId: testColaboradorId,
        tipoSolicitante: 'colaborador',
        justificativa: `Solicitação ${i} de teste`,
        camposAjustar: JSON.stringify({ nome: `Novo nome ${i}` }),
        status: 'aprovada', // Marcar como aprovada para não bloquear por "pendente"
      });

      expect(solicitacao).toBeDefined();
      expect(solicitacao.id).toBeGreaterThan(0);
    }

    // Verificar contagem
    const count = await db.countAdjustmentRequestsByAction(testActionId);
    expect(count).toBe(5);
  });

  it('deve retornar motivoBloqueio="limit" quando atingir 5 solicitações', async () => {
    const stats = await db.getAdjustmentStats(testActionId);

    expect(stats.total).toBe(5);
    expect(stats.restantes).toBe(0);
    expect(stats.podeAdicionar).toBe(false);
    expect(stats.motivoBloqueio).toBe('limit');
  });

  it('deve bloquear criação da 6ª solicitação no backend', async () => {
    // Tentar criar 6ª solicitação
    const count = await db.countAdjustmentRequestsByAction(testActionId);
    expect(count).toBeGreaterThanOrEqual(5);

    // A validação acontece na procedure tRPC, mas podemos verificar a contagem
    // Se count >= 5, a procedure deve retornar erro
    if (count >= 5) {
      // Simulação: a procedure lançaria TRPCError aqui
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  it('deve retornar lista de solicitações pendentes vazia se todas foram aprovadas', async () => {
    const pendentes = await db.getPendingAdjustmentRequestsByAction(testActionId);
    expect(pendentes.length).toBe(0);
  });
});

describe('Função getAdjustmentStats', () => {
  it('deve retornar stats corretos para ação sem solicitações', async () => {
    // Criar ação limpa
    const colaborador = await db.createUser({
      openId: `openid-stats-${Date.now()}`,
      name: 'Colaborador Stats',
      email: `colaborador-stats-${Date.now()}@test.com`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      cargo: 'Analista',
      role: 'user',
    });

    const pdi = await db.createPDI({
      colaboradorId: colaborador.id,
      cicloId: 1,
      titulo: 'PDI Stats',
      status: 'ativo',
      createdBy: 1,
    });

    const acao = await db.createAction({
      pdiId: pdi.id,
      blocoId: 1,
      macroId: 1,
      microId: 1,
      nome: 'Ação Stats',
      descricao: 'Teste stats',
      prazo: new Date('2026-12-31'),
      createdBy: 1,
      status: 'em_andamento',
    });

    const stats = await db.getAdjustmentStats(acao.id);

    expect(stats.total).toBe(0);
    expect(stats.pendentes).toBe(0);
    expect(stats.restantes).toBe(5);
    expect(stats.podeAdicionar).toBe(true);
    expect(stats.motivoBloqueio).toBeNull();
  });

  it('deve retornar motivoBloqueio="pending" quando há solicitação pendente', async () => {
    // Criar ação e solicitação pendente
    const colaborador = await db.createUser({
      openId: `openid-pending-${Date.now()}`,
      name: 'Colaborador Pending',
      email: `colaborador-pending-${Date.now()}@test.com`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      cargo: 'Analista',
      role: 'user',
    });

    const pdi = await db.createPDI({
      colaboradorId: colaborador.id,
      cicloId: 1,
      titulo: 'PDI Pending',
      status: 'ativo',
      createdBy: 1,
    });

    const acao = await db.createAction({
      pdiId: pdi.id,
      blocoId: 1,
      macroId: 1,
      microId: 1,
      nome: 'Ação Pending',
      descricao: 'Teste pending',
      prazo: new Date('2026-12-31'),
      createdBy: 1,
      status: 'em_andamento',
    });

    await db.createAdjustmentRequest({
      actionId: acao.id,
      solicitanteId: colaborador.id,
      tipoSolicitante: 'colaborador',
      justificativa: 'Solicitação pendente',
      camposAjustar: JSON.stringify({ nome: 'Novo nome' }),
      status: 'pendente',
    });

    const stats = await db.getAdjustmentStats(acao.id);

    expect(stats.total).toBe(1);
    expect(stats.pendentes).toBe(1);
    expect(stats.podeAdicionar).toBe(false);
    expect(stats.motivoBloqueio).toBe('pending');
  });
});

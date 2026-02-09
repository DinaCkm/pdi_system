import { describe, it, expect } from 'vitest';

describe('Funil de Execução - Cálculo de percentuais com 3 casas decimais', () => {
  // Simula a mesma lógica do backend para validar os cálculos
  function calcularPercentuais(pendente: number, emAndamento: number, concluida: number) {
    const total = pendente + emAndamento + concluida;
    if (total === 0) return { percentualPendente: 0, percentualEmAndamento: 0, percentualConcluida: 0 };
    return {
      percentualPendente: parseFloat(((pendente / total) * 100).toFixed(3)),
      percentualEmAndamento: parseFloat(((emAndamento / total) * 100).toFixed(3)),
      percentualConcluida: parseFloat(((concluida / total) * 100).toFixed(3)),
    };
  }

  it('deve calcular percentuais com 3 casas decimais para valores pequenos', () => {
    // Cenário real: 471 pendentes, 1 em andamento, 1 concluída
    const result = calcularPercentuais(471, 1, 1);
    expect(result.percentualPendente).toBe(99.577);
    expect(result.percentualEmAndamento).toBe(0.211);
    expect(result.percentualConcluida).toBe(0.211);
  });

  it('percentuais pequenos não devem ser arredondados para zero', () => {
    const result = calcularPercentuais(471, 1, 1);
    expect(result.percentualEmAndamento).toBeGreaterThan(0);
    expect(result.percentualConcluida).toBeGreaterThan(0);
  });

  it('deve funcionar com distribuição equilibrada', () => {
    const result = calcularPercentuais(100, 100, 100);
    expect(result.percentualPendente).toBe(33.333);
    expect(result.percentualEmAndamento).toBe(33.333);
    expect(result.percentualConcluida).toBe(33.333);
  });

  it('deve retornar zeros quando não há ações', () => {
    const result = calcularPercentuais(0, 0, 0);
    expect(result.percentualPendente).toBe(0);
    expect(result.percentualEmAndamento).toBe(0);
    expect(result.percentualConcluida).toBe(0);
  });

  it('deve funcionar com 100% em uma única categoria', () => {
    const result = calcularPercentuais(0, 0, 50);
    expect(result.percentualPendente).toBe(0);
    expect(result.percentualEmAndamento).toBe(0);
    expect(result.percentualConcluida).toBe(100);
  });

  it('deve usar += para acumular status nao_iniciada e pendente no mesmo bucket', () => {
    // Simula o forEach do backend
    const stats = { pendente: 0, emAndamento: 0, concluida: 0 };
    const statusCounts = [
      { status: 'nao_iniciada', count: 400 },
      { status: 'pendente', count: 71 },
      { status: 'em_andamento', count: 1 },
      { status: 'concluida', count: 1 },
    ];
    statusCounts.forEach((item) => {
      if (item.status === 'nao_iniciada' || item.status === 'pendente') {
        stats.pendente += item.count;
      } else if (item.status === 'em_andamento') {
        stats.emAndamento += item.count;
      } else if (item.status === 'concluida') {
        stats.concluida += item.count;
      }
    });
    expect(stats.pendente).toBe(471); // 400 + 71
    expect(stats.emAndamento).toBe(1);
    expect(stats.concluida).toBe(1);
  });
});

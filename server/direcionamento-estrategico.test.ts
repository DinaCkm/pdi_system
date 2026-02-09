import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Direcionamento Estratégico - getTop3CompetenciasComGaps', () => {
  it('deve retornar um array (vazio ou com dados)', async () => {
    const result = await db.getTop3CompetenciasComGaps();
    expect(Array.isArray(result)).toBe(true);
  });

  it('deve retornar no máximo 3 itens', async () => {
    const result = await db.getTop3CompetenciasComGaps();
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('cada item deve ter nome, totalAcoes e percentual', async () => {
    const result = await db.getTop3CompetenciasComGaps();
    if (result.length > 0) {
      for (const item of result) {
        expect(item).toHaveProperty('nome');
        expect(item).toHaveProperty('totalAcoes');
        expect(item).toHaveProperty('percentual');
        expect(typeof item.nome).toBe('string');
        expect(typeof item.totalAcoes).toBe('number');
        expect(typeof item.percentual).toBe('number');
      }
    }
  });

  it('percentuais devem ser valores numéricos válidos', async () => {
    const result = await db.getTop3CompetenciasComGaps();
    if (result.length > 0) {
      for (const item of result) {
        const pct = item.percentual;
        expect(isNaN(pct)).toBe(false);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }
    }
  });
});

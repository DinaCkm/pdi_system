import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { pdis } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Relatório de Análise do Colaborador no PDI', () => {
  let testCicloId: number;
  let testPDIId: number;
  const testColaboradorId = 1;
  const testUserId = 1;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    const ciclosData = await db.getAllCiclos();
    if (ciclosData.length > 0) {
      testCicloId = ciclosData[0].id;
    } else {
      throw new Error('Nenhum ciclo disponível para teste');
    }
  });

  afterAll(async () => {
    const database = await getDb();
    if (database) {
      for (const id of cleanupIds) {
        try {
          await database.delete(pdis).where(eq(pdis.id, id));
        } catch (error) {
          console.error('Erro ao limpar PDI de teste:', error);
        }
      }
    }
  });

  it('deve criar PDI com relatório de análise', async () => {
    const relatorio = '**Avaliação de Desempenho 2025**\n\nO colaborador apresentou bom desempenho.\n\n| Competência | Nota |\n|---|---|\n| Liderança | 3.5 |';
    
    const pdiId = await db.createPDI({
      colaboradorId: testColaboradorId,
      cicloId: testCicloId,
      titulo: 'PDI com Relatório',
      objetivoGeral: 'Objetivo teste',
      relatorioAnalise: relatorio,
      createdBy: testUserId,
    });

    cleanupIds.push(pdiId);
    testPDIId = pdiId;

    expect(pdiId).toBeGreaterThan(0);

    // Buscar PDI e verificar relatório
    const pdiData = await db.getPDIById(pdiId);
    expect(pdiData).toBeDefined();
    expect(pdiData?.relatorioAnalise).toBe(relatorio);
  });

  it('deve criar PDI sem relatório de análise (null por padrão)', async () => {
    const pdiId = await db.createPDI({
      colaboradorId: testColaboradorId,
      cicloId: testCicloId,
      titulo: 'PDI sem Relatório',
      createdBy: testUserId,
    });

    cleanupIds.push(pdiId);

    const pdiData = await db.getPDIById(pdiId);
    expect(pdiData).toBeDefined();
    // relatorioAnalise deve ser null quando não fornecido
    expect(pdiData?.relatorioAnalise).toBeNull();
  });

  it('deve atualizar o relatório de análise de um PDI existente', async () => {
    const novoRelatorio = '**Relatório Atualizado**\n\nNova análise do colaborador com melhorias identificadas.';
    
    await db.updatePDI(testPDIId, {
      relatorioAnalise: novoRelatorio,
    });

    const pdiData = await db.getPDIById(testPDIId);
    expect(pdiData?.relatorioAnalise).toBe(novoRelatorio);
  });

  it('deve limpar o relatório de análise (set null)', async () => {
    await db.updatePDI(testPDIId, {
      relatorioAnalise: null,
    });

    const pdiData = await db.getPDIById(testPDIId);
    expect(pdiData?.relatorioAnalise).toBeNull();
  });

  it('deve atualizar campos de arquivo do relatório', async () => {
    await db.updatePDI(testPDIId, {
      relatorioArquivoUrl: 'https://storage.example.com/relatorio.pdf',
      relatorioArquivoNome: 'relatorio_avaliacao_2025.pdf',
      relatorioArquivoKey: 'pdi-relatorios/1/abc123-relatorio.pdf',
    });

    const pdiData = await db.getPDIById(testPDIId);
    expect(pdiData?.relatorioArquivoUrl).toBe('https://storage.example.com/relatorio.pdf');
    expect(pdiData?.relatorioArquivoNome).toBe('relatorio_avaliacao_2025.pdf');
    expect(pdiData?.relatorioArquivoKey).toBe('pdi-relatorios/1/abc123-relatorio.pdf');
  });

  it('deve remover arquivo do relatório (set null)', async () => {
    await db.updatePDI(testPDIId, {
      relatorioArquivoUrl: null,
      relatorioArquivoNome: null,
      relatorioArquivoKey: null,
    });

    const pdiData = await db.getPDIById(testPDIId);
    expect(pdiData?.relatorioArquivoUrl).toBeNull();
    expect(pdiData?.relatorioArquivoNome).toBeNull();
    expect(pdiData?.relatorioArquivoKey).toBeNull();
  });
});

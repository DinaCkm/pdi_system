import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { pdis } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Criar PDI', () => {
  let testCicloId: number;
  let testPDIId: number;
  const testColaboradorId = 1;
  const testUserId = 1;

  beforeAll(async () => {
    // Usar primeiro ciclo disponível
    const ciclosData = await db.getAllCiclos();
    if (ciclosData.length > 0) {
      testCicloId = ciclosData[0].id;
    } else {
      throw new Error('Nenhum ciclo disponível para teste');
    }
  });

  afterAll(async () => {
    // Limpar dados de teste
    const database = await getDb();
    if (database) {
      try {
        // Deletar PDI
        if (testPDIId) {
          await database.delete(pdis).where(eq(pdis.id, testPDIId));
        }
        // Não deletar ciclo pois é compartilhado
      } catch (error) {
        console.error('Erro ao limpar dados de teste:', error);
      }
    }
  });

  it('deve criar PDI com campos obrigatórios (createdBy, objetivoGeral, status)', async () => {
    // Criar PDI com todos os campos corrigidos
    const pdiId = await db.createPDI({
      colaboradorId: testColaboradorId,
      cicloId: testCicloId,
      titulo: 'PDI Teste',
      objetivoGeral: 'Objetivo geral de teste',
      createdBy: testUserId,
    });

    testPDIId = pdiId;

    // Validar que PDI foi criado
    expect(pdiId).toBeGreaterThan(0);

    // Buscar PDI criado
    const pdisData = await db.getPDIsByColaboradorId(testColaboradorId);
    const pdiCriado = pdisData.find((p: any) => p.id === pdiId);

    // Validar campos
    expect(pdiCriado).toBeDefined();
    if (pdiCriado) {
      expect(pdiCriado.titulo).toBe('PDI Teste');
      expect(pdiCriado.objetivoGeral).toBe('Objetivo geral de teste');
      expect(pdiCriado.status).toBe('em_andamento'); // Status padrão correto
      expect(pdiCriado.createdBy).toBe(testUserId);
      expect(pdiCriado.colaboradorId).toBe(testColaboradorId);
      expect(pdiCriado.cicloId).toBe(testCicloId);
    }
  });

  it('deve criar PDI com objetivoGeral vazio se não fornecido', async () => {
    // Criar PDI sem objetivoGeral
    const pdiId = await db.createPDI({
      colaboradorId: testColaboradorId,
      cicloId: testCicloId,
      titulo: 'PDI Sem Objetivo',
      createdBy: testUserId,
    });

    // Buscar PDI criado
    const pdisData = await db.getPDIsByColaboradorId(testColaboradorId);
    const pdiCriado = pdisData.find((p: any) => p.id === pdiId);

    // Validar que objetivoGeral é vazio
    expect(pdiCriado?.objetivoGeral).toBe('');

    // Limpar
    const database = await getDb();
    if (database) {
      try {
        await database.delete(pdis).where(eq(pdis.id, pdiId));
      } catch (error) {
        console.error('Erro ao limpar PDI de teste:', error);
      }
    }
  });

  it('deve usar status "em_andamento" como padrão', async () => {
    // Criar PDI
    const pdiId = await db.createPDI({
      colaboradorId: testColaboradorId,
      cicloId: testCicloId,
      titulo: 'PDI Status Teste',
      createdBy: testUserId,
    });

    // Buscar PDI criado
    const pdisData = await db.getPDIsByColaboradorId(testColaboradorId);
    const pdiCriado = pdisData.find((p: any) => p.id === pdiId);

    // Validar status padrão
    expect(pdiCriado?.status).toBe('em_andamento');

    // Limpar
    const database = await getDb();
    if (database) {
      try {
        await database.delete(pdis).where(eq(pdis.id, pdiId));
      } catch (error) {
        console.error('Erro ao limpar PDI de teste:', error);
      }
    }
  });
});

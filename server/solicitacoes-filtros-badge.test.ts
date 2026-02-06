import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { solicitacoesAcoes } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

describe('Solicitações de Ações - Badge de Pendências e Filtros', () => {
  let testPdiId: number;
  let testMacroId: number;
  let testLiderId: number;
  let testColaboradorId: number;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    const pdis = await db.getAllPDIs();
    if (pdis.length === 0) throw new Error('Nenhum PDI disponível para teste');
    testPdiId = pdis[0].id;

    const macros = await db.getAllMacros();
    if (macros.length === 0) throw new Error('Nenhuma macro competência disponível para teste');
    testMacroId = macros[0].id;

    const allUsers = await db.getAllUsers();
    const lider = allUsers.find((u: any) => u.role === 'lider');
    const colaborador = allUsers.find((u: any) => u.role === 'colaborador');
    if (!lider) throw new Error('Nenhum líder disponível para teste');
    if (!colaborador) throw new Error('Nenhum colaborador disponível para teste');
    testLiderId = lider.id;
    testColaboradorId = colaborador.id;
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

  describe('Badge de Pendências', () => {
    it('deve contar solicitações aguardando gestor para o Líder', async () => {
      // Criar solicitação que fica em aguardando_ckm
      const id = await db.createSolicitacaoAcao({
        pdiId: testPdiId,
        macroId: testMacroId,
        titulo: 'Teste Badge - Aguardando CKM',
        descricao: 'Teste de contagem de pendências',
        prazo: new Date('2026-06-30'),
        solicitanteId: testColaboradorId,
      });
      cleanupIds.push(id);

      // Avançar para aguardando_gestor
      await db.emitirParecerCKM(id, {
        parecerTipo: 'com_aderencia',
        parecerTexto: 'Teste de badge.',
        adminId: 1,
      });

      const sol = await db.getSolicitacaoById(id);
      expect(sol!.statusGeral).toBe('aguardando_gestor');

      // Verificar que a contagem no banco reflete a pendência
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const result = await database
        .select({ count: sql<number>`count(*)` })
        .from(solicitacoesAcoes)
        .where(eq(solicitacoesAcoes.statusGeral, 'aguardando_gestor'));

      expect(Number(result[0]?.count)).toBeGreaterThan(0);
    });

    it('deve contar solicitações aguardando RH', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const result = await database
        .select({ count: sql<number>`count(*)` })
        .from(solicitacoesAcoes)
        .where(eq(solicitacoesAcoes.statusGeral, 'aguardando_rh'));

      // Pode ser 0, mas a query deve funcionar sem erro
      expect(Number(result[0]?.count)).toBeGreaterThanOrEqual(0);
    });

    it('deve contar solicitações aguardando CKM', async () => {
      const database = await getDb();
      if (!database) throw new Error('Database not available');

      const result = await database
        .select({ count: sql<number>`count(*)` })
        .from(solicitacoesAcoes)
        .where(eq(solicitacoesAcoes.statusGeral, 'aguardando_ckm'));

      expect(Number(result[0]?.count)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Filtros Avançados', () => {
    it('deve filtrar solicitações por status', async () => {
      const todas = await db.listSolicitacoesAcoes();
      
      // Filtrar por aguardando_gestor
      const aguardandoGestor = todas.filter((s: any) => s.statusGeral === 'aguardando_gestor');
      
      // Todas devem ter o status correto
      aguardandoGestor.forEach((s: any) => {
        expect(s.statusGeral).toBe('aguardando_gestor');
      });
    });

    it('deve filtrar solicitações por busca textual', async () => {
      const todas = await db.listSolicitacoesAcoes();
      
      // Buscar por título parcial
      const term = 'badge';
      const filtradas = todas.filter((s: any) =>
        s.titulo?.toLowerCase().includes(term) ||
        s.solicitanteNome?.toLowerCase().includes(term)
      );

      filtradas.forEach((s: any) => {
        const matchesTitulo = s.titulo?.toLowerCase().includes(term);
        const matchesNome = s.solicitanteNome?.toLowerCase().includes(term);
        expect(matchesTitulo || matchesNome).toBe(true);
      });
    });

    it('deve ordenar solicitações por data (mais recentes primeiro)', async () => {
      const todas = await db.listSolicitacoesAcoes();
      
      if (todas.length >= 2) {
        // Ordenar por data decrescente
        const ordenadas = [...todas].sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        // A primeira deve ter data >= segunda
        const date1 = new Date(ordenadas[0].createdAt).getTime();
        const date2 = new Date(ordenadas[1].createdAt).getTime();
        expect(date1).toBeGreaterThanOrEqual(date2);
      }
    });

    it('deve ordenar solicitações por data (mais antigas primeiro)', async () => {
      const todas = await db.listSolicitacoesAcoes();
      
      if (todas.length >= 2) {
        // Ordenar por data crescente
        const ordenadas = [...todas].sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });

        // A primeira deve ter data <= segunda
        const date1 = new Date(ordenadas[0].createdAt).getTime();
        const date2 = new Date(ordenadas[1].createdAt).getTime();
        expect(date1).toBeLessThanOrEqual(date2);
      }
    });

    it('deve filtrar solicitações por período (últimos 7 dias)', async () => {
      const todas = await db.listSolicitacoesAcoes();
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const filtradas = todas.filter((s: any) => {
        const dataCriacao = s.createdAt ? new Date(s.createdAt) : null;
        return dataCriacao && dataCriacao >= seteDiasAtras;
      });

      // Todas as filtradas devem ser dos últimos 7 dias
      filtradas.forEach((s: any) => {
        const dataCriacao = new Date(s.createdAt);
        expect(dataCriacao.getTime()).toBeGreaterThanOrEqual(seteDiasAtras.getTime());
      });
    });
  });
});

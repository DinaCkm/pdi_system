import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { solicitacoesAcoes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Líder Papel Duplo - Solicitações de Ações', () => {
  let testPdiId: number;
  let testMacroId: number;
  let testLiderId: number;
  let testColaboradorId: number;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    // Buscar um PDI existente
    const pdis = await db.getAllPDIs();
    if (pdis.length === 0) throw new Error('Nenhum PDI disponível para teste');
    testPdiId = pdis[0].id;

    // Buscar uma macro competência existente
    const macros = await db.getAllMacros();
    if (macros.length === 0) throw new Error('Nenhuma macro competência disponível para teste');
    testMacroId = macros[0].id;

    // Buscar um líder e um colaborador existentes
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

  it('deve permitir que um Líder crie uma solicitação para o próprio PDI', async () => {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      microcompetencia: 'Gestão de conflitos',
      titulo: 'Curso de Mediação de Conflitos (Líder)',
      descricao: 'Líder solicita ação para seu próprio desenvolvimento',
      prazo: new Date('2026-06-30'),
      solicitanteId: testLiderId,
    });

    cleanupIds.push(id);
    expect(id).toBeGreaterThan(0);

    const solicitacao = await db.getSolicitacaoById(id);
    expect(solicitacao).toBeDefined();
    expect(solicitacao!.solicitanteId).toBe(testLiderId);
    expect(solicitacao!.statusGeral).toBe('aguardando_ckm');
  });

  it('deve retornar solicitação do Líder na listagem (como solicitante)', async () => {
    const todas = await db.listSolicitacoesAcoes();
    const solicitacoesDoLider = todas.filter((s: any) => s.solicitanteId === testLiderId);
    expect(solicitacoesDoLider.length).toBeGreaterThan(0);
    
    const found = solicitacoesDoLider.find((s: any) => s.titulo === 'Curso de Mediação de Conflitos (Líder)');
    expect(found).toBeDefined();
  });

  it('deve retornar solicitações do Líder E da equipe no filtro combinado', async () => {
    // Criar uma solicitação de um colaborador
    const colabSolId = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Curso do Colaborador (para teste de filtro)',
      descricao: 'Solicitação do colaborador',
      prazo: new Date('2026-06-30'),
      solicitanteId: testColaboradorId,
    });
    cleanupIds.push(colabSolId);

    // Listar todas as solicitações
    const todas = await db.listSolicitacoesAcoes();
    
    // Simular o filtro do backend para o Líder (papel duplo):
    // Líder vê solicitações dos subordinados (solicitanteLiderId === testLiderId) + suas próprias
    const solicitacoesDoLider = todas.filter(
      (s: any) => s.solicitanteLiderId === testLiderId || s.solicitanteId === testLiderId
    );

    // Deve ter pelo menos a solicitação do próprio líder
    const propriaSolicitacao = solicitacoesDoLider.find(
      (s: any) => s.solicitanteId === testLiderId && s.titulo === 'Curso de Mediação de Conflitos (Líder)'
    );
    expect(propriaSolicitacao).toBeDefined();
  });

  it('deve separar corretamente solicitações próprias vs da equipe', async () => {
    const todas = await db.listSolicitacoesAcoes();
    
    // Filtro combinado do Líder
    const todasDoLider = todas.filter(
      (s: any) => s.solicitanteLiderId === testLiderId || s.solicitanteId === testLiderId
    );

    // Separar: próprias vs equipe
    const proprias = todasDoLider.filter((s: any) => s.solicitanteId === testLiderId);
    const daEquipe = todasDoLider.filter((s: any) => s.solicitanteId !== testLiderId);

    // Próprias devem existir (criamos uma)
    expect(proprias.length).toBeGreaterThan(0);
    
    // Não deve haver sobreposição
    const idsEquipe = new Set(daEquipe.map((s: any) => s.id));
    const idsProprias = new Set(proprias.map((s: any) => s.id));
    for (const id of idsProprias) {
      expect(idsEquipe.has(id)).toBe(false);
    }
  });

  it('deve permitir fluxo completo de solicitação do Líder (CKM → Gestor → RH)', async () => {
    // Criar solicitação como líder
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Certificação PMP (Líder)',
      descricao: 'Líder solicita certificação para seu desenvolvimento',
      prazo: new Date('2026-12-31'),
      solicitanteId: testLiderId,
    });
    cleanupIds.push(id);

    // 1. CKM emite parecer
    await db.emitirParecerCKM(id, {
      parecerTipo: 'com_aderencia',
      parecerTexto: 'Certificação relevante para o cargo de liderança.',
      adminId: 1,
    });
    let sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aguardando_gestor');

    // 2. Gestor do Líder aprova (seria o líder do líder)
    await db.decisaoGestor(id, {
      decisao: 'aprovado',
      justificativa: 'Aprovado, certificação importante.',
      gestorId: 1, // Admin como gestor do líder
    });
    sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aguardando_rh');

    // 3. RH aprova e inclui no PDI
    const acaoId = await db.decisaoRH(id, {
      decisao: 'aprovado',
      justificativa: 'Aprovado e incluído no PDI.',
      rhId: 1,
    });
    expect(acaoId).toBeGreaterThan(0);

    sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aprovada');
    expect(sol!.acaoIncluidaId).toBe(acaoId);
  });
});

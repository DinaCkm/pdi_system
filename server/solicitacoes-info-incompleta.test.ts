import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { solicitacoesAcoes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Solicitações de Ações — Informações Incompletas e Exclusão de Parecer', () => {
  let testPdiId: number;
  let testMacroId: number;
  const testSolicitanteId = 2;
  const testAdminId = 1;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    const pdis = await db.getAllPDIs();
    if (pdis.length > 0) testPdiId = pdis[0].id;
    else throw new Error('Nenhum PDI disponível para teste');

    const macros = await db.getAllMacros();
    if (macros.length > 0) testMacroId = macros[0].id;
    else throw new Error('Nenhuma macro competência disponível para teste');
  }, 30000);

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

  // ============= DEVOLVER POR INFORMAÇÕES INCOMPLETAS =============
  describe('Devolver por Informações Incompletas', () => {
    let solicitacaoId: number;

    it('deve criar solicitação e devolver por informações incompletas', async () => {
      solicitacaoId = await db.createSolicitacaoAcao({
        pdiId: testPdiId,
        macroId: testMacroId,
        microcompetencia: 'Teste info incompleta',
        titulo: 'Ação com Info Incompleta',
        descricao: 'Descrição incompleta',
        prazo: new Date('2026-08-30'),
        solicitanteId: testSolicitanteId,
      });
      cleanupIds.push(solicitacaoId);

      // Verificar que está aguardando CKM
      const sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aguardando_ckm');

      // Devolver por informações incompletas
      await db.devolverPorInformacoesIncompletas(solicitacaoId, {
        justificativa: 'Faltam informações sobre o local do evento e a carga horária prevista.',
        adminId: testAdminId,
      });

      const solAtualizada = await db.getSolicitacaoById(solicitacaoId);
      expect(solAtualizada!.statusGeral).toBe('aguardando_solicitante');
      expect(solAtualizada!.ckmParecerTipo).toBeNull();
      expect(solAtualizada!.ckmParecerTexto).toBeNull();
      expect(solAtualizada!.historicoRodadas).toBeDefined();

      // Verificar que o histórico contém a justificativa
      const historico = JSON.parse(solAtualizada!.historicoRodadas as string);
      expect(historico.length).toBe(1);
      expect(historico[0].devolvidoPor).toBe('admin_info_incompleta');
      expect(historico[0].motivoDevolucao).toContain('local do evento');
    });

    it('deve permitir reenvio após devolução por info incompleta', async () => {
      // Simular reenvio pelo empregado
      await db.reenviarSolicitacao(solicitacaoId, {
        titulo: 'Ação com Info Completa Agora',
        descricao: 'Descrição completa com todos os detalhes necessários',
        prazo: new Date('2026-09-15'),
        porqueFazer: 'Necessário para desenvolvimento profissional',
        ondeFazer: 'Centro de Treinamento XYZ, São Paulo',
        linkEvento: 'https://evento.com/curso',
        previsaoInvestimento: 'R$ 2.500,00',
        outrosProfissionaisParticipando: 'nao',
      });

      const solReenviada = await db.getSolicitacaoById(solicitacaoId);
      expect(solReenviada!.statusGeral).toBe('aguardando_ckm');
      expect(solReenviada!.titulo).toBe('Ação com Info Completa Agora');
      expect(solReenviada!.ondeFazer).toBe('Centro de Treinamento XYZ, São Paulo');
    });
  });

  // ============= EXCLUIR PARECER CKM =============
  describe('Excluir Parecer CKM', () => {
    let solicitacaoId: number;

    it('deve excluir parecer CKM e voltar para aguardando_ckm', async () => {
      solicitacaoId = await db.createSolicitacaoAcao({
        pdiId: testPdiId,
        macroId: testMacroId,
        microcompetencia: 'Teste excluir CKM',
        titulo: 'Ação para Excluir Parecer CKM',
        descricao: 'Teste de exclusão',
        prazo: new Date('2026-08-30'),
        solicitanteId: testSolicitanteId,
      });
      cleanupIds.push(solicitacaoId);

      // Emitir parecer CKM
      await db.emitirParecerCKM(solicitacaoId, {
        parecerTipo: 'com_aderencia',
        parecerTexto: 'Parecer que será excluído',
        adminId: testAdminId,
      });

      let sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aguardando_gestor');
      expect(sol!.ckmParecerTipo).toBe('com_aderencia');

      // Excluir parecer CKM
      await db.excluirParecer(solicitacaoId, {
        etapa: 'ckm',
        adminId: testAdminId,
        justificativa: 'Parecer emitido por engano',
      });

      sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aguardando_ckm');
      expect(sol!.ckmParecerTipo).toBeNull();
      expect(sol!.ckmParecerTexto).toBeNull();
      expect(sol!.gestorDecisao).toBeNull();
    });
  });

  // ============= EXCLUIR PARECER GESTOR =============
  describe('Excluir Parecer Gestor (cascata)', () => {
    let solicitacaoId: number;

    it('deve excluir parecer do gestor e limpar RH, voltando para aguardando_gestor', async () => {
      solicitacaoId = await db.createSolicitacaoAcao({
        pdiId: testPdiId,
        macroId: testMacroId,
        microcompetencia: 'Teste excluir gestor',
        titulo: 'Ação para Excluir Parecer Gestor',
        descricao: 'Teste',
        prazo: new Date('2026-08-30'),
        solicitanteId: testSolicitanteId,
      });
      cleanupIds.push(solicitacaoId);

      // CKM emite parecer
      await db.emitirParecerCKM(solicitacaoId, {
        parecerTipo: 'sem_aderencia',
        parecerTexto: 'Sem aderência ao PDI',
        adminId: testAdminId,
      });

      // Gestor aprova
      await db.decisaoGestor(solicitacaoId, {
        decisao: 'aprovado',
        justificativa: 'Concordo',
        gestorId: 3,
      });

      let sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aguardando_rh');
      expect(sol!.gestorDecisao).toBe('aprovado');

      // Excluir parecer do gestor
      await db.excluirParecer(solicitacaoId, {
        etapa: 'gestor',
        adminId: testAdminId,
        justificativa: 'Gestor errou na decisão',
      });

      sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aguardando_gestor');
      expect(sol!.gestorDecisao).toBeNull();
      expect(sol!.gestorJustificativa).toBeNull();
      expect(sol!.rhDecisao).toBeNull();
      // CKM deve permanecer
      expect(sol!.ckmParecerTipo).toBe('sem_aderencia');
    });
  });

  // ============= EXCLUIR PARECER RH =============
  describe('Excluir Parecer RH', () => {
    let solicitacaoId: number;

    it('deve excluir parecer do RH e voltar para aguardando_rh', async () => {
      solicitacaoId = await db.createSolicitacaoAcao({
        pdiId: testPdiId,
        macroId: testMacroId,
        microcompetencia: 'Teste excluir RH',
        titulo: 'Ação para Excluir Parecer RH',
        descricao: 'Teste',
        prazo: new Date('2026-08-30'),
        solicitanteId: testSolicitanteId,
      });
      cleanupIds.push(solicitacaoId);

      // CKM emite parecer
      await db.emitirParecerCKM(solicitacaoId, {
        parecerTipo: 'com_aderencia',
        parecerTexto: 'Aderente',
        adminId: testAdminId,
      });

      // Gestor aprova
      await db.decisaoGestor(solicitacaoId, {
        decisao: 'aprovado',
        justificativa: 'Ok',
        gestorId: 3,
      });

      // RH aprova
      const acaoId = await db.decisaoRH(solicitacaoId, {
        decisao: 'aprovado',
        justificativa: 'Aprovado pelo RH',
        rhId: testAdminId,
      });

      let sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aprovada');
      expect(sol!.rhDecisao).toBe('aprovado');
      expect(sol!.acaoIncluidaId).toBe(acaoId);

      // Excluir parecer do RH
      await db.excluirParecer(solicitacaoId, {
        etapa: 'rh',
        adminId: testAdminId,
        justificativa: 'RH precisa reavaliar',
      });

      sol = await db.getSolicitacaoById(solicitacaoId);
      expect(sol!.statusGeral).toBe('aguardando_rh');
      expect(sol!.rhDecisao).toBeNull();
      expect(sol!.rhJustificativa).toBeNull();
      expect(sol!.acaoIncluidaId).toBeNull();
      // CKM e Gestor devem permanecer
      expect(sol!.ckmParecerTipo).toBe('com_aderencia');
      expect(sol!.gestorDecisao).toBe('aprovado');
    });
  });
});

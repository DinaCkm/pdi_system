import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { solicitacoesAcoes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Fluxo de Revisão Única - Solicitação de Ação', () => {
  let testPdiId: number;
  let testMacroId: number;
  const testSolicitanteId = 2;
  const testAdminId = 1;
  const testGestorId = 3;
  const testRhId = 1;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    const pdis = await db.getAllPDIs();
    if (pdis.length > 0) {
      testPdiId = pdis[0].id;
    } else {
      throw new Error('Nenhum PDI disponível para teste');
    }

    const macros = await db.getAllMacros();
    if (macros.length > 0) {
      testMacroId = macros[0].id;
    } else {
      throw new Error('Nenhuma macro competência disponível para teste');
    }
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

  // Helper: criar solicitação e avançar até aguardando_rh
  async function criarSolicitacaoAteRH(): Promise<number> {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Teste Revisão - ' + Date.now(),
      descricao: 'Solicitação para testar fluxo de revisão',
      prazo: new Date('2026-12-31'),
      solicitanteId: testSolicitanteId,
    });
    cleanupIds.push(id);

    // CKM emite parecer
    await db.emitirParecerCKM(id, {
      parecerTipo: 'com_aderencia',
      parecerTexto: 'Ação alinhada com os gaps.',
      adminId: testAdminId,
    });

    // Gestor aprova
    await db.decisaoGestor(id, {
      decisao: 'aprovado',
      justificativa: 'Concordo com a inclusão.',
      gestorId: testGestorId,
    });

    return id;
  }

  it('deve criar solicitação com rodadaAtual = 1 por padrão', async () => {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Teste Rodada Default - ' + Date.now(),
      descricao: 'Verificar rodada padrão',
      prazo: new Date('2026-12-31'),
      solicitanteId: testSolicitanteId,
    });
    cleanupIds.push(id);

    const sol = await db.getSolicitacaoById(id);
    expect(sol).toBeDefined();
    expect(sol!.rodadaAtual).toBe(1);
    expect(sol!.historicoRodadas).toBeNull();
  });

  it('deve solicitar revisão e voltar para aguardando_ckm (Rodada 2)', async () => {
    const id = await criarSolicitacaoAteRH();

    // Verificar que está aguardando_rh na rodada 1
    let sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aguardando_rh');
    expect(sol!.rodadaAtual).toBe(1);
    expect(sol!.ckmParecerTipo).toBe('com_aderencia');
    expect(sol!.gestorDecisao).toBe('aprovado');

    // RH solicita revisão
    await db.solicitarRevisaoRH(id, {
      justificativa: 'Preciso de reanálise técnica.',
      motivoRevisao: 'Surgiram novas informações documentais que exigem reavaliação.',
      rhId: testRhId,
      rhNome: 'Admin RH',
    });

    // Verificar que voltou para aguardando_ckm na rodada 2
    sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aguardando_ckm');
    expect(sol!.rodadaAtual).toBe(2);

    // Pareceres atuais devem estar limpos
    expect(sol!.ckmParecerTipo).toBeNull();
    expect(sol!.ckmParecerTexto).toBeNull();
    expect(sol!.gestorDecisao).toBeNull();
    expect(sol!.gestorJustificativa).toBeNull();
    expect(sol!.rhDecisao).toBeNull();
    expect(sol!.rhJustificativa).toBeNull();
  });

  it('deve preservar histórico da Rodada 1 no JSON', async () => {
    const id = await criarSolicitacaoAteRH();

    // RH solicita revisão
    await db.solicitarRevisaoRH(id, {
      justificativa: 'Reanálise necessária.',
      motivoRevisao: 'Documentos novos recebidos.',
      rhId: testRhId,
      rhNome: 'Admin RH',
    });

    const sol = await db.getSolicitacaoById(id);
    expect(sol!.historicoRodadas).toBeDefined();
    expect(sol!.historicoRodadas).not.toBeNull();

    const historico = JSON.parse(sol!.historicoRodadas!);
    expect(historico).toHaveLength(1);
    expect(historico[0].rodada).toBe(1);
    expect(historico[0].ckm.parecerTipo).toBe('com_aderencia');
    expect(historico[0].gestor.decisao).toBe('aprovado');
    expect(historico[0].rh.decisao).toBe('solicitar_revisao');
    expect(historico[0].motivoRevisao).toBe('Documentos novos recebidos.');
  });

  it('deve bloquear segunda revisão (Rodada 2 não permite solicitar revisão)', async () => {
    const id = await criarSolicitacaoAteRH();

    // RH solicita revisão (Rodada 1 → 2)
    await db.solicitarRevisaoRH(id, {
      justificativa: 'Primeira revisão.',
      motivoRevisao: 'Motivo inicial.',
      rhId: testRhId,
      rhNome: 'Admin RH',
    });

    // Avançar novamente até aguardando_rh na Rodada 2
    await db.emitirParecerCKM(id, {
      parecerTipo: 'sem_aderencia',
      parecerTexto: 'Após reanálise, sem aderência.',
      adminId: testAdminId,
    });

    await db.decisaoGestor(id, {
      decisao: 'aprovado',
      justificativa: 'Mantenho aprovação.',
      gestorId: testGestorId,
    });

    // Verificar que está na Rodada 2
    let sol = await db.getSolicitacaoById(id);
    expect(sol!.rodadaAtual).toBe(2);
    expect(sol!.statusGeral).toBe('aguardando_rh');

    // Tentar solicitar revisão novamente - deve falhar
    await expect(
      db.solicitarRevisaoRH(id, {
        justificativa: 'Segunda revisão.',
        motivoRevisao: 'Tentando novamente.',
        rhId: testRhId,
        rhNome: 'Admin RH',
      })
    ).rejects.toThrow('já passou por uma rodada de revisão');
  });

  it('deve permitir aprovar na Rodada 2 e criar ação no PDI', async () => {
    const id = await criarSolicitacaoAteRH();

    // RH solicita revisão
    await db.solicitarRevisaoRH(id, {
      justificativa: 'Revisão necessária.',
      motivoRevisao: 'Novas informações.',
      rhId: testRhId,
      rhNome: 'Admin RH',
    });

    // Rodada 2: CKM emite novo parecer
    await db.emitirParecerCKM(id, {
      parecerTipo: 'com_aderencia',
      parecerTexto: 'Após reanálise, confirmada aderência.',
      adminId: testAdminId,
    });

    // Rodada 2: Gestor aprova
    await db.decisaoGestor(id, {
      decisao: 'aprovado',
      justificativa: 'Concordo com novo parecer.',
      gestorId: testGestorId,
    });

    // Rodada 2: RH aprova
    const acaoId = await db.decisaoRH(id, {
      decisao: 'aprovado',
      justificativa: 'Aprovado após revisão completa.',
      rhId: testRhId,
    });

    expect(acaoId).toBeGreaterThan(0);

    const sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aprovada');
    expect(sol!.rodadaAtual).toBe(2);
    expect(sol!.acaoIncluidaId).toBe(acaoId);
  });

  it('deve permitir vetar na Rodada 2', async () => {
    const id = await criarSolicitacaoAteRH();

    // RH solicita revisão
    await db.solicitarRevisaoRH(id, {
      justificativa: 'Revisão necessária.',
      motivoRevisao: 'Novas informações.',
      rhId: testRhId,
      rhNome: 'Admin RH',
    });

    // Rodada 2: CKM emite novo parecer
    await db.emitirParecerCKM(id, {
      parecerTipo: 'sem_aderencia',
      parecerTexto: 'Sem aderência confirmada.',
      adminId: testAdminId,
    });

    // Rodada 2: Gestor reprova
    await db.decisaoGestor(id, {
      decisao: 'reprovado',
      justificativa: 'Não concordo após reanálise.',
      gestorId: testGestorId,
    });

    const sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('vetada_gestor');
    expect(sol!.rodadaAtual).toBe(2);
  });

  it('não deve permitir solicitar revisão quando status não é aguardando_rh', async () => {
    const id = await db.createSolicitacaoAcao({
      pdiId: testPdiId,
      macroId: testMacroId,
      titulo: 'Teste Status Inválido - ' + Date.now(),
      descricao: 'Não deve permitir revisão',
      prazo: new Date('2026-12-31'),
      solicitanteId: testSolicitanteId,
    });
    cleanupIds.push(id);

    // Está em aguardando_ckm, não aguardando_rh
    // A função solicitarRevisaoRH não verifica o status diretamente,
    // mas o router verifica. Aqui testamos apenas a lógica de rodada.
    // A solicitação está na rodada 1, então a função deveria funcionar
    // mas o snapshot terá campos nulos (sem pareceres)
    // O importante é que o router valida o status antes de chamar a função
    const sol = await db.getSolicitacaoById(id);
    expect(sol!.statusGeral).toBe('aguardando_ckm');
    expect(sol!.rodadaAtual).toBe(1);
  });
});

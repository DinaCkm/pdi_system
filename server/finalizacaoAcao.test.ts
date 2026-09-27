import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db', () => ({
  getActionById: vi.fn(),
  updateAction: vi.fn(),
  createAcaoHistorico: vi.fn(),
  getUserById: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('./_core/notification', () => ({ notifyOwner: vi.fn() }));
vi.mock('./_core/email', () => ({ sendEmailParabensEvidenciaAprovada: vi.fn() }));

import * as db from './db';
import { notifyOwner } from './_core/notification';
import { sendEmailParabensEvidenciaAprovada } from './_core/email';
import { finalizarAcao } from './services/finalizacaoAcao';

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe('finalizarAcao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m(db.getActionById).mockResolvedValue({ id: 1, titulo: 'Curso X', status: 'em_andamento' });
    m(db.getUserById).mockImplementation(async (id: number) =>
      id === 10
        ? { id: 10, name: 'Colab', email: 'colab@x.com', leaderId: 20 }
        : { id: 20, name: 'Lider', email: 'lider@x.com' });
    m(db.execute).mockResolvedValue([[{ titulo: 'PDI 2026' }]]);
  });

  it('conclui a ação, grava histórico, avisa e envia e-mail com cópia ao líder', async () => {
    const r = await finalizarAcao({
      actionId: 1, colaboradorId: 10, origem: 'evidencia_admin', usuarioId: 99,
      aviso: (a) => ({ title: 'ok', content: `ação ${a.titulo}` }),
    });
    expect(r).toBe('concluida');
    expect(db.updateAction).toHaveBeenCalledWith(1, { status: 'concluida' });
    expect(db.createAcaoHistorico).toHaveBeenCalledWith(expect.objectContaining({
      actionId: 1, campo: 'Status', valorAnterior: 'em_andamento', valorNovo: 'concluida',
      motivoAlteracao: 'Evidência aprovada pelo administrador', alteradoPor: 99,
    }));
    expect(notifyOwner).toHaveBeenCalledWith({ title: 'ok', content: 'ação Curso X' });
    expect(sendEmailParabensEvidenciaAprovada).toHaveBeenCalledWith(expect.objectContaining({
      colaboradorEmail: 'colab@x.com', tituloAcao: 'Curso X', tituloPdi: 'PDI 2026',
      liderEmail: 'lider@x.com', liderName: 'Lider',
    }));
  });

  it('sem usuarioId e sem aviso não grava histórico nem notifica', async () => {
    await finalizarAcao({ actionId: 1, colaboradorId: 10, origem: 'curso_ecolider' });
    expect(db.createAcaoHistorico).not.toHaveBeenCalled();
    expect(notifyOwner).not.toHaveBeenCalled();
    expect(sendEmailParabensEvidenciaAprovada).toHaveBeenCalled();
  });

  it('ignorarSeJaConcluida não faz nada se a ação já está concluída', async () => {
    m(db.getActionById).mockResolvedValue({ id: 1, titulo: 'Curso X', status: 'concluida' });
    const r = await finalizarAcao({ actionId: 1, colaboradorId: 10, origem: 'curso_ecolider', ignorarSeJaConcluida: true });
    expect(r).toBe('ja_concluida');
    expect(db.updateAction).not.toHaveBeenCalled();
    expect(sendEmailParabensEvidenciaAprovada).not.toHaveBeenCalled();
  });

  it('ação inexistente não faz nada', async () => {
    m(db.getActionById).mockResolvedValue(undefined);
    expect(await finalizarAcao({ actionId: 1, colaboradorId: 10, origem: 'evidencia_lider' })).toBe('acao_nao_encontrada');
    expect(db.updateAction).not.toHaveBeenCalled();
  });

  it('falha no e-mail não interrompe a finalização', async () => {
    m(sendEmailParabensEvidenciaAprovada).mockRejectedValue(new Error('smtp'));
    expect(await finalizarAcao({ actionId: 1, colaboradorId: 10, origem: 'validacao_impacto' })).toBe('concluida');
  });
});

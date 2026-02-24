import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmailParecerCKMParaLider, sendEmailParecerLiderParaGerente } from './_core/email';

// Mock do fetch para não enviar emails reais durante os testes
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Notificações por Email - Solicitação de Nova Ação', () => {

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('sendEmailParecerCKMParaLider', () => {
    it('deve montar o email corretamente para o líder com parecer COM ADERÊNCIA', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await sendEmailParecerCKMParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Silva',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        parecerTipo: 'com_aderencia',
        parecerTexto: 'Ação alinhada com os gaps identificados.',
        departamento: 'TI',
      });

      // Verificar que fetch foi chamado
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verificar os parâmetros do fetch
      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('lider@teste.com');
      expect(body.subject).toContain('Solicitação de Ação Aguardando seu Parecer');
      expect(body.subject).toContain('Maria Santos');
      expect(body.body).toContain('João Silva');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('COM ADERÊNCIA');
      expect(body.body).toContain('Ação alinhada com os gaps identificados.');
      expect(body.body).toContain('TI');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('FLUXO É VIA SISTEMA EVOLUIR CKM');
      expect(body.body).toContain('CKM Talents');
    });

    it('deve montar o email corretamente para o líder com parecer SEM ADERÊNCIA', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailParecerCKMParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Silva',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Excel',
        parecerTipo: 'sem_aderencia',
        parecerTexto: 'Não alinhada com os gaps.',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.body).toContain('SEM ADERÊNCIA');
      expect(body.body).toContain('Curso de Excel');
    });

    it('deve funcionar sem departamento', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailParecerCKMParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Silva',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Excel',
        parecerTipo: 'com_aderencia',
        parecerTexto: 'OK',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      // Não deve ter linha de departamento
      expect(body.body).not.toContain('Departamento:');
    });
  });

  describe('sendEmailParecerLiderParaGerente', () => {
    it('deve montar o email corretamente para o gerente quando líder APROVA', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await sendEmailParecerLiderParaGerente({
        gerenteEmail: 'gerente@teste.com',
        gerenteName: 'Carlos Gerente',
        liderName: 'João Líder',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        decisaoLider: 'aprovado',
        justificativaLider: 'Concordo com a inclusão.',
        departamento: 'TI',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('gerente@teste.com');
      expect(body.subject).toContain('Solicitação de Ação Aguardando sua Decisão Final');
      expect(body.subject).toContain('Maria Santos');
      expect(body.body).toContain('Carlos Gerente');
      expect(body.body).toContain('João Líder');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('APROVADA');
      expect(body.body).toContain('Concordo com a inclusão.');
      expect(body.body).toContain('TI');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('FLUXO É VIA SISTEMA EVOLUIR CKM');
      expect(body.body).toContain('CKM Talents');
    });

    it('deve montar o email corretamente quando líder REPROVA', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailParecerLiderParaGerente({
        gerenteEmail: 'gerente@teste.com',
        gerenteName: 'Carlos Gerente',
        liderName: 'João Líder',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso Vetado',
        decisaoLider: 'reprovado',
        justificativaLider: 'Não vejo necessidade.',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.body).toContain('REPROVADA');
      expect(body.body).toContain('Não vejo necessidade.');
    });

    it('deve conter aviso de não responder o email', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailParecerLiderParaGerente({
        gerenteEmail: 'gerente@teste.com',
        gerenteName: 'Carlos',
        liderName: 'João',
        colaboradorName: 'Maria',
        tituloAcao: 'Curso',
        decisaoLider: 'aprovado',
        justificativaLider: 'OK',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('FLUXO É VIA SISTEMA EVOLUIR CKM');
      expect(body.body).toContain('Evoluir CKM');
    });
  });
});

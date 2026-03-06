import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmailParecerCKMParaLider, sendEmailParecerLiderParaGerente, sendEmailAcaoAprovadaParaColaborador, sendEmailAcaoReprovadaParaColaborador, sendEmailAjusteSolicitadoParaLider, sendEmailAjusteValidadoParaAdmin, sendEmailAjusteAprovadoParaColaborador, sendEmailAjusteReprovadoParaColaborador } from './_core/email';

// Mock do fetch para não enviar emails reais durante os testes
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Notificações por Email - Solicitação de Nova Ação', () => {

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('sendEmailParecerCKMParaLider', () => {
    it('deve montar o email corretamente para o líder', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailParecerCKMParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Silva',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        parecerTipo: 'com_aderencia',
        parecerTexto: 'Ação alinhada com os gaps identificados.',
        departamento: 'TI',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('lider@teste.com');
      expect(body.subject).toContain('Solicitação de Ação Aguardando seu Parecer');
      expect(body.subject).toContain('Maria Santos');
      expect(body.body).toContain('João Silva');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('Eco do Bem - Ecossistema de Desenvolvimento');
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

      expect(body.body).not.toContain('Departamento:');
    });
  });

  describe('sendEmailParecerLiderParaGerente', () => {
    it('deve montar o email corretamente para o gerente', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailParecerLiderParaGerente({
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
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('Eco do Bem - Ecossistema de Desenvolvimento');
    });
  });

  describe('sendEmailAcaoAprovadaParaColaborador', () => {
    it('deve montar o email corretamente quando ação é respondida', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAcaoAprovadaParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        pdiTitulo: 'PDI 2026 - Maria Santos',
        departamento: 'TI',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('maria@teste.com');
      expect(body.subject).toContain('INFORMATIVO');
      expect(body.subject).toContain('Respondida');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAcaoReprovadaParaColaborador', () => {
    it('deve montar o email corretamente quando ação é respondida', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAcaoReprovadaParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso Vetado',
        departamento: 'RH',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('maria@teste.com');
      expect(body.subject).toContain('INFORMATIVO');
      expect(body.subject).toContain('Respondida');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Curso Vetado');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });
});

describe('Notificações por Email - Solicitação de Ajuste', () => {

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('sendEmailAjusteSolicitadoParaLider', () => {
    it('deve montar o email corretamente para o líder', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAjusteSolicitadoParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Líder',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'alteracao_prazo',
        justificativa: 'Preciso de mais tempo para concluir.',
        departamento: 'TI',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('lider@teste.com');
      expect(body.subject).toContain('Solicitação de Ajuste Aguardando sua Validação');
      expect(body.subject).toContain('Maria Santos');
      expect(body.body).toContain('João Líder');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteValidadoParaAdmin', () => {
    it('deve montar o email corretamente para o admin', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAjusteValidadoParaAdmin({
        adminEmail: 'admin@teste.com',
        adminName: 'Admin CKM',
        liderName: 'João Líder',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'alteracao_descricao',
        justificativa: 'Quero alterar a descrição.',
        feedbackLider: 'Concordo com a alteração.',
        departamento: 'RH',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('admin@teste.com');
      expect(body.subject).toContain('Ajuste Autorizado pelo Líder');
      expect(body.subject).toContain('Maria Santos');
      expect(body.body).toContain('Admin CKM');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteAprovadoParaColaborador', () => {
    it('deve montar o email corretamente quando ajuste é respondido', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAjusteAprovadoParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'alteracao_prazo',
        departamento: 'TI',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('maria@teste.com');
      expect(body.subject).toContain('INFORMATIVO');
      expect(body.subject).toContain('Respondida');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteReprovadoParaColaborador', () => {
    it('deve montar o email corretamente quando ajuste é respondido', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAjusteReprovadoParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'cancelamento',
        justificativa: 'Não é possível cancelar neste momento.',
        departamento: 'TI',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.to).toBe('maria@teste.com');
      expect(body.subject).toContain('INFORMATIVO');
      expect(body.subject).toContain('Respondida');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('Eco_Evoluir');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });
});

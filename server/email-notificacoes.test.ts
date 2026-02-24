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

  describe('sendEmailAcaoAprovadaParaColaborador', () => {
    it('deve montar o email corretamente quando ação é APROVADA e incluída no PDI', async () => {
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
      expect(body.subject).toContain('PARABÉNS');
      expect(body.subject).toContain('Aprovada');
      expect(body.subject).toContain('Curso de Liderança');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('APROVADA');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('PDI 2026 - Maria Santos');
      expect(body.body).toContain('TI');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('FLUXO É VIA SISTEMA EVOLUIR CKM');
    });

    it('deve funcionar sem PDI titulo e departamento', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAcaoAprovadaParaColaborador({
        colaboradorEmail: 'joao@teste.com',
        colaboradorName: 'João Silva',
        tituloAcao: 'Curso de Excel',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.body).toContain('João Silva');
      expect(body.body).toContain('Curso de Excel');
      expect(body.body).not.toContain('PDI:');
      expect(body.body).not.toContain('Departamento:');
    });
  });

  describe('sendEmailAcaoReprovadaParaColaborador', () => {
    it('deve montar o email corretamente quando ação é REPROVADA', async () => {
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
      expect(body.subject).toContain('Não Foi Aprovada');
      expect(body.subject).toContain('Curso Vetado');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('NÃO foi aprovada');
      expect(body.body).toContain('Curso Vetado');
      expect(body.body).toContain('RH');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('FLUXO É VIA SISTEMA EVOLUIR CKM');
    });

    it('deve conter orientação para buscar feedback do gestor', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await sendEmailAcaoReprovadaParaColaborador({
        colaboradorEmail: 'joao@teste.com',
        colaboradorName: 'João',
        tituloAcao: 'Curso X',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.body).toContain('feedback');
      expect(body.body).toContain('gestor');
    });
  });
});

describe('Notificações por Email - Solicitação de Ajuste', () => {

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('sendEmailAjusteSolicitadoParaLider', () => {
    it('deve montar o email corretamente para o líder quando colaborador solicita ajuste', async () => {
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
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('Alteração de Prazo');
      expect(body.body).toContain('Preciso de mais tempo para concluir.');
      expect(body.body).toContain('TI');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(body.body).toContain('FLUXO É VIA SISTEMA EVOLUIR CKM');
    });
  });

  describe('sendEmailAjusteValidadoParaAdmin', () => {
    it('deve montar o email corretamente para o admin quando líder valida o ajuste', async () => {
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
      expect(body.body).toContain('João Líder');
      expect(body.body).toContain('AUTORIZOU');
      expect(body.body).toContain('Alteração de Descrição');
      expect(body.body).toContain('Concordo com a alteração.');
      expect(body.body).toContain('RH');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteAprovadoParaColaborador', () => {
    it('deve montar o email corretamente quando ajuste é APROVADO', async () => {
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
      expect(body.subject).toContain('APROVADO');
      expect(body.subject).toContain('Ajuste');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('APROVADA');
      expect(body.body).toContain('Curso de Liderança');
      expect(body.body).toContain('Alteração de Prazo');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteReprovadoParaColaborador', () => {
    it('deve montar o email corretamente quando ajuste é REPROVADO', async () => {
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
      expect(body.subject).toContain('Não Foi Aprovada');
      expect(body.body).toContain('Maria Santos');
      expect(body.body).toContain('NÃO foi aprovada');
      expect(body.body).toContain('Cancelamento da Ação');
      expect(body.body).toContain('Não é possível cancelar neste momento.');
      expect(body.body).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });
});

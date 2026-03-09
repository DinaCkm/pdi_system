import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo Resend antes de importar as funções de email
vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null });
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
    __mockSend: mockSend,
  };
});

// Mock do ENV para ter a API key
vi.mock('./env', () => ({
  ENV: {
    resendApiKey: 'test-api-key',
  },
}));

// Importar após os mocks
import { Resend } from 'resend';
import {
  sendEmailParecerCKMParaLider,
  sendEmailParecerLiderParaGerente,
  sendEmailAcaoAprovadaParaColaborador,
  sendEmailAcaoReprovadaParaColaborador,
  sendEmailAjusteSolicitadoParaLider,
  sendEmailAjusteValidadoParaAdmin,
  sendEmailAjusteAprovadoParaColaborador,
  sendEmailAjusteReprovadoParaColaborador,
} from './_core/email';

function getMockSend() {
  // Acessa o mock do send via a instância do Resend
  const instance = (Resend as any).mock.results[0]?.value;
  return instance?.emails?.send;
}

describe('Notificações por Email - Solicitação de Nova Ação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Recriar o mock para cada teste
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null });
    (Resend as any).mockImplementation(() => ({
      emails: { send: mockSend },
    }));
  });

  describe('sendEmailParecerCKMParaLider', () => {
    it('deve montar o email corretamente para o líder', async () => {
      const result = await sendEmailParecerCKMParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Silva',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        parecerTipo: 'com_aderencia',
        parecerTexto: 'Ação alinhada com os gaps identificados.',
        departamento: 'TI',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['lider@teste.com']);
      expect(callArgs.subject).toContain('Solicitação de Ação Aguardando seu Parecer');
      expect(callArgs.subject).toContain('Maria Santos');
      expect(callArgs.html).toContain('João Silva');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(callArgs.html).toContain('Eco do Bem - Ecossistema de Desenvolvimento');
    });

    it('deve funcionar sem departamento', async () => {
      const result = await sendEmailParecerCKMParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Silva',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Excel',
        parecerTipo: 'com_aderencia',
        parecerTexto: 'OK',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).not.toContain('Departamento:');
    });
  });

  describe('sendEmailParecerLiderParaGerente', () => {
    it('deve montar o email corretamente para o gerente', async () => {
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

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['gerente@teste.com']);
      expect(callArgs.subject).toContain('Solicitação de Ação Aguardando sua Decisão Final');
      expect(callArgs.subject).toContain('Maria Santos');
      expect(callArgs.html).toContain('Carlos Gerente');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
      expect(callArgs.html).toContain('Eco do Bem - Ecossistema de Desenvolvimento');
    });
  });

  describe('sendEmailAcaoAprovadaParaColaborador', () => {
    it('deve montar o email corretamente quando ação é respondida', async () => {
      const result = await sendEmailAcaoAprovadaParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        pdiTitulo: 'PDI 2026 - Maria Santos',
        departamento: 'TI',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['maria@teste.com']);
      expect(callArgs.subject).toContain('INFORMATIVO');
      expect(callArgs.subject).toContain('Respondida');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Curso de Liderança');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAcaoReprovadaParaColaborador', () => {
    it('deve montar o email corretamente quando ação é respondida', async () => {
      const result = await sendEmailAcaoReprovadaParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso Vetado',
        departamento: 'RH',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['maria@teste.com']);
      expect(callArgs.subject).toContain('INFORMATIVO');
      expect(callArgs.subject).toContain('Respondida');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Curso Vetado');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });
});

describe('Notificações por Email - Solicitação de Ajuste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null });
    (Resend as any).mockImplementation(() => ({
      emails: { send: mockSend },
    }));
  });

  describe('sendEmailAjusteSolicitadoParaLider', () => {
    it('deve montar o email corretamente para o líder', async () => {
      const result = await sendEmailAjusteSolicitadoParaLider({
        liderEmail: 'lider@teste.com',
        liderName: 'João Líder',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'alteracao_prazo',
        justificativa: 'Preciso de mais tempo para concluir.',
        departamento: 'TI',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['lider@teste.com']);
      expect(callArgs.subject).toContain('Solicitação de Ajuste Aguardando sua Validação');
      expect(callArgs.subject).toContain('Maria Santos');
      expect(callArgs.html).toContain('João Líder');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteValidadoParaAdmin', () => {
    it('deve montar o email corretamente para o admin', async () => {
      const result = await sendEmailAjusteValidadoParaAdmin({
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

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['admin@teste.com']);
      expect(callArgs.subject).toContain('Ajuste Autorizado pelo Líder');
      expect(callArgs.subject).toContain('Maria Santos');
      expect(callArgs.html).toContain('Admin CKM');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteAprovadoParaColaborador', () => {
    it('deve montar o email corretamente quando ajuste é respondido', async () => {
      const result = await sendEmailAjusteAprovadoParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'alteracao_prazo',
        departamento: 'TI',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['maria@teste.com']);
      expect(callArgs.subject).toContain('INFORMATIVO');
      expect(callArgs.subject).toContain('Respondida');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Curso de Liderança');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });

  describe('sendEmailAjusteReprovadoParaColaborador', () => {
    it('deve montar o email corretamente quando ajuste é respondido', async () => {
      const result = await sendEmailAjusteReprovadoParaColaborador({
        colaboradorEmail: 'maria@teste.com',
        colaboradorName: 'Maria Santos',
        tituloAcao: 'Curso de Liderança',
        tipoAjuste: 'cancelamento',
        justificativa: 'Não é possível cancelar neste momento.',
        departamento: 'TI',
      });

      expect(result).toBe(true);
      const mockSend = getMockSend();
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['maria@teste.com']);
      expect(callArgs.subject).toContain('INFORMATIVO');
      expect(callArgs.subject).toContain('Respondida');
      expect(callArgs.html).toContain('Maria Santos');
      expect(callArgs.html).toContain('Curso de Liderança');
      expect(callArgs.html).toContain('Eco_Evoluir');
      expect(callArgs.html).toContain('NÃO RESPONDA ESTE EMAIL');
    });
  });
});

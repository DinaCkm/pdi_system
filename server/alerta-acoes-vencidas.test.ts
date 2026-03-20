import { describe, it, expect, vi } from 'vitest';

// Testar as funções de e-mail de ações vencidas
describe('E-mail de Ações Vencidas', () => {
  it('deve importar sendEmailAcoesVencidasEmpregado corretamente', async () => {
    const { sendEmailAcoesVencidasEmpregado } = await import('./_core/email');
    expect(typeof sendEmailAcoesVencidasEmpregado).toBe('function');
  });

  it('deve importar sendEmailAcoesVencidasLider corretamente', async () => {
    const { sendEmailAcoesVencidasLider } = await import('./_core/email');
    expect(typeof sendEmailAcoesVencidasLider).toBe('function');
  });

  it('deve enviar e-mail de ações vencidas para empregado com sucesso', async () => {
    const { sendEmailAcoesVencidasEmpregado } = await import('./_core/email');
    
    const result = await sendEmailAcoesVencidasEmpregado({
      colaboradorEmail: 'relacionamento@ckmtalents.net',
      colaboradorName: 'Teste Empregado',
      pdisComAcoesVencidas: [
        { tituloPdi: 'PDI Teste 2025', qtdAcoesVencidas: 3 },
        { tituloPdi: 'PDI Teste 2026', qtdAcoesVencidas: 1 },
      ],
    });

    expect(result).toBe(true);
  }, 30000);

  it('deve enviar e-mail de ações vencidas para líder com sucesso', async () => {
    const { sendEmailAcoesVencidasLider } = await import('./_core/email');
    
    const result = await sendEmailAcoesVencidasLider({
      liderEmail: 'relacionamento@ckmtalents.net',
      liderName: 'Teste Líder',
      subordinadosComPendencias: [
        { nomeColaborador: 'João Silva', qtdAcoesVencidas: 2 },
        { nomeColaborador: 'Maria Santos', qtdAcoesVencidas: 4 },
      ],
    });

    expect(result).toBe(true);
  }, 30000);
});

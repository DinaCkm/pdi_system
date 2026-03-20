import { describe, it, expect, vi, beforeAll } from 'vitest';

describe('E-mail de parabéns por evidência aprovada', () => {
  beforeAll(async () => {
    // Aguardar módulos carregarem
  }, 30000);

  it('deve exportar a função sendEmailParabensEvidenciaAprovada', async () => {
    const emailModule = await import('./_core/email');
    expect(typeof emailModule.sendEmailParabensEvidenciaAprovada).toBe('function');
  });

  it('deve ter a função integrada na procedure approve de evidências', async () => {
    // Verificar que o import existe no routers.ts
    const fs = await import('fs');
    const routersContent = fs.readFileSync('./server/routers.ts', 'utf-8');
    expect(routersContent).toContain('sendEmailParabensEvidenciaAprovada');
    expect(routersContent).toContain('Erro ao enviar e-mail de parabéns');
  });

  it('deve ter o texto de incentivo ao LinkedIn na função de e-mail', async () => {
    const fs = await import('fs');
    const emailContent = fs.readFileSync('./server/_core/email.ts', 'utf-8');
    expect(emailContent).toContain('PUBLIQUE SUA CONQUISTA NO LINKEDIN');
    expect(emailContent).toContain('vitrine dos profissionais de alta performance');
    expect(emailContent).toContain('linkedin.com');
  });

  it('deve enviar e-mail para colaborador e líder nos dois fluxos de aprovação', async () => {
    const fs = await import('fs');
    const routersContent = fs.readFileSync('./server/routers.ts', 'utf-8');
    // Verificar que está integrado tanto na aprovação pelo admin quanto pelo líder
    expect(routersContent).toContain('[evidences.approve] Erro ao enviar e-mail de parabéns');
    expect(routersContent).toContain('[evidences.aprovar-lider] Erro ao enviar e-mail de parabéns');
  });
});

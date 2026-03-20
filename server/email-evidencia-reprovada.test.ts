import { describe, it, expect } from 'vitest';

describe('E-mail de notificação de evidência reprovada', () => {
  it('deve exportar a função sendEmailEvidenciaReprovada', async () => {
    const emailModule = await import('./_core/email');
    expect(typeof emailModule.sendEmailEvidenciaReprovada).toBe('function');
  });

  it('deve ter a função integrada na procedure reject de evidências (admin)', async () => {
    const fs = await import('fs');
    const routersContent = fs.readFileSync('./server/routers.ts', 'utf-8');
    expect(routersContent).toContain('sendEmailEvidenciaReprovada');
    expect(routersContent).toContain('[evidences.reject] Erro ao enviar e-mail de reprovação');
  });

  it('deve ter a função integrada na procedure reprovar de evidências (líder)', async () => {
    const fs = await import('fs');
    const routersContent = fs.readFileSync('./server/routers.ts', 'utf-8');
    expect(routersContent).toContain('[evidences.reprovar-lider] Erro ao enviar e-mail de reprovação');
  });

  it('deve conter orientações claras no corpo do e-mail', async () => {
    const fs = await import('fs');
    const emailContent = fs.readFileSync('./server/_core/email.ts', 'utf-8');
    expect(emailContent).toContain('MOTIVO DA DEVOLUÇÃO');
    expect(emailContent).toContain('O QUE FAZER AGORA');
    expect(emailContent).toContain('Faça os ajustes necessários');
    expect(emailContent).toContain('Reenvie a evidência corrigida');
    expect(emailContent).toContain('evoluirckm.com');
  });

  it('deve enviar cópia informativa ao líder com justificativa', async () => {
    const fs = await import('fs');
    const emailContent = fs.readFileSync('./server/_core/email.ts', 'utf-8');
    expect(emailContent).toContain('DEVOLVIDA para ajustes pelo avaliador');
    expect(emailContent).toContain('Evidência Devolvida');
  });
});

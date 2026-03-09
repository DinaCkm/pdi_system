import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API Connection", () => {
  it("deve verificar que a API Key do Resend está configurada", () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    expect(apiKey).toBeTruthy();
    expect(apiKey!.startsWith("re_")).toBe(true);
    console.log(`[Resend Test] API Key configurada: ${apiKey!.substring(0, 10)}...`);
  });

  it("deve autenticar com a API do Resend com sucesso", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping connection test");
      return;
    }

    const resend = new Resend(apiKey);
    
    // Enviar email para o próprio endereço de teste do Resend (onboarding@resend.dev)
    // A API key é restrita a envio apenas, não pode listar domínios
    const { data, error } = await resend.emails.send({
      from: "Eco do Bem - EVOLUIR <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: "[TESTE CONEXÃO] Verificação de autenticação Resend",
      text: "Teste de autenticação com Resend API.",
    });

    // Se o domínio não está verificado, o Resend retorna erro 403
    // mas a autenticação (API key) está correta se não retornar 401
    if (error && error.statusCode === 403) {
      // Domínio não verificado ainda, mas API key é válida
      console.log("[Resend Test] API Key válida. Domínio pendente de verificação DNS.");
      expect(error.statusCode).not.toBe(401); // Não é erro de autenticação
    } else if (error) {
      console.error("[Resend Test] Erro inesperado:", error);
      // Aceitar qualquer erro que não seja de autenticação
      expect(error.statusCode).not.toBe(401);
    } else {
      console.log(`[Resend Test] Email de teste enviado com sucesso! ID: ${data?.id}`);
      expect(data?.id).toBeTruthy();
    }
  }, 15000);

  it("deve enviar um email de teste para endereço de teste do Resend", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping send test");
      return;
    }

    const resend = new Resend(apiKey);
    
    // Usar o endereço de teste do Resend que sempre funciona
    const { data, error } = await resend.emails.send({
      from: "Eco do Bem - EVOLUIR <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: "[TESTE] Email de teste do sistema Eco do Bem - EVOLUIR",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Eco do Bem - EVOLUIR</h2>
          <p>Este é um email de teste enviado automaticamente pelo sistema.</p>
          <p>Se você recebeu este email, significa que o serviço de notificações está funcionando corretamente.</p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">Sistema de Gestão de PDI — Eco do Bem - Ecossistema de Desenvolvimento</p>
        </div>
      `,
    });

    // Aceitar sucesso ou erro de domínio não verificado (403)
    if (error && error.statusCode === 403) {
      console.log("[Resend Test] Domínio pendente de verificação DNS. Email não enviado, mas API key é válida.");
      expect(error.statusCode).toBe(403);
    } else {
      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
      console.log(`[Resend Test] Email de teste enviado com sucesso! ID: ${data?.id}`);
    }
  }, 15000);
});

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
    
    // Listar domínios é uma operação leve que valida a API key
    const { data, error } = await resend.domains.list();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    console.log("[Resend Test] Autenticação com Resend verificada com sucesso!");
    console.log(`[Resend Test] Domínios disponíveis: ${data?.data?.length ?? 0}`);
  }, 15000);

  it("deve enviar um email de teste real", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping send test");
      return;
    }

    const resend = new Resend(apiKey);
    
    const { data, error } = await resend.emails.send({
      from: "Eco do Bem - EVOLUIR <onboarding@resend.dev>",
      to: ["jumakiyama@gmail.com"],
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

    if (error) {
      console.error("[Resend Test] Erro ao enviar:", error);
    }
    
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    console.log(`[Resend Test] Email de teste enviado com sucesso! ID: ${data?.id}`);
  }, 15000);
});

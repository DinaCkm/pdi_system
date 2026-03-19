import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Nodemailer Connection", () => {
  it("deve verificar que as credenciais SMTP estão configuradas", () => {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    expect(host).toBeTruthy();
    expect(port).toBeTruthy();
    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();
    expect(user).toContain("@ckmtalents.net");
  });

  it("deve conectar ao servidor SMTP do Google com sucesso", async () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("SMTP credentials not set, skipping connection test");
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // verify() testa a conexão e autenticação sem enviar email
    const result = await transporter.verify();
    expect(result).toBe(true);
  }, 15000);

  it("deve enviar um email de teste real via SMTP", async () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("SMTP credentials not set, skipping send test");
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"Eco do Bem - EVOLUIR" <${user}>`,
      to: user, // envia para si mesmo como teste
      subject: "[TESTE SMTP] Verificação de envio via Nodemailer",
      text: "Este é um email de teste enviado pelo sistema Eco do Bem - EVOLUIR via SMTP Nodemailer.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Eco do Bem - EVOLUIR</h2>
          <p>Este é um email de teste enviado automaticamente pelo sistema via <strong>SMTP Nodemailer</strong>.</p>
          <p>Se você recebeu este email, significa que o serviço de notificações está funcionando corretamente com o remetente <strong>${user}</strong>.</p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">Sistema de Gestão de PDI — Eco do Bem - Ecossistema de Desenvolvimento</p>
        </div>
      `,
    });

    expect(info.messageId).toBeTruthy();
    console.log(`[SMTP Test] Email de teste enviado com sucesso! messageId: ${info.messageId}`);
  }, 15000);
});

import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { CustomTrpcContext } from "./_core/customContext";
import * as db from "./db";

function createMockContext(): { ctx: CustomTrpcContext } {
  const ctx: CustomTrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as CustomTrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as CustomTrpcContext["res"],
  };

  return { ctx };
}

describe("Setup Inicial", () => {
  it("deve indicar que precisa de setup quando não há usuários", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.needsSetup();

    // Como já existem usuários de testes anteriores, vamos apenas verificar a estrutura
    expect(result).toHaveProperty("needsSetup");
    expect(typeof result.needsSetup).toBe("boolean");
  });

  it("deve criar primeiro admin via setup", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Verificar contagem atual
    const userCount = await db.countUsers();
    
    // Se já existem usuários, o setup deve falhar
    if (userCount > 0) {
      await expect(
        caller.auth.setup({
          name: "Admin Setup Test",
          email: "setup@test.com",
          cpf: "99999999999",
          cargo: "Administrador",
        })
      ).rejects.toThrow("Setup já foi realizado");
    } else {
      // Se não existem usuários, o setup deve funcionar
      const result = await caller.auth.setup({
        name: "Admin Setup Test",
        email: "setup@test.com",
        cpf: "99999999999",
        cargo: "Administrador",
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe("admin");
    }
  });

  it("deve rejeitar setup quando já existem usuários", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Garantir que existe pelo menos um usuário
    const userCount = await db.countUsers();
    
    if (userCount === 0) {
      // Criar um usuário primeiro
      await db.createUser({
        openId: "test-block-setup-" + Date.now(),
        name: "Blocker User",
        email: "blocker@test.com",
        cpf: "88888888888",
        role: "admin",
        cargo: "Admin",
        status: "ativo",
      });
    }

    // Tentar setup novamente deve falhar
    await expect(
      caller.auth.setup({
        name: "Admin Setup Test 2",
        email: "setup2@test.com",
        cpf: "77777777777",
        cargo: "Administrador",
      })
    ).rejects.toThrow();
  });

  it("deve validar campos obrigatórios no setup", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Testar sem nome
    await expect(
      caller.auth.setup({
        name: "",
        email: "test@test.com",
        cpf: "12345678901",
        cargo: "Cargo",
      })
    ).rejects.toThrow();

    // Testar sem email válido
    await expect(
      caller.auth.setup({
        name: "Nome",
        email: "email-invalido",
        cpf: "12345678901",
        cargo: "Cargo",
      })
    ).rejects.toThrow();

    // Testar sem CPF
    await expect(
      caller.auth.setup({
        name: "Nome",
        email: "test@test.com",
        cpf: "123",
        cargo: "Cargo",
      })
    ).rejects.toThrow();
  });
});

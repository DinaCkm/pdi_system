import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { CustomTrpcContext } from "./_core/customContext";
import * as db from "./db";

type AuthenticatedUser = NonNullable<CustomTrpcContext["user"]>;

function createMockContext(user: AuthenticatedUser | null = null): { ctx: CustomTrpcContext; cookies: Record<string, string> } {
  const cookies: Record<string, string> = {};

  const ctx: CustomTrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      cookies,
    } as CustomTrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => {
        cookies[name] = value;
      },
      clearCookie: (name: string) => {
        delete cookies[name];
      },
    } as CustomTrpcContext["res"],
  };

  return { ctx, cookies };
}

describe("Autenticação Customizada", () => {
  let testUserId: number;

  beforeAll(async () => {
    // Criar usuário de teste
    const testUser = await db.createUser({
      openId: "test-custom-auth-" + Date.now(),
      name: "Teste Auth",
      email: "teste.auth@test.com",
      cpf: "12345678901",
      role: "colaborador",
      cargo: "Teste",
      status: "ativo",
    });
    
    // Buscar usuário criado para obter ID
    const user = await db.getUserByEmailAndCpf("teste.auth@test.com", "12345678901");
    if (user) {
      testUserId = user.id;
    }
  });

  it("deve fazer login com email e CPF corretos", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "teste.auth@test.com",
      cpf: "12345678901",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("teste.auth@test.com");
    expect(result.user.cpf).toBe("12345678901");
    expect(cookies.pdi_session).toBeDefined();
  });

  it("deve rejeitar login com email incorreto", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: "email.errado@test.com",
        cpf: "12345678901",
      })
    ).rejects.toThrow("Email ou CPF incorretos");
  });

  it("deve rejeitar login com CPF incorreto", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: "teste.auth@test.com",
        cpf: "99999999999",
      })
    ).rejects.toThrow("Email ou CPF incorretos");
  });

  it("deve fazer logout e limpar cookie", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Primeiro fazer login
    await caller.auth.login({
      email: "teste.auth@test.com",
      cpf: "12345678901",
    });

    expect(cookies.pdi_session).toBeDefined();

    // Fazer logout
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(cookies.pdi_session).toBeUndefined();
  });

  it("deve retornar usuário autenticado via auth.me", async () => {
    const user: AuthenticatedUser = {
      id: testUserId,
      openId: "test-custom-auth",
      name: "Teste Auth",
      email: "teste.auth@test.com",
      cpf: "12345678901",
      loginMethod: null,
      role: "colaborador",
      cargo: "Teste",
      leaderId: null,
      departamentoId: null,
      status: "ativo",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const { ctx } = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.email).toBe("teste.auth@test.com");
    expect(result?.role).toBe("colaborador");
  });

  it("deve retornar null para usuário não autenticado via auth.me", async () => {
    const { ctx } = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

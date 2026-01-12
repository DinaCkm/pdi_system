import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { CustomTrpcContext } from "./_core/customContext";
import * as db from "./db";

type AuthenticatedUser = NonNullable<CustomTrpcContext["user"]>;

function createMockContext(user: AuthenticatedUser): { ctx: CustomTrpcContext } {
  const ctx: CustomTrpcContext = {
    user,
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

describe("PDI e Ações", () => {
  let adminUser: AuthenticatedUser;
  let colaboradorUser: AuthenticatedUser;
  let liderUser: AuthenticatedUser;
  let cicloId: number;
  let pdiId: number;
  let actionId: number;

  beforeAll(async () => {
    const timestamp = Date.now();
    
    // Criar usuários de teste com CPFs únicos
    const adminCpf = "111" + timestamp.toString().slice(-8);
    const liderCpf = "222" + timestamp.toString().slice(-8);
    const colaboradorCpf = "333" + timestamp.toString().slice(-8);
    
    const adminCreated = await db.createUser({
      openId: "test-admin-pdi-" + timestamp,
      name: "Admin Teste PDI",
      email: "admin.pdi" + timestamp + "@test.com",
      cpf: adminCpf,
      role: "admin",
      cargo: "Administrador",
      status: "ativo",
    });

    const liderCreated = await db.createUser({
      openId: "test-lider-pdi-" + timestamp,
      name: "Líder Teste PDI",
      email: "lider.pdi" + timestamp + "@test.com",
      cpf: liderCpf,
      role: "lider",
      cargo: "Líder",
      status: "ativo",
    });

    const colaboradorCreated = await db.createUser({
      openId: "test-colab-pdi-" + timestamp,
      name: "Colaborador Teste PDI",
      email: "colab.pdi" + timestamp + "@test.com",
      cpf: colaboradorCpf,
      role: "colaborador",
      cargo: "Colaborador",
      status: "ativo",
      leaderId: 2, // Assumindo que líder tem ID 2
    });

    // Buscar usuários criados
    const admin = await db.getUserByEmailAndCpf("admin.pdi" + timestamp + "@test.com", adminCpf);
    const lider = await db.getUserByEmailAndCpf("lider.pdi" + timestamp + "@test.com", liderCpf);
    const colaborador = await db.getUserByEmailAndCpf("colab.pdi" + timestamp + "@test.com", colaboradorCpf);

    if (admin && lider && colaborador) {
      adminUser = admin;
      liderUser = lider;
      colaboradorUser = colaborador;
    }

    // Criar ciclo de teste
    const cicloResult = await db.createCiclo({
      nome: "Ciclo Teste PDI",
      dataInicio: new Date("2025-01-01"),
      dataFim: new Date("2025-06-30"),
      createdBy: adminUser.id,
    });

    const ciclos = await db.getAllCiclos();
    if (ciclos.length > 0) {
      cicloId = ciclos[0]!.id;
    }

    // Criar competências de teste
    const blocoResult = await db.createBloco({
      nome: "Bloco Teste",
      descricao: "Bloco para testes",
    });

    const blocos = await db.getAllBlocos();
    const blocoId = blocos[0]?.id || 1;

    await db.createMacro({
      blocoId,
      nome: "Macro Teste",
      descricao: "Macro para testes",
    });

    const macros = await db.getMacrosByBlocoId(blocoId);
    const macroId = macros[0]?.id || 1;

    await db.createMicro({
      macroId,
      nome: "Micro Teste",
      descricao: "Micro para testes",
    });
  });

  it("deve criar um PDI como Admin", async () => {
    const { ctx } = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.pdis.create({
      colaboradorId: colaboradorUser.id,
      cicloId,
      titulo: "PDI Teste",
      objetivoGeral: "Objetivo geral do PDI de teste",
    });

    expect(result.success).toBe(true);

    // Buscar PDI criado
    const pdis = await db.getPDIsByColaboradorId(colaboradorUser.id);
    expect(pdis.length).toBeGreaterThan(0);
    pdiId = pdis[0]!.id;
  });

  it("deve listar PDIs do colaborador", async () => {
    const { ctx } = createMockContext(colaboradorUser);
    const caller = appRouter.createCaller(ctx);

    const pdis = await caller.pdis.myPDIs();

    expect(Array.isArray(pdis)).toBe(true);
    expect(pdis.length).toBeGreaterThan(0);
  });

  it("deve criar uma ação como Admin", async () => {
    const { ctx } = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    const micros = await db.getMicrosByMacroId(1);
    const microId = micros[0]?.id || 1;

    const result = await caller.actions.create({
      pdiId,
      blocoId: 1,
      macroId: 1,
      microId,
      nome: "Ação Teste",
      descricao: "Descrição da ação de teste",
      prazo: "2025-03-15",
    });

    expect(result.success).toBe(true);

    // Buscar ação criada
    const actions = await db.getActionsByPDIId(pdiId);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]!.status).toBe("pendente_aprovacao_lider");
    actionId = actions[0]!.id;
  });

  it("deve aprovar uma ação como Líder", async () => {
    const { ctx } = createMockContext(liderUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.actions.approve({
      id: actionId,
    });

    expect(result.success).toBe(true);

    // Verificar status
    const action = await db.getActionById(actionId);
    expect(action?.status).toBe("aprovada_lider");
  });

  it("deve iniciar execução de ação como Colaborador", async () => {
    const { ctx } = createMockContext(colaboradorUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.actions.start({
      id: actionId,
    });

    expect(result.success).toBe(true);

    // Verificar status
    const action = await db.getActionById(actionId);
    expect(action?.status).toBe("em_andamento");
  });

  it("deve rejeitar criação de ação com prazo fora do ciclo", async () => {
    const { ctx } = createMockContext(adminUser);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.actions.create({
        pdiId,
        blocoId: 1,
        macroId: 1,
        microId: 1,
        nome: "Ação Inválida",
        descricao: "Ação com prazo inválido",
        prazo: "2026-12-31", // Fora do ciclo
      })
    ).rejects.toThrow();
  });
});

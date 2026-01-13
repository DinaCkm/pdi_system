import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("PDI createBulk", () => {
  let adminContext: any;
  let cicloId: number;

  beforeAll(async () => {
    // Criar contexto admin
    const allUsers = await db.getAllUsers();
    const adminUser = allUsers.find(u => u.role === "admin");
    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    adminContext = {
      user: adminUser,
    };

    // Buscar ou criar ciclo de teste
    const ciclos = await db.getAllCiclos();
    if (ciclos.length === 0) {
      await db.createCiclo({
        nome: "1º CICLO DE 2026",
        dataInicio: new Date("2026-01-01"),
        dataFim: new Date("2026-12-31"),
        createdBy: adminUser.id,
      });
      const newCiclos = await db.getAllCiclos();
      cicloId = newCiclos[0].id;
    } else {
      cicloId = ciclos[0].id;
    }
  });

  it("deve criar PDIs em lote para todos os colaboradores ativos", async () => {
    const caller = appRouter.createCaller(adminContext);

    // Buscar colaboradores ativos antes
    const allUsers = await db.getAllUsers();
    const colaboradoresAtivos = allUsers.filter(
      (u) => u.status === "ativo" && (u.role === "colaborador" || u.role === "lider")
    );

    expect(colaboradoresAtivos.length).toBeGreaterThan(0);

    // Criar PDIs em lote
    const result = await caller.pdis.createBulk({
      cicloId,
      titulo: "PDI- 1º Ciclo 2066 - Foco: Desenvolvimento Técnico e Prático",
      objetivoGeral: "Desenvolver habilidades técnicas e práticas",
    });

    expect(result.success).toBe(true);
    expect(result.created).toBeGreaterThan(0);
    expect(result.total).toBe(colaboradoresAtivos.length);

    // Verificar se os PDIs foram criados
    const pdis = await db.getPDIsByCicloId(cicloId);
    const pdisComTitulo = pdis.filter((p) =>
      p.titulo.includes("1º Ciclo 2066")
    );
    expect(pdisComTitulo.length).toBeGreaterThan(0);
  }, 30000);

  it("não deve criar PDIs duplicados para o mesmo colaborador e ciclo", async () => {
    const caller = appRouter.createCaller(adminContext);

    // Tentar criar novamente deve lançar erro
    await expect(
      caller.pdis.createBulk({
        cicloId,
        titulo: "PDI- 1º Ciclo 2066 - Foco: Desenvolvimento Técnico e Prático",
        objetivoGeral: "Desenvolver habilidades técnicas e práticas",
      })
    ).rejects.toThrow("Todos os colaboradores já possuem PDI neste ciclo");
  }, 30000);
});

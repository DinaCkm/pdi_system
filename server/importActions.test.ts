import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Importação de Ações - Validação", () => {
  let adminContext: any;
  let testData: {
    colaboradorCpf: string;
    cicloNome: string;
    microNome: string;
    prazoValido: string;
  };

  beforeAll(async () => {
    // Buscar admin existente
    const users = await db.getAllUsers();
    const admin = users.find(u => u.role === "admin");
    
    if (!admin) {
      throw new Error("Nenhum admin encontrado no banco");
    }

    adminContext = {
      user: admin,
    };

    // Buscar dados reais do banco para usar nos testes
    const colaboradores = users.filter(u => u.role === "colaborador" && u.status === "ativo");
    if (colaboradores.length === 0) throw new Error("Nenhum colaborador encontrado");
    
    const ciclos = await db.getAllCiclos();
    const ciclo = ciclos.find(c => c.status === "ativo");
    if (!ciclo) throw new Error("Nenhum ciclo ativo encontrado");

    const blocos = await db.getAllBlocos();
    const bloco = blocos.find(b => b.status === "ativo");
    if (!bloco) throw new Error("Nenhum bloco ativo encontrado");

    const macros = await db.getMacrosByBlocoId(bloco.id);
    const macro = macros.find(m => m.status === "ativo");
    if (!macro) throw new Error("Nenhuma macro ativa encontrada");

    const micros = await db.getMicrosByMacroId(macro.id);
    const micro = micros.find(m => m.status === "ativo");
    if (!micro) throw new Error("Nenhuma micro ativa encontrada");

    // Calcular prazo válido dentro do ciclo
    const prazoDate = new Date(ciclo.dataInicio);
    prazoDate.setDate(prazoDate.getDate() + 30);
    const prazoFormatado = `${String(prazoDate.getDate()).padStart(2, '0')}/${String(prazoDate.getMonth() + 1).padStart(2, '0')}/${prazoDate.getFullYear()}`;

    testData = {
      colaboradorCpf: colaboradores[0].cpf,
      cicloNome: ciclo.nome,
      microNome: micro.nome,
      prazoValido: prazoFormatado,
    };
  });

  it("deve validar linha correta com sucesso", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.importActions.validate({
      rows: [
        {
          cpf: testData.colaboradorCpf,
          cicloNome: testData.cicloNome,
          nomeAcao: `Ação Teste ${Date.now()}`,
          descricaoAcao: "Descrição da ação de teste",
          microcompetenciaNome: testData.microNome,
          prazo: testData.prazoValido,
        },
      ],
    });

    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.invalid).toBe(0);
    expect(result.summary.canImport).toBe(true);
    expect(result.results[0].valid).toBe(true);
    expect(result.results[0].errors).toHaveLength(0);
  });

  it("deve detectar CPF inválido", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.importActions.validate({
      rows: [
        {
          cpf: "999.999.999-99", // CPF inexistente
          cicloNome: testData.cicloNome,
          nomeAcao: "Ação Teste",
          descricaoAcao: "Descrição",
          microcompetenciaNome: testData.microNome,
          prazo: testData.prazoValido,
        },
      ],
    });

    expect(result.summary.valid).toBe(0);
    expect(result.summary.invalid).toBe(1);
    expect(result.summary.canImport).toBe(false);
    expect(result.results[0].valid).toBe(false);
    expect(result.results[0].errors.some(e => e.includes("não encontrado"))).toBe(true);
  });

  it("deve detectar ciclo inexistente", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.importActions.validate({
      rows: [
        {
          cpf: testData.colaboradorCpf,
          cicloNome: "Ciclo Inexistente",
          nomeAcao: "Ação Teste",
          descricaoAcao: "Descrição",
          microcompetenciaNome: testData.microNome,
          prazo: testData.prazoValido,
        },
      ],
    });

    expect(result.summary.canImport).toBe(false);
    expect(result.results[0].errors.some(e => e.includes("Ciclo") && e.includes("não encontrado"))).toBe(true);
  });

  it("deve detectar microcompetência inexistente", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.importActions.validate({
      rows: [
        {
          cpf: testData.colaboradorCpf,
          cicloNome: testData.cicloNome,
          nomeAcao: "Ação Teste",
          descricaoAcao: "Descrição",
          microcompetenciaNome: "Micro Inexistente",
          prazo: testData.prazoValido,
        },
      ],
    });

    expect(result.summary.canImport).toBe(false);
    expect(result.results[0].errors.some(e => e.includes("Microcompetência") && e.includes("não encontrada"))).toBe(true);
  });

  it("deve detectar formato de prazo inválido", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.importActions.validate({
      rows: [
        {
          cpf: testData.colaboradorCpf,
          cicloNome: testData.cicloNome,
          nomeAcao: "Ação Teste",
          descricaoAcao: "Descrição",
          microcompetenciaNome: testData.microNome,
          prazo: "2026-03-31", // Formato errado
        },
      ],
    });

    expect(result.summary.canImport).toBe(false);
    expect(result.results[0].errors.some(e => e.includes("inválido") && e.includes("DD/MM/YYYY"))).toBe(true);
  });

  it("deve validar múltiplas linhas corretamente", async () => {
    const caller = appRouter.createCaller(adminContext);

    const result = await caller.importActions.validate({
      rows: [
        {
          cpf: testData.colaboradorCpf,
          cicloNome: testData.cicloNome,
          nomeAcao: `Ação Teste 1 ${Date.now()}`,
          descricaoAcao: "Descrição 1",
          microcompetenciaNome: testData.microNome,
          prazo: testData.prazoValido,
        },
        {
          cpf: "999.999.999-99", // CPF inválido
          cicloNome: testData.cicloNome,
          nomeAcao: "Ação Teste 2",
          descricaoAcao: "Descrição 2",
          microcompetenciaNome: testData.microNome,
          prazo: testData.prazoValido,
        },
      ],
    });

    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.invalid).toBe(1);
    expect(result.summary.canImport).toBe(false); // Não pode importar se alguma linha tiver erro
  });
});

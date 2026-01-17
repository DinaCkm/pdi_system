import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * TESTES VITEST - PROCEDURES tRPC DE COMPETÊNCIAS
 * 
 * Testa as procedures tRPC:
 * 1. competencias.criarBloco
 * 2. competencias.listBlocos
 * 3. competencias.criarMacro
 * 4. competencias.listMacros
 * 5. competencias.criarMicro
 * 6. competencias.listMicros
 */

describe("Competências - Procedures tRPC", () => {
  let blocoId: number;
  let macroId: number;
  let microId: number;

  // Criar contexto mock com usuário admin
  const adminCtx: TrpcContext = {
    req: {} as any,
    res: {} as any,
    user: {
      id: 1,
      role: "admin" as const,
      openId: "test-admin",
      email: "admin@test.com",
      name: "Admin Test",
      cpf: "00000000000",
      cargo: "Administrador",
      departamentoId: null,
      leaderId: null,
      status: "ativo" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const caller = appRouter.createCaller(adminCtx);

  // ============= TESTES DE BLOCO =============

  describe("Bloco", () => {
    it("deve criar um novo Bloco via tRPC", async () => {
      const result = await caller.competencias.criarBloco({
        nome: "Liderança",
        descricao: "Competências de liderança",
      });

      expect(result).toEqual({ success: true });
    });

    it("deve listar Blocos criados", async () => {
      const blocos = await caller.competencias.listBlocos();

      expect(Array.isArray(blocos)).toBe(true);
      expect(blocos.length).toBeGreaterThan(0);

      // Encontrar o Bloco criado
      const blocoLideranca = blocos.find(b => b.nome === "Liderança");
      expect(blocoLideranca).toBeDefined();
      expect(blocoLideranca?.status).toBe("ativo");
      
      blocoId = blocoLideranca!.id;
    });

    it("deve atualizar um Bloco", async () => {
      const result = await caller.competencias.atualizarBloco({
        id: blocoId,
        nome: "Liderança Estratégica",
        descricao: "Competências de liderança estratégica",
      });

      expect(result).toEqual({ success: true });

      // Verificar atualização
      const blocos = await caller.competencias.listBlocos();
      const blocoAtualizado = blocos.find(b => b.id === blocoId);
      expect(blocoAtualizado?.nome).toBe("Liderança Estratégica");
    });
  });

  // ============= TESTES DE MACRO =============

  describe("Macro", () => {
    it("deve criar uma nova Macro com Bloco pai", async () => {
      const result = await caller.competencias.criarMacro({
        blocoId: blocoId,
        nome: "Comunicação",
        descricao: "Habilidades de comunicação",
      });

      expect(result).toEqual({ success: true });
    });

    it("deve listar Macros de um Bloco", async () => {
      const macros = await caller.competencias.listMacros({
        blocoId: blocoId,
      });

      expect(Array.isArray(macros)).toBe(true);
      expect(macros.length).toBeGreaterThan(0);

      // Encontrar a Macro criada
      const macroComunicacao = macros.find(m => m.nome === "Comunicação");
      expect(macroComunicacao).toBeDefined();
      expect(macroComunicacao?.blocoId).toBe(blocoId);
      
      macroId = macroComunicacao!.id;
    });

    it("deve atualizar uma Macro", async () => {
      const result = await caller.competencias.atualizarMacro({
        id: macroId,
        nome: "Comunicação Assertiva",
        descricao: "Comunicação assertiva e empática",
      });

      expect(result).toEqual({ success: true });

      // Verificar atualização
      const macros = await caller.competencias.listMacros({
        blocoId: blocoId,
      });
      const macroAtualizada = macros.find(m => m.id === macroId);
      expect(macroAtualizada?.nome).toBe("Comunicação Assertiva");
    });
  });

  // ============= TESTES DE MICRO =============

  describe("Micro", () => {
    it("deve criar uma nova Micro com Macro pai", async () => {
      const result = await caller.competencias.criarMicro({
        macroId: macroId,
        nome: "Escuta Ativa",
        descricao: "Técnicas de escuta ativa",
      });

      expect(result).toEqual({ success: true });
    });

    it("deve listar Micros de uma Macro", async () => {
      const micros = await caller.competencias.listMicros({
        macroId: macroId,
      });

      expect(Array.isArray(micros)).toBe(true);
      expect(micros.length).toBeGreaterThan(0);

      // Encontrar a Micro criada
      const microEscuta = micros.find(m => m.nome === "Escuta Ativa");
      expect(microEscuta).toBeDefined();
      expect(microEscuta?.macroId).toBe(macroId);
      
      microId = microEscuta!.id;
    });

    it("deve atualizar uma Micro", async () => {
      const result = await caller.competencias.atualizarMicro({
        id: microId,
        nome: "Escuta Ativa Profunda",
        descricao: "Técnicas avançadas de escuta ativa",
      });

      expect(result).toEqual({ success: true });

      // Verificar atualização
      const micros = await caller.competencias.listMicros({
        macroId: macroId,
      });
      const microAtualizada = micros.find(m => m.id === microId);
      expect(microAtualizada?.nome).toBe("Escuta Ativa Profunda");
    });
  });

  // ============= TESTES DE FLUXO COMPLETO =============

  describe("Fluxo Completo", () => {
    it("deve criar hierarquia completa via tRPC: Bloco -> Macro -> Micro", async () => {
      // 1. Criar Bloco
      const resultBloco = await caller.competencias.criarBloco({
        nome: "Gestão",
        descricao: "Competências de gestão",
      });
      expect(resultBloco).toEqual({ success: true });

      // 2. Listar Blocos e encontrar o novo
      const blocos = await caller.competencias.listBlocos();
      const blocoGestao = blocos.find(b => b.nome === "Gestão");
      expect(blocoGestao).toBeDefined();
      const novoBlockId = blocoGestao!.id;

      // 3. Criar Macro
      const resultMacro = await caller.competencias.criarMacro({
        blocoId: novoBlockId,
        nome: "Planejamento",
        descricao: "Habilidades de planejamento",
      });
      expect(resultMacro).toEqual({ success: true });

      // 4. Listar Macros e encontrar a nova
      const macros = await caller.competencias.listMacros({
        blocoId: novoBlockId,
      });
      const macroPlanejamento = macros.find(m => m.nome === "Planejamento");
      expect(macroPlanejamento).toBeDefined();
      const novoMacroId = macroPlanejamento!.id;

      // 5. Criar Micro
      const resultMicro = await caller.competencias.criarMicro({
        macroId: novoMacroId,
        nome: "Definição de Metas",
        descricao: "Técnicas de definição de metas",
      });
      expect(resultMicro).toEqual({ success: true });

      // 6. Listar Micros e encontrar a nova
      const micros = await caller.competencias.listMicros({
        macroId: novoMacroId,
      });
      const microMetas = micros.find(m => m.nome === "Definição de Metas");
      expect(microMetas).toBeDefined();

      // 7. Verificar hierarquia completa
      expect(blocoGestao?.id).toBe(novoBlockId);
      expect(macroPlanejamento?.blocoId).toBe(novoBlockId);
      expect(microMetas?.macroId).toBe(novoMacroId);
    });
  });
});

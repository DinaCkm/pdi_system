import { describe, it, expect } from "vitest";
import * as db from "./db";

/**
 * TESTE DE LIMPEZA E CRUD
 * 
 * Valida que:
 * 1. Banco está limpo (0 competências)
 * 2. Criar novo Bloco funciona
 * 3. Criar Macro com Bloco funciona
 * 4. Criar Micro com Macro funciona
 * 5. Listar retorna apenas dados criados
 * 6. Atualizar funciona
 * 7. Soft delete funciona
 */

describe("Competências - Teste de Limpeza e CRUD", () => {
  
  describe("Estado Inicial", () => {
    it("banco deve estar vazio (0 blocos)", async () => {
      const blocos = await db.getAllBlocos();
      expect(blocos.length).toBe(0);
    });

    it("banco deve estar vazio (0 macros)", async () => {
      const macros = await db.getAllMacros();
      expect(macros.length).toBe(0);
    });

    it("banco deve estar vazio (0 micros)", async () => {
      const micros = await db.getAllMicros();
      expect(micros.length).toBe(0);
    });
  });

  describe("CRUD Completo", () => {
    let blocoId: number;
    let macroId: number;
    let microId: number;

    it("deve criar um novo Bloco", async () => {
      const result = await db.createBloco({
        nome: "Liderança",
        descricao: "Competências de liderança",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      blocoId = result.id;
    });

    it("deve listar 1 bloco após criar", async () => {
      const blocos = await db.getAllBlocos();
      expect(blocos.length).toBe(1);
      expect(blocos[0].nome).toBe("Liderança");
      expect(blocos[0].status).toBe("ativo");
    });

    it("deve obter bloco por ID", async () => {
      const bloco = await db.getBlocoById(blocoId);
      expect(bloco).toBeDefined();
      expect(bloco?.nome).toBe("Liderança");
    });

    it("deve criar Macro com Bloco pai", async () => {
      const result = await db.createMacro({
        blocoId: blocoId,
        nome: "Comunicação",
        descricao: "Habilidades de comunicação",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      macroId = result.id;
    });

    it("deve listar 1 macro após criar", async () => {
      const macros = await db.getMacrosByBlocoId(blocoId);
      expect(macros.length).toBe(1);
      expect(macros[0].nome).toBe("Comunicação");
      expect(macros[0].blocoId).toBe(blocoId);
    });

    it("deve obter macro por ID", async () => {
      const macro = await db.getMacroById(macroId);
      expect(macro).toBeDefined();
      expect(macro?.nome).toBe("Comunicação");
    });

    it("deve criar Micro com Macro pai", async () => {
      const result = await db.createMicro({
        macroId: macroId,
        nome: "Escuta Ativa",
        descricao: "Técnicas de escuta ativa",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      microId = result.id;
    });

    it("deve listar 1 micro após criar", async () => {
      const micros = await db.getMicrosByMacroId(macroId);
      expect(micros.length).toBe(1);
      expect(micros[0].nome).toBe("Escuta Ativa");
      expect(micros[0].macroId).toBe(macroId);
    });

    it("deve obter micro por ID", async () => {
      const micro = await db.getMicroById(microId);
      expect(micro).toBeDefined();
      expect(micro?.nome).toBe("Escuta Ativa");
    });

    it("deve atualizar Bloco", async () => {
      await db.updateBloco(blocoId, {
        nome: "Liderança Estratégica",
        descricao: "Competências de liderança estratégica",
      });

      const bloco = await db.getBlocoById(blocoId);
      expect(bloco?.nome).toBe("Liderança Estratégica");
    });

    it("deve atualizar Macro", async () => {
      await db.updateMacro(macroId, {
        nome: "Comunicação Assertiva",
      });

      const macro = await db.getMacroById(macroId);
      expect(macro?.nome).toBe("Comunicação Assertiva");
    });

    it("deve atualizar Micro", async () => {
      await db.updateMicro(microId, {
        nome: "Escuta Ativa Profunda",
      });

      const micro = await db.getMicroById(microId);
      expect(micro?.nome).toBe("Escuta Ativa Profunda");
    });

    it("deve fazer soft delete de Micro", async () => {
      await db.deleteMicro(microId);

      const micro = await db.getMicroById(microId);
      expect(micro?.status).toBe("inativo");

      // Não deve aparecer na lista de ativos
      const micros = await db.getMicrosByMacroId(macroId);
      expect(micros.length).toBe(0);
    });

    it("deve fazer soft delete de Macro", async () => {
      await db.deleteMacro(macroId);

      const macro = await db.getMacroById(macroId);
      expect(macro?.status).toBe("inativo");

      // Não deve aparecer na lista de ativos
      const macros = await db.getMacrosByBlocoId(blocoId);
      expect(macros.length).toBe(0);
    });

    it("deve fazer soft delete de Bloco", async () => {
      await db.deleteBloco(blocoId);

      const bloco = await db.getBlocoById(blocoId);
      expect(bloco?.status).toBe("inativo");

      // Não deve aparecer na lista de ativos
      const blocos = await db.getAllBlocos();
      expect(blocos.length).toBe(0);
    });
  });

  describe("Estado Final", () => {
    it("banco deve estar vazio novamente após soft deletes", async () => {
      const blocos = await db.getAllBlocos();
      expect(blocos.length).toBe(0);
    });
  });

  describe("Validações", () => {
    it("deve rejeitar Bloco sem nome", async () => {
      try {
        await db.createBloco({
          nome: "",
          descricao: "Descrição",
        });
        expect.fail("Deveria ter lançado erro");
      } catch (error: any) {
        expect(error.message).toContain("obrigatório");
      }
    });

    it("deve rejeitar Macro sem blocoId", async () => {
      try {
        await db.createMacro({
          blocoId: 0,
          nome: "Macro Teste",
        });
        expect.fail("Deveria ter lançado erro");
      } catch (error: any) {
        expect(error.message).toContain("obrigatório");
      }
    });

    it("deve rejeitar Micro sem macroId", async () => {
      try {
        await db.createMicro({
          macroId: 0,
          nome: "Micro Teste",
        });
        expect.fail("Deveria ter lançado erro");
      } catch (error: any) {
        expect(error.message).toContain("obrigatório");
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import * as db from "./db";

/**
 * TESTE DE HIERARQUIA
 * 
 * Valida que getCompetenciasHierarchy retorna:
 * - Bloco sozinho (sem Macro)
 * - Bloco + Macro (sem Micro)
 * - Bloco + Macro + Micro (completo)
 */

describe("Competências - Hierarquia Completa", () => {
  
  it("deve retornar Bloco sozinho", async () => {
    // Criar Bloco
    const blocoResult = await db.createBloco({
      nome: "Liderança",
      descricao: "Competências de liderança",
    });
    const blocoId = blocoResult.id;

    // Obter hierarquia
    const hierarquia = await db.getCompetenciasHierarchy();

    // Validar
    expect(hierarquia.length).toBe(1);
    expect(hierarquia[0].blocoId).toBe(blocoId);
    expect(hierarquia[0].blocoNome).toBe("Liderança");
    expect(hierarquia[0].macroId).toBeNull();
    expect(hierarquia[0].macroNome).toBeNull();
    expect(hierarquia[0].microId).toBeNull();
    expect(hierarquia[0].microNome).toBeNull();
  });

  it("deve retornar Bloco + Macro", async () => {
    // Criar Bloco
    const blocoResult = await db.createBloco({
      nome: "Comunicação",
      descricao: "Competências de comunicação",
    });
    const blocoId = blocoResult.id;

    // Criar Macro
    const macroResult = await db.createMacro({
      blocoId,
      nome: "Escrita",
      descricao: "Habilidades de escrita",
    });
    const macroId = macroResult.id;

    // Obter hierarquia
    const hierarquia = await db.getCompetenciasHierarchy();

    // Validar
    expect(hierarquia.length).toBe(1);
    expect(hierarquia[0].blocoId).toBe(blocoId);
    expect(hierarquia[0].blocoNome).toBe("Comunicação");
    expect(hierarquia[0].macroId).toBe(macroId);
    expect(hierarquia[0].macroNome).toBe("Escrita");
    expect(hierarquia[0].microId).toBeNull();
    expect(hierarquia[0].microNome).toBeNull();
  });

  it("deve retornar Bloco + Macro + Micro", async () => {
    // Criar Bloco
    const blocoResult = await db.createBloco({
      nome: "Gestão",
      descricao: "Competências de gestão",
    });
    const blocoId = blocoResult.id;

    // Criar Macro
    const macroResult = await db.createMacro({
      blocoId,
      nome: "Planejamento",
      descricao: "Habilidades de planejamento",
    });
    const macroId = macroResult.id;

    // Criar Micro
    const microResult = await db.createMicro({
      macroId,
      nome: "Definição de Metas",
      descricao: "Definir metas claras",
    });
    const microId = microResult.id;

    // Obter hierarquia
    const hierarquia = await db.getCompetenciasHierarchy();

    // Validar
    expect(hierarquia.length).toBe(1);
    expect(hierarquia[0].blocoId).toBe(blocoId);
    expect(hierarquia[0].blocoNome).toBe("Gestão");
    expect(hierarquia[0].macroId).toBe(macroId);
    expect(hierarquia[0].macroNome).toBe("Planejamento");
    expect(hierarquia[0].microId).toBe(microId);
    expect(hierarquia[0].microNome).toBe("Definição de Metas");
  });

  it("deve retornar múltiplas linhas para Bloco com múltiplas Macros e Micros", async () => {
    // Criar Bloco
    const blocoResult = await db.createBloco({
      nome: "Técnico",
      descricao: "Competências técnicas",
    });
    const blocoId = blocoResult.id;

    // Criar Macro 1
    const macro1Result = await db.createMacro({
      blocoId,
      nome: "Programação",
      descricao: "Habilidades de programação",
    });
    const macro1Id = macro1Result.id;

    // Criar Micro 1 para Macro 1
    const micro1Result = await db.createMicro({
      macroId: macro1Id,
      nome: "JavaScript",
      descricao: "Programação em JavaScript",
    });

    // Criar Micro 2 para Macro 1
    const micro2Result = await db.createMicro({
      macroId: macro1Id,
      nome: "Python",
      descricao: "Programação em Python",
    });

    // Criar Macro 2
    const macro2Result = await db.createMacro({
      blocoId,
      nome: "Banco de Dados",
      descricao: "Habilidades de banco de dados",
    });
    const macro2Id = macro2Result.id;

    // Criar Micro 3 para Macro 2
    const micro3Result = await db.createMicro({
      macroId: macro2Id,
      nome: "SQL",
      descricao: "SQL básico",
    });

    // Obter hierarquia
    const hierarquia = await db.getCompetenciasHierarchy();

    // Validar
    expect(hierarquia.length).toBe(3);

    // Linha 1: Bloco + Macro 1 + Micro 1
    expect(hierarquia[0].blocoNome).toBe("Técnico");
    expect(hierarquia[0].macroNome).toBe("Programação");
    expect(hierarquia[0].microNome).toBe("JavaScript");

    // Linha 2: Bloco + Macro 1 + Micro 2
    expect(hierarquia[1].blocoNome).toBe("Técnico");
    expect(hierarquia[1].macroNome).toBe("Programação");
    expect(hierarquia[1].microNome).toBe("Python");

    // Linha 3: Bloco + Macro 2 + Micro 3
    expect(hierarquia[2].blocoNome).toBe("Técnico");
    expect(hierarquia[2].macroNome).toBe("Banco de Dados");
    expect(hierarquia[2].microNome).toBe("SQL");
  });

  it("deve filtrar por blocoNome", async () => {
    // Criar Bloco 1
    await db.createBloco({
      nome: "Liderança",
      descricao: "Competências de liderança",
    });

    // Criar Bloco 2
    const bloco2Result = await db.createBloco({
      nome: "Comunicação",
      descricao: "Competências de comunicação",
    });
    const bloco2Id = bloco2Result.id;

    // Criar Macro para Bloco 2
    const macro2Result = await db.createMacro({
      blocoId: bloco2Id,
      nome: "Escrita",
      descricao: "Habilidades de escrita",
    });

    // Obter hierarquia filtrada
    const hierarquia = await db.getCompetenciasHierarchy({
      blocoNome: "Comunicação",
    });

    // Validar
    expect(hierarquia.length).toBe(1);
    expect(hierarquia[0].blocoNome).toBe("Comunicação");
    expect(hierarquia[0].macroNome).toBe("Escrita");
  });

  it("deve retornar vazio quando filtro não encontra resultados", async () => {
    // Criar Bloco
    await db.createBloco({
      nome: "Liderança",
      descricao: "Competências de liderança",
    });

    // Obter hierarquia com filtro que não existe
    const hierarquia = await db.getCompetenciasHierarchy({
      blocoNome: "Inexistente",
    });

    // Validar
    expect(hierarquia.length).toBe(0);
  });
});

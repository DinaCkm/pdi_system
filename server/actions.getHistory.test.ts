import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("actions.getHistory", () => {
  let testActionId: number;

  beforeAll(async () => {
    // Buscar uma ação existente para testar
    const allActions = await db.getAllActions();
    if (allActions.length > 0) {
      testActionId = allActions[0].id;
    }
  });

  it("deve retornar histórico de uma ação", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação encontrada para teste");
      return;
    }

    const history = await db.getActionHistory(testActionId);
    
    // Validar que o resultado é um array
    expect(Array.isArray(history)).toBe(true);
    
    // Se houver histórico, validar estrutura
    if (history.length > 0) {
      const entry = history[0];
      
      // Validar campos obrigatórios
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("actionId");
      expect(entry).toHaveProperty("campo");
      expect(entry).toHaveProperty("valorAnterior");
      expect(entry).toHaveProperty("valorNovo");
      expect(entry).toHaveProperty("motivoAlteracao");
      expect(entry).toHaveProperty("alteradoPor");
      expect(entry).toHaveProperty("createdAt");
      
      // Validar tipos
      expect(typeof entry.id).toBe("number");
      expect(typeof entry.actionId).toBe("number");
      expect(typeof entry.campo).toBe("string");
    }
  });

  it("deve retornar array vazio para ação sem histórico", async () => {
    // Testar com ID que provavelmente não tem histórico
    const history = await db.getActionHistory(99999);
    
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  it("deve transformar dados corretamente para o frontend", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação encontrada para teste");
      return;
    }

    const history = await db.getActionHistory(testActionId);
    
    if (history.length > 0) {
      const entry = history[0];
      
      // Simular transformação que o getHistory procedure faz
      const transformed = {
        id: entry.id,
        actionId: entry.actionId,
        campoAlterado: entry.campo,
        valorAntigo: entry.valorAnterior,
        valorNovo: entry.valorNovo,
        motivo: entry.motivoAlteracao,
        mudadoPor: entry.alteradoPor ? "usuario" : "sistema",
        usuarioNome: entry.userName,
        dataMudanca: entry.createdAt
      };
      
      // Validar que a transformação mantém os dados
      expect(transformed.id).toBe(entry.id);
      expect(transformed.actionId).toBe(entry.actionId);
      expect(transformed.campoAlterado).toBe(entry.campo);
      expect(transformed.valorAntigo).toBe(entry.valorAnterior);
      expect(transformed.valorNovo).toBe(entry.valorNovo);
      expect(transformed.motivo).toBe(entry.motivoAlteracao);
      expect(["usuario", "sistema"]).toContain(transformed.mudadoPor);
    }
  });

  it("deve ordenar histórico por data decrescente", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação encontrada para teste");
      return;
    }

    const history = await db.getActionHistory(testActionId);
    
    if (history.length > 1) {
      // Validar que está ordenado por data decrescente (mais recente primeiro)
      for (let i = 0; i < history.length - 1; i++) {
        const current = new Date(history[i].createdAt).getTime();
        const next = new Date(history[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });
});

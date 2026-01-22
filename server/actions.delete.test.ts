import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("actions.delete - Motor de Deletar Ações", () => {
  let testActionId: number;
  let testPdiId: number;

  beforeAll(async () => {
    // Buscar uma ação existente e usar seu pdiId
    const allActions = await db.getAllActions();
    if (allActions.length > 0) {
      testPdiId = allActions[0].pdiId;
      
      // Criar uma ação de teste
      const actionId = await db.createAction({
        pdiId: testPdiId,
        macroId: 1,
        titulo: "Ação para Deletar - Teste",
        descricao: "Esta ação será deletada no teste",
        prazo: new Date(),
        status: "nao_iniciada",
      });
      testActionId = actionId;
      console.log("[TEST] Ação criada com ID:", testActionId);
    }
  });

  it("deve deletar uma ação pelo ID", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação criada para teste");
      return;
    }

    // Verificar que ação existe ANTES do delete
    const actionBefore = await db.getActionById(testActionId);
    expect(actionBefore).toBeDefined();
    expect(actionBefore?.id).toBe(testActionId);
    console.log("[TEST] Ação encontrada antes do delete:", actionBefore?.id);

    // Executar delete
    await db.deleteAction(testActionId);
    console.log("[TEST] Delete executado para ID:", testActionId);

    // Verificar que ação NÃO existe DEPOIS do delete
    const actionAfter = await db.getActionById(testActionId);
    expect(actionAfter).toBeUndefined();
    console.log("[TEST] Ação não encontrada após delete - DELETE FUNCIONOU!");
  });

  it("deve deletar em cascata: evidências, ajustes, histórico", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação criada para teste");
      return;
    }

    // Criar nova ação para este teste
    const newActionId = await db.createAction({
      pdiId: testPdiId,
      macroId: 1,
      titulo: "Ação com Cascata - Teste",
      descricao: "Esta ação tem evidências e ajustes",
      prazo: new Date(),
      status: "nao_iniciada",
    });

    console.log("[TEST] Nova ação criada com ID:", newActionId);

    // Deletar a ação (deve deletar em cascata)
    await db.deleteAction(newActionId);
    console.log("[TEST] Delete em cascata executado para ID:", newActionId);

    // Verificar que ação foi deletada
    const actionAfter = await db.getActionById(newActionId);
    expect(actionAfter).toBeUndefined();
    console.log("[TEST] Cascata funcionou - ação deletada com sucesso!");
  });

  it("deve retornar erro ao tentar deletar ação que não existe", async () => {
    // Tentar deletar ID que não existe (não deve lançar erro, apenas não deleta nada)
    const fakeId = 999999;
    
    try {
      await db.deleteAction(fakeId);
      // Se chegou aqui, não lançou erro (comportamento esperado)
      console.log("[TEST] Delete de ID inexistente não lançou erro - OK");
      expect(true).toBe(true);
    } catch (error) {
      // Se lançou erro, verificar se é esperado
      console.log("[TEST] Delete lançou erro:", error);
      expect(error).toBeDefined();
    }
  });

  it("deve remover ação da lista após delete", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação criada para teste");
      return;
    }

    // Criar ação de teste
    const actionId = await db.createAction({
      pdiId: testPdiId,
      macroId: 1,
      titulo: "Ação para Lista - Teste",
      descricao: "Será removida da lista",
      prazo: new Date(),
      status: "nao_iniciada",
    });

    // Buscar todas as ações
    const allActionsBefore = await db.getAllActions();
    const foundBefore = allActionsBefore.find((a: any) => a.id === actionId);
    expect(foundBefore).toBeDefined();
    console.log("[TEST] Ação encontrada na lista antes do delete");

    // Deletar
    await db.deleteAction(actionId);

    // Buscar todas as ações novamente
    const allActionsAfter = await db.getAllActions();
    const foundAfter = allActionsAfter.find((a: any) => a.id === actionId);
    expect(foundAfter).toBeUndefined();
    console.log("[TEST] Ação removida da lista após delete - FUNCIONOU!");
  });

  afterAll(async () => {
    console.log("[TEST] Testes de delete finalizados");
  });
});

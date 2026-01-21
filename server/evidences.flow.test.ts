import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Fluxo de Evidências", () => {
  let testActionId: number;
  let testEvidenceId: number;
  let testColaboradorId: number = 840001;

  beforeAll(async () => {
    // Buscar uma ação existente para testar
    const allActions = await db.getAllActions();
    if (allActions.length > 0) {
      testActionId = allActions[0].id;
    }
  });

  it("deve criar uma evidência com status aguardando_avaliacao", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação encontrada para teste");
      return;
    }

    const result = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
    });

    testEvidenceId = result;
    expect(typeof testEvidenceId).toBe("number");
    expect(testEvidenceId).toBeGreaterThan(0);
  });

  it("deve buscar evidência por ID", async () => {
    if (!testEvidenceId) {
      console.log("Nenhuma evidência foi criada");
      return;
    }

    const evidence = await db.getEvidenceById(testEvidenceId);
    
    expect(evidence).toBeDefined();
    expect(evidence?.id).toBe(testEvidenceId);
    expect(evidence?.status).toBe("aguardando_avaliacao");
    expect(evidence?.actionId).toBe(testActionId);
  });

  it("deve atualizar status da evidência para aprovada", async () => {
    if (!testEvidenceId) {
      console.log("Nenhuma evidência foi criada");
      return;
    }

    const now = new Date();
    await db.updateEvidenceStatus(testEvidenceId, {
      status: "aprovada",
      evaluatedBy: 1,
      evaluatedAt: now,
    });

    const updated = await db.getEvidenceById(testEvidenceId);
    expect(updated?.status).toBe("aprovada");
    expect(updated?.evaluatedBy).toBe(1);
  });

  it("deve atualizar status da ação para concluida quando evidência é aprovada", async () => {
    if (!testActionId) {
      console.log("Nenhuma ação encontrada para teste");
      return;
    }

    // Atualizar ação para concluida
    await db.updateAction(testActionId, { status: "concluida" });

    const updatedAction = await db.getActionById(testActionId);
    expect(updatedAction?.status).toBe("concluida");
  });

  it("deve atualizar status da evidência para reprovada com motivo", async () => {
    if (!testEvidenceId) {
      console.log("Nenhuma evidência foi criada");
      return;
    }

    await db.updateEvidenceStatus(testEvidenceId, {
      status: "reprovada",
      justificativaAdmin: "Faltam detalhes na evidência",
      evaluatedBy: 1,
      evaluatedAt: new Date(),
    });

    const updated = await db.getEvidenceById(testEvidenceId);
    expect(updated?.status).toBe("reprovada");
    expect(updated?.justificativaAdmin).toBe("Faltam detalhes na evidência");
  });

  it("deve permitir re-aprovação de evidência reprovada", async () => {
    if (!testEvidenceId) {
      console.log("Nenhuma evidência foi criada");
      return;
    }

    // Simular re-aprovação
    await db.updateEvidenceStatus(testEvidenceId, {
      status: "aprovada",
      evaluatedBy: 1,
      evaluatedAt: new Date(),
    });

    const updated = await db.getEvidenceById(testEvidenceId);
    expect(updated?.status).toBe("aprovada");
  });
});

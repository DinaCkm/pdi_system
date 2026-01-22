import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("evidences.create - Motor de Envio de Evidências", () => {
  let testActionId: number;
  let testColaboradorId: number;

  beforeAll(async () => {
    // Criar uma ação de teste
    const pdiId = 1;
    const macroId = 1;
    const actionResult = await db.createAction({
      pdiId,
      macroId,
      titulo: "Ação Teste para Evidência",
      descricao: "Descrição teste",
      prazo: new Date().toISOString(),
      status: "em_progresso",
    });
    testActionId = actionResult;

    // Usar um colaborador existente
    testColaboradorId = 1;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testActionId) {
      try {
        await db.deleteAction(testActionId);
      } catch (e) {
        console.log("Erro ao limpar ação de teste:", e);
      }
    }
  });

  it("deve criar evidência com actionId e colaboradorId corretos", async () => {
    const evidence = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência de teste",
      arquivo: "teste.pdf",
    });

    expect(evidence).toBeGreaterThan(0);
    console.log(`✅ Evidência criada com ID: ${evidence}`);
  });

  it("deve gravar descricao no banco de dados", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Descrição detalhada da evidência",
      arquivo: "teste2.pdf",
    });

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.descricao).toBe("Descrição detalhada da evidência");
    console.log(`✅ Descrição gravada corretamente: ${retrieved?.descricao}`);
  });

  it("deve gravar arquivo (file name) no banco de dados", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência com arquivo",
      arquivo: "certificado-conclusao.pdf",
    });

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.arquivo).toBe("certificado-conclusao.pdf");
    console.log(`✅ Arquivo gravado corretamente: ${retrieved?.arquivo}`);
  });

  it("deve definir status como 'aguardando_avaliacao' ao criar", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência para avaliação",
      arquivo: "teste3.pdf",
    });

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.status).toBe("aguardando_avaliacao");
    console.log(`✅ Status correto: ${retrieved?.status}`);
  });

  it("deve recuperar evidência por actionId", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência para busca",
      arquivo: "teste4.pdf",
    });

    const evidencesByAction = await db.getEvidencesByActionId(testActionId);
    const found = evidencesByAction.find((e: any) => e.id === evidenceId);
    expect(found).toBeDefined();
    expect(found?.actionId).toBe(testActionId);
    console.log(`✅ Evidência recuperada por actionId: ${found?.id}`);
  });
});

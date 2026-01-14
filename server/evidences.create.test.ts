import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("evidences.create", () => {
  let testUserId: number;
  let testPDIId: number;
  let testActionId: number;

  beforeAll(async () => {
    // Criar um usuário de teste
    const user = await db.db.insert(schema.users).values({
      email: "test-evidence@example.com",
      cpf: "12345678901",
      name: "Test Evidence User",
      role: "colaborador",
      cargo: "Desenvolvedor",
      password: "hashed_password",
    }).returning();
    testUserId = user[0].id;

    // Criar um PDI de teste
    const pdi = await db.db.insert(schema.pdis).values({
      colaboradorId: testUserId,
      ciclo: "2024",
      status: "em_progresso",
      dataInicio: new Date(),
      dataFim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }).returning();
    testPDIId = pdi[0].id;

    // Criar uma ação de teste
    const action = await db.db.insert(schema.acoes).values({
      pdiId: testPDIId,
      nome: "Test Action for Evidence",
      descricao: "Test action description",
      prazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "em_progresso",
    }).returning();
    testActionId = action[0].id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await db.db.delete(schema.evidences).where(eq(schema.evidences.colaboradorId, testUserId));
    await db.db.delete(schema.acoes).where(eq(schema.acoes.pdiId, testPDIId));
    await db.db.delete(schema.pdis).where(eq(schema.pdis.id, testPDIId));
    await db.db.delete(schema.users).where(eq(schema.users.id, testUserId));
  });

  it("should create evidence with files", async () => {
    // Criar uma evidência com arquivo
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testUserId,
    });

    expect(evidenceId).toBeDefined();
    expect(typeof evidenceId).toBe("number");

    // Adicionar um arquivo à evidência
    await db.addEvidenceFile({
      evidenceId,
      fileName: "test-document.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileUrl: "https://example.com/test-document.pdf",
      fileKey: "evidencias/test-document.pdf",
    });

    // Verificar se a evidência foi criada
    const evidence = await db.getEvidenceById(evidenceId);
    expect(evidence).toBeDefined();
    expect(evidence?.actionId).toBe(testActionId);
    expect(evidence?.colaboradorId).toBe(testUserId);
    expect(evidence?.status).toBe("aguardando_avaliacao");
  });

  it("should create evidence with text", async () => {
    // Criar uma evidência com texto
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testUserId,
    });

    expect(evidenceId).toBeDefined();

    // Adicionar um texto à evidência
    await db.addEvidenceText({
      evidenceId,
      titulo: "Test Evidence Title",
      texto: "This is a test evidence description",
    });

    // Verificar se a evidência foi criada
    const evidence = await db.getEvidenceById(evidenceId);
    expect(evidence).toBeDefined();
    expect(evidence?.actionId).toBe(testActionId);
  });

  it("should create evidence with both files and text", async () => {
    // Criar uma evidência com arquivo e texto
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testUserId,
    });

    expect(evidenceId).toBeDefined();

    // Adicionar arquivo
    await db.addEvidenceFile({
      evidenceId,
      fileName: "test-document.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileUrl: "https://example.com/test-document.pdf",
      fileKey: "evidencias/test-document.pdf",
    });

    // Adicionar texto
    await db.addEvidenceText({
      evidenceId,
      titulo: "Test Evidence Title",
      texto: "This is a test evidence description",
    });

    // Verificar se a evidência foi criada
    const evidence = await db.getEvidenceById(evidenceId);
    expect(evidence).toBeDefined();
    expect(evidence?.actionId).toBe(testActionId);
  });

  it("should update action status to evidencia_enviada", async () => {
    // Criar uma evidência
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testUserId,
    });

    // Atualizar status da ação
    await db.updateAction(testActionId, { status: "evidencia_enviada" });

    // Verificar se o status foi atualizado
    const action = await db.getActionById(testActionId);
    expect(action?.status).toBe("evidencia_enviada");
  });
});

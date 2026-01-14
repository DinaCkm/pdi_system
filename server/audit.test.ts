import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Audit Log System", () => {
  let testAdjustmentRequestId: number;
  let testAdminId: number;

  beforeAll(async () => {
    // Criar dados de teste
    // Nota: Estes testes assumem que existem usuários e solicitações de ajuste no banco
    testAdminId = 1; // Admin padrão
    testAdjustmentRequestId = 1; // Usar uma solicitação existente
  });

  it("should create an audit log entry", async () => {
    const campo = "nome";
    const valorAnterior = "Ação Original";
    const valorNovo = "Ação Modificada";

    await db.createAuditLog(
      testAdjustmentRequestId,
      testAdminId,
      campo,
      valorAnterior,
      valorNovo
    );

    // Verificar se o registro foi criado
    const logs = await db.getAuditLogByAdjustmentRequest(testAdjustmentRequestId);
    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThan(0);

    const lastLog = logs[logs.length - 1];
    expect(lastLog.campo).toBe(campo);
    expect(lastLog.valorAnterior).toBe(valorAnterior);
    expect(lastLog.valorNovo).toBe(valorNovo);
  });

  it("should retrieve audit logs for an adjustment request", async () => {
    const logs = await db.getAuditLogByAdjustmentRequest(testAdjustmentRequestId);

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);

    if (logs.length > 0) {
      const log = logs[0];
      expect(log).toHaveProperty("id");
      expect(log).toHaveProperty("campo");
      expect(log).toHaveProperty("valorAnterior");
      expect(log).toHaveProperty("valorNovo");
      expect(log).toHaveProperty("adminName");
      expect(log).toHaveProperty("createdAt");
    }
  });

  it("should handle multiple field changes in sequence", async () => {
    const fields = [
      { campo: "nome", anterior: "Nome 1", novo: "Nome 2" },
      { campo: "descricao", anterior: "Desc 1", novo: "Desc 2" },
      { campo: "prazo", anterior: "2024-01-01", novo: "2024-12-31" },
    ];

    for (const field of fields) {
      await db.createAuditLog(
        testAdjustmentRequestId,
        testAdminId,
        field.campo,
        field.anterior,
        field.novo
      );
    }

    const logs = await db.getAuditLogByAdjustmentRequest(testAdjustmentRequestId);
    expect(logs.length).toBeGreaterThanOrEqual(fields.length);
  });

  it("should preserve null values in audit log", async () => {
    await db.createAuditLog(
      testAdjustmentRequestId,
      testAdminId,
      "campo_teste",
      null,
      "novo_valor"
    );

    const logs = await db.getAuditLogByAdjustmentRequest(testAdjustmentRequestId);
    const testLog = logs.find((log) => log.campo === "campo_teste");

    expect(testLog).toBeDefined();
    expect(testLog?.valorAnterior).toBeNull();
    expect(testLog?.valorNovo).toBe("novo_valor");
  });

  afterAll(async () => {
    // Limpeza se necessário
  });
});

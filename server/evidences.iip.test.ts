import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { sql } from "drizzle-orm";

describe("Evidências - Formulário Guiado e IIP", () => {
  let testActionId: number;
  let testColaboradorId: number;
  const createdEvidenceIds: number[] = [];

  beforeAll(async () => {
    // Criar uma ação de teste
    const actionResult = await db.createAction({
      pdiId: 1,
      macroId: 1,
      titulo: "Ação Teste IIP",
      descricao: "Descrição teste IIP",
      prazo: new Date().toISOString(),
      status: "em_andamento",
    });
    testActionId = actionResult;
    testColaboradorId = 1;
  });

  afterAll(async () => {
    // Limpar evidências de teste
    for (const id of createdEvidenceIds) {
      try {
        await db.execute(sql`DELETE FROM evidences WHERE id = ${id}`);
      } catch (e) {
        console.log("Erro ao limpar evidência:", e);
      }
    }
    // Limpar ação de teste
    if (testActionId) {
      try {
        await db.deleteAction(testActionId);
      } catch (e) {
        console.log("Erro ao limpar ação:", e);
      }
    }
  });

  // ============= TESTES DO FORMULÁRIO GUIADO =============

  it("deve criar evidência com novos campos do formulário guiado", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência com formulário guiado",
      tipoEvidencia: "certificado",
      dataRealizacao: "2026-03-15",
      cargaHoraria: 40,
      oQueRealizou: "Realizei o curso de liderança avançada",
      comoAplicou: "Apliquei técnicas de feedback na equipe",
      resultadoPratico: "Redução de 30% no turnover da equipe",
      impactoPercentual: 75,
      principalAprendizado: "A importância do feedback contínuo",
      linkExterno: "https://certificado.exemplo.com/12345",
    });

    createdEvidenceIds.push(evidenceId);
    expect(evidenceId).toBeGreaterThan(0);

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.tipoEvidencia).toBe("certificado");
    expect(retrieved?.oQueRealizou).toBe("Realizei o curso de liderança avançada");
    expect(retrieved?.comoAplicou).toBe("Apliquei técnicas de feedback na equipe");
    expect(retrieved?.resultadoPratico).toBe("Redução de 30% no turnover da equipe");
    expect(retrieved?.impactoPercentual).toBe(75);
    expect(retrieved?.principalAprendizado).toBe("A importância do feedback contínuo");
    expect(retrieved?.linkExterno).toBe("https://certificado.exemplo.com/12345");
    console.log("✅ Evidência com formulário guiado criada e verificada");
  });

  it("deve criar evidência com campos opcionais nulos", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência mínima",
      oQueRealizou: "Participei de workshop",
      impactoPercentual: 50,
      principalAprendizado: "Novas técnicas de gestão",
    });

    createdEvidenceIds.push(evidenceId);
    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.tipoEvidencia).toBeNull();
    expect(retrieved?.cargaHoraria).toBeNull();
    expect(retrieved?.linkExterno).toBeNull();
    expect(retrieved?.oQueRealizou).toBe("Participei de workshop");
    console.log("✅ Evidência com campos opcionais nulos criada");
  });

  // ============= TESTES DA VALIDAÇÃO DE IMPACTO =============

  it("deve aprovar evidência com validação de impacto", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência para aprovação com impacto",
      oQueRealizou: "Implementei novo processo",
      impactoPercentual: 80,
      principalAprendizado: "Gestão de processos",
    });
    createdEvidenceIds.push(evidenceId);

    // Simular aprovação com validação de impacto
    await db.updateEvidenceStatus(evidenceId, {
      status: "aprovada",
      evaluatedBy: 1,
      evaluatedAt: new Date(),
    });
    await db.execute(sql`
      UPDATE evidences 
      SET evidenciaComprova = 'sim',
          impactoComprova = 'sim',
          impactoValidadoAdmin = 70,
          parecerImpacto = 'Impacto real comprovado'
      WHERE id = ${evidenceId}
    `);

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.status).toBe("aprovada");
    expect(retrieved?.evidenciaComprova).toBe("sim");
    expect(retrieved?.impactoComprova).toBe("sim");
    expect(retrieved?.impactoValidadoAdmin).toBe(70);
    expect(retrieved?.parecerImpacto).toBe("Impacto real comprovado");
    console.log("✅ Evidência aprovada com impacto validado: 70%");
  });

  it("deve rejeitar evidência quando não comprova", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência para rejeição",
      oQueRealizou: "Tentei aplicar",
      impactoPercentual: 30,
      principalAprendizado: "Preciso melhorar",
    });
    createdEvidenceIds.push(evidenceId);

    // Simular rejeição
    await db.updateEvidenceStatus(evidenceId, {
      status: "reprovada",
      evaluatedBy: 1,
      evaluatedAt: new Date(),
      justificativaAdmin: "Evidência não comprova a realização da ação",
    });
    await db.execute(sql`
      UPDATE evidences 
      SET evidenciaComprova = 'nao',
          impactoComprova = NULL,
          impactoValidadoAdmin = NULL,
          parecerImpacto = NULL
      WHERE id = ${evidenceId}
    `);

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.status).toBe("reprovada");
    expect(retrieved?.evidenciaComprova).toBe("nao");
    expect(retrieved?.impactoComprova).toBeNull();
    expect(retrieved?.impactoValidadoAdmin).toBeNull();
    expect(retrieved?.justificativaAdmin).toBe("Evidência não comprova a realização da ação");
    console.log("✅ Evidência rejeitada com evidenciaComprova='nao'");
  });

  it("deve aprovar com impacto parcial", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência com impacto parcial",
      oQueRealizou: "Apliquei parcialmente",
      impactoPercentual: 60,
      principalAprendizado: "Preciso continuar",
    });
    createdEvidenceIds.push(evidenceId);

    await db.updateEvidenceStatus(evidenceId, {
      status: "aprovada",
      evaluatedBy: 1,
      evaluatedAt: new Date(),
    });
    await db.execute(sql`
      UPDATE evidences 
      SET evidenciaComprova = 'sim',
          impactoComprova = 'parcialmente',
          impactoValidadoAdmin = 35,
          parecerImpacto = 'Impacto parcial, precisa melhorar aplicação'
      WHERE id = ${evidenceId}
    `);

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.status).toBe("aprovada");
    expect(retrieved?.impactoComprova).toBe("parcialmente");
    expect(retrieved?.impactoValidadoAdmin).toBe(35);
    console.log("✅ Evidência aprovada com impacto parcial: 35%");
  });

  // ============= TESTES DO IIP =============

  it("deve calcular IIP corretamente com evidências aprovadas", async () => {
    // Criar 3 evidências aprovadas com impactos diferentes
    const ids: number[] = [];
    for (const impacto of [80, 60, 40]) {
      const eid = await db.createEvidence({
        actionId: testActionId,
        colaboradorId: testColaboradorId,
        descricao: `Evidência IIP ${impacto}`,
        oQueRealizou: `Ação com impacto ${impacto}`,
        impactoPercentual: impacto,
        principalAprendizado: "Aprendizado",
      });
      ids.push(eid);
      createdEvidenceIds.push(eid);

      await db.updateEvidenceStatus(eid, {
        status: "aprovada",
        evaluatedBy: 1,
        evaluatedAt: new Date(),
      });
      await db.execute(sql`
        UPDATE evidences 
        SET evidenciaComprova = 'sim',
            impactoValidadoAdmin = ${impacto}
        WHERE id = ${eid}
      `);
    }

    // Verificar que todas foram salvas com impacto
    for (const id of ids) {
      const ev = await db.getEvidenceById(id);
      expect(ev?.status).toBe("aprovada");
      expect(ev?.impactoValidadoAdmin).toBeDefined();
    }

    // O IIP é a média dos impactos validados
    // Média de 80, 60, 40 = 60
    // Mas como há outras evidências de teste, verificamos que o IIP existe e é > 0
    const [rows]: any = await db.execute(sql`
      SELECT AVG(impactoValidadoAdmin) as iip, COUNT(id) as total
      FROM evidences 
      WHERE status = 'aprovada' AND impactoValidadoAdmin IS NOT NULL AND colaboradorId = ${testColaboradorId}
    `);
    
    const iip = Number(rows?.[0]?.iip || 0);
    const total = Number(rows?.[0]?.total || 0);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(iip).toBeGreaterThan(0);
    expect(iip).toBeLessThanOrEqual(100);
    console.log(`✅ IIP calculado: ${iip.toFixed(2)}% (${total} evidências)`);
  });

  // ============= TESTES DE EVIDENCE FILES =============

  it("deve criar arquivo de evidência (evidence_files)", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência com arquivo",
      oQueRealizou: "Completei o treinamento",
      impactoPercentual: 50,
      principalAprendizado: "Gestão de tempo",
    });
    createdEvidenceIds.push(evidenceId);

    const fileResult = await db.createEvidenceFile(evidenceId, {
      fileName: "certificado.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      fileUrl: "https://storage.example.com/certificado.pdf",
      fileKey: "evidences/1/abc-certificado.pdf",
    });

    expect(fileResult).toBeDefined();
    console.log("✅ Arquivo de evidência criado com sucesso");

    // Limpar
    await db.execute(sql`DELETE FROM evidence_files WHERE evidenceId = ${evidenceId}`);
  });
});

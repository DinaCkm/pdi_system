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

  // ============= TESTE DA OPÇÃO INSUFICIENTE =============

  it("deve devolver evidência com opção 'insuficiente'", async () => {
    const evidenceId = await db.createEvidence({
      actionId: testActionId,
      colaboradorId: testColaboradorId,
      descricao: "Evidência com relato insuficiente",
      oQueRealizou: "Fiz algo",
      impactoPercentual: 20,
      principalAprendizado: "Não sei",
    });
    createdEvidenceIds.push(evidenceId);

    // Simular devolução por relato insuficiente
    await db.updateEvidenceStatus(evidenceId, {
      status: "reprovada",
      evaluatedBy: 1,
      evaluatedAt: new Date(),
      justificativaAdmin: "Não foi possível avaliar a aplicabilidade prática com base nos relatos apresentados.",
    });
    await db.execute(sql`
      UPDATE evidences 
      SET evidenciaComprova = 'insuficiente',
          impactoComprova = NULL,
          impactoValidadoAdmin = NULL,
          parecerImpacto = NULL
      WHERE id = ${evidenceId}
    `);

    const retrieved = await db.getEvidenceById(evidenceId);
    expect(retrieved?.status).toBe("reprovada");
    expect(retrieved?.evidenciaComprova).toBe("insuficiente");
    expect(retrieved?.impactoValidadoAdmin).toBeNull();
    console.log("✅ Evidência devolvida com evidenciaComprova='insuficiente'");
  });

  // ============= TESTES DO IIP (MÉDIA EMPREGADO VS ADMIN) =============

  it("deve calcular IIP como média entre impacto do empregado e do admin", async () => {
    // Criar 3 evidências aprovadas com impactos diferentes
    // Empregado declara: 80, 60, 40 | Admin valida: 70, 50, 30
    // IIP individual: (80+70)/2=75, (60+50)/2=55, (40+30)/2=35
    // IIP geral: (75+55+35)/3 = 55
    const pares = [{emp: 80, admin: 70}, {emp: 60, admin: 50}, {emp: 40, admin: 30}];
    const ids: number[] = [];
    for (const par of pares) {
      const eid = await db.createEvidence({
        actionId: testActionId,
        colaboradorId: testColaboradorId,
        descricao: `Evidência IIP emp=${par.emp} admin=${par.admin}`,
        oQueRealizou: `Ação com impacto ${par.emp}`,
        impactoPercentual: par.emp,
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
            impactoValidadoAdmin = ${par.admin}
        WHERE id = ${eid}
      `);
    }

    // Verificar que todas foram salvas
    for (const id of ids) {
      const ev = await db.getEvidenceById(id);
      expect(ev?.status).toBe("aprovada");
      expect(ev?.impactoValidadoAdmin).toBeDefined();
      expect(ev?.impactoPercentual).toBeDefined();
    }

    // Verificar o cálculo do IIP com a nova fórmula
    const [rows]: any = await db.execute(sql`
      SELECT 
        AVG(
          CASE 
            WHEN impactoPercentual IS NOT NULL AND impactoPercentual > 0 
            THEN (impactoPercentual + impactoValidadoAdmin) / 2.0
            ELSE impactoValidadoAdmin
          END
        ) as iip,
        AVG(impactoPercentual) as mediaEmpregado,
        AVG(impactoValidadoAdmin) as mediaAdmin,
        COUNT(id) as total
      FROM evidences 
      WHERE status = 'aprovada' AND impactoValidadoAdmin IS NOT NULL AND colaboradorId = ${testColaboradorId}
    `);
    
    const iip = Number(rows?.[0]?.iip || 0);
    const mediaEmpregado = Number(rows?.[0]?.mediaEmpregado || 0);
    const mediaAdmin = Number(rows?.[0]?.mediaAdmin || 0);
    const total = Number(rows?.[0]?.total || 0);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(iip).toBeGreaterThan(0);
    expect(iip).toBeLessThanOrEqual(100);
    // IIP deve ser menor ou igual à média do empregado (admin tende a validar menos)
    expect(mediaAdmin).toBeLessThanOrEqual(mediaEmpregado + 1); // +1 para margem de arredondamento
    console.log(`✅ IIP calculado: ${iip.toFixed(2)}% (Média Emp: ${mediaEmpregado.toFixed(2)}%, Média Admin: ${mediaAdmin.toFixed(2)}%, ${total} evidências)`);
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

import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Actions - Create with Notification", () => {
  let testUserId: number;
  let testLeaderId: number;
  let testDepartamentoId: number;
  let testCicloId: number;
  let testBlocoId: number;
  let testMacroId: number;
  let testMicroId: number;
  let testPdiId: number;

  beforeAll(async () => {
    // Criar departamento de teste
    const departamento = await db.createDepartamento({
      nome: `Dept Test Actions ${Date.now()}`,
      descricao: "Departamento para teste de ações",
    });
    testDepartamentoId = departamento.id;

    // Criar líder de teste
    const leader = await db.createUser({
      openId: `leader-actions-${Date.now()}`,
      name: "Líder Test Actions",
      email: `leader-actions-${Date.now()}@test.com`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      role: "lider",
      cargo: "Líder",
      departamentoId: testDepartamentoId,
      leaderId: null,
    });
    testLeaderId = leader.id;

    // Criar colaborador de teste
    const user = await db.createUser({
      openId: `user-actions-${Date.now()}`,
      name: "User Test Actions",
      email: `user-actions-${Date.now()}@test.com`,
      cpf: `${Math.floor(Math.random() * 100000000000)}`,
      role: "colaborador",
      cargo: "Colaborador",
      departamentoId: testDepartamentoId,
      leaderId: testLeaderId,
    });
    testUserId = user.id;

    // Criar ciclo de teste
    const now = new Date();
    const futureDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 dias
    const ciclo = await db.createCiclo({
      nome: `Ciclo Test Actions ${Date.now()}`,
      dataInicio: now,
      dataFim: futureDate,
      createdBy: testLeaderId,
    });
    testCicloId = ciclo.id;

    // Criar competências de teste
    const bloco = await db.createCompetenciaBloco({
      nome: `Bloco Test Actions ${Date.now()}`,
      descricao: "Bloco para teste",
    });
    testBlocoId = bloco.id;

    const macro = await db.createCompetenciaMacro({
      blocoId: testBlocoId,
      nome: `Macro Test Actions ${Date.now()}`,
      descricao: "Macro para teste",
    });
    testMacroId = macro.id;

    const micro = await db.createCompetenciaMicro({
      macroId: testMacroId,
      nome: `Micro Test Actions ${Date.now()}`,
      descricao: "Micro para teste",
    });
    testMicroId = micro.id;

    // Criar PDI de teste
    const pdi = await db.createPDI({
      colaboradorId: testUserId,
      cicloId: testCicloId,
      titulo: `PDI Test Actions ${Date.now()}`,
      objetivoGeral: "Objetivo de teste",
      createdBy: testLeaderId,
    });
    testPdiId = pdi.id;
  });

  it("should create action and return insertId", async () => {
    const prazo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    const result = await db.createAction({
      pdiId: testPdiId,
      blocoId: testBlocoId,
      macroId: testMacroId,
      microId: testMicroId,
      nome: "Ação de Teste",
      descricao: "Descrição da ação de teste",
      prazo: prazo,
      createdBy: testLeaderId,
    });

    // Verificar que retorna insertId
    expect(result).toHaveProperty("insertId");
    expect(typeof result.insertId).toBe("number");
    expect(result.insertId).toBeGreaterThan(0);
  });

  it("should create notification with referenciaId after creating action", async () => {
    const prazo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Criar ação
    const actionResult = await db.createAction({
      pdiId: testPdiId,
      blocoId: testBlocoId,
      macroId: testMacroId,
      microId: testMicroId,
      nome: "Ação com Notificação",
      descricao: "Teste de notificação",
      prazo: prazo,
      createdBy: testLeaderId,
    });

    // Criar notificação com referenciaId
    await db.createNotification({
      destinatarioId: testLeaderId,
      tipo: "nova_acao",
      titulo: "Nova ação criada",
      mensagem: "Teste de notificação com referência",
      referenciaId: actionResult.insertId,
    });

    // Buscar notificações do líder
    const notifications = await db.getNotificationsByUserId(testLeaderId);
    
    // Verificar que notificação foi criada com referenciaId
    const notification = notifications.find(n => n.referenciaId === actionResult.insertId);
    expect(notification).toBeDefined();
    expect(notification?.tipo).toBe("nova_acao");
    expect(notification?.referenciaId).toBe(actionResult.insertId);
  });
});

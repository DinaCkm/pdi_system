import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Sistema de Solicitação de Ajuste de Ações", () => {
  let adminUser: any;
  let liderUser: any;
  let colaboradorUser: any;
  let departamento: any;
  let ciclo: any;
  let bloco: any;
  let macro: any;
  let micro: any;
  let pdi: any;
  let acao: any;

  beforeAll(async () => {
    // Criar departamento
    const deptId = await db.createDepartamento({ nome: "TI - Testes Ajuste", descricao: "Departamento para testes", status: "ativo" });
    const departamentos = await db.getAllDepartamentos();
    departamento = departamentos.find(d => d.nome === "TI - Testes Ajuste");

    // Criar admin
    await db.createUser({
      openId: "admin-ajuste-test",
      name: "Admin Ajuste Test",
      email: "admin.ajuste@test.com",
      cpf: "11122233344",
      role: "admin",
      cargo: "Administrador",
      status: "ativo",
    });
    adminUser = await db.getUserByCpf("11122233344");

    // Criar líder
    await db.createUser({
      openId: "lider-ajuste-test",
      name: "Líder Ajuste Test",
      email: "lider.ajuste@test.com",
      cpf: "22233344455",
      role: "lider",
      cargo: "Gerente",
      leaderId: adminUser.id,
      departamentoId: departamento.id,
      status: "ativo",
    });
    liderUser = await db.getUserByCpf("22233344455");

    // Criar colaborador
    await db.createUser({
      openId: "colaborador-ajuste-test",
      name: "Colaborador Ajuste Test",
      email: "colaborador.ajuste@test.com",
      cpf: "33344455566",
      role: "colaborador",
      cargo: "Desenvolvedor",
      leaderId: liderUser.id,
      departamentoId: departamento.id,
      status: "ativo",
    });
    colaboradorUser = await db.getUserByCpf("33344455566");

    // Criar ciclo
    const dataInicio = new Date("2024-01-01");
    const dataFim = new Date("2024-06-30");
    await db.createCiclo({
      nome: "Ciclo Teste Ajuste 2024-1",
      dataInicio,
      dataFim,
      createdBy: adminUser.id,
    });
    const ciclos = await db.getAllCiclos();
    ciclo = ciclos.find(c => c.nome === "Ciclo Teste Ajuste 2024-1");

    // Criar competências
    await db.createBloco({ nome: "Bloco Ajuste Test", descricao: "Bloco para testes" });
    const blocos = await db.getAllBlocos();
    bloco = blocos.find(b => b.nome === "Bloco Ajuste Test");

    await db.createMacro({ blocoId: bloco.id, nome: "Macro Ajuste Test", descricao: "Macro para testes" });
    const macros = await db.getAllMacros();
    macro = macros.find(m => m.nome === "Macro Ajuste Test");

    await db.createMicro({ macroId: macro.id, nome: "Micro Ajuste Test", descricao: "Micro para testes" });
    const micros = await db.getAllMicros();
    micro = micros.find(m => m.nome === "Micro Ajuste Test");

    // Criar PDI
    await db.createPDI({
      colaboradorId: colaboradorUser.id,
      cicloId: ciclo.id,
      titulo: "PDI Teste Ajuste",
      objetivoGeral: "Objetivo de teste",
      createdBy: adminUser.id,
    });
    const pdis = await db.getAllPDIs();
    pdi = pdis.find(p => p.titulo === "PDI Teste Ajuste");

    // Criar ação aprovada pelo líder
    await db.createAction({
      pdiId: pdi.id,
      blocoId: bloco.id,
      macroId: macro.id,
      microId: micro.id,
      nome: "Ação para Teste de Ajuste",
      descricao: "Descrição original",
      prazo: new Date("2024-03-31"),
      createdBy: adminUser.id,
      status: "aprovada_lider",
    });
    const acoes = await db.getAllActions();
    acao = acoes.find(a => a.nome === "Ação para Teste de Ajuste");
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (acao) await db.deleteAction(acao.id);
    if (pdi) await db.deletePDI(pdi.id);
    if (micro) await db.deleteMicro(micro.id);
    if (macro) await db.deleteMacro(macro.id);
    if (bloco) await db.deleteBloco(bloco.id);
    if (ciclo) await db.deleteCiclo(ciclo.id);
    if (colaboradorUser) await db.deleteUser(colaboradorUser.id);
    if (liderUser) await db.deleteUser(liderUser.id);
    if (adminUser) await db.deleteUser(adminUser.id);
    if (departamento) await db.deleteDepartamento(departamento.id);
  });

  it("Colaborador deve conseguir solicitar ajuste em ação aprovada", async () => {
    const caller = appRouter.createCaller({ user: colaboradorUser });

    const result = await caller.actions.solicitarAjuste({
      actionId: acao.id,
      justificativa: "Preciso de mais tempo para concluir esta ação devido a complexidade do projeto",
      camposAjustar: {
        prazo: "2024-04-15",
        descricao: "Descrição atualizada com mais detalhes",
      },
    });

    expect(result.success).toBe(true);
    expect(result.solicitacaoId).toBeDefined();

    // Verificar se ação mudou para "em_discussao"
    const acaoAtualizada = await db.getActionById(acao.id);
    expect(acaoAtualizada?.status).toBe("em_discussao");

    // Verificar se histórico foi criado
    const historico = await db.getAcaoHistorico(acao.id);
    expect(historico.length).toBeGreaterThan(0);
    expect(historico[0].campo).toBe("status");
    expect(historico[0].valorAnterior).toBe("aprovada_lider");
    expect(historico[0].valorNovo).toBe("em_discussao");

    // Verificar se notificações foram criadas
    const notificacoesAdmin = await db.getNotificationsByUserId(adminUser.id);
    const notifAjuste = notificacoesAdmin.find(n => n.tipo === "solicitacao_ajuste");
    expect(notifAjuste).toBeDefined();
    expect(notifAjuste?.titulo).toContain("Solicitação de Ajuste");

    const notificacoesLider = await db.getNotificationsByUserId(liderUser.id);
    const notifInfo = notificacoesLider.find(n => n.tipo === "solicitacao_ajuste_info");
    expect(notifInfo).toBeDefined();
  });

  it("Colaborador NÃO deve conseguir solicitar ajuste em ação de outro colaborador", async () => {
    // Criar outro colaborador
    await db.createUser({
      openId: "outro-colaborador-test",
      name: "Outro Colaborador",
      email: "outro@test.com",
      cpf: "44455566677",
      role: "colaborador",
      cargo: "Analista",
      leaderId: liderUser.id,
      departamentoId: departamento.id,
      status: "ativo",
    });
    const outroColaborador = await db.getUserByCpf("44455566677");

    const caller = appRouter.createCaller({ user: outroColaborador });

    await expect(
      caller.actions.solicitarAjuste({
        actionId: acao.id,
        justificativa: "Tentando ajustar ação de outro colaborador",
        camposAjustar: {
          prazo: "2024-05-01",
        },
      })
    ).rejects.toThrow("Você não tem permissão para solicitar ajuste nesta ação");

    // Limpar
    await db.deleteUser(outroColaborador.id);
  });

  it("Admin deve conseguir aprovar ajuste e aplicar alterações", async () => {
    // Buscar solicitação pendente
    const solicitacoes = await db.getPendingAdjustmentRequests();
    const solicitacao = solicitacoes.find(s => s.actionId === acao.id);
    expect(solicitacao).toBeDefined();

    const caller = appRouter.createCaller({ user: adminUser });

    const result = await caller.actions.aprovarAjuste({
      solicitacaoId: solicitacao!.id,
    });

    expect(result.success).toBe(true);

    // Verificar se ação foi atualizada
    const acaoAtualizada = await db.getActionById(acao.id);
    expect(acaoAtualizada?.status).toBe("aprovada_lider");
    expect(acaoAtualizada?.descricao).toBe("Descrição atualizada com mais detalhes");
    expect(acaoAtualizada?.prazo.toISOString()).toContain("2024-04-15");

    // Verificar se histórico foi atualizado
    const historico = await db.getAcaoHistorico(acao.id);
    const historicoDescricao = historico.find(h => h.campo === "descricao");
    expect(historicoDescricao).toBeDefined();
    expect(historicoDescricao?.valorAnterior).toBe("Descrição original");
    expect(historicoDescricao?.valorNovo).toBe("Descrição atualizada com mais detalhes");

    // Verificar se solicitação foi marcada como aprovada
    const solicitacaoAtualizada = await db.getAdjustmentRequestById(solicitacao!.id);
    expect(solicitacaoAtualizada?.status).toBe("aprovada");
    expect(solicitacaoAtualizada?.evaluatedBy).toBe(adminUser.id);

    // Verificar notificações
    const notificacoesColab = await db.getNotificationsByUserId(colaboradorUser.id);
    const notifAprovado = notificacoesColab.find(n => n.tipo === "ajuste_aprovado");
    expect(notifAprovado).toBeDefined();
  });

  it("Admin deve conseguir reprovar ajuste com justificativa", async () => {
    // Criar nova ação para testar reprovação
    await db.createAction({
      pdiId: pdi.id,
      blocoId: bloco.id,
      macroId: macro.id,
      microId: micro.id,
      nome: "Ação para Teste de Reprovação",
      descricao: "Descrição para reprovação",
      prazo: new Date("2024-03-31"),
      createdBy: adminUser.id,
      status: "aprovada_lider",
    });
    const acoes = await db.getAllActions();
    const acaoReprovacao = acoes.find(a => a.nome === "Ação para Teste de Reprovação");

    // Colaborador solicita ajuste
    const callerColab = appRouter.createCaller({ user: colaboradorUser });
    await callerColab.actions.solicitarAjuste({
      actionId: acaoReprovacao!.id,
      justificativa: "Solicitação que será reprovada",
      camposAjustar: {
        prazo: "2024-06-30",
      },
    });

    // Buscar solicitação
    const solicitacoes = await db.getPendingAdjustmentRequests();
    const solicitacao = solicitacoes.find(s => s.actionId === acaoReprovacao!.id);

    // Admin reprova
    const callerAdmin = appRouter.createCaller({ user: adminUser });
    const result = await callerAdmin.actions.reprovarAjuste({
      solicitacaoId: solicitacao!.id,
      justificativa: "Prazo solicitado ultrapassa o período do ciclo",
    });

    expect(result.success).toBe(true);

    // Verificar se ação voltou para "em_andamento"
    const acaoAtualizada = await db.getActionById(acaoReprovacao!.id);
    expect(acaoAtualizada?.status).toBe("em_andamento");

    // Verificar se solicitação foi marcada como reprovada
    const solicitacaoAtualizada = await db.getAdjustmentRequestById(solicitacao!.id);
    expect(solicitacaoAtualizada?.status).toBe("reprovada");
    expect(solicitacaoAtualizada?.justificativaAdmin).toBe("Prazo solicitado ultrapassa o período do ciclo");

    // Verificar notificações
    const notificacoesColab = await db.getNotificationsByUserId(colaboradorUser.id);
    const notifReprovado = notificacoesColab.find(n => n.tipo === "ajuste_reprovado");
    expect(notifReprovado).toBeDefined();
    expect(notifReprovado?.mensagem).toContain("Prazo solicitado ultrapassa o período do ciclo");

    // Limpar
    await db.deleteAction(acaoReprovacao!.id);
  });

  it("Deve retornar histórico completo de alterações da ação", async () => {
    const caller = appRouter.createCaller({ user: colaboradorUser });

    const historico = await caller.actions.getHistorico({ actionId: acao.id });

    expect(historico.length).toBeGreaterThan(0);
    
    // Verificar se contém alterações de status
    const mudancasStatus = historico.filter(h => h.campo === "status");
    expect(mudancasStatus.length).toBeGreaterThan(0);

    // Verificar se contém alterações de descrição
    const mudancasDescricao = historico.filter(h => h.campo === "descricao");
    expect(mudancasDescricao.length).toBeGreaterThan(0);

    // Verificar se está ordenado por data (mais recente primeiro)
    if (historico.length > 1) {
      expect(historico[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        historico[1].createdAt.getTime()
      );
    }
  });

  it("Admin deve conseguir listar todas as solicitações pendentes", async () => {
    const caller = appRouter.createCaller({ user: adminUser });

    const pendentes = await caller.actions.getPendingAdjustments();

    expect(Array.isArray(pendentes)).toBe(true);
    // Pode estar vazio se todas as solicitações foram processadas nos testes anteriores
  });

  it("Colaborador NÃO deve conseguir solicitar ajuste em ação com status inválido", async () => {
    // Criar ação com status "pendente_aprovacao_lider"
    await db.createAction({
      pdiId: pdi.id,
      blocoId: bloco.id,
      macroId: macro.id,
      microId: micro.id,
      nome: "Ação Pendente Aprovação",
      descricao: "Ação ainda não aprovada",
      prazo: new Date("2024-03-31"),
      createdBy: adminUser.id,
      status: "pendente_aprovacao_lider",
    });
    const acoes = await db.getAllActions();
    const acaoPendente = acoes.find(a => a.nome === "Ação Pendente Aprovação");

    const caller = appRouter.createCaller({ user: colaboradorUser });

    await expect(
      caller.actions.solicitarAjuste({
        actionId: acaoPendente!.id,
        justificativa: "Tentando ajustar ação não aprovada",
        camposAjustar: {
          prazo: "2024-05-01",
        },
      })
    ).rejects.toThrow("Ação não está em status válido para solicitação de ajuste");

    // Limpar
    await db.deleteAction(acaoPendente!.id);
  });
});

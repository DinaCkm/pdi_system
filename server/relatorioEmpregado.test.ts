import { describe, expect, it } from "vitest";
import { montarRelatorioEmpregado, limparTitulo, rotuloAD, type BaseRelatorio } from "../shared/relatorioEmpregadoRegras";
import { lerAnaliseCertificacao } from "./services/relatorioEmpregado";
import { lerPlanilha2025 } from "../shared/pdi2025Planilha";

const comp = (competencia: string, a: string, b: string) => ({
  competencia,
  transversal: competencia === "Atuação Colaborativa",
  anterior: { anoReferencia: 2024, conceito: a as any },
  atual: { anoReferencia: 2025, conceito: b as any },
});

function base(): BaseRelatorio {
  return {
    hoje: "2026-10-15",
    empregado: { nome: "Ana Exemplo", funcao: "Analista Técnico", cargo: "ANALISTA REGIONAL", unidade: "Regional Teste" },
    lider: { nome: "Bia Líder", cargo: "GERENTE REGIONAL" },
    ad: [
      comp("Protagonismo Colaborativo", "APLICADO", "CONSOLIDADO"),
      comp("Comunicação Eficaz", "EM_DESENVOLVIMENTO", "EM_DESENVOLVIMENTO"),
      comp("Olhar Empreendedor", "AVANCADO", "CONSOLIDADO"),
      comp("Relacionamento Interpessoal", "APLICADO", "EM_DESENVOLVIMENTO"),
      comp("Foco no Cliente", "CONSOLIDADO", "CONSOLIDADO"),
      comp("Atuação Colaborativa", "CONSOLIDADO", "CONSOLIDADO"),
    ],
    tecnico: {
      eixos: [
        { nome: "Comunicação", classificacao: "TRANSVERSAL", anterior: "EM_DESENVOLVIMENTO", atual: null },
        { nome: "Gestão de Projetos", classificacao: "ESSENCIAL", anterior: "EM_DESENVOLVIMENTO", atual: null },
        { nome: "Educação Empreendedora", classificacao: "NAO_ESSENCIAL", anterior: "CONSOLIDADO", atual: null },
      ],
      aguardandoProva: true,
      analise: { mes: "2025-11", classificacao: "Baixa Aderência à Função", consolidados: [], evolucao: ["Análise de dados e processos."] },
    },
    pdi2025: {
      aprovadoLider: true,
      areas: [
        { area: "Comunicação Relacional", tipo: "COMPORTAMENTAL", competencia: "Comunicação & Relacionamento Interpessoal", criadoEm: "2025-03-31" },
        { area: "Liderança e Gestão de Pessoas", tipo: "COMPORTAMENTAL", competencia: "Relacionamento com Equipe", criadoEm: "2025-03-31" },
      ],
      acoes: [
        { acao: "Desenvolver Comunicação Assertiva- curto prazo", area: "Comunicação", tipo: "COMPORTAMENTAL", competencia: null, tipoAcao: "Treinamento e estudo", prazo: "2025-06-01", concluidoEm: "2025-05-18", finalizada: true },
        { acao: "Fortalecer Relacionamento com Equipe-CURTO PRAZO", area: "Liderança e Gestão de Pessoas", tipo: "COMPORTAMENTAL", competencia: "Relacionamento com Equipe", tipoAcao: "Treinamento e estudo", prazo: "2025-09-30", concluidoEm: "2025-10-25", finalizada: true },
        { acao: "Aprofundar Análise de Dados-MÉDIO PRAZO", area: "Gestão do Conhecimento", tipo: "TECNICA", competencia: null, tipoAcao: "Treinamento e estudo", prazo: "2025-10-09", concluidoEm: "2025-10-25", finalizada: true },
      ],
    },
    pdi2026: {
      pdis: [{ titulo: "PDI - 01/2026 - BASE: CERTIFICAÇÃO", criadoEm: "2026-02-06", status: "em_andamento" }],
      acoes: [
        {
          titulo: "Técnicas de Oratória",
          macro: "COMPORTAMENTAL - Comunicação",
          competencia: "Comunicação Assertiva",
          prazo: "2026-05-25",
          status: "concluida",
          pdiTitulo: "PDI - 01/2026 - BASE: CERTIFICAÇÃO",
          evidencia: { entregueEm: "2026-07-07", status: "aprovada", horas: 4, oQue: "Gravou uma apresentação e analisou.", resultado: "Melhor entonação." },
        },
        {
          titulo: "Playbook de Atendimento",
          macro: "TÉCNICA - Ferramentas de Apoio à Gestão",
          competencia: null,
          prazo: "2026-06-10",
          status: "concluida",
          pdiTitulo: "PDI - 01/2026 - BASE: CERTIFICAÇÃO",
          evidencia: { entregueEm: "2026-07-09", status: "aprovada", horas: 20, oQue: "Criou passo a passo e compartilhou com os colegas.", resultado: "Agilidade." },
        },
      ],
      ajustes: [{ acao: "Playbook de Atendimento", criadoEm: "2026-04-28", status: "aprovada", campos: "Prazo" }],
      solicitacoes: [],
      validacoes: [{ em: "2026-06-16", liderNome: "Bia Líder", pdiTitulo: "PDI - 01/2026 - BASE: CERTIFICAÇÃO" }],
    },
  };
}

const textoTodo = (r: ReturnType<typeof montarRelatorioEmpregado>) =>
  JSON.stringify([r.resumo, r.capitulos, r.anexo, r.linhaDoTempo]);

describe("relatório gerencial do empregado", () => {
  const r = montarRelatorioEmpregado(base());

  it("nomeia as Avaliações de Desempenho pelo ano seguinte ao de referência", () => {
    expect(rotuloAD(2024)).toBe("AD 2025");
    expect(textoTodo(r)).toContain("AD 2025");
    expect(textoTodo(r)).toContain("AD 2026");
    expect(textoTodo(r)).not.toContain("AD 2024");
  });

  it("nunca usa linguagem de queda nem notas", () => {
    const t = textoTodo(r);
    expect(t).not.toMatch(/\b(caiu|caíram|desceu|desceram|redução|queda|piorou|perdeu|perderam)\b/i);
    expect(t).not.toMatch(/\d+[,.]\d+\s*%|\d+\s*%/);
  });

  it("conta a história em capítulos na ordem do tempo", () => {
    expect(r.capitulos.map((c) => c.titulo.slice(0, 10))).toEqual(["Capítulo 1", "Capítulo 2", "Capítulo 3", "Capítulo 4", "Capítulo 5"]);
    expect(r.resumo.length).toBeLessThanOrEqual(3);
    const datas = r.linhaDoTempo.map((e) => e.inicio);
    expect(r.linhaDoTempo[0].chave).toBe("ad1");
    expect(r.linhaDoTempo[r.linhaDoTempo.length - 1].chave).toBe("hoje");
    expect(datas.length).toBeGreaterThan(4);
  });

  it("liga o gap trabalhado no PDI 2025 à AD 2026", () => {
    expect(r.resumo.join(" ")).toContain("Comunicação Eficaz");
    const cap3 = JSON.stringify(r.capitulos[2]);
    expect(cap3).toContain("Comunicação Eficaz e Relacionamento Interpessoal ainda não aparecem como evolução");
    expect(cap3).toContain("Protagonismo Colaborativo evoluiu de Conhecimento Aplicado para Conhecimento Consolidado");
  });

  it("deixa claro que a validação de 2026 é do PDI técnico", () => {
    expect(JSON.stringify(r.capitulos[3])).toContain("validou o PDI técnico, criado depois da Avaliação de Proficiência");
    expect(r.linhaDoTempo.some((e) => e.rotulo === "Validação do PDI técnico pela liderança")).toBe(true);
  });

  it("aponta potencialidade técnica e o que fica para o próximo capítulo", () => {
    const cap5 = JSON.stringify(r.capitulos[4]);
    expect(cap5).toContain("Educação Empreendedora");
    expect(cap5).toContain("Relacionamento Interpessoal");
    expect(cap5).toContain("Avaliação de Proficiência 2026");
  });

  it("funciona sem PDI 2025 e sem avaliações", () => {
    const b = base();
    b.pdi2025 = null;
    b.ad = [];
    const s = montarRelatorioEmpregado(b);
    expect(JSON.stringify(s.capitulos[1])).toContain("não está na base importada");
    expect(JSON.stringify(s.capitulos[0])).toContain("Ainda não há Avaliação de Desempenho");
  });

  it("limpa o horizonte dos títulos de 2025", () => {
    expect(limparTitulo("Aplicar Planejamento Estratégico~-  MÉDIO PRAZO")).toBe("Aplicar Planejamento Estratégico");
    expect(limparTitulo("Desenvolver Escuta Ativa-Médio Prazo")).toBe("Desenvolver Escuta Ativa");
  });
});

describe("análise da certificação gravada no PDI", () => {
  const texto = [
    "📘 ANÁLISE DA CERTIFICAÇÃO TÉCNICA",
    "Data da avaliação: 11/2025",
    "🔹 Pontos Consolidados",
    "Base funcional nas atividades.",
    "🔹 Pontos de Evolução Estratégica",
    "Baixa consistência em análise de dados.",
    "Necessidade de fortalecimento em projetos.",
    "",
    "3️⃣ Classificação Técnica",
    "🔴 Baixa Aderência à Função",
    "4️⃣ Resultado Geral",
    "Percentual Essenciais: 51,35%",
  ].join("\n");

  it("lê mês, classificação e pontos, sem percentuais", () => {
    const a = lerAnaliseCertificacao(texto)!;
    expect(a.mes).toBe("2025-11");
    expect(a.classificacao).toBe("Baixa Aderência à Função");
    expect(a.evolucao).toEqual(["Baixa consistência em análise de dados.", "Necessidade de fortalecimento em projetos."]);
    expect(a.consolidados).toEqual(["Base funcional nas atividades."]);
  });
});

describe("planilha do ciclo 2025", () => {
  it("lê as quatro abas e liga pendentes pelo nome", () => {
    const p = lerPlanilha2025({
      PDI: [
        ["Nome", "Email", "Cpf", "Times", "Tags Privadas", "Tags Públicas", "Área", "Identificador", "status", "Líder", "Aprovado pelo líder?", "Total de Áreas de desenvolvimento", "Atualizado em (yyyy-mm-dd)", "Não iniciada", "Em progresso", "Finalizada", "Engajamento", "PDI Finalizado?"],
        ["Ana Exemplo", "Ana@Ex.com", null, "Time", "", "", null, null, "Ativo", "Bia", "Sim", 2, "2025-11-23", 0, 0, 2, 4, "Terminou"],
      ],
      "Áreas de desenvolvimento": [
        ["Nome", "Email", "Cpf", "Times", "Tags Privadas", "Tags Públicas", "Área", "Identificador", "status", "Líder", "Área de desenvolvimento", "Descrição", "Categoria", "Criado em (yyyy-mm-dd)", "Atualizado em (yyyy-mm-dd)", "Progresso", "Total de ações", "Finalizada"],
        ["Ana Exemplo", "ana@ex.com", null, "Time", "", "", null, null, "Ativo", "Bia", "Macro área: Comunicação Relacional ", "Competência Comportamental: Comunicação Assertiva", "Potencializar", "2025-03-31", "2025-08-11", "Finalizada", 2, 2],
      ],
      "Ações Finalizadas": [
        ["Nome", "Email", "Times", "status", "Líder", "Área de desenvolvimento", "Padronização", "Descrição", "Categoria", "Ação", "Descrição", "Categoria", "Data de entrega (yyyy-mm-dd)", "Concluído em (yyyy-mm-dd)", "Todas as MacroÁreas"],
        ["Ana Exemplo", "ana@ex.com", "Time", "Ativo", "Bia", " Macro Área: Comunicação ", "Macro Área: Comunicação Relacional", "Competência Comportamental: Comunicação", "Potencializar", "AÇÃO: Desenvolver Escuta Ativa-Médio Prazo", "texto longo", "Treinamento e estudo", "2025-08-20", "2025-06-07", ""],
      ],
      "Ações Não Finalizadas": [
        ["Nome", "Times", "Líder", "Padronização", "Ação", "Descrição", "Todas Macroáreas"],
        ["Ana Exemplo", "Time", "Bia", "Macro Área: Comunicação Relacional", "Ação pendente", "texto", ""],
      ],
    });
    expect(p.resumos[0].email).toBe("ana@ex.com");
    expect(p.areas[0]).toMatchObject({ area: "Comunicação Relacional", tipo: "COMPORTAMENTAL" });
    expect(p.acoes[0]).toMatchObject({ acao: "Desenvolver Escuta Ativa-Médio Prazo", tipoAcao: "Treinamento e estudo", concluidoEm: "2025-06-07", finalizada: true, tipo: "COMPORTAMENTAL" });
    expect(p.acoes[1]).toMatchObject({ acao: "Ação pendente", finalizada: false, tipo: "COMPORTAMENTAL" });
    expect(p.semEmail).toEqual([]);
  });
});

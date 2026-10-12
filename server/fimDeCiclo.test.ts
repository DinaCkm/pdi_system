import { describe, expect, it } from "vitest";
import { classificar, conceitoDe, contarPalavras, limitarSintese, movimento } from "../shared/fimDeCicloRegras";
import { montarMatrizEmpregados, montarRelatorio } from "./services/fimDeCiclo";

describe("régua de conceitos", () => {
  it("Conhecimento Aplicado começa em 70", () => {
    expect(conceitoDe(69.9)).toBe("EM_DESENVOLVIMENTO");
    expect(conceitoDe(70)).toBe("APLICADO");
    expect(conceitoDe(75)).toBe("CONSOLIDADO");
    expect(conceitoDe(85)).toBe("AVANCADO");
    expect(conceitoDe(90)).toBe("REFERENCIA");
    expect(conceitoDe(null)).toBeNull();
  });
});

describe("classificação por conceito", () => {
  it("cobre todas as regras", () => {
    expect(classificar("CONSOLIDADO", "AVANCADO")).toBe("MANTEVE");
    expect(classificar("REFERENCIA", "APLICADO")).toBe("ATENCAO"); // desceu, ainda na expectativa
    expect(classificar("EM_DESENVOLVIMENTO", "CONSOLIDADO")).toBe("CHEGOU");
    expect(classificar("EM_DESENVOLVIMENTO", "EM_DESENVOLVIMENTO")).toBe("ABAIXO_PERSISTENTE");
    expect(classificar("APLICADO", "EM_DESENVOLVIMENTO")).toBe("ABAIXO_NOVA");
    expect(classificar(null, "REFERENCIA")).toBe("PRIMEIRA_MEDICAO");
    expect(classificar("APLICADO", null)).toBe("SEM_COMPARACAO");
  });

  it("primeira medição nunca conta como 'chegou à expectativa' (item 4 da seção 7)", () => {
    expect(classificar(null, "REFERENCIA")).not.toBe("CHEGOU");
  });

  it("movimento de conceito", () => {
    expect(movimento("APLICADO", "AVANCADO")).toBe("SUBIU");
    expect(movimento("AVANCADO", "AVANCADO")).toBe("MANTEVE");
    expect(movimento("AVANCADO", "APLICADO")).toBe("DESCEU");
    expect(movimento(null, "APLICADO")).toBeNull();
  });

  it("síntese com no máximo 3 frases e 60 palavras", () => {
    const longa = "palavra ".repeat(30).trim() + ".";
    expect(contarPalavras(limitarSintese([longa, longa, longa, longa]))).toBeLessThanOrEqual(60);
  });
});

// Base sintética no formato de carregarBase.
function baseExemplo() {
  const pessoas = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `P${i + 1}`, role: i === 0 ? "lider" : "colaborador", unidade: "URC" }));
  pessoas.push({ id: 99, name: "Admin", role: "admin", unidade: "URC" });
  pessoas.push({ id: 98, name: "Gerente sistema", role: "gerente", unidade: "URC" });
  const base2025 = [80, 70, 60, 90, 76, 82, null];
  const atual2026 = [78, 72, 75, 85, 70, 90, 100];
  return {
    colaboradores: pessoas,
    eixosMatriz: [
      ...pessoas.slice(0, 7).map((p, i) => ({ colaboradorId: p.id, eixo: "Atendimento Multicanal", relacao: "ESSENCIAL", base2025: base2025[i] })),
      ...pessoas.slice(0, 7).map((p) => ({ colaboradorId: p.id, eixo: "Comunicação", relacao: "TRANSVERSAL", base2025: 90 })),
      { colaboradorId: 1, eixo: "Supervisão da Rede Estendida", relacao: "NAO_ESSENCIAL", base2025: 100 },
      { colaboradorId: 1, eixo: "Estratégia e Planejamento", relacao: "TRANSVERSAL", base2025: 80 },
      { colaboradorId: 2, eixo: "Estratégia e Planejamento", relacao: "ESSENCIAL", base2025: 80 },
      { colaboradorId: 99, eixo: "Atendimento Multicanal", relacao: "ESSENCIAL", base2025: 10 },
    ],
    resultados: pessoas.slice(0, 7).map((p, i) => ({
      colaboradorId: p.id,
      calculadoEm: "2026-10-01",
      resultadoJson: JSON.stringify({
        porEixo: [
          { eixo: "Atendimento Multicanal", percentualAtual: atual2026[i] },
          { eixo: "Comunicação", percentualAtual: 92 },
          { eixo: "Supervisão da Rede Estendida", percentualAtual: 100 },
        ],
      }),
    })),
    medicoesAD: pessoas.slice(0, 6).flatMap((p) => [
      { colaboradorId: p.id, competencia: "Tomada de Decisão", valor: 2.4, validada: 1, dataReferencia: "2024-12-31", avaliacaoTitulo: "AD 2024" },
      { colaboradorId: p.id, competencia: "Tomada de Decisão", valor: 2.55, validada: 1, dataReferencia: "2025-12-31", avaliacaoTitulo: "AD 2025" },
    ]),
    acoes: [
      { id: 1, colaboradorId: 3, status: "concluida", prazo: "2026-05-01", eixo: "Atendimento Multicanal", tipo: "TECNICA", macroNome: null, cicloInicio: "2026-01-01", evidenciaAprovadaEm: "2026-05-02", atualizadaEm: "2026-05-02" },
      { id: 2, colaboradorId: 2, status: "cancelada", prazo: "2026-05-01", eixo: "Atendimento Multicanal", tipo: "TECNICA", macroNome: null, cicloInicio: "2026-01-01", evidenciaAprovadaEm: null, atualizadaEm: "2026-03-01" },
      { id: 3, colaboradorId: 4, status: "concluida", prazo: "2026-06-01", eixo: "Tomada de Decisão", tipo: "COMPORTAMENTAL", macroNome: null, cicloInicio: "2026-01-01", evidenciaAprovadaEm: "2026-06-10", atualizadaEm: "2026-06-10" },
    ],
    comPdi: new Set([1, 2, 3, 4, 5, 6, 7]),
    prorrogadas: new Set<number>(),
    evidenciaDevolvida: new Set<number>(),
    solicitacoes: [],
    catalogo: [{ eixo: "Atendimento Multicanal", descricao: "Atendimento presencial, remoto e digital." }],
  } as any;
}

describe("relatório (blocos e seção 6)", () => {
  const r = montarRelatorio(baseExemplo());
  const tec = r.instrumentos.TECNICO;

  it("perfis admin e gerente do sistema ficam fora", () => {
    expect(r.recorte.pessoas).toBe(7);
  });

  it("antes e depois sobre as mesmas avaliações (item 2 da seção 7)", () => {
    const e = tec.eixos.find((x) => x.nome === "Atendimento Multicanal")!;
    expect(e.comparaveis).toBe(6);
    const soma = (d: Record<string, number>) => Object.values(d).reduce((s, v) => s + v, 0);
    expect(soma(e.distribuicaoAntes)).toBe(6);
    expect(soma(e.distribuicaoDepois)).toBe(6);
    expect(e.subiram + e.mantiveram + e.desceram).toBe(6);
  });

  it("primeira medição fica fora de 'chegou à expectativa' e da comparação", () => {
    expect(tec.classes.PRIMEIRA_MEDICAO).toBe(1);
    expect(tec.grupos.CHEGOU).toBe(1); // só quem saiu de 60 para 75
  });

  it("Não essencial na expectativa conta como multiplicador, nunca como avaliação", () => {
    expect(r.fortalezas.multiplicadores.total).toBe(1);
    expect(tec.eixos.some((e) => e.nome === "Supervisão da Rede Estendida")).toBe(false);
  });

  it("ação concluída no ciclo conta, sem corte por data (decisão de 12/10)", () => {
    const linha = r.investimento.find((l) => l.nome === "Tomada de Decisão");
    if (linha) expect(linha.comAcao).toBe(1); // ação comportamental concluída conta mesmo depois da data da AD
    expect(r.pdi.execucao).toEqual({ concluidasAntes: 1, total: 1 });
  });

  it("nenhum nome de pessoa, nota, média ou percentual sai no relatório", () => {
    const json = JSON.stringify(r);
    for (let i = 1; i <= 7; i++) expect(json).not.toMatch(new RegExp(`"P${i}"`));
    expect(json).not.toContain("Admin");
    expect(json).not.toMatch(/media|percentual|"delta"/i);
    expect(json).not.toContain("%");
  });

  it("nenhuma ocorrência de 'prova' nos textos", () => {
    expect(JSON.stringify(r).toLowerCase()).not.toMatch(/\bprovas?\b/); // "aprovada" não conta
  });

  it("transversais e essenciais separados (técnico)", () => {
    expect(tec.destaquesPorTipo.transversais.sobem.every((d) => d.transversal)).toBe(true);
    expect(tec.destaquesPorTipo.essenciais.sobem.every((d) => !d.transversal)).toBe(true);
    const s = r.sinteses.tecnico;
    if (s.includes("transversais") && s.includes("essenciais")) expect(s.indexOf("transversais")).toBeLessThan(s.indexOf("essenciais"));
    for (const l of r.investimento) expect(typeof l.transversal).toBe("boolean");
  });

  it("eixo de liderança dos líderes separado do mesmo eixo como essencial", () => {
    const est = tec.eixos.filter((e) => e.nome === "Estratégia e Planejamento");
    expect(est).toHaveLength(2);
    expect(est.find((e) => e.lideranca)!.pessoas).toBe(1);
    expect(est.find((e) => !e.lideranca)!.transversal).toBe(false);
  });

  it("filtro por público: líderes e demais empregados", () => {
    expect(montarRelatorio(baseExemplo(), undefined, "LIDERES").recorte.pessoas).toBe(1);
    expect(montarRelatorio(baseExemplo(), undefined, "DEMAIS").recorte.pessoas).toBe(6);
    expect(montarRelatorio(baseExemplo(), undefined, "DEMAIS").instrumentos.TECNICO.eixos.some((e) => e.lideranca)).toBe(false);
  });

  it("matriz por área: sem nomes e célula com menos de 5 medidas não mostra conceito", () => {
    const m = r.matriz.TECNICO;
    expect(m.colunas[0].grupo).toBe("T"); // transversais primeiro
    const urc = m.linhas.find((l) => l.area === "URC")!;
    const atend = urc.celulas["E|Atendimento Multicanal"] as any;
    expect(atend.medidas).toBe(7);
    expect(atend.metade).toBeTruthy();
    const lider = urc.celulas["L|Estratégia e Planejamento"] as any;
    expect(lider.amostraPequena).toBe(true);
    expect(lider.metade).toBeUndefined();
    expect(JSON.stringify(r.matriz)).not.toMatch(/"P\d"/);
  });

  it("conceito da metade: pelo menos metade está nele ou acima", () => {
    const atend = r.matriz.TECNICO.linhas.find((l) => l.area === "URC")!.celulas["E|Atendimento Multicanal"] as any;
    // atuais: 78,72,75,85,70,90,100 → mediana 78 = Consolidado
    expect(atend.metade).toBe("CONSOLIDADO");
  });

  it("matriz por empregado: nomes, relação e não essencial", () => {
    const m = montarMatrizEmpregados(baseExemplo());
    expect(m.linhas).toHaveLength(7);
    const p1 = m.linhas.find((l) => l.nome === "P1")!;
    expect(p1.lider).toBe(true);
    expect(p1.tecnico["Supervisão da Rede Estendida"].relacao).toBe("NAO_ESSENCIAL");
    expect(p1.tecnico["Comunicação"].relacao).toBe("TRANSVERSAL");
    expect(m.colunas.TECNICO.find((c) => c.nome === "Estratégia e Planejamento")!.grupo).toBe("L");
    expect(m.linhas.some((l) => l.nome === "Admin")).toBe(false);
    expect(montarMatrizEmpregados(baseExemplo(), undefined, "LIDERES").linhas).toHaveLength(1);
  });

  it("sínteses respeitam o limite", () => {
    for (const s of Object.values(r.sinteses)) expect(contarPalavras(s)).toBeLessThanOrEqual(60);
  });

  it("filtro por área", () => {
    expect(montarRelatorio(baseExemplo(), "Outra").recorte.pessoas).toBe(0);
  });
});

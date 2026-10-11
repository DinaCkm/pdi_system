import { describe, expect, it } from "vitest";
import {
  classificar,
  contarPalavras,
  fmtDelta,
  fraseVariacao,
  limitarSintese,
  sentido,
  PARAMETROS,
} from "../shared/fimDeCicloRegras";
import { montarRelatorio } from "./services/fimDeCiclo";

describe("classificação (seção 5)", () => {
  it("cobre todas as regras", () => {
    expect(classificar(80, 85)).toBe("MANTEVE");
    expect(classificar(95, 80)).toBe("ATENCAO"); // ≥ 70 com queda de 10 ou mais
    expect(classificar(60, 75)).toBe("CHEGOU");
    expect(classificar(40, 55)).toBe("EM_EVOLUCAO");
    expect(classificar(40, 45)).toBe("NOVO_FOCO_PERSISTENTE");
    expect(classificar(80, 60)).toBe("NOVO_FOCO_NOVA");
    expect(classificar(null, 90)).toBe("PRIMEIRA_MEDICAO");
    expect(classificar(50, null)).toBe("SEM_COMPARACAO");
  });

  it("limites de 10 pontos são parâmetros", () => {
    expect(classificar(40, 48, { ...PARAMETROS, limiarEvolucaoPontos: 5 })).toBe("EM_EVOLUCAO");
  });

  it("primeira medição nunca conta como 'chegou a 70%' (item 4 da seção 7)", () => {
    expect(classificar(null, 100)).not.toBe("CHEGOU");
  });
});

describe("formatação (seção 6.2)", () => {
  it("zero nunca aparece com sinal e nunca é verde", () => {
    expect(fmtDelta(-0.04)).toBe("0");
    expect(fmtDelta(0)).toBe("0");
    expect(sentido(-0.04)).toBe("zero");
    expect(fmtDelta(-4.2)).toBe("−4,2");
    expect(fmtDelta(6.2)).toBe("+6,2");
    expect(sentido(-1.2)).toBe("negativo");
  });

  it("variação sempre com antes e depois (seção 6.4)", () => {
    expect(fraseVariacao(72, 78.2)).toBe("subiu 6,2 pontos, de 72% para 78,2%");
    expect(fraseVariacao(86.1, 85.8)).toBe("praticamente igual, −0,3 ponto, de 86,1% para 85,8%");
  });

  it("síntese com no máximo 3 frases e 60 palavras", () => {
    const longa = "palavra ".repeat(30).trim() + ".";
    const s = limitarSintese([longa, longa, longa, longa]);
    expect(contarPalavras(s)).toBeLessThanOrEqual(60);
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

  it("barras e Δ usam a mesma base (item 2 da seção 7)", () => {
    const e = tec.eixos.find((x) => x.nome === "Atendimento Multicanal")!;
    expect(e.comparaveis).toBe(6);
    expect(e.delta).toBe(Math.round((e.mediaDepois! - e.mediaAntes!) * 10) / 10);
  });

  it("primeira medição fica fora de 'chegou a 70%' e da comparação", () => {
    expect(tec.classes.PRIMEIRA_MEDICAO).toBe(1);
    expect(tec.grupos.CHEGOU).toBe(1); // só quem saiu de 60 para 75
  });

  it("Não essencial acima de 70% conta como multiplicador, nunca como avaliação", () => {
    expect(r.fortalezas.multiplicadores.total).toBe(1);
    expect(tec.eixos.some((e) => e.nome === "Supervisão da Rede Estendida")).toBe(false);
  });

  it("ações canceladas não contam como plano; só ações concluídas antes da nova medição contam", () => {
    const linha = r.investimento.find((l) => l.nome === "Tomada de Decisão");
    if (linha) expect(linha.pctComAcao).toBe(0); // ação comportamental veio depois da AD 2025
    expect(r.pdi.execucao).toEqual({ concluidasAntes: 1, total: 1 });
  });

  it("nenhum nome de pessoa sai no relatório", () => {
    const json = JSON.stringify(r);
    for (let i = 1; i <= 7; i++) expect(json).not.toMatch(new RegExp(`"P${i}"`));
    expect(json).not.toContain("Admin");
  });

  it("nenhuma ocorrência de 'prova' nos textos", () => {
    expect(JSON.stringify(r).toLowerCase()).not.toContain("prova");
  });

  it("sínteses respeitam o limite", () => {
    for (const s of Object.values(r.sinteses)) expect(contarPalavras(s)).toBeLessThanOrEqual(60);
  });

  it("filtro por área", () => {
    expect(montarRelatorio(baseExemplo(), "Outra").recorte.pessoas).toBe(0);
  });
});

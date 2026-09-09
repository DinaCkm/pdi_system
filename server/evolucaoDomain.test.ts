import { describe, expect, it } from "vitest";
import {
  calcularIndiceProgresso,
  calcularPerformanceNaFuncao,
  calcularProntidao,
  calcularVariacaoComparavel,
  classificarPerformanceTecnica,
  podeCalcularEvolucao,
} from "../shared/evolucaoDomain";

describe("evolucaoDomain", () => {
  it("classifica performance tecnica conforme faixas definidas", () => {
    expect(classificarPerformanceTecnica(92)).toBe("EXCELENCIA_TECNICA_ESTRATEGICA");
    expect(classificarPerformanceTecnica(87)).toBe("ALTA_ADERENCIA");
    expect(classificarPerformanceTecnica(80)).toBe(
      "ADERENCIA_SATISFATORIA_COM_NECESSIDADE_DE_EVOLUCAO"
    );
    expect(classificarPerformanceTecnica(70)).toBe("ADERENCIA_PARCIAL");
    expect(classificarPerformanceTecnica(64.9)).toBe("RISCO_TECNICO");
  });

  it("calcula Performance na Funcao somente sobre questoes essenciais", () => {
    expect(
      calcularPerformanceNaFuncao({
        totalQuestoesEssenciais: 20,
        acertosQuestoesEssenciais: 17,
      })
    ).toBe(85);
  });

  it("retorna null quando nao existem questoes essenciais", () => {
    expect(
      calcularPerformanceNaFuncao({
        totalQuestoesEssenciais: 0,
        acertosQuestoesEssenciais: 0,
      })
    ).toBeNull();
  });

  it("calcula prontidao separadamente sem afetar performance funcional", () => {
    expect(
      calcularProntidao({
        totalQuestoesNaoEssenciais: 40,
        acertosQuestoesNaoEssenciais: 18,
      })
    ).toBe(45);
  });

  it("calcula indice de progresso apenas sobre competencias comparaveis reavaliadas", () => {
    expect(
      calcularIndiceProgresso({
        competenciasComProgresso: 9,
        competenciasComparaveisReavaliadas: 13,
      })
    ).toBe(69.23);
  });

  it("nao calcula evolucao entre fontes diferentes", () => {
    const anterior = {
      colaboradorId: 1,
      cicloId: 1,
      competenciaNome: "Comunicacao",
      tipoCompetencia: "COMPORTAMENTAL" as const,
      fonteMedicao: "AVALIACAO_DESEMPENHO" as const,
      dataMedicao: "2025-01-01",
      valor: 3,
      escalaMin: 0,
      escalaMax: 5,
    };

    const atual = {
      ...anterior,
      fonteMedicao: "AVALIACAO_TECNICA" as const,
      tipoCompetencia: "TECNICA" as const,
      valor: 80,
      escalaMin: 0,
      escalaMax: 100,
    };

    expect(podeCalcularEvolucao(anterior, atual)).toBe(false);
    expect(calcularVariacaoComparavel(anterior, atual)).toBeNull();
  });

  it("calcula variacao quando fonte, natureza e escala sao comparaveis", () => {
    const anterior = {
      colaboradorId: 1,
      cicloId: 1,
      competenciaNome: "Comunicacao",
      tipoCompetencia: "COMPORTAMENTAL" as const,
      fonteMedicao: "AVALIACAO_DESEMPENHO" as const,
      dataMedicao: "2025-01-01",
      valor: 3.2,
      escalaMin: 0,
      escalaMax: 5,
    };

    const atual = {
      ...anterior,
      cicloId: 2,
      dataMedicao: "2026-01-01",
      valor: 4.1,
    };

    expect(podeCalcularEvolucao(anterior, atual)).toBe(true);
    expect(calcularVariacaoComparavel(anterior, atual)).toBe(0.9);
  });
});

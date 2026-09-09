import { describe, expect, it } from "vitest";
import {
  medicaoAnteriorEhComparavel,
  obterNaturezaEsperada,
  validarEscalaMedicao,
} from "../shared/avaliacoesDomain";

describe("avaliacoesDomain", () => {
  it("define avaliacao de desempenho como comportamental", () => {
    expect(obterNaturezaEsperada("DESEMPENHO")).toEqual({
      tipoCompetencia: "COMPORTAMENTAL",
      fonte: "AVALIACAO_DESEMPENHO",
    });
  });

  it("define avaliacao tecnica como tecnica", () => {
    expect(obterNaturezaEsperada("TECNICA")).toEqual({
      tipoCompetencia: "TECNICA",
      fonte: "AVALIACAO_TECNICA",
    });
  });

  it("aceita valor dentro de uma escala valida", () => {
    expect(validarEscalaMedicao({ valor: 4, escalaMin: 0, escalaMax: 5 })).toEqual({
      valido: true,
    });
  });

  it("rejeita escala maxima menor ou igual a minima", () => {
    const resultado = validarEscalaMedicao({ valor: 4, escalaMin: 5, escalaMax: 5 });
    expect(resultado.valido).toBe(false);
  });

  it("rejeita resultado fora da escala", () => {
    const resultado = validarEscalaMedicao({ valor: 6, escalaMin: 0, escalaMax: 5 });
    expect(resultado.valido).toBe(false);
  });

  it("considera comparavel a mesma pessoa, competencia, fonte e escala", () => {
    const anterior = {
      colaboradorId: 10,
      competenciaMacroId: 20,
      fonte: "AVALIACAO_DESEMPENHO" as const,
      escalaMin: 0,
      escalaMax: 5,
    };

    expect(medicaoAnteriorEhComparavel(anterior, { ...anterior })).toBe(true);
  });

  it("nao compara fontes ou escalas diferentes", () => {
    const anterior = {
      colaboradorId: 10,
      competenciaMacroId: 20,
      fonte: "AVALIACAO_DESEMPENHO" as const,
      escalaMin: 0,
      escalaMax: 5,
    };

    expect(
      medicaoAnteriorEhComparavel(anterior, {
        ...anterior,
        fonte: "AVALIACAO_TECNICA",
        escalaMax: 100,
      }),
    ).toBe(false);
  });
});

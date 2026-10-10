import { describe, expect, it } from "vitest";
import {
  aplicarCalibragemDesenvolvimento,
  calcularIndiceProgresso,
  calcularPerformanceNaFuncao,
  calcularProntidao,
  calcularVariacaoComparavel,
  classificarPerformanceTecnica,
  compararConceitos,
  compararConceitosComportamentais,
  conceitoComportamentalPorResultado,
  conceitoConhecimento,
  engajamentoDesenvolvimento,
  fatorCalibragemDesenvolvimento,
  percentualNaEscala,
  podeCalcularEvolucao,
  sinalUmanniPorResultado,
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

  it("converte indicadores tecnicos em conceitos de conhecimento", () => {
    expect(conceitoConhecimento(64.9)).toBe("EM_DESENVOLVIMENTO");
    expect(conceitoConhecimento(65)).toBe("CONHECIMENTO_APLICADO");
    expect(conceitoConhecimento(75)).toBe("CONHECIMENTO_CONSOLIDADO");
    expect(conceitoConhecimento(85)).toBe("CONHECIMENTO_AVANCADO");
    expect(conceitoConhecimento(90)).toBe("REFERENCIA");
  });

  it("calibra conhecimentos essenciais e transversais conforme execucao do PDI", () => {
    expect(fatorCalibragemDesenvolvimento(49)).toBe(0);
    expect(fatorCalibragemDesenvolvimento(50)).toBe(3);
    expect(fatorCalibragemDesenvolvimento(75)).toBe(5);
    expect(fatorCalibragemDesenvolvimento(90)).toBe(8);
    expect(fatorCalibragemDesenvolvimento(100)).toBe(10);

    expect(
      aplicarCalibragemDesenvolvimento({
        percentualTecnico: 70,
        classificacao: "ESSENCIAL",
        percentualPdi: 100,
      })
    ).toMatchObject({
      percentualIntegrado: 77,
      fatorPercentual: 10,
      aplicada: true,
      conceito: "CONHECIMENTO_CONSOLIDADO",
    });

    expect(
      aplicarCalibragemDesenvolvimento({
        percentualTecnico: 70,
        classificacao: "TRANSVERSAL",
        percentualPdi: 100,
      })
    ).toMatchObject({
      percentualIntegrado: 77,
      fatorPercentual: 10,
      aplicada: true,
      conceito: "CONHECIMENTO_CONSOLIDADO",
    });

    expect(
      aplicarCalibragemDesenvolvimento({
        percentualTecnico: 70,
        classificacao: "NAO_ESSENCIAL",
        percentualPdi: 100,
      })
    ).toMatchObject({
      percentualIntegrado: 70,
      fatorPercentual: 0,
      aplicada: false,
      conceito: "CONHECIMENTO_APLICADO",
    });
  });

  it("limita o indicador integrado a 100 e classifica o engajamento", () => {
    expect(
      aplicarCalibragemDesenvolvimento({
        percentualTecnico: 96,
        classificacao: "ESSENCIAL",
        percentualPdi: 100,
      }).percentualIntegrado
    ).toBe(100);

    expect(engajamentoDesenvolvimento(null)).toBe("SEM_BASE");
    expect(engajamentoDesenvolvimento(40)).toBe("EM_DESENVOLVIMENTO");
    expect(engajamentoDesenvolvimento(60)).toBe("MODERADO");
    expect(engajamentoDesenvolvimento(80)).toBe("CONSISTENTE");
    expect(engajamentoDesenvolvimento(95)).toBe("ELEVADO");
  });

  it("compara a evolucao pelos conceitos apresentados", () => {
    expect(compararConceitos("CONHECIMENTO_APLICADO", "CONHECIMENTO_CONSOLIDADO")).toBe("EVOLUCAO");
    expect(compararConceitos("CONHECIMENTO_CONSOLIDADO", "CONHECIMENTO_CONSOLIDADO")).toBe("CONSOLIDACAO");
    expect(compararConceitos("CONHECIMENTO_AVANCADO", "CONHECIMENTO_APLICADO")).toBe("OPORTUNIDADE_DESENVOLVIMENTO");
    expect(compararConceitos(null, "CONHECIMENTO_APLICADO")).toBe("SEM_COMPARACAO");
  });


  it("traduz o resultado Umanni 0 a 3 sem alterar o valor original", () => {
    expect(percentualNaEscala(2.93, 0, 3)).toBe(97.7);
    expect(conceitoComportamentalPorResultado(2.93, 0, 3)).toBe("REFERENCIA");
    expect(conceitoComportamentalPorResultado(2.4, 0, 3)).toBe("CONSOLIDADO");
    expect(conceitoComportamentalPorResultado(2.0, 0, 3)).toBe("EM_APLICACAO");
    expect(conceitoComportamentalPorResultado(1.2, 0, 3)).toBe("EM_DESENVOLVIMENTO");
  });

  it("reproduz as faixas visuais observadas nos relatorios Umanni", () => {
    expect(sinalUmanniPorResultado(1.0, 0, 3)).toBe("LARANJA");
    expect(sinalUmanniPorResultado(1.5, 0, 3)).toBe("AMARELO");
    expect(sinalUmanniPorResultado(2.0, 0, 3)).toBe("AMARELO");
    expect(sinalUmanniPorResultado(2.13, 0, 3)).toBe("VERDE");
    expect(sinalUmanniPorResultado(3.0, 0, 3)).toBe("VERDE");
  });

  it("compara a evolucao comportamental pelos conceitos apresentados", () => {
    expect(compararConceitosComportamentais("EM_APLICACAO", "CONSOLIDADO")).toBe("EVOLUCAO");
    expect(compararConceitosComportamentais("CONSOLIDADO", "CONSOLIDADO")).toBe("CONSOLIDACAO");
    expect(compararConceitosComportamentais("AVANCADO", "EM_APLICACAO")).toBe("OPORTUNIDADE_DESENVOLVIMENTO");
    expect(compararConceitosComportamentais(null, "CONSOLIDADO")).toBe("SEM_COMPARACAO");
  });
});

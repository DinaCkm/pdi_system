import { describe, expect, it } from "vitest";
import { TOTAL_QUESTOES_UTIC, UTIC_QUESTOES, validarBancoUtic } from "../shared/uticQuestoes";
import { UTIC_GABARITO } from "./uticGabarito";

describe("banco oficial UTIC", () => {
  it("possui exatamente 60 questões únicas numeradas de 1 a 60", () => {
    const validacao = validarBancoUtic();
    expect(validacao.valido).toBe(true);
    expect(validacao.total).toBe(60);
    expect(validacao.faltantes).toEqual([]);
    expect(validacao.duplicados).toEqual([]);
  });

  it("possui opção Não sei em todas as questões", () => {
    for (const questao of UTIC_QUESTOES) {
      expect(questao.opcoes.some((opcao) => opcao.naoSei || /não sei/i.test(opcao.texto))).toBe(true);
    }
  });

  it("mantém o gabarito somente no servidor e válido para todas as questões", () => {
    expect(Object.keys(UTIC_GABARITO)).toHaveLength(TOTAL_QUESTOES_UTIC);
    for (const questao of UTIC_QUESTOES) {
      const correta = UTIC_GABARITO[questao.id];
      expect(correta).toBeTruthy();
      expect(questao.opcoes.some((opcao) => opcao.id === correta)).toBe(true);
    }
  });

  it("normaliza a questão 12 e mantém somente uma questão 55", () => {
    expect(UTIC_QUESTOES.filter((questao) => questao.id === 12)).toHaveLength(1);
    expect(UTIC_QUESTOES.filter((questao) => questao.id === 55)).toHaveLength(1);
  });
});

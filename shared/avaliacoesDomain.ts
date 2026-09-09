export type TipoAvaliacao = "DESEMPENHO" | "TECNICA";
export type TipoCompetencia = "COMPORTAMENTAL" | "TECNICA";
export type FonteMedicao = "AVALIACAO_DESEMPENHO" | "AVALIACAO_TECNICA";

export type DadosMedicaoComparavel = {
  colaboradorId: number;
  competenciaMacroId: number;
  fonte: FonteMedicao;
  escalaMin: number;
  escalaMax: number;
};

export function obterNaturezaEsperada(tipo: TipoAvaliacao): {
  tipoCompetencia: TipoCompetencia;
  fonte: FonteMedicao;
} {
  if (tipo === "DESEMPENHO") {
    return {
      tipoCompetencia: "COMPORTAMENTAL",
      fonte: "AVALIACAO_DESEMPENHO",
    };
  }

  return {
    tipoCompetencia: "TECNICA",
    fonte: "AVALIACAO_TECNICA",
  };
}

export function validarEscalaMedicao(input: {
  valor: number;
  escalaMin: number;
  escalaMax: number;
}): { valido: true } | { valido: false; motivo: string } {
  if (!Number.isFinite(input.valor) || !Number.isFinite(input.escalaMin) || !Number.isFinite(input.escalaMax)) {
    return { valido: false, motivo: "Valor e escala precisam ser números válidos." };
  }

  if (input.escalaMax <= input.escalaMin) {
    return { valido: false, motivo: "A escala máxima deve ser maior que a mínima." };
  }

  if (input.valor < input.escalaMin || input.valor > input.escalaMax) {
    return { valido: false, motivo: "O resultado está fora da escala informada." };
  }

  return { valido: true };
}

export function medicaoAnteriorEhComparavel(
  anterior: DadosMedicaoComparavel,
  atual: DadosMedicaoComparavel,
): boolean {
  return (
    anterior.colaboradorId === atual.colaboradorId &&
    anterior.competenciaMacroId === atual.competenciaMacroId &&
    anterior.fonte === atual.fonte &&
    anterior.escalaMin === atual.escalaMin &&
    anterior.escalaMax === atual.escalaMax
  );
}

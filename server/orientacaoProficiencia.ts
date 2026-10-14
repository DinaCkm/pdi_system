/**
 * Regras para registrar a visualizacao integral do video antes da confirmacao
 * das orientacoes. A confirmacao e o aceite continuam obrigatorios.
 */
export function videoIntegralmenteAssistido(
  duracaoSegundos: number,
  tempoAssistidoSegundos: number,
): boolean {
  return Number.isFinite(duracaoSegundos)
    && duracaoSegundos >= 10
    && Number.isFinite(tempoAssistidoSegundos)
    && tempoAssistidoSegundos >= 0
    && tempoAssistidoSegundos + 3 >= duracaoSegundos;
}

export function tempoMinimoVideoAtingido(
  duracaoSegundos: number,
  segundosDecorridos: number,
): boolean {
  return Number.isFinite(segundosDecorridos)
    && segundosDecorridos >= 0
    && segundosDecorridos + 5 >= duracaoSegundos;
}

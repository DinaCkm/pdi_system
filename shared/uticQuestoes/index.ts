// Banco público da Avaliação Técnica UTIC 2026.
// Normalizações aprovadas: Questão 12 identificada e duplicidade da Questão 55 removida.
// O gabarito permanece exclusivamente no servidor.

export type { UticOpcao, UticQuestao } from "./types";
import type { UticQuestao } from "./types";
import { QUESTOES_E01 } from "./e01";
import { QUESTOES_E02 } from "./e02";
import { QUESTOES_E03 } from "./e03";
import { QUESTOES_E04 } from "./e04";
import { QUESTOES_E05 } from "./e05";
import { QUESTOES_E06 } from "./e06";
import { QUESTOES_E07 } from "./e07";
import { QUESTOES_E08 } from "./e08";

function garantirOpcaoNaoSei(questao: UticQuestao): UticQuestao {
  if (questao.opcoes.some((opcao) => opcao.naoSei || /não sei/i.test(opcao.texto))) return questao;
  return {
    ...questao,
    opcoes: [
      ...questao.opcoes,
      {
        id: `q${questao.id}_nao_sei`,
        texto: "Não sei, desconheço o conteúdo.",
        naoSei: true,
      },
    ],
  };
}

export const UTIC_QUESTOES = [
  ...QUESTOES_E01,
  ...QUESTOES_E02,
  ...QUESTOES_E03,
  ...QUESTOES_E04,
  ...QUESTOES_E05,
  ...QUESTOES_E06,
  ...QUESTOES_E07,
  ...QUESTOES_E08,
]
  .map(garantirOpcaoNaoSei)
  .sort((a, b) => a.id - b.id);

export const TOTAL_QUESTOES_UTIC = UTIC_QUESTOES.length;

export function validarBancoUtic() {
  const ids = UTIC_QUESTOES.map((questao) => questao.id);
  const unicos = new Set(ids);
  const faltantes = Array.from({ length: 60 }, (_, indice) => indice + 1).filter((id) => !unicos.has(id));
  const duplicados = ids.filter((id, indice) => ids.indexOf(id) !== indice);
  return {
    total: UTIC_QUESTOES.length,
    faltantes,
    duplicados: [...new Set(duplicados)],
    valido: UTIC_QUESTOES.length === 60 && faltantes.length === 0 && duplicados.length === 0,
  };
}

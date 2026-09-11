// Banco público da Avaliação Técnica UTIC 2026.
// Normalizações aprovadas: Questão 12 identificada e duplicidade da Questão 55 removida.
// O gabarito permanece exclusivamente no servidor.

export type { UticOpcao, UticQuestao } from "./types";
import { QUESTOES_E01 } from "./e01";
import { QUESTOES_E02 } from "./e02";
import { QUESTOES_E03 } from "./e03";
import { QUESTOES_E04 } from "./e04";
import { QUESTOES_E05 } from "./e05";
import { QUESTOES_E06 } from "./e06";
import { QUESTOES_E07 } from "./e07";
import { QUESTOES_E08 } from "./e08";

export const UTIC_QUESTOES = [
  ...QUESTOES_E01,
  ...QUESTOES_E02,
  ...QUESTOES_E03,
  ...QUESTOES_E04,
  ...QUESTOES_E05,
  ...QUESTOES_E06,
  ...QUESTOES_E07,
  ...QUESTOES_E08,
].sort((a, b) => a.id - b.id);

export const TOTAL_QUESTOES_UTIC = UTIC_QUESTOES.length;

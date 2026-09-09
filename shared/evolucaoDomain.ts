export type TipoCompetencia = "COMPORTAMENTAL" | "TECNICA";

export type FonteMedicao =
  | "AVALIACAO_DESEMPENHO"
  | "AVALIACAO_TECNICA";

export type SituacaoEvolucao =
  | "AGUARDANDO_NOVA_MEDICAO"
  | "PROGRESSO_CONSOLIDADO"
  | "PROGRESSO_MAS_REQUER_DESENVOLVIMENTO"
  | "SEM_MUDANCA_RELEVANTE"
  | "GAP_PERSISTENTE"
  | "NOVO_GAP"
  | "COMPETENCIA_ADEQUADA";

export type ClassificacaoPerformanceTecnica =
  | "EXCELENCIA_TECNICA_ESTRATEGICA"
  | "ALTA_ADERENCIA"
  | "ADERENCIA_SATISFATORIA_COM_NECESSIDADE_DE_EVOLUCAO"
  | "ADERENCIA_PARCIAL"
  | "RISCO_TECNICO";

export interface MedicaoCompetencia {
  colaboradorId: number;
  cicloId: number;
  competenciaId?: number | null;
  competenciaNome: string;
  tipoCompetencia: TipoCompetencia;
  fonteMedicao: FonteMedicao;
  dataMedicao: Date | string;
  valor: number;
  escalaMin?: number | null;
  escalaMax?: number | null;
  classificacao?: string | null;
}

export interface TrilhaCompetencia {
  colaboradorId: number;
  cicloId: number;
  competenciaId?: number | null;
  competenciaNome: string;
  tipoCompetencia: TipoCompetencia;
  quantidadeAcoes: number;
  quantidadeAcoesConcluidas: number;
  foiPriorizada: boolean;
}

export interface ResultadoEvolucaoCompetencia {
  competenciaId?: number | null;
  competenciaNome: string;
  tipoCompetencia: TipoCompetencia;
  trilhaAnterior?: TrilhaCompetencia | null;
  medicaoAnterior?: MedicaoCompetencia | null;
  medicaoAtual?: MedicaoCompetencia | null;
  variacao?: number | null;
  situacao: SituacaoEvolucao;
}

export function classificarPerformanceTecnica(
  percentual: number
): ClassificacaoPerformanceTecnica {
  if (percentual >= 90) return "EXCELENCIA_TECNICA_ESTRATEGICA";
  if (percentual >= 85) return "ALTA_ADERENCIA";
  if (percentual >= 75) {
    return "ADERENCIA_SATISFATORIA_COM_NECESSIDADE_DE_EVOLUCAO";
  }
  if (percentual >= 65) return "ADERENCIA_PARCIAL";
  return "RISCO_TECNICO";
}

export function calcularPerformanceNaFuncao(params: {
  totalQuestoesEssenciais: number;
  acertosQuestoesEssenciais: number;
}): number | null {
  const { totalQuestoesEssenciais, acertosQuestoesEssenciais } = params;

  if (totalQuestoesEssenciais <= 0) return null;

  return Number(
    ((acertosQuestoesEssenciais / totalQuestoesEssenciais) * 100).toFixed(2)
  );
}

export function calcularProntidao(params: {
  totalQuestoesNaoEssenciais: number;
  acertosQuestoesNaoEssenciais: number;
}): number | null {
  const { totalQuestoesNaoEssenciais, acertosQuestoesNaoEssenciais } = params;

  if (totalQuestoesNaoEssenciais <= 0) return null;

  return Number(
    ((acertosQuestoesNaoEssenciais / totalQuestoesNaoEssenciais) * 100).toFixed(2)
  );
}

export function calcularIndiceProgresso(params: {
  competenciasComProgresso: number;
  competenciasComparaveisReavaliadas: number;
}): number | null {
  const { competenciasComProgresso, competenciasComparaveisReavaliadas } = params;

  if (competenciasComparaveisReavaliadas <= 0) return null;

  return Number(
    ((competenciasComProgresso / competenciasComparaveisReavaliadas) * 100).toFixed(2)
  );
}

export function podeCalcularEvolucao(
  anterior?: MedicaoCompetencia | null,
  atual?: MedicaoCompetencia | null
): boolean {
  if (!anterior || !atual) return false;
  if (anterior.tipoCompetencia !== atual.tipoCompetencia) return false;
  if (anterior.fonteMedicao !== atual.fonteMedicao) return false;

  const escalaAnterior = `${anterior.escalaMin ?? ""}:${anterior.escalaMax ?? ""}`;
  const escalaAtual = `${atual.escalaMin ?? ""}:${atual.escalaMax ?? ""}`;

  return escalaAnterior === escalaAtual;
}

export function calcularVariacaoComparavel(
  anterior?: MedicaoCompetencia | null,
  atual?: MedicaoCompetencia | null
): number | null {
  if (!podeCalcularEvolucao(anterior, atual)) return null;

  return Number(((atual?.valor ?? 0) - (anterior?.valor ?? 0)).toFixed(2));
}

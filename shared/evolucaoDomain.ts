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


export type ConceitoConhecimento =
  | "EM_DESENVOLVIMENTO"
  | "CONHECIMENTO_APLICADO"
  | "CONHECIMENTO_CONSOLIDADO"
  | "CONHECIMENTO_AVANCADO"
  | "REFERENCIA";

export type EngajamentoDesenvolvimento =
  | "SEM_BASE"
  | "EM_DESENVOLVIMENTO"
  | "MODERADO"
  | "CONSISTENTE"
  | "ELEVADO";

export type EvolucaoConceitual =
  | "SEM_COMPARACAO"
  | "EVOLUCAO"
  | "CONSOLIDACAO"
  | "OPORTUNIDADE_DESENVOLVIMENTO";

export const conceitoConhecimentoLabel: Record<ConceitoConhecimento, string> = {
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  CONHECIMENTO_APLICADO: "Conhecimento Aplicado",
  CONHECIMENTO_CONSOLIDADO: "Conhecimento Consolidado",
  CONHECIMENTO_AVANCADO: "Conhecimento Avançado",
  REFERENCIA: "Referência",
};

export const engajamentoDesenvolvimentoLabel: Record<EngajamentoDesenvolvimento, string> = {
  SEM_BASE: "Sem base suficiente",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  MODERADO: "Moderado",
  CONSISTENTE: "Consistente",
  ELEVADO: "Elevado",
};

export function conceitoConhecimento(
  percentual?: number | null
): ConceitoConhecimento | null {
  if (percentual === null || percentual === undefined || !Number.isFinite(Number(percentual))) {
    return null;
  }

  const valor = Math.max(0, Math.min(100, Number(percentual)));
  if (valor >= 90) return "REFERENCIA";
  if (valor >= 85) return "CONHECIMENTO_AVANCADO";
  if (valor >= 75) return "CONHECIMENTO_CONSOLIDADO";
  if (valor >= 65) return "CONHECIMENTO_APLICADO";
  return "EM_DESENVOLVIMENTO";
}

export function nivelConceitoConhecimento(
  conceito?: ConceitoConhecimento | null
): number | null {
  if (!conceito) return null;
  const niveis: Record<ConceitoConhecimento, number> = {
    EM_DESENVOLVIMENTO: 1,
    CONHECIMENTO_APLICADO: 2,
    CONHECIMENTO_CONSOLIDADO: 3,
    CONHECIMENTO_AVANCADO: 4,
    REFERENCIA: 5,
  };
  return niveis[conceito];
}

export function engajamentoDesenvolvimento(
  percentual?: number | null
): EngajamentoDesenvolvimento {
  if (percentual === null || percentual === undefined || !Number.isFinite(Number(percentual))) {
    return "SEM_BASE";
  }

  const valor = Math.max(0, Math.min(100, Number(percentual)));
  if (valor >= 90) return "ELEVADO";
  if (valor >= 75) return "CONSISTENTE";
  if (valor >= 50) return "MODERADO";
  return "EM_DESENVOLVIMENTO";
}

/**
 * A calibragem reconhece a execução do PDI sem substituir a medição técnica.
 * Ela é aplicada aos eixos classificados como ESSENCIAL ou TRANSVERSAL
 * (mesmo peso e mesma meta); Não essencial não recebe calibragem.
 *
 * 0–49% do PDI concluído: sem calibragem
 * 50–74%: +3%
 * 75–89%: +5%
 * 90–99%: +8%
 * 100%: +10%
 */
export function fatorCalibragemDesenvolvimento(
  percentualPdi?: number | null
): number {
  if (percentualPdi === null || percentualPdi === undefined || !Number.isFinite(Number(percentualPdi))) {
    return 0;
  }

  const valor = Math.max(0, Math.min(100, Number(percentualPdi)));
  if (valor >= 100) return 10;
  if (valor >= 90) return 8;
  if (valor >= 75) return 5;
  if (valor >= 50) return 3;
  return 0;
}

export function aplicarCalibragemDesenvolvimento(params: {
  percentualTecnico?: number | null;
  classificacao?: string | null;
  percentualPdi?: number | null;
}) {
  const { percentualTecnico, classificacao, percentualPdi } = params;

  if (
    percentualTecnico === null ||
    percentualTecnico === undefined ||
    !Number.isFinite(Number(percentualTecnico))
  ) {
    return {
      percentualIntegrado: null,
      fatorPercentual: 0,
      aplicada: false,
      conceito: null as ConceitoConhecimento | null,
    };
  }

  const bruto = Math.max(0, Math.min(100, Number(percentualTecnico)));
  const relacaoCalibrada = String(classificacao ?? "").trim().toUpperCase();
  const essencial = relacaoCalibrada === "ESSENCIAL" || relacaoCalibrada === "TRANSVERSAL";
  const fatorPercentual = essencial ? fatorCalibragemDesenvolvimento(percentualPdi) : 0;
  const percentualIntegrado = Math.min(
    100,
    Math.round(bruto * (1 + fatorPercentual / 100) * 10) / 10
  );

  return {
    percentualIntegrado,
    fatorPercentual,
    aplicada: essencial && fatorPercentual > 0,
    conceito: conceitoConhecimento(percentualIntegrado),
  };
}

export function compararConceitos(
  anterior?: ConceitoConhecimento | null,
  atual?: ConceitoConhecimento | null
): EvolucaoConceitual {
  const nivelAnterior = nivelConceitoConhecimento(anterior);
  const nivelAtual = nivelConceitoConhecimento(atual);

  if (nivelAnterior === null || nivelAtual === null) return "SEM_COMPARACAO";
  if (nivelAtual > nivelAnterior) return "EVOLUCAO";
  if (nivelAtual < nivelAnterior) return "OPORTUNIDADE_DESENVOLVIMENTO";
  return "CONSOLIDACAO";
}


export type ConceitoComportamental =
  | "EM_DESENVOLVIMENTO"
  | "EM_APLICACAO"
  | "CONSOLIDADO"
  | "AVANCADO"
  | "REFERENCIA";

export type SinalUmanni = "LARANJA" | "AMARELO" | "VERDE";

export const conceitoComportamentalLabel: Record<ConceitoComportamental, string> = {
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  EM_APLICACAO: "Conhecimento Aplicado",
  CONSOLIDADO: "Conhecimento Consolidado",
  AVANCADO: "Conhecimento Avançado",
  REFERENCIA: "Referência",
};

export const sinalUmanniLabel: Record<SinalUmanni, string> = {
  LARANJA: "Laranja",
  AMARELO: "Amarelo",
  VERDE: "Verde",
};

/**
 * Converte o resultado oficial da Avaliação de Desempenho para a posição
 * percentual dentro da escala informada. Na base Umanni atual, a escala é 0–3.
 * O resultado original não é alterado nem substituído.
 */
export function percentualNaEscala(
  valor?: number | null,
  escalaMin = 0,
  escalaMax = 3
): number | null {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return null;
  if (!Number.isFinite(escalaMin) || !Number.isFinite(escalaMax) || escalaMax <= escalaMin) return null;

  const percentual = ((Number(valor) - escalaMin) / (escalaMax - escalaMin)) * 100;
  return Math.round(Math.max(0, Math.min(100, percentual)) * 10) / 10;
}

/**
 * Mesma lógica de cinco níveis usada na leitura técnica, com rótulos
 * adaptados à natureza comportamental.
 */
export function conceitoComportamentalPorResultado(
  valor?: number | null,
  escalaMin = 0,
  escalaMax = 3
): ConceitoComportamental | null {
  const percentual = percentualNaEscala(valor, escalaMin, escalaMax);
  if (percentual === null) return null;

  if (percentual >= 90) return "REFERENCIA";
  if (percentual >= 85) return "AVANCADO";
  if (percentual >= 75) return "CONSOLIDADO";
  if (percentual >= 65) return "EM_APLICACAO";
  return "EM_DESENVOLVIMENTO";
}

export function nivelConceitoComportamental(
  conceito?: ConceitoComportamental | null
): number | null {
  if (!conceito) return null;
  const niveis: Record<ConceitoComportamental, number> = {
    EM_DESENVOLVIMENTO: 1,
    EM_APLICACAO: 2,
    CONSOLIDADO: 3,
    AVANCADO: 4,
    REFERENCIA: 5,
  };
  return niveis[conceito];
}

export function compararConceitosComportamentais(
  anterior?: ConceitoComportamental | null,
  atual?: ConceitoComportamental | null
): EvolucaoConceitual {
  const nivelAnterior = nivelConceitoComportamental(anterior);
  const nivelAtual = nivelConceitoComportamental(atual);

  if (nivelAnterior === null || nivelAtual === null) return "SEM_COMPARACAO";
  if (nivelAtual > nivelAnterior) return "EVOLUCAO";
  if (nivelAtual < nivelAnterior) return "OPORTUNIDADE_DESENVOLVIMENTO";
  return "CONSOLIDACAO";
}

/**
 * Reproduz a leitura visual observada nos relatórios Umanni enviados:
 * laranja abaixo de 50%, amarelo de 50% até antes de 70% e verde a partir de 70%.
 * Esta sinalização não substitui o resultado oficial 0–3.
 */
export function sinalUmanniPorResultado(
  valor?: number | null,
  escalaMin = 0,
  escalaMax = 3
): SinalUmanni | null {
  const percentual = percentualNaEscala(valor, escalaMin, escalaMax);
  if (percentual === null) return null;
  if (percentual >= 70) return "VERDE";
  if (percentual >= 50) return "AMARELO";
  return "LARANJA";
}

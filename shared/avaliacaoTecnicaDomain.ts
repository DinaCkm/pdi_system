export type AlternativaQuestao = "A" | "B" | "C" | "D" | "NAO_SEI";

export interface QuestaoTecnica {
  id: number;
  departamentoId: number;
  eixo: string;
  competencia: string;
  enunciado: string;
  alternativaA: string;
  alternativaB: string;
  alternativaC: string;
  alternativaD: string;
  respostaCorreta: Exclude<AlternativaQuestao, "NAO_SEI">;
  funcoesEssenciais: string[];
  ativa: boolean;
}

export interface RespostaTecnica {
  questaoId: number;
  resposta: AlternativaQuestao;
}

export interface ResultadoQuestaoTecnica {
  questaoId: number;
  competencia: string;
  eixo: string;
  essencialParaFuncao: boolean;
  resposta: AlternativaQuestao;
  correta: boolean;
  naoSei: boolean;
}

export interface ResultadoAvaliacaoTecnica {
  totalQuestoes: number;
  totalEssenciais: number;
  acertosEssenciais: number;
  performanceNaFuncao: number | null;
  totalNaoEssenciais: number;
  acertosNaoEssenciais: number;
  prontidao: number | null;
  resultadosPorQuestao: ResultadoQuestaoTecnica[];
}

export function avaliarQuestaoTecnica(params: {
  questao: QuestaoTecnica;
  resposta: AlternativaQuestao;
  funcaoColaborador: string;
}): ResultadoQuestaoTecnica {
  const { questao, resposta, funcaoColaborador } = params;
  const essencialParaFuncao = questao.funcoesEssenciais.includes(funcaoColaborador);
  const naoSei = resposta === "NAO_SEI";
  const correta = !naoSei && resposta === questao.respostaCorreta;

  return {
    questaoId: questao.id,
    competencia: questao.competencia,
    eixo: questao.eixo,
    essencialParaFuncao,
    resposta,
    correta,
    naoSei,
  };
}

export function calcularResultadoAvaliacaoTecnica(params: {
  questoes: QuestaoTecnica[];
  respostas: RespostaTecnica[];
  funcaoColaborador: string;
}): ResultadoAvaliacaoTecnica {
  const { questoes, respostas, funcaoColaborador } = params;
  const respostasMap = new Map(respostas.map((r) => [r.questaoId, r.resposta]));

  const resultadosPorQuestao = questoes
    .filter((q) => q.ativa)
    .map((questao) =>
      avaliarQuestaoTecnica({
        questao,
        resposta: respostasMap.get(questao.id) ?? "NAO_SEI",
        funcaoColaborador,
      })
    );

  const essenciais = resultadosPorQuestao.filter((r) => r.essencialParaFuncao);
  const naoEssenciais = resultadosPorQuestao.filter((r) => !r.essencialParaFuncao);

  const acertosEssenciais = essenciais.filter((r) => r.correta).length;
  const acertosNaoEssenciais = naoEssenciais.filter((r) => r.correta).length;

  const performanceNaFuncao = essenciais.length
    ? Number(((acertosEssenciais / essenciais.length) * 100).toFixed(2))
    : null;

  const prontidao = naoEssenciais.length
    ? Number(((acertosNaoEssenciais / naoEssenciais.length) * 100).toFixed(2))
    : null;

  return {
    totalQuestoes: resultadosPorQuestao.length,
    totalEssenciais: essenciais.length,
    acertosEssenciais,
    performanceNaFuncao,
    totalNaoEssenciais: naoEssenciais.length,
    acertosNaoEssenciais,
    prontidao,
    resultadosPorQuestao,
  };
}

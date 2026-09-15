export type UticOpcao = { id: string; texto: string; naoSei?: boolean };

export type UticEixoQuestao = {
  id: string;
  nome: string;
};

export type UticQuestao = {
  id: number;
  /**
   * Eixo principal/legado. Mantido para compatibilidade com o banco atual,
   * telas existentes e questões que ainda possuem apenas um eixo.
   */
  eixoId: string;
  eixo: string;
  /**
   * Vínculos adicionais da mesma questão com outros eixos.
   * Quando informado, cada eixo recebe integralmente a evidência da resposta.
   * O primeiro vínculo deve corresponder ao eixo principal/legado.
   */
  eixos?: UticEixoQuestao[];
  tagFonte: string;
  macroarea: string;
  microarea: string;
  enunciado: string;
  opcoes: UticOpcao[];
};

export type UticOpcao = { id: string; texto: string; naoSei?: boolean };
export type UticQuestao = {
  id: number;
  eixoId: string;
  eixo: string;
  tagFonte: string;
  macroarea: string;
  microarea: string;
  enunciado: string;
  opcoes: UticOpcao[];
};

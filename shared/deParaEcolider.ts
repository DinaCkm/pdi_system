// De-para entre as competências da Avaliação de Desempenho (PDI) e as
// competências Master e Jornada do Futuro (Visão de Futuro) do EcoLíder.
// Aprovado por Dina em 27/09/2026 (planilha DE_PARA_COMPETENCIAS_PDI_ECOLIDER.xlsx).

export type OpcoesEcolider = { master: string[]; jornadaFuturo: string[] };

export const OPCOES_ECOLIDER_POR_COMPETENCIA_AD: Record<string, OpcoesEcolider> = {
  "Protagonismo Colaborativo": { master: ["Protagonismo", "Accountability", "Responsabilidade Social"], jornadaFuturo: [] },
  "Comunicação Eficaz": { master: ["Presença Executiva"], jornadaFuturo: ["Gestão da Comunicação"] },
  "Olhar Empreendedor": { master: ["Visão Estratégica"], jornadaFuturo: ["Estratégia de Longo Alcance"] },
  "Orientação para Resultados": { master: ["Foco em Resultados"], jornadaFuturo: [] },
  "Tomada de Decisão": { master: ["Tomada de Decisão"], jornadaFuturo: ["Decisões Ágeis"] },
  "Relacionamento Interpessoal": { master: ["Relacionamentos Conectivos"], jornadaFuturo: ["Inteligência Emocional Tática"] },
  "Orientação à Inovação": { master: [], jornadaFuturo: ["Mindset Visionário", "Radar de Cenários"] },
  "Foco no Cliente": { master: ["Negociação"], jornadaFuturo: [] },
  "Atuação Colaborativa": { master: ["Gestão de Conflitos"], jornadaFuturo: ["Mentalidade Sistêmica"] },
  "Liderança Transformadora": { master: ["Influência"], jornadaFuturo: ["Arquitetura de Mudanças", "Adaptabilidade Dinâmica"] },
  "Gestão de Pessoas": { master: ["Gestão de Equipes"], jornadaFuturo: [] },
};

export function opcoesEcoliderDaCompetenciaAD(competenciaAD: unknown): OpcoesEcolider {
  const nome = String(competenciaAD ?? "").replace(/^COMPORTAMENTAL\s*-\s*/i, "").trim();
  return OPCOES_ECOLIDER_POR_COMPETENCIA_AD[nome] ?? { master: [], jornadaFuturo: [] };
}

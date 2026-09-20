export const COMPETENCIAS_AD_HISTORICAS = [
  "Protagonismo Colaborativo",
  "Comunicação Eficaz",
  "Olhar Empreendedor",
  "Orientação para Resultados",
  "Tomada de Decisão",
  "Relacionamento Interpessoal",
  "Orientação à Inovação",
  "Foco no Cliente",
  "Atuação Colaborativa",
  "Liderança Transformadora",
  "Gestão de Pessoas",
] as const;

export const macroPrincipalPorCompetenciaAD: Record<string, string> = {
  "Protagonismo Colaborativo": "COMPORTAMENTAL - Protagonismo, Autogestão e Responsabilidade Profissional",
  "Comunicação Eficaz": "COMPORTAMENTAL - Comunicação",
  "Olhar Empreendedor": "COMPORTAMENTAL - Estratégia, Visão Sistêmica e Indicadores",
  "Orientação para Resultados": "COMPORTAMENTAL - Planejamento, Foco e Resultados",
  "Tomada de Decisão": "COMPORTAMENTAL - Tomada de Decisão e Julgamento Técnico",
  "Relacionamento Interpessoal": "COMPORTAMENTAL - Relacionamento Interpessoal",
  "Orientação à Inovação": "COMPORTAMENTAL - Inovação, Criatividade e Visão de Futuro",
  "Foco no Cliente": "COMPORTAMENTAL - Atendimento e Relacionamento com o Cliente",
  "Atuação Colaborativa": "COMPORTAMENTAL - Integração Organizacional e Trabalho Interáreas",
  "Liderança Transformadora": "COMPORTAMENTAL - Liderança e Gestão de Pessoas",
  "Gestão de Pessoas": "COMPORTAMENTAL - Gestão de Equipes e Clima Organizacional",
};

export const competenciaADPorMacro: Record<string, string> = {
  "COMPORTAMENTAL - Relacionamento Interpessoal": "Relacionamento Interpessoal",
  "COMPORTAMENTAL - Comunicação": "Comunicação Eficaz",
  "COMPORTAMENTAL - Atendimento e Relacionamento com o Cliente": "Foco no Cliente",
  "COMPORTAMENTAL - Ética, Integridade e Responsabilidade": "Protagonismo Colaborativo",
  "COMPORTAMENTAL - Inteligência Emocional e Autoconhecimento": "Relacionamento Interpessoal",
  "COMPORTAMENTAL - Adaptabilidade, Flexibilidade e Resiliência": "Olhar Empreendedor",
  "COMPORTAMENTAL - Protagonismo, Autogestão e Responsabilidade Profissional": "Protagonismo Colaborativo",
  "COMPORTAMENTAL - Presença Executiva e Postura Profissional": "Comunicação Eficaz",
  "COMPORTAMENTAL - Gestão do Tempo, Organização e Disciplina": "Orientação para Resultados",
  "COMPORTAMENTAL - Liderança e Gestão de Pessoas": "Liderança Transformadora",
  "COMPORTAMENTAL - Gestão de Equipes e Clima Organizacional": "Gestão de Pessoas",
  "COMPORTAMENTAL - Desenvolvimento de Pessoas, Carreira e Sucessão": "Gestão de Pessoas",
  "COMPORTAMENTAL - Tomada de Decisão e Julgamento Técnico": "Tomada de Decisão",
  "COMPORTAMENTAL - Planejamento, Foco e Resultados": "Orientação para Resultados",
  "COMPORTAMENTAL - Estratégia, Visão Sistêmica e Indicadores": "Olhar Empreendedor",
  "COMPORTAMENTAL - Gestão de Projetos e Processos": "Orientação para Resultados",
  "COMPORTAMENTAL - Resolução de Problemas e Melhoria Contínua": "Olhar Empreendedor",
  "COMPORTAMENTAL - Governança, Controles Internos e Compliance": "Protagonismo Colaborativo",
  "COMPORTAMENTAL - Integração Organizacional e Trabalho Interáreas": "Atuação Colaborativa",
  "COMPORTAMENTAL - Inovação, Criatividade e Visão de Futuro": "Orientação à Inovação",
};

export function nomeCompetenciaAD(valor: unknown) {
  return String(valor ?? "")
    .replace(/^COMPORTAMENTAL\s*-\s*/i, "")
    .trim();
}

export function macroRelacionadaDaAD(valor: unknown) {
  return macroPrincipalPorCompetenciaAD[nomeCompetenciaAD(valor)] ?? null;
}

export function competenciaADRelacionadaDaMacro(valor: unknown) {
  const nome = String(valor ?? "").replace(/^COMPORTAMENTAL\s*-\s*/i, "COMPORTAMENTAL - ").trim();
  return competenciaADPorMacro[nome] ?? null;
}

export type PerguntaQuestionarioAtividades = {
  chave: string;
  titulo: string;
  pergunta: string;
  ordem: number;
  grupo: "contexto" | "funcao" | "desenvolvimento";
};

export const PERGUNTAS_QUESTIONARIO_ATIVIDADES: PerguntaQuestionarioAtividades[] = [
  {
    chave: "pdi_criado_ano",
    titulo: "PDI do ano",
    pergunta: "Você já criou um Plano de Desenvolvimento Individual (PDI) para este ano?",
    ordem: 1,
    grupo: "contexto",
  },
  {
    chave: "desafios_funcao",
    titulo: "Desafios da função",
    pergunta: "Quais são os maiores desafios que você enfrenta nesta função dentro da sua área ou departamento?",
    ordem: 2,
    grupo: "contexto",
  },
  {
    chave: "graduacoes_fundamentais",
    titulo: "Graduações fundamentais",
    pergunta: "Considerando a função que você exerce e o contexto específico da sua área de atuação, quais cursos de graduação você considera fundamentais para quem deseja desempenhar esse papel?",
    ordem: 3,
    grupo: "desenvolvimento",
  },
  {
    chave: "especializacoes_recomendadas",
    titulo: "MBAs e pós-graduações",
    pergunta: "Se alguém quisesse se especializar ainda mais na função que você desempenha hoje, que MBAs ou pós-graduações você indicaria?",
    ordem: 4,
    grupo: "desenvolvimento",
  },
  {
    chave: "cursos_extracurriculares",
    titulo: "Cursos extracurriculares",
    pergunta: "Pensando no seu dia a dia e na experiência prática que você tem, quais cursos extracurriculares poderiam apoiar ainda mais o desenvolvimento de quem ocupa a função que você desempenha?",
    ordem: 5,
    grupo: "desenvolvimento",
  },
  {
    chave: "cursos_internos_sebrae",
    titulo: "Cursos internos do Sebrae",
    pergunta: "Sabendo que o Sebrae oferece uma ampla variedade de cursos internos, quais você acredita que seriam mais importantes para apoiar o desenvolvimento de quem ocupa a função que você exerce hoje?",
    ordem: 6,
    grupo: "desenvolvimento",
  },
  {
    chave: "temas_competencias_indispensaveis",
    titulo: "Temas e competências indispensáveis",
    pergunta: "Imaginando a construção de um programa de desenvolvimento para a função que você exerce, quais temas ou competências você acredita que não poderiam faltar?",
    ordem: 7,
    grupo: "desenvolvimento",
  },
  {
    chave: "plano_capacitacao_ano",
    titulo: "Plano de capacitação",
    pergunta: "Existe algum Plano de Capacitação definido internamente para este ano? Se sim, quais capacitações estão previstas?",
    ordem: 8,
    grupo: "desenvolvimento",
  },
  {
    chave: "descricao_funcao",
    titulo: "Descrição da função",
    pergunta: "Se alguém de fora perguntasse o que faz uma pessoa que ocupa este cargo dentro da sua área, departamento ou escritório, como você explicaria?",
    ordem: 9,
    grupo: "funcao",
  },
  {
    chave: "principais_atividades",
    titulo: "Principais atividades",
    pergunta: "Quais são as 5 principais atividades que fazem parte da sua rotina nesta função e que realmente fazem diferença no dia a dia do setor?",
    ordem: 10,
    grupo: "funcao",
  },
  {
    chave: "conhecimentos_habilidades_indispensaveis",
    titulo: "Conhecimentos e habilidades indispensáveis",
    pergunta: "Pensando nas atividades que você realiza hoje no seu dia a dia, quais conhecimentos e habilidades são indispensáveis para desempenhá-las bem?",
    ordem: 11,
    grupo: "funcao",
  },
  {
    chave: "responsabilidades_extras",
    titulo: "Responsabilidades além da descrição formal",
    pergunta: "Existe alguma responsabilidade ou atividade que você realiza e considera importante, mas que não consta oficialmente na descrição do seu cargo?",
    ordem: 12,
    grupo: "funcao",
  },
  {
    chave: "cursos_eventos_interesse",
    titulo: "Cursos e eventos de interesse",
    pergunta: "Tem algum curso, congresso, feira ou evento que você tem interesse em participar ou que seu gestor tenha indicado? Explique como isso pode melhorar o desempenho da sua função.",
    ordem: 13,
    grupo: "desenvolvimento",
  },
  {
    chave: "formacao_academica_relacionada",
    titulo: "Formação acadêmica relacionada",
    pergunta: "Entre as graduações, MBAs ou pós-graduações sugeridas, quais fazem parte da sua formação acadêmica?",
    ordem: 14,
    grupo: "desenvolvimento",
  },
  {
    chave: "cursos_realizados",
    titulo: "Cursos já realizados",
    pergunta: "Entre os cursos extracurriculares recomendados, quais já fazem parte da sua trajetória de formação?",
    ordem: 15,
    grupo: "desenvolvimento",
  },
  {
    chave: "desenvolvimento_futuro",
    titulo: "Desenvolvimento futuro",
    pergunta: "Pensando no seu crescimento e no impacto positivo para o Sebrae, existem cursos, formações ou eventos que poderiam fortalecer ainda mais suas competências?",
    ordem: 16,
    grupo: "desenvolvimento",
  },
  {
    chave: "principal_atuacao",
    titulo: "Principal atuação",
    pergunta: "Pode explicar qual é a sua principal atuação atualmente?",
    ordem: 17,
    grupo: "funcao",
  },
];

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Sparkles, Loader2, Search, ChevronDown, X, Check } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';


type SubcompetenciaReferencia = {
  nome: string;
  justificativa: string;
};

type ReferenciaMetodologica = {
  competenciaAD: string;
  basicas: SubcompetenciaReferencia[];
  essenciais: SubcompetenciaReferencia[];
  master: {
    nome: string;
    justificativa: string;
  };
};

const referenciasMetodologicas: Record<string, ReferenciaMetodologica> = {
  'COMPORTAMENTAL - Relacionamento Interpessoal': {
    competenciaAD: 'COMPORTAMENTAL - Relacionamento Interpessoal',
    basicas: [
      {
        nome: 'Empatia',
        justificativa: 'Empatia é básica para o desenvolvimento de Relacionamento Interpessoal porque permite compreender perspectivas, necessidades e reações das outras pessoas. Sem essa capacidade, a interação tende a ficar centrada apenas no próprio ponto de vista, dificultando a construção de relações profissionais respeitosas e cooperativas.',
      },
      {
        nome: 'Escuta Ativa',
        justificativa: 'Escuta Ativa é básica para o desenvolvimento de Relacionamento Interpessoal porque permite compreender com precisão o que o outro comunica, inclusive necessidades e expectativas. Sem escuta qualificada, aumentam os ruídos, interpretações equivocadas e conflitos que prejudicam a qualidade das relações.',
      },
      {
        nome: 'Autopercepção',
        justificativa: 'Autopercepção é básica para o desenvolvimento de Relacionamento Interpessoal porque ajuda a pessoa a reconhecer como seu próprio comportamento, emoções e forma de comunicação afetam os outros. Sem essa consciência, torna-se mais difícil ajustar a própria conduta para manter relações produtivas.',
      },
    ],
    essenciais: [
      {
        nome: 'Comunicação Assertiva',
        justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Relacionamento Interpessoal porque permite expressar opiniões, limites e necessidades de forma clara e respeitosa. Sem assertividade, a relação pode ser prejudicada por omissões, agressividade ou mensagens ambíguas.',
      },
      {
        nome: 'Inteligência Emocional',
        justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Relacionamento Interpessoal porque permite administrar emoções próprias e compreender as emoções presentes nas interações. Sem essa capacidade, situações de tensão ou divergência podem comprometer a cooperação e a confiança.',
      },
    ],
    master: {
      nome: 'Relacionamento Interpessoal',
      justificativa: 'Relacionamento Interpessoal é a competência Master porque representa a integração das capacidades de compreender o outro, perceber o próprio impacto, comunicar-se adequadamente e administrar emoções para construir relações profissionais respeitosas, cooperativas e produtivas.',
    },
  },

  'COMPORTAMENTAL - Comunicação': {
    competenciaAD: 'COMPORTAMENTAL - Comunicação',
    basicas: [
      {
        nome: 'Escuta Ativa',
        justificativa: 'Escuta Ativa é básica para o desenvolvimento de Comunicação porque comunicar-se bem exige primeiro compreender corretamente a mensagem, a necessidade e o contexto do interlocutor. Sem essa capacidade, a resposta pode ser inadequada mesmo quando a pessoa se expressa com clareza.',
      },
      {
        nome: 'Empatia',
        justificativa: 'Empatia é básica para o desenvolvimento de Comunicação porque permite considerar o ponto de vista e as necessidades do interlocutor ao formular a mensagem. Sem essa leitura do outro, a comunicação pode ser tecnicamente correta, mas inadequada ao público ou ao contexto.',
      },
    ],
    essenciais: [
      {
        nome: 'Comunicação Assertiva',
        justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Comunicação porque transforma compreensão em mensagens claras, objetivas e respeitosas. Sem assertividade, a pessoa pode compreender o contexto, mas não conseguir posicionar-se de forma eficaz.',
      },
      {
        nome: 'Inteligência Emocional',
        justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Comunicação porque ajuda a regular tom, reação e escolha das palavras, especialmente em situações de pressão ou divergência. Sem esse controle, a emoção pode distorcer ou comprometer a mensagem.',
      },
    ],
    master: {
      nome: 'Comunicação',
      justificativa: 'Comunicação é a competência Master porque integra escuta, compreensão do interlocutor, clareza, assertividade e regulação emocional para produzir mensagens adequadas aos diferentes públicos, contextos e canais.',
    },
  },

  'COMPORTAMENTAL - Atendimento e Relacionamento com o Cliente': {
    competenciaAD: 'COMPORTAMENTAL - Atendimento e Relacionamento com o Cliente',
    basicas: [
      {
        nome: 'Empatia',
        justificativa: 'Empatia é básica para o desenvolvimento de Atendimento e Relacionamento com o Cliente porque permite compreender a necessidade do cliente para além do pedido explícito. Sem essa capacidade, o atendimento tende a ser mecânico e menos aderente à real demanda.',
      },
      {
        nome: 'Escuta Ativa',
        justificativa: 'Escuta Ativa é básica para o desenvolvimento de Atendimento e Relacionamento com o Cliente porque permite captar corretamente dúvidas, expectativas e problemas apresentados. Sem escuta qualificada, aumenta o risco de oferecer respostas ou soluções inadequadas.',
      },
      {
        nome: 'Atenção',
        justificativa: 'Atenção é básica para o desenvolvimento de Atendimento e Relacionamento com o Cliente porque permite perceber detalhes relevantes da solicitação, do contexto e dos sinais apresentados pelo cliente. Sem atenção, informações importantes podem ser ignoradas e comprometer a qualidade do atendimento.',
      },
    ],
    essenciais: [
      {
        nome: 'Comunicação Assertiva',
        justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Atendimento e Relacionamento com o Cliente porque permite orientar, esclarecer e alinhar expectativas de forma clara e respeitosa. Sem assertividade, o cliente pode receber informações incompletas, confusas ou inadequadas.',
      },
      {
        nome: 'Inteligência Emocional',
        justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Atendimento e Relacionamento com o Cliente porque ajuda a manter equilíbrio e postura profissional mesmo diante de reclamações, pressão ou frustração. Sem essa capacidade, situações difíceis podem deteriorar a relação com o cliente.',
      },
      {
        nome: 'Proatividade',
        justificativa: 'Proatividade é essencial para o desenvolvimento de Atendimento e Relacionamento com o Cliente porque permite antecipar necessidades, buscar soluções e assumir iniciativa diante de problemas. Sem proatividade, o atendimento tende a ficar restrito à resposta imediata, sem geração de valor para o cliente.',
      },
    ],
    master: {
      nome: 'Atendimento e Relacionamento com o Cliente',
      justificativa: 'Atendimento e Relacionamento com o Cliente é a competência Master porque integra compreensão da necessidade, atenção aos detalhes, comunicação adequada, equilíbrio emocional e iniciativa para entregar soluções e fortalecer a relação com clientes internos e externos.',
    },
  },

  'COMPORTAMENTAL - Ética, Integridade e Responsabilidade': {
    competenciaAD: 'COMPORTAMENTAL - Ética, Integridade e Responsabilidade',
    basicas: [
      {
        nome: 'Disciplina',
        justificativa: 'Disciplina é básica para o desenvolvimento de Ética, Integridade e Responsabilidade porque sustenta o cumprimento consistente de regras, compromissos e padrões mesmo quando não há supervisão direta. Sem disciplina, princípios podem ser aplicados de forma irregular.',
      },
      {
        nome: 'Atenção',
        justificativa: 'Atenção é básica para o desenvolvimento de Ética, Integridade e Responsabilidade porque permite perceber requisitos, riscos, limites e consequências presentes em uma situação. Sem atenção, a pessoa pode descumprir normas ou compromissos por não reconhecer aspectos relevantes do contexto.',
      },
      {
        nome: 'Autopercepção',
        justificativa: 'Autopercepção é básica para o desenvolvimento de Ética, Integridade e Responsabilidade porque ajuda a reconhecer interesses, vieses e reações pessoais que podem influenciar decisões. Sem essa consciência, torna-se mais difícil avaliar o próprio comportamento de forma responsável.',
      },
    ],
    essenciais: [
      {
        nome: 'Comunicação Assertiva',
        justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Ética, Integridade e Responsabilidade porque permite registrar posições, sinalizar riscos, recusar condutas inadequadas e comunicar limites com clareza. Sem assertividade, problemas éticos podem ser silenciados ou tratados de forma ambígua.',
      },
      {
        nome: 'Planejamento e Organização',
        justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Ética, Integridade e Responsabilidade porque ajuda a garantir que compromissos, controles, prazos e obrigações sejam efetivamente cumpridos. Sem organização, mesmo boas intenções podem resultar em falhas de responsabilidade.',
      },
      {
        nome: 'Proatividade',
        justificativa: 'Proatividade é essencial para o desenvolvimento de Ética, Integridade e Responsabilidade porque implica agir diante de riscos, inconsistências ou responsabilidades sem esperar que outra pessoa intervenha. Sem proatividade, situações inadequadas podem permanecer sem tratamento.',
      },
    ],
    master: {
      nome: 'Ética, Integridade e Responsabilidade',
      justificativa: 'Ética, Integridade e Responsabilidade é a competência Master porque integra consciência, disciplina, cumprimento de compromissos, comunicação transparente e iniciativa para agir de acordo com normas, valores e princípios organizacionais.',
    },
  },

  'COMPORTAMENTAL - Inteligência Emocional e Autoconhecimento': {
    competenciaAD: 'COMPORTAMENTAL - Inteligência Emocional e Autoconhecimento',
    basicas: [
      {
        nome: 'Autopercepção',
        justificativa: 'Autopercepção é básica para o desenvolvimento de Inteligência Emocional e Autoconhecimento porque a pessoa precisa primeiro reconhecer suas próprias emoções, padrões de reação, limites e gatilhos. Sem essa percepção, não há base para regular conscientemente o próprio comportamento.',
      },
      {
        nome: 'Empatia',
        justificativa: 'Empatia é básica para o desenvolvimento de Inteligência Emocional e Autoconhecimento porque amplia a capacidade de perceber emoções e perspectivas de outras pessoas. Sem essa leitura do outro, a inteligência emocional fica restrita ao mundo interno e perde eficácia nas relações.',
      },
      {
        nome: 'Escuta Ativa',
        justificativa: 'Escuta Ativa é básica para o desenvolvimento de Inteligência Emocional e Autoconhecimento porque permite captar sinais, sentimentos e informações que ajudam a compreender o impacto das próprias ações e das emoções nas interações. Sem escuta, parte importante desse aprendizado se perde.',
      },
    ],
    essenciais: [
      {
        nome: 'Inteligência Emocional',
        justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Inteligência Emocional e Autoconhecimento porque transforma a percepção das emoções em capacidade de regulá-las e utilizá-las de forma construtiva. Sem essa regulação, reconhecer emoções não é suficiente para mudar comportamento.',
      },
      {
        nome: 'Resiliência',
        justificativa: 'Resiliência é essencial para o desenvolvimento de Inteligência Emocional e Autoconhecimento porque permite lidar com frustração, pressão e adversidade sem perder estabilidade. Sem resiliência, o conhecimento sobre si mesmo pode não se converter em resposta emocional mais madura diante de dificuldades.',
      },
      {
        nome: 'Adaptabilidade',
        justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Inteligência Emocional e Autoconhecimento porque permite ajustar comportamentos a partir da leitura das próprias emoções e do contexto. Sem capacidade de adaptação, o autoconhecimento não se traduz em mudança prática.',
      },
    ],
    master: {
      nome: 'Inteligência Emocional e Autoconhecimento',
      justificativa: 'Inteligência Emocional e Autoconhecimento é a competência Master porque integra consciência de si, compreensão do outro, regulação emocional, resiliência e capacidade de ajustar o comportamento de forma consciente e funcional.',
    },
  },

  'COMPORTAMENTAL - Adaptabilidade, Flexibilidade e Resiliência': {
    competenciaAD: 'COMPORTAMENTAL - Adaptabilidade, Flexibilidade e Resiliência',
    basicas: [
      {
        nome: 'Autopercepção',
        justificativa: 'Autopercepção é básica para o desenvolvimento de Adaptabilidade, Flexibilidade e Resiliência porque permite reconhecer como a pessoa reage a mudanças, incertezas e pressões. Sem essa consciência, torna-se mais difícil identificar o que precisa ser ajustado no próprio comportamento.',
      },
      {
        nome: 'Disciplina',
        justificativa: 'Disciplina é básica para o desenvolvimento de Adaptabilidade, Flexibilidade e Resiliência porque ajuda a preservar constância e compromisso mesmo quando rotinas, prioridades ou condições mudam. Sem disciplina, a mudança pode gerar perda de organização e continuidade.',
      },
      {
        nome: 'Atenção',
        justificativa: 'Atenção é básica para o desenvolvimento de Adaptabilidade, Flexibilidade e Resiliência porque permite perceber alterações no ambiente, novos riscos e sinais que exigem mudança de abordagem. Sem atenção ao contexto, a pessoa pode insistir em respostas que deixaram de ser adequadas.',
      },
    ],
    essenciais: [
      {
        nome: 'Adaptabilidade',
        justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Adaptabilidade, Flexibilidade e Resiliência porque permite modificar estratégias, comportamentos e formas de atuação diante de novas condições. Sem adaptação, não há resposta efetiva à mudança.',
      },
      {
        nome: 'Resiliência',
        justificativa: 'Resiliência é essencial para o desenvolvimento de Adaptabilidade, Flexibilidade e Resiliência porque permite recuperar-se de dificuldades, sustentar o desempenho e continuar atuando diante de adversidades. Sem resiliência, a mudança pode gerar paralisação ou perda prolongada de desempenho.',
      },
      {
        nome: 'Inteligência Emocional',
        justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Adaptabilidade, Flexibilidade e Resiliência porque ajuda a administrar medo, frustração, ansiedade e resistência provocados pelas mudanças. Sem regulação emocional, a pessoa pode compreender a necessidade de mudar, mas não conseguir agir de forma flexível.',
      },
    ],
    master: {
      nome: 'Adaptabilidade, Flexibilidade e Resiliência',
      justificativa: 'Adaptabilidade, Flexibilidade e Resiliência é a competência Master porque integra percepção do contexto e de si mesmo, estabilidade diante da pressão e capacidade de ajustar comportamento e estratégia sem perder continuidade e desempenho.',
    },
  },

  'COMPORTAMENTAL - Protagonismo, Autogestão e Responsabilidade Profissional': {
    competenciaAD: 'COMPORTAMENTAL - Protagonismo, Autogestão e Responsabilidade Profissional',
    basicas: [
      { nome: 'Disciplina', justificativa: 'Disciplina é básica para o desenvolvimento de Protagonismo, Autogestão e Responsabilidade Profissional porque sustenta constância, cumprimento de compromissos e capacidade de conduzir as próprias entregas sem depender de supervisão contínua. Sem disciplina, a autonomia tende a perder consistência.' },
      { nome: 'Gestão de Tempo', justificativa: 'Gestão de Tempo é básica para o desenvolvimento de Protagonismo, Autogestão e Responsabilidade Profissional porque permite organizar prioridades e administrar recursos pessoais para cumprir responsabilidades. Sem essa capacidade, a pessoa pode ter iniciativa, mas não transformar intenção em execução confiável.' },
      { nome: 'Autopercepção', justificativa: 'Autopercepção é básica para o desenvolvimento de Protagonismo, Autogestão e Responsabilidade Profissional porque permite reconhecer limites, padrões de comportamento e pontos de melhoria. Sem essa consciência, torna-se mais difícil assumir responsabilidade real sobre o próprio desempenho.' },
    ],
    essenciais: [
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Protagonismo, Autogestão e Responsabilidade Profissional porque leva a pessoa a agir antes de ser cobrada, antecipar necessidades e buscar soluções. Sem iniciativa, não há protagonismo efetivo.' },
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Protagonismo, Autogestão e Responsabilidade Profissional porque transforma autonomia em execução estruturada. Sem organização, a pessoa pode assumir responsabilidades, mas falhar na priorização e no acompanhamento das entregas.' },
      { nome: 'Inteligência Emocional', justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Protagonismo, Autogestão e Responsabilidade Profissional porque permite administrar frustração, pressão e feedback sem transferir a responsabilidade para fatores externos. Sem regulação emocional, a autogestão pode se fragilizar diante de dificuldades.' },
    ],
    master: {
      nome: 'Protagonismo, Autogestão e Responsabilidade Profissional',
      justificativa: 'Protagonismo, Autogestão e Responsabilidade Profissional é a competência Master porque integra disciplina, organização, consciência de si, iniciativa e capacidade de assumir responsabilidade pelas próprias decisões e entregas.',
    },
  },

  'COMPORTAMENTAL - Presença Executiva e Postura Profissional': {
    competenciaAD: 'COMPORTAMENTAL - Presença Executiva e Postura Profissional',
    basicas: [
      { nome: 'Autopercepção', justificativa: 'Autopercepção é básica para o desenvolvimento de Presença Executiva e Postura Profissional porque permite reconhecer como comportamento, linguagem, emoções e imagem pessoal são percebidos pelos outros. Sem essa consciência, fica difícil ajustar a própria presença ao contexto profissional.' },
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Presença Executiva e Postura Profissional porque ajuda a perceber sinais do ambiente, expectativas institucionais e reações dos interlocutores. Sem atenção ao contexto, a postura pode se tornar inadequada à situação.' },
      { nome: 'Disciplina', justificativa: 'Disciplina é básica para o desenvolvimento de Presença Executiva e Postura Profissional porque sustenta consistência de comportamento, pontualidade, preparação e cumprimento de padrões. Sem consistência, a imagem profissional perde credibilidade.' },
    ],
    essenciais: [
      { nome: 'Comunicação Assertiva', justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Presença Executiva e Postura Profissional porque permite posicionar-se com clareza, segurança e respeito. Sem assertividade, a presença pode parecer insegura, agressiva ou pouco convincente.' },
      { nome: 'Inteligência Emocional', justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Presença Executiva e Postura Profissional porque permite manter equilíbrio e coerência comportamental sob pressão. Sem regulação emocional, a credibilidade pode ser comprometida em situações críticas.' },
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Presença Executiva e Postura Profissional porque permite ajustar postura, linguagem e nível de formalidade ao contexto. Sem essa leitura, a pessoa pode se posicionar de forma inadequada ao ambiente ou ao público.' },
    ],
    master: {
      nome: 'Presença Executiva e Postura Profissional',
      justificativa: 'Presença Executiva e Postura Profissional é a competência Master porque integra consciência de si, leitura do ambiente, comunicação segura, equilíbrio emocional e consistência comportamental para gerar credibilidade e confiança.',
    },
  },

  'COMPORTAMENTAL - Gestão do Tempo, Organização e Disciplina': {
    competenciaAD: 'COMPORTAMENTAL - Gestão do Tempo, Organização e Disciplina',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Gestão do Tempo, Organização e Disciplina porque permite identificar demandas, prazos e prioridades relevantes. Sem atenção, tarefas importantes podem ser esquecidas ou tratadas fora de ordem.' },
      { nome: 'Memória', justificativa: 'Memória é básica para o desenvolvimento de Gestão do Tempo, Organização e Disciplina porque apoia retenção de compromissos, rotinas e informações necessárias à execução. Sem esse suporte, aumenta a dependência de retrabalho e correções.' },
      { nome: 'Disciplina', justificativa: 'Disciplina é básica para o desenvolvimento de Gestão do Tempo, Organização e Disciplina porque sustenta regularidade, cumprimento de prazos e manutenção de rotinas. Sem disciplina, planejamento e organização não se mantêm ao longo do tempo.' },
    ],
    essenciais: [
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Gestão do Tempo, Organização e Disciplina porque permite estruturar atividades, sequências e prioridades. Sem planejamento, o tempo tende a ser consumido de forma reativa.' },
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Gestão do Tempo, Organização e Disciplina porque estimula antecipação de demandas e prevenção de atrasos. Sem iniciativa, a gestão do tempo fica dependente apenas de urgências externas.' },
      { nome: 'Adaptabilidade', justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Gestão do Tempo, Organização e Disciplina porque permite reorganizar prioridades quando surgem mudanças sem perder controle das entregas. Sem flexibilidade, qualquer imprevisto pode desestruturar o planejamento.' },
    ],
    master: {
      nome: 'Gestão do Tempo, Organização e Disciplina',
      justificativa: 'Gestão do Tempo, Organização e Disciplina é a competência Master porque integra atenção, memória, disciplina, planejamento e capacidade de adaptação para priorizar atividades, cumprir prazos e manter execução consistente.',
    },
  },

  'COMPORTAMENTAL - Liderança e Gestão de Pessoas': {
    competenciaAD: 'COMPORTAMENTAL - Liderança e Gestão de Pessoas',
    basicas: [
      { nome: 'Empatia', justificativa: 'Empatia é básica para o desenvolvimento de Liderança e Gestão de Pessoas porque permite compreender necessidades, motivações e dificuldades da equipe. Sem essa compreensão, a gestão tende a se tornar distante e pouco aderente às pessoas.' },
      { nome: 'Escuta Ativa', justificativa: 'Escuta Ativa é básica para o desenvolvimento de Liderança e Gestão de Pessoas porque permite captar informações, preocupações e percepções essenciais para orientar e desenvolver a equipe. Sem escuta, decisões de gestão podem ser tomadas com visão incompleta.' },
      { nome: 'Autopercepção', justificativa: 'Autopercepção é básica para o desenvolvimento de Liderança e Gestão de Pessoas porque ajuda o líder a reconhecer seu impacto sobre a equipe. Sem essa consciência, comportamentos do próprio líder podem gerar desengajamento sem que ele perceba.' },
    ],
    essenciais: [
      { nome: 'Comunicação Assertiva', justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Liderança e Gestão de Pessoas porque permite orientar, dar feedback, alinhar expectativas e tratar problemas com clareza. Sem assertividade, a equipe recebe mensagens ambíguas ou inconsistentes.' },
      { nome: 'Inteligência Emocional', justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Liderança e Gestão de Pessoas porque sustenta equilíbrio, empatia e tomada de posição em situações de pressão ou conflito. Sem regulação emocional, a liderança perde previsibilidade e segurança.' },
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Liderança e Gestão de Pessoas porque permite transformar objetivos em prioridades, responsabilidades e acompanhamento. Sem organização, a liderança pode inspirar, mas não conduzir a execução.' },
    ],
    master: {
      nome: 'Liderança e Gestão de Pessoas',
      justificativa: 'Liderança e Gestão de Pessoas é a competência Master porque integra compreensão das pessoas, comunicação, equilíbrio emocional e organização para orientar, desenvolver, engajar e direcionar equipes para resultados.',
    },
  },

  'COMPORTAMENTAL - Gestão de Equipes e Clima Organizacional': {
    competenciaAD: 'COMPORTAMENTAL - Gestão de Equipes e Clima Organizacional',
    basicas: [
      { nome: 'Empatia', justificativa: 'Empatia é básica para o desenvolvimento de Gestão de Equipes e Clima Organizacional porque permite compreender diferenças, necessidades e percepções presentes no grupo. Sem empatia, conflitos e insatisfações podem ser ignorados ou mal interpretados.' },
      { nome: 'Escuta Ativa', justificativa: 'Escuta Ativa é básica para o desenvolvimento de Gestão de Equipes e Clima Organizacional porque permite captar sinais de clima, dificuldades e expectativas da equipe. Sem escuta, problemas coletivos podem permanecer invisíveis até se tornarem mais graves.' },
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Gestão de Equipes e Clima Organizacional porque ajuda a perceber mudanças de comportamento, relações e padrões de interação. Sem atenção ao ambiente, o gestor perde sinais importantes sobre o funcionamento da equipe.' },
    ],
    essenciais: [
      { nome: 'Inteligência Emocional', justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Gestão de Equipes e Clima Organizacional porque permite lidar com tensões, emoções coletivas e diferenças individuais sem ampliar conflitos. Sem essa capacidade, o clima pode se deteriorar diante de situações difíceis.' },
      { nome: 'Comunicação Assertiva', justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Gestão de Equipes e Clima Organizacional porque permite alinhar expectativas, regras e feedbacks de forma clara e respeitosa. Sem assertividade, surgem ruídos e percepções de injustiça.' },
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Gestão de Equipes e Clima Organizacional porque ajuda a distribuir responsabilidades e organizar rotinas com clareza. Sem organização, sobrecargas e ambiguidades podem afetar negativamente o clima.' },
    ],
    master: {
      nome: 'Gestão de Equipes e Clima Organizacional',
      justificativa: 'Gestão de Equipes e Clima Organizacional é a competência Master porque integra percepção do grupo, comunicação, equilíbrio emocional e organização para promover cooperação, confiança e condições adequadas de trabalho coletivo.',
    },
  },

  'COMPORTAMENTAL - Desenvolvimento de Pessoas, Carreira e Sucessão': {
    competenciaAD: 'COMPORTAMENTAL - Desenvolvimento de Pessoas, Carreira e Sucessão',
    basicas: [
      { nome: 'Empatia', justificativa: 'Empatia é básica para o desenvolvimento de Desenvolvimento de Pessoas, Carreira e Sucessão porque permite compreender aspirações, necessidades e diferentes ritmos de desenvolvimento. Sem empatia, o desenvolvimento pode ser tratado de forma padronizada e pouco efetiva.' },
      { nome: 'Escuta Ativa', justificativa: 'Escuta Ativa é básica para o desenvolvimento de Desenvolvimento de Pessoas, Carreira e Sucessão porque permite compreender interesses, dificuldades e objetivos profissionais. Sem escuta, decisões sobre desenvolvimento podem não refletir a realidade da pessoa.' },
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Desenvolvimento de Pessoas, Carreira e Sucessão porque permite observar desempenho, potencial e sinais de prontidão. Sem atenção, talentos e lacunas podem passar despercebidos.' },
    ],
    essenciais: [
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Desenvolvimento de Pessoas, Carreira e Sucessão porque permite transformar diagnósticos em planos, etapas e acompanhamento. Sem planejamento, o desenvolvimento fica dependente de ações isoladas.' },
      { nome: 'Comunicação Assertiva', justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Desenvolvimento de Pessoas, Carreira e Sucessão porque permite realizar conversas de carreira, feedbacks e alinhamentos com clareza. Sem assertividade, expectativas e critérios podem ficar confusos.' },
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Desenvolvimento de Pessoas, Carreira e Sucessão porque permite conectar necessidades futuras da organização ao desenvolvimento das pessoas. Sem essa leitura, planos de carreira podem não preparar talentos para desafios reais.',
      },
    ],
    master: {
      nome: 'Desenvolvimento de Pessoas, Carreira e Sucessão',
      justificativa: 'Desenvolvimento de Pessoas, Carreira e Sucessão é a competência Master porque integra compreensão das pessoas, observação de potencial, planejamento, comunicação e leitura das necessidades futuras para desenvolver talentos e preparar continuidade organizacional.',
    },
  },

  'COMPORTAMENTAL - Tomada de Decisão e Julgamento Técnico': {
    competenciaAD: 'COMPORTAMENTAL - Tomada de Decisão e Julgamento Técnico',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Tomada de Decisão e Julgamento Técnico porque permite identificar dados, riscos e detalhes relevantes antes de decidir. Sem atenção, elementos críticos podem ser ignorados.' },
      { nome: 'Memória', justificativa: 'Memória é básica para o desenvolvimento de Tomada de Decisão e Julgamento Técnico porque permite recuperar experiências, regras e informações que apoiam a análise. Sem esse repertório acessível, o julgamento pode ficar superficial.' },
      { nome: 'Raciocínio Lógico e Espacial', justificativa: 'Raciocínio Lógico e Espacial é básico para o desenvolvimento de Tomada de Decisão e Julgamento Técnico porque permite organizar informações, comparar alternativas e compreender relações de causa e consequência. Sem análise lógica, a decisão tende a se apoiar excessivamente em impressões.' },
    ],
    essenciais: [
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Tomada de Decisão e Julgamento Técnico porque permite compreender contexto, impactos e variáveis envolvidas. Sem essa leitura, uma decisão tecnicamente correta pode ser inadequada ao contexto.' },
      { nome: 'Inteligência Emocional', justificativa: 'Inteligência Emocional é essencial para o desenvolvimento de Tomada de Decisão e Julgamento Técnico porque ajuda a reduzir reações impulsivas e vieses provocados por pressão ou conflito. Sem regulação emocional, a qualidade do julgamento pode ser comprometida.' },
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Tomada de Decisão e Julgamento Técnico porque ajuda a estruturar critérios, evidências e consequências antes de decidir. Sem método, a análise pode ficar incompleta ou inconsistente.' },
    ],
    master: {
      nome: 'Tomada de Decisão e Julgamento Técnico',
      justificativa: 'Tomada de Decisão e Julgamento Técnico é a competência Master porque integra atenção, memória, análise lógica, leitura de contexto e equilíbrio emocional para selecionar alternativas fundamentadas e responsáveis.',
    },
  },

  'COMPORTAMENTAL - Planejamento, Foco e Resultados': {
    competenciaAD: 'COMPORTAMENTAL - Planejamento, Foco e Resultados',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Planejamento, Foco e Resultados porque permite identificar prioridades, critérios e desvios relevantes. Sem atenção, esforços podem ser direcionados para atividades de baixo impacto.' },
      { nome: 'Disciplina', justificativa: 'Disciplina é básica para o desenvolvimento de Planejamento, Foco e Resultados porque sustenta execução consistente ao longo do tempo. Sem disciplina, metas e planos tendem a perder continuidade.' },
      { nome: 'Gestão de Tempo', justificativa: 'Gestão de Tempo é básica para o desenvolvimento de Planejamento, Foco e Resultados porque permite transformar prioridades em alocação concreta de tempo e energia. Sem essa capacidade, o foco pode ser consumido por urgências e dispersões.' },
    ],
    essenciais: [
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Planejamento, Foco e Resultados porque estrutura objetivos, etapas, prioridades e recursos. Sem planejamento, o esforço não se converte de forma previsível em resultado.' },
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Planejamento, Foco e Resultados porque permite agir diante de obstáculos e antecipar necessidades antes que comprometam a meta. Sem iniciativa, o plano pode permanecer apenas no papel.' },
      { nome: 'Resiliência', justificativa: 'Resiliência é essencial para o desenvolvimento de Planejamento, Foco e Resultados porque permite manter esforço e direcionamento diante de dificuldades e atrasos. Sem resiliência, obstáculos podem provocar abandono prematuro das metas.' },
    ],
    master: {
      nome: 'Planejamento, Foco e Resultados',
      justificativa: 'Planejamento, Foco e Resultados é a competência Master porque integra atenção, disciplina, gestão do tempo, planejamento, iniciativa e resiliência para transformar objetivos em entregas consistentes.',
    },
  },

  'COMPORTAMENTAL - Estratégia, Visão Sistêmica e Indicadores': {
    competenciaAD: 'COMPORTAMENTAL - Estratégia, Visão Sistêmica e Indicadores',
    basicas: [
      { nome: 'Raciocínio Lógico e Espacial', justificativa: 'Raciocínio Lógico e Espacial é básico para o desenvolvimento de Estratégia, Visão Sistêmica e Indicadores porque permite analisar situações de forma estruturada, compreender relações entre variáveis e identificar causas e consequências. Sem essa capacidade, torna-se difícil interpretar o contexto e construir uma leitura estratégica consistente.' },
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Estratégia, Visão Sistêmica e Indicadores porque permite perceber sinais, tendências, desvios e informações relevantes. Sem atenção, elementos importantes do sistema podem ser ignorados.' },
      { nome: 'Memória', justificativa: 'Memória é básica para o desenvolvimento de Estratégia, Visão Sistêmica e Indicadores porque apoia a conexão entre dados atuais, experiências anteriores e padrões recorrentes. Sem esse repertório, a análise estratégica perde profundidade.' },
    ],
    essenciais: [
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Estratégia, Visão Sistêmica e Indicadores porque permite interpretar contexto interno e externo e compreender impactos sobre a organização. Sem essa leitura, a estratégia fica desconectada da realidade.' },
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Estratégia, Visão Sistêmica e Indicadores porque transforma análise em prioridades, objetivos e acompanhamento. Sem organização, a estratégia não se converte em execução monitorável.' },
      { nome: 'Adaptabilidade', justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Estratégia, Visão Sistêmica e Indicadores porque permite revisar rumos diante de novos dados e mudanças de cenário. Sem adaptação, a estratégia pode permanecer presa a premissas que já não são válidas.' },
    ],
    master: {
      nome: 'Estratégia, Visão Sistêmica e Indicadores',
      justificativa: 'Estratégia, Visão Sistêmica e Indicadores é a competência Master porque integra análise lógica, leitura de contexto, conexão entre partes, definição de prioridades e acompanhamento por evidências para orientar decisões de longo alcance.',
    },
  },

  'COMPORTAMENTAL - Gestão de Projetos e Processos': {
    competenciaAD: 'COMPORTAMENTAL - Gestão de Projetos e Processos',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Gestão de Projetos e Processos porque permite acompanhar detalhes, dependências, prazos e desvios. Sem atenção, falhas operacionais podem passar despercebidas.' },
      { nome: 'Disciplina', justificativa: 'Disciplina é básica para o desenvolvimento de Gestão de Projetos e Processos porque sustenta execução de rotinas, acompanhamento e cumprimento de etapas. Sem disciplina, o processo perde previsibilidade.' },
      { nome: 'Gestão de Tempo', justificativa: 'Gestão de Tempo é básica para o desenvolvimento de Gestão de Projetos e Processos porque ajuda a distribuir esforço, respeitar cronogramas e lidar com prioridades concorrentes. Sem essa capacidade, atrasos e sobrecargas se tornam mais prováveis.' },
    ],
    essenciais: [
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Gestão de Projetos e Processos porque permite estruturar escopo, etapas, responsáveis, recursos e prazos. Sem planejamento, a execução fica fragmentada.' },
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Gestão de Projetos e Processos porque permite antecipar riscos, remover impedimentos e agir antes que desvios comprometam a entrega. Sem iniciativa, problemas tendem a ser tratados apenas depois de acontecerem.' },
      { nome: 'Adaptabilidade', justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Gestão de Projetos e Processos porque permite ajustar planos e fluxos diante de mudanças sem perder o objetivo final. Sem flexibilidade, alterações inevitáveis podem paralisar a execução.' },
    ],
    master: {
      nome: 'Gestão de Projetos e Processos',
      justificativa: 'Gestão de Projetos e Processos é a competência Master porque integra atenção, disciplina, gestão do tempo, planejamento, iniciativa e capacidade de adaptação para estruturar, executar, monitorar e aprimorar entregas.',
    },
  },

  'COMPORTAMENTAL - Resolução de Problemas e Melhoria Contínua': {
    competenciaAD: 'COMPORTAMENTAL - Resolução de Problemas e Melhoria Contínua',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Resolução de Problemas e Melhoria Contínua porque permite identificar desvios, padrões e sinais de problema. Sem atenção, causas relevantes podem permanecer invisíveis.' },
      { nome: 'Raciocínio Lógico e Espacial', justificativa: 'Raciocínio Lógico e Espacial é básico para o desenvolvimento de Resolução de Problemas e Melhoria Contínua porque permite decompor problemas, organizar evidências e estabelecer relações de causa e efeito. Sem análise lógica, soluções podem tratar apenas sintomas.' },
      { nome: 'Memória', justificativa: 'Memória é básica para o desenvolvimento de Resolução de Problemas e Melhoria Contínua porque ajuda a recuperar experiências, tentativas anteriores e aprendizados que evitam repetição de erros. Sem esse repertório, a organização pode voltar às mesmas soluções ineficazes.' },
    ],
    essenciais: [
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Resolução de Problemas e Melhoria Contínua porque permite compreender o problema dentro do contexto em que ocorre. Sem contexto, a solução pode gerar novos impactos negativos.' },
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Resolução de Problemas e Melhoria Contínua porque leva a pessoa a agir sobre causas e oportunidades de melhoria sem esperar agravamento. Sem iniciativa, problemas conhecidos podem se repetir.' },
      { nome: 'Adaptabilidade', justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Resolução de Problemas e Melhoria Contínua porque permite testar alternativas e ajustar a solução conforme os resultados. Sem flexibilidade, a pessoa pode insistir em abordagens que não funcionam.' },
    ],
    master: {
      nome: 'Resolução de Problemas e Melhoria Contínua',
      justificativa: 'Resolução de Problemas e Melhoria Contínua é a competência Master porque integra percepção, análise lógica, aprendizagem, leitura de contexto, iniciativa e adaptação para eliminar causas e aperfeiçoar continuamente a forma de trabalhar.',
    },
  },

  'COMPORTAMENTAL - Governança, Controles Internos e Compliance': {
    competenciaAD: 'COMPORTAMENTAL - Governança, Controles Internos e Compliance',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Governança, Controles Internos e Compliance porque permite perceber requisitos, exceções, riscos e evidências relevantes. Sem atenção, falhas de conformidade podem passar despercebidas.' },
      { nome: 'Disciplina', justificativa: 'Disciplina é básica para o desenvolvimento de Governança, Controles Internos e Compliance porque sustenta cumprimento consistente de procedimentos, registros e controles. Sem disciplina, os mecanismos de governança perdem confiabilidade.' },
      { nome: 'Memória', justificativa: 'Memória é básica para o desenvolvimento de Governança, Controles Internos e Compliance porque ajuda a reter normas, procedimentos e padrões que orientam decisões recorrentes. Sem esse repertório, aumenta a dependência de correções posteriores.' },
    ],
    essenciais: [
      { nome: 'Planejamento e Organização', justificativa: 'Planejamento e Organização é essencial para o desenvolvimento de Governança, Controles Internos e Compliance porque permite estruturar controles, responsabilidades, evidências e prazos. Sem organização, a conformidade pode ficar informal e difícil de comprovar.' },
      { nome: 'Comunicação Assertiva', justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Governança, Controles Internos e Compliance porque permite orientar condutas, registrar riscos e sinalizar não conformidades de forma clara. Sem assertividade, problemas podem ser minimizados ou mal compreendidos.' },
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Governança, Controles Internos e Compliance porque exige agir preventivamente diante de riscos e fragilidades. Sem iniciativa, o sistema de controles fica apenas reativo.' },
    ],
    master: {
      nome: 'Governança, Controles Internos e Compliance',
      justificativa: 'Governança, Controles Internos e Compliance é a competência Master porque integra atenção, disciplina, conhecimento de regras, organização, comunicação e prevenção para assegurar atuação transparente, controlada e em conformidade.',
    },
  },

  'COMPORTAMENTAL - Integração Organizacional e Trabalho Interáreas': {
    competenciaAD: 'COMPORTAMENTAL - Integração Organizacional e Trabalho Interáreas',
    basicas: [
      { nome: 'Empatia', justificativa: 'Empatia é básica para o desenvolvimento de Integração Organizacional e Trabalho Interáreas porque permite compreender prioridades, limitações e perspectivas de outras áreas. Sem essa compreensão, surgem julgamentos e barreiras à cooperação.' },
      { nome: 'Escuta Ativa', justificativa: 'Escuta Ativa é básica para o desenvolvimento de Integração Organizacional e Trabalho Interáreas porque permite captar necessidades e informações provenientes de diferentes áreas. Sem escuta, acordos podem ser construídos sobre interpretações incompletas.' },
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Integração Organizacional e Trabalho Interáreas porque ajuda a perceber dependências, impactos e pontos de conexão entre atividades. Sem atenção ao todo, cada área tende a atuar de forma isolada.' },
    ],
    essenciais: [
      { nome: 'Comunicação Assertiva', justificativa: 'Comunicação Assertiva é essencial para o desenvolvimento de Integração Organizacional e Trabalho Interáreas porque permite alinhar responsabilidades, expectativas e informações entre áreas. Sem assertividade, ruídos e retrabalho aumentam.' },
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Integração Organizacional e Trabalho Interáreas porque permite compreender como decisões locais afetam outras áreas e o resultado institucional. Sem essa visão, prevalece a lógica de silos.' },
      { nome: 'Adaptabilidade', justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Integração Organizacional e Trabalho Interáreas porque permite negociar ajustes e rever formas de atuação diante de necessidades coletivas. Sem flexibilidade, acordos interáreas se tornam mais difíceis.' },
    ],
    master: {
      nome: 'Integração Organizacional e Trabalho Interáreas',
      justificativa: 'Integração Organizacional e Trabalho Interáreas é a competência Master porque integra compreensão do outro, circulação de informação, visão de dependências e capacidade de ajustar a atuação para produzir resultados coletivos.',
    },
  },

  'COMPORTAMENTAL - Inovação, Criatividade e Visão de Futuro': {
    competenciaAD: 'COMPORTAMENTAL - Inovação, Criatividade e Visão de Futuro',
    basicas: [
      { nome: 'Atenção', justificativa: 'Atenção é básica para o desenvolvimento de Inovação, Criatividade e Visão de Futuro porque permite perceber mudanças, necessidades não atendidas e oportunidades emergentes. Sem atenção ao ambiente, novas possibilidades tendem a passar despercebidas.' },
      { nome: 'Raciocínio Lógico e Espacial', justificativa: 'Raciocínio Lógico e Espacial é básico para o desenvolvimento de Inovação, Criatividade e Visão de Futuro porque ajuda a combinar informações, testar relações e avaliar coerência de novas ideias. Sem análise lógica, criatividade pode não se transformar em solução viável.' },
      { nome: 'Memória', justificativa: 'Memória é básica para o desenvolvimento de Inovação, Criatividade e Visão de Futuro porque permite conectar experiências e conhecimentos anteriores a novos contextos. Sem repertório, fica mais difícil recombinar referências para produzir alternativas originais.' },
    ],
    essenciais: [
      { nome: 'Leitura de Cenário', justificativa: 'Leitura de Cenário é essencial para o desenvolvimento de Inovação, Criatividade e Visão de Futuro porque permite identificar tendências, mudanças e necessidades futuras. Sem essa leitura, a inovação pode resolver problemas do passado em vez de preparar a organização para o futuro.' },
      { nome: 'Adaptabilidade', justificativa: 'Adaptabilidade é essencial para o desenvolvimento de Inovação, Criatividade e Visão de Futuro porque permite abandonar soluções antigas e experimentar novas abordagens. Sem flexibilidade, novas ideias tendem a ser rejeitadas antes de serem testadas.' },
      { nome: 'Proatividade', justificativa: 'Proatividade é essencial para o desenvolvimento de Inovação, Criatividade e Visão de Futuro porque leva a pessoa a transformar oportunidades percebidas em experimentação e ação. Sem iniciativa, ideias permanecem apenas como possibilidades.',
      },
    ],
    master: {
      nome: 'Inovação, Criatividade e Visão de Futuro',
      justificativa: 'Inovação, Criatividade e Visão de Futuro é a competência Master porque integra percepção de oportunidades, repertório, análise, leitura de tendências, flexibilidade e iniciativa para criar soluções novas e preparar a organização para cenários futuros.',
    },
  }
};

export function AcoesNova() {
  const [, navigate] = useLocation();
  const searchString = useSearch(); 

  const [formData, setFormData] = useState({
    pdiId: '',
    macroId: '',
    microcompetencia: '',
    titulo: '',
    descricao: '',
    prazo: '',
  });

  const [modoCriacao, setModoCriacao] = useState<"nova" | "biblioteca">("nova");
  const [buscaBiblioteca, setBuscaBiblioteca] = useState("");
  const [macroBiblioteca, setMacroBiblioteca] = useState("");
  const [eixoBiblioteca, setEixoBiblioteca] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  // Estado para busca de competências
  const [macroSearchTerm, setMacroSearchTerm] = useState('');
  const [macroDropdownOpen, setMacroDropdownOpen] = useState(false);
  const macroDropdownRef = useRef<HTMLDivElement>(null);
  
  // Estado para busca de PDI/colaborador
  const [pdiSearchTerm, setPdiSearchTerm] = useState('');
  const [pdiDropdownOpen, setPdiDropdownOpen] = useState(false);
  const pdiDropdownRef = useRef<HTMLDivElement>(null);

  // Buscando dados
  const { data: pdis = [], isLoading: loadingPdis } = trpc.pdis.list.useQuery();
  const { data: macros = [], isLoading: loadingMacros } = trpc.competencias.listAllMacros.useQuery();
  const { data: biblioteca = [], isLoading: loadingBiblioteca } = trpc.actions.library.useQuery();

  const eixosBiblioteca = useMemo(() => {
    return Array.from(
      new Set(
        (biblioteca as any[])
          .map((modelo) => String(modelo.microcompetencia ?? "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [biblioteca]);

  const modelosBiblioteca = useMemo(() => {
    const termo = buscaBiblioteca.trim().toLocaleLowerCase("pt-BR");
    return (biblioteca as any[]).filter((modelo) => {
      const atendeMacro = !macroBiblioteca || String(modelo.macroId ?? "") === macroBiblioteca;
      const atendeEixo =
        !eixoBiblioteca ||
        String(modelo.microcompetencia ?? "").trim() === eixoBiblioteca;
      const atendeBusca = !termo || [modelo.titulo, modelo.descricao, modelo.microcompetencia]
        .some((valor) => String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo));
      return atendeMacro && atendeEixo && atendeBusca;
    });
  }, [biblioteca, buscaBiblioteca, macroBiblioteca, eixoBiblioteca]);

  const usarModeloBiblioteca = (modelo: any) => {
    setFormData((prev) => ({
      ...prev,
      macroId: modelo.macroId ? String(modelo.macroId) : "",
      microcompetencia: modelo.microcompetencia || "",
      titulo: modelo.titulo || "",
      descricao: modelo.descricao || "",
    }));
    setModoCriacao("nova");
    setErrors({});
  };
  
  // Filtrar PDIs baseado na busca
  const filteredPdis = useMemo(() => {
    if (!pdiSearchTerm.trim()) return pdis;
    const term = pdiSearchTerm.toLowerCase();
    return pdis.filter((pdi: any) => 
      pdi.colaboradorNome?.toLowerCase().includes(term) ||
      pdi.titulo?.toLowerCase().includes(term)
    );
  }, [pdis, pdiSearchTerm]);
  
  // Obter nome do PDI/colaborador selecionado
  const selectedPdiInfo = useMemo(() => {
    if (!formData.pdiId) return null;
    const pdi = pdis.find((p: any) => String(p.pdiId) === formData.pdiId);
    return pdi ? { nome: pdi.colaboradorNome, titulo: pdi.titulo } : null;
  }, [formData.pdiId, pdis]);
  
  // Filtrar macros baseado na busca
  const filteredMacros = useMemo(() => {
    if (!macroSearchTerm.trim()) return macros;
    const term = macroSearchTerm.toLowerCase();
    return macros.filter((macro: any) => 
      macro.nome.toLowerCase().includes(term)
    );
  }, [macros, macroSearchTerm]);
  
  // Obter nome da macro selecionada
  const selectedMacroName = useMemo(() => {
    if (!formData.macroId) return '';
    const macro = macros.find((m: any) => String(m.id) === formData.macroId);
    return macro ? macro.nome : '';
  }, [formData.macroId, macros]);


  const selectedMacroReference = useMemo(() => {
    if (!selectedMacroName) return null;
    const nomeNormalizado = selectedMacroName.replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ');
    return referenciasMetodologicas[nomeNormalizado] ?? null;
  }, [selectedMacroName]);


  const acoesDisponiveisDaMacro = useMemo(() => {
    if (!formData.macroId) return [];
    return (biblioteca as any[]).filter(
      (modelo) => String(modelo.macroId ?? '') === formData.macroId,
    );
  }, [biblioteca, formData.macroId]);
  
  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (macroDropdownRef.current && !macroDropdownRef.current.contains(event.target as Node)) {
        setMacroDropdownOpen(false);
      }
      if (pdiDropdownRef.current && !pdiDropdownRef.current.contains(event.target as Node)) {
        setPdiDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Mutation para sugestão com IA
  const sugerirAcaoMutation = trpc.ia.sugerirAcao.useMutation({
    onSuccess: (data) => {
      if (data.success && data.sugestao) {
        setFormData(prev => ({
          ...prev,
          titulo: data.sugestao.titulo,
          descricao: data.sugestao.detalhes,
        }));
        setSugestaoGerada(true);
      }
      setIsSuggesting(false);
    },
    onError: (error) => {
      console.error('Erro ao gerar sugestão:', error);
      setErrors({ submit: 'Erro ao gerar sugestão com IA. Tente novamente.' });
      setIsSuggesting(false);
    },
  });
  
  // Preencher e filtrar a biblioteca quando vier da Evolução Individual
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPdiId = params.get('pdiId');
    const eixo = params.get('eixo');
    const macroId = params.get('macroId');
    const origem = params.get('origem');
    const modo = params.get('modo');

    if (urlPdiId || eixo || macroId) {
      setFormData(prev => ({
        ...prev,
        ...(urlPdiId ? { pdiId: urlPdiId } : {}),
        ...(eixo ? { microcompetencia: eixo } : {}),
        ...(macroId ? { macroId } : {}),
      }));
    }

    if (macroId) setMacroBiblioteca(macroId);
    if (eixo && !macroId) setEixoBiblioteca(eixo);
    if (modo === "biblioteca" || origem === "evolucao_individual") {
      setModoCriacao("biblioteca");
    }
  }, [searchString]);
  
  const utils = trpc.useUtils();
  
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      utils.actions.list.invalidate();
      navigate('/acoes');
    },
    onError: (error) => {
      setErrors({ submit: `Erro do Servidor: ${error.message}` });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '', submit: '' }));
  };
  
  const handleSelectPdi = (pdiId: string) => {
    setFormData(prev => ({ ...prev, pdiId }));
    setPdiSearchTerm('');
    setPdiDropdownOpen(false);
    setErrors(prev => ({ ...prev, pdiId: '', submit: '' }));
  };
  
  const handleSelectMacro = (macroId: string, macroNome: string) => {
    setFormData(prev => ({ ...prev, macroId }));
    setMacroSearchTerm('');
    setMacroDropdownOpen(false);
    setErrors(prev => ({ ...prev, macroId: '', submit: '' }));
  };

  const handleSugerirComIA = () => {
    if (!formData.macroId) {
      setErrors({ macroId: 'Selecione uma competência Macro primeiro' });
      return;
    }

    const macroSelecionada = macros.find((m: any) => String(m.id) === formData.macroId);
    if (!macroSelecionada) {
      setErrors({ submit: 'Competência não encontrada' });
      return;
    }

    setIsSuggesting(true);
    setErrors({});
    
    sugerirAcaoMutation.mutate({
      competenciaMacro: macroSelecionada.nome,
      competenciaMicro: formData.microcompetencia || undefined,
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.pdiId) newErrors.pdiId = 'Selecione o PDI vinculado';
    if (!formData.macroId) newErrors.macroId = 'Selecione a competência Macro';
    if (!formData.titulo.trim()) newErrors.titulo = 'Título é obrigatório';
    if (!formData.prazo) newErrors.prazo = 'Prazo é obrigatório';
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Conversão segura
    const pdiIdNumerico = Number(formData.pdiId);
    const macroIdNumerico = Number(formData.macroId);

    // Validação final de segurança
    if (!pdiIdNumerico || isNaN(pdiIdNumerico)) {
      setErrors({ submit: 'Erro Interno: ID do PDI inválido. Recarregue a página.' });
      return;
    }

    // Validar e garantir que prazo seja string ISO (YYYY-MM-DD)
    let prazoFormatado = formData.prazo;
    if (formData.prazo instanceof Date) {
      prazoFormatado = formData.prazo.toISOString().split('T')[0];
    }
    
    createMutation.mutate({
      pdiId: pdiIdNumerico,
      macroId: macroIdNumerico, 
      microcompetencia: formData.microcompetencia || undefined,
      titulo: formData.titulo,
      descricao: formData.descricao,
      prazo: prazoFormatado,
    });
  };

  const canSuggest = formData.macroId && !isSuggesting;
  const [sugestaoGerada, setSugestaoGerada] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Nova Ação</h1>
          <p style={{ color: '#666' }}>Preencha os dados da ação de desenvolvimento</p>
          {new URLSearchParams(searchString).get('origem') === 'evolucao_proficiencia' && (
            <div style={{ marginTop: '12px', padding: '12px 14px', border: '1px solid #93c5fd', borderRadius: '8px', background: '#eff6ff', color: '#1e3a8a', fontSize: '14px' }}>
              Ação originada de um gap identificado na Evolução da Avaliação de Proficiência. Selecione o PDI de destino e revise os dados antes de salvar.
            </div>
          )}
          {new URLSearchParams(searchString).get('origem') === 'evolucao_individual' && (
            <div style={{ marginTop: '12px', padding: '12px 14px', border: '1px solid #93c5fd', borderRadius: '8px', background: '#eff6ff', color: '#1e3a8a', fontSize: '14px' }}>
              Biblioteca aberta a partir da Evolução Individual. O PDI e o filtro de competência ou eixo de conhecimento foram trazidos como contexto; revise e selecione a ação mais adequada.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setModoCriacao("nova")}
            style={{ padding: '14px', borderRadius: '8px', border: modoCriacao === "nova" ? '2px solid #2563eb' : '1px solid #d1d5db', background: modoCriacao === "nova" ? '#eff6ff' : 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Criar uma ação nova
          </button>
          <button
            type="button"
            onClick={() => setModoCriacao("biblioteca")}
            style={{ padding: '14px', borderRadius: '8px', border: modoCriacao === "biblioteca" ? '2px solid #2563eb' : '1px solid #d1d5db', background: modoCriacao === "biblioteca" ? '#eff6ff' : 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Buscar na biblioteca
          </button>
        </div>

        {modoCriacao === "biblioteca" && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Biblioteca de ações</h2>
              <p style={{ color: '#666', marginTop: '4px' }}>Selecione uma ação existente para utilizar como modelo. Empregado, PDI, prazo, status e evidências não serão copiados.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 0.7fr) minmax(220px, 0.7fr)', gap: '12px' }}>
              <input
                type="search"
                value={buscaBiblioteca}
                onChange={(event) => setBuscaBiblioteca(event.target.value)}
                placeholder="Pesquisar ação, descrição ou conhecimento"
                style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
              <select
                value={macroBiblioteca}
                onChange={(event) => setMacroBiblioteca(event.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}
              >
                <option value="">Todas as competências</option>
                {macros.map((macro: any) => <option key={macro.id} value={String(macro.id)}>{macro.nome}</option>)}
              </select>
              <select
                value={eixoBiblioteca}
                onChange={(event) => setEixoBiblioteca(event.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}
              >
                <option value="">Todos os eixos / conhecimentos</option>
                {eixosBiblioteca.map((eixo) => <option key={eixo} value={eixo}>{eixo}</option>)}
              </select>
            </div>
            <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              {loadingBiblioteca ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Carregando biblioteca...</div>
              ) : modelosBiblioteca.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Nenhuma ação encontrada para os filtros selecionados.</div>
              ) : modelosBiblioteca.map((modelo: any) => {
                const macro = macros.find((item: any) => Number(item.id) === Number(modelo.macroId));
                return (
                  <div key={modelo.modeloId} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{modelo.titulo}</div>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>{macro?.nome || "Sem competência classificada"}{modelo.microcompetencia ? ` · ${modelo.microcompetencia}` : ""}</div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>Utilizada {modelo.utilizacoes} vez(es)</div>
                    </div>
                    <button type="button" onClick={() => usarModeloBiblioteca(modelo)} style={{ flexShrink: 0, padding: '9px 14px', border: 'none', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Usar como modelo</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          
          {/* 1. SELEÇÃO DE PDI COM BUSCA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#2563eb' }}>1. Vincular ao PDI de quem? *</label>
            <div ref={pdiDropdownRef} style={{ position: 'relative' }}>
              {/* Campo de seleção/busca */}
              <div
                onClick={() => setPdiDropdownOpen(!pdiDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.pdiId ? '2px solid red' : pdiDropdownOpen ? '2px solid #2563eb' : '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  minHeight: '42px'
                }}
              >
                {formData.pdiId && selectedPdiInfo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedPdiInfo.nome} - {selectedPdiInfo.titulo}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, pdiId: '' }));
                      }}
                      style={{ 
                        marginLeft: 'auto', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={16} style={{ color: '#9ca3af' }} />
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>Clique para buscar colaborador...</span>
                )}
                <ChevronDown size={18} style={{ color: '#6b7280', flexShrink: 0, transform: pdiDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              
              {/* Dropdown com busca */}
              {pdiDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  maxHeight: '350px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Campo de busca */}
                  <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input
                        type="text"
                        placeholder="Digite o nome do colaborador..."
                        value={pdiSearchTerm}
                        onChange={(e) => setPdiSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 10px 10px 38px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      {pdiSearchTerm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdiSearchTerm('');
                          }}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={16} style={{ color: '#9ca3af' }} />
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                      {filteredPdis.length} colaborador(es) encontrado(s)
                    </div>
                  </div>
                  
                  {/* Lista de opções */}
                  <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                    {loadingPdis ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                        <span style={{ marginTop: '8px', display: 'block' }}>Carregando...</span>
                      </div>
                    ) : filteredPdis.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        Nenhum colaborador encontrado para "{pdiSearchTerm}"
                      </div>
                    ) : (
                      filteredPdis.map((pdi: any) => (
                        <div
                          key={pdi.pdiId}
                          onClick={() => handleSelectPdi(String(pdi.pdiId))}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: formData.pdiId === String(pdi.pdiId) ? '#eff6ff' : 'white',
                            borderLeft: formData.pdiId === String(pdi.pdiId) ? '3px solid #2563eb' : '3px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.pdiId !== String(pdi.pdiId)) {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.pdiId !== String(pdi.pdiId)) {
                              e.currentTarget.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          {formData.pdiId === String(pdi.pdiId) && (
                            <Check size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ 
                              fontSize: '14px', 
                              color: formData.pdiId === String(pdi.pdiId) ? '#2563eb' : '#374151',
                              fontWeight: formData.pdiId === String(pdi.pdiId) ? '600' : '500'
                            }}>
                              {pdi.colaboradorNome}
                            </span>
                            <span style={{ 
                              fontSize: '12px', 
                              color: '#6b7280'
                            }}>
                              {pdi.titulo}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.pdiId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.pdiId}</span>}
          </div>

          {/* 2. COMPETÊNCIA (MACRO) COM BUSCA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>2. Competência Geral (Macro) *</label>
            <div ref={macroDropdownRef} style={{ position: 'relative' }}>
              {/* Campo de seleção/busca */}
              <div
                onClick={() => setMacroDropdownOpen(!macroDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.macroId ? '2px solid red' : macroDropdownOpen ? '2px solid #2563eb' : '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  minHeight: '42px'
                }}
              >
                {formData.macroId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedMacroName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, macroId: '' }));
                      }}
                      style={{ 
                        marginLeft: 'auto', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={16} style={{ color: '#9ca3af' }} />
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>Clique para buscar e selecionar...</span>
                )}
                <ChevronDown size={18} style={{ color: '#6b7280', flexShrink: 0, transform: macroDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              
              {/* Dropdown com busca */}
              {macroDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  maxHeight: '350px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Campo de busca */}
                  <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input
                        type="text"
                        placeholder="Digite para buscar competência..."
                        value={macroSearchTerm}
                        onChange={(e) => setMacroSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 10px 10px 38px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      {macroSearchTerm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMacroSearchTerm('');
                          }}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={16} style={{ color: '#9ca3af' }} />
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                      {filteredMacros.length} competência(s) encontrada(s)
                    </div>
                  </div>
                  
                  {/* Lista de opções */}
                  <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                    {loadingMacros ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                        <span style={{ marginTop: '8px', display: 'block' }}>Carregando...</span>
                      </div>
                    ) : filteredMacros.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        Nenhuma competência encontrada para "{macroSearchTerm}"
                      </div>
                    ) : (
                      filteredMacros.map((macro: any) => (
                        <div
                          key={macro.id}
                          onClick={() => handleSelectMacro(String(macro.id), macro.nome)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: formData.macroId === String(macro.id) ? '#eff6ff' : 'white',
                            borderLeft: formData.macroId === String(macro.id) ? '3px solid #2563eb' : '3px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.macroId !== String(macro.id)) {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.macroId !== String(macro.id)) {
                              e.currentTarget.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          {formData.macroId === String(macro.id) && (
                            <Check size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                          )}
                          <span style={{ 
                            fontSize: '14px', 
                            color: formData.macroId === String(macro.id) ? '#2563eb' : '#374151',
                            fontWeight: formData.macroId === String(macro.id) ? '500' : '400'
                          }}>
                            {macro.nome}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.macroId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.macroId}</span>}
          </div>

          {selectedMacroReference && (
            <div
              style={{
                padding: '16px',
                border: '1px solid #dbeafe',
                borderRadius: '8px',
                backgroundColor: '#f8fbff',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '16px' }}>
                Referência integrada para criação da ação
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Macrocompetência
                  </div>
                  <div style={{ marginTop: '4px', fontWeight: 600, color: '#0f172a' }}>
                    {selectedMacroName}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Competência relacionada na Avaliação de Desempenho
                  </div>
                  <div style={{ marginTop: '4px', fontWeight: 600, color: '#0f172a' }}>
                    {selectedMacroReference.competenciaAD}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Subcompetências de referência
                </div>
                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                  <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>Básicas</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151', fontSize: '14px' }}>
                      {selectedMacroReference.basicas.map((item) => (
                        <li key={item.nome} style={{ marginBottom: '8px' }}>
                          <strong>{item.nome}</strong>
                          <div style={{ marginTop: '2px', color: '#64748b', lineHeight: 1.45 }}>{item.justificativa}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>Essenciais</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151', fontSize: '14px' }}>
                      {selectedMacroReference.essenciais.map((item) => (
                        <li key={item.nome} style={{ marginBottom: '8px' }}>
                          <strong>{item.nome}</strong>
                          <div style={{ marginTop: '2px', color: '#64748b', lineHeight: 1.45 }}>{item.justificativa}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>Master</div>
                    <div style={{ color: '#374151', fontSize: '14px' }}>
                      <strong>{selectedMacroReference.master.nome}</strong>
                      <div style={{ marginTop: '4px', color: '#64748b', lineHeight: 1.45 }}>
                        {selectedMacroReference.master.justificativa}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#334155' }}>Ações disponíveis</div>
                    <div style={{ marginTop: '3px', fontSize: '13px', color: '#64748b' }}>
                      {acoesDisponiveisDaMacro.length} ação(ões) encontrada(s) na Biblioteca para esta macrocompetência.
                    </div>
                  </div>
                  {acoesDisponiveisDaMacro.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMacroBiblioteca(formData.macroId);
                        setEixoBiblioteca('');
                        setModoCriacao('biblioteca');
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #93c5fd',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Ver ações disponíveis
                    </button>
                  )}
                </div>

                {acoesDisponiveisDaMacro.length > 0 ? (
                  <ul style={{ margin: '10px 0 0', paddingLeft: '18px', color: '#374151', fontSize: '14px' }}>
                    {acoesDisponiveisDaMacro.slice(0, 5).map((acao: any) => (
                      <li key={acao.modeloId || `${acao.titulo}-${acao.microcompetencia || ''}`}>
                        {acao.titulo}
                        {acao.microcompetencia ? ` — ${acao.microcompetencia}` : ''}
                      </li>
                    ))}
                    {acoesDisponiveisDaMacro.length > 5 && (
                      <li>+ {acoesDisponiveisDaMacro.length - 5} outra(s) ação(ões)</li>
                    )}
                  </ul>
                ) : (
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                    Ainda não há ação disponível na Biblioteca para esta macrocompetência. Você pode criar uma nova ação usando as referências acima.
                  </div>
                )}
              </div>

              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                A macrocompetência e a competência da Avaliação de Desempenho permanecem estruturas relacionadas, sem substituir o histórico existente.
                As subcompetências funcionam somente como orientação para escolha ou criação das ações.
              </div>
            </div>
          )}

          {/* 3. COMPETÊNCIA (MICRO) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="microcompetencia" style={{ fontWeight: '500' }}>3. Competência Específica (Texto) - Opcional</label>
            <input
              type="text"
              id="microcompetencia"
              name="microcompetencia"
              placeholder="Ex: Melhorar comunicação no Slack..."
              value={formData.microcompetencia}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* BOTÃO DE SUGESTÃO COM IA */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '8px', 
            border: '1px solid #bae6fd',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: '#0284c7' }} />
              <span style={{ fontWeight: '600', color: '#0284c7' }}>Assistente de IA</span>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
              Selecione a competência Macro (e opcionalmente a Micro) e clique no botão abaixo para receber uma sugestão de ação de desenvolvimento.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSugerirComIA}
                disabled={!canSuggest}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px', 
                  backgroundColor: canSuggest ? '#0284c7' : '#94a3b8', 
                  color: 'white', 
                  borderRadius: '6px', 
                  border: 'none', 
                  cursor: canSuggest ? 'pointer' : 'not-allowed',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  flex: sugestaoGerada ? '1' : 'auto'
                }}
              >
                {isSuggesting ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Gerando sugestão...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    ✨ Sugerir Ação com IA
                  </>
                )}
              </button>
              
              {sugestaoGerada && !isSuggesting && (
                <button
                  type="button"
                  onClick={handleSugerirComIA}
                  disabled={!canSuggest}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 20px', 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    borderRadius: '6px', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    flex: '1'
                  }}
                >
                  🔄 Gerar outra sugestão
                </button>
              )}
            </div>
          </div>

          {/* 4. TÍTULO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="titulo" style={{ fontWeight: '500' }}>4. O que será feito? (Título) *</label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ex: Participar do curso de Liderança"
              style={{ width: '100%', padding: '10px', border: errors.titulo ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.titulo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.titulo}</span>}
          </div>

          {/* 5. DESCRIÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="descricao" style={{ fontWeight: '500' }}>Detalhes da ação</label>
            <RichTextEditor
              value={formData.descricao}
              onChange={(val) => setFormData(prev => ({ ...prev, descricao: val }))}
              placeholder="Descreva o que fazer, como fazer e como comprovar..."
              minHeight="150px"
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              A descrição inclui: o que fazer, aviso de flexibilidade e evidência esperada.
            </span>
          </div>

          {/* 6. PRAZO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="prazo" style={{ fontWeight: '500' }}>5. Prazo de conclusão *</label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: errors.prazo ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.prazo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.prazo}</span>}
          </div>

          {/* MENSAGEM DE ERRO DO SERVIDOR */}
          {errors.submit && (
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {errors.submit}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', paddingTop: '16px' }}>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Ação'}
            </button>
            <button
              type="button"
              onClick={() => {
                const returnUrl = sessionStorage.getItem('acoes_return_url') || '/acoes';
                navigate(returnUrl);
              }}
              style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Sparkles, Loader2, Search, ChevronDown, X, Check } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { competenciaADRelacionadaDaMacro } from '../../../shared/competenciasAdRelacionamento';


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

const aliasesCompetenciasHistoricas: Record<string, string> = {
  'Atuação Colaborativa': 'COMPORTAMENTAL - Integração Organizacional e Trabalho Interáreas',
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
  const [grupoAberto, setGrupoAberto] = useState<"basicas" | "essenciais" | "master" | null>(null);
  const [subcompetenciaSelecionada, setSubcompetenciaSelecionada] = useState("");
  const [mostrarTodosModelosMacro, setMostrarTodosModelosMacro] = useState(false);

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
    const nomeSemPrefixo = selectedMacroName.replace(/^COMPORTAMENTAL\s*-\s*/i, '').trim();
    const aliasAtual = aliasesCompetenciasHistoricas[nomeSemPrefixo];
    const nomeNormalizado = aliasAtual
      ?? selectedMacroName.replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ');
    return referenciasMetodologicas[nomeNormalizado] ?? null;
  }, [selectedMacroName]);


  const acoesDisponiveisDaMacro = useMemo(() => {
    if (!formData.macroId) return [];
    return (biblioteca as any[]).filter(
      (modelo) => String(modelo.macroId ?? '') === formData.macroId,
    );
  }, [biblioteca, formData.macroId]);

  const normalizarBusca = (valor: unknown) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();

  const modelosRelacionadosASubcompetencia = (nome: string) => {
    const alvo = normalizarBusca(nome);
    return acoesDisponiveisDaMacro.filter((modelo: any) => {
      const campos = [modelo.microcompetencia, modelo.titulo, modelo.descricao]
        .map(normalizarBusca)
        .filter(Boolean);
      return campos.some((campo) => campo.includes(alvo));
    });
  };

  const selecionarSubcompetencia = (nome: string) => {
    setSubcompetenciaSelecionada(nome);
    setFormData((prev) => ({ ...prev, microcompetencia: nome }));
    setMostrarTodosModelosMacro(false);
    setSugestaoGerada(false);
  };

  const usarModeloNoFoco = (modelo: any, foco: string) => {
    setSubcompetenciaSelecionada(foco);
    setFormData((prev) => ({
      ...prev,
      macroId: modelo.macroId ? String(modelo.macroId) : prev.macroId,
      microcompetencia: foco,
      titulo: modelo.titulo || "",
      descricao: modelo.descricao || "",
    }));
    setErrors({});
    setSugestaoGerada(false);
  };
  
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
    const macroRelacionada = params.get('macroRelacionada');
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

    if (macroRelacionada && macros.length > 0) {
      const macroEncontrada = (macros as any[]).find((macro) =>
        String(macro.nome ?? '').replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ').trim()
        === macroRelacionada.replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ').trim()
      );
      if (macroEncontrada) {
        const macroRelacionadaId = String(macroEncontrada.id);
        setFormData(prev => ({ ...prev, macroId: macroRelacionadaId }));
        setMacroBiblioteca(macroRelacionadaId);
      }
    }

    if (eixo && !macroId && !macroRelacionada) setEixoBiblioteca(eixo);
    if (modo === "biblioteca" || origem === "evolucao_individual") {
      setModoCriacao("nova");
    }
  }, [searchString, macros]);
  
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

  const canSuggest = Boolean(formData.macroId && subcompetenciaSelecionada && !isSuggesting);
  const [sugestaoGerada, setSugestaoGerada] = useState(false);

  const competenciaAdAtual =
    new URLSearchParams(searchString).get("eixo")
    || competenciaADRelacionadaDaMacro(selectedMacroName)
    || selectedMacroReference?.competenciaAD
    || "";

  const renderModelosDoFoco = (foco: string) => {
    const modelos = modelosRelacionadosASubcompetencia(foco);
    const selecionada = subcompetenciaSelecionada === foco;

    return (
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {modelos.length > 0 ? (
          <>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              {modelos.length} modelo(s) relacionado(s) diretamente a esta subcompetência.
            </div>
            {modelos.slice(0, 4).map((modelo: any) => (
              <div
                key={modelo.modeloId || `${modelo.titulo}-${foco}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 650, color: '#0f172a' }}>{modelo.titulo}</div>
                  {modelo.microcompetencia ? (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                      Biblioteca: {modelo.microcompetencia}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => usarModeloNoFoco(modelo, foco)}
                  style={{
                    flexShrink: 0,
                    border: '1px solid #2563eb',
                    borderRadius: '6px',
                    padding: '8px 11px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Usar como modelo
                </button>
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Ainda não existe modelo classificado diretamente para esta subcompetência.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => selecionarSubcompetencia(foco)}
            style={{
              border: selecionada ? '2px solid #2563eb' : '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '9px 12px',
              background: selecionada ? '#eff6ff' : '#fff',
              color: '#1e3a8a',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            {selecionada ? 'Foco selecionado' : 'Criar ação nesta subcompetência'}
          </button>
          {selecionada && (
            <button
              type="button"
              onClick={handleSugerirComIA}
              disabled={!canSuggest}
              style={{
                border: 'none',
                borderRadius: '7px',
                padding: '9px 12px',
                background: canSuggest ? '#0284c7' : '#94a3b8',
                color: '#fff',
                fontWeight: 650,
                cursor: canSuggest ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <Sparkles size={16} />
              {isSuggesting ? 'Gerando...' : sugestaoGerada ? 'Gerar outra sugestão' : 'Sugerir ação com IA'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa', padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        <div style={{ marginBottom: '22px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 750, margin: 0 }}>Criar ação de desenvolvimento</h1>
          <p style={{ color: '#64748b', marginTop: '7px' }}>
            Escolha primeiro o foco de desenvolvimento. Depois utilize um modelo, crie a ação ou peça uma sugestão à IA.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '8px',
          marginBottom: '22px',
        }}>
          {['1. Pessoa', '2. Competência', '3. Foco', '4. Ação', '5. Revisão'].map((etapa) => (
            <div key={etapa} style={{
              padding: '10px 8px',
              textAlign: 'center',
              borderRadius: '7px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              fontWeight: 650,
              color: '#475569',
            }}>{etapa}</div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 1</div>
            <h2 style={{ margin: '4px 0 14px', fontSize: '20px' }}>De quem é esta ação?</h2>

            <div ref={pdiDropdownRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setPdiDropdownOpen(!pdiDropdownOpen)}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: errors.pdiId ? '2px solid red' : pdiDropdownOpen ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '7px', background: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                }}
              >
                {formData.pdiId && selectedPdiInfo ? (
                  <span style={{ fontWeight: 600 }}>{selectedPdiInfo.nome} — {selectedPdiInfo.titulo}</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Selecione o empregado e o PDI</span>
                )}
                <ChevronDown size={18} />
              </div>

              {pdiDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  marginTop: '5px', background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: '8px', boxShadow: '0 12px 30px rgba(15,23,42,.12)',
                }}>
                  <div style={{ padding: '10px' }}>
                    <input
                      value={pdiSearchTerm}
                      onChange={(e) => setPdiSearchTerm(e.target.value)}
                      placeholder="Buscar empregado..."
                      style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredPdis.map((pdi: any) => (
                      <button
                        type="button"
                        key={pdi.pdiId}
                        onClick={() => handleSelectPdi(String(pdi.pdiId))}
                        style={{
                          width: '100%', textAlign: 'left', padding: '11px 14px',
                          border: 'none', borderTop: '1px solid #f1f5f9',
                          background: formData.pdiId === String(pdi.pdiId) ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 650 }}>{pdi.colaboradorNome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{pdi.titulo}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.pdiId && <div style={{ color: '#b91c1c', marginTop: '6px', fontSize: '13px' }}>{errors.pdiId}</div>}
          </section>

          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 2</div>
            <h2 style={{ margin: '4px 0 14px', fontSize: '20px' }}>Qual competência estamos desenvolvendo?</h2>

            {competenciaAdAtual && (
              <div style={{ marginBottom: '10px', padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 750 }}>Competência da Avaliação de Desempenho</div>
                <div style={{ marginTop: '4px', fontWeight: 700 }}>{competenciaAdAtual}</div>
              </div>
            )}

            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#1d4ed8', fontWeight: 750 }}>Macrocompetência relacionada da Biblioteca</div>
              <div style={{ marginTop: '4px', fontWeight: 700 }}>{selectedMacroName || 'Selecione a macrocompetência'}</div>
            </div>

            {!selectedMacroName && (
              <div ref={macroDropdownRef} style={{ position: 'relative', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMacroDropdownOpen(!macroDropdownOpen)}
                  style={{ width: '100%', padding: '11px', border: '1px solid #cbd5e1', borderRadius: '7px', background: '#fff', cursor: 'pointer' }}
                >
                  Selecionar macrocompetência
                </button>
                {macroDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {filteredMacros.map((macro: any) => (
                      <button
                        type="button"
                        key={macro.id}
                        onClick={() => handleSelectMacro(String(macro.id), macro.nome)}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: '#fff', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      >
                        {macro.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.macroId && <div style={{ color: '#b91c1c', marginTop: '6px', fontSize: '13px' }}>{errors.macroId}</div>}
          </section>

          {selectedMacroReference && (
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 3</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '20px' }}>Qual é o foco do desenvolvimento?</h2>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '14px' }}>
                Abra um grupo e escolha a subcompetência que esta ação deve desenvolver.
              </p>

              {([
                ['basicas', 'Básicas', selectedMacroReference.basicas],
                ['essenciais', 'Essenciais', selectedMacroReference.essenciais],
                ['master', 'Master', [selectedMacroReference.master]],
              ] as const).map(([chave, titulo, itens]) => (
                <div key={chave} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setGrupoAberto(grupoAberto === chave ? null : chave)}
                    style={{
                      width: '100%', padding: '13px 15px', border: 'none', background: '#f8fafc',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', fontWeight: 750, fontSize: '15px',
                    }}
                  >
                    <span>{titulo} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({itens.length})</span></span>
                    <ChevronDown size={18} style={{ transform: grupoAberto === chave ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>

                  {grupoAberto === chave && (
                    <div style={{ padding: '10px 14px 14px' }}>
                      {itens.map((item: any) => (
                        <div key={item.nome} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 750, color: '#0f172a' }}>{item.nome}</div>
                          <div style={{ marginTop: '4px', fontSize: '13px', lineHeight: 1.5, color: '#64748b' }}>{item.justificativa}</div>
                          {renderModelosDoFoco(item.nome)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {acoesDisponiveisDaMacro.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarTodosModelosMacro(!mostrarTodosModelosMacro)}
                    style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 650, cursor: 'pointer', padding: 0 }}
                  >
                    {mostrarTodosModelosMacro ? 'Ocultar outros modelos da macro' : `Ver também os ${acoesDisponiveisDaMacro.length} modelos gerais desta macro`}
                  </button>
                  {mostrarTodosModelosMacro && (
                    <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                      {acoesDisponiveisDaMacro.slice(0, 8).map((modelo: any) => (
                        <div key={modelo.modeloId} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px' }}>
                          <strong>{modelo.titulo}</strong>
                          {modelo.microcompetencia ? <span style={{ color: '#64748b' }}> — {modelo.microcompetencia}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {subcompetenciaSelecionada && (
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 4</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '20px' }}>Defina a ação</h2>
              <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '7px', background: '#f8fafc', color: '#475569', fontSize: '14px' }}>
                Foco escolhido: <strong>{subcompetenciaSelecionada}</strong>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label htmlFor="titulo" style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>O que será feito? *</label>
                  <input
                    id="titulo"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    placeholder="Título da ação"
                    style={{ width: '100%', padding: '11px', border: errors.titulo ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px' }}
                  />
                  {errors.titulo && <div style={{ color: '#b91c1c', marginTop: '5px', fontSize: '13px' }}>{errors.titulo}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>Detalhes da ação</label>
                  <RichTextEditor
                    value={formData.descricao}
                    onChange={(val) => setFormData(prev => ({ ...prev, descricao: val }))}
                    placeholder="O que fazer, como fazer e como comprovar..."
                    minHeight="160px"
                  />
                </div>
              </div>
            </section>
          )}

          {subcompetenciaSelecionada && (
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 5</div>
              <h2 style={{ margin: '4px 0 14px', fontSize: '20px' }}>Revise e conclua</h2>

              <div>
                <label htmlFor="prazo" style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>Prazo de conclusão *</label>
                <input
                  id="prazo"
                  name="prazo"
                  type="date"
                  value={formData.prazo}
                  onChange={handleChange}
                  style={{ width: '100%', maxWidth: '320px', padding: '11px', border: errors.prazo ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px' }}
                />
                {errors.prazo && <div style={{ color: '#b91c1c', marginTop: '5px', fontSize: '13px' }}>{errors.prazo}</div>}
              </div>

              {errors.submit && (
                <div style={{ marginTop: '12px', padding: '11px', borderRadius: '7px', background: '#fee2e2', color: '#b91c1c' }}>
                  {errors.submit}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{ padding: '11px 18px', border: 'none', borderRadius: '7px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {createMutation.isPending ? 'Salvando...' : 'Salvar ação'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const returnUrl = sessionStorage.getItem('acoes_return_url') || '/acoes';
                    navigate(returnUrl);
                  }}
                  style={{ padding: '11px 18px', border: '1px solid #cbd5e1', borderRadius: '7px', background: '#fff', fontWeight: 650, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}

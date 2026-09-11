import type { UticQuestao } from "./types";

// Conteúdo público da prova; não contém gabarito.
export const QUESTOES_E01: UticQuestao[] = [
  {
    "id": 1,
    "eixoId": "E01",
    "eixo": "Governança e Gestão de TI",
    "tagFonte": "TAG Macroárea: Gestão de Tecnologia da Informação / Governança de TI",
    "macroarea": "Gestão de Tecnologia da Informação",
    "microarea": "Governança de TI",
    "enunciado": "No contexto da Unidade de Tecnologia da Informação e Comunicação de Dados (UTIC), a documentação formal dos processos constitui um elemento essencial da Governança de TI. Um analista recebeu a atribuição de documentar um novo Procedimento Operacional Padrão (POP) destinado à gestão do ciclo de vida dos ativos tecnológicos. Considerando as melhores práticas de governança e de gestão de serviços, assinale a alternativa que expressa corretamente a finalidade principal e a relevância estratégica dessa documentação técnica para a organização.",
    "opcoes": [
      {"id":"q1_a","texto":"Agilizar o atendimento das solicitações de suporte mediante a eliminação de etapas de controle e validação, com o propósito de reduzir imediatamente os indicadores de Tempo Médio de Atendimento (TMA).","naoSei":false},
      {"id":"q1_b","texto":"Formar um conjunto de evidências destinado prioritariamente à defesa institucional em auditorias externas, privilegiando o atendimento burocrático em relação às atividades operacionais cotidianas.","naoSei":false},
      {"id":"q1_c","texto":"Identificar as competências particulares dos colaboradores para compor um banco interno de talentos, possibilitando à gestão reconhecer habilidades úteis em futuras reorganizações do organograma da unidade.","naoSei":false},
      {"id":"q1_d","texto":"Assegurar a padronização e a rastreabilidade das atividades, de modo que as rotinas operacionais preservem a conformidade normativa e a qualidade técnica, independentemente do profissional responsável por sua execução.","naoSei":false},
      {"id":"q1_e","texto":"Apoiar a produção de relatórios exclusivamente financeiros referentes à depreciação contábil do parque tecnológico, fornecendo elementos para justificar novas aquisições perante a alta administração.","naoSei":false},
      {"id":"q1_f","texto":"Não sei, desconheço o conteúdo.","naoSei":true}
    ]
  },
  {
    "id": 2,
    "eixoId": "E01",
    "eixo": "Governança e Gestão de TI",
    "tagFonte": "TAG Macroárea: Gestão de Tecnologia da Informação / Governança de TI",
    "macroarea": "Gestão de Tecnologia da Informação",
    "microarea": "Governança de TI",
    "enunciado": "No contexto dos princípios de Governança de TI aplicados pela Unidade de Tecnologia da Informação e Comunicação de Dados (UTIC), avalie a relação estabelecida entre as asserções seguintes, relacionadas aos controles do processo de Gestão de Mudanças. I. Alterações em sistemas e infraestruturas considerados críticos para o negócio devem ser submetidas, obrigatoriamente, à aprovação formal do Comitê de Mudanças (CAB) ou da autoridade gerencial competente. PORQUE II. Esse controle permite a avaliação antecipada dos impactos e da exposição a riscos, incluindo a verificação dos planos de reversão (rollback) e da conformidade regulatória, com o objetivo de reduzir a possibilidade de indisponibilidade dos serviços (outage). Com base nessas asserções, assinale a alternativa correta.",
    "opcoes": [
      {"id":"q2_a","texto":"A asserção I é falsa, enquanto a asserção II é verdadeira.","naoSei":false},
      {"id":"q2_b","texto":"As asserções I e II são verdadeiras, porém a asserção II não justifica corretamente a asserção I.","naoSei":false},
      {"id":"q2_c","texto":"As asserções I e II são falsas.","naoSei":false},
      {"id":"q2_d","texto":"As asserções I e II são verdadeiras, e a asserção II justifica corretamente a asserção I.","naoSei":false},
      {"id":"q2_e","texto":"A asserção I é verdadeira, enquanto a asserção II é falsa.","naoSei":false},
      {"id":"q2_f","texto":"Não sei, desconheço o conteúdo.","naoSei":true}
    ]
  },
  {
    "id": 3,
    "eixoId": "E01",
    "eixo": "Governança e Gestão de TI",
    "tagFonte": "TAG Macroárea: Gestão de Tecnologia da Informação / Gestão de Contratos de TI",
    "macroarea": "Gestão de Tecnologia da Informação",
    "microarea": "Gestão de Contratos de TI",
    "enunciado": "Durante a fiscalização de um contrato de desenvolvimento e suporte da UTIC, o gestor responsável constata e registra que a empresa contratada vem descumprindo repetidamente os Acordos de Nível de Serviço (SLAs) relativos aos prazos de resposta e de resolução de incidentes. Considerando as boas práticas de Gestão de Contratos de TI e os princípios aplicáveis às contratações públicas, assinale a alternativa que apresenta a providência administrativa adequada para preservar a conformidade jurídica e o interesse da Administração.",
    "opcoes": [
      {"id":"q3_a","texto":"Promover imediatamente a rescisão unilateral e sumária do contrato, dispensando a notificação da empresa e a oportunidade de defesa, uma vez que o descumprimento objetivo dos SLAs autoriza a interrupção automática do vínculo contratual.","naoSei":false},
      {"id":"q3_b","texto":"Manter a execução contratual sem registrar sanções, tolerando os desvios de desempenho sob o argumento de que os riscos operacionais e os custos de substituição do fornecedor são superiores aos prejuízos decorrentes da baixa qualidade do serviço.","naoSei":false},
      {"id":"q3_c","texto":"Determinar que a equipe técnica da UTIC execute as demandas em atraso para suprir as falhas da contratada, deixando a aplicação de penalidades restrita às hipóteses de abandono integral do contrato, a fim de evitar a interrupção dos serviços essenciais.","naoSei":false},
      {"id":"q3_d","texto":"Registrar continuamente as ocorrências e notificar formalmente a contratada para que apresente suas justificativas, assegurando o contraditório; se a inadimplência continuar, instruir o processo para aplicação das sanções previstas, inclusive eventual rescisão contratual.","naoSei":false},
      {"id":"q3_e","texto":"Redefinir imediatamente os indicadores de desempenho por meio de entendimentos verbais e informais com os representantes da contratada, adequando as metas à sua capacidade efetiva de entrega e evitando o desgaste causado por procedimentos punitivos formais.","naoSei":false},
      {"id":"q3_f","texto":"Não sei, desconheço o conteúdo.","naoSei":true}
    ]
  },
  {
    "id": 4,
    "eixoId": "E01",
    "eixo": "Governança e Gestão de TI",
    "tagFonte": "TAG Macroárea: Gestão de Tecnologia da Informação / Gestão de Contratos de TI",
    "macroarea": "Gestão de Tecnologia da Informação",
    "microarea": "Gestão de Contratos de TI",
    "enunciado": "A gestão da UTIC avalia alternativas para renovar o contrato de suporte de sistemas de missão crítica. Nesse cenário, o Fornecedor A oferece redução de 15% nos custos, condicionada à diminuição de 30% das horas de suporte especializado. O Fornecedor B, por sua vez, propõe aumento orçamentário de 20%, justificado pela disponibilização de atendimento 24/7 e por Acordos de Nível de Serviço (SLAs) mais exigentes. Diante desse trade-off e considerando os princípios de Governança de TI e o alinhamento entre custos e necessidades do negócio, assinale a recomendação estratégica mais adequada para embasar a decisão.",
    "opcoes": [
      {"id":"q4_a","texto":"Dividir o objeto contratual entre os dois fornecedores, destinando as demandas rotineiras ao serviço de menor custo e os incidentes críticos ao suporte especializado, de modo a reduzir riscos por meio da redundância de prestadores.","naoSei":false},
      {"id":"q4_b","texto":"Manter as condições contratuais atualmente vigentes, evitando os riscos associados à transição e à revisão de processos, ainda que as métricas de desempenho existentes não estejam alinhadas às novas exigências da infraestrutura.","naoSei":false},
      {"id":"q4_c","texto":"Selecionar automaticamente o Fornecedor B, pois o suporte 24/7 representa o único meio eficaz de assegurar a alta disponibilidade de sistemas críticos, tornando desnecessária a avaliação dos efeitos do aumento orçamentário.","naoSei":false},
      {"id":"q4_d","texto":"Realizar previamente uma Análise de Impacto no Negócio (BIA) e de Riscos, confrontando os custos e benefícios das propostas com a criticidade dos sistemas, os requisitos de recuperação (RTO/RPO) e o histórico de incidentes, para assegurar que a contratação favoreça os objetivos de continuidade da organização.","naoSei":false},
      {"id":"q4_e","texto":"Priorizar o Fornecedor A com base na eficiência econômica e na redução das despesas operacionais (OpEx), partindo do pressuposto de que a equipe interna da UTIC poderá absorver a diminuição do suporte externo sem afetar a estabilidade do ambiente.","naoSei":false},
      {"id":"q4_f","texto":"Não sei, desconheço o conteúdo.","naoSei":true}
    ]
  },
  {
    "id": 8,
    "eixoId": "E01",
    "eixo": "Governança e Gestão de TI",
    "tagFonte": "TAG Macroárea: Gestão de Tecnologia da Informação / Gestão de Projetos de TI",
    "macroarea": "Gestão de Tecnologia da Informação",
    "microarea": "Gestão de Projetos de TI",
    "enunciado": "Durante o gerenciamento de um projeto estratégico de implantação de um sistema ERP na UTIC, o gerente de projetos verifica, por meio da análise de valor agregado, que o cronograma acumula um desvio negativo de 25%, representando risco concreto para o cumprimento da data de entrega acordada. Com base nas boas práticas de governança, liderança e comunicação em projetos, assinale a alternativa que apresenta a conduta gerencial adequada para tratar a situação identificada.",
    "opcoes": [
      {"id":"q8_a","texto":"Acompanhar as etapas seguintes sem promover intervenções corretivas imediatas, evitando possíveis efeitos sobre o clima da equipe e considerando que o atraso poderá ser compensado naturalmente durante as atividades de homologação e testes.","naoSei":false},
      {"id":"q8_b","texto":"Identificar a causa raiz do atraso, elaborar um cronograma revisado e realista e comunicar formalmente aos stakeholders a situação atual, os impactos estimados e o plano de recuperação definido.","naoSei":false},
      {"id":"q8_c","texto":"Interromper preventivamente a execução técnica e submeter o escopo a uma auditoria de viabilidade econômica, retomando as atividades somente após a renegociação integral dos prazos com fornecedores externos e alta administração.","naoSei":false},
      {"id":"q8_d","texto":"Exigir o cumprimento da data originalmente estabelecida mediante a ampliação da jornada da equipe técnica, priorizando a entrega final em relação à atualização dos documentos de controle e à reavaliação dos riscos qualitativos.","naoSei":false},
      {"id":"q8_e","texto":"Manter a divulgação dos indicadores de prazo conforme o planejamento inicial, evitando instabilidade institucional, enquanto se utiliza intensivamente o paralelismo (fast tracking) para recuperar o atraso sem alterar formalmente a linha de base.","naoSei":false},
      {"id":"q8_f","texto":"Não sei, desconheço o conteúdo.","naoSei":true}
    ]
  }
];

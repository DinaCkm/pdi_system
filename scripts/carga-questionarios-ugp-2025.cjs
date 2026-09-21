const mysql = require("mysql2/promise");

const P = [
["pdi_criado_ano","Você já criou um Plano de Desenvolvimento Individual (PDI) para este ano?",1],
["desafios_funcao","Quais são os maiores desafios que você enfrenta nesta função dentro da sua área ou departamento?",2],
["graduacoes_fundamentais","Considerando a função que você exerce e o contexto específico da sua área de atuação, quais cursos de graduação você considera fundamentais para quem deseja desempenhar esse papel?",3],
["especializacoes_recomendadas","Se alguém quisesse se especializar ainda mais na função que você desempenha hoje, que MBAs ou pós-graduações você indicaria?",4],
["cursos_extracurriculares","Pensando no seu dia a dia e na experiência prática que você tem, quais cursos extracurriculares poderiam apoiar ainda mais o desenvolvimento de quem ocupa a função que você desempenha?",5],
["cursos_internos_sebrae","Sabendo que o Sebrae oferece uma ampla variedade de cursos internos, quais você acredita que seriam mais importantes para apoiar o desenvolvimento de quem ocupa a função que você exerce hoje?",6],
["temas_competencias_indispensaveis","Imaginando a construção de um programa de desenvolvimento para a função que você exerce, quais temas ou competências você acredita que não poderiam faltar?",7],
["plano_capacitacao_ano","Existe algum Plano de Capacitação definido internamente para este ano? Se sim, quais capacitações estão previstas?",8],
["descricao_funcao","Se alguém de fora perguntasse o que faz uma pessoa que ocupa este cargo dentro da sua área, departamento ou escritório, como você explicaria?",9],
["principais_atividades","Quais são as 5 principais atividades que fazem parte da sua rotina nesta função e que realmente fazem diferença no dia a dia do setor?",10],
["conhecimentos_habilidades_indispensaveis","Pensando nas atividades que você realiza hoje no seu dia a dia, quais conhecimentos e habilidades são indispensáveis para desempenhá-las bem?",11],
["responsabilidades_extras","Existe alguma responsabilidade ou atividade que você realiza e considera importante, mas que não consta oficialmente na descrição do seu cargo?",12],
["cursos_eventos_interesse","Tem algum curso, congresso, feira ou evento que você tem interesse em participar ou que seu gestor tenha indicado? Explique como isso pode melhorar o desempenho da sua função.",13],
["formacao_academica_relacionada","Entre as graduações, MBAs ou pós-graduações sugeridas, quais fazem parte da sua formação acadêmica?",14],
["cursos_realizados","Entre os cursos extracurriculares recomendados, quais já fazem parte da sua trajetória de formação?",15],
["desenvolvimento_futuro","Pensando no seu crescimento e no impacto positivo para o Sebrae, existem cursos, formações ou eventos que poderiam fortalecer ainda mais suas competências?",16],
["principal_atuacao","Pode explicar qual é a sua principal atuação atualmente?",17],
];

const D = [
{
email:"elizeth.coutinho@to.sebrae.com.br",nome:"ELIZETH CRISTIANE COUTINHO LIMA",arquivo:"ELIZETH_CRISTIANE_COUTINHO_LIMA_QUESTIONARIO_.pdf",url:"https://drive.google.com/file/d/174jNUU9ykNZU7jFWoL1B44bXh7ANUNX3/view",
obs:"Transcrição histórica do questionário de 2025 conforme PDF original.",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Dificuldade de acesso a informações e dados necessários para a função; processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Administração: legislação trabalhista e suas mudanças, e-Social. RH: recrutamento. Departamento Pessoal: cálculos e fórmulas básicas e avançadas da gestão de pessoas.",
especializacoes_recomendadas:"MBA Gestão de Pessoas e Liderança: fundamentos da gestão.",
cursos_extracurriculares:"Departamento Pessoal: cálculos e fórmulas básicas e avançadas da gestão de pessoas.",
cursos_internos_sebrae:"Gestão de Processos; Indicadores; Liderança; Gestão de Negócio.",
temas_competencias_indispensaveis:"Tomada de decisão; Orientação para Resultados; Foco no cliente.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Contratações, demissões, férias, cálculos rescisórios, licenças, auditorias e fiscalizações, Sebraeprev, ressarcimento Unimed, empréstimos, protocolos, atualização de tabelas, alterações de funções/seções/horários, auditoria atuarial Unimed, dados TCU, folha de pagamento, e-Social, DIRF, DET, igualdade salarial e demais atividades de Administração de Pessoal.",
principais_atividades:"Folha de pagamento; férias; desligamentos; processos internos de licença/maternidade; acompanhamento de ponto/notificações.",
conhecimentos_habilidades_indispensaveis:"Conhecimentos técnicos: área trabalhista e legislação. Habilidades comportamentais: comunicação eficaz com público interno e externo, resolução de problemas e fiscalizações, trabalho em equipe.",
responsabilidades_extras:"Até o momento não tem.",
cursos_eventos_interesse:"",
formacao_academica_relacionada:"Iniciou Gestão Empresarial e MBA em Direito Previdenciário, interrompidos por motivos de saúde.",
cursos_realizados:"E-Social básico e avançado; FGTS digital.",
desenvolvimento_futuro:"SIM. Pós-graduação na área de Gestão de Pessoas.",
principal_atuacao:"Atendimento ao público interno, responsável pelo setor de Administração de Pessoal."
}},
{
email:"francismeire.morais@to.sebrae.com.br",nome:"Francismeire Ferreira Lima de Morais",arquivo:"FRANCISMEIRE-FERREIRA-LIMA-DE-MORAIS_QUESTIONARIO.pdf",url:"https://drive.google.com/file/d/1ha_Ovm7mYtKLOmGa899mifBDVMpn1hat/view",
obs:"Transcrição histórica do questionário de 2025 conforme PDF original.",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Administração; Psicologia; Gestão de Recursos Humanos.",
especializacoes_recomendadas:"MBA em Gestão de Pessoas e Cultura Organizacional; Pós-graduação em Psicologia Organizacional; MBA em Desenvolvimento Humano.",
cursos_extracurriculares:"Comunicação Não-Violenta; Cultura Organizacional; Pesquisa de Clima e Análise de Dados.",
cursos_internos_sebrae:"Gestão colaborativa; Escuta Ativa e Diagnóstica; ESG em ação; Competência em SGP.",
temas_competencias_indispensaveis:"Gestão do Clima Organizacional; Cultura Organizacional na Prática; Escuta ativa; Visão sistêmica; Comunicação clara e empática; Organização e planejamento.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Trabalho com clima e cultura organizacional, acompanhando como as pessoas estão se sentindo, promovendo escutas e pesquisas e desenvolvendo iniciativas para ambiente saudável, acolhedor e alinhado aos valores do Sebrae/TO, incluindo campanhas, eventos e ações culturais.",
principais_atividades:"Condução de pesquisas e escutas internas; campanhas de endomarketing; construção e implementação do Book de Valores; programa de reconhecimento; ações institucionais de cultura e clima.",
conhecimentos_habilidades_indispensaveis:"Metodologias de pesquisa organizacional; cultura e clima; leitura e interpretação de dados qualitativos e quantitativos; gestão de projetos e cronogramas; organização e planejamento; comunicação clara e empática; articulação e mediação; visão sistêmica e foco em pessoas; atenção aos detalhes.",
responsabilidades_extras:"Faz a ponte entre diferentes áreas e pessoas para alinhar ações à cultura, envolvendo escuta, leitura do clima e iniciativa para propor ou ajustar ações.",
cursos_eventos_interesse:"CONARH; Semana do Futuro / Sebrae.",
formacao_academica_relacionada:"Administração.",
cursos_realizados:"Pesquisa de Clima.",
desenvolvimento_futuro:"SIM. CONARH; Semana do Futuro Sebrae/2025; DIEP; NR 1.",
principal_atuacao:"Gestão do Clima e Cultura Organizacional."
}},
{
email:"joseane@to.sebrae.com.br",nome:"Joseane Rodrigues Leite",arquivo:"JOSEANE RODRIGUES LEITE_QUESTIONARIO.pdf",url:"https://drive.google.com/file/d/12ddxmPWgD0YdJnaemKvG4LqZ4vatfKML/view",
obs:"Transcrição histórica do questionário de 2025. Evidência complementar atual informada pela CKM: Joseane também atua com folha de pagamento. Essa informação NÃO foi inserida como resposta histórica e deve ser considerada separadamente na auditoria.",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz entre equipes ou setores; falta de ferramentas ou sistemas; falta de tempo; engajamento das equipes; falta de senso crítico por parte de muitos empregados.",
graduacoes_fundamentais:"Administração; Psicologia Organizacional; Gestão de Recursos Humanos; Ciências Contábeis.",
especializacoes_recomendadas:"MBA em Gestão Estratégica de Pessoas; MBA em Planejamento e Gestão Estratégica; MBA em Gestão de Pessoas; Neurociência, Comportamento e Desempenho.",
cursos_extracurriculares:"Recrutamento e Seleção por Competências; Gestão de Carreira e Sucessão; People Analytics; Liderança e Gestão de Equipes.",
cursos_internos_sebrae:"Análise de Indicadores; Atendimento Consultivo; Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Competências; Carreira; Sucessão; Retenção; Recrutamento e Seleção.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Planejamento Estratégico de Pessoal; recrutamento e seleção; pós-seleção e contratação; assessoria pelo SGP; movimentação de empregados; Programa de Sucessor; Desenvolvimento Comportamental; relatórios e indicadores; Gestão da Carreira e Desempenho; pactuação de desafios; avaliação de competências; análise de equipes; devolutivas; revisão do Manual do SGP; avaliação de estagiários; reconhecimento e remuneração variável; apoio à liderança; projetos estratégicos.",
principais_atividades:"Gerir dimensionamento do quadro de pessoal; recrutamento e seleção; coordenar pactuação e repactuação dos desafios individuais; coordenar avaliação de competências; revisar Manual do Sistema de Gestão de Pessoas.",
conhecimentos_habilidades_indispensaveis:"Planejamento Estratégico de Pessoas; Recrutamento e Seleção; Entrevista por Competências; Gestão de Desempenho; Plano de Carreira; Gestão de Projetos. Habilidades: relacionamento interpessoal, comunicação eficaz, gestão do tempo, pensamento estratégico, empatia e inteligência emocional.",
responsabilidades_extras:"Membro titular da Comissão de Ética; Gerência Interina da UGP.",
cursos_eventos_interesse:"Aprofundamento em Neurociência; CONARH; curso prático sobre Gestão de Carreira.",
formacao_academica_relacionada:"Graduação em Ciências Contábeis; pós-graduação em Gestão de Pessoas; pós-graduação em Neurociências, Comportamento e Desempenho.",
cursos_realizados:"Entrevista por competências e cursos com foco em liderança.",
desenvolvimento_futuro:"SIM. CONARH; Neurociência; Gestão Estratégica de Pessoas.",
principal_atuacao:"Planejar estrategicamente o quadro de pessoal, conduzir processos seletivos internos e externos, movimentações, atração e retenção de talentos; gerir carreira e desempenho pelo SGP, alinhando metas individuais e de equipe aos objetivos estratégicos."
}},
{
email:"kivia.leite@to.sebrae.com.br",nome:"KIVIA RAQUEL PEREIRA LEITE",arquivo:"KIVIA RAQUEL PEREIRA LEITE_QUESTIONARIO.pdf",url:"https://drive.google.com/file/d/1khkFwxNorCCRFfhR_jqmqHoxGCe06NPd/view",
obs:"Transcrição histórica do questionário de 2025 conforme PDF original.",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Contabilidade - análise, cálculos e legislação trabalhista; Recursos Humanos - gestão de pessoas; Administração.",
especializacoes_recomendadas:"MBA em Gestão de Pessoas com Ênfase em Departamento Pessoal; Pós-graduação em Direito do Trabalho e Previdenciário; MBA em Gestão de Recursos Humanos; Pós-graduação em eSocial e Legislação Trabalhista Digital; MBA em Controladoria e Finanças com foco em custos de pessoal.",
cursos_extracurriculares:"Atualização em Legislação Trabalhista e Reforma Trabalhista; CONARH.",
cursos_internos_sebrae:"Gestão de produtividade.",
temas_competencias_indispensaveis:"Legislação trabalhista e previdenciária atualizada; Excel avançado aplicado ao DP; sistemas de gestão (ERP); atenção aos detalhes e precisão; gestão do tempo e organização.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua no Departamento Pessoal, principalmente com fechamento da folha de pagamento, cálculo e controle de férias, ponto eletrônico, obrigações trabalhistas, atualização de registros e conformidade legal.",
principais_atividades:"Fechamento da folha de pagamento; admissão e desligamento; cálculo e controle de férias; gestão de ponto e jornada; cumprimento das obrigações trabalhistas e acessórias (eSocial, FGTS, INSS, IRRF).",
conhecimentos_habilidades_indispensaveis:"Legislação trabalhista e previdenciária; rotinas de folha; férias e rescisões; eSocial e obrigações acessórias; ponto e jornada; sistemas de RH/DP - RM; noções de contabilidade aplicada ao DP; Excel. Habilidades: atenção aos detalhes, organização, responsabilidade e discrição, resolução de problemas, comunicação, gestão do tempo, adaptabilidade e trabalho em equipe.",
responsabilidades_extras:"Até o momento não.",
cursos_eventos_interesse:"CONARH.",
formacao_academica_relacionada:"Pós-graduação em Direito do Trabalho e Previdenciário.",
cursos_realizados:"Atualização em Legislação Trabalhista e Reforma Trabalhista.",
desenvolvimento_futuro:"SIM. Curso de gestão do ponto - RM Totvs; CONARH.",
principal_atuacao:"Rotina trabalhista dos colaboradores: folha de pagamento, férias, ponto eletrônico e outras obrigações legais, garantindo direitos, deveres, organização e conformidade."
}},
{
email:"vera.braga@to.sebrae.com.br",nome:"Vera Lúcia Teodoro Braga",arquivo:"VERA LUCIA TEODORO BRAGA_QUESTIONARIO.pdf",url:"https://drive.google.com/file/d/1yOnCUHTx7BVv1jl-NNEbaNVu3qok5Wie/view",
obs:"Transcrição histórica do questionário de 2025 conforme PDF original.",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas ou sistemas adequados; falta de suporte ou orientação; processos internos burocráticos ou complexos; falta de gestão direta para assuntos mais complexos.",
graduacoes_fundamentais:"Psicologia – para atuação em Recursos Humanos e desenvolvimento de equipes.",
especializacoes_recomendadas:"MBA em Liderança e Gestão de Pessoas – para atuação em cargos de liderança.",
cursos_extracurriculares:"Excel avançado; análise e interpretação de dados; tecnologias para Gestão de Pessoas.",
cursos_internos_sebrae:"Análise e interpretação de dados; estruturação de indicadores; consultoria em gestão de pessoas para apoiar gestores.",
temas_competencias_indispensaveis:"Inteligência emocional; análise e interpretação de dados; estruturação e elaboração de relatórios e indicadores; desenvolvimento organizacional.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Gestão de todos os subsistemas de RH; apoio à liderança; captação de recurso para ações de melhoria; gestão orçamentária da unidade; administração de conflitos; participação em reuniões técnicas.",
principais_atividades:"Orientação à equipe; gestão de orçamento; atendimento aos clientes internos; despacho de processos via sistema; resolução de assuntos por e-mail; participação em reuniões.",
conhecimentos_habilidades_indispensaveis:"Técnico: Excel avançado, gestão de processos, análise de dados, legislação trabalhista, sistemas específicos da unidade. Comportamental: resolução de problemas/conflitos, trabalho em equipe, inteligência emocional, tomada de decisão.",
responsabilidades_extras:"Atuação em grupos técnicos de trabalho de assuntos organizacionais; supervisão de processos e contratos; captação de recurso.",
cursos_eventos_interesse:"CONARH 2025.",
formacao_academica_relacionada:"Gestão de Pessoas e Psicologia Positiva no desenvolvimento humano.",
cursos_realizados:"Excel intermediário.",
desenvolvimento_futuro:"SIM. Inteligência emocional, análise e interpretação de dados, relatórios e indicadores, desenvolvimento organizacional.",
principal_atuacao:"Gestão de todos os subsistemas de RH: Cultura e Clima, Provimento, Planejamento Estratégico de Pessoal, Desenvolvimento e Treinamento, Administração de Pessoal, Saúde e Segurança, Carreira e Desempenho, Benefícios, apoio à liderança, orçamento e projetos."
}},
{
email:"vivian.reis@to.sebrae.com.br",nome:"VIVIAN NASCIMENTO REIS",arquivo:"VIVIAN NASCIMENTO REIS_QUESTIONARIO.pdf",url:"https://drive.google.com/file/d/1f8-2l9JE9LtO2xnO-3nzFJ-gKhDJjO4Y/view",
obs:"Transcrição histórica do questionário de 2025 conforme PDF original.",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz entre equipes ou setores; falta de tempo; processos internos burocráticos ou complexos; volume excessivo de demandas sem estrutura adequada.",
graduacoes_fundamentais:"Administração, Contabilidade ou Recursos Humanos - gestão dos processos, contratos e área trabalhista.",
especializacoes_recomendadas:"MBA em Gestão de Pessoas; Pós-Graduação em Diversidade, Equidade, Inclusão e Cultura Organizacional.",
cursos_extracurriculares:"Curso de Folha de Pagamento; Gestão e Automação de Ponto Eletrônico; Diversidade e Inclusão.",
cursos_internos_sebrae:"Gestão de Processos; Inteligência Emocional; Criatividade e Inovação; Negociação.",
temas_competencias_indispensaveis:"Diversidade e Inclusão; Saúde e Segurança do Trabalho; Administração de Pessoal.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Gestão de contratos de benefícios e fornecedores; gestão de estagiários desde admissão, bolsa, renovações, recessos, aditivos e ponto; Projeto de Diversidade e Inclusão; Núcleo de Saúde e Segurança, contrato de assessoria em SST e programas de SST.",
principais_atividades:"Admissão de pessoal (estagiários e empregados); gestão dos contratos de benefícios; gestão dos estagiários; Projeto de Diversidade e Inclusão; acompanhamento e gestão dos programas de SST.",
conhecimentos_habilidades_indispensaveis:"Gestão de Processos; Licitações e Contratos; Legislação Trabalhista e Previdenciária; Sistema RM automação de ponto e folha; Diversidade e Inclusão; Legislação de Saúde e Segurança do Trabalho. Habilidades: comunicação eficaz, tomada de decisão, resolução de problemas e pensamento crítico, gestão do tempo e produtividade, inteligência emocional.",
responsabilidades_extras:"Não que me recorde no momento.",
cursos_eventos_interesse:"CONARH 2025; Diversidade Em Prática Summit; NR 1 e Saúde Mental.",
formacao_academica_relacionada:"MBA em Gestão de Pessoas; Pós-Graduação em Diversidade, Equidade, Inclusão e Cultura Organizacional.",
cursos_realizados:"Curso de Diversidade e Inclusão.",
desenvolvimento_futuro:"SIM. CONARH 2025; Diversidade Em Prática Summit; NR 1 e Saúde Mental.",
principal_atuacao:"Admissão de pessoal, gestão de benefícios, gestão de estagiários, Saúde e Segurança do Trabalho e Diversidade e Inclusão."
}}
];

async function main(){
 if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada");
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  for(const d of D){
   const [u]=await db.execute("SELECT id,name FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1",[d.email]);
   if(!u.length){ console.log("[UGP] EMPREGADO_NAO_ENCONTRADO",d.nome,d.email); continue; }
   const uid=u[0].id;
   const [q]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=2025 ORDER BY versao DESC,id DESC LIMIT 1",[uid]);
   if(q.length){ console.log("[UGP] JA_EXISTE",d.nome,"questionario",q[0].id,"status",q[0].status); continue; }
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,2025,1,'preenchido','importado_historico',?,?,?,?)",[uid,d.arquivo,d.url,d.obs,uid]);
   const qid=ins.insertId;
   for(const [chave,pergunta,ordem] of P){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[qid,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UGP] CRIADO",d.nome,"questionario",qid);
  }
 } finally { await db.end(); }
}
main().catch(e=>{console.error("[UGP] ERRO",e);process.exit(1);});

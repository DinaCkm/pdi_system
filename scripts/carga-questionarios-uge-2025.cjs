const mysql = require("mysql2/promise");

const P=[
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
["principal_atuacao","Pode explicar qual é a sua principal atuação atualmente?",17]
];

const D=[
{nome:"Solivânia Dantas de Araújo Pirett",email:"solivania.pirett@to.sebrae.com.br",arquivo:"SOLIVANIA DANTAS DE ARAUJO PIRETT_QUESTIONARIO.pdf",id:"1mWpPavLCdovZTtWUqS2rCft-LM3ReDqf",obs:"Arquivo localizado na pasta UGE, porém o próprio questionário declara lotação UTIC. Registro vinculado à empregada, sem alteração de lotação.",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; dificuldade de acesso a informações; falta de clareza nas responsabilidades; falta de suporte; volume excessivo de demandas.",
graduacoes_fundamentais:"Direito; Tecnologia da Informação; Segurança da Informação; Comunicação e Relacionamento.",
especializacoes_recomendadas:"Governança em Privacidade e Segurança da Informação; Comunicação; Liderança e Gestão de Pessoas; Relações Interpessoais; Gestão de Projetos e Processos.",
cursos_extracurriculares:"Comunicação; Oratória; Relacionamento Interpessoal; Metodologias Ágeis; Inteligência Emocional; Liderança; Atendimento ao Cliente; Inovação; Gestão de Mudanças; Gestão do Tempo; Marketing Pessoal.",
cursos_internos_sebrae:"Comunicação; Oratória; Relacionamento Interpessoal; Metodologias Ágeis; Inteligência Emocional; Liderança; Atendimento; Inovação.",
temas_competencias_indispensaveis:"Governança em privacidade e segurança da informação; Comunicação; Liderança e Gestão de Pessoas.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Como DPO, é responsável por promover a privacidade e a proteção dos dados pessoais de colaboradores, clientes e fornecedores, conforme requisitos legais, técnicos e organizacionais.",
principais_atividades:"Comunicação com titulares; comunicação com a ANPD; orientação e treinamento; apoio a procedimentos de incidentes, registros e relatórios de impacto; monitoramento de conformidade.",
conhecimentos_habilidades_indispensaveis:"Legislação e prática em proteção de dados; privacidade e segurança da informação; governança de dados; DLP, SIEM, OneTrust; gestão de incidentes; comunicação eficaz; persuasão; iniciativa; integração; determinação; resiliência; exatidão; agilidade.",
responsabilidades_extras:"Atividades de gestão e operacionais de competência de gestores de processos ou agentes de tratamento de dados pessoais.",
cursos_eventos_interesse:"Reuniões Técnicas do Grupo de Encarregados pelo Tratamento de Dados do Sistema Sebrae e cursos de governança, compliance, controles internos, riscos e privacidade.",
formacao_academica_relacionada:"Governança em Privacidade.",
cursos_realizados:"Liderança e Gestão de Pessoas.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Encarregada pelo Tratamento de Dados Pessoais do Sebrae/TO - DPO."
}},
{nome:"Wandemberg Pereira Rodrigues",email:"wandemberg.rodrigues@to.sebrae.com.br",arquivo:"WANDEMBERG PEREIRA RODRIGUES_QUESTIONARIO.pdf",id:"1UdUmyKrXjIcZcqa6URB5HRDHwsfVaBLX",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Dificuldade de acesso a informações e dados; falta de tempo; falta de treinamentos específicos.",
graduacoes_fundamentais:"Administração de Empresas; Gestão Ambiental.",
especializacoes_recomendadas:"Gestão de Projetos; Inovação e Transformação Digital; ESG, Sustentabilidade e Responsabilidade Corporativa.",
cursos_extracurriculares:"Gestão de Projetos; Gestão de Riscos Ambientais e Sustentabilidade; normas ESG; Transformação Digital; Gestão Ágil de Projetos.",
cursos_internos_sebrae:"Transformação Digital; ESG no âmbito corporativo.",
temas_competencias_indispensaveis:"Transformação Digital e inovação corporativa; Sustentabilidade e Responsabilidade Social Corporativa.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua de forma estratégica para melhoria dos processos de compras, ESG e Transformação Digital.",
principais_atividades:"Acompanhamento de consultoria de Supply Chain; coordenação de iniciativas ESG; promoção da transformação digital; planos de ação estratégicos; representação junto ao Centro Sebrae de Sustentabilidade.",
conhecimentos_habilidades_indispensaveis:"Fundamentos de ESG; gestão de projetos; transformação digital; Office; ferramentas colaborativas; leitura de normativos; organização; visão sistêmica; proatividade; colaboração; gestão de conflitos.",
responsabilidades_extras:"Assumiu ESG e Transformação Digital, frentes originalmente fora de seu escopo comum.",
cursos_eventos_interesse:"ESG Summit; Programa de Gestão na Transformação Digital da Fundação Dom Cabral.",
formacao_academica_relacionada:"Administração de Empresas; Gestão de Projetos; MBA em Marketing Estratégico com conteúdos ligados à transformação digital.",
cursos_realizados:"Gestão de Projetos.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Melhoria de Supply Chain e gestão de fornecedores; ESG; Transformação Digital."
}},
{nome:"Victor Otávio Andrade das Neves",email:"victor.neves@to.sebrae.com.br",arquivo:"VICTOR OTAVIO ANDRADE DAS NEVES_QUESTIONARIO.pdf",id:"1x2PAU3LECRNtkVmFn5yg-svXuYyamx6i",r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; mudanças sem treinamento; processos burocráticos; volume excessivo; resistência cultural à padronização e melhoria contínua.",
graduacoes_fundamentais:"Engenharia de Produção; Administração; Sistemas de Informação; Engenharia ou Ciência da Computação; Controle e Automação.",
especializacoes_recomendadas:"BPM e Processos; Lean Six Sigma; Governança e ESG; Transformação Digital; Data Analytics; Gestão de Sistemas/TI; Gestão de Projetos; Gestão da Mudança; Gestão de Pessoas e Liderança.",
cursos_extracurriculares:"Formações e certificações em Project Management, Data Analytics, Data Science, Cloud, IA, BPM, Process Mining e Lean Six Sigma.",
cursos_internos_sebrae:"Project Management e Agile; Data Analytics e BI; Data Science e Python; Cloud e Arquitetura; IA Generativa e Inovação Digital.",
temas_competencias_indispensaveis:"BPM avançado e Process Mining; Data Analytics aplicado a KPIs; Automação e Transformação Digital; GRC; Gestão da Mudança e Liderança Ágil.",
plano_capacitacao_ano:"SIM.",
descricao_funcao:"Mapeia e redesenha processos ponta a ponta, define indicadores e metas, conduz melhoria contínua e automação, garante conformidade e atua como consultor interno.",
principais_atividades:"Mapear e redesenhar fluxos; monitorar indicadores; conduzir melhoria, automação e reestruturação; gerir mudança e conhecimento; garantir conformidade e rastreabilidade.",
conhecimentos_habilidades_indispensaveis:"BPMN 2.0; Se Suite/Fluig; Lean Six Sigma; Excel, SQL, Power BI e Python; automação; ISO 9001/31000; LGPD; PMBOK; Scrum/Kanban; ADKAR; comunicação, negociação, liderança de mudança, facilitação, priorização, resolução de problemas, adaptabilidade e empatia.",
responsabilidades_extras:"Mentoria em tecnologia e IA; liderança da gestão da mudança; curadoria de boas práticas; projetos especiais de reestruturação organizacional e regimento.",
cursos_eventos_interesse:"Data & Analytics Live; Data Science Fórum; CSBC; BPM Conference; BPM Day; Datacon; Lean Six Sigma Black Belt; Process Mining; PMI-ACP; Gartner BPM; Data Governance & Privacy by Design; Sebrae Innovation & AI Bootcamp.",
formacao_academica_relacionada:"Engenharia Mecânica; cursando Sistemas de Informação; especializações em Análise de Sistemas e AI/BI/Big Data; certificados Google de Project Management e Data Analytics.",
cursos_realizados:"Certificados Google Project Management e Data Analytics e bootcamps de dados, cloud e IA.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gestor do Escritório de Processos e Qualidade."
}},
{nome:"Pedro Junior da Rocha Silva",email:"pedro.junior@to.sebrae.com.br",arquivo:"PEDRO JUNIOR DA ROCHA SILVA_QUESTIONARIO.pdf",id:"1oH_3qIsXPM7_gNN1qoE5iAyYfcNy-lqd",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de tempo; volume excessivo de demandas.",
graduacoes_fundamentais:"Psicologia; Direito.",
especializacoes_recomendadas:"MBA em Gestão de Negócios.",
cursos_extracurriculares:"Gestão; Liderança; Gestão de Conflitos; Power BI; Estratégia; Compliance; Gestão de Riscos; Integridade.",
cursos_internos_sebrae:"Programa de Formação de Sucessores.",
temas_competencias_indispensaveis:"Gestão; Liderança; Gestão de Conflitos; Power BI; Estratégia; Compliance; Gestão de Riscos; Integridade.",
plano_capacitacao_ano:"SIM. Programa de Sucessores do Sebrae/TO.",
descricao_funcao:"Tem a responsabilidade de gestão da Governança e Integridade do Sebrae/TO.",
principais_atividades:"Orientação da equipe; assessoramento da Alta Administração; articulação do Plano Tático; olhar estratégico; atividades administrativas da Unidade, DIRAF e Comissão de Ética.",
conhecimentos_habilidades_indispensaveis:"Metodologias ágeis; Gestão de Riscos; Inteligência Emocional; Orientação para Resultados; Negociação; Tomada de Decisão; Visão Estratégica; cenários macroeconômicos; normas e políticas de integridade.",
responsabilidades_extras:"Participação em comitês e grupos de trabalho; orientação a outros gerentes; responder pelo DIRAF em sua ausência.",
cursos_eventos_interesse:"HSM.",
formacao_academica_relacionada:"Nenhum dos MBAs sugeridos.",
cursos_realizados:"Todos os cursos extracurriculares sugeridos já fazem parte da trajetória.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gerente da Unidade de Gestão Estratégica e Integridade, envolvendo planejamento, monitoramento, inteligência, dados, pesquisas, compliance, riscos, integridade, ESG, inovação, processos e qualidade."
}},
{nome:"Mirelle Soares Milhomens",email:"mirelle.milhomens@to.sebrae.com.br",arquivo:"MIRELLE SOARES MILHOMENS_QUESTIONARIO.pdf",id:"13Fuus5Ka2-JREAlsuZVMydrrvUVeo_OC",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de treinamentos específicos e necessidade de acompanhar alterações de leis e normas.",
graduacoes_fundamentais:"Ciências Contábeis; Direito; Administração.",
especializacoes_recomendadas:"Gestão de Riscos e Compliance; Gestão de Pessoas.",
cursos_extracurriculares:"Comunicação e Oratória; Controles Internos; Excel Avançado.",
cursos_internos_sebrae:"Compliance; Gestão de Riscos; Programa de Integridade; Ouvidoria; Controles Internos.",
temas_competencias_indispensaveis:"Gestão de Riscos; Programa de Integridade; Ouvidoria; Controles Internos.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Contribui para melhoria contínua dos processos, produtos e serviços por meio de gestão de riscos, controles internos e atendimento das demandas da Ouvidoria.",
principais_atividades:"Aplicação da metodologia de riscos; revisão de controles; campanhas de cultura de riscos; relatórios à Diretoria; tratamento de manifestações e denúncias; relatórios de Ouvidoria e Compliance.",
conhecimentos_habilidades_indispensaveis:"Gestão de Riscos; Controles Internos; COSO; comunicação eficaz; trabalho em equipe; proatividade; gestão do tempo.",
responsabilidades_extras:"Atuação colaborativa em processos fora de sua responsabilidade direta.",
cursos_eventos_interesse:"Congressos e cursos relacionados à função, a pesquisar após retorno de licença maternidade.",
formacao_academica_relacionada:"Pós-graduação em Gestão de Riscos e Compliance.",
cursos_realizados:"Comunicação e Oratória; Controles Internos; Excel Avançado.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Integridade com ênfase em Gestão de Riscos e Controles Internos e atuação operacional na Ouvidoria."
}},
{nome:"Michele Raquel de Mattos Silva",email:"michele.silva@to.sebrae.com.br",arquivo:"MICHELE RAQUEL DE MATTOS SILVA_QUESTIONARIO.pdf",id:"1BWJm2MSFGiOmCgk1Efr0fgM5XDBMRUnF",r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Falta de clareza nas responsabilidades; falta de tempo; processos burocráticos; atribuições versus força de trabalho da equipe.",
graduacoes_fundamentais:"Direito; Administração.",
especializacoes_recomendadas:"MBA em Compliance.",
cursos_extracurriculares:"Compliance FGV; Especialização em Compliance LEC; formação Compliance Raiz.",
cursos_internos_sebrae:"Gestão do Tempo; Metodologias Ágeis; IA; Comunicação e Oratória; Gestão de Crises; Investigações Internas; Governança Corporativa.",
temas_competencias_indispensaveis:"Compliance técnico; Gestão do Tempo; Metodologias Ágeis; IA; Comunicação e Oratória; Gestão de Crises; Investigações Internas.",
plano_capacitacao_ano:"SIM. PDI alinhado ao perfil DISC, com foco principal no desenvolvimento técnico.",
descricao_funcao:"Analista de Compliance e Integridade, assegurando aderência a leis, regulamentos e políticas e promovendo cultura ética e transparente.",
principais_atividades:"Apoio à Alta Administração; Due Diligence; treinamento e comunicação; monitoramento; implementação de políticas e procedimentos.",
conhecimentos_habilidades_indispensaveis:"Legislação de Compliance e Lei Anticorrupção; IA; due diligence; gestão de riscos e controles; políticas e procedimentos; treinamentos; comunicação eficaz; gestão do tempo; tomada de decisão; trabalho em equipe; ética e integridade.",
responsabilidades_extras:"Demandas alinhadas à função, com limitação de equipe frente ao volume e à responsabilidade.",
cursos_eventos_interesse:"12º Congresso Internacional de Compliance.",
formacao_academica_relacionada:"Administração de Empresas.",
cursos_realizados:"Curso Compliance Raiz em andamento.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Analista de Compliance e Integridade."
}},
{nome:"Luciana Carvalho de Aguiar",email:"lucianna.pmw@gmail.com",arquivo:"LUCIANA CARVALHO DE AGUIAR_QUESTIONARIO.pdf",id:"1pbb4m76gJdXsr0MjF-XeiRteXFJUq4DU",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de clareza nas responsabilidades; falta de tempo; processos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração de Empresas.",
especializacoes_recomendadas:"MBA em Planejamento Estratégico; MBA em Gestão de Projetos.",
cursos_extracurriculares:"Inteligência Emocional com foco em gestores e líderes; Liderança Estratégica; Gestão de Projetos; certificações PMP e metodologias ágeis.",
cursos_internos_sebrae:"Gestão de Projetos; Inteligência Emocional com foco no desenvolvimento de gestores.",
temas_competencias_indispensaveis:"Gestão Estratégica; Planejamento Empresarial; Gestão de Projetos; Inteligência Emocional; Análise de Dados.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Analista de Planejamento Estratégico responsável por apoiar a definição e o alcance de objetivos de longo prazo e metas de curto prazo, além de conduzir monitoramento e análise crítica.",
principais_atividades:"Análise de dados; desenvolvimento de estratégias; monitoramento de desempenho; relatórios e apresentações; gestão de projetos.",
conhecimentos_habilidades_indispensaveis:"Excel, SQL e BI; análise de dados; pensamento crítico; gestão de projetos; comunicação eficaz; resolução de problemas; conhecimento de mercado; trabalho em equipe.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Certificação PMP; HSM 2025.",
formacao_academica_relacionada:"Formação acadêmica relacionada à gestão e planejamento estratégico.",
cursos_realizados:"Cursos e capacitações ligados à gestão e planejamento.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Planejamento Estratégico."
}},
{nome:"Bruno Henrique Vila Verde",email:"bruno.vilaverde@to.sebrae.com.br",arquivo:"BRUNO HENRIQUE VILA VERDE_QUESTIONARIO.pdf",id:"1ZsurVA2TS8uWHnguHvCUVDLbfUOFtzvZ",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de clareza nas responsabilidades; baixo amadurecimento institucional sobre Inteligência e Análise de Dados.",
graduacoes_fundamentais:"Qualquer graduação pode se especializar, com maior facilidade para formações em computação e exatas; recomenda pós-graduação em Análise de Dados.",
especializacoes_recomendadas:"MBA em Data Science e Analytics.",
cursos_extracurriculares:"Workshops, eventos e cursos voltados à análise de dados.",
cursos_internos_sebrae:"Inteligência Artificial e Big Data; Segurança da Informação.",
temas_competencias_indispensaveis:"Governança de Dados; Cultura Analítica; Arquitetura de Dados; Alfabetização em Dados.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Fomenta o ecossistema de Inteligência de Dados, construindo produtos de dados, disponibilizando informações e implantando cultura analítica no Sebrae.",
principais_atividades:"Construção de painéis e dashboards; análise de dados para negócios; análise para parceiros institucionais; análise para imprensa; implantação da cultura analítica.",
conhecimentos_habilidades_indispensaveis:"Excel Avançado com Macros e VBA; Qlik Sense; processos de análise de dados; Comunicação Eficaz; Relacionamento Interpessoal; Atuação Colaborativa.",
responsabilidades_extras:"Construção de sistema de coleta de dados em Excel avançado, com macros e VBA, e articulação com regionais para captura de dados.",
cursos_eventos_interesse:"Não indicou evento específico.",
formacao_academica_relacionada:"A formação para especialização em Data Science e Analytics pode partir de qualquer graduação.",
cursos_realizados:"Não possui formação oficial na área de análise de dados; desenvolveu experiência prática.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Núcleo de Inteligência de Dados, construindo painéis e realizando levantamentos e análises para estratégia, parceiros e imprensa."
}},
{nome:"Antonio Neto dos Santos",email:"antonio.santos@to.sebrae.com.br",arquivo:"ANTONIO NETO DOS SANTOS_QUESTIONARIO.pdf",id:"1Dumg-iK2cffV4hefIE_imAdvOqPqZN85",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas ou sistemas; falta de tempo; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração de Empresas; Ciências Contábeis.",
especializacoes_recomendadas:"MBA em Inovação e Transformação Digital.",
cursos_extracurriculares:"Transformação Digital e uso de IA; Gestão de Riscos.",
cursos_internos_sebrae:"Transformação Digital.",
temas_competencias_indispensaveis:"Compliance e Integridade; Gestão de Riscos; Due Diligence.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua para garantir aderência a normas e regulamentos, monitorando riscos, desenvolvendo planos de mitigação e assegurando transparência das operações.",
principais_atividades:"Análise de riscos; desenvolvimento de políticas e procedimentos; treinamento e capacitação; monitoramento contínuo; relatórios e comunicação.",
conhecimentos_habilidades_indispensaveis:"Gestão de Riscos; normas e regulamentos; habilidades analíticas; comunicação assertiva; treinamento e capacitação; monitoramento.",
responsabilidades_extras:"Ponto focal e gestor do processo Nacional de Integridade - Transparência.",
cursos_eventos_interesse:"Ainda não havia definido evento específico.",
formacao_academica_relacionada:"Administração de Empresas.",
cursos_realizados:"Compliance Masterclass 2025; Seminário de Governança, Transparência, Compliance, Integridade e Ética; Gestão de Riscos segundo COSO; Compliance Anticorrupção; Governo Aberto; responsabilização na Lei Anticorrupção.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Compliance e Integridade, com foco em Gestão de Riscos e Transparência."
}}
];

function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();}

async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [users]=await db.execute("SELECT id,name,email FROM users");
  for(const d of D){
   let u=users.find(x=>String(x.email||"").toLowerCase()===String(d.email||"").toLowerCase());
   if(!u){
     const matches=users.filter(x=>norm(x.name)===norm(d.nome));
     if(matches.length===1) u=matches[0];
     else if(matches.length>1){console.log("[UGE] NOME_AMBIGUO",d.nome);continue;}
   }
   if(!u){console.log("[UGE] EMPREGADO_NAO_ENCONTRADO",d.nome,d.email);continue;}
   const [ex]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=2025 ORDER BY versao DESC,id DESC LIMIT 1",[u.id]);
   if(ex.length){console.log("[UGE] JA_EXISTE",d.nome,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.id+"/view";
   const obs=d.obs||"Transcrição histórica do questionário de 2025 conforme PDF original. Unidade: UGE.";
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,2025,1,'preenchido','importado_historico',?,?,?,?)",[u.id,d.arquivo,url,obs,u.id]);
   for(const [chave,pergunta,ordem] of P){
     const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
     await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[ins.insertId,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UGE] CRIADO",d.nome,"questionario",ins.insertId);
  }
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGE] ERRO",e);process.exit(1);});

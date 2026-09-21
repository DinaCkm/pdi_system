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
{ano:2026,email:"wanessa.martins@to.sebrae.com.br",nome:"Wanessa Sobreira dos Santos Martins",arquivo:"Wanessa_Sobreira_dos_Santos_Martins - NOVO QUESTIONARIO_.pdf",id:"1rGdsUO3rN_PWORAqksV3NMA2UrUjsyLf",obs:"Questionário mais recente da UMC, enviado em 23/03/2026. O formulário ainda contém referência textual a 2025; o ano do registro foi preservado pelo timestamp de envio.",r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Falta de tempo; volume excessivo de demandas; conciliar atuação estratégica com demanda operacional elevada; gargalo na criação de peças gráficas e materiais visuais.",
graduacoes_fundamentais:"Comunicação Social (Jornalismo, Publicidade e Propaganda ou Relações Públicas) ou Marketing.",
especializacoes_recomendadas:"Comunicação Interna e Endomarketing; Comunicação Estratégica; Gestão Estratégica da Comunicação Interna; Employee Experience; Branding e Gestão de Marca.",
cursos_extracurriculares:"Storytelling; Copywriting; Métricas e análise de dados; Criatividade e Design Thinking.",
cursos_internos_sebrae:"Criatividade e Design Thinking; Copywriting e escrita estratégica.",
temas_competencias_indispensaveis:"Comunicação interna estratégica; endomarketing e campanhas de engajamento; métricas e análise de resultados.",
plano_capacitacao_ano:"SIM. Capacitações registradas na plataforma Evoluir CKM.",
descricao_funcao:"Responsável pela comunicação interna e endomarketing, transformando informações internas em conteúdos claros e estratégicos, desenvolvendo campanhas e ações de engajamento e fortalecendo cultura e conexão.",
principais_atividades:"Gestão do processo de comunicação interna e endomarketing; planejamento e execução de campanhas; produção de conteúdos multicanais; gestão do tom de voz e padronização; apoio estratégico às áreas.",
conhecimentos_habilidades_indispensaveis:"Planejamento de comunicação interna; conteúdo multiplataforma; ferramentas de comunicação e design; storytelling e copywriting; gestão de processos; métricas; cultura organizacional; comunicação clara e empática; organização; criatividade; proatividade; escuta ativa; colaboração; adaptabilidade; liderança e influência.",
responsabilidades_extras:"Atuação como gerente interina da UMC; Banco de Avaliadores Internos do REPG; Núcleo de Comunicação de Resultados; gestão e modelagem de processos; Presidência da CIPA; participação em comitês internos.",
cursos_eventos_interesse:"Encontros técnicos de Comunicação Interna e Endomarketing promovidos pelo Sebrae Nacional e outros eventos do Sistema Sebrae.",
formacao_academica_relacionada:"MBA em Comunicação Estratégica.",
cursos_realizados:"Storytelling aplicado à comunicação; métricas e análise de dados.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Comunicação Interna e Endomarketing, com planejamento, produção e execução de ações estratégicas voltadas ao engajamento dos colaboradores."
}},
{ano:2025,email:"ana.costa@to.sebrae.com.br",nome:"Ana Cássia de Oliveira Costa",arquivo:"Ana Cassia Costa_QUESTIONARIO.pdf",id:"1drHnHZ_D2N_2_fIfINLovgQZ-UPiJKt6",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de treinamentos; mudanças de processos sem treinamento; burocracia; volume excessivo; falta de clareza institucional sobre papéis e responsabilidades em eventos.",
graduacoes_fundamentais:"Eventos; Comunicação Social; Marketing; Relações Públicas.",
especializacoes_recomendadas:"Gestão de Eventos; Marketing Estratégico; Relações Públicas; Gestão de Pessoas; Processos e Contratos; Inovação/TI e Comunicação.",
cursos_extracurriculares:"Eventos Estratégicos; Branding; Cerimonial e Protocolo; Comunicação e Oratória; Gestão de Pessoas; Inovação para eventos; Gestão do Tempo; Gestão de Processos; Gestão de Contratos para Eventos.",
cursos_internos_sebrae:"Gestão de Processos; Análise de Indicadores; Liderança e Gestão de Equipes; Transformação Digital; Comunicação e Oratória; Cerimonial e Protocolo; Gestão do Tempo; Economia Criativa e Sustentabilidade.",
temas_competencias_indispensaveis:"Gestão de Eventos; Transformação Digital; Cerimonial e Protocolo.",
plano_capacitacao_ano:"SIM. Encontro da Rede de Eventos e participação na COP30.",
descricao_funcao:"Cria, formata e conduz eventos de forma estratégica e tática, apoiando gestores, estruturando processos, coordenando o Comitê de Eventos e atuando em cerimonial.",
principais_atividades:"Gestão do processo de eventos; atendimento ao gestor; coordenação do Comitê de Eventos; apoio ao gestor; cerimonial.",
conhecimentos_habilidades_indispensaveis:"Gestão de processos, pessoas e contratos; planejamento e execução de eventos; legislação de cerimonial; ferramentas de RSVP; comunicação eficaz; gestão do tempo; produtividade; resolução de problemas e mediação de conflitos.",
responsabilidades_extras:"Estruturação e gestão prática do processo de eventos; criação de fluxos e documentos; cerimonial e criação de roteiros ainda sem mensuração formal no processo.",
cursos_eventos_interesse:"Encontro da Rede de Eventos do Sistema Sebrae; COP30; grandes eventos para benchmarking.",
formacao_academica_relacionada:"Comunicação Social; Pós em Marketing Estratégico; Pós em Inovação; início de Pós em Eventos.",
cursos_realizados:"Cerimonial e Protocolo.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Eventos, apoiando desde a criação e planejamento até a execução e cerimonial."
}},
{ano:2025,email:"dorival.junior@to.sebrae.com.br",nome:"Dorival Gonçalves de Sousa Júnior",arquivo:"Dorival Gonçalves de Sousa Júnior_QUESTIONARIO.pdf",id:"1dExeUQF7808FkLp4tBcybxQjwFWNhLUs",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; falta de treinamentos; processos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Comunicação Social/Publicidade e Propaganda; Design Gráfico; Marketing; Relações Públicas; Jornalismo.",
especializacoes_recomendadas:"Comunicação e Marketing Institucional; Produção Publicitária e Mídias Digitais; Gestão de Projetos; Marketing Digital; Comunicação Empresarial/Transmídia; Gestão da Comunicação Pública; IA para Gestão e Negócios.",
cursos_extracurriculares:"Feiras de comunicação e hubs de inovação; Gestão de Projetos com foco em Comunicação; Storytelling Institucional; Oratória.",
cursos_internos_sebrae:"Empretec; Gestão de Projetos; Liderança.",
temas_competencias_indispensaveis:"Comunicação Institucional e Publicitária; Gestão de Projetos e Processos; Marketing Digital e Mídias Sociais; legislação e contratações; benchmarking; relacionamento institucional.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Faz a ponte entre o planejamento das ações do Sebrae e a execução da comunicação visual e promocional, gerindo processos publicitários, fornecedores, materiais e pagamentos.",
principais_atividades:"Gestão de processos com agência e empresas licitadas; atendimento interno; acompanhamento de itens; fiscalização e controle de qualidade; pagamento e acompanhamento até encerramento.",
conhecimentos_habilidades_indispensaveis:"Publicidade e Propaganda; planejamento de campanhas; produção gráfica; mídia e linguagem visual; organização; atenção; comunicação; Excel e Word; Scrum/Kanban; processos licitatórios; monitoramento de tendências.",
responsabilidades_extras:"Validação de artes; levantamento de informações para criação; roteiros de vídeos, spots e peças para TV; busca de materiais gráficos produzidos pela agência.",
cursos_eventos_interesse:"Rio2C; CMO Summit; e-Festival; curso de Storytelling.",
formacao_academica_relacionada:"MBA em Comunicação Empresarial com Gestão de Conteúdo Transmídia; MBA em Inteligência Artificial para Gestão e Negócios.",
cursos_realizados:"Oratória; Gestão de Projetos com foco em Comunicação.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Publicidade e comunicação, com gestão de processos de materiais gráficos, promocionais e campanhas."
}},
{ano:2025,email:"elienilson.conceicao@to.sebrae.com.br",nome:"Elienilson Gonçalves da Conceição",arquivo:"Elienilson Gonçalves da Conceição_QUESTIONARIO.pdf",id:"1rQeEWxYuTWwEUHedyzOVFt-9r1JlMEOt",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; volume excessivo de demandas.",
graduacoes_fundamentais:"Cursos na área de gestão.",
especializacoes_recomendadas:"Pós-graduação em Gestão.",
cursos_extracurriculares:"Treinamento em Gestão; Oratória.",
cursos_internos_sebrae:"Cursos de atendimento e gestão.",
temas_competencias_indispensaveis:"Conhecimento em gestão; trabalho sob pressão e intempestividade; trabalho em equipe.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Analisa processos, identifica necessidade do cliente interno, encaminha cotação conforme contratos, emite ordem de serviço, recebe produto e finaliza processos de pagamento.",
principais_atividades:"Análise de processo; serviço e cotação; ordem de serviço; recebimento do produto; envio de notas fiscais e processo de pagamento.",
conhecimentos_habilidades_indispensaveis:"Organização; comunicação; uso do SE Suite.",
responsabilidades_extras:"Busca de materiais; solicitação de artes; gestão de contratos.",
cursos_eventos_interesse:"Ainda não escolheu.",
formacao_academica_relacionada:"Curso na área de gestão ligado ao agronegócio.",
cursos_realizados:"Já realizou cursos de gestão/oratória.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gestão de contratos."
}},
{ano:2025,email:"geovane.almeida@to.sebrae.com.br",nome:"Geovane Almeida Nepomuceno",arquivo:"Geovane Almeida_QUESTIONARIO.pdf",id:"1qoTOYRj0iQIRs_CXRHlqkBEaUat2zRrs",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas; falta de tempo; falta de treinamentos; processos burocráticos; volume e diversidade de campanhas com prazos curtos; dificuldade para capacitação e desenvolvimento de liderança/gestão do tempo.",
graduacoes_fundamentais:"Design Gráfico; Inteligência Artificial; Marketing.",
especializacoes_recomendadas:"Branding; Design Estratégico e Inovação; Inteligência Artificial.",
cursos_extracurriculares:"Adobe Illustrator; Gestor de Tráfego; IA; Direção de Arte/Criação.",
cursos_internos_sebrae:"Gestão de Processos; Liderança e Gestão de Equipes; Gestão do Tempo.",
temas_competencias_indispensaveis:"Criatividade; Inteligência Artificial; Proatividade; Empreendedorismo; Direção de Arte.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Responsável por criar, editar e finalizar peças publicitárias e monitorar a aplicação correta da marca Sebrae.",
principais_atividades:"Análise de processos e briefings; criação de identidades visuais; delegação para designers/agência; criação de campanhas; monitoramento de redes sociais.",
conhecimentos_habilidades_indispensaveis:"Design gráfico; direção de arte; branding; Photoshop; Illustrator; IA; especificações de materiais; marketing digital; redes sociais; criatividade; organização; comunicação; proatividade; liderança; gestão do tempo; adaptabilidade.",
responsabilidades_extras:"Produção de spots para rádio/carro de som com IA; gestão temporária de redes sociais; captação de imagens.",
cursos_eventos_interesse:"RD Summit; Hotmart Fire; curso de Direção de Criação; curso Illustrator.",
formacao_academica_relacionada:"Graduação em Marketing; MBA em Design Estratégico e Inovação.",
cursos_realizados:"Direção de Arte/Criação.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Comunicação e marketing, com criação de peças, campanhas e monitoramento/gestão de redes sociais."
}},
{ano:2025,email:"luana.martins@to.sebrae.com.br",nome:"Luana Fernanda Rosa Martins",arquivo:"Luana Fernanda Rosa Martins_QUESTIONARIO.pdf",id:"1hj-FmPI-DwHZ79VEDPG8IQR3VUNiCtez",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Desafios relacionados à comunicação, agilidade e atualização constante na assessoria de imprensa.",
graduacoes_fundamentais:"Jornalismo; Comunicação Social; Relações Públicas.",
especializacoes_recomendadas:"Comunicação Empresarial e Institucional; Assessoria de Imprensa; Comunicação Organizacional.",
cursos_extracurriculares:"Gestão de Crises; Comunicação Assertiva; Assessoria de Imprensa Digital; Produção de Conteúdo.",
cursos_internos_sebrae:"Comunicação e Relacionamento com Clientes; cursos de Comunicação e Marketing.",
temas_competencias_indispensaveis:"Comunicação Estratégica; Gestão de Crises e Reputação; Assessoria de Imprensa Digital; Produção de Conteúdo; Relacionamento com a Imprensa; benchmarking.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Assessoria de imprensa estratégica, fazendo a ponte entre o Sebrae e veículos de mídia, fortalecendo a imagem institucional e divulgando projetos.",
principais_atividades:"Produção e distribuição de conteúdos jornalísticos; relacionamento com a imprensa; cobertura de eventos e ações; clipping e análise de mídia; criação e divulgação de cases de sucesso.",
conhecimentos_habilidades_indispensaveis:"Redação jornalística; assessoria de imprensa; produção de conteúdo; clipping e monitoramento; Word, Excel, WordPress e fotografia; comunicação assertiva; organização; proatividade; agilidade; relacionamento; visão estratégica; adaptabilidade; trabalho em equipe.",
responsabilidades_extras:"Manuseio do sistema administrativo da empresa.",
cursos_eventos_interesse:"Congresso Mega Brasil de Comunicação, Inovação e Estratégias Corporativas; benchmarking com outros Sebraes.",
formacao_academica_relacionada:"MBA em Comunicação Empresarial e Institucional.",
cursos_realizados:"Gestão de Crises e Comunicação Assertiva.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Assessora de Imprensa - Jornalista."
}},
{ano:2025,email:"marcelle.felix@to.sebrae.com.br",nome:"Marcelle Soares Felix",arquivo:"Marcelle Soares Felix_QUESTIONARIO.pdf",id:"1-BCejQ6vx_Ctbk7M0N5Bqq7vTd84azi_",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas; falta de suporte; falta de tempo; processos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Comunicação Social.",
especializacoes_recomendadas:"Marketing Estratégico; Marketing Digital.",
cursos_extracurriculares:"Marketing Digital e Vendas; Gestão Ágil; Gestão de Projetos.",
cursos_internos_sebrae:"Transformação Digital; Gestão de Processos.",
temas_competencias_indispensaveis:"Marketing de Conteúdo; marketing de vendas; análise de dados; gestão de campanhas; pensamento crítico; criatividade; habilidades técnicas e gestão.",
plano_capacitacao_ano:"SIM. Prospecção B2B; Programa de Aceleração em Prospecção; Workbook Receita Previsível; Customer Success; Customer Experience 2.0.",
descricao_funcao:"Responsável pelo relacionamento das pessoas com a marca Sebrae Tocantins no ambiente digital.",
principais_atividades:"Gerenciamento de conteúdos digitais; campanhas digitais; produção de conteúdo; orientação de campanhas e processos com agência; monitoramento da marca nos canais digitais.",
conhecimentos_habilidades_indispensaveis:"Organização e planejamento; trabalho em equipe; ferramentas de social media; foto e vídeo; gestão do tempo; CRM; social media; edição de vídeo; processos e pagamentos; métricas e análise de dados.",
responsabilidades_extras:"Produção e edição de vídeos.",
cursos_eventos_interesse:"Sem participação prevista em eventos no ano.",
formacao_academica_relacionada:"Graduação em Comunicação Social; MBA em Marketing.",
cursos_realizados:"Certificações em Marketing Digital.",
desenvolvimento_futuro:"SIM. Formação em Comunicação Corporativa e Gestão de Conteúdo.",
principal_atuacao:"Responsável pelo núcleo digital: conteúdos, publicações, campanhas, portais, landing pages, e-mail marketing, redes sociais e site."
}},
{ano:2025,email:"nemias@to.sebrae.com.br",nome:"Nemias Gomes",arquivo:"NEMIAS GOMES_QUESTIONARIO.pdf",id:"1ZNk_nJTJyd3P7iPxmtvzMFuZUknfFVNv",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas; falta de tempo; processos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração de Empresas.",
especializacoes_recomendadas:"Comunicação e Marketing.",
cursos_extracurriculares:"Gestão do tempo e demandas; eventos de comunicação e marketing.",
cursos_internos_sebrae:"Atendimento Consultivo; Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Gestão de demandas e tempo; gestão de pessoas; comunicação e marketing.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Gerencia a equipe que executa as ações de marketing e comunicação do Sebrae, incluindo campanhas publicitárias, eventos e assessoria de imprensa.",
principais_atividades:"Analisar novas demandas; gerir demandas em andamento; participar de reuniões; atender analistas, gerentes e diretoria; atender fornecedores e imprensa.",
conhecimentos_habilidades_indispensaveis:"Gestão do tempo e organização diante de múltiplas demandas e prazos.",
responsabilidades_extras:"Assume atribuições de analistas em função da equipe reduzida, especialmente em temas de recursos financeiros.",
cursos_eventos_interesse:"HSM ou eventos ligados a gestão, comunicação e marketing.",
formacao_academica_relacionada:"Comunicação e Marketing.",
cursos_realizados:"Já participou de eventos de mercado em anos anteriores.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gerência da unidade."
}}
];

async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  for(const d of D){
   const [u]=await db.execute("SELECT id,name FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1",[d.email]);
   if(!u.length){console.log("[UMC] EMPREGADO_NAO_ENCONTRADO",d.nome,d.email);continue;}
   const uid=u[0].id;
   const [ex]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=? ORDER BY versao DESC,id DESC LIMIT 1",[uid,d.ano]);
   if(ex.length){console.log("[UMC] JA_EXISTE",d.nome,d.ano,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.id+"/view";
   const obs=d.obs || ("Transcrição histórica do questionário de "+d.ano+" conforme PDF original. Unidade: UMC.");
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,?,1,'preenchido','importado_historico',?,?,?,?)",[uid,d.ano,d.arquivo,url,obs,uid]);
   for(const [chave,pergunta,ordem] of P){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[ins.insertId,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UMC] CRIADO",d.nome,d.ano,"questionario",ins.insertId);
  }
 } finally {await db.end();}
}
main().catch(e=>{console.error("[UMC] ERRO",e);process.exit(1);});

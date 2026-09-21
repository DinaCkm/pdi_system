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
["desenvolvimento_futuro","Pensando no seu crescimento e no impacto positivo para o Sebrae, existem cursos, formações ou eventos que você acredita que poderiam fortalecer ainda mais suas competências?",16],
["principal_atuacao","Pode explicar qual é a sua principal atuação atualmente?",17],
];

const D = [
{
nome:"José Daniel Tavares Rodrigues",arquivo:"JOSE DANIEL TAVARES RODRIGUES-QUESTIONARIO.pdf",id:"1adqaZVQNHepsG7TF8shsjxaB9KEDJXh9",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz entre equipes ou setores; processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Administração Rural; Gestão de Agronegócios; Economia Rural; Agronomia; Zootecnia; Veterinária; Engenharia Agrícola.",
especializacoes_recomendadas:"Gestão de Projetos; Desenvolvimento Rural; Gestão de Agronegócio; Administração Rural; Políticas Públicas.",
cursos_extracurriculares:"Código de Ética Sistema Sebrae; Conhecendo o Sebrae; Arquitetura Estratégica com foco em inovação; ESG em ação; Gestão colaborativa.",
cursos_internos_sebrae:"Administração e solução de conflitos; Análise de cenários; Inteligência Artificial e Big Data.",
temas_competencias_indispensaveis:"Boa comunicação; liderança; visão sistêmica; capacidade de negociação.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Lidera ações para pequenos produtores e negócios do campo se tornarem mais organizados, lucrativos e sustentáveis; planeja e coordena projetos, oferece apoio técnico e estratégico, articula parcerias e soluções para produtividade, gestão e acesso a mercados.",
principais_atividades:"Planejamento e estratégia; articulação com parceiros; gestão de projetos e programas; capacitação e transferência de conhecimento; comunicação e mobilização.",
conhecimentos_habilidades_indispensaveis:"Agronegócio e cadeias produtivas; gestão de projetos; políticas públicas e fomento; mercado e comercialização; sustentabilidade e inovação no agro; gestão empresarial e empreendedorismo rural; liderança; comunicação didática; articulação e negociação; visão sistêmica; proatividade; adaptabilidade e resiliência.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Encontro Nacional dos Gestores do Programa ALI Rural.",
formacao_academica_relacionada:"Pós-graduações em Administração Rural, Tecnologias para Produção de Leite, Produção de Ruminantes Bovinos de Corte, Ovinos e Caprinos.",
cursos_realizados:"",
desenvolvimento_futuro:"SIM. Administração e solução de conflitos; Análise de cenários; Inteligência Artificial e Big Data.",
principal_atuacao:"Gestão estratégica, conhecimento técnico do setor agropecuário e articulação institucional e territorial."
}},
{
nome:"Izana Assunção Alves",arquivo:"IZANA ASSUNÇÃO ALVES-QUESTIONARIO.pdf",id:"1v0ZWUTdaMzFACwye5SonchPT3Fx290bz",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Falta de tempo; falta de treinamentos específicos; volume excessivo de demandas.",
graduacoes_fundamentais:"Curso superior que ofereça licenciatura além do bacharelado, com didática, psicologia da educação e compreensão de sala de aula.",
especializacoes_recomendadas:"MBA em Liderança e Gestão de Pessoas; MBA em Educação Contemporânea; MBA em Inovação e Transformação Digital; Mestrado em Educação.",
cursos_extracurriculares:"Comunicação e Oratória; Canva; CapCut; redes sociais; Atendimento ao Cliente; metodologias de Educação Empreendedora; BNCC; tecnologias educacionais; gestão escolar.",
cursos_internos_sebrae:"Gestão de Processos; Atendimento Consultivo; Liderança e Gestão de Equipes; Metodologias do Portfólio de Educação Empreendedora.",
temas_competencias_indispensaveis:"Soluções do portfólio de Educação Empreendedora; experiências exitosas em educação; novas formas de abordagem com Canva, CapCut, redes sociais e gamificação; Gestão de Processos.",
plano_capacitacao_ano:"SIM. Metodologias Despertar, JEPP, Dinocards, Terrário, Oficinas IC, Protagonize e online; gestão/mapeamento de processos; Canva; CapCut; gamificação; redes sociais; missão internacional de educação; formação de gerentes e gestores; encontro ALI Educação Empreendedora; Mestrado em Educação.",
descricao_funcao:"Faz interlocução com o sistema nacional, planejamento estadual, estruturação e monitoramento das iniciativas regionais, mobilização de parceiros e articulação do ecossistema de educação.",
principais_atividades:"Interlocução com o Sistema Nacional; elaboração, estruturação e monitoramento da estratégia de atendimento; mobilização de parceiros; operação do Programa ALI Educação Empreendedora; preparação técnica contínua.",
conhecimentos_habilidades_indispensaveis:"Visão sistêmica; planejamento estratégico e DRF; portfólio e metodologia ALI EE; processo de atendimento; gestão de pessoas; sistemas LEME, FOCO, Qlik Sense, SE Suite, SGO; gestão escolar, BNCC e competências de educadores; ecossistema educacional; marco regulatório; gestão de processos, Canva, IA e CapCut; comunicação, empatia, argumentação, resolução de problemas, gestão do tempo, inteligência emocional, negociação, liderança, trabalho em equipe e tomada de decisão.",
responsabilidades_extras:"Realiza competências de Analista III há mais de 10 anos, tendo sido promovida recentemente para esse espaço ocupacional.",
cursos_eventos_interesse:"Alinhamentos e capacitações nacionais de Educação Empreendedora; missões do CER Sebrae; mestrado em Educação.",
formacao_academica_relacionada:"Licenciatura em Biologia; MBA em Liderança; MBA em Gestão de Pessoas; MBA em Educação com foco no aluno.",
cursos_realizados:"Comunicação e Oratória; Atendimento ao Cliente; BNCC; algumas metodologias de Educação Empreendedora.",
desenvolvimento_futuro:"SIM. Mestrado em Educação e missões/formações nacionais do programa.",
principal_atuacao:"Gestora estadual do Programa Nacional de Educação Empreendedora."
}},
{
nome:"Francisco de Assis Dias Ramos",arquivo:"FRANCISCO DE ASSIS DIAS RAMOS-QUESTIONARIO.pdf",id:"1S-pmRV2zocqGmUOZRr2FT35SF3BJvtwN",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; falta de comprometimento de parte das regionais com crédito e serviços financeiros.",
graduacoes_fundamentais:"Administração de Empresas; Economia; Ciências Contábeis.",
especializacoes_recomendadas:"MBA em Gestão Financeira para MPE; Gestão de MPEs.",
cursos_extracurriculares:"MBA em Liderança e Gestão de Pessoas.",
cursos_internos_sebrae:"Análise de Indicadores; Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Controladoria e Finanças; Mercado Financeiro e de Investimentos para pequenos negócios; Projetos de Viabilidade Econômico-Financeira; Crédito para Micro e Pequenas Empresas.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Orienta empresários para acesso ao crédito orientado, identifica necessidade real e produto adequado, mantém relacionamento com instituições financeiras e acompanha empresas com aval do Sebrae para atendimento pós-crédito.",
principais_atividades:"Manter e-book de linhas de crédito; relacionamento com bancos; seminários e rodadas de crédito; painel de empresas Fampeadas; disseminar internamente a importância do crédito orientado.",
conhecimentos_habilidades_indispensaveis:"Planos de negócios e viabilidade econômica; escuta ativa; linhas de crédito e seus parâmetros; palestras/cursos de gestão financeira e formação de preço; análise creditícia; comunicação; raciocínio lógico e analítico.",
responsabilidades_extras:"Baixar arquivos de empresas do SISFAMPE para atualização e encaminhamento às regionais por ausência de assistente na unidade.",
cursos_eventos_interesse:"Feira da FEBRABAN.",
formacao_academica_relacionada:"MBA em Gestão Financeira para MPE.",
cursos_realizados:"MBA em Gestão Financeira; Gestão de MPEs; Formação de Consultores FOCO-USP.",
desenvolvimento_futuro:"SIM. Controladoria e Finanças; Mercado Financeiro e de Investimentos para pequenos negócios.",
principal_atuacao:"Coordenação de Acesso ao Crédito e Serviços Financeiros."
}},
{
nome:"Celina Soares",arquivo:"CELINA SOARES_QUESTIONARIO.pdf",id:"1Bdf-QQJTgQXexoSX_2yBec08-uTf5Yj5",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Dificuldade na adaptação a novas tecnologias ou sistemas; falta de tempo; processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Licenciatura em História; Gestão da Economia Criativa; Comunicação Social.",
especializacoes_recomendadas:"MBA em Liderança e Gestão de Pessoas; MBA em Gestão de Projetos.",
cursos_extracurriculares:"Sistema FOCO; Comunicação e Oratória; capacitação em IA.",
cursos_internos_sebrae:"Liderança e Gestão de Equipes; Transformação Digital.",
temas_competencias_indispensaveis:"Liderança e Gestão de Equipes, com foco específico em pessoas do artesanato e economia criativa.",
plano_capacitacao_ano:"SIM. Sistema FOCO; capacitação em IA.",
descricao_funcao:"Coordena e supervisiona programas, equipes de consultores e gestores, articula parcerias, capacita atores e monitora resultados nas carteiras de Artesanato, Economia Criativa e Programa Empreender.",
principais_atividades:"Monitorar resultados e ajustar estratégias; coordenar e supervisionar programas; buscar parcerias; coordenar equipes; promover educação para competências criativas.",
conhecimentos_habilidades_indispensaveis:"Negociação e liderança; resolução de conflitos; sistemas de gerenciamento.",
responsabilidades_extras:"Valorização do patrimônio cultural e da sustentabilidade, conectando artesanato, cultura local e práticas sustentáveis.",
cursos_eventos_interesse:"FENEARTE em Olinda; Artesanal Centro-Oeste em Goiânia.",
formacao_academica_relacionada:"MBA em Liderança e Gestão de Pessoas.",
cursos_realizados:"História da Arte e do Artesanato Brasileiro; Tendências e Inovação na Economia Criativa.",
desenvolvimento_futuro:"SIM. Gestão de Talentos Criativos.",
principal_atuacao:"Coordenação da carteira do Artesanato, Economia Criativa e Programa Empreender."
}},
{
nome:"Bruno Martins Vieira",arquivo:"BRUNO MARTINS VIEIRA_QUESTIONARIO.pdf",id:"1Coe7384uA5s6yW9nMOE8eA8pb-sZj2_h",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; mudanças constantes sem treinamento; processos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração e áreas voltadas à educação.",
especializacoes_recomendadas:"MBA em Liderança e Gestão de Pessoas.",
cursos_extracurriculares:"Certificação em Power BI.",
cursos_internos_sebrae:"Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Liderança; comunicação.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Promover a competitividade dos pequenos negócios por meio das potencialidades locais.",
principais_atividades:"Analisar e autorizar processos; articular novas parcerias; gerir pessoas da unidade; propor novas ações; monitorar metas.",
conhecimentos_habilidades_indispensaveis:"Gestão de pessoas; tomada de decisão; conhecimento das legislações vigentes e dados atualizados.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Summit em Florianópolis para maior entendimento da inovação.",
formacao_academica_relacionada:"MBA em Liderança e Gestão de Pessoas.",
cursos_realizados:"",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gerência de Competitividade, coordenando ações setoriais, educação e inovação."
}},
{
nome:"Ana Flávia Mendes Borges",arquivo:"ANA FLAVIA MENDES BORGES_QUESTIONARIO.pdf",id:"1e5Ln2Q-7ry_xxHzGi1cHS36FrhHR65Hm",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; processos burocráticos; resistência à integração e ao trabalho dinâmico entre unidades.",
graduacoes_fundamentais:"Bacharelado em Turismo.",
especializacoes_recomendadas:"MBA em Turismo; MBA em Gestão de Projetos; Pós-graduação em Administração Pública e Desenvolvimento Local.",
cursos_extracurriculares:"Negociação eficaz; Comunicação e Oratória; Gestão Ágil Scrum/Kanban; Atendimento ao Cliente.",
cursos_internos_sebrae:"Tomada de Decisão; Protagonismo Colaborativo; Comunicação eficaz em feedback; Olhar Empreendedor.",
temas_competencias_indispensaveis:"Tomada de Decisão; Protagonismo Colaborativo; Comunicação eficaz em feedback; Olhar Empreendedor.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Analista técnica responsável pela carteira estadual de Turismo, dando suporte técnico aos analistas das unidades de atendimento.",
principais_atividades:"Atendimento ao cliente interno; ponto focal do Planejamento Estratégico do Sistema Sebrae para Turismo; coordenação e execução de projetos turísticos; parcerias com empresas, organizações e governos; análises de dados e pesquisas de mercado.",
conhecimentos_habilidades_indispensaveis:"Excel avançado; gestão de processos; análise de dados; legislação e políticas públicas aplicadas ao turismo, desenvolvimento territorial e ambiente de negócios; liderança, comunicação eficaz, tomada de decisão, resolução de problemas e gestão do tempo.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Não fez planejamento para o ano.",
formacao_academica_relacionada:"As formações sugeridas fazem parte de matérias do curso de graduação.",
cursos_realizados:"Conhecimento por livros e palestras; alguns cursos realizados pela UC.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Analista de Turismo, interlocutora da carteira no Sebrae/NA e com parceiros institucionais, dando suporte técnico aos analistas do Sebrae/TO."
}},
{
nome:"Adelice Thomaz Soares Novak",arquivo:"ADELICE THOMAZ SOARES NOVAK_QUESTIONARIO.pdf",id:"19XU0fwthgguvJ45srEmc92XJ_aUwygFE",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de treinamentos; mudanças constantes sem treinamento; processos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração de Empresas.",
especializacoes_recomendadas:"MBA Gestão Empresarial e Inovação.",
cursos_extracurriculares:"Comunicação e Oratória.",
cursos_internos_sebrae:"Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Pessoas.",
plano_capacitacao_ano:"SIM. MBA Gestão Empresarial e Inovação.",
descricao_funcao:"Acompanha ações de inovação, articula redes dos ecossistemas no estado, implementa iniciativas, participa de eventos estratégicos e reuniões com o Sebrae Nacional e dissemina práticas inovadoras.",
principais_atividades:"Reuniões estratégicas com ecossistemas; monitoramento com Sebrae Nacional; acompanhamento de ecossistemas de Palmas, Paraíso, Porto Nacional, Araguaína e Gurupi; programas nacionais de aceleração; organização de eventos e missões.",
conhecimentos_habilidades_indispensaveis:"Comunicação assertiva; trabalho em equipe; empatia; gestão do tempo.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Web Summit Santa Catarina; AMAZONTECH.",
formacao_academica_relacionada:"MBA Gestão Empresarial e Inovação.",
cursos_realizados:"Comunicação e Oratória.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Coordenadora Estadual da Inovação."
}}
];

function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [users]=await db.execute("SELECT id,name,email FROM users");
  for(const d of D){
   const u=users.find(x=>norm(x.name)===norm(d.nome));
   if(!u){console.log("[UAC] EMPREGADO_NAO_ENCONTRADO",d.nome);continue;}
   const [ex]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=2025 ORDER BY versao DESC,id DESC LIMIT 1",[u.id]);
   if(ex.length){console.log("[UAC] JA_EXISTE",d.nome,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.id+"/view";
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,2025,1,'preenchido','importado_historico',?,?,?,?)",[u.id,d.arquivo,url,"Transcrição histórica do questionário de 2025 conforme PDF original. Unidade: UAC.",u.id]);
   for(const [chave,pergunta,ordem] of P){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[ins.insertId,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UAC] CRIADO",d.nome,"questionario",ins.insertId);
  }
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UAC] ERRO",e);process.exit(1);});

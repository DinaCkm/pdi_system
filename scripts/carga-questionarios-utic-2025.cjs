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
{ano:2025,nome:"Jáder Lincoln do Nascimento",email:"jader.nascimento@to.sebrae.com.br",arquivo:"Jáder Lincoln do Nascimento-QUESTIONÁRIO.pdf",id:"1Ex6et93vlRzjD8U4SqhNjpf27HhM9Ccx",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de tempo; processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Formação e especialização em Tecnologia da Informação.",
especializacoes_recomendadas:"Certificações voltadas para Segurança da Informação.",
cursos_extracurriculares:"CompTIA Security+; EXIN Information Security Foundation ISO 27001.",
cursos_internos_sebrae:"Cursos na área de Segurança da Informação.",
temas_competencias_indispensaveis:"Segurança da Informação; gestão de riscos e ameaças; ISO 27001, NIST e LGPD; resposta a incidentes; IAM; infraestrutura; Windows/Linux; redes; virtualização; backup; monitoramento; cloud; continuidade; ITIL; COBIT; gestão de projetos; gestão do tempo; resolução de problemas; liderança técnica.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua para garantir o funcionamento seguro e eficiente da infraestrutura tecnológica, incluindo servidores, redes, data center, segurança da informação e continuidade dos serviços.",
principais_atividades:"Administração de servidores físicos e virtuais; data center; redes; backups; suporte de 2º e 3º nível de infraestrutura e segurança.",
conhecimentos_habilidades_indispensaveis:"Segurança da Informação e ISO 27001; administração Windows/Linux; firewall e segurança de perímetro; capacidade analítica; resolução de problemas; gestão do tempo e priorização.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Agenda Técnica CISOs do Sistema Sebrae e eventos de Segurança da Informação.",
formacao_academica_relacionada:"Graduação, MBA e pós-graduação na área de TI.",
cursos_realizados:"Formações na área de Tecnologia da Informação.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Infraestrutura de TI e Segurança da Informação."
}},
{ano:2025,nome:"Gabriel Borges Araújo",email:"gabriel.araujo@to.sebrae.com.br",arquivo:"Gabriel Borges Araújo-QUESTIONÁRIO.pdf",id:"1ogtl2j0BTz1xDa9WkFEKnguLCBlSSO61",obs:"Questionário real de atividades. O outro arquivo com nome semelhante na pasta é correção de prova de proficiência e foi corretamente ignorado.",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; volume excessivo de demandas; demandas urgentes.",
graduacoes_fundamentais:"Sistemas de Informação; Ciência da Computação; áreas relacionadas à tecnologia.",
especializacoes_recomendadas:"Gestão de Projetos; ITIL V4; automações e Inteligência Artificial.",
cursos_extracurriculares:"Certificações de infraestrutura; Azure; ITIL; Segurança da Informação.",
cursos_internos_sebrae:"Atendimento ao cliente; Gestão do Tempo; Gestão de Processos.",
temas_competencias_indispensaveis:"Gestão do Tempo; Gestão de Service Desk; desenvolvimento de soluções e softwares.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua no controle da fila de atendimentos e no suporte aos usuários, com alteração de senhas, configuração de aplicativos e apoio aos colegas.",
principais_atividades:"Análise de novos chamados; atribuição de técnicos; atendimentos remotos e presenciais; elaboração de soluções; validação de atendimentos e demandas.",
conhecimentos_habilidades_indispensaveis:"Aplicativos; sistemas operacionais; produtos Microsoft; processos institucionais; ITIL/Service Desk; comunicação; análise de problemas; proatividade; inovação; foco no cliente; perfil resolutivo e de conformidade.",
responsabilidades_extras:"Desenvolvimento de software e de novas soluções para melhoria dos resultados.",
cursos_eventos_interesse:"Métodos ágeis; Service Desk; desenvolvimento de software; infraestrutura de TI.",
formacao_academica_relacionada:"Bacharel em Ciência da Computação.",
cursos_realizados:"Nenhum dos cursos extracurriculares recomendados.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Suporte aos usuários internos do Sebrae Tocantins."
}},
{ano:2025,nome:"Daniel Caio Lemos Penno",email:"daniel.penno@to.sebrae.com.br",arquivo:"Daniel Caio Lemos Penno-QUESTIONÁRIO.pdf",id:"19PQ_g00flWRDk16sFDTHzJ4fl4RLX3YX",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Resistência dos colaboradores em seguir normas e fluxos do SESuite; baixa maturidade institucional em processos bem definidos.",
graduacoes_fundamentais:"Sistemas de Informação; Ciência da Computação; outros cursos de TI.",
especializacoes_recomendadas:"Gestão/Governança de TI; Gestão de Processos; DevOps/DevSecOps.",
cursos_extracurriculares:"ITIL; Gestão Ágil; Comunicação e Oratória; Atendimento ao Cliente; Gestão de Contratos; Automação de Processos; Segurança da Informação.",
cursos_internos_sebrae:"Cursos de processos, automação e desenvolvimento geral disponíveis na Universidade Sebrae.",
temas_competencias_indispensaveis:"Atendimento ao Usuário e Suporte Técnico; Gestão de Projetos e Metodologias Ágeis; Comunicação e Trabalho em Equipe; Segurança da Informação.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua no suporte de TI, resolução de problemas em computadores, redes e sistemas, manutenção, instalação, controle de equipamentos, termos de referência, contratações e apoio a ferramentas internas.",
principais_atividades:"Atendimento e suporte no SESuite; desenvolvimento e ajustes de fluxos e formulários; apoio à gestão de sistemas e banco de dados; infraestrutura e segurança; termos de referência e contratações de TI.",
conhecimentos_habilidades_indispensaveis:"SESuite; SQL; infraestrutura e redes; Segurança da Informação; Office; gestão de contratos; RM, Sebraetec e DocFlow; comunicação; resolução de problemas; trabalho em equipe; organização; atenção aos detalhes.",
responsabilidades_extras:"Atividades em geral abrangidas pela descrição do cargo, embora de forma pouco detalhada.",
cursos_eventos_interesse:"Eventos de tecnologia e negócios com participação conjunta entre área técnica e área de negócio.",
formacao_academica_relacionada:"Tecnólogo em DevOps; pós-graduação em Gestão Pública e Administração de Redes.",
cursos_realizados:"ITIL.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"SESuite, suporte aos usuários, melhoria de fluxos e formulários, consultas SQL, sistemas e infraestrutura."
}},
{ano:2025,nome:"Alorran de Freitas Barbosa",email:"alorran.barbosa@to.sebrae.com.br",arquivo:"Alorran de Freitas Barbosa-QUESTIONÁRIO.pdf",id:"14q8noteLGhv3yK3QcQ8S6VPIS1SFaPce",r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; dificuldade de acesso a informações; falta de clareza nas responsabilidades; mudanças sem treinamento; processos burocráticos; demandas sem planejamento e tempestivas.",
graduacoes_fundamentais:"Análise de Sistemas; Engenharia da Computação; Ciência da Computação; Análise e Desenvolvimento de Sistemas.",
especializacoes_recomendadas:"Gestão e Tecnologia de TI; Negócios Digitais e IA; Cibersegurança e Sistemas Inteligentes; Gestão Estratégica de Inovação.",
cursos_extracurriculares:"Comunicação e Oratória; Scrum/Kanban; Power BI; IA; banco de dados; Python.",
cursos_internos_sebrae:"Gestão de Processos; Análise de Indicadores; Liderança; Transformação Digital; Inteligência Emocional.",
temas_competencias_indispensaveis:"Soft Skills; Liderança; Inteligência Emocional; Análise de Dados; Prompts.",
plano_capacitacao_ano:"SIM. Programa de Sucessores; Programa Evoluir/Etalent; Certificação de Copilot.",
descricao_funcao:"Analista Técnico de Tecnologia da Informação Sênior, atuando também como gerente interino.",
principais_atividades:"Gestão de contratos da UTIC; novas tecnologias; comunicação e treinamentos; eventos e suporte tecnológico; telefonia; estudos e implantações de Inteligência Artificial.",
conhecimentos_habilidades_indispensaveis:"Regulamento de contratos e licitação do Sebrae; softwares; sistemas e dados; monitoramento de redes; Office 365; Inteligência Artificial; CRM; implantação de sistemas; análise de dados; organização; comunicação; negociação; liderança; trabalho em equipe; resiliência; empatia; tomada de decisão; gestão do tempo.",
responsabilidades_extras:"Não identificou atividade fora do cargo.",
cursos_eventos_interesse:"Startup Summit; HSM+; comunicação e oratória; gestão ágil; Power BI; IA; banco de dados; Python.",
formacao_academica_relacionada:"Ciência da Computação; pós-graduação em Gestão Estratégica de Inovação.",
cursos_realizados:"Não informou cursos extracurriculares já realizados entre os recomendados.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gestão de contratos, novas tecnologias, comunicação, treinamentos, eventos, telefonia e pareceres técnicos para aquisições tecnológicas."
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
    const ms=users.filter(x=>norm(x.name)===norm(d.nome));
    if(ms.length===1) u=ms[0];
    else if(ms.length>1){console.log("[UTIC] NOME_AMBIGUO",d.nome);continue;}
   }
   if(!u){console.log("[UTIC] EMPREGADO_NAO_ENCONTRADO",d.nome,d.email);continue;}
   const [todos]=await db.execute("SELECT id,ano,versao FROM questionarios_atividades_funcao WHERE colaborador_id=? ORDER BY ano DESC,versao DESC,id DESC",[u.id]);
   if(todos[0] && Number(todos[0].ano)>Number(d.ano)){console.log("[UTIC] VERSAO_MAIS_RECENTE_JA_EXISTE",d.nome,todos[0].ano);continue;}
   const [ex]=await db.execute("SELECT id FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=? ORDER BY versao DESC,id DESC LIMIT 1",[u.id,d.ano]);
   if(ex.length){console.log("[UTIC] JA_EXISTE",d.nome,d.ano,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.id+"/view";
   const obs=d.obs||"Transcrição histórica do questionário de atividades mais recente localizado. Unidade: UTIC.";
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,?,1,'preenchido','importado_historico',?,?,?,?)",[u.id,d.ano,d.arquivo,url,obs,u.id]);
   for(const [chave,pergunta,ordem] of P){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[ins.insertId,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UTIC] CRIADO",d.nome,d.ano,"questionario",ins.insertId);
  }
 } finally {await db.end();}
}
main().catch(e=>{console.error("[UTIC] ERRO",e);process.exit(1);});

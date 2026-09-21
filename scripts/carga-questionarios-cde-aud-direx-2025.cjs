const mysql = require("mysql2/promise");

const PERGUNTAS = [
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

const DADOS = [
{
 nome:"Daniel Nunes de Carvalho", unidade:"CDE", arquivo:"Daniel Nunes de Carvalho-QUESTIONÁRIO.pdf", idDrive:"1Vx3aMc9KbBYS14gASYnc_BVeaXgnRbg2",
 r:{
 pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
 desafios_funcao:"Falta de tempo para realizar todas as atividades necessárias.",
 graduacoes_fundamentais:"Administração de empresa.",
 especializacoes_recomendadas:"Gestão financeira.",
 cursos_extracurriculares:"Curso de comunicação em oratória.",
 cursos_internos_sebrae:"Transformação digital.",
 temas_competencias_indispensaveis:"",
 plano_capacitacao_ano:"NÃO.",
 descricao_funcao:"Atuo profissionalmente, atendendo com eficiência junto à equipe.",
 principais_atividades:"Dirigir; planejar e seguir rotas; cumprir a jornada de trabalho e descanso; atender as demandas; garantir a segurança da carga ou dos passageiros.",
 conhecimentos_habilidades_indispensaveis:"",
 responsabilidades_extras:"Trabalho dentro da minha tarefa.",
 cursos_eventos_interesse:"Ainda não temos.",
 formacao_academica_relacionada:"Técnico em agronegócio.",
 cursos_realizados:"Oratória, importante pelo contato direto com as pessoas no dia a dia.",
 desenvolvimento_futuro:"SIM. Conhecimento para desempenhar com qualidade nossas atividades.",
 principal_atuacao:"Atuo como Assistente I e motorista do presidente Paulo Carneiro."
 }},
{
 nome:"JACKELINE DE SOUZA LIMA", unidade:"CDE", arquivo:"JACKELINE DE SOUZA LIMA-QUESTIONARIO.pdf", idDrive:"1LtHr6_H-QOlZHuTPE-yLqSYhplBZneJJ",
 r:{
 pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
 desafios_funcao:"Dificuldade na adaptação a novas tecnologias ou sistemas.",
 graduacoes_fundamentais:"Governança Corporativa; Administração de Empresas.",
 especializacoes_recomendadas:"MBA em Gestão de Governança Corporativa; MBA em Gestão de Pessoas; MBA em Gestão de Projetos; Pós-graduação em Comunicação Organizacional; Gestão Estratégica ou Planejamento Estratégico; Direito Administrativo ou Direito Empresarial.",
 cursos_extracurriculares:"Governança Corporativa; Gestão de Processos e Melhoria Contínua; Liderança e Gestão de Pessoas; Comunicação Organizacional e Relações Institucionais; Gestão Estratégica; Relatórios e Documentação Legal; Gestão de Projetos; Direito e Legislação Empresarial; Negociação e Resolução de Conflitos; Compliance e Ética; Planejamento e Gestão de Reuniões; Gestão de Contratos; Gestão do tempo; Oratória.",
 cursos_internos_sebrae:"Gestão Estratégica e Governança Corporativa; Comunicação e Liderança; Gestão de Projetos e Processos; Negociação e Tomada de Decisão; Gestão de Documentos e Contratos; Ética, Integridade e Compliance; Conhecendo o Sebrae; LGPD; Administração e Solução de Conflitos.",
 temas_competencias_indispensaveis:"Gestão de Governança Corporativa; Comunicação Estratégica; Gestão de Processos e Projetos; Ética, Compliance e LGPD; Tomada de Decisão e Análise de Dados; Negociação e Resolução de Conflitos; Gestão de Pessoas e Liderança.",
 plano_capacitacao_ano:"SIM. Governança do Sebrae, curso realizado pelo CDN em parceria com o IBGC.",
 descricao_funcao:"Responsável por garantir a implementação eficaz das decisões do Conselho, mantendo comunicação com Presidente, Diretoria Executiva e equipe, atuando na execução estratégica das políticas do Conselho e melhoria contínua dos processos de governança.",
 principais_atividades:"Gestão das Reuniões e Documentação; Coordenação de Processos e Ações Estratégicas; Interlocução entre Presidente e DIREX; Planejamento e Análise de Reuniões; Monitoramento da Governança.",
 conhecimentos_habilidades_indispensaveis:"Gestão administrativa e governança corporativa; legislação e normativos internos do Sebrae; relatórios e documentos oficiais; agendas e reuniões; contratos e documentos legais; gestão de processos; análise de dados; comunicação eficaz; organização e gestão do tempo; liderança; tomada de decisão; resolução de problemas; colaboração; falar em público.",
 responsabilidades_extras:"Não.",
 cursos_eventos_interesse:"Evento de Governança Corporativa em outubro de 2025; Dale Carnegie Course – Palmas.",
 formacao_academica_relacionada:"Administração e MBA em Gestão de Pessoas.",
 cursos_realizados:"Governança Corporativa; Liderança e Gestão de Pessoas; Planejamento e Gestão de Reuniões; Oratória.",
 desenvolvimento_futuro:"SIM. Gestão de Governança Corporativa; Comunicação Estratégica; Gestão de Processos e Projetos; Ética e Compliance; Tomada de Decisão e Análise de Dados; Negociação e Resolução de Conflitos; Gestão de Pessoas e Liderança.",
 principal_atuacao:"Coordenação estratégica e operacional das atividades do Gabinete para garantir eficiência na comunicação e execução das decisões e deliberações entre o Conselho Deliberativo e a Diretoria Executiva."
 }},
{
 nome:"Regina Queiroz Azevedo", unidade:"CDE", arquivo:"Regina_Queiroz_Azevedo-QUESTIONARIO.pdf", idDrive:"1zxi-YyCI9neBjfOSzu03lnXV_U8of37i",
 r:{
 pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
 desafios_funcao:"Dificuldade na adaptação a novas tecnologias ou sistemas; falta de ferramentas ou sistemas adequados para otimizar o trabalho.",
 graduacoes_fundamentais:"Administração: gestão de processos e gestão documental. Direito: redação de documentos oficiais e gestão da Governança.",
 especializacoes_recomendadas:"MBA em Governança Corporativa e Compliance.",
 cursos_extracurriculares:"Redação Oficial; Gestão Ágil.",
 cursos_internos_sebrae:"Fundamentos de gestão de projetos; Gestão ágil de projetos; Repaginando a Gestão (SE SUITE).",
 temas_competencias_indispensaveis:"Uso da IA na redação oficial; boas práticas de Governança Corporativa; boas práticas de gestão documental; técnicas de gestão do tempo.",
 plano_capacitacao_ano:"NÃO.",
 descricao_funcao:"Sou secretária executiva do Conselho Deliberativo do Sebrae Tocantins.",
 principais_atividades:"Atendimento aos conselheiros; atendimento aos departamentos que demandam documentos ao CDE; gestão documental; redação de documentos oficiais; gestão de processos relacionados a contas a pagar de fornecedores do CDE.",
 conhecimentos_habilidades_indispensaveis:"Comunicação eficaz; trabalho em equipe; organização; gestão do tempo; tomada de decisão; Estatuto Social; Código de Ética; organização de eventos; redação oficial; Governança Corporativa.",
 responsabilidades_extras:"Não.",
 cursos_eventos_interesse:"Nada.",
 formacao_academica_relacionada:"Administração.",
 cursos_realizados:"Ainda não possui certificação nos cursos recomendados e gostaria de realizá-los.",
 desenvolvimento_futuro:"NÃO. Declarou não ter plano no momento.",
 principal_atuacao:"Atuo no Gabinete do CDE, como secretária do Conselho e dos Comitês. Sou gestora de processos e contratos de fornecedores eventuais. Faço preparação de reuniões, atas, atendimento aos conselheiros e redação de documentos oficiais do CDE."
 }},
{
 nome:"Wesley Cardoso Batista", unidade:"AUD", arquivo:"Wesley Cardoso Batista-QUESTIONARIO.pdf", idDrive:"1Knw9MUO0uFhG42aQnUFvwtt95ux-rmZZ",
 r:{
 pdi_criado_ano:"SIM - Já tenho um PDI definido.",
 desafios_funcao:"Falta de clareza nas responsabilidades e expectativas do cargo; falta de treinamentos ou capacitações específicas; perfil do cargo não mapeado conectado ao SGP.",
 graduacoes_fundamentais:"Economia; Administração; Ciências Contábeis; Direito.",
 especializacoes_recomendadas:"Certificação CIA; cursos do IIA Brasil; MBA em Auditoria e Controles Internos; Pós-graduação em Auditoria e Gestão de Riscos; ISO 9001, 31000, 37301, 37000; IPPF; ACL para Auditores.",
 cursos_extracurriculares:"Certificação CIA; cursos do IIA Brasil; MBA em Auditoria e Controles Internos; IPPF; ACL para Auditores.",
 cursos_internos_sebrae:"Cursos do E-Talent para comportamentos aderentes ao cargo; Governança do Sebrae.",
 temas_competencias_indispensaveis:"IPPF; auditoria com foco em riscos; metodologia de auditorias; avaliação de riscos.",
 plano_capacitacao_ano:"NÃO. Informou que está sendo construído com base no trabalho capitaneado pela UGP.",
 descricao_funcao:"Assegurar que a organização opere de maneira eficiente, transparente e em conformidade com as normas, contribuindo para melhoria contínua dos processos e boa governança corporativa.",
 principais_atividades:"Gestão e execução de auditorias; monitoramento e follow-up; consultoria e aconselhamento; elaboração de análises, pareceres e relatórios; gestão do subprocesso Gestão das Auditorias, sistemas, orçamento, patrimônio, comissões e comitês.",
 conhecimentos_habilidades_indispensaveis:"Controles internos e governança; gestão de riscos; normas ISO e IPPF; compliance; processos de auditoria; gestão de projetos; tecnologias de auditoria; análise crítica; resolução de problemas; comunicação eficaz; atenção aos detalhes; independência e objetividade; gestão de tempo e organização.",
 responsabilidades_extras:"Participação em Comissões e Comitês.",
 cursos_eventos_interesse:"COMBRAI; cursos do IIA Brasil; IPPF.",
 formacao_academica_relacionada:"Nenhum dos MBAs ou pós-graduações sugeridos.",
 cursos_realizados:"Nenhum dos cursos extracurriculares recomendados.",
 desenvolvimento_futuro:"SIM. COMBRAI; CIA; cursos IIA; MBA em Auditoria e Controles Internos; Auditoria e Gestão de Riscos; ISO; IPPF; ACL.",
 principal_atuacao:"Atuo na Auditoria Interna, avaliando e melhorando controles internos, gestão de riscos e conformidade, garantindo eficiência e transparência por meio dos trabalhos de auditoria."
 }},
{
 nome:"Eliwânia dos Santos Silva", unidade:"AUD", arquivo:"Eliwânia dos Santos Silva_QUESTIONARIO.pdf", idDrive:"1UWw35mISsKdJpz9kvL8GL5UPTlisZGTg",
 r:{
 pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
 desafios_funcao:"Comunicação ineficaz entre equipes ou setores; dificuldade de acesso a informações; falta de tempo; mudanças constantes sem treinamento; processos burocráticos; equipe insuficiente; recursos orçamentários insuficientes; acompanhamento das atualizações regulatórias.",
 graduacoes_fundamentais:"Ciências Contábeis; Administração; Economia; Direito; Tecnologia da Informação.",
 especializacoes_recomendadas:"MBA em Auditoria, Controladoria, Gestão Financeira, Compliance, Gestão de Riscos e Certificação ISO 9001.",
 cursos_extracurriculares:"AUD I e II; Report; Fraud; CONBRAI; Auditoria em Licitações e Contratos; Compliance; ISO 31000; ISO 9001 Auditor Líder; Trabalhista; Líder Coach; LGPD; ACL; metodologias ágeis; Inteligência Emocional.",
 cursos_internos_sebrae:"Código de Ética; Compliance; Programa de Integridade; Estrutura de Governança; LGPD.",
 temas_competencias_indispensaveis:"IPPF; Liderança Comportamental; Auditoria Operacional; ACL; AUD I e II; Report; Fraud; CONBRAI; Auditoria em Licitações e Contratos; Compliance; ISO 31000; ISO 9001; Trabalhista; Líder Coach; LGPD; metodologias ágeis; Inteligência Emocional.",
 plano_capacitacao_ano:"SIM. IPPF; Liderança Comportamental; Sala de Integração NA; Encontro Anual de Auditores; Auditoria Operacional CGU; Planejamento de Auditoria Baseada em Riscos; Relatório de Auditoria; PDL CKM; ACL.",
 descricao_funcao:"Lidero a Unidade de Auditoria Interna do SEBRAE/TO, atuando preventivamente para atender necessidades da Alta Administração e agregar valor com avaliações independentes para o processo decisório.",
 principais_atividades:"Liderar a Unidade de Auditoria Interna; gestão e execução de auditorias/PAINT; relacionamento com instâncias de governança.",
 conhecimentos_habilidades_indispensaveis:"Liderança Transformacional; controles internos e governança; gestão de riscos; ISO 9001, 31000, 37301, 37000; IPPF; compliance; processos de auditoria; gestão de projetos; tecnologias de auditoria; gestão de equipes; visão estratégica; análise crítica; comunicação eficaz; atenção aos detalhes; independência; gestão do tempo; criatividade; comunicação estratégica; visão sistêmica; trabalho em equipe.",
 responsabilidades_extras:"Não.",
 cursos_eventos_interesse:"Treinamentos do Projeto Sala de Integração Sebrae/NA; Encontro Anual de Auditores do Sistema Sebrae.",
 formacao_academica_relacionada:"MBA em Controladoria e Planejamento Tributário; MBA em Auditoria, Controladoria e Gestão Financeira; Certificação ISO 9001.",
 cursos_realizados:"AUD I e II; Report; Fraud; CONBRAI; Auditoria em Licitações e Contratos; Compliance; ISO 31000; ISO 9001 Auditor Líder; Trabalhista; Líder Coach; LGPD; Inteligência Emocional.",
 desenvolvimento_futuro:"SIM. IPPF; Liderança Comportamental; Sala de Integração NA; Encontro Anual de Auditores; Auditoria Operacional CGU; Planejamento baseado em riscos; Relatório de Auditoria; PDL CKM; ACL.",
 principal_atuacao:"Gerir estrategicamente a Unidade de Auditoria Interna, relacionar-se com instâncias de governança e gerir/executar auditorias para avaliar controles internos e aderência a políticas e regulamentos."
 }},
{
 nome:"Durval Rêgo Nunes", unidade:"DIREX", arquivo:"Durval_Rgo_Nunes-QUESTIONARIO.pdf", idDrive:"1LDTRmv2o-cvznx_t6yV01iYwHSWfzD84",
 r:{
 pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
 desafios_funcao:"Comunicação ineficaz; mudanças constantes sem treinamento; processos burocráticos; volume excessivo de demandas.",
 graduacoes_fundamentais:"Secretariado; Administração.",
 especializacoes_recomendadas:"Secretariado e Administração.",
 cursos_extracurriculares:"Atendimento ao cliente; Inteligência Artificial.",
 cursos_internos_sebrae:"Atendimento Consultivo.",
 temas_competencias_indispensaveis:"Atendimento.",
 plano_capacitacao_ano:"NÃO.",
 descricao_funcao:"Trabalha muito, tem muito sigilo, recebe muita pressão e precisa entregar resultado.",
 principais_atividades:"Atendimento em geral; monitoramento de e-mails; criação de processos; criação de documentos oficiais; despacho com os Diretores.",
 conhecimentos_habilidades_indispensaveis:"Comunicação eficaz; gestão do tempo.",
 responsabilidades_extras:"Não.",
 cursos_eventos_interesse:"Congresso de Secretariado Executivo.",
 formacao_academica_relacionada:"Administração.",
 cursos_realizados:"Atendimento.",
 desenvolvimento_futuro:"NÃO.",
 principal_atuacao:"Atuo no gabinete da Secretaria da Diretoria Executiva, diretamente com atendimento interno e externo."
 }},
{
 nome:"Hidê Senna de Sousa Soares", unidade:"DIREX", arquivo:"Hid_Senna_de_Sousa_SoaresQUESTIONARIO.pdf", idDrive:"18fHBAUSO2oktyFfyPiKcCdC41ISAf3bP",
 r:{
 pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
 desafios_funcao:"Comunicação ineficaz; falta de tempo; mudanças constantes sem treinamento; processos burocráticos. Observação: não é apenas falta de gestão do tempo, mas equipe insuficiente.",
 graduacoes_fundamentais:"Letras e Secretariado para assessoria e atividades de secretariado; Psicologia; Administração para processos administrativos.",
 especializacoes_recomendadas:"MBA em Liderança e Gestão de Pessoas; Pós-graduação na área de gestão administrativa.",
 cursos_extracurriculares:"Comunicação e Oratória.",
 cursos_internos_sebrae:"Inteligência Artificial; Comunicação Eficaz; Gestão de Pessoas.",
 temas_competencias_indispensaveis:"Inteligência Artificial; Comunicação Eficaz; Gestão de Pessoas.",
 plano_capacitacao_ano:"SIM. Em 2025 concluiu todos os cursos do PDI conforme anexo; para 2026 ainda não havia definido novo PDI.",
 descricao_funcao:"Secretaria Executiva da Diretoria Executiva/DIREX: suporte à Alta Gestão, assessorando a DIREX, gerindo atividades administrativas e de assessoria e atendendo clientes internos e externos.",
 principais_atividades:"Gerir atendimento; agenda da DIREX; e-mail da Secretaria; elaborar, revisar e publicar documentos oficiais; protocolo; processos eletrônicos; viagens; orçamento; contribuição da ABASE; Copa da DIREX; reuniões DIREX.",
 conhecimentos_habilidades_indispensaveis:"Conhecimento técnico em Inteligência Artificial; habilidade comportamental de Comunicação Eficaz.",
 responsabilidades_extras:"Gestão da equipe da Secretaria DIREX, incluindo aprendizado e responsabilidades de dois colaboradores.",
 cursos_eventos_interesse:"Congresso de Secretariado e cursos relacionados ao trabalho.",
 formacao_academica_relacionada:"Graduação em Psicologia; MBA em Liderança e Gestão de Pessoas; já possui duas pós-graduações.",
 cursos_realizados:"Inteligência Artificial; Comunicação Eficaz; Gestão de Pessoas.",
 desenvolvimento_futuro:"SIM. Psicologia; eventos de secretariado e assessoria.",
 principal_atuacao:"Secretária-assessoria da Diretoria Executiva/DIREX, atendimento aos públicos internos e externos e responsabilidade pelas atividades administrativas da Secretaria DIREX."
 }}
];

function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();}

async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [users]=await db.execute("SELECT id,name,email FROM users");
  for(const d of DADOS){
   const u=users.find(x=>norm(x.name)===norm(d.nome));
   if(!u){console.log("[Q2025] EMPREGADO_NAO_ENCONTRADO",d.unidade,d.nome);continue;}
   const [ex]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=2025 ORDER BY versao DESC,id DESC LIMIT 1",[u.id]);
   if(ex.length){console.log("[Q2025] JA_EXISTE",d.unidade,d.nome,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.idDrive+"/view";
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,2025,1,'preenchido','importado_historico',?,?,?,?)",[u.id,d.arquivo,url,"Transcrição histórica do questionário de 2025 conforme PDF original. Unidade: "+d.unidade+".",u.id]);
   const qid=ins.insertId;
   for(const [chave,pergunta,ordem] of PERGUNTAS){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[qid,chave,pergunta,resp||null,ordem]);
   }
   console.log("[Q2025] CRIADO",d.unidade,d.nome,"questionario",qid);
  }
 } finally {await db.end();}
}
main().catch(e=>{console.error("[Q2025] ERRO",e);process.exit(1);});

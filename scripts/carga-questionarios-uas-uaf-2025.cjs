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
email:"Sebastiao.oliveira@to.sebrae.com.br",nome:"Sebastião Geraldo de Oliveira",arquivo:"SEBASTIAO_GERALDO_DE_OLIVEIRA_QUESTIONARIO.pdf",id:"1__OPkrDo_DiICTvmazhWjRFlyfjJDo_c",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Comunicação ineficaz entre equipes ou setores.",
graduacoes_fundamentais:"Gestão patrimonial.",
especializacoes_recomendadas:"Não tenho conhecimento.",
cursos_extracurriculares:"Logística para o transporte; Gestão patrimonial para o patrimônio.",
cursos_internos_sebrae:"Gestão de tempo.",
temas_competencias_indispensaveis:"Curso de Gestão Patrimonial.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Gestão patrimonial e transporte. Responsável por todos os bens do Sebrae e veículos.",
principais_atividades:"Conferência patrimonial; transferência de bens quando necessário; manutenção da limpeza dos veículos; pagamento de combustível; atendimento das demandas de transporte.",
conhecimentos_habilidades_indispensaveis:"Habilidade com o sistema RME e conhecimento de manutenção de veículos.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Gestão patrimonial.",
formacao_academica_relacionada:"",
cursos_realizados:"Nenhum.",
desenvolvimento_futuro:"SIM. Excel.",
principal_atuacao:"Gestor de Patrimônio e Transporte."
}},
{
email:"diogo.barreto@to.sebrae.com.br",nome:"Diogo Santos Barreto",arquivo:"DIOGO_SANTOS_BARRETO_QUESTIONARIO.pdf",id:"1IeWa5xZxnpv1vfLgt6Z3766NPBa4FD9F",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Dificuldade de acesso a informações; falta de ferramentas ou sistemas; falta de tempo; falta de treinamentos específicos; volume excessivo de demandas.",
graduacoes_fundamentais:"Economia; Logística; Administração.",
especializacoes_recomendadas:"MBA em Gestão de Logística e Cadeia de Suprimentos; MBA em Gestão de Custos e Finanças Corporativas; MBA em Gestão Pública ou Gestão de Contratos Administrativos.",
cursos_extracurriculares:"Excel Avançado aplicado à gestão; Gestão e Fiscalização de Contratos Administrativos; Gestão de Frota e Transporte.",
cursos_internos_sebrae:"Gestão de Processos e Melhoria Contínua; Análise de Indicadores e Gestão por Resultados; Gestão de Contratos e Governança.",
temas_competencias_indispensaveis:"Gestão de Transportes e Frota; Gestão de Custos e Análise Econômica; Gestão e Fiscalização de Contratos.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Gestão da Frota de Veículos do SEBRAE Tocantins.",
principais_atividades:"Gestão de contratos de fornecedores; definição e fiscalização das regras de uso dos veículos; planejamento da logística e atendimento das regionais; análise de relatórios de uso; controle e análise de custos da frota.",
conhecimentos_habilidades_indispensaveis:"Gestão de frota e logística; gestão e fiscalização de contratos; legislação aplicada à administração pública e ao Sistema Sebrae; controle de custos; indicadores; Excel e sistemas de gestão; planejamento logístico; organização; comunicação; análise e tomada de decisão; resolução de problemas; negociação; trabalho em equipe; responsabilidade e foco em resultados.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Congresso ou Fórum de Gestão de Frotas e Logística; Gestão e Fiscalização de Contratos Administrativos; Análise de Dados e Indicadores.",
formacao_academica_relacionada:"Economia.",
cursos_realizados:"Excel Avançado.",
desenvolvimento_futuro:"SIM. MBA ou especialização em Logística; Gestão de Custos; Indicadores e BI; Gestão e Fiscalização de Contratos; eventos de logística, transportes e gestão pública.",
principal_atuacao:"Atuo no Setor de Transporte."
}},
{
email:"thaina.alencar@to.sebrae.com.br",nome:"Thaina Silva de Alencar",arquivo:"THAINA SILVA DE ALENCAR_QUESTIONARIO.pdf",id:"1jnxebiTQUkjGPMYTvOX2lx-usrJyjdEe",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Falta de treinamentos específicos; mudanças constantes sem treinamento adequado; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração; Direito; Ciências Contábeis, dependendo do objeto do contrato.",
especializacoes_recomendadas:"Pós-graduação em Compliance; Gestão de Contratos.",
cursos_extracurriculares:"Cursos sobre a natureza jurídica do Sistema S, suas especificidades e os limites das aplicações de legislações públicas ou privadas.",
cursos_internos_sebrae:"Curso de gestão de contratos.",
temas_competencias_indispensaveis:"Gestão de contratos de prestação continuada; gestão de contratos de mão de obra exclusiva; legalidade e boas práticas na gestão de contrato; negociação; boas práticas na formação do processo licitatório.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Edição, análise e revisão de documentos e processos, negociação, controle de prazos, atualizações legais e contratuais, fiscalização dos termos pactuados.",
principais_atividades:"Edição, análise e revisão de documentos e processos; atendimento e negociação; controle de prazos; atualizações legais e contratuais; fiscalização dos termos pactuados.",
conhecimentos_habilidades_indispensaveis:"Domínio do pacote Office; conhecimento regulamentar do Sistema Sebrae e jurisprudencial do TCU; boa escrita; boa comunicação; comportamento resolutivo; visão de melhoria contínua.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Não.",
formacao_academica_relacionada:"Pós-graduação em Compliance Contratual.",
cursos_realizados:"Formação e atualização de pregoeiro.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Faço gestão de contratos."
}},
{
email:"ludmila.santana@to.sebrae.com.br",nome:"Ludmila Santana Barbosa",arquivo:"LUDMILA SANTANA BARBOSA_QUESTIONARIO.pdf",id:"1k8unfQJZdAC-RkMaJygQ79AImjGidTeY",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Volume excessivo de demandas sem estrutura adequada.",
graduacoes_fundamentais:"Administração de Empresas e/ou Direito.",
especializacoes_recomendadas:"Pós-graduação em Licitações e Contratos.",
cursos_extracurriculares:"Formação/atualização de pregoeiro; negociação.",
cursos_internos_sebrae:"Gestão de Contratos; Gestão de Processos; Análise de Indicadores.",
temas_competencias_indispensaveis:"Formação/atualização de pregoeiro; Comunicação Eficaz; negociação.",
plano_capacitacao_ano:"SIM. NÚCLEO S - Aspectos Polêmicos das Contratações no Sistema S.",
descricao_funcao:"Analista de Licitações (pregoeiro/presidente da CPL), responsável por garantir compras e contratações justas, transparentes e conforme o Regulamento de Licitações e Contratos do Sistema Sebrae.",
principais_atividades:"Atendimento e auxílio aos gestores de processos licitatórios; análise/revisão de termos de referência; elaboração de editais; julgamento e processamento dos processos licitatórios; gestão do processo Realizar Licitação.",
conhecimentos_habilidades_indispensaveis:"Regulamento de Licitações e Contratos do Sistema Sebrae; legislação e jurisprudência do TCU; formação e atualização de pregoeiro; negociação; gestão de contratos; pacote Office; norma culta da língua portuguesa; comunicação eficaz; tomada de decisão; resolução de problemas; relacionamento interpessoal.",
responsabilidades_extras:"Análise/revisão de termos de referência.",
cursos_eventos_interesse:"NÚCLEO S - Aspectos Polêmicos das Contratações no Sistema S; curso de negociação.",
formacao_academica_relacionada:"Administração de Empresas e Direito.",
cursos_realizados:"Formação/atualização de pregoeiro; negociação.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Atuo na Comissão Permanente de Licitação como responsável, Pregoeira/Presidente, na função de Analista de Licitações."
}},
{
email:"higor.oliveira@to.sebrae.com.br",nome:"Higor Nichollas de Oliveira",arquivo:"HIGOR NICHOLAS DE Oliveira_QUESTIONARIO.pdf",id:"1Cz2302pE7niB2Zclxgj85ror13JUufu0",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Volume excessivo de demandas sem estrutura adequada.",
graduacoes_fundamentais:"Engenharia Civil; Administração; Eventos; Marketing.",
especializacoes_recomendadas:"Gestão e Produção de Eventos; Marketing.",
cursos_extracurriculares:"Encontros de Eventos para troca de conhecimento e networking.",
cursos_internos_sebrae:"Gestão de Processos; Análise de Indicadores.",
temas_competencias_indispensaveis:"Gestão de Eventos.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Atua na inteligência e organização de eventos estratégicos, gestão de contratos e fornecedores de eventos, produção e organização de eventos, logística, montagem de feiras e estandes, briefings, projetos, além de gestão de projetos de engenharia e arquitetura e controle de orçamentos e custos.",
principais_atividades:"Gestão de contratos e fornecedores; organização e concepção de eventos; gerenciamento de montagem e logística; gestão de projetos de arquitetura e engenharia; gestão e instrução de processos internos.",
conhecimentos_habilidades_indispensaveis:"Gestão de Eventos; Organização de Eventos; Gestão do Tempo; Gerenciamento e Controle; Planejamento; Gestão de Contratos.",
responsabilidades_extras:"N/A.",
cursos_eventos_interesse:"Encontro Nacional da Rede de Eventos.",
formacao_academica_relacionada:"MBA em Marketing.",
cursos_realizados:"N/A.",
desenvolvimento_futuro:"SIM. Encontro da Rede de Eventos; grandes feiras do Sebrae; eventos e feiras externos.",
principal_atuacao:"Gestão de Estrutura e Eventos; Gestão de Infraestrutura; Projetos de Arquitetura e Engenharia."
}},
{
email:"getulio.mendonca@to.sebrae.com.br",nome:"Getúlio Rodrigues de Mendonça",arquivo:"GETULIO RODRIGUES DE MENDONÇA_QUESTIONARIO.pdf",id:"1WFPV-A-pFHfcNrGcKi5K0UhFUqbUEjAj",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Dificuldade na adaptação a novas tecnologias ou sistemas. Às vezes há dificuldade para encontrar prestadores de serviços qualificados.",
graduacoes_fundamentais:"Logística; Administração; comunicação e relacionamento interpessoal.",
especializacoes_recomendadas:"Gestão de Pessoas.",
cursos_extracurriculares:"Excel; atendimento ao cliente; gestão de processos.",
cursos_internos_sebrae:"Liderança de equipe.",
temas_competencias_indispensaveis:"Conhecimento de processos internos.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Manutenção preventiva e corretiva e atendimento dos clientes em geral.",
principais_atividades:"Auxílio na criação e acompanhamento de processos; manutenção e lavagem dos veículos; atendimento a solicitações de veículos; atendimento aos diretores e demandas de outras unidades.",
conhecimentos_habilidades_indispensaveis:"Noções básicas de mecânica; legislação de trânsito; Excel básico; comunicação clara; cortesia; trabalho em equipe; habilidade no trânsito, prudência e perícia.",
responsabilidades_extras:"Cortesia, comunicação clara e objetiva, noção de mecânica, negociação de preços, relacionamento com fornecedores, legislação de trânsito e normas da instituição.",
cursos_eventos_interesse:"Curso de gestão e manutenção de frota.",
formacao_academica_relacionada:"Logística voltada à administração de transportes.",
cursos_realizados:"Atendimento ao cliente.",
desenvolvimento_futuro:"SIM. Excel.",
principal_atuacao:"Trabalho na UAF/Transporte. Sou responsável pelos veículos."
}},
{
email:"emerson.nunes@to.sebrae.com.br",nome:"Emerson Eduardo Aires Nunes",arquivo:"EMERSON EDUARDO AIRES NUNES_QUESTIONARIO.pdf",id:"1at1R85OoOhreJq1i4QEK5iQmp4ia1232",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; falta de treinamentos específicos; volume excessivo de demandas.",
graduacoes_fundamentais:"Engenharia Civil.",
especializacoes_recomendadas:"MBA em Gestão de Projetos; Pós-graduação em Tecnologia da Construção.",
cursos_extracurriculares:"Comunicação e oratória; gestão ágil; Revit; Excel avançado.",
cursos_internos_sebrae:"Liderança e gestão de equipes.",
temas_competencias_indispensaveis:"Comunicação e oratória; gestão ágil; resolução de problemas.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Planejamento e gestão de obras e reformas e gestão das manutenções de toda a infraestrutura do SEBRAE/TO para permitir atividades em ambiente adequado e seguro.",
principais_atividades:"Gestão de contratos; análise de projetos e planilhas; escrita de termo de referência; acompanhamento de obras; serviços de manutenção.",
conhecimentos_habilidades_indispensaveis:"Normas Técnicas; Legislação; AutoCad; Revit; Excel; análise de dados; comunicação; tomada de decisão; resolução de problemas; trabalho em equipe; gestão do tempo.",
responsabilidades_extras:"",
cursos_eventos_interesse:"",
formacao_academica_relacionada:"Engenharia Civil.",
cursos_realizados:"Excel avançado.",
desenvolvimento_futuro:"SIM. Contratação de obras e serviços de engenharia em diversos regimes.",
principal_atuacao:"Atuo no setor de Infraestrutura da Unidade de Administração e Finanças, com gestão de obras, reformas e manutenção predial."
}},
{
email:"paula.soares@to.sebrae.com.br",nome:"Ana Paula Cunha Soares",arquivo:"ANA PAULA CUNHA SOARES_QUESTIONARIO.pdf",id:"1wVmFPkMZA3oFdBn16pnm1c2Ai_ZS2nk5",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; intempestividade nas contratações; falta de empatia; comportamentos desleais.",
graduacoes_fundamentais:"Administração ou Direito.",
especializacoes_recomendadas:"MBA em Governança, Riscos e Compliance; MBA em Gestão Pública com Ênfase em Compras e Contratos; Curso de Mercado para Licitações e Contratos do Sistema Sebrae; MBA em Auditoria e Controladoria; Pós em Terceiro Setor.",
cursos_extracurriculares:"Curso de Mercado para Licitações e Contratos do Sistema Sebrae; Encontro de Aquisições do Sistema Sebrae; Gestão de Contratos; Fundamentos de Compliance; Ética, Integridade e Compliance.",
cursos_internos_sebrae:"Gestão de Contratos; Fundamentos de Compliance; Ética, Integridade e Compliance.",
temas_competencias_indispensaveis:"Gestão e Fiscalização de Contratos; prevenção de riscos e fraudes; termos de referência e editais; gestão de riscos e integridade; planejamento das contratações; análise crítica; pareceres; gestão de prazos; indicadores; ética; conformidade; comunicação; resolução de problemas; organização; colaboração.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Analista de conformidade, garantindo que processos de compras e contratações sigam leis, normas internas e regras de transparência, analisando documentação, processos licitatórios, termos de referência, contratos e orientando fornecedores.",
principais_atividades:"Análise de conformidade em compras e contratações; gestão e acompanhamento de contratos; elaboração de pareceres, termos de referência e notas orientativas; atendimento a clientes internos e fornecedores; interlocução com áreas demandantes e assessoramento técnico.",
conhecimentos_habilidades_indispensaveis:"Legislação de Licitações e Contratos; Regulamento do Sistema Sebrae; gestão contratual; gestão de riscos e conformidade; processos administrativos e compras; SE SUITE, QlikSense, RM, Canal do Fornecedor, IA e Office; atenção aos detalhes; comunicação; capacidade analítica; ética; resiliência; proatividade; colaboração; flexibilidade.",
responsabilidades_extras:"As atividades executadas estão na descrição do cargo.",
cursos_eventos_interesse:"IA Aplicada às Licitações de Compras, Serviços e Contratos da Administração Direta, Estatais e Sistema S.",
formacao_academica_relacionada:"Pós em Terceiro Setor; MBA em Controladoria; Curso de Mercado para Licitações e Contratos do Sistema Sebrae.",
cursos_realizados:"Curso de Mercado para Licitações e Contratos; Encontro de Aquisições; Gestão de Contratos; Fundamentos de Compliance; Ética, Integridade e Compliance.",
desenvolvimento_futuro:"SIM. MBA em Gestão Pública com Ênfase em Compras e Contratos.",
principal_atuacao:"Analista de compras e Analista de Conformidade em processos de compras e contratações, além de gestora de contratos e atendimento técnico a fornecedores."
}},
{
email:"paula.alves@to.sebrae.com.br",nome:"Ana Paula Alves Cunha",arquivo:"ANA-PAULA-ALVES-SANTOS_QUESTIONARIO.pdf",id:"1DrJQczsf4YDTecpj-SWs8MA4y1YbhJ7F",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de tempo; volume excessivo de demandas; lidar com falta de respeito e tratativas de alguns colegas.",
graduacoes_fundamentais:"Administração.",
especializacoes_recomendadas:"MBA em Gestão de Empresas e Liderança; liderança; gestão de equipe; gestão estratégica; neurociência; licitações; inovação.",
cursos_extracurriculares:"Comunicação e Oratória; Gestão Ágil; Power BI; metodologias ágeis; Neurociência; Liderança e Gestão de Pessoas; noções de gestão de obras; Regulamento de Licitações; benchmarking.",
cursos_internos_sebrae:"Análise de Indicadores; Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Comunicação eficaz; capacidade de inspirar e motivar; tomada de decisão; resolução de problemas; gestão de equipe; adaptabilidade.",
plano_capacitacao_ano:"SIM. Capacitação de Sucessão com a CKM; South Summit Brasil; curso sobre regulamento de licitações.",
descricao_funcao:"Liderar processos e pessoas, mediar ações e conflitos com o objetivo de atingir as metas do Sebrae Tocantins.",
principais_atividades:"Gestão de pessoas; gestão de metas, resultados e processos; mediação de conflitos; planejamento de ações; monitoramento e acompanhamento de ações.",
conhecimentos_habilidades_indispensaveis:"Excel; gestão de processos; análise de dados; planejamento; Regulamento de Licitações; normas técnicas; comunicação eficaz; tomada de decisão; resolução de problemas; trabalho em equipe; gestão do tempo; relacionamento interpessoal; empatia; liderança; gestão de equipe.",
responsabilidades_extras:"Execução de processos operacionais para atingimento dentro do prazo.",
cursos_eventos_interesse:"Eventos voltados para liderança e inovação.",
formacao_academica_relacionada:"Acredita que todas as formações sugeridas têm relação com sua formação.",
cursos_realizados:"Todos estão ligados à trajetória profissional.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gerente na Unidade de Administração e Suprimentos."
}},
{
email:"alencar.borelli@to.sebrae.com.br",nome:"Alencar Hübner Borelli",arquivo:"ALENCAR HÜBNER BORELLI_QUESTIONARIO.pdf",id:"1U6RaWXThEsEsjXBo62Qc7vEdt8vfBqIX",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Comunicação ineficaz; falta de ferramentas ou sistemas; falta de treinamentos específicos; volume excessivo de demandas.",
graduacoes_fundamentais:"Administração; Contabilidade.",
especializacoes_recomendadas:"Gestão de Facilities; Licitações e Contratos; Gestão de Transportes; Gestão de Mobilidade.",
cursos_extracurriculares:"Comunicação; apresentação de alto impacto; gerenciamento de equipe; Gestão de Contratos.",
cursos_internos_sebrae:"Gestão de Processos; Análise de Indicadores; Liderança e Gestão de Equipes; Transformação Digital.",
temas_competencias_indispensaveis:"Gestão de Contratos; gerenciamento de equipe; transformação digital.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Apoio técnico às atividades meio e finalísticas do Sebrae/TO, com conhecimento de orçamento, infraestrutura, mobilidade, compras, contratos, processos licitatórios e conformidade.",
principais_atividades:"Gerenciamento de Processos; Gerenciamento de Contratos; Gerenciamento de equipe de Facilities; tomada de decisão para gerir a infraestrutura; planejamento e acompanhamento orçamentário.",
conhecimentos_habilidades_indispensaveis:"Gestão de pessoas; soluções tecnológicas; boa escrita; regimentos internos e leis; descrição de necessidades de contratações e aquisições; comunicação eficaz; tomada de decisão; resolução de problemas; gerenciamento do tempo e entregas; ferramentas de gestão; clareza e objetividade.",
responsabilidades_extras:"O cargo tem nomenclatura genérica, possibilitando o entendimento de que as atividades estão de acordo com o cargo.",
cursos_eventos_interesse:"Encontro de Aquisições e Contratos do Sistema S.",
formacao_academica_relacionada:"Cursando Pós em Licitações e Contratos.",
cursos_realizados:"",
desenvolvimento_futuro:"SIM. Encontro de Aquisições e Contratos do Sistema S.",
principal_atuacao:"Gestor do Núcleo de Compras e Contratos, gestor de contratos de Facilities e outros contratos diversos."
}}
];

async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  for(const d of D){
   const [u]=await db.execute("SELECT id,name FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1",[d.email]);
   if(!u.length){console.log("[UAF] EMPREGADO_NAO_ENCONTRADO",d.nome,d.email);continue;}
   const uid=u[0].id;
   const [ex]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=2025 ORDER BY versao DESC,id DESC LIMIT 1",[uid]);
   if(ex.length){console.log("[UAF] JA_EXISTE",d.nome,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.id+"/view";
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,2025,1,'preenchido','importado_historico',?,?,?,?)",[uid,d.arquivo,url,"Transcrição histórica do questionário de 2025 conforme PDF original. Unidade declarada no questionário: UAF/Unidade de Administração e Finanças ou Administração e Suprimentos.",uid]);
   for(const [chave,pergunta,ordem] of P){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[ins.insertId,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UAF] CRIADO",d.nome,"questionario",ins.insertId);
  }
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UAF] ERRO",e);process.exit(1);});

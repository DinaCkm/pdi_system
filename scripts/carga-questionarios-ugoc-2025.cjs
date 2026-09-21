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
email:"juarez.oliveira@to.sebrae.com.br",nome:"Juarez Quirino de Oliveira",arquivo:"JUAREZ QUIRINO OLIVEIRA_QUESTIONARIO.pdf",id:"1L4XzaDWyN986nNqKu_rpHGmCMf90QEwO",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Processos internos burocráticos ou complexos.",
graduacoes_fundamentais:"Administração de Empresas; Ciências Contábeis.",
especializacoes_recomendadas:"MBA em Gestão de Projetos; Pós-graduação em Controladoria e Finanças; MBA em Inovação e Transformação Digital.",
cursos_extracurriculares:"Excel Avançado; Gestão Ágil (Scrum/Kanban); Power BI.",
cursos_internos_sebrae:"Análise de Indicadores; Gestão de Processos; Gestão de Projetos.",
temas_competencias_indispensaveis:"Organização; concentração; exatidão; responsabilidade.",
plano_capacitacao_ano:"SIM.",
descricao_funcao:"Realiza cadastro e reconhecimento de receitas, cadastro de despesas, baixa de diárias e atividades relacionadas ao processo de contas a pagar.",
principais_atividades:"Cadastro de receita; reconhecimento de receita; análise de planilhas; cadastro de despesas; baixa de diárias.",
conhecimentos_habilidades_indispensaveis:"Organização; exatidão; trabalho em equipe; conhecimento técnico em sistemas; domínio de planilhas; conhecimentos financeiro e contábil.",
responsabilidades_extras:"As atividades realizadas estão de acordo com o cargo.",
cursos_eventos_interesse:"No momento, nenhum. Interesse futuro em eventos de gestão orçamentária, gestão de processos e projetos.",
formacao_academica_relacionada:"Administração e Ciências Contábeis.",
cursos_realizados:"Excel básico; demais conhecimentos adquiridos no dia a dia.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Atuo no núcleo de faturamento, na parte de cadastro e reconhecimento de receita."
}},
{
email:"jose.miola@to.sebrae.com.br",nome:"José Roberto Miola",arquivo:"JOSE ROBERTO MIOLA_QUESTIONARIO.pdf",id:"1y52cG_Vi2V24X3vvfiVa1rB9AFahn1u_",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas ou sistemas adequados; falta de suporte ou orientação para resolver problemas do dia a dia.",
graduacoes_fundamentais:"Administração.",
especializacoes_recomendadas:"MBA em Tributário; MBA em Mercado Financeiro.",
cursos_extracurriculares:"Noções gerais do Código Civil.",
cursos_internos_sebrae:"Curso de Reforma Tributária.",
temas_competencias_indispensaveis:"Reforma Tributária; Noções Gerais do Código Civil; Simples Nacional.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Analisar conformidade de processos.",
principais_atividades:"Analisar processos; conformidade; diárias; ressarcimento; reembolso.",
conhecimentos_habilidades_indispensaveis:"Instruções Normativas do Sebrae.",
responsabilidades_extras:"Orientação a terceiros.",
cursos_eventos_interesse:"Não.",
formacao_academica_relacionada:"MBA em Mercado Financeiro.",
cursos_realizados:"Nenhum.",
desenvolvimento_futuro:"SIM. Reforma Tributária.",
principal_atuacao:"Análise de processo e conformidade."
}},
{
email:"euzebio.almeida@to.sebrae.com.br",nome:"Euzebio Oliveira de Almeida",arquivo:"EUZEBIO OLIVEIRA DE ALMEIDA_QUESTIONARIO.pdf",id:"1DtXLadYeFZ7tx7zTsWfoYoRuFZrQBfGa",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de tempo para realizar todas as atividades necessárias.",
graduacoes_fundamentais:"Ciências Contábeis.",
especializacoes_recomendadas:"MBA em Contabilidade Tributária.",
cursos_extracurriculares:"Excel; Tributos; Comunicação.",
cursos_internos_sebrae:"Gestão de Processos; Gestão de Equipe; Transformação Digital.",
temas_competencias_indispensaveis:"Visão Institucional; Gestão de Processos Administrativos; Comunicação Interpessoal e Atendimento ao Cliente.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Registro fidedigno de documentos e naturezas fiscais, registro de contratos e cadastro de fornecedores.",
principais_atividades:"Registros de despesas; cadastro de contratos; supervisão de estagiários.",
conhecimentos_habilidades_indispensaveis:"Processos administrativos; ferramentas digitais e sistemas internos; normas e procedimentos institucionais; atendimento ao cliente; comunicação clara; discrição e ética; adaptação; relacionamento interpessoal.",
responsabilidades_extras:"Não.",
cursos_eventos_interesse:"Pós/MBA na área de Tributos.",
formacao_academica_relacionada:"Graduado em Ciências Contábeis.",
cursos_realizados:"Excel e Tributos.",
desenvolvimento_futuro:"SIM. MBA em Contabilidade Tributária.",
principal_atuacao:"Atendimento e suporte aos clientes internos."
}},
{
email:"elizabete@to.sebrae.com.br",nome:"Elisabete Lacerda Eustaquio",arquivo:"ELISABETE LACERDA EUSTAQUIO_QUESTIONARIO.pdf",id:"1GepfajaPkZx40dL7_vTrillbGmFnt1oo",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas ou sistemas; processos internos burocráticos; volume excessivo de demandas.",
graduacoes_fundamentais:"Qualquer graduação; Administração e Contabilidade facilitariam.",
especializacoes_recomendadas:"Pós-graduação em Controladoria e Finanças.",
cursos_extracurriculares:"Cursos na área contábil, financeira e tributária.",
cursos_internos_sebrae:"Conhecimentos básicos em Contabilidade e Tributos.",
temas_competencias_indispensaveis:"Disciplina; organização; discrição.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Recebe e despacha processos; faz lançamentos de pagamentos e recebimentos; emite comprovantes; realiza baixa financeira em sistema.",
principais_atividades:"Receber processos para pagamentos; relacionar movimentos no RM; criar e despachar borderôs; encaminhar à Diretoria para assinaturas; acompanhar processamento pelo banco.",
conhecimentos_habilidades_indispensaveis:"RM; SE Suite; e-mail; muita atenção e organização.",
responsabilidades_extras:"Algumas demandas com bancos.",
cursos_eventos_interesse:"Nada em mente no momento.",
formacao_academica_relacionada:"Nenhuma das especializações sugeridas.",
cursos_realizados:"Nenhum.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Responsável pela Tesouraria, atuando em pagamentos e recebimentos."
}},
{
email:"denise.nunes@to.sebrae.com.br",nome:"Denise da Silva Nunes",arquivo:"DENISE DA SILVA NUNES_QUESTIONARIO.pdf",id:"1VsOsuitp8QCJ7pNmAqacD7LgNkKRQFVt",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Dificuldade de acesso a informações e dados; falta de tempo; falta de treinamentos específicos.",
graduacoes_fundamentais:"Ciências Contábeis e Economia.",
especializacoes_recomendadas:"Finanças Corporativas; Controladoria; Planejamento Tributário; Gestão Orçamentária.",
cursos_extracurriculares:"Power BI e cursos com foco em análise de dados.",
cursos_internos_sebrae:"Já realizou cursos e há oferta contínua para desenvolvimento.",
temas_competencias_indispensaveis:"Gestão e Planejamento Orçamentário.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Elaboração e revisão do orçamento, monitoramento da execução, análise de desvios e limites, proposição de ajustes e apoio técnico às áreas no sistema LEME.",
principais_atividades:"Parecer orçamentário; acompanhamento da execução; geração, atualização e validação de relatórios; atendimento aos gestores; projeções e simulações.",
conhecimentos_habilidades_indispensaveis:"Planejamento orçamentário; contabilidade; Excel; painéis BI; processos; sistemas de gestão/ERP.",
responsabilidades_extras:"Nomeada gerente interina, atribuição de grande responsabilidade.",
cursos_eventos_interesse:"Não pesquisou.",
formacao_academica_relacionada:"Ciências Contábeis e Planejamento Tributário.",
cursos_realizados:"Nenhum dos cursos extracurriculares sugeridos.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gestora Orçamentária."
}},
{
email:"andreia.facundes@to.sebrae.com.br",nome:"Andréia Rodrigues Facundes",arquivo:"ANDREIA RODRIGUES FACUNDES_QUESTIONARIO.pdf",id:"1_jSE72z84qnRrYjyhUONrg-u-7Vx5QTm",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de ferramentas ou sistemas; volume excessivo de demandas; manter equipe motivada e alinhada; atualização contínua de normas e legislações; implementar melhorias e automações.",
graduacoes_fundamentais:"Ciências Contábeis ou Administração de Empresas.",
especializacoes_recomendadas:"MBA em Gestão de Processos; Transformação Digital e Inovação; Gestão Pública.",
cursos_extracurriculares:"Liderança e Desenvolvimento de Equipes; Comunicação e Oratória; Gestão Ágil; Power BI.",
cursos_internos_sebrae:"Liderança; Ética; Inovação.",
temas_competencias_indispensaveis:"Liderança; ética; inovação.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Lidera e coordena os processos de Orçamento, Contabilidade e Finanças, garantindo eficiência, alinhamento institucional e desenvolvimento da equipe.",
principais_atividades:"Gerenciar equipe; planejar, coordenar e monitorar orçamento, contabilidade e finanças; articular com demais gerentes; otimizar processos; garantir controles financeiros.",
conhecimentos_habilidades_indispensaveis:"Gestão orçamentária, contábil e financeira; legislação e normas; sistemas integrados; melhoria contínua; Excel; liderança; comunicação; organização; análise; tomada de decisão; proatividade e resolução de problemas.",
responsabilidades_extras:"Facilitadora de comunicação entre equipes e áreas, resolvendo conflitos e alinhando expectativas.",
cursos_eventos_interesse:"Capacitação em Orçamento Público pelo Ibracon; congressos de contabilidade do CFC; encontros do Comitê Permanente de Contabilidade do Sistema Sebrae.",
formacao_academica_relacionada:"Ciências Contábeis; MBA Gestão Pública.",
cursos_realizados:"Nenhum dos cursos extracurriculares sugeridos.",
desenvolvimento_futuro:"SIM.",
principal_atuacao:"Gestão da unidade nos processos de Orçamento, Contabilidade e Finanças."
}},
{
email:"thamara.rodrigues@to.sebrae.com.br",nome:"Thâmara Rodrigues de Freitas Facundes",arquivo:"THAMARA RODRIGUES DE FREITAS FACUNDES_QUESTIONARIO.pdf",id:"1oH5w8ZOfyEIvMyQRfOC_JzXGbJUDsLst",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de clareza nas responsabilidades e expectativas do cargo; falta de ferramentas ou sistemas adequados.",
graduacoes_fundamentais:"Ciências Contábeis.",
especializacoes_recomendadas:"Controladoria e Finanças.",
cursos_extracurriculares:"Power BI; Excel Avançado.",
cursos_internos_sebrae:"Análise de dados; Análise de Indicadores; Transformação Digital.",
temas_competencias_indispensaveis:"Ferramentas para otimização de relatórios; análise crítica.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Gestão do orçamento, monitoramento das execuções de despesa e receita; análise de solicitações; central de faturamento e registro das receitas geradas.",
principais_atividades:"Boletim de monitoramento da execução; parecer orçamentário em contratações; relatórios; integração financeira e contábil das receitas; emissão de notas fiscais.",
conhecimentos_habilidades_indispensaveis:"ERP, LEME, Qlik Sense, Cubo, Suite, Webis, Canva; diretrizes orçamentárias; Excel; gestão de processos; análise de dados; resolução de problemas; gestão do tempo; agilidade; atenção e cuidado.",
responsabilidades_extras:"Atuação na central de faturamento; gestão do clima da unidade.",
cursos_eventos_interesse:"Power BI.",
formacao_academica_relacionada:"Pós-graduação em Contabilidade, Controladoria e Finanças; cursando Ciências Contábeis.",
cursos_realizados:"Ainda não realizou os cursos recomendados.",
desenvolvimento_futuro:"SIM. Power BI para otimização dos relatórios.",
principal_atuacao:"Atuo no orçamento, responsável pelo boletim de monitoramento e parecer, e na central de faturamento com integração contábil."
}},
{
email:"livia.leao@to.sebrae.com.br",nome:"Lívia Tenório de Souza Leão",arquivo:"LIVIA TENORIO DE SOUZA LEAO_QUESTIONARIO.pdf",id:"1Xtv3Ke4NJZ6YlxvJvBDUCZmZXJn_GJWa",
r:{
pdi_criado_ano:"SIM - Já tenho um PDI definido.",
desafios_funcao:"Falta de tempo para realizar todas as atividades necessárias.",
graduacoes_fundamentais:"Administração; Ciências Contábeis; Gestão Financeira; Gestão Pública.",
especializacoes_recomendadas:"Gestão Financeira; Controladoria; Finanças Públicas; Gestão Orçamentária e Contábil.",
cursos_extracurriculares:"Excel Avançado e Análise de Dados; Noções de Contabilidade; Gestão de Processos e Indicadores; Comunicação Escrita e Relatórios Técnicos.",
cursos_internos_sebrae:"Gestão Financeira e Orçamentária; Sistemas Corporativos e Gestão de Processos; Normativos Internos e POP; Excel e Ferramentas de Produtividade.",
temas_competencias_indispensaveis:"Domínio de sistemas internos; análise de dados financeiros; comunicação organizacional e relatórios; gestão do tempo; organização; atenção aos detalhes.",
plano_capacitacao_ano:"SIM. Resolução de Problemas e Tomada de Decisão; Regulação da Preocupação e Ansiedade; Conhecendo o Sistema Sebrae; Código de Ética; LGPD; Onboarding Integridade e Compliance.",
descricao_funcao:"Central de Faturamento: garantir registro e reconhecimento corretos das receitas nos sistemas, conferindo relatórios, cadastrando processos e alinhando lançamentos aos códigos orçamentários e normas.",
principais_atividades:"Conferência de relatórios de vendas; cadastro de processos de receita; reconhecimento de receita; cadastro de despesas; conferência e baixa de diárias.",
conhecimentos_habilidades_indispensaveis:"Processos administrativos; noções de contabilidade; sistemas internos; atenção aos detalhes; organização; agilidade; responsabilidade; boa comunicação; conformidade com normas.",
responsabilidades_extras:"Acredita que não há.",
cursos_eventos_interesse:"Durante onboarding não incluiria novos cursos; pretende reavaliar a partir de julho.",
formacao_academica_relacionada:"Formação em Comunicação Social – Publicidade e Propaganda, complementada por Administração Estratégica, Elaboração e Análise de Projetos e Gestão de Marketing e Comunicação Empresarial.",
cursos_realizados:"Excel Avançado e Análise de Dados; Administração Estratégica; Elaboração e Análise de Projetos; Gestão de Marketing e Comunicação Empresarial.",
desenvolvimento_futuro:"SIM. Gestão de Processos e Indicadores; Gestão Administrativa; Gestão Empresarial.",
principal_atuacao:"Central de Faturamento da UGOC, responsável por cadastrar e reconhecer receitas."
}},
{
email:"livia.simoes@to.sebrae.com.br",nome:"Lívia Pedreira Simões",arquivo:"LIVIA PEDREIRA SIMOES_QUESTIONARIO.pdf",id:"1YsHt2PIfJOQDNiCJKESqLwjfbQon05wM",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de tempo para realizar todas as atividades necessárias.",
graduacoes_fundamentais:"Administração.",
especializacoes_recomendadas:"Nenhuma.",
cursos_extracurriculares:"Cursos na área de tecnologia para melhorar o fluxo e a eficiência dos processos.",
cursos_internos_sebrae:"Controle de processos; ética; atualização de regulamentos e normas.",
temas_competencias_indispensaveis:"Conformidade; concentração; resiliência; perfil analítico.",
plano_capacitacao_ano:"NÃO.",
descricao_funcao:"Analisa os documentos enviados para pagamento e verifica se atendem a todos os requisitos e normas do Sebrae.",
principais_atividades:"Análise de notas fiscais, relatórios, certidões e contratos; processos de eventos; despesas fixas; retenções da nota fiscal; atendimento e orientação sobre pagamentos.",
conhecimentos_habilidades_indispensaveis:"Ser analítico e criterioso.",
responsabilidades_extras:"Dar soluções para problemas que não criou.",
cursos_eventos_interesse:"Evento voltado para conformidade de processos.",
formacao_academica_relacionada:"Administração.",
cursos_realizados:"",
desenvolvimento_futuro:"NÃO.",
principal_atuacao:"Análise de processos de pagamento."
}},
{
email:"fabricio.lustosa@to.sebrae.com.br",nome:"Fabrício Rodrigues da Silva Lustosa",arquivo:"FABRICIO_RODRIGUES DA SILVA LUSTOSA_QUESTIONARIO.pdf",id:"1HEvNdvnKyCq7IRWzpuu0EpmIh7UFc75Q",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Comunicação ineficaz; falta de tempo; falta de treinamentos específicos.",
graduacoes_fundamentais:"Ciências Contábeis.",
especializacoes_recomendadas:"Legislação Tributária; Reforma Tributária EC 132/2023 e LC 214/2025; Auditoria, Controladoria e Perícia Contábil.",
cursos_extracurriculares:"Analista Fiscal - SPED; Reforma Tributária; Excel intermediário/avançado.",
cursos_internos_sebrae:"Transformação Digital; Gestão de Processos.",
temas_competencias_indispensaveis:"Fiscal de Tributos; organização; liderança de equipe.",
plano_capacitacao_ano:"SIM. Capacitação sobre reforma tributária prevista pelo Sebrae Nacional.",
descricao_funcao:"Análise fiscal/contábil dos processos de despesas, integralização contábil e envio para tesouraria e apuração dos impostos.",
principais_atividades:"Análise e conformidade fiscal/contábil; integralização contábil; fechamento de despesas; apuração de impostos federais e municipais; obrigações acessórias fiscais.",
conhecimentos_habilidades_indispensaveis:"Legislação tributária e tributos; atenção; organização; comunicação; trabalho em equipe; pacote Office.",
responsabilidades_extras:"Apoio à prestação de contas de contratos e convênios.",
cursos_eventos_interesse:"Gestão Tributária de Contratos e Convênios; Congresso Brasileiro de Gestão Tributária na Administração Pública e Sistema S.",
formacao_academica_relacionada:"Auditoria, Controladoria e Perícia Contábil.",
cursos_realizados:"Excel intermediário/avançado.",
desenvolvimento_futuro:"SIM. Especialização em Reforma Tributária.",
principal_atuacao:"Analista Fiscal: análise fiscal/contábil dos processos, integralização contábil e apuração dos impostos."
}},
{
email:"amanda.santos@to.sebrae.com.br",nome:"Amanda Soares Santos",arquivo:"AMANDA SOARES SANTOS_QUESTIONARIO.pdf",id:"146AhlhIu3p_8qFQeM5Va7duIQk4_SpM0",
r:{
pdi_criado_ano:"NÃO - Ainda não elaborei um PDI.",
desafios_funcao:"Falta de tempo; falta de treinamentos específicos; volume excessivo de demandas.",
graduacoes_fundamentais:"Ciências Contábeis.",
especializacoes_recomendadas:"Controladoria e Finanças; Gestão e Prática Contábil; Gestão Contábil e Tributária Aplicada ao Terceiro Setor.",
cursos_extracurriculares:"Comunicação e Oratória; Excel Avançado; Power BI.",
cursos_internos_sebrae:"Gestão de Processos; Análise de Indicadores; Liderança e Gestão de Equipes.",
temas_competencias_indispensaveis:"Contabilidade; finanças; liderança; inovação; tecnologia; processos.",
plano_capacitacao_ano:"SIM. Participação no Congresso Nacional da Mulher Contabilista.",
descricao_funcao:"Atua na área contábil principalmente com receitas, conciliações mensais, fechamento contábil, patrimônio, financeiro dos recebimentos, emissão de notas fiscais e Central de Faturamento.",
principais_atividades:"Reconhecimento de receitas; adiantamento de clientes; integrações contábeis e financeiras; emissão de notas fiscais; conciliações; relatórios de receita para gerência e gestores.",
conhecimentos_habilidades_indispensaveis:"Power BI; conhecimento contábil atualizado; oratória e falar em público.",
responsabilidades_extras:"Quando necessário, cria processos da Central de Faturamento e substitui analista fiscal ou gestor contábil.",
cursos_eventos_interesse:"Congresso Nacional da Mulher Contabilista.",
formacao_academica_relacionada:"As formações sugeridas fazem parte da sua trajetória.",
cursos_realizados:"Cursos recomendados já fazem parte da trajetória.",
desenvolvimento_futuro:"SIM. Oratória; gestão fiscal e tributária; gestão contábil; gestão em finanças.",
principal_atuacao:"Atuo na contabilidade e sou responsável pelos recebimentos/registros de receitas."
}}
];

async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  for(const d of D){
   const [u]=await db.execute("SELECT id,name FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1",[d.email]);
   if(!u.length){console.log("[UGOC] EMPREGADO_NAO_ENCONTRADO",d.nome,d.email);continue;}
   const uid=u[0].id;
   const [ex]=await db.execute("SELECT id,status FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=2025 ORDER BY versao DESC,id DESC LIMIT 1",[uid]);
   if(ex.length){console.log("[UGOC] JA_EXISTE",d.nome,ex[0].id);continue;}
   const url="https://drive.google.com/file/d/"+d.id+"/view";
   const [ins]=await db.execute("INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,2025,1,'preenchido','importado_historico',?,?,?,?)",[uid,d.arquivo,url,"Transcrição histórica do questionário de 2025 conforme PDF original. Unidade: UGOC.",uid]);
   for(const [chave,pergunta,ordem] of P){
    const resp=Object.prototype.hasOwnProperty.call(d.r,chave)?d.r[chave]:"";
    await db.execute("INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",[ins.insertId,chave,pergunta,resp||null,ordem]);
   }
   console.log("[UGOC] CRIADO",d.nome,"questionario",ins.insertId);
  }
 } finally {await db.end();}
}
main().catch(e=>{console.error("[UGOC] ERRO",e);process.exit(1);});

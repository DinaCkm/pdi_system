const mysql = require("mysql2/promise");
const ANO=2025, APPLY=process.argv.includes("--apply"), MARKER="classificacao-regionais-2025-pontual-v1";
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function key(v){return norm(v).replace(/\s+/g,"-")}
function clip(v,n=220){const s=String(v||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s}
const REGIONAIS=["bico do papagaio","metropolitana","medio norte","norte colinas","regional norte","portal do jalapao","serras gerais","regional sul","vale do araguaia"];
const RULES=[
{id:"atendimento",labels:["atendimento e relacionamento com clientes","atendimento e relacionamento com o cliente"],rx:[/atendimento/,/cliente/,/comercializa/,/venda/,/prospec/,/consultoria/,/orientacao empresarial/]},
{id:"projetos",labels:["gestao de projetos e processos"],rx:[/gestao de projeto/,/gestao de processo/,/projeto/,/processo/,/scrum/,/metodologia agil/,/cronograma/,/plano de acao/]},
{id:"planejamento",labels:["planejamento indicadores e resultados"],rx:[/planejamento/,/indicador/,/meta/,/resultado/,/monitoramento/,/desempenho/]},
{id:"territorial",labels:["desenvolvimento territorial e politicas publicas"],rx:[/politica publica/,/poder publico/,/prefeitura/,/municipio/,/territor/,/desenvolvimento local/,/cidade empreendedora/,/sala do empreendedor/,/governo/,/gestao publica/]},
{id:"empresarial",labels:["gestao empresarial e financas"],rx:[/gestao empresarial/,/financeir/,/credito/,/fluxo de caixa/,/contabil/,/analise de mercado/,/planejamento de negocio/,/negocio/,/orcamento/]},
{id:"educacao",labels:["educacao empreendedora e desenvolvimento de negocios"],rx:[/educacao empreendedora/,/capacitacao/,/treinamento/,/curso/,/workshop/,/empretec/,/desenvolvimento de negocio/,/empreendedorismo/,/palestra/,/instrutoria/]},
{id:"comunicacao",labels:["comunicacao articulacao e negociacao"],rx:[/articulacao/,/negociacao/,/parceria/,/relacionamento institucional/,/mobilizacao/,/networking/,/comunicacao/,/oratoria/,/persuas/]},
{id:"tecnologia",labels:["tecnologia dados e transformacao digital"],rx:[/analise de dados/,/dados/,/crm/,/qlik/,/power bi/,/business intelligence/,/inovacao/,/transformacao digital/,/tecnologia/,/automacao/,/inteligencia artificial/,/marketing digital/]},
{id:"administrativa",labels:["compras contratos e gestao administrativa"],rx:[/compra/,/contrat/,/licit/,/patrimonio/,/frota/,/estoque/,/administrativ/,/termo de referencia/,/fornecedor/,/prestacao de contas/,/compliance/,/pagamento/,/manutencao predial/]},
{id:"pessoas",labels:["gestao de pessoas e lideranca"],rx:[/gestao de pessoas/,/lider/,/equipe/,/supervis/,/estagiari/,/bolsista/,/delegacao/,/feedback/,/desenvolvimento de talentos/]},
{id:"protagonismo",labels:["protagonismo autogestao e resolucao de problemas","protagonismo autogestao e responsabilidade profissional","resolucao de problemas e melhoria continua"],rx:[/resolucao de problema/,/tomada de decisao/,/proativ/,/autonomia/,/gestao do tempo/,/organizacao/,/prioriza/,/resilien/,/responsabil/,/melhoria continua/]}
];
function regionalOk(v){const n=norm(v);return REGIONAIS.some(r=>n.includes(r)||r.includes(n))}
function compat(a,b){a=norm(a);b=norm(b);return !!a&&!!b&&(a===b||a.includes(b)||b.includes(a))}
function ruleFor(nome){const n=norm(nome);for(const r of RULES)if(r.labels.some(x=>n.includes(x)||x.includes(n)))return r;let best=null;for(const r of RULES){const ws=r.labels[0].split(" ").filter(w=>w.length>4),s=ws.filter(w=>n.includes(w)).length;if(!best||s>best.s)best={r,s}}return best&&best.s>=2?best.r:null}
function hit(text,r){const n=norm(text);for(const rx of r.rx){if(rx.test(n))return true}return false}
function classify(r,d){
 const core=(d.descricao+" "+d.atividades).trim(),supp=(d.conhecimentos+" "+d.temas+" "+d.extras).trim();
 if(hit(core,r))return {c:"ESSENCIAL",j:`O questionário vincula este eixo diretamente às atividades centrais da função: "${clip(d.atividades||d.descricao)}".`};
 if(hit(supp,r))return {c:"TRANSVERSAL",j:`O questionário apresenta este conhecimento como apoio à execução da função: "${clip(d.conhecimentos||d.temas||d.extras)}".`};
 if(r.id==="protagonismo")return {c:"TRANSVERSAL",j:"A função exige autonomia, organização e responsabilidade pelas entregas, ainda que o questionário não apresente este eixo como núcleo técnico específico."};
 return {c:"NAO_ESSENCIAL",j:`As atividades centrais declaradas concentram-se em "${clip(d.atividades||d.descricao)}". Não foi identificada atribuição relevante que torne este eixo necessário de forma direta.`};
}
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL ausente");
 const db=await mysql.createConnection(process.env.DATABASE_URL),pend=[],out=[];
 try{
  const [admins]=await db.execute("SELECT id,name FROM users WHERE role='admin' AND status='ativo' ORDER BY id LIMIT 1"); if(!admins.length)throw new Error("Sem admin ativo"); const adminId=+admins[0].id;
  const [qs]=await db.execute(`SELECT q.id questionarioId,q.colaborador_id colaboradorId,q.ano,q.versao,u.name,u.email,d.nome departamentoNome FROM questionarios_atividades_funcao q JOIN users u ON u.id=q.colaborador_id LEFT JOIN departamentos d ON d.id=u.departamentoId WHERE q.ano=? ORDER BY q.colaborador_id,q.versao DESC,q.id DESC`,[ANO]);
  const latest=new Map(); for(const q of qs)if(!latest.has(+q.colaboradorId)&&regionalOk(q.departamentoNome))latest.set(+q.colaboradorId,q);
  const [provas]=await db.execute("SELECT id,codigo,nome,unidade,ano,questoes_json questoesJson FROM provas_importadas WHERE ano=? AND codigo LIKE '%HIST%' ORDER BY id DESC",[ANO]);
  for(const q of latest.values()){
   const [resp]=await db.execute("SELECT chave,resposta FROM questionario_atividades_respostas WHERE questionario_id=? ORDER BY ordem,id",[q.questionarioId]);
   const by=Object.fromEntries(resp.map(x=>[x.chave,String(x.resposta||"").trim()])); const d={descricao:by.descricao_funcao||"",atividades:by.principais_atividades||"",conhecimentos:by.conhecimentos_habilidades_indispensaveis||"",extras:by.responsabilidades_extras||"",temas:by.temas_competencias_indispensaveis||""};
   const volume=Object.values(d).join(" ").replace(/\s+/g," ").trim().length;
   if(volume<120||(!d.descricao&&!d.atividades)){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Questionário insuficiente para classificação responsável."});continue}
   const prova=provas.find(p=>compat(q.departamentoNome,p.unidade)); if(!prova){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Prova histórica da Regional não localizada."});continue}
   let questoes;try{questoes=typeof prova.questoesJson==="string"?JSON.parse(prova.questoesJson):prova.questoesJson}catch{questoes=null}
   if(!Array.isArray(questoes)){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Questões da prova histórica ilegíveis."});continue}
   const cat=new Map();for(const qq of questoes)for(const e of(Array.isArray(qq?.eixos)?qq.eixos:[])){const nome=String(e?.nome||"").trim();if(nome)cat.set(key(nome),nome)}
   if(cat.size!==11){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:`Prova histórica com ${cat.size} eixos; esperado 11.`});continue}
   const dec=[];let bad=false;for(const [ch,nome]of cat){const r=ruleFor(nome);if(!r){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,eixo:nome,motivo:"Eixo sem correspondência semântica segura."});bad=true;break}dec.push({ch,nome,...classify(r,d)})}if(bad)continue;
   out.push({regional:q.departamentoNome,empregado:q.name,email:q.email,questionarioId:+q.questionarioId,provaId:+prova.id,decisoes:dec});
   if(!APPLY)continue;
   await db.beginTransaction();try{
    const origem=`PROVA:${+prova.id}`;
    for(const x of dec){
     const [ex]=await db.execute("SELECT id,classificacao,status_classificacao status FROM questionario_atividades_eixos_tecnicos WHERE questionario_id=? AND origem_prova_chave=? AND eixo_chave=? LIMIT 1",[q.questionarioId,origem,x.ch]);
     if(ex.length&&ex[0].status==="CLASSIFICADO"&&ex[0].classificacao)continue;
     if(ex.length)await db.execute("UPDATE questionario_atividades_eixos_tecnicos SET prova_id=?,aplicacao_id=NULL,origem_prova='PROVA_HISTORICA',eixo_nome=?,classificacao=?,status_classificacao='CLASSIFICADO',justificativa=?,classificado_por=?,classificado_em=NOW() WHERE id=?",[prova.id,x.nome,x.c,x.j,adminId,ex[0].id]);
     else await db.execute("INSERT INTO questionario_atividades_eixos_tecnicos (questionario_id,prova_id,aplicacao_id,origem_prova,origem_prova_chave,eixo_chave,eixo_nome,classificacao,status_classificacao,justificativa,classificado_por,classificado_em) VALUES (?,?,NULL,'PROVA_HISTORICA',?,?,?,?, 'CLASSIFICADO',?,?,NOW())",[q.questionarioId,prova.id,origem,x.ch,x.nome,x.c,x.j,adminId]);
     await db.execute("INSERT INTO questionario_atividades_historico (questionario_id,campo,valor_anterior,valor_novo,alterado_por) VALUES (?,?,?,?,?)",[q.questionarioId,`eixoTecnico:${x.ch}:cargaPontual`,null,JSON.stringify({classificacao:x.c,justificativa:x.j,marker:MARKER}),adminId]);
     const [h]=await db.execute("SELECT id FROM registro_historico_proficiencia_eixos WHERE colaborador_id=? AND prova_historica_id=? AND eixo_chave=? LIMIT 1",[q.colaboradorId,prova.id,x.ch]);
     if(!h.length){
      const [leg]=await db.execute("SELECT e.eixo_nome eixoNome,e.percentual_anterior percentual FROM prova_utic_matrizes m JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id WHERE m.colaborador_id=?",[q.colaboradorId]);let pct=null;
      for(const z of leg)if(key(z.eixoNome)===x.ch){pct=z.percentual==null?null:+z.percentual;break}
      await db.execute("INSERT INTO registro_historico_proficiencia_eixos (colaborador_id,prova_historica_id,eixo_chave,eixo_nome,percentual_original,status,fonte) VALUES (?,?,?,?,?,?,?)",[q.colaboradorId,prova.id,x.ch,x.nome,pct,pct==null?"PENDENTE_VALIDACAO":"REGISTRADO",pct==null?"Prova histórica cadastrada; indicador original pendente de validação.":"Indicador original preservado do registro legado."]);
     }
    }
    await db.commit();
   }catch(e){await db.rollback();pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Erro de gravação: "+e.message})}
  }
  console.log("RESULT="+JSON.stringify({apply:APPLY,totalQuestionarios:latest.size,processados:out.length,pendencias:pend.length,resultado:out,pendenciasDetalhadas:pend}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});

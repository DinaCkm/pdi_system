const mysql=require("mysql2/promise");
const ANO=2025,APPLY=process.argv.includes("--apply"),MARKER="classificacao-regionais-2025-pontual-v2";
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function key(v){return norm(v).replace(/\s+/g,"-")}
function clip(v,n=190){const s=String(v||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n-1)+"…":s}
const REGIONAIS=["bico do papagaio","metropolitana","medio norte","norte colinas","regional norte","portal do jalapao","serras gerais","regional sul","vale do araguaia"];
const AX=[
 ["atendimento",["atendimento e relacionamento com clientes","atendimento e relacionamento com o cliente"]],
 ["projetos",["gestao de projetos e processos"]],
 ["planejamento",["planejamento indicadores e resultados"]],
 ["territorial",["desenvolvimento territorial e politicas publicas"]],
 ["empresarial",["gestao empresarial e financas"]],
 ["educacao",["educacao empreendedora e desenvolvimento de negocios"]],
 ["comunicacao",["comunicacao articulacao e negociacao"]],
 ["tecnologia",["tecnologia dados e transformacao digital"]],
 ["administrativa",["compras contratos e gestao administrativa"]],
 ["pessoas",["gestao de pessoas e lideranca"]],
 ["protagonismo",["protagonismo autogestao e resolucao de problemas","protagonismo autogestao e responsabilidade profissional","resolucao de problemas e melhoria continua"]]
];
const ORDER=AX.map(x=>x[0]);
const P={E:"ESSENCIAL",T:"TRANSVERSAL",N:"NAO_ESSENCIAL"};
const PLAN={};
function add(nome,s){PLAN[norm(nome)]=Object.fromEntries(ORDER.map((id,i)=>[id,P[s.split("")[i]]]))}

// Bico do Papagaio
add("Edvaldo Pereira Lima Júnior","EEEETTETTET");
add("Wanderson da Silva Pimentel Chagas","TNNNNTTNENT");
add("Romisson Matias Santos","EETTTETETTT");
add("Juliana Masson Prediger","EEEEEEEEEE T".replace(/ /g,""));
add("Valci Pereira da Silva Junior","EETEEEETNTT");
// Médio Norte/Colinas
add("Wérica Souza Silva","TENTNTTTENT");
add("Mailene Alencar Rodrigues Torres","EETTEEE TNN T".replace(/ /g,""));
add("Jacirley Pereira do Nascimento","TETE N TETEN T".replace(/ /g,""));
add("ANA MARIA LEAL FREITAS","EETTEEETNNT");
add("Ana Maria Leal Cunha de Freitas","EETTEEETNNT");
add("Aldeni Batista Torres","TEETTTTEEEE");
// Metropolitana
add("Odilo Junior Oliveira Carvalho","EEETEEETTTT");
add("Maryellen Leite de Araujo","EEETEEETTET");
add("Janaina Miranda Xavier","TETNNTTTENT");
add("Welligton dos Passos Silva","TTNNNTTNENT");
add("Clarice da Rosa Corrêa Soares","EETNEETEE TT".replace(/ /g,""));
add("ANTONIA GELMA PEREIRA DA SILVA CARVALHO","ETTTNETTN TT".replace(/ /g,""));
add("Maria Divina Alves Feitosa","EETTEEE TTNT".replace(/ /g,""));
add("Amaggeldo Barbosa","TEETTTETT EE".replace(/ /g,""));
add("WALBENIA LEMOS DA SILVA TORRES","ETNNTETNNNT");
add("ELIGENETH RESPLANDE PIMENTEL GOMES","EETTEEETTTE");
add("Eligeneth Resplandes Pimentel Gomes","EETTEEETTTE");
add("Wiury Pereira de Aguiar","TTNNNTTNENT");
add("Myrlla Catarine Matos Parente","EEETNTTTNNT");
add("Monique Silva de Albuquerque","ETNTEETTNNT");
// Portal do Jalapão
add("Rafael Camelo Ayres","ETNNNTTTENT");
add("Fabiane Cappellesso","TEENNEEETNE");
add("Millena Pereira Lima Rodrigues","EEEEETE TEEE".replace(/ /g,""));
add("André Silva Gomes","EETTEEETTTT");
add("Carlúcia Saraiva de Brito","EEE TETETETT".replace(/ /g,""));
add("Admary Monteiro Barbosa","TEEETTENTNT");
// Regional Norte
add("Denise França dos Santos","TTNNNTTTENT");
add("Glaucia de Godoi Souza Ferreira","EETNETETTNT");
add("Thiago Dias da Silva","TEETTETTLEE".replace("L","E"));
add("JOÃO MARCOS FERREIRA DOS","TTTETTETNNT");
add("João Marcos Ferreira dos Santos","TTTETTETNNT");
add("Marcus Vinicius Vieira Queiroz","TEE TTTETTEE".replace(/ /g,""));
add("INGRID PÂMELA ALVES AMORIM","EETTEETETTT");
add("Deilane Rodrigues Vieira","ETNNTEETN TT".replace(/ /g,""));
add("ILMA LOPES DA SILVA","EEEEEEE T NTT".replace(/ /g,""));
add("Andressa Ibiapina","EETTEEE TENE".replace(/ /g,""));
// Regional Sul
add("Thiago Milhomem Soares","TEEETTETNTT");
add("Stefane Cardoso Santana","ETTTEEENNNT");
add("José Tavares Pires","ETTTEEETNTT");
add("Paula dos Reis Coelho Alencar","EEE TTTETTET".replace(/ /g,""));
add("Francielly Quitéria Guimarães","EETNEETTENT");
add("Francielly Quiteria Guimaraes Alves","EETNEETTENT");
add("Alice Sousa Santos Costa","NENNNTTNENT");
add("Djales dos Santos Oliveira","EETTEEE TTE T".replace(/ /g,""));
// Serras Gerais
add("Rodrigo Alves dos Santos","EETNETETTTT");
add("Gabriel Martins Lira","EEE TEEETTET".replace(/ /g,""));
add("Cristyane Fonseca Cardoso","TENNNTTTENT");
add("Antônio Louça Curcino","TEEE TTETEEE".replace(/ /g,""));
add("Bruno de Jesus Rodrigues","TEEETTETETT");
// Vale do Araguaia
add("Claudete Pinto Carmo Sousa","EEE TEEETNTT".replace(/ /g,""));
add("ADEMIR WHITMAN GOMES REGO","ETTEEETENNT");
add("Renata Moura Alves Simas","TEE TTTETTEE".replace(/ /g,""));
add("Fábio Henrique da Cruz","EETTEEETNNE");
add("Cesar Augusto de Sá Moreira","TEEETEETNTE");

function regionalOk(v){const n=norm(v);return REGIONAIS.some(r=>n.includes(r)||r.includes(n))}
function compat(a,b){a=norm(a);b=norm(b);return !!a&&!!b&&(a===b||a.includes(b)||b.includes(a))}
function provaDaRegional(q,provas){
 const dep=norm(q.departamentoNome);
 if(dep.includes("medio norte")||dep.includes("norte colinas")){
   return provas.find(p=>norm(p.codigo).includes("regionais 2025 rmn hist")||norm(p.codigo).includes("rmn hist")||norm(p.unidade).includes("norte colinas")||norm(p.unidade).includes("medio norte"));
 }
 return provas.find(p=>compat(q.departamentoNome,p.unidade));
}
function axisId(nome){const n=norm(nome);for(const [id,labels]of AX)if(labels.some(x=>n.includes(x)||x.includes(n)))return id;let best=null;for(const [id,labels]of AX){const ws=labels[0].split(" ").filter(w=>w.length>4),s=ws.filter(w=>n.includes(w)).length;if(!best||s>best.s)best={id,s}}return best&&best.s>=2?best.id:null}
function evidence(id,d){
 const m={
  atendimento:d.atividades||d.descricao,projetos:d.atividades||d.descricao,planejamento:d.atividades||d.conhecimentos,
  territorial:d.atividades||d.descricao,empresarial:d.conhecimentos||d.atividades,educacao:d.atividades||d.descricao,
  comunicacao:d.atividades||d.conhecimentos,tecnologia:d.conhecimentos||d.atividades,administrativa:d.atividades||d.extras,
  pessoas:d.atividades||d.descricao,protagonismo:d.conhecimentos||d.extras||d.atividades
 };return clip(m[id]||d.atividades||d.descricao)
}
function just(c,id,d){
 const ev=evidence(id,d);
 if(c==="ESSENCIAL")return `A leitura integral do questionário mostra que este conhecimento participa diretamente das entregas centrais da função. Evidência declarada: "${ev}".`;
 if(c==="TRANSVERSAL")return `A leitura integral do questionário mostra que este conhecimento apoia ou atravessa a atuação, sem constituir o núcleo técnico principal da função. Evidência declarada: "${ev}".`;
 return `Considerando em conjunto a descrição da função, as atividades e os conhecimentos declarados, este eixo não aparece como requisito relevante para as entregas atuais. Núcleo funcional informado: "${clip(d.atividades||d.descricao)}".`;
}
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL ausente");
 const db=await mysql.createConnection(process.env.DATABASE_URL),pend=[],done=[];
 try{
  const [admins]=await db.execute("SELECT id,name FROM users WHERE role='admin' AND status='ativo' ORDER BY id LIMIT 1");if(!admins.length)throw new Error("Sem administrador ativo");const adminId=+admins[0].id;
  const [qs]=await db.execute(`SELECT q.id questionarioId,q.colaborador_id colaboradorId,q.versao,u.name,u.email,d.nome departamentoNome FROM questionarios_atividades_funcao q JOIN users u ON u.id=q.colaborador_id LEFT JOIN departamentos d ON d.id=u.departamentoId WHERE q.ano=? ORDER BY q.colaborador_id,q.versao DESC,q.id DESC`,[ANO]);
  const latest=new Map();for(const q of qs)if(!latest.has(+q.colaboradorId)&&regionalOk(q.departamentoNome))latest.set(+q.colaboradorId,q);
  const [provas]=await db.execute("SELECT id,codigo,nome,unidade,questoes_json questoesJson FROM provas_importadas WHERE ano=? AND codigo LIKE '%HIST%' ORDER BY id DESC",[ANO]);
  for(const q of latest.values()){
   const plan=PLAN[norm(q.name)];if(!plan){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Questionário existente no sistema ainda não analisado nesta carga pontual."});continue}
   const [resp]=await db.execute("SELECT chave,resposta FROM questionario_atividades_respostas WHERE questionario_id=? ORDER BY ordem,id",[q.questionarioId]);const by=Object.fromEntries(resp.map(x=>[x.chave,String(x.resposta||"").trim()]));
   const d={descricao:by.descricao_funcao||"",atividades:by.principais_atividades||"",conhecimentos:by.conhecimentos_habilidades_indispensaveis||"",extras:by.responsabilidades_extras||"",temas:by.temas_competencias_indispensaveis||""};
   const volume=Object.values(d).join(" ").replace(/\s+/g," ").trim().length;if(volume<120||(!d.descricao&&!d.atividades)){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Questionário incompleto ou com conteúdo insuficiente para decisão responsável."});continue}
   const prova=provaDaRegional(q,provas);if(!prova){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Prova histórica correspondente à Regional não localizada."});continue}
   let questoes;try{questoes=typeof prova.questoesJson==="string"?JSON.parse(prova.questoesJson):prova.questoesJson}catch{questoes=null}if(!Array.isArray(questoes)){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Questões da prova histórica ilegíveis."});continue}
   const cat=new Map();for(const qq of questoes)for(const e of(Array.isArray(qq?.eixos)?qq.eixos:[])){const nome=String(e?.nome||"").trim();if(nome)cat.set(key(nome),nome)}if(cat.size!==11){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:`Prova histórica possui ${cat.size} eixos distintos; esperado: 11.`});continue}
   const dec=[];let bad=false;for(const [ch,nome]of cat){const id=axisId(nome);if(!id||!plan[id]){pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,eixo:nome,motivo:"Eixo histórico sem correspondência segura com a matriz analisada."});bad=true;break}dec.push({ch,nome,c:plan[id],j:just(plan[id],id,d)})}if(bad)continue;
   done.push({regional:q.departamentoNome,empregado:q.name,email:q.email,questionarioId:+q.questionarioId,provaId:+prova.id,classificacoes:dec.map(x=>({eixo:x.nome,classificacao:x.c}))});
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
     if(!h.length)await db.execute("INSERT INTO registro_historico_proficiencia_eixos (colaborador_id,prova_historica_id,eixo_chave,eixo_nome,percentual_original,status,fonte) VALUES (?,?,?,?,NULL,'PENDENTE_VALIDACAO','Prova histórica cadastrada; indicador original pendente de validação.')",[q.colaboradorId,prova.id,x.ch,x.nome]);
    }await db.commit();
   }catch(e){await db.rollback();pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,motivo:"Erro ao gravar: "+e.message})}
  }
  console.log("RESULT="+JSON.stringify({apply:APPLY,questionariosRegionaisNoSistema:latest.size,concluidos:done.length,pendencias:pend.length,pendenciasDetalhadas:pend,concluidosDetalhes:done}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});

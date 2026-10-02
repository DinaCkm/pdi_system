const mysql=require("mysql2/promise");
const targetNames=[
"Elisangela Tavares Alves Varanda",
"Elizeth Cristiane Coutinho Lima",
"Francismeire Ferreira Lima de Morais",
"Joseane Rodrigues Leite",
"Kívia Raquel Pereira Leite",
"Vivian Nascimento Reis"
];
const grupos={
"UGP-E01":["Legislação, Normas e Conformidade Jurídica","Gestão de Processos / Legislação","Gestão Contratual"],
"UGP-E05":["Estratégia","Planejamento","Visão Estratégica","Visão Sistêmica com Foco em Pessoas","Estratégia e Protagonismo","Gestão de Tempo","Inovação","Criatividade"],
"UGP-E06":["Estratégia de Indicadores","Gestão de Indicadores (People Analytics)","Competências Técnicas"],
"UGP-E08":["Cultura Organizacional na Prática","Gestão do Clima Organizacional","Diversidade e Inclusão"],
"UGP-E09":["Desenvolvimento de Lideranças","Gestão de Treinamentos e Capacitação"]
};
function norm(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  for(const nome of targetNames){
    const [us]=await db.execute("SELECT id,name,email,cargo,departamentoId FROM users WHERE name=? LIMIT 1",[nome]);
    if(!us.length){console.log("[UGP_CONFLITO_USUARIO_NAO_ENCONTRADO] "+nome);continue;}
    const u=us[0];
    const [qs]=await db.execute(`
      SELECT q.id,q.ano,q.versao,q.status,q.fonte,r.chave,r.resposta
      FROM questionarios_atividades_funcao q
      LEFT JOIN questionario_atividades_respostas r ON r.questionario_id=q.id
      WHERE q.colaborador_id=?
      ORDER BY q.ano DESC,q.versao DESC,q.id DESC,r.ordem`,[u.id]);
    let qid=qs[0]?.id??null;
    const respostas={};
    for(const q of qs.filter(x=>x.id===qid)) respostas[q.chave]=q.resposta;
    const [eixos]=await db.execute(`
      SELECT e.eixo_nome eixoNome,e.relacao,e.justificativa
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
      WHERE m.colaborador_id=?`,[u.id]);
    const conflitos={};
    for(const [id,nomes] of Object.entries(grupos)){
      const achados=eixos.filter(e=>nomes.some(n=>norm(n)===norm(e.eixoNome)));
      const rels=[...new Set(achados.map(e=>e.relacao).filter(Boolean))];
      if(rels.length>1){
        conflitos[id]=achados.map(e=>({
          eixo:e.eixoNome,relacao:e.relacao,
          justificativa:String(e.justificativa||"").split("\n\n")[0]
        }));
      }
    }
    console.log("[UGP_CONFLITO_PESSOA] "+JSON.stringify({
      id:u.id,nome:u.name,email:u.email,cargo:u.cargo,
      questionarioId:qid,
      descricao_funcao:respostas.descricao_funcao||null,
      principais_atividades:respostas.principais_atividades||null,
      conhecimentos:respostas.conhecimentos_habilidades_indispensaveis||null,
      temas:respostas.temas_competencias_indispensaveis||null,
      principal_atuacao:respostas.principal_atuacao||null,
      responsabilidades_extras:respostas.responsabilidades_extras||null,
      conflitos
    }));
  }
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGP_CONFLITO_ERROR]",e);process.exit(1);});

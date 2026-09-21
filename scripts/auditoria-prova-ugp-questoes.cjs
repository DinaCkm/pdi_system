const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [ps]=await db.execute("SELECT id,codigo,nome,unidade,ano,status,total_questoes totalQuestoes,questoes_json questoesJson FROM provas_importadas WHERE codigo='PROVA-UGP-2026' OR unidade='UGP - UNIDADE DE GESTÃO DE PESSOAS' ORDER BY ano DESC,id DESC");
  for(const p of ps){
    let qs=[]; try{qs=JSON.parse(p.questoesJson||"[]")}catch{}
    console.log("[UGP_PROVA_META] "+JSON.stringify({id:p.id,codigo:p.codigo,nome:p.nome,unidade:p.unidade,ano:p.ano,status:p.status,totalQuestoes:p.totalQuestoes,totalJson:qs.length}));
    qs.forEach((q,i)=>console.log("[UGP_QUESTAO] "+JSON.stringify({
      numero:i+1,id:q.id,enunciado:String(q.enunciado||""),eixos:(q.eixos||[]).map(e=>e.nome||e),macroarea:q.macroarea||null,microarea:q.microarea||null,tagFonte:q.tagFonte||null
    })));
  }
  const [apps]=await db.execute("SELECT id,prova_id provaId,titulo,status,agendada_para agendadaPara,prova_snapshot_json provaSnapshotJson FROM aplicacoes_proficiencia ORDER BY id DESC");
  for(const a of apps){
    let snap=null;try{snap=typeof a.provaSnapshotJson==='string'?JSON.parse(a.provaSnapshotJson):a.provaSnapshotJson}catch{}
    if(Number(a.provaId)===17 || String(snap?.codigo||"").includes("UGP")){
      const axes=[...new Set((snap?.questoes||[]).flatMap(q=>(q.eixos||[]).map(e=>String(e.nome||e).trim())).filter(Boolean))];
      console.log("[UGP_APLICACAO] "+JSON.stringify({id:a.id,provaId:a.provaId,titulo:a.titulo,status:a.status,agendadaPara:a.agendadaPara,totalQuestoes:snap?.questoes?.length||0,totalEixos:axes.length,eixos:axes}));
    }
  }
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGP_QUESTAO_ERROR]",e);process.exit(1);});

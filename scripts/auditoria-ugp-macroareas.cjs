const mysql=require("mysql2/promise");
function norm(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute("SELECT id,questoes_json questoesJson FROM provas_importadas WHERE codigo='PROVA-UGP-2026' LIMIT 1");
  const p=rows[0]; if(!p) throw new Error("Prova UGP nao encontrada");
  const qs=JSON.parse(p.questoesJson||"[]");
  const map=new Map();
  qs.forEach((q,i)=>{
    const m=String(q.macroarea||"").trim()||"(sem macroarea)";
    const k=norm(m);
    const item=map.get(k)||{macroarea:m,questoes:[]};
    item.questoes.push(i+1); map.set(k,item);
  });
  console.log("[UGP_MACROAREAS] "+JSON.stringify(Array.from(map.values()).sort((a,b)=>a.questoes[0]-b.questoes[0])));
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGP_MACROAREAS_ERROR]",e);process.exit(1);});

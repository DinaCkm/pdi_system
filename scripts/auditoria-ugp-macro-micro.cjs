const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute("SELECT questoes_json questoesJson FROM provas_importadas WHERE codigo='PROVA-UGP-2026' LIMIT 1");
  if(!rows[0]) throw new Error("Prova UGP nao encontrada");
  const qs=JSON.parse(rows[0].questoesJson||"[]");
  console.log("[UGP_MACRO_MICRO] "+JSON.stringify(qs.map((q,i)=>({
    n:i+1,
    macroarea:q.macroarea||null,
    microarea:q.microarea||null,
    enunciado:String(q.enunciado||"").slice(0,220)
  }))));
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGP_MACRO_MICRO_ERROR]",e);process.exit(1);});

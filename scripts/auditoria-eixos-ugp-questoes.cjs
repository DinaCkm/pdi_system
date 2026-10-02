const mysql = require("mysql2/promise");

async function main(){
  const db=await mysql.createConnection(process.env.DATABASE_URL);
  try{
    const [rows]=await db.execute(
      "SELECT id,codigo,nome,unidade,ano,questoes_json AS questoesJson FROM provas_importadas WHERE codigo='PROVA-UGP-2026' LIMIT 1"
    );
    if(!rows.length) throw new Error("Prova UGP nao encontrada");
    const p=rows[0];
    const qs=JSON.parse(p.questoesJson||"[]");
    const out=qs.map((q,i)=>({
      numero:i+1,
      id:String(q.id??""),
      enunciado:String(q.enunciado??""),
      eixos:(Array.isArray(q.eixos)?q.eixos:[]).map(e=>String(e?.nome??e??"").trim()).filter(Boolean),
      totalEixos:(Array.isArray(q.eixos)?q.eixos:[]).filter(Boolean).length
    }));
    console.log("[UGP_Q] "+JSON.stringify(out));
  } finally {await db.end();}
}
main().catch(e=>{console.error("[UGP_Q] ERROR",e);process.exit(1);});

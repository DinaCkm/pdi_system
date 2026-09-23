const mysql=require("mysql2/promise");
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
const REGIONAIS=["bico do papagaio","metropolitana","medio norte","norte colinas","regional norte","portal do jalapao","serras gerais","regional sul","vale do araguaia"];
function regionalOk(v){const n=norm(v);return REGIONAIS.some(r=>n.includes(r)||r.includes(n))}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute(`
    SELECT d.nome regional,u.name empregado,u.email,
           e.eixo_id eixoId,e.eixo_nome eixoNome,e.percentual_anterior percentual
      FROM prova_utic_matrizes m
      JOIN users u ON u.id=m.colaborador_id
      LEFT JOIN departamentos d ON d.id=u.departamentoId
      JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
     ORDER BY d.nome,u.name,e.eixo_nome
  `);
  const reg=rows.filter(r=>regionalOk(r.regional));
  const byAxis=new Map();
  for(const r of reg){
    const k=String(r.eixoNome||"").trim();
    if(!byAxis.has(k))byAxis.set(k,{eixoNome:k,total:0,percentuais:new Set(),empregados:new Set()});
    const x=byAxis.get(k);x.total++;if(r.percentual!==null&&r.percentual!==undefined)x.percentuais.add(Number(r.percentual));x.empregados.add(r.empregado);
  }
  const axes=[...byAxis.values()].map(x=>({eixoNome:x.eixoNome,total:x.total,percentuais:[...x.percentuais],empregados:[...x.empregados]}));
  console.log("AXES="+JSON.stringify({totalLinhas:reg.length,totalEixosDistintos:axes.length,axes}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
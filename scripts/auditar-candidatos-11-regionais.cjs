const mysql=require("mysql2/promise");
const TARGETS=[["REGIONAL BICO DO PAPAGAIO","JULIANA MASSON PREDIGER"],["REGIONAL BICO DO PAPAGAIO","EDVALDO PEREIRA LIMA JÚNIOR"],["REGIONAL METROPOLITANA","AMAGGELDO BARBOSA"],["REGIONAL VALE DO ARAGUAIA","RENATA MOURA ALVES SIMAS"],["REGIONAL PORTAL DO JALAPAO","MILLENA PEREIRA LIMA RODRIGUES"],["REGIONAL NORTE","MARCUS VINICIUS VIEIRA QUEIROZ"],["REGIONAL MEDIO NORTE COLINAS","ALDENI BATISTA TORRES"],["REGIONAL SERRAS GERAIS","VANDEBERGUE ARAUJO SILVA JR"],["REGIONAL SERRAS GERAIS","CRISTYANE FONSECA CARDOSO"],["REGIONAL SERRAS GERAIS","ANTONIO LOUÇA CURCINO"],["REGIONAL SUL","PAULA DOS REIS COELHO ALENCAR SOUSA"]];
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function tokens(v){return new Set(norm(v).split(" ").filter(x=>x.length>1&&!["da","de","do","dos","das"].includes(x)))}
function score(a,b){const A=tokens(a),B=tokens(b);let inter=0;for(const x of A)if(B.has(x))inter++;return inter/Math.max(1,new Set([...A,...B]).size)}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [users]=await db.execute(`SELECT u.id,u.name,u.email,u.status,d.nome departamentoNome FROM users u LEFT JOIN departamentos d ON d.id=u.departamentoId ORDER BY u.name`);
  const out=[];
  for(const [unidade,nome] of TARGETS){
   const cand=users.map(u=>({...u,score:score(nome,u.name)})).filter(u=>u.score>=0.25).sort((a,b)=>b.score-a.score).slice(0,8);
   out.push({unidade,nome,candidatos:cand});
  }
  console.log("CANDIDATOS11="+JSON.stringify(out));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
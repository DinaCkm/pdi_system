const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute(`
    SELECT id,codigo,nome,unidade,ano,total_questoes AS totalQuestoes,status
    FROM provas_importadas
    WHERE ano=2025 AND codigo LIKE '%HIST%'
    ORDER BY unidade,codigo
  `);
  console.log("ALL_HIST="+JSON.stringify({total:rows.length,rows}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
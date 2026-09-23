const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute(`
    SELECT e.eixo_nome eixoNome,
           COUNT(*) linhas,
           COUNT(DISTINCT m.colaborador_id) empregados,
           COUNT(DISTINCT e.percentual_anterior) percentuaisDistintos,
           MIN(e.percentual_anterior) minPct,
           MAX(e.percentual_anterior) maxPct
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
      JOIN users u ON u.id=m.colaborador_id
      LEFT JOIN departamentos d ON d.id=u.departamentoId
     WHERE d.nome LIKE '%REGIONAL%'
     GROUP BY e.eixo_nome
     ORDER BY empregados DESC,eixoNome
  `);
  console.log("LEGACY_AXES="+JSON.stringify(rows));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
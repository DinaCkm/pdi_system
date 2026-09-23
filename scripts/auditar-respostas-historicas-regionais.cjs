const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [provas]=await db.execute(`
    SELECT id,codigo,nome,unidade,ano,total_questoes totalQuestoes,status
    FROM provas_importadas
    WHERE ano=2025 AND codigo LIKE '%HIST%' AND codigo LIKE 'REGIONAIS%'
    ORDER BY codigo
  `);
  const out=[];
  for(const p of provas){
    const [apps]=await db.execute(`
      SELECT a.id,a.titulo,a.status,
             COUNT(DISTINCT t.id) tentativas,
             COUNT(r.id) respostas,
             COUNT(DISTINCT rp.id) resultados
      FROM aplicacoes_proficiencia a
      LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id=a.id
      LEFT JOIN respostas_proficiencia r ON r.tentativa_id=t.id
      LEFT JOIN resultados_proficiencia rp ON rp.aplicacao_id=a.id
      WHERE a.prova_id=?
      GROUP BY a.id,a.titulo,a.status
      ORDER BY a.id
    `,[p.id]);
    out.push({...p,aplicacoes:apps});
  }
  const [tables]=await db.execute(`
    SELECT TABLE_NAME tableName,
           GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') columnsList
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE()
      AND (
        LOWER(TABLE_NAME) LIKE '%profic%' OR LOWER(TABLE_NAME) LIKE '%certif%' OR
        LOWER(TABLE_NAME) LIKE '%respost%' OR LOWER(TABLE_NAME) LIKE '%quest%'
      )
    GROUP BY TABLE_NAME
    ORDER BY TABLE_NAME
  `);
  console.log("HIST_AUDIT="+JSON.stringify({provas:out,tabelasRelacionadas:tables}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
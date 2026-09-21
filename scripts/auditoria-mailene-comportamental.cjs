const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [users]=await db.execute(`
    SELECT u.id,u.name,u.email,u.status,u.cargo,u.departamentoId,d.nome unidade
    FROM users u LEFT JOIN departamentos d ON d.id=u.departamentoId
    WHERE LOWER(u.name) LIKE '%mailene%' OR LOWER(u.email) LIKE '%mailene%'
    ORDER BY u.id`);
  console.log("[MAILENE_USER] "+JSON.stringify(users));
  if(!users.length) return;
  const ids=users.map(x=>Number(x.id)).filter(Number.isFinite);
  for(const id of ids){
    const [med]=await db.execute(`
      SELECT mc.id,mc.avaliacaoId,mc.colaboradorId,mc.competenciaMacroId,
             cm.nome competenciaNome,mc.tipoCompetencia,mc.fonte,mc.valor,
             mc.escala_min escalaMin,mc.escala_max escalaMax,mc.classificacao,
             mc.validada,mc.validada_em validadaEm,
             a.titulo avaliacaoTitulo,a.tipo avaliacaoTipo,a.status avaliacaoStatus,
             a.ano_referencia anoReferencia,a.ciclo_id cicloId
      FROM medicoes_competencias mc
      LEFT JOIN competencias_macros cm ON cm.id=mc.competenciaMacroId
      LEFT JOIN avaliacoes a ON a.id=mc.avaliacaoId
      WHERE mc.colaboradorId=?
      ORDER BY a.ano_referencia,mc.avaliacaoId,cm.nome`,[id]);
    console.log("[MAILENE_MEDICOES] "+JSON.stringify(med));
    const dept=users.find(x=>Number(x.id)===id)?.departamentoId;
    if(dept){
      const [peers]=await db.execute(`
        SELECT u.id,u.name,
               SUM(CASE WHEN mc.tipoCompetencia='COMPORTAMENTAL' AND mc.fonte='AVALIACAO_DESEMPENHO' AND mc.validada=1 THEN 1 ELSE 0 END) totalComportamentais,
               COUNT(DISTINCT CASE WHEN mc.tipoCompetencia='COMPORTAMENTAL' AND mc.fonte='AVALIACAO_DESEMPENHO' AND mc.validada=1 THEN mc.avaliacaoId END) avaliacoesComportamentais
        FROM users u
        LEFT JOIN medicoes_competencias mc ON mc.colaboradorId=u.id
        WHERE u.departamentoId=? AND u.status='ativo'
        GROUP BY u.id,u.name ORDER BY u.name`,[dept]);
      console.log("[MAILENE_PARES] "+JSON.stringify(peers));
    }
  }
  const [avs]=await db.execute(`
    SELECT a.id,a.titulo,a.tipo,a.status,a.ano_referencia anoReferencia,a.ciclo_id cicloId,
           COUNT(mc.id) totalMedicoes,
           COUNT(DISTINCT mc.colaboradorId) totalColaboradores
    FROM avaliacoes a
    LEFT JOIN medicoes_competencias mc ON mc.avaliacaoId=a.id AND mc.tipoCompetencia='COMPORTAMENTAL'
    WHERE a.tipo='DESEMPENHO'
    GROUP BY a.id,a.titulo,a.tipo,a.status,a.ano_referencia,a.ciclo_id
    ORDER BY a.ano_referencia,a.id`);
  console.log("[MAILENE_AVALIACOES] "+JSON.stringify(avs));
 }finally{await db.end();}
}
main().catch(e=>{console.error("[MAILENE_ERROR]",e);process.exit(1);});

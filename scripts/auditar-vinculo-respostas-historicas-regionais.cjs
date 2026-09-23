const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [provas]=await db.execute(`
    SELECT id,codigo,unidade
    FROM provas_importadas
    WHERE ano=2025 AND codigo LIKE 'REGIONAIS%HIST%'
    ORDER BY codigo
  `);
  const out=[];
  for(const p of provas){
    const [apps]=await db.execute(`
      SELECT a.id,a.titulo,a.status,
             COUNT(DISTINCT ap.colaborador_id) participantes,
             COUNT(DISTINCT t.id) tentativas,
             COUNT(DISTINCT r.id) respostas,
             COUNT(DISTINCT rp.id) resultados
      FROM aplicacoes_proficiencia a
      LEFT JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id=a.id
      LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id=a.id
      LEFT JOIN respostas_proficiencia r ON r.tentativa_id=t.id
      LEFT JOIN resultados_proficiencia rp ON rp.aplicacao_id=a.id
      WHERE a.prova_id=?
      GROUP BY a.id,a.titulo,a.status
      ORDER BY a.id
    `,[p.id]);
    out.push({...p,aplicacoes:apps});
  }
  const [aval]=await db.execute(`
    SELECT id,usuario_id usuarioId,arquivo_origem_nome nome,arquivo_origem_url url
    FROM avaliacoes
    WHERE (LOWER(COALESCE(arquivo_origem_nome,'')) LIKE '%prova%'
       OR LOWER(COALESCE(arquivo_origem_nome,'')) LIKE '%certifica%')
    ORDER BY id DESC LIMIT 200
  `);
  console.log("LINK_AUDIT="+JSON.stringify({provas:out,avaliacoesComArquivo:aval.slice(0,50),totalAvaliacoesComArquivo:aval.length}));
 }finally{await db.end();}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
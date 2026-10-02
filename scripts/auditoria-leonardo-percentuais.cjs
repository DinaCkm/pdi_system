const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [users]=await db.execute(`
    SELECT u.id,u.name,u.email,u.status,u.cargo,u.departamentoId,d.nome unidade
      FROM users u
      LEFT JOIN departamentos d ON d.id=u.departamentoId
     WHERE LOWER(u.name) LIKE '%leonardo campelo leite guedes%'
        OR LOWER(u.email) LIKE '%leonardo%'
     ORDER BY u.id`);
  console.log("[LEONARDO_USER] "+JSON.stringify(users));
  for(const u of users){
    const id=Number(u.id);
    const [matrix]=await db.execute(`
      SELECT m.id matrizId,m.status matrizStatus,m.fonte,m.observacao,
             e.id eixoRegistroId,e.eixo_id eixoId,e.eixo_nome eixoNome,e.relacao,
             e.status_classificacao statusClassificacao,e.justificativa,
             e.percentual_anterior percentualAnterior
        FROM prova_utic_matrizes m
        LEFT JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
       WHERE m.colaborador_id=?
       ORDER BY e.id`,[id]);
    console.log("[LEONARDO_MATRIZ] "+JSON.stringify(matrix));

    const [genericResults]=await db.execute(`
      SELECT rp.id resultadoId,rp.aplicacao_id aplicacaoId,rp.tentativa_id tentativaId,
             rp.percentual_geral percentualGeral,rp.resultado_json resultadoJson,rp.calculado_em calculadoEm,
             a.titulo aplicacaoTitulo,a.status aplicacaoStatus,a.prova_id provaId
        FROM resultados_proficiencia rp
        JOIN aplicacoes_proficiencia a ON a.id=rp.aplicacao_id
       WHERE rp.colaborador_id=?
       ORDER BY rp.calculado_em DESC,rp.id DESC`,[id]);
    const genericSummary=genericResults.map(r=>{
      let parsed={}; try{parsed=JSON.parse(r.resultadoJson||"{}")}catch{}
      return {
        resultadoId:r.resultadoId,aplicacaoId:r.aplicacaoId,tentativaId:r.tentativaId,
        percentualGeral:r.percentualGeral,calculadoEm:r.calculadoEm,
        aplicacaoTitulo:r.aplicacaoTitulo,aplicacaoStatus:r.aplicacaoStatus,provaId:r.provaId,
        porEixo:(parsed.porEixo||[]).map(e=>({eixoId:e.eixoId||null,eixo:e.eixo||null,totalQuestoes:e.totalQuestoes,acertos:e.acertos,percentualAtual:e.percentualAtual,linhaBase:e.linhaBase??null,relacao:e.relacao??null}))
      };
    });
    console.log("[LEONARDO_RESULTADOS_GENERICOS] "+JSON.stringify(genericSummary));

    const [apps]=await db.execute(`
      SELECT ap.id participanteId,ap.aplicacao_id aplicacaoId,a.titulo,a.status aplicacaoStatus,a.prova_id provaId,
             t.id tentativaId,t.status tentativaStatus,t.iniciada_em iniciadaEm,t.finalizada_em finalizadaEm
        FROM aplicacoes_proficiencia_participantes ap
        JOIN aplicacoes_proficiencia a ON a.id=ap.aplicacao_id
        LEFT JOIN tentativas_proficiencia t ON t.aplicacao_id=ap.aplicacao_id AND t.colaborador_id=ap.colaborador_id
       WHERE ap.colaborador_id=?
       ORDER BY ap.id DESC`,[id]);
    console.log("[LEONARDO_APLICACOES] "+JSON.stringify(apps));

    const [oldAttempts]=await db.execute(`
      SELECT t.id,t.status,t.started_at startedAt,t.finished_at finishedAt,
             (SELECT COUNT(*) FROM prova_utic_respostas r WHERE r.tentativa_id=t.id) totalRespostas
        FROM prova_utic_tentativas t
       WHERE t.colaborador_id=?
       ORDER BY t.id DESC`,[id]);
    console.log("[LEONARDO_UTIC_TENTATIVAS] "+JSON.stringify(oldAttempts));

    const [hist]=await db.execute(`
      SELECT h.id,h.eixo_id eixoId,h.valor_anterior valorAnterior,h.valor_novo valorNovo,
             h.motivo,h.observacao,h.created_at createdAt,usr.name alteradoPor
        FROM prova_utic_matriz_historico h
        JOIN prova_utic_matrizes m ON m.id=h.matriz_id
        LEFT JOIN users usr ON usr.id=h.alterado_por
       WHERE m.colaborador_id=?
       ORDER BY h.id DESC
       LIMIT 200`,[id]);
    console.log("[LEONARDO_HISTORICO] "+JSON.stringify(hist));
  }
 }finally{await db.end();}
}
main().catch(e=>{console.error("[LEONARDO_ERROR]",e);process.exit(1);});

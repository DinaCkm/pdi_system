const mysql=require("mysql2/promise");

function norm(v){
  return String(v??"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/\s+/g," ").trim();
}
function extrairQuestoes(just){
  const s=String(just??"");
  const m=s.match(/Quest(?:õ|o)es da prova individual:\s*([^\n.]+)/i);
  if(!m) return null;
  const nums=(m[1].match(/\d+/g)||[]).map(Number);
  return nums.length ? nums.join(",") : null;
}
function extrairAcertosTotal(just){
  const s=String(just??"");
  const m=s.match(/(\d+)\s+acertos?\s+em\s+(\d+)\s+quest(?:õ|o)es/i);
  return m ? {acertos:Number(m[1]),total:Number(m[2])} : null;
}

async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute(`
    SELECT m.id matrizId,m.status matrizStatus,m.fonte,
           u.id colaboradorId,u.name colaboradorNome,u.email,u.status colaboradorStatus,u.cargo,
           d.nome unidade,
           e.id eixoRegistroId,e.eixo_id eixoId,e.eixo_nome eixoNome,e.relacao,
           e.status_classificacao statusClassificacao,e.justificativa,
           e.percentual_anterior percentualAnterior
      FROM prova_utic_matrizes m
      JOIN users u ON u.id=m.colaborador_id
      LEFT JOIN departamentos d ON d.id=u.departamentoId
      LEFT JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
     ORDER BY COALESCE(d.nome,''),u.name,e.id`);

  const mats=new Map();
  for(const r of rows){
    if(!mats.has(r.matrizId)) mats.set(r.matrizId,{
      matrizId:r.matrizId,status:r.matrizStatus,fonte:r.fonte,
      colaboradorId:r.colaboradorId,nome:r.colaboradorNome,email:r.email,
      colaboradorStatus:r.colaboradorStatus,cargo:r.cargo,unidade:r.unidade,eixos:[]
    });
    if(r.eixoRegistroId){
      const qt=extrairQuestoes(r.justificativa);
      const at=extrairAcertosTotal(r.justificativa);
      mats.get(r.matrizId).eixos.push({
        id:r.eixoRegistroId,eixoId:r.eixoId,nome:r.eixoNome,relacao:r.relacao,
        status:r.statusClassificacao,
        anterior:r.percentualAnterior===null?null:Number(r.percentualAnterior),
        justificativa:r.justificativa||null,
        questoesHistoricas:qt,
        acertosHistoricos:at
      });
    }
  }

  const analises=[];
  for(const m of mats.values()){
    const gruposEvidencia=new Map();
    for(const e of m.eixos){
      if(!e.questoesHistoricas) continue;
      const chave=e.questoesHistoricas+"|"+(e.anterior===null?"NULL":e.anterior);
      if(!gruposEvidencia.has(chave)) gruposEvidencia.set(chave,[]);
      gruposEvidencia.get(chave).push(e);
    }
    const duplicacoes=[...gruposEvidencia.entries()]
      .filter(([,arr])=>arr.length>1)
      .map(([chave,arr])=>({
        chave,
        totalEixos:arr.length,
        eixos:arr.map(e=>({id:e.eixoId,nome:e.nome,relacao:e.relacao,anterior:e.anterior,questoes:e.questoesHistoricas}))
      }));

    const gruposJust=new Map();
    for(const e of m.eixos){
      const j=norm(e.justificativa);
      if(!j) continue;
      if(!gruposJust.has(j)) gruposJust.set(j,[]);
      gruposJust.get(j).push(e);
    }
    const justificativasDuplicadas=[...gruposJust.values()]
      .filter(arr=>arr.length>1)
      .map(arr=>arr.map(e=>({id:e.eixoId,nome:e.nome,anterior:e.anterior})));

    const nulos=m.eixos.filter(e=>e.anterior===null);
    const eixosGerados=m.eixos.filter(e=>String(e.eixoId||"").startsWith("EIXO_"));
    analises.push({
      matrizId:m.matrizId,colaboradorId:m.colaboradorId,nome:m.nome,email:m.email,
      unidade:m.unidade,cargo:m.cargo,status:m.status,
      totalEixos:m.eixos.length,
      totalEixosGerados:eixosGerados.length,
      totalPercentuaisNulos:nulos.length,
      percentuaisNulos:nulos.map(e=>({id:e.eixoId,nome:e.nome,relacao:e.relacao})),
      duplicacoesPorMesmasQuestoesEPercentual:duplicacoes,
      justificativasExatamenteDuplicadas:justificativasDuplicadas
    });
  }

  const afetadosDuplicacao=analises.filter(a=>a.duplicacoesPorMesmasQuestoesEPercentual.length>0);
  const afetadosGerados=analises.filter(a=>a.totalEixosGerados>0);
  const afetadosNulos=analises.filter(a=>a.totalPercentuaisNulos>0);
  const maisDe10=analises.filter(a=>a.totalEixos>10);

  const porUnidade={};
  for(const a of analises){
    const k=a.unidade||"(sem unidade)";
    if(!porUnidade[k]) porUnidade[k]={matrizes:0,comDuplicacao:0,comEixosGerados:0,comPercentualNulo:0,maisDe10Eixos:0,totalEixos:0};
    const x=porUnidade[k]; x.matrizes++; x.totalEixos+=a.totalEixos;
    if(a.duplicacoesPorMesmasQuestoesEPercentual.length)x.comDuplicacao++;
    if(a.totalEixosGerados)x.comEixosGerados++;
    if(a.totalPercentuaisNulos)x.comPercentualNulo++;
    if(a.totalEixos>10)x.maisDe10Eixos++;
  }
  for(const x of Object.values(porUnidade)) x.mediaEixos=Number((x.totalEixos/x.matrizes).toFixed(1));

  console.log("[AUDIT_GLOBAL_RESUMO] "+JSON.stringify({
    totalMatrizes:analises.length,
    totalComDuplicacaoEvidencia:afetadosDuplicacao.length,
    totalComEixosGerados:afetadosGerados.length,
    totalComPercentualNulo:afetadosNulos.length,
    totalComMaisDe10Eixos:maisDe10.length,
    porUnidade
  }));

  console.log("[AUDIT_GLOBAL_AFETADOS] "+JSON.stringify(
    analises.filter(a=>
      a.duplicacoesPorMesmasQuestoesEPercentual.length||
      a.totalEixosGerados>0||
      a.totalPercentuaisNulos>0||
      a.totalEixos>10
    ).map(a=>({
      nome:a.nome,unidade:a.unidade,totalEixos:a.totalEixos,
      totalEixosGerados:a.totalEixosGerados,totalPercentuaisNulos:a.totalPercentuaisNulos,
      percentuaisNulos:a.percentuaisNulos,
      duplicacoes:a.duplicacoesPorMesmasQuestoesEPercentual
    }))
  ));
 }finally{await db.end();}
}
main().catch(e=>{console.error("[AUDIT_GLOBAL_ERROR]",e);process.exit(1);});

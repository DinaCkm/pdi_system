const mysql=require("mysql2/promise");
const ANO=2025;
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
const REGIONAIS=["bico do papagaio","metropolitana","medio norte","norte colinas","regional norte","portal do jalapao","serras gerais","regional sul","vale do araguaia"];
function regionalOk(v){const n=norm(v);return REGIONAIS.some(r=>n.includes(r)||r.includes(n))}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [qs]=await db.execute(`SELECT q.id questionarioId,q.colaborador_id colaboradorId,q.versao,u.name,u.email,d.nome departamentoNome FROM questionarios_atividades_funcao q JOIN users u ON u.id=q.colaborador_id LEFT JOIN departamentos d ON d.id=u.departamentoId WHERE q.ano=? ORDER BY q.colaborador_id,q.versao DESC,q.id DESC`,[ANO]);
  const latest=new Map();for(const q of qs)if(!latest.has(+q.colaboradorId)&&regionalOk(q.departamentoNome))latest.set(+q.colaboradorId,q);
  const result=[];const pend=[];
  for(const q of latest.values()){
    const [cls]=await db.execute(`SELECT eixo_nome eixoNome,classificacao,status_classificacao status,justificativa FROM questionario_atividades_eixos_tecnicos WHERE questionario_id=? AND origem_prova='PROVA_HISTORICA' ORDER BY eixo_nome`,[q.questionarioId]);
    const [hist]=await db.execute(`SELECT eixo_nome eixoNome,percentual_original percentual,status,fonte FROM registro_historico_proficiencia_eixos WHERE colaborador_id=? ORDER BY eixo_nome`,[q.colaboradorId]);
    const classificados=cls.filter(x=>x.status==="CLASSIFICADO"&&x.classificacao).length;
    const pendentesClass=cls.filter(x=>x.status!=="CLASSIFICADO"||!x.classificacao).length;
    const histPend=hist.filter(x=>x.status==="PENDENTE_VALIDACAO"||x.percentual===null).length;
    const item={regional:q.departamentoNome,empregado:q.name,email:q.email,questionarioId:+q.questionarioId,eixosRegistrados:cls.length,classificados,pendentesClassificacao:pendentesClass,registrosHistoricos:hist.length,indicadoresHistoricosPendentes:histPend};
    result.push(item);
    if(classificados<11) pend.push({...item,motivo:cls.length===0?"Nenhuma classificação histórica registrada.":`Somente ${classificados} de 11 eixos estão classificados.`});
    if(hist.length<11||histPend>0) pend.push({...item,motivo:`Indicador histórico incompleto: ${hist.length} registros, ${histPend} pendente(s) de validação.`});
  }
  console.log("AUDIT="+JSON.stringify({totalQuestionariosRegionais:latest.size,totalEmpregadosAuditados:result.length,totalPendencias:pend.length,resultado:result,pendencias:pend}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});

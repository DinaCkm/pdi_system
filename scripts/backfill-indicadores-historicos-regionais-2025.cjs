const mysql=require("mysql2/promise");
const ANO=2025;
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
const REGIONAIS=["bico do papagaio","metropolitana","medio norte","norte colinas","regional norte","portal do jalapao","serras gerais","regional sul","vale do araguaia"];
function regionalOk(v){const n=norm(v);return REGIONAIS.some(r=>n.includes(r)||r.includes(n))}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 const pend=[],done=[];
 try{
  const [qs]=await db.execute(`SELECT q.id questionarioId,q.colaborador_id colaboradorId,u.name,u.email,d.nome departamentoNome
    FROM questionarios_atividades_funcao q JOIN users u ON u.id=q.colaborador_id
    LEFT JOIN departamentos d ON d.id=u.departamentoId
    WHERE q.ano=? ORDER BY q.colaborador_id,q.versao DESC,q.id DESC`,[ANO]);
  const latest=new Map();for(const q of qs)if(!latest.has(+q.colaboradorId)&&regionalOk(q.departamentoNome))latest.set(+q.colaboradorId,q);
  for(const q of latest.values()){
    const [hist]=await db.execute(`SELECT h.id,h.prova_historica_id provaId,h.eixo_chave eixoChave,h.eixo_nome eixoNome,h.percentual_original percentual,h.status
      FROM registro_historico_proficiencia_eixos h
      WHERE h.colaborador_id=? ORDER BY h.prova_historica_id,h.id`,[q.colaboradorId]);
    if(!hist.length) continue;
    const [leg]=await db.execute(`SELECT e.eixo_nome eixoNome,e.percentual_anterior percentual
      FROM prova_utic_matrizes m JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
      WHERE m.colaborador_id=?`,[q.colaboradorId]);
    const map=new Map();
    for(const x of leg){
      const k=norm(x.eixoNome); if(!k)continue;
      const v=x.percentual==null?null:Number(x.percentual);
      if(!map.has(k))map.set(k,[]);
      map.get(k).push(v);
    }
    for(const h of hist){
      if(h.percentual!==null&&h.percentual!==undefined){done.push({empregado:q.name,eixo:h.eixoNome,percentual:Number(h.percentual),acao:"ja_registrado"});continue}
      const vals=(map.get(norm(h.eixoNome))||[]).filter(v=>v!==null&&!Number.isNaN(v));
      const un=[...new Set(vals.map(v=>Number(v).toFixed(4)))].map(Number);
      if(un.length===1){
        await db.execute(`UPDATE registro_historico_proficiencia_eixos
          SET percentual_original=?,status='REGISTRADO',fonte='Indicador original preservado de prova_utic_matriz_eixos.percentual_anterior.'
          WHERE id=?`,[un[0],h.id]);
        done.push({empregado:q.name,eixo:h.eixoNome,percentual:un[0],acao:"preservado_legado"});
      }else if(un.length>1){
        pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,eixo:h.eixoNome,motivo:"Mais de um percentual histórico diferente encontrado para o mesmo eixo; não sobrescrito.",valores:un});
      }else{
        pend.push({regional:q.departamentoNome,empregado:q.name,email:q.email,eixo:h.eixoNome,motivo:"Indicador histórico original não localizado por correspondência exata no registro legado."});
      }
    }
  }
  console.log("BACKFILL="+JSON.stringify({empregadosRegionais:latest.size,registrosResolvidos:done.filter(x=>x.acao==="preservado_legado").length,jaRegistrados:done.filter(x=>x.acao==="ja_registrado").length,pendencias:pend.length,pendenciasDetalhadas:pend}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
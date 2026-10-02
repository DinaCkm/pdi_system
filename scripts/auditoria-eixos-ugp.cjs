const mysql = require("mysql2/promise");

function norm(v) {
  return String(v ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lev(a,b){
  a=norm(a); b=norm(b);
  const m=a.length,n=b.length;
  if(!m) return n; if(!n) return m;
  const prev=Array.from({length:n+1},(_,j)=>j), cur=new Array(n+1);
  for(let i=1;i<=m;i++){
    cur[0]=i;
    for(let j=1;j<=n;j++){
      cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    for(let j=0;j<=n;j++) prev[j]=cur[j];
  }
  return prev[n];
}
function sim(a,b){
  const A=norm(a),B=norm(b), max=Math.max(A.length,B.length);
  return max?1-lev(A,B)/max:1;
}
function eixoNome(e){
  if(e==null) return "";
  if(typeof e==="string") return e.trim();
  return String(e.nome ?? e.eixo ?? "").trim();
}
function unique(arr){ return Array.from(new Set(arr)); }

async function main(){
  if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
  const db=await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [deps]=await db.execute(
      "SELECT id,nome FROM departamentos WHERE LOWER(nome) LIKE '%ugp%' OR LOWER(nome) LIKE '%gestao de pessoas%' OR LOWER(nome) LIKE '%gestão de pessoas%' ORDER BY nome"
    );
    console.log("[UGP_AUDIT] DEPARTAMENTOS",JSON.stringify(deps));

    const [provas]=await db.execute(
      "SELECT id,codigo,nome,unidade,ano,status,total_questoes AS totalQuestoes,arquivo_nome AS arquivoNome,questoes_json AS questoesJson FROM provas_importadas WHERE LOWER(unidade) LIKE '%ugp%' OR LOWER(codigo) LIKE '%ugp%' OR LOWER(nome) LIKE '%ugp%' OR LOWER(arquivo_nome) LIKE '%ugp%' OR LOWER(unidade) LIKE '%gestao de pessoas%' OR LOWER(unidade) LIKE '%gestão de pessoas%' OR LOWER(nome) LIKE '%gestao de pessoas%' OR LOWER(nome) LIKE '%gestão de pessoas%' ORDER BY ano DESC,id DESC"
    );

    const provaResumo=[];
    const atuaisSet=new Map();
    for(const p of provas){
      let qs=[];
      try { qs=JSON.parse(p.questoesJson||"[]"); } catch {}
      const axisMap=new Map();
      const dist={zero:0,um:0,dois:0,maisDeDois:0};
      qs.forEach((q,idx)=>{
        const nomes=unique((Array.isArray(q.eixos)?q.eixos:[]).map(eixoNome).filter(Boolean));
        if(nomes.length===0) dist.zero++;
        else if(nomes.length===1) dist.um++;
        else if(nomes.length===2) dist.dois++;
        else dist.maisDeDois++;
        for(const nome of nomes){
          const k=norm(nome);
          const it=axisMap.get(k)||{nome,questoes:[]};
          it.questoes.push({numero:idx+1,id:String(q.id??"")});
          axisMap.set(k,it);
          if(!atuaisSet.has(k)) atuaisSet.set(k,nome);
        }
      });
      const axes=Array.from(axisMap.values())
        .map(x=>({eixo:x.nome,totalQuestoes:x.questoes.length,questoes:x.questoes}))
        .sort((a,b)=>b.totalQuestoes-a.totalQuestoes || a.eixo.localeCompare(b.eixo,"pt-BR"));
      provaResumo.push({
        id:Number(p.id),codigo:p.codigo,nome:p.nome,unidade:p.unidade,ano:Number(p.ano),
        status:p.status,totalQuestoesDeclarado:Number(p.totalQuestoes),totalQuestoesJson:qs.length,
        arquivoNome:p.arquivoNome,totalEixosDistintos:axes.length,
        distribuicaoEixosPorQuestao:dist,eixos:axes
      });
    }
    console.log("[UGP_AUDIT] PROVAS",JSON.stringify(provaResumo));

    const depIds=deps.map(d=>Number(d.id)).filter(Number.isFinite);
    let histRows=[];
    let usuarios=[];
    if(depIds.length){
      const placeholders=depIds.map(()=>"?").join(",");
      const [u]=await db.execute(
        "SELECT u.id,u.name,u.email,u.status,u.cargo,u.departamentoId,d.nome AS unidade FROM users u LEFT JOIN departamentos d ON d.id=u.departamentoId WHERE u.departamentoId IN ("+placeholders+") ORDER BY u.name",
        depIds
      );
      usuarios=u;
      const [h]=await db.execute(
        "SELECT m.id AS matrizId,m.colaborador_id AS colaboradorId,u.name AS colaboradorNome,u.status AS usuarioStatus,d.nome AS unidade,m.status AS matrizStatus,m.fonte,e.eixo_id AS eixoId,e.eixo_nome AS eixoNome,e.percentual_anterior AS percentualAnterior,e.relacao,e.status_classificacao AS statusClassificacao FROM prova_utic_matrizes m JOIN users u ON u.id=m.colaborador_id LEFT JOIN departamentos d ON d.id=u.departamentoId JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id WHERE u.departamentoId IN ("+placeholders+") ORDER BY u.name,e.eixo_nome",
        depIds
      );
      histRows=h;
    }
    console.log("[UGP_AUDIT] USUARIOS_UGP",JSON.stringify(usuarios.map(u=>({id:Number(u.id),nome:u.name,email:u.email,status:u.status,cargo:u.cargo,unidade:u.unidade}))));

    const histMap=new Map();
    for(const r of histRows){
      const nome=String(r.eixoNome??"").trim(); if(!nome) continue;
      const k=norm(nome);
      const it=histMap.get(k)||{eixo:nome,empregados:new Set(),comPercentual:new Set(),percentuais:[],matrizStatus:new Set(),fontes:new Set()};
      it.empregados.add(String(r.colaboradorId));
      if(r.percentualAnterior!==null && r.percentualAnterior!==undefined){
        it.comPercentual.add(String(r.colaboradorId));
        it.percentuais.push(Number(r.percentualAnterior));
      }
      if(r.matrizStatus) it.matrizStatus.add(String(r.matrizStatus));
      if(r.fonte) it.fontes.add(String(r.fonte));
      histMap.set(k,it);
    }
    const historicos=Array.from(histMap.values()).map(x=>({
      eixo:x.eixo,
      empregados:x.empregados.size,
      empregadosComPercentual:x.comPercentual.size,
      menorPercentual:x.percentuais.length?Math.min(...x.percentuais):null,
      maiorPercentual:x.percentuais.length?Math.max(...x.percentuais):null,
      statusMatrizes:Array.from(x.matrizStatus),
      fontes:Array.from(x.fontes).slice(0,5)
    })).sort((a,b)=>a.eixo.localeCompare(b.eixo,"pt-BR"));
    console.log("[UGP_AUDIT] EIXOS_HISTORICOS",JSON.stringify(historicos));

    const current=Array.from(atuaisSet.entries()).map(([k,nome])=>({k,nome}));
    const hist=Array.from(histMap.entries()).map(([k,v])=>({k,nome:v.eixo}));

    const exact=current.filter(c=>histMap.has(c.k)).map(c=>c.nome);
    const somenteAtual=current.filter(c=>!histMap.has(c.k)).map(c=>c.nome);
    const somenteHist=hist.filter(h=>!atuaisSet.has(h.k)).map(h=>h.nome);
    const proximos=[];
    for(const ca of somenteAtual){
      let best=null;
      for(const hb of somenteHist){
        const s=sim(ca,hb);
        if(!best||s>best.sim) best={atual:ca,historico:hb,sim:s};
      }
      if(best && best.sim>=0.62) proximos.push({...best,similaridade:Number(best.sim.toFixed(3))});
    }
    proximos.sort((a,b)=>b.similaridade-a.similaridade);

    const singleton=[];
    for(const p of provaResumo){
      for(const e of p.eixos){
        if(e.totalQuestoes===1) singleton.push({prova:p.codigo,eixo:e.eixo,questao:e.questoes[0]});
      }
    }

    console.log("[UGP_AUDIT] COMPARACAO",JSON.stringify({
      totalEixosAtuais:current.length,
      totalEixosHistoricos:hist.length,
      correspondenciasExatas:exact,
      somenteNaProvaAtual:somenteAtual,
      somenteNoHistorico:somenteHist,
      candidatosNomenclaturaSemelhante:proximos,
      eixosAtuaisMedidosPorUmaUnicaQuestao:singleton
    }));
  } finally { await db.end(); }
}

main().catch(e=>{ console.error("[UGP_AUDIT] ERROR",e); process.exit(1); });

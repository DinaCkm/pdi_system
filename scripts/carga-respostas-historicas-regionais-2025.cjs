const mysql=require("mysql2/promise");
const zlib=require("zlib");
const APPLY=process.argv.includes("--apply");
const SOURCE="gabarito_empregados.xlsx + gabarito/eixo da prova historica cadastrada no PDI-System";
const DATA=JSON.parse(zlib.gunzipSync(Buffer.from("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","base64")).toString("utf8"));
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function axisKey(v){return norm(v).replace(/\s+/g,"-")}
const REG={
 "regional bico do papagaio":"RBP",
 "regional metropolitana":"RME",
 "regional vale do araguaia":"RVA",
 "regional portal do jalapao":"RPJ",
 "regional norte":"RNO",
 "regional medio norte colinas":"RMN",
 "regional serras gerais":"RSG",
 "regional sul":"RSU"
};
const ALIAS={"vandebergue araujo silva jr":"vandebergue araujo silva junior"};
function qNumber(q,i){const v=Number(q?.numero??q?.numeroQuestao??q?.ordem??q?.id);return Number.isFinite(v)&&v>=1&&v<=65?v:i+1}
function answerKey(q){return String(q?.gabarito??q?.respostaCorreta??q?.correta??"").trim().toUpperCase()}
function axisName(q){
 const e=q?.eixos;
 if(Array.isArray(e)){
   const names=e.map(x=>typeof x==="string"?x:x?.nome).filter(Boolean).map(String);
   if(names.length===1)return names[0].trim();
   if(names.length>1)throw new Error("Questao com mais de um eixo: "+JSON.stringify(names));
 }
 const x=q?.eixo;
 if(typeof x==="string"&&x.trim())return x.trim();
 if(x?.nome)return String(x.nome).trim();
 throw new Error("Questao sem eixo tecnico.");
}
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL ausente");
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 const pend=[];const ok=[];
 try{
  if(APPLY){
   await db.execute(`CREATE TABLE IF NOT EXISTS registro_historico_proficiencia_respostas (
    id INT NOT NULL AUTO_INCREMENT,
    colaborador_id INT NOT NULL,
    prova_historica_id INT NOT NULL,
    questao_chave VARCHAR(50) NOT NULL,
    numero_questao INT NOT NULL,
    eixo_chave VARCHAR(255) NOT NULL,
    eixo_nome VARCHAR(255) NOT NULL,
    resposta_marcada VARCHAR(10) NULL,
    gabarito VARCHAR(10) NOT NULL,
    resultado ENUM('CERTO','ERRADO','NAO_RESPONDEU') NOT NULL,
    fonte TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY registro_historico_resposta_unique_idx (colaborador_id,prova_historica_id,questao_chave),
    KEY registro_historico_resposta_colaborador_idx (colaborador_id),
    KEY registro_historico_resposta_prova_idx (prova_historica_id),
    KEY registro_historico_resposta_eixo_idx (eixo_chave),
    KEY registro_historico_resposta_resultado_idx (resultado),
    CONSTRAINT registro_historico_resposta_colaborador_fk FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  const [users]=await db.execute("SELECT id,name,email,status FROM users");
  const byName=new Map();
  for(const u of users){const k=norm(u.name);if(!byName.has(k))byName.set(k,[]);byName.get(k).push(u)}
  const [proofs]=await db.execute("SELECT id,codigo,unidade,questoes_json questoesJson FROM provas_importadas WHERE ano=2025 AND codigo LIKE 'REGIONAIS%HIST%'");
  const proofByCode=new Map(proofs.map(p=>[String(p.codigo||"").toUpperCase(),p]));
  for(const d of DATA){
    try{
      const unit=norm(d.unidade),abbr=REG[unit];if(!abbr)throw new Error("Regional sem codigo conhecido: "+d.unidade);
      const proof=[...proofByCode.values()].find(p=>String(p.codigo||"").toUpperCase().includes("_"+abbr+"_HIST"));
      if(!proof)throw new Error("Prova historica nao localizada para "+d.unidade);
      const nameKey=ALIAS[norm(d.nome)]||norm(d.nome);
      const matches=byName.get(nameKey)||[];
      if(matches.length!==1)throw new Error("Correspondencia de usuario nao unica: "+matches.length);
      const user=matches[0];
      if(!Array.isArray(d.respostas)||d.respostas.length!==65)throw new Error("Quantidade de respostas diferente de 65.");
      let qs=typeof proof.questoesJson==="string"?JSON.parse(proof.questoesJson):proof.questoesJson;
      if(!Array.isArray(qs)||qs.length!==65)throw new Error("Prova historica nao possui 65 questoes.");
      qs=qs.map((q,i)=>({q,n:qNumber(q,i),i})).sort((a,b)=>a.n-b.n);
      const axes=new Map();const rows=[];let hits=0;
      for(let i=0;i<65;i++){
        const q=qs[i].q,n=qs[i].n;
        const gab=answerKey(q);if(!gab)throw new Error("Questao "+n+" sem gabarito.");
        const eixo=axisName(q),ek=axisKey(eixo);const resp=d.respostas[i]==null?"":String(d.respostas[i]).trim().toUpperCase();
        const result=!resp?"NAO_RESPONDEU":resp===gab?"CERTO":"ERRADO";if(result==="CERTO")hits++;
        if(!axes.has(ek))axes.set(ek,{nome:eixo,total:0,acertos:0,naoRespondidas:0});
        const a=axes.get(ek);a.total++;if(result==="CERTO")a.acertos++;if(result==="NAO_RESPONDEU")a.naoRespondidas++;
        rows.push({n,eixo,ek,resp:resp||null,gab,result});
      }
      if(axes.size!==11)throw new Error("A prova historica resultou em "+axes.size+" eixos; esperado: 11.");
      if(Number(d.acertos)!==hits)throw new Error("Acertos recalculados ("+hits+") divergem da planilha ("+d.acertos+").");
      if(APPLY){
        await db.beginTransaction();
        try{
          for(const r of rows){
            await db.execute(`INSERT INTO registro_historico_proficiencia_respostas
              (colaborador_id,prova_historica_id,questao_chave,numero_questao,eixo_chave,eixo_nome,resposta_marcada,gabarito,resultado,fonte)
              VALUES (?,?,?,?,?,?,?,?,?,?)
              ON DUPLICATE KEY UPDATE numero_questao=VALUES(numero_questao),eixo_chave=VALUES(eixo_chave),eixo_nome=VALUES(eixo_nome),
                resposta_marcada=VALUES(resposta_marcada),gabarito=VALUES(gabarito),resultado=VALUES(resultado),fonte=VALUES(fonte)`,
              [user.id,proof.id,"Q"+String(r.n).padStart(2,"0"),r.n,r.ek,r.eixo,r.resp,r.gab,r.result,SOURCE]);
          }
          for(const [ek,a] of axes){
            const pct=Number(((a.acertos/a.total)*100).toFixed(2));
            await db.execute(`INSERT INTO registro_historico_proficiencia_eixos
              (colaborador_id,prova_historica_id,eixo_chave,eixo_nome,percentual_original,acertos_original,total_questoes_original,nao_sei_original,status,fonte)
              VALUES (?,?,?,?,?,?,?,NULL,'REGISTRADO',?)
              ON DUPLICATE KEY UPDATE eixo_nome=VALUES(eixo_nome),percentual_original=VALUES(percentual_original),
                acertos_original=VALUES(acertos_original),total_questoes_original=VALUES(total_questoes_original),
                nao_sei_original=NULL,status='REGISTRADO',fonte=VALUES(fonte)`,
              [user.id,proof.id,ek,a.nome,pct,a.acertos,a.total,"Recalculado das respostas historicas questao a questao; eixo e gabarito lidos da prova historica do PDI-System."]);
          }
          await db.commit();
        }catch(e){await db.rollback();throw e}
      }
      ok.push({empregado:d.nome,userId:user.id,prova:proof.codigo,acertos:hits,eixos:axes.size,naoRespondidas:d.respostas.filter(x=>x==null||x==="").length});
    }catch(e){pend.push({empregado:d.nome,regional:d.unidade,motivo:e.message})}
  }
  console.log("HIST_LOAD="+JSON.stringify({apply:APPLY,total:DATA.length,ok:ok.length,pendencias:pend.length,pendenciasDetalhadas:pend,amostra:ok.slice(0,5)}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
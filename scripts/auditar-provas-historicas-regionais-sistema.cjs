const mysql=require("mysql2/promise");
function rows(x){return Array.isArray(x?.[0])?x[0]:Array.isArray(x)?x:[]}
function pick(obj,keys){const o={};for(const k of keys)if(obj&&Object.prototype.hasOwnProperty.call(obj,k))o[k]=obj[k];return o}
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [provas]=await db.execute(`
    SELECT id,codigo,nome,unidade,ano,total_questoes AS totalQuestoes,status,questoes_json AS questoesJson
      FROM provas_importadas
     WHERE ano=2025 AND codigo LIKE 'REGIONAIS%HIST%'
     ORDER BY codigo
  `);
  const resumo=[];
  for(const p of provas){
    let q=[];try{q=JSON.parse(p.questoesJson||"[]")}catch{}
    const sample=q[0]||{};
    resumo.push({
      id:p.id,codigo:p.codigo,unidade:p.unidade,totalQuestoes:p.totalQuestoes,status:p.status,
      camposQuestao:Object.keys(sample),
      exemploQuestao:pick(sample,["id","numero","enunciado","eixo","eixos","gabarito","correta","respostaCorreta","resposta","acertou","pontuacao"])
    });
  }
  const [tabs]=await db.execute(`
    SELECT TABLE_NAME AS tabela,GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') AS colunas
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE()
       AND (
         LOWER(COLUMN_NAME) IN ('prova_id','prova_historica_id','questao_id','questao_chave','colaborador_id','usuario_id','empregado_id','resposta','acertou','correta','pontuacao')
         OR LOWER(TABLE_NAME) LIKE '%prova%'
         OR LOWER(TABLE_NAME) LIKE '%respost%'
         OR LOWER(TABLE_NAME) LIKE '%resultado%'
       )
     GROUP BY TABLE_NAME
     ORDER BY TABLE_NAME
  `);
  console.log("SYSTEM_PROOFS="+JSON.stringify({provas:resumo,tabelas:tabs}));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});
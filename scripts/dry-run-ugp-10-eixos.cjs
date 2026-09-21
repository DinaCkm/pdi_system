const mysql=require("mysql2/promise");
const eixos={
"E01":"Legislação Trabalhista, Normas e Conformidade",
"E02":"Ética, Integridade e Responsabilidade",
"E03":"Gestão de Processos e Governança Documental",
"E04":"Comunicação, Atendimento e Relacionamento",
"E05":"Estratégia, Planejamento e Inovação",
"E06":"Dados, Indicadores e People Analytics",
"E07":"Gestão de Pessoas e Desempenho",
"E08":"Cultura, Clima, Diversidade e Inclusão",
"E09":"Desenvolvimento, Liderança e Capacitação",
"E10":"Carreira, Sucessão e PDI"
};
const grupos={
E01:[1,2,3,4,7,9],
E02:[5,18,22,27,54],
E03:[10,23,24,41,42,43],
E04:[6,16,20,25,26,29,60],
E05:[17,19,21,49,50,51,52,53,55,56,58],
E06:[13,31,47,48],
E07:[11,34,35,36,37,38,39,40],
E08:[8,14,15],
E09:[33,44,45,46,57],
E10:[12,28,30,32,59]
};
const porQuestao={};
for(const [cod,nums] of Object.entries(grupos)) for(const n of nums) porQuestao[n]=cod;
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute("SELECT id,codigo,nome,unidade,status,total_questoes totalQuestoes,questoes_json questoesJson FROM provas_importadas WHERE codigo='PROVA-UGP-2026' LIMIT 1");
  const p=rows[0]; if(!p) throw new Error("Prova UGP nao encontrada");
  const qs=JSON.parse(p.questoesJson||"[]");
  const numeros=qs.map((_,i)=>i+1);
  const semMapa=numeros.filter(n=>!porQuestao[n]);
  const repetidos=[];
  const seen=new Set();
  for(const nums of Object.values(grupos)) for(const n of nums){if(seen.has(n))repetidos.push(n);seen.add(n);}
  const fora=Object.values(grupos).flat().filter(n=>n<1||n>qs.length);
  const distribuicao=Object.entries(grupos).map(([cod,nums])=>({codigo:"UGP-"+cod,nome:eixos[cod],questoes:nums,total:nums.length}));
  const linhas=qs.map((q,i)=>({
    questao:i+1,
    eixoCodigo:"UGP-"+porQuestao[i+1],
    eixoNome:eixos[porQuestao[i+1]],
    macroareaAntiga:q.macroarea||null,
    microareaAntiga:q.microarea||null,
    eixosAtuais:(q.eixos||[]).map(e=>e.nome||e)
  }));
  console.log("[UGP_10EIXOS_DRYRUN_RESUMO] "+JSON.stringify({
    prova:{id:p.id,codigo:p.codigo,status:p.status,totalQuestoes:p.totalQuestoes,totalJson:qs.length},
    totalMapeadas:seen.size,semMapa,repetidos,fora,
    minimo:Math.min(...distribuicao.map(x=>x.total)),
    maximo:Math.max(...distribuicao.map(x=>x.total)),
    distribuicao
  }));
  console.log("[UGP_10EIXOS_DRYRUN_LINHAS] "+JSON.stringify(linhas));
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGP_10EIXOS_DRYRUN_ERROR]",e);process.exit(1);});

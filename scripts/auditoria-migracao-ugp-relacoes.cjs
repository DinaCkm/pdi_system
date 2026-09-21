const mysql=require("mysql2/promise");
function norm(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
const grupos=[
 ["UGP-E01","Legislação Trabalhista, Normas e Conformidade",["Legislação, Normas e Conformidade Jurídica","Gestão de Processos / Legislação","Gestão Contratual"]],
 ["UGP-E02","Ética, Integridade e Responsabilidade",["Ética","Ética e Valores","Ética, Integridade e Responsabilidade"]],
 ["UGP-E03","Gestão de Processos e Governança Documental",["Gestão de Processos","Gestão do Conhecimento","Documentação Institucional"]],
 ["UGP-E04","Comunicação, Atendimento e Relacionamento",["Comunicação","Atendimento e Relacionamento com o Cliente"]],
 ["UGP-E05","Estratégia, Planejamento, Inovação e Visão Sistêmica",["Estratégia","Planejamento","Visão Estratégica","Visão Sistêmica com Foco em Pessoas","Estratégia e Protagonismo","Gestão de Tempo","Inovação","Criatividade"]],
 ["UGP-E06","Dados, Indicadores e People Analytics",["Estratégia de Indicadores","Gestão de Indicadores (People Analytics)","Competências Técnicas"]],
 ["UGP-E07","Gestão de Pessoas e Desempenho",["Gestão de Pessoas"]],
 ["UGP-E08","Cultura, Clima, Diversidade e Inclusão",["Cultura Organizacional na Prática","Gestão do Clima Organizacional","Diversidade e Inclusão"]],
 ["UGP-E09","Desenvolvimento, Liderança e Capacitação",["Desenvolvimento de Lideranças","Gestão de Treinamentos e Capacitação"]],
 ["UGP-E10","Carreira, Sucessão e PDI",["Gestão de Carreira e Sucessão","Planos de Desenvolvimento Individual (PDI)"]]
];
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [rows]=await db.execute(`
   SELECT u.id colaboradorId,u.name colaboradorNome,u.email,d.nome unidade,
          m.id matrizId,m.status matrizStatus,e.eixo_id eixoId,e.eixo_nome eixoNome,
          e.relacao,e.status_classificacao statusClassificacao,e.justificativa,e.percentual_anterior percentualAnterior
   FROM users u
   JOIN departamentos d ON d.id=u.departamentoId
   JOIN prova_utic_matrizes m ON m.colaborador_id=u.id
   JOIN prova_utic_matriz_eixos e ON e.matriz_id=m.id
   WHERE d.nome='UGP - UNIDADE DE GESTÃO DE PESSOAS'
   ORDER BY u.name,e.eixo_nome`);
  const byEmp=new Map();
  for(const r of rows){
    if(!byEmp.has(r.colaboradorId)) byEmp.set(r.colaboradorId,{id:r.colaboradorId,nome:r.colaboradorNome,email:r.email,matrizId:r.matrizId,matrizStatus:r.matrizStatus,eixos:[]});
    byEmp.get(r.colaboradorId).eixos.push(r);
  }
  const out=[];
  for(const emp of byEmp.values()){
    const consol=[];
    for(const [id,nome,legados] of grupos){
      const found=emp.eixos.filter(e=>legados.some(l=>norm(l)===norm(e.eixoNome)));
      const rels=[...new Set(found.map(e=>e.relacao).filter(Boolean))];
      let sugerida=null,status="SEM_DADOS";
      if(id==="UGP-E02"){sugerida="TRANSVERSAL";status="REGRA_FIXA";}
      else if(found.length && rels.length===1){sugerida=rels[0];status="DIRETO";}
      else if(found.length && rels.length>1){status="CONFLITO";}
      else if(found.length){status="PENDENTE";}
      consol.push({id,nome,status,sugerida,legadosEncontrados:found.map(e=>({nome:e.eixoNome,relacao:e.relacao,status:e.statusClassificacao,justificativa:e.justificativa,percentualAnterior:e.percentualAnterior}))});
    }
    out.push({...emp,consolidacao:consol});
  }
  console.log("[UGP_MIGRACAO] "+JSON.stringify(out));
 }finally{await db.end();}
}
main().catch(e=>{console.error("[UGP_MIGRACAO_ERROR]",e);process.exit(1);});

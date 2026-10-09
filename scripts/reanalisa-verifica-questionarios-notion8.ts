import mysql from "mysql2/promise";
import { questionarioAtividadesRouter } from "../server/routers/questionarioAtividades";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida.");
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [admins]: any = await db.execute(
      "SELECT id,name,email FROM users WHERE status='ativo' AND role IN ('admin','Administrador') ORDER BY id LIMIT 1"
    );
    const admin = admins[0];
    if (!admin) throw new Error("Administrador ativo não encontrado.");

    const ctx = {
      user: { id: Number(admin.id), role: "admin", name: String(admin.name || "Administrador"), email: String(admin.email || ""), departmentId: null },
      req: {}, res: {}, impersonadoPor: null,
    };
    const caller = questionarioAtividadesRouter.createCaller(ctx as any);

    // Diagnóstico somente leitura: não reexecuta IA para evitar alterar revisões enquanto analisamos.

    const ids = [144,145,146,147,148,149,150,151];
    const [questionarios]: any = await db.query(
      `SELECT q.id,q.colaborador_id AS colaboradorId,u.name,q.ano,q.status,q.fonte,
              COUNT(r.id) AS respostas,
              SUM(CASE WHEN r.resposta IS NOT NULL AND TRIM(r.resposta)<>'' THEN 1 ELSE 0 END) AS respondidas
         FROM questionarios_atividades_funcao q
         JOIN users u ON u.id=q.colaborador_id
         LEFT JOIN questionario_atividades_respostas r ON r.questionario_id=q.id
        WHERE q.id IN (?)
        GROUP BY q.id,q.colaborador_id,u.name,q.ano,q.status,q.fonte
        ORDER BY q.id`,
      [ids]
    );
    console.log("[QUESTIONARIOS] " + JSON.stringify(questionarios));

    const [revisoes]: any = await db.query(
      `SELECT questionario_id AS questionarioId,
              SUM(status='PENDENTE') AS pendentes,
              SUM(status='AJUSTADA') AS ajustadas,
              SUM(status='MANTIDA') AS mantidas
         FROM prova_utic_eixo_revisoes_questionario
        WHERE questionario_id IN (?)
        GROUP BY questionario_id
        ORDER BY questionario_id`,
      [ids]
    );
    console.log("[REVISOES] " + JSON.stringify(revisoes));

    const [detalhes]: any = await db.query(
      `SELECT r.questionario_id AS questionarioId,
              r.colaborador_id AS colaboradorId,
              u.name,
              r.eixo_id AS eixoId,
              r.eixo_nome AS eixoNome,
              r.relacao_atual AS relacaoAtual,
              r.relacao_sugerida AS relacaoSugerida,
              r.justificativa_sugerida AS justificativa,
              r.evidencias_json AS evidencias,
              r.status
         FROM prova_utic_eixo_revisoes_questionario r
         JOIN users u ON u.id=r.colaborador_id
        WHERE r.questionario_id IN (?)
          AND r.status='PENDENTE'
        ORDER BY r.questionario_id,r.eixo_nome`,
      [ids]
    );
    console.log("[DETALHES_REVISOES] " + JSON.stringify(detalhes));

    const [wescleyEixos]: any = await db.query(
      `SELECT m.id AS matrizId,
              me.eixo_id AS eixoId,
              COALESCE(ec.nome, me.eixo) AS eixoNome,
              me.relacao,
              me.status_classificacao AS statusClassificacao,
              me.justificativa,
              me.percentual_anterior AS percentualAnterior
         FROM prova_utic_matrizes m
         JOIN prova_utic_matriz_eixos me ON me.matriz_id=m.id
         LEFT JOIN prova_utic_eixos_catalogo ec ON ec.id=me.eixo_id
        WHERE m.colaborador_id=1410003
        ORDER BY eixoNome`
    );
    console.log("[WESCLEY_EIXOS] " + JSON.stringify(wescleyEixos));

    const [wescleyRespostas]: any = await db.query(
      `SELECT r.chave,r.pergunta,r.resposta
         FROM questionario_atividades_respostas r
        WHERE r.questionario_id=151
        ORDER BY r.ordem,r.id`
    );
    console.log("[WESCLEY_RESPOSTAS] " + JSON.stringify(wescleyRespostas));

    const [restantes]: any = await db.query(
      `SELECT u.id,u.name
         FROM users u
         JOIN prova_utic_matrizes m ON m.colaborador_id=u.id
         LEFT JOIN questionarios_atividades_funcao q ON q.colaborador_id=u.id
        WHERE u.status='ativo' AND u.role<>'admin' AND q.id IS NULL
        ORDER BY u.name`
    );
    console.log("[RESTANTES] " + JSON.stringify(restantes));
  } finally {
    await db.end();
  }
}
main().catch((e)=>{ console.error("[FATAL]", e); process.exit(1); });
import mysql from "mysql2/promise";
import { questionarioAtividadesRouter } from "../server/routers/questionarioAtividades";

const aplicar = process.argv.includes("--apply") || process.env.CARGA_NOTION8_APPLY === "SIM";
const dados = JSON.parse(process.env.NOTION8_DATA || "[]");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida.");
  if (!Array.isArray(dados) || dados.length === 0) throw new Error("NOTION8_DATA vazia.");

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [admins] = await db.execute(
      "SELECT id,name,email FROM users WHERE status='ativo' AND role IN ('admin','Administrador') ORDER BY id LIMIT 1"
    );
    const admin = admins[0];
    if (!admin) throw new Error("Administrador ativo não encontrado.");

    const ctx = {
      user: { id: Number(admin.id), role: "admin", name: String(admin.name || "Administrador"), email: String(admin.email || ""), departmentId: null },
      req: {}, res: {}, impersonadoPor: null,
    };
    const caller = questionarioAtividadesRouter.createCaller(ctx as any);

    for (const item of dados) {
      const [existentes] = await db.execute(
        "SELECT id,ano FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=? LIMIT 1",
        [item.colaboradorId, item.ano]
      );
      if (Array.isArray(existentes) && existentes.length) {
        console.log("[NOTION8] JA_EXISTE", item.colaboradorId, item.ano, existentes[0].id);
        continue;
      }

      const respostas = Object.entries(item.respostas || {}).map(([chave, resposta]) => ({
        chave,
        resposta: String(resposta || "").trim() || null,
      }));

      if (!aplicar) {
        console.log("[NOTION8] CRIARIA", item.colaboradorId, item.ano, respostas.filter((r:any) => r.resposta).length);
        continue;
      }

      try {
        const result = await caller.save({
          colaboradorId: Number(item.colaboradorId),
          ano: Number(item.ano),
          status: "preenchido",
          fonte: "importado_historico",
          arquivoOrigemNome: item.arquivo || null,
          arquivoOrigemUrl: item.origemUrl || null,
          observacoes: "Importado do Notion/OneDrive em 08/10/2026. Conteúdo transcrito do PDF de referência do ciclo 2025.",
          respostas,
        });
        console.log("[NOTION8] CRIADO", item.colaboradorId, result.questionarioId, JSON.stringify(result.analiseIA));
      } catch (error:any) {
        console.log("[NOTION8] ERRO", item.colaboradorId, error?.message || String(error));
      }
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("[NOTION8] FATAL", error);
  process.exit(1);
});

/**
 * Script único (Etapa 6.1) - carrega os dados reais já disponíveis direto
 * no banco de teste, sem depender da tela de upload (ainda não existe -
 * isso é a Etapa 7). Roda uma vez, manualmente, via Console do Railway:
 *
 *   npx tsx scripts/run-import-relatorio-individual.ts
 *
 * O que faz:
 *  1. Garante o ciclo "2025/2" (comportamental) - cria se não existir.
 *  2. Confirma que o ciclo "2026/1" (técnico) já existe - NÃO cria, só avisa
 *     se não encontrar (nesse caso, algo está errado e o script para).
 *  3. Importa data/relatorio-ciclo-2025.xlsx (Ações Finalizadas + Não
 *     Finalizadas) no ciclo 2025/2.
 *  4. Importa data/certificacoes-2026.xlsx (CONSOLIDADO UNIDADES +
 *     CONSOLIDADO REGIONAIS) no ciclo 2026/1.
 *  5. Imprime um resumo de cada importação (ok/erro/bloqueadas) no final.
 *
 * Não apaga nem sobrescreve nada existente - só insere. Pode ser rodado de
 * novo com segurança para os arquivos que ainda não foram importados, mas
 * rodar duas vezes com o MESMO arquivo vai duplicar os dados (isso é
 * esperado - cada rodada é um novo import_batch, por design da Etapa 2).
 */
import fs from "node:fs";
import path from "node:path";
import { eq, and } from "drizzle-orm";
import { getDb } from "../server/db";
import { ciclos, users } from "../drizzle/schema";
import {
  importPdiComportamental,
  importCertificacaoTecnica,
} from "../server/modules/relatorioIndividualImporter";

async function garantirCiclo(db: any, nome: string, dataInicio: string, dataFim: string, createdBy: number) {
  const [existente] = await db.select().from(ciclos).where(eq(ciclos.nome, nome));
  if (existente) {
    console.log(`[ciclo] "${nome}" já existe (id=${existente.id})`);
    return existente.id as number;
  }
  const result = await db.insert(ciclos).values({
    nome,
    dataInicio,
    dataFim,
    status: "encerrado",
    createdBy,
  });
  const id = result[0].insertId as number;
  console.log(`[ciclo] "${nome}" criado (id=${id})`);
  return id;
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ DATABASE_URL não encontrada / DB não conectado. Abortando.");
    process.exit(1);
  }

  // Pega um admin ativo para registrar como "importadoPor"
  const [admin] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "ativo")));
  if (!admin) {
    console.error("❌ Nenhum usuário admin ativo encontrado. Abortando.");
    process.exit(1);
  }
  console.log(`[admin] usando "${admin.name}" (${admin.email}) como importadoPor`);

  const ciclo2025Id = await garantirCiclo(db, "2025/2", "2025-07-01 00:00:00", "2025-12-31 23:59:59", admin.id);

  const [ciclo2026] = await db.select().from(ciclos).where(eq(ciclos.nome, "2026/1"));
  if (!ciclo2026) {
    console.error('❌ Ciclo "2026/1" não encontrado no banco de teste. Esperado que já existisse - abortando sem criar um novo, para não divergir do que está em produção.');
    process.exit(1);
  }
  console.log(`[ciclo] "2026/1" confirmado (id=${ciclo2026.id})`);

  // ---- 1) PDI comportamental 2025 ----
  const arquivoPdi = path.resolve("data/relatorio-ciclo-2025.xlsx");
  if (!fs.existsSync(arquivoPdi)) {
    console.error(`❌ Arquivo não encontrado: ${arquivoPdi}`);
    process.exit(1);
  }
  console.log("\n=== Importando PDI comportamental 2025 ===");
  const bufferPdi = fs.readFileSync(arquivoPdi);
  const resultadoPdi = await importPdiComportamental(
    bufferPdi,
    "relatorio-ciclo-2025.xlsx",
    ciclo2025Id,
    admin.id
  );
  console.log("Resultado PDI comportamental:", resultadoPdi);

  // ---- 2) Certificação técnica 2026 ----
  const arquivoCert = path.resolve("data/certificacoes-2026.xlsx");
  if (!fs.existsSync(arquivoCert)) {
    console.error(`❌ Arquivo não encontrado: ${arquivoCert}`);
    process.exit(1);
  }
  const bufferCert = fs.readFileSync(arquivoCert);

  console.log("\n=== Importando Certificação técnica 2026 - CONSOLIDADO UNIDADES ===");
  const resultadoUnidades = await importCertificacaoTecnica(
    bufferCert,
    "CONSOLIDADO UNIDADES",
    "certificacoes-2026.xlsx (unidades)",
    ciclo2026.id,
    admin.id
  );
  console.log("Resultado CONSOLIDADO UNIDADES:", resultadoUnidades);

  console.log("\n=== Importando Certificação técnica 2026 - CONSOLIDADO REGIONAIS ===");
  const resultadoRegionais = await importCertificacaoTecnica(
    bufferCert,
    "CONSOLIDADO REGIONAIS",
    "certificacoes-2026.xlsx (regionais)",
    ciclo2026.id,
    admin.id
  );
  console.log("Resultado CONSOLIDADO REGIONAIS:", resultadoRegionais);

  console.log("\n=== RESUMO FINAL ===");
  console.log("PDI comportamental 2025:", resultadoPdi);
  console.log("Certificação - Unidades:", resultadoUnidades);
  console.log("Certificação - Regionais:", resultadoRegionais);
  console.log("\n✅ Importação concluída. Confira as linhas bloqueadas/erro nos import_rows antes de considerar definitivo.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro fatal no script:", err);
  process.exit(1);
});

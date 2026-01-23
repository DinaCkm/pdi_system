import { getDb } from "./server/db.ts";
import * as db from "./server/db.ts";

async function test() {
  console.log("🔍 TESTE FINAL - Verificando dados do banco\n");
  
  try {
    console.log("1️⃣ Testando getPendingEvidences()...");
    const evidences = await db.getPendingEvidences();
    console.log(`   ✅ Retornou ${evidences.length} evidências`);
    if (evidences.length > 0) {
      console.log("   Primeira evidência:", JSON.stringify(evidences[0], null, 2));
    } else {
      console.log("   ⚠️ NENHUMA EVIDÊNCIA ENCONTRADA!");
    }
    
    console.log("\n2️⃣ Testando getPendingAdjustmentRequests()...");
    const adjustments = await db.getPendingAdjustmentRequests();
    console.log(`   ✅ Retornou ${adjustments.length} solicitações`);
    if (adjustments.length > 0) {
      console.log("   Primeira solicitação:", JSON.stringify(adjustments[0], null, 2));
    } else {
      console.log("   ⚠️ NENHUMA SOLICITAÇÃO ENCONTRADA!");
    }
  } catch (error) {
    console.error("❌ ERRO:", error);
  }
  
  process.exit(0);
}

test();

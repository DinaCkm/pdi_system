
import "dotenv/config";
import { getDb } from "../server/db";
import { users, departamentos } from "../drizzle/schema";
import { eq, and, isNull, ne } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco de dados.");
    return;
  }

  console.log("Iniciando sincronização de leaderId com base nos departamentos...");

  // 1. Obter todos os departamentos com seus líderes
  const allDepartments = await db.select().from(departamentos);

  for (const dept of allDepartments) {
    if (dept.leaderId) {
      console.log(`Processando departamento: ${dept.nome} (ID: ${dept.id}), Líder: ${dept.leaderId}`);

      // 2. Encontrar todos os usuários ativos neste departamento que NÃO são o próprio líder
      const usersInDept = await db.select().from(users).where(
        and(
          eq(users.departamentoId, dept.id),
          eq(users.status, 'ativo'),
          ne(users.id, dept.leaderId) // Excluir o próprio líder do departamento
        )
      );

      if (usersInDept.length > 0) {
        console.log(`  Encontrados ${usersInDept.length} colaboradores para atualizar em ${dept.nome}.`);
        for (const user of usersInDept) {
          // 3. Atualizar o leaderId desses usuários para o leaderId do departamento
          await db.update(users)
            .set({ leaderId: dept.leaderId, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          console.log(`    Atualizado colaborador ${user.name} (ID: ${user.id}) com leaderId: ${dept.leaderId}`);
        }
      } else {
        console.log(`  Nenhum colaborador para atualizar em ${dept.nome}.`);
      }
    } else {
      console.log(`Departamento ${dept.nome} (ID: ${dept.id}) não possui líder definido. Ignorando.`);
    }
  }

  console.log("Sincronização concluída.");
}

main().catch(console.error);

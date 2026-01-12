import { drizzle } from "drizzle-orm/mysql2";
import { actions } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const allActions = await db.select({
  id: actions.id,
  nome: actions.nome,
  status: actions.status,
  createdAt: actions.createdAt
}).from(actions).orderBy(actions.createdAt);

console.log("=== AÇÕES NO BANCO ===");
allActions.forEach(action => {
  console.log(`ID: ${action.id} | Nome: ${action.nome} | Status: ${action.status} | Criada em: ${action.createdAt}`);
});

process.exit(0);

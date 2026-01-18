import { drizzle } from "drizzle-orm/mysql2";
import { users } from "./drizzle/schema.js";
import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const db = drizzle(connectionString);

try {
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    cpf: users.cpf,
    role: users.role,
  }).from(users).limit(5);

  console.log("Usuários no banco:");
  console.table(allUsers);
} catch (error) {
  console.error("Erro:", error.message);
}

process.exit(0);

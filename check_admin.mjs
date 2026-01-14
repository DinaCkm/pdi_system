import { getDb } from "./server/_core/db.js";

async function checkAdmin() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  // Procurar um usuário com role 'admin'
  const admin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.role, 'admin'),
  });

  if (admin) {
    console.log("✅ Admin encontrado:");
    console.log("ID:", admin.id);
    console.log("Name:", admin.name);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
  } else {
    console.log("❌ Nenhum admin encontrado");
  }
}

checkAdmin();

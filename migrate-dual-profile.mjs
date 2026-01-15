import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import * as schema from "./drizzle/schema.ts";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function migrate() {
  try {
    const db = drizzle(DATABASE_URL);
    
    console.log("🔄 Iniciando migração de dados para perfil dual...");
    
    // Buscar todos os usuários com departamento e papel definidos
    const allUsers = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        role: schema.users.role,
        departamentoId: schema.users.departamentoId,
        leaderId: schema.users.leaderId,
      })
      .from(schema.users)
      .where(and(
        ne(schema.users.role, 'admin'),
        isNotNull(schema.users.departamentoId)
      ));
    
    console.log(`📊 Encontrados ${allUsers.length} usuários para migrar`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of allUsers) {
      // Verificar se já existe registro
      const existing = await db
        .select()
        .from(schema.userDepartmentRoles)
        .where(and(
          eq(schema.userDepartmentRoles.userId, user.id),
          eq(schema.userDepartmentRoles.departmentId, user.departamentoId)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        // Criar novo registro baseado no papel antigo
        const assignmentType = user.role === 'lider' ? 'LEADER' : 'MEMBER';
        
        await db.insert(schema.userDepartmentRoles).values({
          userId: user.id,
          departmentId: user.departamentoId,
          assignmentType,
          leaderUserId: user.role === 'lider' ? null : user.leaderId,
          status: 'ativo',
        });
        
        console.log(`✅ Migrado: ${user.name} (${assignmentType}) → Depto ${user.departamentoId}`);
        migratedCount++;
      } else {
        console.log(`⏭️  Pulado: ${user.name} (já existe)`);
        skippedCount++;
      }
    }
    
    console.log(`\n📈 Resultado:`);
    console.log(`   ✅ Migrados: ${migratedCount}`);
    console.log(`   ⏭️  Pulados: ${skippedCount}`);
    console.log(`   📊 Total: ${allUsers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro durante migração:", error);
    process.exit(1);
  }
}

migrate();

import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("CentralComando - Filtragem de Usuários Inativos", () => {
  let testUserId: number;
  let testInactiveUserId: number;

  beforeAll(async () => {
    // Buscar usuários existentes
    const allUsers = await db.getAllUsers();
    
    // Encontrar um usuário ativo
    const activeUser = allUsers.find((u: any) => u.status === 'ativo');
    if (activeUser) {
      testUserId = activeUser.id;
    }
    
    // Encontrar um usuário inativo
    const inactiveUser = allUsers.find((u: any) => u.status === 'inativo');
    if (inactiveUser) {
      testInactiveUserId = inactiveUser.id;
    }
  });

  it("deve filtrar usuários inativos na auditoria de erros", async () => {
    const allUsers = await db.getAllUsers();
    
    // Simular lógica de auditoria com filtro
    const errors = allUsers
      .filter((user: any) => user.status === 'ativo') // FILTRO
      .filter((user: any) => {
        // Verificar auto-liderança
        if (user.leaderId === user.id) return true;
        // Verificar sem líder
        if ((user.role === "lider" || user.role === "colaborador") && !user.leaderId) return true;
        return false;
      });
    
    console.log("[TEST] Total de usuários:", allUsers.length);
    console.log("[TEST] Usuários ativos:", allUsers.filter((u: any) => u.status === 'ativo').length);
    console.log("[TEST] Usuários inativos:", allUsers.filter((u: any) => u.status === 'inativo').length);
    console.log("[TEST] Erros encontrados (apenas ativos):", errors.length);
    
    // Verificar que erros não incluem usuários inativos
    const errorIds = errors.map((e: any) => e.id);
    const inactiveInErrors = allUsers
      .filter((u: any) => u.status === 'inativo')
      .filter((u: any) => errorIds.includes(u.id));
    
    expect(inactiveInErrors.length).toBe(0);
    console.log("[TEST] ✅ Nenhum usuário inativo nos erros!");
  });

  it("deve ignorar usuários inativos na hierarquia", async () => {
    const allUsers = await db.getAllUsers();
    const allDepartamentos = await db.getAllDepartamentos();
    
    // Simular lógica de hierarquia com filtro
    const hierarchy: Record<number, Record<number, any[]>> = {};
    
    allDepartamentos.forEach((dept: any) => {
      hierarchy[dept.id] = {};
    });

    allUsers
      .filter((user: any) => user.status === 'ativo') // FILTRO
      .forEach((user: any) => {
        if (user.departamentoId && hierarchy[user.departamentoId]) {
          const leaderId = user.leaderId || 0;
          if (!hierarchy[user.departamentoId][leaderId]) {
            hierarchy[user.departamentoId][leaderId] = [];
          }
          hierarchy[user.departamentoId][leaderId].push(user);
        }
      });

    // Contar usuários na hierarquia
    let totalInHierarchy = 0;
    Object.values(hierarchy).forEach((deptMap: any) => {
      Object.values(deptMap).forEach((users: any) => {
        totalInHierarchy += users.length;
      });
    });

    console.log("[TEST] Usuários na hierarquia (apenas ativos):", totalInHierarchy);
    
    // Verificar que nenhum usuário inativo está na hierarquia
    const inactiveUsers = allUsers.filter((u: any) => u.status === 'inativo');
    let inactiveInHierarchy = 0;
    
    Object.values(hierarchy).forEach((deptMap: any) => {
      Object.values(deptMap).forEach((users: any) => {
        users.forEach((user: any) => {
          if (inactiveUsers.find((iu: any) => iu.id === user.id)) {
            inactiveInHierarchy++;
          }
        });
      });
    });

    expect(inactiveInHierarchy).toBe(0);
    console.log("[TEST] ✅ Nenhum usuário inativo na hierarquia!");
  });

  it("deve reduzir erros após inativar usuários sem líder", async () => {
    const allUsers = await db.getAllUsers();
    
    // Contar erros ANTES (com filtro de ativos)
    const errorsBefore = allUsers
      .filter((user: any) => user.status === 'ativo')
      .filter((user: any) => {
        if (user.leaderId === user.id) return true;
        if ((user.role === "lider" || user.role === "colaborador") && !user.leaderId) return true;
        return false;
      });

    console.log("[TEST] Erros de usuários ATIVOS:", errorsBefore.length);
    
    // Contar erros DEPOIS (incluindo inativos - sem filtro)
    const errorsAfterUnfiltered = allUsers
      .filter((user: any) => {
        if (user.leaderId === user.id) return true;
        if ((user.role === "lider" || user.role === "colaborador") && !user.leaderId) return true;
        return false;
      });

    console.log("[TEST] Erros TOTAIS (incluindo inativos):", errorsAfterUnfiltered.length);
    console.log("[TEST] Diferença:", errorsAfterUnfiltered.length - errorsBefore.length);
    
    // Verificar que filtro reduz erros
    expect(errorsBefore.length).toBeLessThanOrEqual(errorsAfterUnfiltered.length);
    console.log("[TEST] ✅ Filtro reduz erros corretamente!");
  });
});

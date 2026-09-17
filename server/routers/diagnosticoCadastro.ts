import { sql } from "drizzle-orm";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

function n(value: unknown) {
  return Number(value ?? 0);
}

export const diagnosticoCadastroRouter = router({
  resumo: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponivel.");

    const [statusRoles] = await db.execute(sql`
      SELECT status, role, COUNT(*) AS quantidade
      FROM users
      GROUP BY status, role
      ORDER BY status, role
    `);

    const [cargos] = await db.execute(sql`
      SELECT cargo, COUNT(*) AS quantidade
      FROM users
      GROUP BY cargo
      ORDER BY quantidade DESC, cargo
    `);

    const [alertas] = await db.execute(sql`
      SELECT
        SUM(CASE WHEN leaderId IS NOT NULL AND leaderId = id THEN 1 ELSE 0 END) AS autoLideranca,
        SUM(CASE WHEN cargo IS NULL OR TRIM(cargo) = '' THEN 1 ELSE 0 END) AS cargosVazios
      FROM users
    `);

    const [departamentos] = await db.execute(sql`
      SELECT
        COUNT(*) AS totalAtivos,
        SUM(CASE WHEN leaderId IS NULL THEN 1 ELSE 0 END) AS semLider
      FROM departamentos
      WHERE status = 'ativo'
    `);

    const [lideresInvalidos] = await db.execute(sql`
      SELECT COUNT(*) AS quantidade
      FROM users u
      LEFT JOIN users l ON l.id = u.leaderId
      WHERE u.leaderId IS NOT NULL
        AND (l.id IS NULL OR l.status <> 'ativo')
    `);

    const [lideresSemRole] = await db.execute(sql`
      SELECT COUNT(*) AS quantidade
      FROM departamentos d
      JOIN users l ON l.id = d.leaderId
      LEFT JOIN user_department_roles udr
        ON udr.departmentId = d.id
       AND udr.userId = d.leaderId
       AND udr.assignmentType = 'LEADER'
       AND udr.status = 'ativo'
      WHERE d.status = 'ativo'
        AND d.leaderId IS NOT NULL
        AND udr.id IS NULL
    `);

    const [rolesDivergentes] = await db.execute(sql`
      SELECT COUNT(*) AS quantidade
      FROM user_department_roles udr
      JOIN departamentos d ON d.id = udr.departmentId
      WHERE udr.assignmentType = 'LEADER'
        AND udr.status = 'ativo'
        AND (d.leaderId IS NULL OR d.leaderId <> udr.userId)
    `);

    const first = (rows: any) => Array.isArray(rows) ? rows[0] ?? {} : {};

    return {
      modo: "SOMENTE_LEITURA",
      privacidade: "Sem nome, email, CPF, openId ou credenciais.",
      usuariosPorStatusERole: Array.isArray(statusRoles)
        ? statusRoles.map((item: any) => ({
            status: item.status,
            role: item.role,
            quantidade: n(item.quantidade),
          }))
        : [],
      cargos: Array.isArray(cargos)
        ? cargos.map((item: any) => ({
            cargo: item.cargo,
            quantidade: n(item.quantidade),
          }))
        : [],
      alertas: {
        autoLideranca: n(first(alertas).autoLideranca),
        cargosVazios: n(first(alertas).cargosVazios),
        departamentosAtivos: n(first(departamentos).totalAtivos),
        departamentosSemLider: n(first(departamentos).semLider),
        lideresDiretosInvalidos: n(first(lideresInvalidos).quantidade),
        lideresSemVinculoLeader: n(first(lideresSemRole).quantidade),
        rolesLeaderDivergentes: n(first(rolesDivergentes).quantidade),
      },
    };
  }),
});

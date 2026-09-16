const mysql = require('mysql2/promise');

function normalizarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function numero(valor) {
  return Number(valor ?? 0);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Diagnóstico não executado.');

  const connection = await mysql.createConnection(url);

  try {
    // Segurança: esta rotina abre uma transação explicitamente somente leitura.
    await connection.query('SET TRANSACTION READ ONLY');
    await connection.beginTransaction();

    const [statusRoles] = await connection.query(`
      SELECT status, role, COUNT(*) AS quantidade
        FROM users
       GROUP BY status, role
       ORDER BY status, role
    `);

    const [cargos] = await connection.query(`
      SELECT cargo, COUNT(*) AS quantidade
        FROM users
       GROUP BY cargo
       ORDER BY quantidade DESC, cargo
    `);

    const [cargosPorDepartamento] = await connection.query(`
      SELECT d.id AS departamentoId,
             d.nome AS departamento,
             u.cargo,
             COUNT(*) AS quantidade
        FROM users u
        LEFT JOIN departamentos d ON d.id = u.departamentoId
       WHERE u.status = 'ativo'
       GROUP BY d.id, d.nome, u.cargo
       ORDER BY d.nome, u.cargo
    `);

    const [autoLideranca] = await connection.query(`
      SELECT id AS userId, cargo, departamentoId, status, role
        FROM users
       WHERE leaderId IS NOT NULL
         AND leaderId = id
       ORDER BY id
    `);

    const [lideresDiretosInvalidos] = await connection.query(`
      SELECT u.id AS userId,
             u.cargo,
             u.departamentoId,
             u.leaderId,
             l.status AS leaderStatus,
             l.role AS leaderRole
        FROM users u
        LEFT JOIN users l ON l.id = u.leaderId
       WHERE u.leaderId IS NOT NULL
         AND (l.id IS NULL OR l.status <> 'ativo')
       ORDER BY u.id
    `);

    const [departamentosELideres] = await connection.query(`
      SELECT d.id AS departamentoId,
             d.nome AS departamento,
             d.status AS departamentoStatus,
             d.leaderId,
             l.cargo AS leaderCargo,
             l.status AS leaderStatus,
             l.role AS leaderRole,
             l.departamentoId AS leaderDepartamentoPrincipalId,
             dp.nome AS leaderDepartamentoPrincipal,
             CASE WHEN l.departamentoId = d.id THEN 1 ELSE 0 END AS liderLotadoNoDepartamentoLiderado
        FROM departamentos d
        LEFT JOIN users l ON l.id = d.leaderId
        LEFT JOIN departamentos dp ON dp.id = l.departamentoId
       ORDER BY d.status, d.nome
    `);

    const [rolesDepartamento] = await connection.query(`
      SELECT udr.departmentId,
             d.nome AS departamento,
             udr.assignmentType,
             udr.status,
             COUNT(*) AS quantidade
        FROM user_department_roles udr
        LEFT JOIN departamentos d ON d.id = udr.departmentId
       GROUP BY udr.departmentId, d.nome, udr.assignmentType, udr.status
       ORDER BY d.nome, udr.assignmentType, udr.status
    `);

    const [lideresSemRole] = await connection.query(`
      SELECT d.id AS departamentoId,
             d.nome AS departamento,
             d.leaderId AS leaderUserId,
             l.cargo AS leaderCargo,
             l.departamentoId AS leaderDepartamentoPrincipalId
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
       ORDER BY d.nome
    `);

    const [rolesLeaderDivergentes] = await connection.query(`
      SELECT udr.id AS roleId,
             udr.departmentId,
             d.nome AS departamento,
             udr.userId AS roleUserId,
             d.leaderId AS departamentoLeaderId,
             udr.status
        FROM user_department_roles udr
        JOIN departamentos d ON d.id = udr.departmentId
       WHERE udr.assignmentType = 'LEADER'
         AND udr.status = 'ativo'
         AND (d.leaderId IS NULL OR d.leaderId <> udr.userId)
       ORDER BY d.nome, udr.id
    `);

    const [liderancaDeptDivergente] = await connection.query(`
      SELECT u.id AS userId,
             u.cargo,
             u.departamentoId,
             d.nome AS departamento,
             u.leaderId AS leaderDiretoId,
             d.leaderId AS leaderDepartamentoId
        FROM users u
        JOIN departamentos d ON d.id = u.departamentoId
       WHERE u.status = 'ativo'
         AND d.status = 'ativo'
         AND d.leaderId IS NOT NULL
         AND u.id <> d.leaderId
         AND (u.leaderId IS NULL OR u.leaderId <> d.leaderId)
       ORDER BY d.nome, u.id
    `);

    const [cargosVazios] = await connection.query(`
      SELECT COUNT(*) AS quantidade
        FROM users
       WHERE cargo IS NULL OR TRIM(cargo) = ''
    `);

    // Detecta duplicidades apenas de grafia/capitalização/espaços, sem alterar nada.
    const gruposCargo = new Map();
    for (const item of cargos) {
      const original = String(item.cargo ?? '');
      const chave = normalizarTexto(original);
      if (!chave) continue;
      const grupo = gruposCargo.get(chave) ?? { normalizado: chave, variantes: [], total: 0 };
      grupo.variantes.push({ cargo: original, quantidade: numero(item.quantidade) });
      grupo.total += numero(item.quantidade);
      gruposCargo.set(chave, grupo);
    }
    const cargosPossivelmenteDuplicados = Array.from(gruposCargo.values())
      .filter(grupo => grupo.variantes.length > 1)
      .sort((a, b) => b.total - a.total || a.normalizado.localeCompare(b.normalizado, 'pt-BR'));

    const departamentosAtivos = departamentosELideres.filter(item => item.departamentoStatus === 'ativo');
    const departamentosSemLider = departamentosAtivos.filter(item => item.leaderId == null);
    const departamentosComLiderInativoOuInexistente = departamentosAtivos.filter(
      item => item.leaderId != null && item.leaderStatus !== 'ativo',
    );
    const lideresForaDoDepartamentoLiderado = departamentosAtivos.filter(
      item => item.leaderId != null && numero(item.liderLotadoNoDepartamentoLiderado) === 0,
    );

    const relatorio = {
      geradoEm: new Date().toISOString(),
      modo: 'SOMENTE_LEITURA',
      privacidade: 'Sem nome, e-mail, CPF, openId ou credenciais.',
      resumo: {
        usuariosPorStatusERole: statusRoles.map(item => ({
          status: item.status,
          role: item.role,
          quantidade: numero(item.quantidade),
        })),
        cargosDistintos: cargos.length,
        cargosVazios: numero(cargosVazios[0]?.quantidade),
        autoLideranca: autoLideranca.length,
        lideresDiretosInvalidos: lideresDiretosInvalidos.length,
        departamentosAtivos: departamentosAtivos.length,
        departamentosSemLider: departamentosSemLider.length,
        departamentosComLiderInativoOuInexistente: departamentosComLiderInativoOuInexistente.length,
        lideresForaDoDepartamentoLiderado: lideresForaDoDepartamentoLiderado.length,
        lideresSemVinculoLeaderEmUserDepartmentRoles: lideresSemRole.length,
        rolesLeaderDivergentesDoCadastroDepartamento: rolesLeaderDivergentes.length,
        empregadosComLeaderDiretoDiferenteDoLeaderDoDepartamento: liderancaDeptDivergente.length,
        gruposDeCargoPossivelmenteDuplicados: cargosPossivelmenteDuplicados.length,
      },
      cargos: cargos.map(item => ({ cargo: item.cargo, quantidade: numero(item.quantidade) })),
      cargosPossivelmenteDuplicados,
      cargosPorDepartamento: cargosPorDepartamento.map(item => ({
        departamentoId: item.departamentoId == null ? null : numero(item.departamentoId),
        departamento: item.departamento ?? 'SEM_DEPARTAMENTO',
        cargo: item.cargo,
        quantidade: numero(item.quantidade),
      })),
      autoLideranca,
      lideresDiretosInvalidos,
      departamentosELideres,
      departamentosSemLider,
      departamentosComLiderInativoOuInexistente,
      lideresForaDoDepartamentoLiderado,
      userDepartmentRolesResumo: rolesDepartamento.map(item => ({
        departmentId: numero(item.departmentId),
        departamento: item.departamento,
        assignmentType: item.assignmentType,
        status: item.status,
        quantidade: numero(item.quantidade),
      })),
      lideresSemRole,
      rolesLeaderDivergentes,
      liderancaDeptDivergente,
    };

    console.log(JSON.stringify(relatorio, null, 2));

    // Nada é persistido; rollback reforça a garantia de não escrita.
    await connection.rollback();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignora erro secundário de rollback; erro original será preservado.
    }
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha no diagnóstico somente leitura:', error);
  process.exit(1);
});

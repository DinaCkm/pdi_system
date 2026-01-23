export async function getPendingAdjustmentRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [rows]: any = await db.execute(`
    SELECT 
      ar.id,
      ar.actionId,
      ar.solicitanteId,
      ar.tipoSolicitante,
      ar.justificativa,
      ar.camposAjustar,
      ar.status,
      ar.justificativaAdmin,
      ar.createdAt,
      ar.evaluatedAt,
      ar.evaluatedBy,
      a.id as action_id,
      a.titulo as action_title,
      a.descricao as action_desc,
      a.prazo as action_prazo,
      a.macroCompetencia as action_macro,
      u.name as user_name,
      u.email as user_email
    FROM adjustment_requests ar
    INNER JOIN actions a ON CAST(ar.actionId AS UNSIGNED) = a.id
    INNER JOIN users u ON ar.solicitanteId = u.id
    WHERE ar.status = 'pendente'
    ORDER BY ar.createdAt DESC
  `);

  return rows.map((row: any) => ({
    id: row.id,
    actionId: row.actionId,
    solicitanteId: row.solicitanteId,
    tipoSolicitante: row.tipoSolicitante,
    justificativa: row.justificativa,
    camposAjustar: row.camposAjustar,
    status: row.status,
    justificativaAdmin: row.justificativaAdmin,
    createdAt: row.createdAt,
    evaluatedAt: row.evaluatedAt,
    evaluatedBy: row.evaluatedBy,
    acao: {
      id: row.action_id,
      titulo: row.action_title,
      descricao: row.action_desc,
      prazo: row.action_prazo,
      macroCompetencia: row.action_macro,
    },
    solicitante: {
      name: row.user_name,
      email: row.user_email,
    },
  }));
}

import { getDb } from './server/_core/db.js';
import { sql } from 'drizzle-orm';

const db = await getDb();
const [rows] = await db.execute(sql`
  SELECT 
    e.id,
    e.status,
    u.id as userId,
    u.name as colaboradorNome,
    u.departamentoId,
    u.leaderId,
    d.nome as departamentoNome,
    l.name as liderNome,
    a.titulo as actionNome
  FROM evidences e
  LEFT JOIN users u ON e.colaboradorId = u.id
  LEFT JOIN actions a ON e.actionId = a.id
  LEFT JOIN departamentos d ON u.departamentoId = d.id
  LEFT JOIN users l ON u.leaderId = l.id
  WHERE e.status = 'aguardando_avaliacao'
  LIMIT 3
`);

console.log('Query Results:', JSON.stringify(rows, null, 2));
process.exit(0);

import { getDb } from './server/db.ts';

const db = await getDb();
const [evStatus] = await db.execute('SELECT DISTINCT status FROM evidences');
const [adjStatus] = await db.execute('SELECT DISTINCT status FROM adjustment_requests');

console.log('Evidências - Status únicos:', evStatus.map(r => r.status));
console.log('Ajustes - Status únicos:', adjStatus.map(r => r.status));

process.exit(0);

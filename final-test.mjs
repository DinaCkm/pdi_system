import { getDb } from './server/db.ts';

const db = await getDb();

console.log('\n=== EVIDÊNCIAS ===');
const [evidences]: any = await db.execute('SELECT id, status FROM evidences LIMIT 3');
console.log('Evidências:', JSON.stringify(evidences, null, 2));

console.log('\n=== ADJUSTMENT REQUESTS ===');
const [adjustments]: any = await db.execute('SELECT id, status FROM adjustment_requests LIMIT 3');
console.log('Adjustments:', JSON.stringify(adjustments, null, 2));

console.log('\n=== USERS ===');
const [users]: any = await db.execute('SELECT email, role FROM users WHERE email = "relacionamento@ckmtalents.net" LIMIT 1');
console.log('User:', JSON.stringify(users, null, 2));

process.exit(0);

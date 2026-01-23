import { getDb } from './server/db.ts';

const db = await getDb();
const [rows]: any = await db.execute('SELECT email, role FROM users WHERE email = "relacionamento@ckmtalents.net" LIMIT 1');

console.log('=== RESULTADO ===');
console.log('Email:', rows[0]?.email);
console.log('Role:', rows[0]?.role);
console.log('Role Type:', typeof rows[0]?.role);

process.exit(0);

import { promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
const dataDir = path.join(process.cwd(), 'data');
const adminPath = path.join(dataDir, 'admin.json');
const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, ...rest] = arg.replace(/^--/, '').split('='); return [key, rest.join('=')]; }));
const rl = readline.createInterface({ input, output });
const username = args.username || process.env.RIWAAYAT_ADMIN_USERNAME || await rl.question('Admin ID: ');
const password = args.password || process.env.RIWAAYAT_ADMIN_PASSWORD || await rl.question('Password: ');
rl.close();
if (!username || password.length < 8)
    throw new Error('Admin ID is required and password must be at least 8 characters.');
const timestamp = new Date().toISOString();
const record = { id: crypto.randomUUID(), username: username.trim(), passwordHash: await bcrypt.hash(password, 12), createdAt: timestamp, updatedAt: timestamp };
await fs.mkdir(dataDir, { recursive: true });
await fs.writeFile(adminPath, JSON.stringify(record, null, 2));
console.log(`Admin account created for ${record.username}. The password is stored as a bcrypt hash.`);
//# sourceMappingURL=create-admin.js.map
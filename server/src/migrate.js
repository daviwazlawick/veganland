import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = await fs.readFile(schemaPath, 'utf8');

const pool = await getPool();
if (!pool) throw new Error('DATABASE_URL not set — cannot run migrations');
await pool.query(schema);
await pool.end();

console.log('Database schema is ready.');

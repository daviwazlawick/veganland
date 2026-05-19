import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

const pool = await getPool();
if (!pool) throw new Error('DATABASE_URL not set — cannot run migrations');

await pool.query(`
  create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )
`);

const { rows } = await pool.query('select version from schema_migrations order by version');
const applied = new Set(rows.map(r => r.version));

const files = (await fs.readdir(migrationsDir))
  .filter(f => f.endsWith('.sql'))
  .sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip  ${file}`);
    continue;
  }
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
  await pool.query(sql);
  await pool.query('insert into schema_migrations (version) values ($1)', [file]);
  console.log(`  ✓     ${file}`);
  count++;
}

await pool.end();
console.log(`\nDone. ${count} migration(s) applied.`);

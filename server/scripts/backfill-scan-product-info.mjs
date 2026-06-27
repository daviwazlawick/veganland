#!/usr/bin/env node
// One-shot backfill: inject productInfo (built from current products row) into
// scan_events.result for old scans that pre-date the productInfo-persist fix.
//
// Idempotent — skips scans that already have productInfo.
//
// Usage: node server/scripts/backfill-scan-product-info.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { buildSlimProductInfo } from '../src/openFoodFacts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl });

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      select se.id as scan_id, se.result, p.*
        from scan_events se
        join products p on p.id = se.product_id
       where not (se.result ? 'productInfo')
    `);

    console.log(`Found ${rows.length} scans without productInfo`);
    if (rows.length === 0) return;

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const { scan_id, result, ...product } = row;
      const slim = buildSlimProductInfo(product);
      if (!slim) { skipped++; continue; }

      const newResult = { ...result, productInfo: slim };
      await client.query(
        'update scan_events set result = $1 where id = $2',
        [JSON.stringify(newResult), scan_id]
      );
      updated++;
      if (updated % 100 === 0) process.stdout.write(`\r  ${updated} updated`);
    }
    process.stdout.write('\n');
    console.log(`Done. Updated: ${updated}, skipped: ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

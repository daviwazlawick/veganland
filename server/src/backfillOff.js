import { getPool, enrichProductFromOff } from './db.js';
import { fetchOffEnrichment } from './openFoodFacts.js';

const SLEEP_MS = 1000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const db = await getPool();
  if (!db) {
    console.error('No DB pool — aborting');
    process.exit(1);
  }

  const { rows } = await db.query(
    `select id, barcode, product_name, brand
       from products
      where barcode is not null
        and nutriscore_grade is null
        and nova_group is null
        and image_url is null
        and (raw->>'code') is null
      order by updated_at desc`
  );

  console.log(`Found ${rows.length} products to backfill`);
  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const label = `[${i + 1}/${rows.length}] ${r.brand || '—'} / ${r.product_name || '—'} (${r.barcode})`;
    try {
      const off = await fetchOffEnrichment(r.barcode);
      if (!off) {
        console.log(`SKIP ${label} — not in OFF`);
        skipped++;
      } else {
        await enrichProductFromOff(r.id, off);
        const tag = [
          off.nutriscore_grade && `nutri=${off.nutriscore_grade}`,
          off.nova_group && `nova=${off.nova_group}`,
          off.image_url && 'img',
          (off.raw && off.raw['energy-kcal_100g']) && 'kcal',
        ].filter(Boolean).join(' ');
        console.log(`OK   ${label} — ${tag || '(raw only)'}`);
        enriched++;
      }
    } catch (e) {
      console.log(`ERR  ${label} — ${e.message}`);
      errors++;
    }
    await sleep(SLEEP_MS);
  }

  console.log(`\nDone. enriched=${enriched} skipped=${skipped} errors=${errors}`);
  process.exit(0);
}

main();

// One-off backfill — run once after deploying the scan_event logging fixes
// in analyze.js / server.js (/analyze-plate + the "needs more photos"
// bounces). Those flows previously left zero trace in scan_events even
// though real users were doing real scans, which made admin usage stats
// (and the per-user "Total scans" column) look far lower than actual
// activity. This recovers what history still exists in other tables:
//
//   A) Plate-photo analyses already logged to consumption_log
//      (source='plate_photo') — the analysis ran and was saved to the
//      user's nutrition log, just never got a scan_event.
//   B) Product stubs created by a real user photographing a label for a
//      product not yet in our DB (products.contributor_user_id set,
//      source='user_label') — the AI ran, we saved the identity, we just
//      never logged that this happened as a scan_event.
//
// Both are plain INSERT ... SELECT ... WHERE NOT EXISTS, so re-running
// this script is safe — it only inserts rows that aren't already there.
import { getPool } from './db.js';

const pool = await getPool();
if (!pool) throw new Error('DATABASE_URL not set');

const plateResult = await pool.query(`
  INSERT INTO scan_events (product_id, user_id, profile_key, language, status, source, title, created_at)
  SELECT
    NULL,
    cl.user_id,
    NULL,
    NULL,
    'PLATE_ANALYZED',
    'plate_photo',
    cl.product_name,
    cl.consumed_at
  FROM consumption_log cl
  WHERE cl.source = 'plate_photo'
    AND cl.user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM scan_events se
      WHERE se.user_id = cl.user_id
        AND se.source = 'plate_photo'
        AND se.created_at = cl.consumed_at
    )
  RETURNING id
`);
console.log(`Backfilled ${plateResult.rowCount} plate-photo scan_events from consumption_log`);

const labelResult = await pool.query(`
  INSERT INTO scan_events (product_id, user_id, profile_key, language, status, source, title, created_at)
  SELECT
    p.id,
    p.contributor_user_id,
    NULL,
    NULL,
    'NEEDS_INGREDIENTS_PHOTO',
    'label_photo',
    COALESCE(NULLIF(TRIM(COALESCE(p.brand, '') || ' ' || COALESCE(p.product_name, '')), ''), 'Ingredients needed'),
    p.created_at
  FROM products p
  WHERE p.contributor_user_id IS NOT NULL
    AND p.source = 'user_label'
    AND NOT EXISTS (
      SELECT 1 FROM scan_events se
      WHERE se.product_id = p.id
        AND se.user_id = p.contributor_user_id
        AND se.status = 'NEEDS_INGREDIENTS_PHOTO'
    )
  RETURNING id
`);
console.log(`Backfilled ${labelResult.rowCount} needs-ingredients-photo scan_events from products`);

await pool.end();

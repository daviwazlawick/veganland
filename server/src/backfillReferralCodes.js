import { getPool } from './db.js';
import { generateReferralCode } from './referralCode.js';

const pool = await getPool();
if (!pool) throw new Error('DATABASE_URL not set');

const { rows } = await pool.query('select id from users where referral_code is null');
console.log(`Backfilling ${rows.length} users without referral codes`);

let ok = 0;
for (const u of rows) {
  let attempts = 0;
  while (attempts < 5) {
    const code = generateReferralCode();
    try {
      await pool.query('update users set referral_code = $1 where id = $2', [code, u.id]);
      ok++;
      break;
    } catch (e) {
      if (e.code === '23505') {
        attempts++;
        continue;
      }
      throw e;
    }
  }
  if (attempts >= 5) console.error(`Failed to assign code to user ${u.id} after 5 retries`);
}

console.log(`Done. ${ok}/${rows.length} codes assigned.`);
await pool.end();

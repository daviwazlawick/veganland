// One-off push: "burn equivalent" scan challenge, sent now to everyone who
// has 0 or 1 scan (never really started, or just tried the "test" scan
// once), plus the admin account unconditionally (he wants to see exactly
// what goes out). Per-locale via push_tokens.locale, EN fallback.
// Run:
//   node server/src/scripts/broadcast-challenge.mjs --dry-run
//   node server/src/scripts/broadcast-challenge.mjs
import '../env.js';
import { getPool } from '../db.js';
import { sendPushMessages } from '../water-notif.js';
import { CHALLENGE_VARIATIONS } from '../challengeContent.js';

const ADMIN_USER_ID = 2; // daviwazlawick@gmail.com
const DRY_RUN = process.argv.includes('--dry-run');
const MESSAGE = CHALLENGE_VARIATIONS[0]; // the approved "burn equivalent" copy

async function main() {
  const db = await getPool();
  const { rows } = await db.query(`
    SELECT pt.user_id, pt.token, pt.locale
    FROM push_tokens pt
    WHERE pt.user_id IS NOT NULL
      AND (
        pt.user_id = $1
        OR (SELECT count(*) FROM scan_events se WHERE se.user_id = pt.user_id) <= 1
      )
  `, [ADMIN_USER_ID]);

  console.log(`[broadcast-challenge] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} — recipients: ${rows.length}`);
  const byLocale = {};
  for (const r of rows) {
    const lang = MESSAGE[(r.locale || 'en').slice(0, 2)] ? (r.locale || 'en').slice(0, 2) : 'en';
    byLocale[lang] = (byLocale[lang] || 0) + 1;
  }
  console.log('  by locale:', byLocale);

  if (DRY_RUN) {
    console.log('\nDry run complete — nothing sent.');
    process.exit(0);
  }

  const messages = rows.map(r => {
    const lang = MESSAGE[(r.locale || 'en').slice(0, 2)] ? (r.locale || 'en').slice(0, 2) : 'en';
    const m = MESSAGE[lang];
    return {
      to: r.token,
      title: m.title,
      body: m.body,
      sound: 'default',
      data: { route: 'Scan', slot: 'challenge_broadcast_2026_09_21' },
    };
  });

  await sendPushMessages(messages);
  console.log(`[broadcast-challenge] done. attempted=${messages.length}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

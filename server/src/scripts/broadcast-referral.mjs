// Broadcast: "Free scans — invite friends" — push, per-locale, click-tracked.
// Run:
//   node server/src/scripts/broadcast-referral.mjs --dry-run   (no send, just counts)
//   node server/src/scripts/broadcast-referral.mjs --only-user=<id>   (test on one user's tokens)
//   node server/src/scripts/broadcast-referral.mjs             (send for real)
import { getPool, logPushBroadcast, updatePushBroadcastCounts } from '../db.js';

const MESSAGES = {
  en: { title: 'Free scans, on us 🎁', body: 'Invite friends and earn bonus scans. They start with extra scans too.' },
  pt: { title: 'Scans grátis pra você 🎁', body: 'Convide amigos e ganhe scans extras. Eles também começam com bônus.' },
  de: { title: 'Gratis Scans für dich 🎁', body: 'Lade Freunde ein und sammle Bonus-Scans. Sie starten auch mit Extra-Scans.' },
  fr: { title: 'Des scans offerts 🎁', body: 'Invite des amis et gagne des scans bonus. Ils démarrent aussi avec des scans en plus.' },
  it: { title: 'Scansioni gratis per te 🎁', body: 'Invita amici e guadagna scansioni bonus. Anche loro iniziano con scansioni extra.' },
  es: { title: 'Escaneos gratis para ti 🎁', body: 'Invita a amigos y gana escaneos extra. Ellos también empiezan con bonus.' },
};
const FALLBACK = 'en';
const ROUTE = 'Referral';
const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_USER = (process.argv.find(a => a.startsWith('--only-user=')) || '').split('=')[1];

async function main() {
  const db = await getPool();
  const params = [];
  let extra = '';
  if (ONLY_USER) { params.push(Number(ONLY_USER)); extra = `AND user_id = $${params.length}`; }
  const { rows } = await db.query(`
    SELECT token, locale FROM push_tokens
    WHERE token IS NOT NULL AND brand = 'novaqi'
      AND last_seen_at > now() - interval '90 days' ${extra}
  `, params);

  const groups = {};
  for (const r of rows) {
    const lang = (r.locale || '').slice(0, 2).toLowerCase();
    const key = MESSAGES[lang] ? lang : FALLBACK;
    (groups[key] = groups[key] || []).push(r.token);
  }

  console.log(`\n[push referral] ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${ONLY_USER ? ` (user ${ONLY_USER})` : ''} — total tokens: ${rows.length}`);
  for (const [lang, tokens] of Object.entries(groups)) console.log(`  ${lang}: ${tokens.length}   "${MESSAGES[lang].title}"`);
  if (DRY_RUN) { console.log('\nDry run complete — nothing sent.'); process.exit(0); }

  let totalOk = 0, totalErr = 0;
  for (const [lang, tokens] of Object.entries(groups)) {
    const { title, body } = MESSAGES[lang];
    const broadcastId = await logPushBroadcast({
      title, body, locale: lang, userType: null, route: ROUTE,
      totalCount: tokens.length, okCount: 0, errorCount: 0, invalidCount: 0, dietsFilter: [],
    });
    let langOk = 0, langErr = 0;
    for (let i = 0; i < tokens.length; i += CHUNK) {
      const messages = tokens.slice(i, i + CHUNK).map(to => ({
        to, title, body, sound: 'default',
        data: { route: ROUTE, broadcast_id: broadcastId },
      }));
      const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const json = await res.json();
      const tickets = Array.isArray(json.data) ? json.data : [];
      const ok = tickets.filter(t => t.status === 'ok').length;
      langOk += ok; langErr += tickets.length - ok;
      console.log(`  [${lang}] chunk ${i / CHUNK + 1}: ok=${ok} err=${tickets.length - ok}`);
    }
    await updatePushBroadcastCounts(broadcastId, { okCount: langOk, errorCount: langErr, invalidCount: 0 });
    totalOk += langOk; totalErr += langErr;
  }
  console.log(`\n[push referral] done. ok=${totalOk} err=${totalErr}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

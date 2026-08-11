// One-shot broadcast: NovaQI update announcement, per-locale
// Run: node server/src/scripts/broadcast-update.mjs
import { getPool } from '../db.js';

const MESSAGES = {
  pt: { title: '🚀 NovaQI actualizado!', body: 'Actualizámos o NovaQI para ser ainda mais útil. O registo de nutrição chegou! Aproveita!' },
  en: { title: '🚀 NovaQI updated!',    body: 'We just updated NovaQI to be even more useful for you. A nutrition track is in place! Enjoy!' },
  de: { title: '🚀 NovaQI aktualisiert!', body: 'Wir haben NovaQI aktualisiert — die Ernährungsverfolgung ist jetzt da! Viel Spaß damit!' },
  fr: { title: '🚀 NovaQI mis à jour !', body: 'Nous venons de mettre à jour NovaQI. Le suivi nutritionnel est là — profites-en !' },
  it: { title: '🚀 NovaQI aggiornato!', body: 'Abbiamo aggiornato NovaQI. Il monitoraggio nutrizionale è disponibile! Buon divertimento!' },
  es: { title: '🚀 ¡NovaQI actualizado!', body: '¡Acabamos de actualizar NovaQI. El seguimiento nutricional ya está disponible! ¡Disfrútalo!' },
};
const FALLBACK = 'en';
const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

async function main() {
  const db = await getPool();
  const { rows } = await db.query(`SELECT token, locale FROM push_tokens WHERE token IS NOT NULL`);

  // Group by locale
  const groups = {};
  for (const r of rows) {
    const lang = (r.locale || '').slice(0, 2).toLowerCase();
    const key = MESSAGES[lang] ? lang : FALLBACK;
    (groups[key] = groups[key] || []).push(r.token);
  }

  let totalOk = 0, totalErr = 0;

  for (const [lang, tokens] of Object.entries(groups)) {
    const { title, body } = MESSAGES[lang];
    console.log(`\n[${lang}] ${tokens.length} tokens — "${title}"`);

    for (let i = 0; i < tokens.length; i += CHUNK) {
      const chunk = tokens.slice(i, i + CHUNK);
      const messages = chunk.map(to => ({
        to, title, body,
        sound: 'default',
        data: { route: 'Home' },
      }));
      const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const json = await res.json();
      const tickets = Array.isArray(json.data) ? json.data : [];
      const ok = tickets.filter(t => t.status === 'ok').length;
      const err = tickets.filter(t => t.status !== 'ok').length;
      totalOk += ok; totalErr += err;
      console.log(`  chunk ${i / CHUNK + 1}: ✅ ${ok}  ❌ ${err}`);
    }
  }

  console.log(`\nDone. Total ✅ ${totalOk}  ❌ ${totalErr}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

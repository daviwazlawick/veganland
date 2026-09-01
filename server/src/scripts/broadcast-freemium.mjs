// Broadcast: "NovaQI basic features are now free" — push, per-locale.
// Run:
//   node server/src/scripts/broadcast-freemium.mjs --dry-run   (no send, just counts)
//   node server/src/scripts/broadcast-freemium.mjs             (send for real)
import { getPool, logPushBroadcast } from '../db.js';

const MESSAGES = {
  pt: {
    title: 'Tudo grátis no NovaQI',
    body: 'Sem scans pagos para acompanhar macros, verificar produtos, medidas e plano nutricional. Paga só se quiseres créditos extra. Abraço quentinho! — Equipa NovaQI',
  },
  en: {
    title: 'All NovaQI basic features are now free',
    body: 'Track macros, check products against your diet, log body measurements and nutrition plan — all free. Pay only if you want extra scan credits. Warm hugs! — NovaQI Team',
  },
  de: {
    title: 'Alle NovaQI-Grundfunktionen jetzt kostenlos',
    body: 'Makros verfolgen, Produkte prüfen, Körpermaße & Ernährungsplan — alles gratis. Bezahle nur für zusätzliche Scan-Credits. Herzliche Grüße! — NovaQI-Team',
  },
  fr: {
    title: 'Toutes les fonctions de base NovaQI sont gratuites',
    body: 'Suis tes macros, vérifie les produits, enregistre mesures et plan nutritionnel — tout est gratuit. Paie seulement pour des crédits de scan supplémentaires. Chaleureusement ! — L\'équipe NovaQI',
  },
  it: {
    title: 'Tutte le funzioni base di NovaQI sono gratis',
    body: 'Traccia i macro, verifica i prodotti, misure corporee e piano nutrizionale — tutto gratis. Paghi solo per crediti scan extra. Un caro abbraccio! — Team NovaQI',
  },
  es: {
    title: 'Todas las funciones básicas de NovaQI son gratis',
    body: 'Sigue tus macros, verifica productos, mide tu cuerpo y sigue tu plan nutricional — todo gratis. Paga solo por créditos de escaneo extra. ¡Un fuerte abrazo! — Equipo NovaQI',
  },
};
const FALLBACK = 'en';
const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const db = await getPool();
  // NovaQI only, active in the last 90 days
  const { rows } = await db.query(`
    SELECT token, locale, platform
    FROM push_tokens
    WHERE token IS NOT NULL
      AND brand = 'novaqi'
      AND last_seen_at > now() - interval '90 days'
  `);

  const groups = {};
  for (const r of rows) {
    const lang = (r.locale || '').slice(0, 2).toLowerCase();
    const key = MESSAGES[lang] ? lang : FALLBACK;
    (groups[key] = groups[key] || []).push(r.token);
  }

  console.log(`\n[push freemium] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} — total tokens: ${rows.length}`);
  for (const [lang, tokens] of Object.entries(groups)) {
    console.log(`  ${lang}: ${tokens.length}   "${MESSAGES[lang].title}"`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete — nothing sent.');
    process.exit(0);
  }

  let totalOk = 0, totalErr = 0;
  for (const [lang, tokens] of Object.entries(groups)) {
    const { title, body } = MESSAGES[lang];
    let langOk = 0, langErr = 0;
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
      langOk += ok; langErr += err;
      totalOk += ok; totalErr += err;
      console.log(`  [${lang}] chunk ${i / CHUNK + 1}: ok=${ok} err=${err}`);
    }
    await logPushBroadcast({
      title, body, locale: lang, userType: null, route: 'Home',
      totalCount: tokens.length, okCount: langOk, errorCount: langErr, invalidCount: 0, diets: [],
    }).catch(e => console.warn('logPushBroadcast failed:', e.message));
  }

  console.log(`\n[push freemium] done. ok=${totalOk} err=${totalErr}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

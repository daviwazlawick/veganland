// Broadcast: "NovaQI basic features are now free" — email, per-locale.
// Language picked from most recent push_tokens.locale for that user; EN fallback.
// Run:
//   node server/src/scripts/broadcast-freemium-email.mjs --dry-run
//   node server/src/scripts/broadcast-freemium-email.mjs --limit 3   (first 3 only, for a live smoke test)
//   node server/src/scripts/broadcast-freemium-email.mjs             (send for real to all)
import nodemailer from 'nodemailer';
import { getPool } from '../db.js';
import '../env.js';

const SUBJECTS = {
  pt: 'Tudo grátis no NovaQI',
  en: 'All NovaQI basic features are now free',
  de: 'Alle NovaQI-Grundfunktionen jetzt kostenlos',
  fr: 'Toutes les fonctions de base NovaQI sont gratuites',
  it: 'Tutte le funzioni base di NovaQI sono gratis',
  es: 'Todas las funciones básicas de NovaQI son gratis',
};

const INTROS = {
  pt: 'Olá!',
  en: 'Hi there!',
  de: 'Hallo!',
  fr: 'Bonjour !',
  it: 'Ciao!',
  es: '¡Hola!',
};

const BODIES = {
  pt: `Isto mesmo: agora tens tudo grátis. Não precisas de scans pagos para acompanhar os teus macros, verificar se um produto encaixa na tua dieta, registar medidas corporais ou seguir o plano nutricional.<br/><br/>Paga só se quiseres créditos extra de scan para facilitar.<br/><br/>Abraço quentinho!<br/><strong>Equipa NovaQI</strong>`,
  en: `Yes, it's all free now. You no longer need paid scans to track your macros, check if a product fits your diet, log body measurements, or follow your nutrition plan.<br/><br/>Pay only if you want extra scan credits to make things easier.<br/><br/>Warm hugs!<br/><strong>NovaQI Team</strong>`,
  de: `Alles kostenlos. Du brauchst keine bezahlten Scans mehr, um deine Makros zu verfolgen, Produkte gegen deine Ernährung zu prüfen, Körpermaße zu erfassen oder deinen Ernährungsplan zu nutzen.<br/><br/>Bezahle nur, wenn du zusätzliche Scan-Credits möchtest.<br/><br/>Herzliche Grüße!<br/><strong>NovaQI-Team</strong>`,
  fr: `Tout est gratuit maintenant. Tu n'as plus besoin de scans payants pour suivre tes macros, vérifier si un produit correspond à ton régime, enregistrer tes mesures corporelles ou suivre ton plan nutritionnel.<br/><br/>Paie seulement si tu veux des crédits de scan supplémentaires.<br/><br/>Chaleureusement !<br/><strong>L'équipe NovaQI</strong>`,
  it: `Ora è tutto gratis. Non hai più bisogno di scan a pagamento per tracciare i tuoi macro, verificare se un prodotto si adatta alla tua dieta, registrare le misure corporee o seguire il piano nutrizionale.<br/><br/>Paghi solo se vuoi crediti scan extra per facilitare le cose.<br/><br/>Un caro abbraccio!<br/><strong>Team NovaQI</strong>`,
  es: `Ahora es todo gratis. Ya no necesitas escaneos pagos para seguir tus macros, verificar si un producto encaja en tu dieta, registrar medidas corporales o seguir tu plan nutricional.<br/><br/>Paga solo si quieres créditos de escaneo extra para facilitar las cosas.<br/><br/>¡Un fuerte abrazo!<br/><strong>Equipo NovaQI</strong>`,
};

const FOOTERS = {
  pt: 'Não queres receber mais estes emails? Apaga a conta em Definições no app.',
  en: 'Not interested in these emails? Delete your account in Settings inside the app.',
  de: 'Keine solchen E-Mails mehr? Lösche dein Konto in den Einstellungen der App.',
  fr: 'Ne pas recevoir ces emails ? Supprime ton compte dans les Paramètres de l\'app.',
  it: 'Non vuoi più ricevere queste email? Elimina l\'account dalle Impostazioni nell\'app.',
  es: '¿No quieres estos emails? Elimina tu cuenta en Ajustes dentro de la app.',
};

const CTA_LABELS = {
  pt: 'Abrir App',
  en: 'Open App',
  de: 'App öffnen',
  fr: 'Ouvrir l\'app',
  it: 'Apri l\'app',
  es: 'Abrir la app',
};
const CTA_URL = 'https://novaqi.app/get';

const FALLBACK = 'en';
const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) || 0 : 0;

function buildHtml(lang) {
  const intro = INTROS[lang] || INTROS[FALLBACK];
  const body = BODIES[lang] || BODIES[FALLBACK];
  const footer = FOOTERS[lang] || FOOTERS[FALLBACK];
  const cta = CTA_LABELS[lang] || CTA_LABELS[FALLBACK];
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;color:#333;">
      <h2 style="color:#0E1B14;margin-bottom:16px;">🔍 NovaQI</h2>
      <p style="font-size:15px;margin-top:0;">${intro}</p>
      <p style="font-size:15px;line-height:1.55;">${body}</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${CTA_URL}" style="display:inline-block;background:#0E1B14;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">${cta}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#888;font-size:11px;margin:0;">${footer}</p>
    </div>
  `;
}

async function main() {
  const db = await getPool();
  const { rows } = await db.query(`
    SELECT
      u.id, u.email,
      COALESCE(LEFT(pt.locale, 2), $1) AS lang
    FROM users u
    LEFT JOIN LATERAL (
      SELECT locale FROM push_tokens pt
      WHERE pt.user_id = u.id
      ORDER BY last_seen_at DESC
      LIMIT 1
    ) pt ON true
    WHERE u.email_confirmed = true
      AND u.email IS NOT NULL
    ORDER BY u.id
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `, [FALLBACK]);

  const groups = {};
  for (const r of rows) {
    const lang = SUBJECTS[r.lang] ? r.lang : FALLBACK;
    (groups[lang] = groups[lang] || []).push({ id: r.id, email: r.email });
  }

  console.log(`\n[email freemium] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} — total recipients: ${rows.length}${LIMIT ? ` (limit ${LIMIT})` : ''}`);
  for (const [lang, list] of Object.entries(groups)) {
    console.log(`  ${lang}: ${list.length}   "${SUBJECTS[lang]}"`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete — nothing sent.');
    console.log('First 5 recipients:');
    rows.slice(0, 5).forEach(r => console.log(`  [${r.lang}] ${r.email}`));
    process.exit(0);
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.NOVAQI_SMTP_USER, pass: process.env.NOVAQI_SMTP_PASS },
  });
  const from = process.env.NOVAQI_SMTP_FROM || 'NovaQI <contact@novaqi.app>';

  let ok = 0, err = 0;
  for (const [lang, list] of Object.entries(groups)) {
    const subject = SUBJECTS[lang];
    const html = buildHtml(lang);
    for (const { email } of list) {
      try {
        await transport.sendMail({ from, to: email, subject, html });
        ok++;
        if (ok % 25 === 0) console.log(`  progress: ok=${ok} err=${err}`);
        // Small pause to be polite to SMTP
        await new Promise(r => setTimeout(r, 120));
      } catch (e) {
        err++;
        console.warn(`  fail ${email}: ${e.message}`);
      }
    }
  }

  console.log(`\n[email freemium] done. ok=${ok} err=${err}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

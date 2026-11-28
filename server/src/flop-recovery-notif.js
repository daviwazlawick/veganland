import './env.js';
import { getPool } from './db.js';
import { sendPushMessages } from './water-notif.js';

const ONBOARDING_PAYWALL_SOURCES = [
  'walkthrough_done', 'onboarding_post_scan', 'demo_skip', 'v2_plan',
  'onboarding', 'tour_done',
];

const CAMPAIGNS = [
  { id: 'flop_recovery_45min', delayMinutes: 45 },
  { id: 'flop_recovery_24h',   delayMinutes: 24 * 60 },
  { id: 'flop_recovery_72h',   delayMinutes: 72 * 60 },
];

const MESSAGES = {
  flop_recovery_45min: {
    en: { title: '💪 Try it free — no card needed',           body: '7 days free to see what your meals really do to your body. Start anytime.' },
    pt: { title: '💪 Experimenta grátis — sem cartão',        body: '7 dias grátis para veres o que as refeições fazem ao teu corpo.' },
    es: { title: '💪 Pruébalo gratis — sin tarjeta',          body: '7 días gratis para ver qué hacen tus comidas en tu cuerpo.' },
    de: { title: '💪 Kostenlos testen — keine Karte nötig',   body: '7 Tage gratis sehen, was dein Essen mit deinem Körper macht.' },
    fr: { title: '💪 Essaie gratuit — sans carte',            body: '7 jours gratuits pour voir ce que tes repas font à ton corps.' },
    it: { title: '💪 Prova gratis — nessuna carta',           body: '7 giorni gratis per vedere cosa fa il cibo al tuo corpo.' },
  },
  flop_recovery_24h: {
    en: { title: '🔥 Still thinking? Trial is free',          body: 'Hit your macros, scan your meals, track your body. Cancel anytime in 7 days.' },
    pt: { title: '🔥 Ainda a pensar? O trial é grátis',       body: 'Macros, scans, corpo controlado. Cancelas quando quiseres nos 7 dias.' },
    es: { title: '🔥 ¿Aún lo piensas? Prueba gratis',         body: 'Macros, escaneos, cuerpo bajo control. Cancela cuando quieras en 7 días.' },
    de: { title: '🔥 Noch am Überlegen? Trial ist gratis',    body: 'Makros, Scans, Körper im Griff. Kündige jederzeit in 7 Tagen.' },
    fr: { title: '🔥 Tu hésites encore ? Trial gratuit',      body: 'Macros, scans, corps sous contrôle. Annule quand tu veux en 7 jours.' },
    it: { title: '🔥 Ancora indeciso? Prova gratis',          body: 'Macro, scansioni, corpo sotto controllo. Disdici in 7 giorni.' },
  },
  flop_recovery_72h: {
    en: { title: '🌱 Change your body in 7 days — free',      body: 'Your trial is still open. No card, no commitment. Just see the difference.' },
    pt: { title: '🌱 Muda o teu corpo em 7 dias — grátis',    body: 'O trial continua aberto. Sem cartão, sem compromisso. Experimenta.' },
    es: { title: '🌱 Transforma tu cuerpo en 7 días — gratis', body: 'Tu prueba sigue abierta. Sin tarjeta, sin compromiso. Compruébalo.' },
    de: { title: '🌱 Verändere deinen Körper in 7 Tagen — gratis', body: 'Dein Trial ist noch offen. Keine Karte, kein Risiko. Probier es.' },
    fr: { title: '🌱 Change ton corps en 7 jours — gratuit',  body: 'Ton trial est toujours ouvert. Sans carte, sans engagement. Teste.' },
    it: { title: '🌱 Trasforma il tuo corpo in 7 giorni — gratis', body: 'La tua prova è ancora attiva. Nessuna carta, nessun impegno.' },
  },
};

function pickLang(locale) {
  if (!locale) return 'en';
  const base = String(locale).toLowerCase().split(/[-_]/)[0];
  return ['en', 'pt', 'es', 'de', 'fr', 'it'].includes(base) ? base : 'en';
}

async function runCampaign(campaign) {
  const db = await getPool();
  if (!db) return;

  const { rows } = await db.query(
    `WITH first_dismiss AS (
       SELECT fe.user_id, MIN(fe.created_at) AS first_at
         FROM funnel_events fe
        WHERE fe.event_type = 'paywall_dismissed'
          AND fe.metadata->>'source' = ANY($1)
          AND fe.user_id IS NOT NULL
        GROUP BY fe.user_id
     ),
     latest_token AS (
       SELECT DISTINCT ON (user_id) user_id, token, locale, platform
         FROM push_tokens
        WHERE user_id IS NOT NULL
        ORDER BY user_id, last_seen_at DESC
     )
     SELECT u.id, u.email, fd.first_at,
            lt.token, lt.locale, lt.platform
       FROM first_dismiss fd
       JOIN users u ON u.id = fd.user_id
       JOIN latest_token lt ON lt.user_id = u.id
      WHERE u.user_type IS NULL
        AND fd.first_at < now() - ($2 || ' minutes')::interval
        AND NOT EXISTS (
          SELECT 1 FROM onboarding_notification_log l
           WHERE l.user_id = u.id AND l.campaign = $3
        )
      ORDER BY fd.first_at DESC
      LIMIT 200`,
    [ONBOARDING_PAYWALL_SOURCES, String(campaign.delayMinutes), campaign.id]
  ).catch(e => { console.warn('[flop-recovery]', campaign.id, 'query', e.message); return { rows: [] }; });

  if (rows.length === 0) return;

  const messages = [];
  for (const u of rows) {
    const lang = pickLang(u.locale);
    const m = MESSAGES[campaign.id][lang] || MESSAGES[campaign.id].en;
    messages.push({
      to: u.token,
      title: m.title,
      body: m.body,
      sound: 'default',
      data: {
        route: 'Paywall',
        params: { source: campaign.id, currentPlan: 'free' },
        slot: campaign.id,
      },
    });
  }

  await sendPushMessages(messages);

  const insertValues = [];
  const params = [];
  rows.forEach((u, i) => {
    const d = new Date(u.first_at).toISOString().slice(0, 10);
    params.push(u.id, campaign.id, d);
    insertValues.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
  });
  await db.query(
    `INSERT INTO onboarding_notification_log (user_id, campaign, local_date)
     VALUES ${insertValues.join(', ')}
     ON CONFLICT DO NOTHING`,
    params
  ).catch(e => console.warn('[flop-recovery]', campaign.id, 'log', e.message));

  console.log(`[flop-recovery] ${campaign.id}: sent ${rows.length}`);
}

export async function runFlopRecoveryNotif() {
  for (const c of CAMPAIGNS) {
    await runCampaign(c);
  }
}

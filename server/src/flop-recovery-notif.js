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
    en: { title: '💪 Try it free for 2 weeks',                   body: 'No charge during the trial. Cancel anytime.' },
    pt: { title: '💪 Experimenta grátis 2 semanas',              body: 'Nada é cobrado durante o teste. Cancelas quando quiseres.' },
    es: { title: '💪 Pruébalo gratis 2 semanas',                 body: 'Nada se cobra durante la prueba. Cancela cuando quieras.' },
    de: { title: '💪 2 Wochen gratis testen',                    body: 'Nichts wird während des Testzeitraums abgerechnet. Jederzeit kündbar.' },
    fr: { title: '💪 Essaie 2 semaines gratuit',                 body: 'Rien n\'est facturé pendant l\'essai. Annule quand tu veux.' },
    it: { title: '💪 Prova gratis 2 settimane',                  body: 'Nessun addebito durante la prova. Disdici quando vuoi.' },
  },
  flop_recovery_24h: {
    en: { title: '🔥 Still thinking? Trial is free',             body: 'Macros, scans, body tracking. 2 weeks free, cancel anytime.' },
    pt: { title: '🔥 Ainda a pensar? O trial é grátis',          body: 'Macros, scans, corpo controlado. 2 semanas grátis, cancelas quando quiseres.' },
    es: { title: '🔥 ¿Aún lo piensas? Prueba gratis',            body: 'Macros, escaneos, control corporal. 2 semanas gratis, cancela cuando quieras.' },
    de: { title: '🔥 Noch am Überlegen? Trial ist gratis',       body: 'Makros, Scans, Körperkontrolle. 2 Wochen gratis, jederzeit kündbar.' },
    fr: { title: '🔥 Tu hésites encore ? Trial gratuit',         body: 'Macros, scans, suivi du corps. 2 semaines gratuites, annule quand tu veux.' },
    it: { title: '🔥 Ancora indeciso? Prova gratis',             body: 'Macro, scansioni, controllo del corpo. 2 settimane gratis, disdici quando vuoi.' },
  },
  flop_recovery_72h: {
    en: { title: '🌱 Change your body in 2 weeks — free',        body: 'Trial still open. No charge during the trial. Just see the difference.' },
    pt: { title: '🌱 Muda o teu corpo em 2 semanas — grátis',    body: 'Trial ainda aberto. Nada é cobrado durante o teste. Experimenta.' },
    es: { title: '🌱 Transforma tu cuerpo en 2 semanas — gratis', body: 'Prueba sigue abierta. Nada se cobra durante la prueba.' },
    de: { title: '🌱 Verändere deinen Körper in 2 Wochen — gratis', body: 'Trial noch offen. Nichts wird während des Testzeitraums abgerechnet.' },
    fr: { title: '🌱 Change ton corps en 2 semaines — gratuit',  body: 'Trial toujours ouvert. Rien n\'est facturé pendant l\'essai.' },
    it: { title: '🌱 Trasforma il tuo corpo in 2 settimane — gratis', body: 'Prova ancora attiva. Nessun addebito durante la prova.' },
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

  // Trigger: first paywall_shown with known source, OR user.created_at if
  // zero paywall funnel events (older app builds without tracking).
  const { rows } = await db.query(
    `WITH first_shown AS (
       SELECT fe.user_id, MIN(fe.created_at) AS first_at
         FROM funnel_events fe
        WHERE fe.event_type = 'paywall_shown'
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
     SELECT u.id, u.email,
            COALESCE(fs.first_at, u.created_at) AS first_at,
            lt.token, lt.locale, lt.platform
       FROM users u
       LEFT JOIN first_shown fs ON fs.user_id = u.id
       JOIN latest_token lt ON lt.user_id = u.id
      WHERE u.user_type IS NULL
        AND COALESCE(fs.first_at, u.created_at) < now() - ($2 || ' minutes')::interval
        AND NOT EXISTS (
          SELECT 1 FROM onboarding_notification_log l
           WHERE l.user_id = u.id AND l.campaign = $3
        )
      ORDER BY COALESCE(fs.first_at, u.created_at) DESC
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

  // Emit funnel event per real send so conversion monitoring can
  // distinguish real sends from backfilled dedup rows.
  for (const u of rows) {
    await db.query(
      `INSERT INTO funnel_events (user_id, event_type, brand, metadata)
       VALUES ($1, 'recovery_push_sent', 'novaqi', $2)`,
      [u.id, { campaign: campaign.id, locale: u.locale, platform: u.platform, first_at: u.first_at }]
    ).catch(e => console.warn('[flop-recovery]', campaign.id, 'funnel', e.message));
  }

  console.log(`[flop-recovery] ${campaign.id}: sent ${rows.length}`);
}

export async function runFlopRecoveryNotif() {
  for (const c of CAMPAIGNS) {
    await runCampaign(c);
  }
}

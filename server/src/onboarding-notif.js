import './env.js';
import { getPool } from './db.js';
import { sendPushMessages } from './water-notif.js';
import { pickChallengeVariation } from './challengeContent.js';

// Daily reminders for users stuck before the two "aha" moments: their first
// scan, and setting up a body profile. Each fires once per local day per
// user and stops on its own once the user does the thing (the NOT EXISTS
// query below simply no longer matches them) — except the admin, who is
// always included so he can see exactly what goes out and how it arrives.
const ADMIN_USER_ID = 2; // daviwazlawick@gmail.com
const WINDOW_MINUTES = 20;

// The scan-challenge fires at a different local hour each day (rotates
// through this list by day-of-year) so it doesn't feel like the exact same
// robotic ping every day.
const CHALLENGE_TIMES_MIN = [9 * 60 + 30, 11 * 60, 14 * 60, 17 * 60 + 30, 20 * 60];
function todaysChallengeMinutes() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return CHALLENGE_TIMES_MIN[dayOfYear % CHALLENGE_TIMES_MIN.length];
}

function firstScanMessage(locale) {
  const variation = pickChallengeVariation();
  const lang = variation[locale] ? locale : 'en';
  return variation[lang];
}

function bodyProfileMessage(locale) {
  const T = {
    pt: { title: '📊 Perfil corporal grátis', body: 'Configura o teu perfil corporal grátis e recebe metas de calorias e macros feitas para ti.' },
    en: { title: '📊 Free body profile', body: 'Set up your body profile for free and get calorie & macro goals made for you.' },
    de: { title: '📊 Kostenloses Körperprofil', body: 'Richte dein Körperprofil kostenlos ein und erhalte persönliche Kalorien- und Makroziele.' },
    fr: { title: '📊 Profil corporel gratuit', body: 'Configurez votre profil corporel gratuitement et recevez des objectifs caloriques et macro sur mesure.' },
    it: { title: '📊 Profilo corporeo gratis', body: 'Configura il tuo profilo corporeo gratis e ricevi obiettivi calorici e di macro pensati per te.' },
    es: { title: '📊 Perfil corporal gratis', body: 'Configura tu perfil corporal gratis y recibe metas de calorías y macros hechas para ti.' },
  };
  return T[locale] || T.en;
}

export async function runOnboardingNotifications() {
  const db = await getPool();
  if (!db) return;

  const now = new Date();
  const CAMPAIGNS = [
    { name: 'first_scan_reminder',   minutes: todaysChallengeMinutes() },
    { name: 'body_profile_reminder', minutes: 16 * 60 },
  ];

  const [{ rows: neverScanned }, { rows: noBodyProfile }] = await Promise.all([
    db.query(`
      SELECT pt.user_id, pt.token, pt.locale, pt.timezone
      FROM push_tokens pt
      WHERE pt.user_id IS NOT NULL AND pt.timezone IS NOT NULL
        AND (pt.user_id = $1 OR NOT EXISTS (SELECT 1 FROM scan_events se WHERE se.user_id = pt.user_id))
    `, [ADMIN_USER_ID]).catch(() => ({ rows: [] })),
    db.query(`
      SELECT pt.user_id, pt.token, pt.locale, pt.timezone
      FROM push_tokens pt
      WHERE pt.user_id IS NOT NULL AND pt.timezone IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM user_body_profile bp WHERE bp.user_id = pt.user_id)
    `).catch(() => ({ rows: [] })),
  ]);

  const candidateSets = [
    { rows: neverScanned, campaign: CAMPAIGNS[0] },
    { rows: noBodyProfile, campaign: CAMPAIGNS[1] },
  ];

  const eligible = [];
  for (const { rows, campaign } of candidateSets) {
    for (const u of rows) {
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric', minute: 'numeric', hour12: false, timeZone: u.timezone,
        });
        const parts = fmt.formatToParts(now);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        const localMinutes = h * 60 + m;
        if (Math.abs(localMinutes - campaign.minutes) > WINDOW_MINUTES) continue;
        const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: u.timezone }).format(now);
        eligible.push({ ...u, campaign: campaign.name, localDate });
      } catch { /* invalid timezone */ }
    }
  }

  if (eligible.length === 0) return;

  const userIds = [...new Set(eligible.map(u => u.user_id))];
  const { rows: sentRows } = await db.query(`
    SELECT user_id, campaign, local_date::text
    FROM onboarding_notification_log
    WHERE user_id = ANY($1) AND sent_at >= NOW() - INTERVAL '2 days'
  `, [userIds]).catch(() => ({ rows: [] }));
  const sentSet = new Set(sentRows.map(r => `${r.user_id}:${r.campaign}:${r.local_date}`));

  const messages = [];
  const toLog = [];

  for (const u of eligible) {
    const key = `${u.user_id}:${u.campaign}:${u.localDate}`;
    if (sentSet.has(key)) continue;

    const isFirstScan = u.campaign === 'first_scan_reminder';
    const msg = isFirstScan ? firstScanMessage(u.locale || 'en') : bodyProfileMessage(u.locale || 'en');

    messages.push({
      to: u.token,
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: { route: isFirstScan ? 'Scan' : 'EditPersonal', slot: u.campaign },
    });
    toLog.push({ userId: u.user_id, campaign: u.campaign, localDate: u.localDate });
  }

  if (messages.length === 0) return;

  console.log(`[onboarding-notif] Sending ${messages.length} reminders at ${now.toISOString()}`);
  await sendPushMessages(messages);

  for (const entry of toLog) {
    await db.query(
      `INSERT INTO onboarding_notification_log (user_id, campaign, local_date)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [entry.userId, entry.campaign, entry.localDate]
    ).catch(() => {});
  }
}

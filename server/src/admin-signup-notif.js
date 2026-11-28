import './env.js';
import { getPool } from './db.js';
import { sendPushMessages } from './water-notif.js';

const ADMIN_USER_ID = 2;

const ONBOARDING_PAYWALL_SOURCES = [
  'walkthrough_done', 'onboarding_post_scan', 'demo_skip', 'v2_plan',
  'onboarding', 'tour_done',
];
const FLOP_DELAY_MINUTES = 10;
const FLOP_NOTIFIED_EVENT = 'admin_flop_notified';
const TRIAL_NOTIFIED_EVENT = 'admin_trial_notified';

async function getAdminTokens() {
  const db = await getPool();
  if (!db) return [];
  const { rows } = await db.query(
    `SELECT token FROM push_tokens WHERE user_id = $1 ORDER BY last_seen_at DESC`,
    [ADMIN_USER_ID]
  ).catch(() => ({ rows: [] }));
  return rows.map(r => r.token).filter(Boolean);
}

function minutesAgo(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return Math.round((Date.now() - d.getTime()) / 60000);
}

function flagFromLocale(locale) {
  if (!locale || typeof locale !== 'string') return '';
  const cc = locale.toUpperCase().split(/[-_]/)[1];
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...[...cc].map(c => 0x1F1A5 + c.charCodeAt(0)));
}

async function pushToAdmin({ title, body, data }) {
  const tokens = await getAdminTokens();
  if (tokens.length === 0) {
    console.warn('[admin-signup-notif] no admin push tokens');
    return;
  }
  await sendPushMessages(tokens.map(to => ({
    to, title, body, sound: 'default', data: data || {},
  })));
}

export async function notifyAdminTrialStarted({ userId, plan, entitlementId, eventType }) {
  if (!userId) return;
  const db = await getPool();
  if (!db) return;

  const { rows: dupRows } = await db.query(
    `SELECT 1 FROM funnel_events
      WHERE user_id = $1 AND event_type = $2
      LIMIT 1`,
    [userId, TRIAL_NOTIFIED_EVENT]
  ).catch(() => ({ rows: [] }));
  if (dupRows.length > 0) return;

  const { rows: userRows } = await db.query(
    `SELECT u.id, u.email, u.name, u.created_at, u.platform_os, u.utm_source, u.utm_campaign,
            (SELECT locale FROM push_tokens WHERE user_id = u.id ORDER BY last_seen_at DESC LIMIT 1) AS locale,
            (SELECT count(*) FROM scan_events WHERE user_id = u.id)::int AS scan_count
       FROM users u WHERE u.id = $1`,
    [userId]
  ).catch(() => ({ rows: [] }));
  const u = userRows[0];
  if (!u) return;

  const flag = flagFromLocale(u.locale);
  const mins = minutesAgo(u.created_at);
  const timeStr = mins == null ? '' : mins < 60 ? `${mins}min` : mins < 60 * 24 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  const utm = u.utm_source ? ` · ${u.utm_source}${u.utm_campaign ? '/' + u.utm_campaign : ''}` : '';

  await pushToAdmin({
    title: `💸 Trial iniciado: ${plan}`,
    body: `${flag ? flag + ' ' : ''}${u.email} · ${u.platform_os || '?'} · ${u.scan_count} scans · ${timeStr} desde signup${utm}`,
    data: { route: 'AdminUserDetail', userId: String(userId), kind: 'trial_started', plan, entitlementId, eventType },
  });

  await db.query(
    `INSERT INTO funnel_events (user_id, event_type, brand, metadata)
     VALUES ($1, $2, 'novaqi', $3)`,
    [userId, TRIAL_NOTIFIED_EVENT, { plan, entitlementId, eventType }]
  ).catch(e => console.warn('[admin-signup-notif] trial log failed', e.message));
}

export async function runAdminFlopNotif() {
  const db = await getPool();
  if (!db) return;

  // Trigger: first paywall_shown with a known source, OR user.created_at if
  // the user has zero paywall funnel events (older app builds without
  // tracking — treated as "reached paywall" per product decision).
  const { rows } = await db.query(
    `WITH first_shown AS (
       SELECT fe.user_id, MIN(fe.created_at) AS first_at
         FROM funnel_events fe
        WHERE fe.event_type = 'paywall_shown'
          AND fe.metadata->>'source' = ANY($1)
        GROUP BY fe.user_id
     )
     SELECT u.id, u.email, u.name, u.created_at, u.platform_os, u.utm_source, u.utm_campaign,
            COALESCE(fs.first_at, u.created_at) AS first_at,
            (fs.first_at IS NULL) AS no_tracking,
            (SELECT locale FROM push_tokens WHERE user_id = u.id ORDER BY last_seen_at DESC LIMIT 1) AS locale,
            (SELECT count(*) FROM scan_events WHERE user_id = u.id)::int AS scan_count
       FROM users u
       LEFT JOIN first_shown fs ON fs.user_id = u.id
      WHERE u.user_type IS NULL
        AND COALESCE(fs.first_at, u.created_at) < now() - ($2 || ' minutes')::interval
        AND NOT EXISTS (
          SELECT 1 FROM funnel_events ne
           WHERE ne.user_id = u.id AND ne.event_type = $3
        )
      ORDER BY COALESCE(fs.first_at, u.created_at) DESC
      LIMIT 20`,
    [ONBOARDING_PAYWALL_SOURCES, String(FLOP_DELAY_MINUTES), FLOP_NOTIFIED_EVENT]
  ).catch(e => { console.warn('[admin-signup-notif] flop query', e.message); return { rows: [] }; });

  if (rows.length === 0) return;

  for (const u of rows) {
    const flag = flagFromLocale(u.locale);
    const minsSinceSignup = minutesAgo(u.created_at);
    const minsSinceShown = minutesAgo(u.first_at);
    const sinceSignup = minsSinceSignup == null ? '' : minsSinceSignup < 60 ? `${minsSinceSignup}min` : `${Math.round(minsSinceSignup / 60)}h`;
    const utm = u.utm_source ? ` · ${u.utm_source}${u.utm_campaign ? '/' + u.utm_campaign : ''}` : '';
    const trackingSuffix = u.no_tracking ? ' · sem funnel tracking' : '';

    await pushToAdmin({
      title: `🚪 Paywall flop`,
      body: `${flag ? flag + ' ' : ''}${u.email} · ${u.platform_os || '?'} · ${u.scan_count} scans · ${minsSinceShown}min no paywall sem plano${trackingSuffix} · signup há ${sinceSignup}${utm}`,
      data: { route: 'AdminUserDetail', userId: String(u.id), kind: 'paywall_flop' },
    });

    await db.query(
      `INSERT INTO funnel_events (user_id, event_type, brand, metadata)
       VALUES ($1, $2, 'novaqi', $3)`,
      [u.id, FLOP_NOTIFIED_EVENT, { first_shown_at: u.first_at, scan_count: u.scan_count, no_tracking: u.no_tracking }]
    ).catch(e => console.warn('[admin-signup-notif] flop log failed', e.message));
  }
}

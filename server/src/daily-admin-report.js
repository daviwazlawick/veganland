import './env.js';
import { getPool } from './db.js';
import { sendPushMessages } from './water-notif.js';

// One push per day to the admin, summarizing yesterday's usage: new
// signups, active users, scans, plate analyses. Fires once at 08:00 in the
// admin's own local timezone (from his push_tokens row), reusing the
// existing onboarding_notification_log table for the once-per-day dedupe
// (campaign='daily_admin_report') — no new table needed.
const ADMIN_USER_ID = 2; // daviwazlawick@gmail.com
const REPORT_MINUTES = 8 * 60; // 08:00
const WINDOW_MINUTES = 20;
const CAMPAIGN = 'daily_admin_report';

export async function runDailyAdminReport() {
  const db = await getPool();
  if (!db) return;

  const { rows: ptRows } = await db.query(
    `SELECT token, timezone FROM push_tokens WHERE user_id = $1 AND timezone IS NOT NULL ORDER BY last_seen_at DESC LIMIT 1`,
    [ADMIN_USER_ID]
  ).catch(() => ({ rows: [] }));
  const admin = ptRows[0];
  if (!admin) return;

  const now = new Date();
  let localMinutes, localDate;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: admin.timezone });
    const parts = fmt.formatToParts(now);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    localMinutes = h * 60 + m;
    localDate = new Intl.DateTimeFormat('en-CA', { timeZone: admin.timezone }).format(now);
  } catch { return; }

  if (Math.abs(localMinutes - REPORT_MINUTES) > WINDOW_MINUTES) return;

  const { rows: sentRows } = await db.query(
    `SELECT 1 FROM onboarding_notification_log WHERE user_id = $1 AND campaign = $2 AND local_date = $3`,
    [ADMIN_USER_ID, CAMPAIGN, localDate]
  ).catch(() => ({ rows: [] }));
  if (sentRows.length > 0) return;

  const [{ rows: statRows }, { rows: topRows }] = await Promise.all([
    db.query(`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE $1) - interval '1 day' AS local_start,
          date_trunc('day', now() AT TIME ZONE $1)                    AS local_end
      )
      SELECT
        (SELECT count(*) FROM users u, bounds b
          WHERE (u.created_at AT TIME ZONE $1) >= b.local_start AND (u.created_at AT TIME ZONE $1) < b.local_end
        ) AS new_users,
        (SELECT count(*) FROM scan_events se, bounds b
          WHERE (se.created_at AT TIME ZONE $1) >= b.local_start AND (se.created_at AT TIME ZONE $1) < b.local_end
        ) AS scans,
        (SELECT count(*) FROM consumption_log cl, bounds b
          WHERE cl.source = 'plate_photo' AND (cl.consumed_at AT TIME ZONE $1) >= b.local_start AND (cl.consumed_at AT TIME ZONE $1) < b.local_end
        ) AS plates,
        (SELECT count(DISTINCT user_id) FROM (
            SELECT user_id, created_at AS at FROM scan_events
            UNION ALL
            SELECT user_id, consumed_at AS at FROM consumption_log
          ) activity, bounds b
          WHERE activity.user_id IS NOT NULL
            AND (activity.at AT TIME ZONE $1) >= b.local_start AND (activity.at AT TIME ZONE $1) < b.local_end
        ) AS active_users
    `, [admin.timezone]).catch(() => ({ rows: [] })),
    // Top 5 most active users of the day (by scans + plate/food logs),
    // excluding the admin himself — his own testing activity would
    // otherwise dominate the list and hide real usage.
    db.query(`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE $1) - interval '1 day' AS local_start,
          date_trunc('day', now() AT TIME ZONE $1)                    AS local_end
      ),
      activity AS (
        SELECT user_id, created_at AS at FROM scan_events
        UNION ALL
        SELECT user_id, consumed_at AS at FROM consumption_log
      )
      SELECT u.id, u.email, u.name, count(*)::int AS activity_count
      FROM activity a
      JOIN users u ON u.id = a.user_id, bounds b
      WHERE a.user_id IS NOT NULL AND a.user_id != $2
        AND (a.at AT TIME ZONE $1) >= b.local_start AND (a.at AT TIME ZONE $1) < b.local_end
      GROUP BY u.id, u.email, u.name
      ORDER BY activity_count DESC
      LIMIT 5
    `, [admin.timezone, ADMIN_USER_ID]).catch(() => ({ rows: [] })),
  ]);

  const stats = statRows[0];
  if (!stats) return;

  const { new_users, scans, plates, active_users } = stats;
  const title = '📊 Resumo de ontem';
  let body = `${active_users} pessoas ativas · ${scans} scans${plates > 0 ? ` (+${plates} pratos)` : ''} · ${new_users} cadastros novos.`;
  if (topRows.length > 0) {
    const names = topRows.map(r => `${r.name || r.email.split('@')[0]} (${r.activity_count})`).join(', ');
    body += `\nTop: ${names}`;
  }

  await sendPushMessages([{
    to: admin.token,
    title,
    body,
    sound: 'default',
    data: { route: 'Home', slot: CAMPAIGN },
  }]);

  await db.query(
    `INSERT INTO onboarding_notification_log (user_id, campaign, local_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [ADMIN_USER_ID, CAMPAIGN, localDate]
  ).catch(() => {});
}

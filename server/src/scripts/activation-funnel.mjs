// Evergreen push funnels. Two tracks share this script and the
// reactivation_sends table:
//
//   activation   — signup ≥3d ago, zero scan/body/funnel ever.
//                  3 cycles × 5 steps, cycles at days 0/30/60 of first send.
//   reactivation — had activity, dormant ≥7d.
//                  1 cycle × 5 steps (lifetime; they already know the app).
//
// Both share step cadence (days from cycle start): 0, 1, 6, 10, 15
// Both send at user's local 11:00 (via push_tokens.timezone).
// Both stop immediately when the user re-engages (eligibility query re-runs
// each tick, so an activated user drops out of the candidate pool).
//
// Routes per step (both tracks, same routes):
//   1 PlateAnalysis   2 BodyAnalysis   3 PlateAnalysis
//   4 NutritionDashboard   5 PlateAnalysis
//
// Modes:
//   node activation-funnel.mjs                 — hourly run (both tracks)
//   node activation-funnel.mjs --dry-run       — simulate, no send
//   node activation-funnel.mjs --backfill      — show who is eligible per track
//   node activation-funnel.mjs --report        — email weekly report
//   node activation-funnel.mjs --force-hour=N  — override local-hour gate (debug)
//   node activation-funnel.mjs --track=X       — only run track X (debug)
import '../env.js';
import nodemailer from 'nodemailer';
import { getPool, logPushBroadcast, updatePushBroadcastCounts } from '../db.js';

const DRY_RUN = process.argv.includes('--dry-run');
const BACKFILL = process.argv.includes('--backfill');
const REPORT = process.argv.includes('--report');
const FORCE_HOUR_ARG = process.argv.find(a => a.startsWith('--force-hour='));
const FORCE_HOUR = FORCE_HOUR_ARG ? Number(FORCE_HOUR_ARG.split('=')[1]) : null;
const TRACK_ARG = process.argv.find(a => a.startsWith('--track='));
const ONLY_TRACK = TRACK_ARG ? TRACK_ARG.split('=')[1] : null;

const SEND_LOCAL_HOUR = 11;
const PUSH_ALIVE_DAYS = 60;
const REPORT_TO = 'contact@novaqi.app';
const STEP_DAYS = { 1: 0, 2: 1, 3: 6, 4: 10, 5: 15 };
const STEP_ROUTE = { 1: 'PlateAnalysis', 2: 'BodyAnalysis', 3: 'PlateAnalysis', 4: 'NutritionDashboard', 5: 'PlateAnalysis' };
const FALLBACK_LANG = 'en';
const SUPPORTED_LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it'];

const MESSAGES = {
  activation: {
    1: {
      en: { title: "What's really on your plate?", body: "Snap your meal. Protein, carbs, fat — 5 seconds." },
      pt: { title: "O que está mesmo no teu prato?", body: "Fotografa a refeição. Proteína, hidratos, gordura — 5 segundos." },
      es: { title: "¿Qué hay realmente en tu plato?", body: "Fotografía la comida. Proteína, carbos, grasa — 5 segundos." },
      fr: { title: "Qu'y a-t-il vraiment dans ton assiette ?", body: "Prends ton repas en photo. Protéines, glucides, lipides — 5 secondes." },
      de: { title: "Was ist wirklich auf deinem Teller?", body: "Mahlzeit fotografieren. Protein, Kohlenhydrate, Fett — 5 Sekunden." },
      it: { title: "Cosa c'è davvero nel tuo piatto?", body: "Fotografa il pasto. Proteine, carboidrati, grassi — 5 secondi." },
    },
    2: {
      en: { title: "Your body, in numbers", body: "One photo → BMI, body fat %, lean mass, BMR." },
      pt: { title: "O teu corpo, em números", body: "Uma foto → IMC, gordura %, massa magra, metabolismo basal." },
      es: { title: "Tu cuerpo, en números", body: "Una foto → IMC, grasa %, masa magra, metabolismo basal." },
      fr: { title: "Ton corps, en chiffres", body: "Une photo → IMC, masse grasse %, masse maigre, métabolisme de base." },
      de: { title: "Dein Körper, in Zahlen", body: "Ein Foto → BMI, Körperfett %, Muskelmasse, Grundumsatz." },
      it: { title: "Il tuo corpo, in numeri", body: "Una foto → BMI, grasso %, massa magra, metabolismo basale." },
    },
    3: {
      en: { title: "You're eating ~400 kcal more than you think", body: "Most people are. Scan a meal and see." },
      pt: { title: "Comes ~400 kcal mais do que pensas", body: "A maioria come. Scaneia uma refeição e vê." },
      es: { title: "Comes ~400 kcal más de lo que crees", body: "La mayoría lo hace. Escanea una comida y compruébalo." },
      fr: { title: "Tu manges ~400 kcal de plus que tu crois", body: "La plupart le font. Scanne un repas et vois." },
      de: { title: "Du isst ~400 kcal mehr als du denkst", body: "Die meisten tun das. Scanne eine Mahlzeit und sieh selbst." },
      it: { title: "Mangi ~400 kcal in più di quanto pensi", body: "La maggior parte lo fa. Scansiona un pasto e vedi." },
    },
    4: {
      en: { title: "7 days from now", body: "You could know every macro you've eaten. Starts with one scan." },
      pt: { title: "Daqui a 7 dias", body: "Podias saber cada macro que comeste. Começa com um scan." },
      es: { title: "En 7 días", body: "Podrías conocer cada macro que has comido. Empieza con un escaneo." },
      fr: { title: "Dans 7 jours", body: "Tu pourrais connaître chaque macro mangé. Ça commence par un scan." },
      de: { title: "In 7 Tagen", body: "Könntest du jedes Makro kennen, das du gegessen hast. Beginnt mit einem Scan." },
      it: { title: "Fra 7 giorni", body: "Potresti sapere ogni macro che hai mangiato. Comincia con una scansione." },
    },
    5: {
      en: { title: "Last ping.", body: "One meal, one scan — then we're quiet." },
      pt: { title: "Último toque.", body: "Uma refeição, um scan — depois ficamos quietos." },
      es: { title: "Último aviso.", body: "Una comida, un escaneo — y te dejamos tranquilo." },
      fr: { title: "Dernier message.", body: "Un repas, un scan — ensuite on te laisse tranquille." },
      de: { title: "Letzte Nachricht.", body: "Eine Mahlzeit, ein Scan — dann sind wir still." },
      it: { title: "Ultimo messaggio.", body: "Un pasto, una scansione — poi stiamo zitti." },
    },
  },
  reactivation: {
    1: {
      en: { title: "We miss you", body: "Your macros are still here. One plate." },
      pt: { title: "Sentimos a tua falta", body: "Os teus macros continuam cá. Uma refeição." },
      es: { title: "Te echamos de menos", body: "Tus macros siguen aquí. Un plato." },
      fr: { title: "Tu nous manques", body: "Tes macros sont toujours là. Une assiette." },
      de: { title: "Wir vermissen dich", body: "Deine Makros sind noch da. Ein Teller." },
      it: { title: "Ci manchi", body: "I tuoi macro sono ancora qui. Un piatto." },
    },
    2: {
      en: { title: "7 days, no data", body: "Your body stats are frozen. 30 seconds to refresh." },
      pt: { title: "7 dias, zero dados", body: "O teu corpo está parado nos números. 30 segundos para actualizar." },
      es: { title: "7 días, cero datos", body: "Tus números corporales están congelados. 30 segundos para refrescarlos." },
      fr: { title: "7 jours, zéro donnée", body: "Tes stats corporelles sont figées. 30 secondes pour les rafraîchir." },
      de: { title: "7 Tage, keine Daten", body: "Deine Körperwerte sind eingefroren. 30 Sekunden zum Auffrischen." },
      it: { title: "7 giorni, zero dati", body: "Le tue misure corporee sono ferme. 30 secondi per aggiornarle." },
    },
    3: {
      en: { title: "You know this already", body: "One scan, one answer. You've done it before." },
      pt: { title: "Já sabes como funciona", body: "Um scan, uma resposta. Já o fizeste antes." },
      es: { title: "Ya sabes cómo va", body: "Un escaneo, una respuesta. Lo has hecho antes." },
      fr: { title: "Tu connais déjà le truc", body: "Un scan, une réponse. Tu l'as déjà fait." },
      de: { title: "Du kennst das schon", body: "Ein Scan, eine Antwort. Du hast es schon gemacht." },
      it: { title: "Lo sai già come funziona", body: "Una scansione, una risposta. L'hai già fatto." },
    },
    4: {
      en: { title: "Progress needs data", body: "Even one scan today keeps the trend alive." },
      pt: { title: "Progresso precisa de dados", body: "Um scan hoje mantém a tendência viva." },
      es: { title: "El progreso necesita datos", body: "Un escaneo hoy mantiene la tendencia viva." },
      fr: { title: "Le progrès a besoin de données", body: "Un scan aujourd'hui garde la tendance en vie." },
      de: { title: "Fortschritt braucht Daten", body: "Ein Scan heute hält den Trend am Leben." },
      it: { title: "Il progresso ha bisogno di dati", body: "Una scansione oggi tiene viva la tendenza." },
    },
    5: {
      en: { title: "Still here when you are", body: "No pressure." },
      pt: { title: "Aqui à tua espera", body: "Sem pressão." },
      es: { title: "Aquí cuando estés", body: "Sin presión." },
      fr: { title: "On est là quand tu es prêt", body: "Pas de pression." },
      de: { title: "Da wenn du bereit bist", body: "Kein Druck." },
      it: { title: "Qui quando sei pronto", body: "Nessuna pressione." },
    },
  },
};

const TRACKS = {
  activation: {
    maxCycle: 3,
    cycleGapDays: 30,
    campaign: 'activation_health_v1',
    label: 'activation',
    // Eligibility: signed up ≥3d, zero scan+body+funnel event ever
    eligibilitySql: `
      SELECT u.id, u.created_at AS context_date
      FROM users u
      LEFT JOIN scan_events s ON s.user_id = u.id
      LEFT JOIN body_measurements b ON b.user_id = u.id
      LEFT JOIN funnel_events f ON f.user_id = u.id
      WHERE u.created_at <= NOW() - INTERVAL '3 days'
      GROUP BY u.id
      HAVING COUNT(s.id) = 0 AND COUNT(b.id) = 0 AND COUNT(f.id) = 0
    `,
  },
  reactivation: {
    maxCycle: 1,
    cycleGapDays: null,
    campaign: 'reactivation_health_v1',
    label: 'reactivation',
    // Eligibility: had activity, dormant ≥7d (last activity before 7d ago)
    eligibilitySql: `
      SELECT u.id, MAX(GREATEST(
        COALESCE(s.created_at, '1970-01-01'::timestamptz),
        COALESCE(b.recorded_at, '1970-01-01'::timestamptz),
        COALESCE(f.created_at, '1970-01-01'::timestamptz)
      )) AS context_date
      FROM users u
      LEFT JOIN scan_events s ON s.user_id = u.id
      LEFT JOIN body_measurements b ON b.user_id = u.id
      LEFT JOIN funnel_events f ON f.user_id = u.id
      GROUP BY u.id
      HAVING MAX(GREATEST(
        COALESCE(s.created_at, '1970-01-01'::timestamptz),
        COALESCE(b.recorded_at, '1970-01-01'::timestamptz),
        COALESCE(f.created_at, '1970-01-01'::timestamptz)
      )) <= NOW() - INTERVAL '7 days'
      AND MAX(GREATEST(
        COALESCE(s.created_at, '1970-01-01'::timestamptz),
        COALESCE(b.recorded_at, '1970-01-01'::timestamptz),
        COALESCE(f.created_at, '1970-01-01'::timestamptz)
      )) > '1970-01-01'::timestamptz
    `,
  },
};

function pickLang(locale) {
  const lang = (locale || FALLBACK_LANG).slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
}

function dueStep(daysIntoCycle) {
  if (daysIntoCycle < 0) return 0;
  let s = 0;
  for (const [step, day] of Object.entries(STEP_DAYS)) {
    if (daysIntoCycle >= day) s = Math.max(s, Number(step));
  }
  return s;
}

async function fetchCandidates(db, trackCfg) {
  const hourClause = FORCE_HOUR !== null
    ? `TRUE`
    : `EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(pt.timezone,'UTC')))::int = ${SEND_LOCAL_HOUR}`;

  const q = `
    WITH eligible AS (
      ${trackCfg.eligibilitySql}
    ),
    tokens AS (
      SELECT DISTINCT ON (pt.user_id)
        pt.user_id, pt.token, pt.locale, pt.timezone, pt.platform, pt.last_seen_at
      FROM push_tokens pt
      WHERE pt.user_id IN (SELECT id FROM eligible)
        AND pt.last_seen_at >= NOW() - ($1 || ' days')::interval
        AND pt.token LIKE 'ExponentPushToken%'
        AND ${hourClause}
      ORDER BY pt.user_id, pt.last_seen_at DESC
    ),
    last_sends AS (
      SELECT user_id,
             MIN(sent_at) AS funnel_started_at,
             MAX(sent_at) AS last_sent_at,
             (ARRAY_AGG(cycle ORDER BY sent_at DESC))[1] AS last_cycle,
             (ARRAY_AGG(step ORDER BY sent_at DESC))[1] AS last_step
      FROM reactivation_sends
      WHERE track = $2
      GROUP BY user_id
    )
    SELECT t.user_id, t.token, t.locale, t.timezone, t.platform,
           e.context_date,
           ls.funnel_started_at, ls.last_sent_at, ls.last_cycle, ls.last_step
    FROM tokens t
    JOIN eligible e ON e.id = t.user_id
    LEFT JOIN last_sends ls ON ls.user_id = t.user_id
  `;
  const { rows } = await db.query(q, [String(PUSH_ALIVE_DAYS), trackCfg.label]);
  return rows;
}

function decideNext(user, nowMs, trackCfg) {
  const funnelStart = user.funnel_started_at ? new Date(user.funnel_started_at).getTime() : null;
  if (!funnelStart) return { cycle: 1, step: 1, reason: 'new entry' };

  const daysSinceStart = Math.floor((nowMs - funnelStart) / 86400000);

  let cycle;
  if (trackCfg.cycleGapDays) {
    cycle = Math.min(trackCfg.maxCycle, Math.floor(daysSinceStart / trackCfg.cycleGapDays) + 1);
  } else {
    // Single-cycle track: once step 5 of cycle 1 is sent, we're done forever.
    cycle = 1;
    if (user.last_cycle === 1 && user.last_step >= 5) return null;
  }
  const cycleStartDay = trackCfg.cycleGapDays ? (cycle - 1) * trackCfg.cycleGapDays : 0;
  const daysIntoCycle = daysSinceStart - cycleStartDay;
  const due = dueStep(daysIntoCycle);
  if (due === 0) return null;

  const lastStepThisCycle = (user.last_cycle === cycle) ? user.last_step : 0;
  if (due <= lastStepThisCycle) return null;

  if (user.last_sent_at) {
    const hoursSinceLast = (nowMs - new Date(user.last_sent_at).getTime()) / 3600000;
    if (hoursSinceLast < 20) return null;
  }

  return { cycle, step: due, reason: `cycle${cycle} day${daysIntoCycle}` };
}

async function sendBatch(messages) {
  if (!messages.length) return { ok: 0, errors: 0, invalid: 0 };
  let ok = 0, errors = 0, invalid = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const r = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      const j = await r.json().catch(() => null);
      const tickets = j?.data || [];
      tickets.forEach(t => {
        if (t?.status === 'ok') ok++;
        else if (t?.details?.error === 'DeviceNotRegistered') invalid++;
        else errors++;
      });
    } catch (e) {
      console.warn('[funnel] batch failed:', e.message);
      errors += chunk.length;
    }
  }
  return { ok, errors, invalid };
}

async function runTrack(db, trackCfg) {
  const nowMs = Date.now();
  const candidates = await fetchCandidates(db, trackCfg);
  console.log(`[${trackCfg.label}] candidates matching local hour=${FORCE_HOUR ?? SEND_LOCAL_HOUR}: ${candidates.length}`);
  if (candidates.length === 0) return;

  const groups = new Map();
  for (const u of candidates) {
    const next = decideNext(u, nowMs, trackCfg);
    if (!next) continue;
    const key = `${next.cycle}:${next.step}`;
    if (!groups.has(key)) groups.set(key, { cycle: next.cycle, step: next.step, users: [] });
    groups.get(key).users.push(u);
  }

  console.log(`[${trackCfg.label}] groups: ${JSON.stringify([...groups.values()].map(g => ({ cycle: g.cycle, step: g.step, n: g.users.length })))}`);

  for (const g of groups.values()) {
    const enMsg = MESSAGES[trackCfg.label][g.step][FALLBACK_LANG];
    const route = STEP_ROUTE[g.step];
    const broadcastId = DRY_RUN ? null : await logPushBroadcast({
      title: enMsg.title, body: enMsg.body,
      locale: null, userType: null, route,
      totalCount: g.users.length, okCount: 0, errorCount: 0, invalidCount: 0,
      dietsFilter: null,
    });

    const messages = g.users.map(u => {
      const lang = pickLang(u.locale);
      const m = MESSAGES[trackCfg.label][g.step][lang];
      return {
        to: u.token,
        title: m.title,
        body: m.body,
        sound: 'default',
        data: {
          route,
          campaign: trackCfg.campaign,
          cycle: g.cycle,
          step: g.step,
          ...(broadcastId ? { broadcast_id: broadcastId } : {}),
        },
      };
    });

    console.log(`[${trackCfg.label}] cycle=${g.cycle} step=${g.step} route=${route} n=${g.users.length} dry=${DRY_RUN}`);
    if (DRY_RUN) continue;

    const stats = await sendBatch(messages);
    await updatePushBroadcastCounts(broadcastId, { okCount: stats.ok, errorCount: stats.errors, invalidCount: stats.invalid });

    const values = [];
    const params = [];
    g.users.forEach((u, i) => {
      const lang = pickLang(u.locale);
      params.push(u.user_id, trackCfg.label, g.cycle, g.step, broadcastId, lang);
      const base = i * 6;
      values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`);
    });
    await db.query(
      `INSERT INTO reactivation_sends (user_id, track, cycle, step, broadcast_id, locale_sent)
       VALUES ${values.join(',')}
       ON CONFLICT (user_id, track, cycle, step) DO NOTHING`,
      params
    );
    console.log(`  → sent ok=${stats.ok} err=${stats.errors} invalid=${stats.invalid}`);
  }
}

async function runHourly() {
  const db = await getPool();
  if (!db) throw new Error('No DB');
  const names = ONLY_TRACK ? [ONLY_TRACK] : Object.keys(TRACKS);
  for (const name of names) {
    const cfg = TRACKS[name];
    if (!cfg) { console.warn(`[funnel] unknown track: ${name}`); continue; }
    await runTrack(db, cfg);
  }
}

async function runBackfill() {
  const db = await getPool();
  if (!db) throw new Error('No DB');
  for (const [name, cfg] of Object.entries(TRACKS)) {
    const { rows } = await db.query(`
      WITH eligible AS (${cfg.eligibilitySql}),
      tokens AS (
        SELECT DISTINCT ON (pt.user_id) pt.user_id, pt.locale, pt.timezone
        FROM push_tokens pt
        WHERE pt.user_id IN (SELECT id FROM eligible)
          AND pt.last_seen_at >= NOW() - INTERVAL '${PUSH_ALIVE_DAYS} days'
          AND pt.token LIKE 'ExponentPushToken%'
        ORDER BY pt.user_id, pt.last_seen_at DESC
      ),
      already AS (
        SELECT DISTINCT user_id FROM reactivation_sends WHERE track = $1
      )
      SELECT COALESCE(SPLIT_PART(t.locale,'-',1),'en') AS lang,
             COALESCE(t.timezone,'UNKNOWN') AS tz,
             COUNT(*) AS n
      FROM tokens t
      WHERE NOT EXISTS (SELECT 1 FROM already a WHERE a.user_id = t.user_id)
      GROUP BY lang, tz ORDER BY n DESC
    `, [name]);
    const total = rows.reduce((a, r) => a + Number(r.n), 0);
    console.log(`\n[backfill:${name}] eligible users not yet in funnel: ${total}`);
    console.table(rows.slice(0, 20));
  }
}

async function runReport() {
  const db = await getPool();
  if (!db) throw new Error('No DB');
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const sections = [];
  for (const name of Object.keys(TRACKS)) {
    const { rows: perStep } = await db.query(`
      SELECT rs.cycle, rs.step,
             COUNT(*)::int AS sent,
             COUNT(DISTINCT pc.user_id)::int AS clicked,
             COUNT(DISTINCT CASE WHEN se.id IS NOT NULL THEN rs.user_id END)::int AS activated
      FROM reactivation_sends rs
      LEFT JOIN push_clicks pc ON pc.broadcast_id = rs.broadcast_id AND pc.user_id = rs.user_id
      LEFT JOIN scan_events se ON se.user_id = rs.user_id AND se.created_at >= rs.sent_at
      WHERE rs.track = $1 AND rs.sent_at >= $2
      GROUP BY rs.cycle, rs.step
      ORDER BY rs.cycle, rs.step
    `, [name, since]);

    const { rows: totals } = await db.query(`
      SELECT COUNT(*)::int AS sent, COUNT(DISTINCT user_id)::int AS unique_users
      FROM reactivation_sends WHERE track = $1 AND sent_at >= $2
    `, [name, since]);

    sections.push({ name, perStep, totals: totals[0] || { sent: 0, unique_users: 0 } });
  }

  const htmlSections = sections.map(s => `
    <h3 style="margin-top:24px;">${s.name.toUpperCase()}</h3>
    <ul>
      <li>Messages sent: <b>${s.totals.sent}</b></li>
      <li>Unique users reached: <b>${s.totals.unique_users}</b></li>
    </ul>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      <tr style="background:#f5f5f5;"><th>Cycle</th><th>Step</th><th>Sent</th><th>Clicked</th><th>CTR</th><th>Activated after</th></tr>
      ${s.perStep.map(r => `<tr>
        <td>${r.cycle}</td><td>${r.step}</td>
        <td>${r.sent}</td><td>${r.clicked}</td>
        <td>${r.sent ? ((r.clicked / r.sent) * 100).toFixed(1) : '0.0'}%</td>
        <td>${r.activated}</td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#999;">no sends this week</td></tr>'}
    </table>
  `).join('');

  const totalSent = sections.reduce((a, s) => a + s.totals.sent, 0);
  const totalClicks = sections.reduce((a, s) => a + s.perStep.reduce((b, r) => b + r.clicked, 0), 0);

  const html = `
    <div style="font-family:sans-serif;max-width:720px;margin:0 auto;padding:24px;">
      <h2 style="color:#0E1B14;margin-bottom:4px;">NovaQI — Funnel Weekly Report</h2>
      <p style="color:#666;margin-top:0;">Last 7 days · ${new Date().toISOString().slice(0,10)}</p>
      ${htmlSections}
      <p style="color:#999;font-size:11px;margin-top:24px;">Auto-generated by activation-funnel.mjs --report</p>
    </div>
  `;

  if (DRY_RUN) { console.log(html); return; }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.NOVAQI_SMTP_USER, pass: process.env.NOVAQI_SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.NOVAQI_SMTP_FROM || 'NovaQI <contact@novaqi.app>',
    to: REPORT_TO,
    subject: `[NovaQI] Funnel report — ${totalSent} sent, ${totalClicks} clicks (7d)`,
    html,
  });
  console.log(`[report] emailed to ${REPORT_TO}`);
}

async function main() {
  if (REPORT) return runReport();
  if (BACKFILL) return runBackfill();
  return runHourly();
}

main().then(async () => {
  const db = await getPool();
  if (db) await db.end();
  process.exit(0);
}).catch(async e => {
  console.error(e);
  const db = await getPool();
  if (db) await db.end().catch(() => {});
  process.exit(1);
});

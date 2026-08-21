import './env.js';
import { getPool } from './db.js';

// All notification slots. minutesMidnight = minutes since 00:00 local time.
// WINDOW_MINUTES: fire if we're within ±20 min of the target (30-min run cadence).
const WINDOW_MINUTES = 20;
const ALL_SLOTS = [
  // Water reminders
  { name: 'water_morning',   minutes: 9  * 60,       type: 'water' },
  { name: 'water_midday',    minutes: 13 * 60,       type: 'water' },
  { name: 'water_afternoon', minutes: 17 * 60,       type: 'water' },
  // Food log reminders
  { name: 'food_morning',    minutes: 8  * 60 + 30,  type: 'food' },
  { name: 'food_midday',     minutes: 11 * 60 + 50,  type: 'food' },
  { name: 'food_evening',    minutes: 19 * 60,       type: 'food' },
];

// ── Message builders ──────────────────────────────────────────────────────────

function waterMessage(locale, slotName, waterToday, waterGoal) {
  const remaining = waterGoal - waterToday;
  const T = {
    pt: {
      water_morning: waterToday === 0
        ? 'Comece o dia com um copo de água!'
        : `Bom início! Já tomou ${waterToday}ml. Continue!`,
      water_midday: waterToday === 0
        ? 'Já é meio-dia e ainda não bebeu água hoje!'
        : `${waterToday}ml bebidos — faltam ${remaining}ml para a meta!`,
      water_afternoon: waterToday < 500
        ? `Só ${waterToday}ml hoje. Hidrate-se mais!`
        : `${waterToday}ml! Faltam só ${remaining}ml para atingir a meta.`,
    },
    en: {
      water_morning: waterToday === 0
        ? 'Start your day with a glass of water!'
        : `Great start! ${waterToday}ml done. Keep going!`,
      water_midday: waterToday === 0
        ? "It's midday — you haven't had any water yet!"
        : `${waterToday}ml done. ${remaining}ml left for your goal!`,
      water_afternoon: waterToday < 500
        ? `Only ${waterToday}ml today — drink more water!`
        : `${waterToday}ml! Just ${remaining}ml left for your daily goal.`,
    },
    de: {
      water_morning: waterToday === 0
        ? 'Starte deinen Tag mit einem Glas Wasser!'
        : `Guter Start! ${waterToday}ml getrunken. Weiter so!`,
      water_midday: waterToday === 0
        ? 'Mittag — du hast noch kein Wasser getrunken!'
        : `${waterToday}ml getrunken. Noch ${remaining}ml bis zum Ziel!`,
      water_afternoon: waterToday < 500
        ? `Nur ${waterToday}ml heute — trink mehr!`
        : `${waterToday}ml! Nur noch ${remaining}ml bis zu deinem Tagesziel.`,
    },
    fr: {
      water_morning: waterToday === 0
        ? "Commencez la journée avec un verre d'eau!"
        : `Bon début ! ${waterToday}ml bus. Continuez !`,
      water_midday: waterToday === 0
        ? "Il est midi — vous n'avez pas encore bu d'eau !"
        : `${waterToday}ml bus. Il reste ${remaining}ml pour l'objectif !`,
      water_afternoon: waterToday < 500
        ? `Seulement ${waterToday}ml aujourd'hui — buvez plus !`
        : `${waterToday}ml ! Plus que ${remaining}ml pour votre objectif.`,
    },
    it: {
      water_morning: waterToday === 0
        ? "Inizia la giornata con un bicchiere d'acqua!"
        : `Ottimo inizio! ${waterToday}ml bevuti. Continua!`,
      water_midday: waterToday === 0
        ? "È mezzogiorno e non hai ancora bevuto acqua!"
        : `${waterToday}ml bevuti. Mancano ${remaining}ml all'obiettivo!`,
      water_afternoon: waterToday < 500
        ? `Solo ${waterToday}ml oggi — bevi di più!`
        : `${waterToday}ml! Mancano solo ${remaining}ml all'obiettivo.`,
    },
    es: {
      water_morning: waterToday === 0
        ? '¡Empieza el día con un vaso de agua!'
        : `¡Buen comienzo! ${waterToday}ml bebidos. ¡Sigue!`,
      water_midday: waterToday === 0
        ? '¡Es mediodía y aún no has bebido agua!'
        : `${waterToday}ml bebidos — ¡faltan ${remaining}ml para la meta!`,
      water_afternoon: waterToday < 500
        ? `Solo ${waterToday}ml hoy — ¡bebe más agua!`
        : `${waterToday}ml. ¡Solo faltan ${remaining}ml para tu meta!`,
    },
  };
  const lang = T[locale] ? locale : 'en';
  return { title: '💧 ' + titleFor(lang, 'water', slotName), body: T[lang][slotName] };
}

function foodMessage(locale, slotName) {
  const titles = {
    pt: { food_morning: '🍽️ Diário Alimentar', food_midday: '🍽️ Hora do Almoço', food_evening: '🍽️ Jantar Registado?' },
    en: { food_morning: '🍽️ Food Journal', food_midday: '🍽️ Lunch Time', food_evening: '🍽️ Evening Check-in' },
    de: { food_morning: '🍽️ Ernährungstagebuch', food_midday: '🍽️ Mittagszeit', food_evening: '🍽️ Abend-Check' },
    fr: { food_morning: '🍽️ Journal Alimentaire', food_midday: '🍽️ Heure du Déjeuner', food_evening: '🍽️ Bilan du Soir' },
    it: { food_morning: '🍽️ Diario Alimentare', food_midday: '🍽️ Ora di Pranzo', food_evening: '🍽️ Check Serale' },
    es: { food_morning: '🍽️ Diario Alimentario', food_midday: '🍽️ Hora del Almuerzo', food_evening: '🍽️ Check de la Noche' },
  };
  const bodies = {
    pt: {
      food_morning:  'Não se esqueça de registar o seu pequeno-almoço para acompanhar a sua nutrição hoje.',
      food_midday:   'Hora de almoço! Registe o que comeu para manter o controlo do seu consumo.',
      food_evening:  'Registe o jantar de hoje para completar o seu diário alimentar.',
    },
    en: {
      food_morning:  "Don't forget to log your breakfast to track your nutrition today.",
      food_midday:   "Lunchtime! Log what you ate to stay on top of your intake.",
      food_evening:  "Log your dinner to complete today's food journal.",
    },
    de: {
      food_morning:  'Vergiss nicht, dein Frühstück einzutragen, um deine Ernährung zu verfolgen.',
      food_midday:   'Mittagszeit! Trage dein Essen ein, um den Überblick zu behalten.',
      food_evening:  'Trage dein Abendessen ein, um dein Ernährungstagebuch zu vervollständigen.',
    },
    fr: {
      food_morning:  "N'oubliez pas d'enregistrer votre petit-déjeuner pour suivre votre nutrition.",
      food_midday:   "C'est l'heure du déjeuner ! Enregistrez ce que vous avez mangé.",
      food_evening:  "Enregistrez votre dîner pour compléter votre journal alimentaire.",
    },
    it: {
      food_morning:  "Non dimenticare di registrare la colazione per monitorare la tua nutrizione.",
      food_midday:   "Ora di pranzo! Registra cosa hai mangiato per tenere traccia.",
      food_evening:  "Registra la cena di oggi per completare il tuo diario alimentare.",
    },
    es: {
      food_morning:  "No olvides registrar tu desayuno para seguir tu nutrición de hoy.",
      food_midday:   "¡Hora de almorzar! Registra lo que comiste para mantener el control.",
      food_evening:  "Registra tu cena para completar tu diario alimentario de hoy.",
    },
  };
  const lang = titles[locale] ? locale : 'en';
  return { title: titles[lang][slotName], body: bodies[lang][slotName] };
}

function titleFor(lang, type, slotName) {
  if (type !== 'water') return '';
  const t = { pt: 'Hidratação', en: 'Hydration', de: 'Hydration', fr: 'Hydratation', it: 'Idratazione', es: 'Hidratación' };
  return t[lang] || t.en;
}

// ── Push sender ───────────────────────────────────────────────────────────────

async function sendPushMessages(messages) {
  const valid = messages.filter(m => m?.to?.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  for (let i = 0; i < valid.length; i += 100) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(valid.slice(i, i + 100)),
      });
    } catch (e) {
      console.warn('[notif] push batch failed:', e.message);
    }
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runNotifications() {
  const db = await getPool();
  if (!db) return;

  const now = new Date();

  // 1. Candidates: users with push tokens + timezone + nutrition goals
  const { rows: candidates } = await db.query(`
    SELECT pt.user_id, pt.token, pt.locale, pt.timezone, pt.brand,
           COALESCE(g.water_ml, 2000) AS water_goal
    FROM push_tokens pt
    JOIN user_nutrition_goals g ON g.user_id = pt.user_id
    WHERE pt.user_id IS NOT NULL
      AND pt.timezone IS NOT NULL
      AND g.water_ml IS NOT NULL AND g.water_ml > 0
  `).catch(() => ({ rows: [] }));

  if (candidates.length === 0) return;

  // 2. For each candidate × slot, decide if it's in the fire window
  const eligible = [];
  for (const u of candidates) {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: 'numeric', hour12: false, timeZone: u.timezone,
      });
      const parts = fmt.formatToParts(now);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const localMinutes = h * 60 + m;
      const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: u.timezone }).format(now);

      for (const slot of ALL_SLOTS) {
        const diff = Math.abs(localMinutes - slot.minutes);
        if (diff <= WINDOW_MINUTES) {
          eligible.push({ ...u, slot: slot.name, slotType: slot.type, localDate });
        }
      }
    } catch { /* invalid timezone */ }
  }

  if (eligible.length === 0) return;

  const userIds = [...new Set(eligible.map(u => u.user_id))];

  // 3. Today's water totals
  const { rows: waterRows } = await db.query(`
    SELECT user_id, COALESCE(SUM(water_ml), 0)::int AS water_ml
    FROM consumption_log
    WHERE user_id = ANY($1) AND water_ml IS NOT NULL AND consumed_at >= CURRENT_DATE
    GROUP BY user_id
  `, [userIds]).catch(() => ({ rows: [] }));
  const waterMap = Object.fromEntries(waterRows.map(r => [r.user_id, r.water_ml]));

  // 4. Already sent today (last 2 days to be safe)
  const { rows: sentRows } = await db.query(`
    SELECT user_id, slot, local_date::text
    FROM water_notification_log
    WHERE user_id = ANY($1) AND sent_at >= NOW() - INTERVAL '2 days'
  `, [userIds]).catch(() => ({ rows: [] }));
  const sentSet = new Set(sentRows.map(r => `${r.user_id}:${r.slot}:${r.local_date}`));

  // 5. Build messages
  const messages = [];
  const toLog = [];

  for (const u of eligible) {
    const sentKey = `${u.user_id}:${u.slot}:${u.localDate}`;
    if (sentSet.has(sentKey)) continue;

    const isNovaQI = u.brand === 'novaqi';

    // NovaQI is a body-composition app, not a daily food tracker — skip food reminders
    if (isNovaQI && u.slotType === 'food') continue;

    let msg;
    if (u.slotType === 'water') {
      const waterToday = waterMap[u.user_id] || 0;
      if (waterToday >= u.water_goal) continue; // goal met, skip
      msg = waterMessage(u.locale || 'en', u.slot, waterToday, u.water_goal);
    } else {
      msg = foodMessage(u.locale || 'en', u.slot);
    }

    messages.push({
      to: u.token,
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: {
        route: 'NutritionDashboard',
        slot: u.slot,
        params: u.slotType === 'food' ? { openAddFood: true } : undefined,
      },
    });
    toLog.push({ userId: u.user_id, slot: u.slot, localDate: u.localDate, waterMl: waterMap[u.user_id] || 0 });
  }

  if (messages.length === 0) return;

  console.log(`[notif] Sending ${messages.length} reminders at ${now.toISOString()}`);
  await sendPushMessages(messages);

  for (const entry of toLog) {
    await db.query(
      `INSERT INTO water_notification_log (user_id, slot, local_date, water_ml_at_send)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [entry.userId, entry.slot, entry.localDate, entry.waterMl]
    ).catch(() => {});
  }
}

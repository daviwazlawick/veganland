import './env.js';
import { getPool } from './db.js';

// All notification slots. minutesMidnight = minutes since 00:00 local time.
// WINDOW_MINUTES: fire if we're within ±20 min of the target (30-min run cadence).
const WINDOW_MINUTES = 20;
const ALL_SLOTS = [
  { name: 'food_morning',    minutes:  8 * 60, type: 'food'  },
  { name: 'water_morning',   minutes:  9 * 60, type: 'water' },
  { name: 'food_midday',     minutes: 12 * 60, type: 'food'  },
  { name: 'water_midday',    minutes: 13 * 60, type: 'water' },
  { name: 'water_afternoon', minutes: 17 * 60, type: 'water' },
  { name: 'food_evening',    minutes: 19 * 60, type: 'food'  },
];

// ── Message builders ──────────────────────────────────────────────────────────

function waterMessage(locale, slotName, waterToday, waterGoal) {
  const remaining = waterGoal - waterToday;
  const T = {
    pt: {
      water_morning: waterToday === 0
        ? 'Comece o dia hidratado — a água optimiza a sua composição corporal!'
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
        ? 'Start your day hydrated — water supports your body composition goals!'
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
        ? 'Starte deinen Tag hydriert — Wasser unterstützt deine Körperziele!'
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
        ? "Commencez la journée hydraté — l'eau soutient vos objectifs corporels!"
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
        ? "Inizia la giornata idratato — l'acqua supporta la tua composizione corporea!"
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
        ? '¡Empieza el día hidratado — el agua apoya tu composición corporal!'
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
  const titles = { pt: '💧 Hidratação', en: '💧 Hydration', de: '💧 Hydration', fr: '💧 Hydratation', it: '💧 Idratazione', es: '💧 Hidratación' };
  return { title: titles[lang] || titles.en, body: T[lang][slotName] };
}

function foodMessage(locale, slotName, caloriesToday, caloriesGoal) {
  const remaining = caloriesGoal - caloriesToday;
  const T = {
    pt: {
      food_morning: caloriesToday === 0
        ? 'Registe o pequeno-almoço para análise nutricional precisa!'
        : `${caloriesToday} kcal registadas. Continue para uma análise completa!`,
      food_midday: caloriesToday === 0
        ? 'Nada registado ainda — registe o almoço agora!'
        : `${caloriesToday} kcal. Registe o almoço para manter o registo completo.`,
      food_evening: caloriesToday < 300
        ? 'Poucos registos hoje — registe o jantar para completar o seu perfil!'
        : remaining > 0
          ? `${caloriesToday} kcal — faltam ${remaining} kcal para a meta diária.`
          : `Meta atingida! ${caloriesToday} kcal registadas hoje.`,
    },
    en: {
      food_morning: caloriesToday === 0
        ? 'Log your breakfast for accurate nutrition tracking!'
        : `${caloriesToday} kcal logged. Keep it up for a complete analysis!`,
      food_midday: caloriesToday === 0
        ? 'Nothing logged yet — record your lunch now!'
        : `${caloriesToday} kcal. Log lunch to keep your record complete.`,
      food_evening: caloriesToday < 300
        ? 'Few entries today — log dinner to complete your profile!'
        : remaining > 0
          ? `${caloriesToday} kcal — ${remaining} kcal left for your daily goal.`
          : `Goal reached! ${caloriesToday} kcal logged today.`,
    },
    de: {
      food_morning: caloriesToday === 0
        ? 'Frühstück erfassen für eine genaue Ernährungsanalyse!'
        : `${caloriesToday} kcal erfasst. Weiter so für eine vollständige Analyse!`,
      food_midday: caloriesToday === 0
        ? 'Noch nichts erfasst — erfasse jetzt dein Mittagessen!'
        : `${caloriesToday} kcal. Mittagessen erfassen für vollständige Aufzeichnungen.`,
      food_evening: caloriesToday < 300
        ? 'Wenige Einträge heute — Abendessen erfassen!'
        : remaining > 0
          ? `${caloriesToday} kcal — noch ${remaining} kcal bis zum Tagesziel.`
          : `Ziel erreicht! ${caloriesToday} kcal heute erfasst.`,
    },
    fr: {
      food_morning: caloriesToday === 0
        ? 'Enregistrez votre petit-déjeuner pour un suivi nutritionnel précis !'
        : `${caloriesToday} kcal enregistrées. Continuez pour une analyse complète !`,
      food_midday: caloriesToday === 0
        ? 'Rien enregistré — notez votre déjeuner maintenant !'
        : `${caloriesToday} kcal. Notez le déjeuner pour un suivi complet.`,
      food_evening: caloriesToday < 300
        ? 'Peu de données aujourd\'hui — enregistrez le dîner !'
        : remaining > 0
          ? `${caloriesToday} kcal — encore ${remaining} kcal pour l'objectif.`
          : `Objectif atteint ! ${caloriesToday} kcal enregistrées aujourd'hui.`,
    },
    it: {
      food_morning: caloriesToday === 0
        ? 'Registra la colazione per un\'analisi nutrizionale precisa!'
        : `${caloriesToday} kcal registrate. Continua per un\'analisi completa!`,
      food_midday: caloriesToday === 0
        ? 'Niente ancora — registra il pranzo adesso!'
        : `${caloriesToday} kcal. Registra il pranzo per un profilo completo.`,
      food_evening: caloriesToday < 300
        ? 'Pochi dati oggi — registra la cena per completare il profilo!'
        : remaining > 0
          ? `${caloriesToday} kcal — mancano ${remaining} kcal all'obiettivo.`
          : `Obiettivo raggiunto! ${caloriesToday} kcal registrate oggi.`,
    },
    es: {
      food_morning: caloriesToday === 0
        ? '¡Registra el desayuno para un análisis nutricional preciso!'
        : `${caloriesToday} kcal registradas. ¡Sigue para un análisis completo!`,
      food_midday: caloriesToday === 0
        ? '¡Nada registrado — anota tu almuerzo ahora!'
        : `${caloriesToday} kcal. Registra el almuerzo para mantener el perfil completo.`,
      food_evening: caloriesToday < 300
        ? '¡Pocos registros hoy — anota la cena para completar tu perfil!'
        : remaining > 0
          ? `${caloriesToday} kcal — faltan ${remaining} kcal para la meta diaria.`
          : `¡Meta alcanzada! ${caloriesToday} kcal registradas hoy.`,
    },
  };
  const lang = T[locale] ? locale : 'en';
  const titles = { pt: '🍽️ Nutrição', en: '🍽️ Nutrition', de: '🍽️ Ernährung', fr: '🍽️ Nutrition', it: '🍽️ Nutrizione', es: '🍽️ Nutrición' };
  return { title: titles[lang] || titles.en, body: T[lang][slotName] };
}

// ── Push sender ───────────────────────────────────────────────────────────────

async function sendPushMessages(messages) {
  const valid = messages.filter(m => m?.to?.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    try {
      const r = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      const j = await r.json().catch(() => null);
      const tickets = j?.data || [];
      const errs = {};
      tickets.forEach((t, idx) => {
        if (t?.status === 'error') {
          const code = t?.details?.error || t?.message || 'unknown';
          errs[code] = (errs[code] || 0) + 1;
          // Log first offending token per error code — enough to diagnose,
          // avoids spamming logs when e.g. every Android token fails with the
          // same InvalidCredentials.
          if (errs[code] === 1) {
            console.warn(`[notif] ticket error "${code}" e.g. token=${chunk[idx]?.to} msg=${t?.message}`);
          }
        }
      });
      const okCount = tickets.filter(t => t?.status === 'ok').length;
      if (Object.keys(errs).length) {
        console.warn(`[notif] batch of ${chunk.length}: ${okCount} ok, errors=${JSON.stringify(errs)}`);
      }
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
    SELECT pt.user_id, pt.token, pt.locale, pt.timezone,
           COALESCE(g.water_ml, 2000)       AS water_goal,
           COALESCE(g.calories_kcal, 2000)  AS calorie_goal
    FROM push_tokens pt
    JOIN user_nutrition_goals g ON g.user_id = pt.user_id
    WHERE pt.user_id IS NOT NULL
      AND pt.timezone IS NOT NULL
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

  // 4. Today's calorie totals
  const { rows: calorieRows } = await db.query(`
    SELECT user_id, COALESCE(SUM(calories_kcal), 0)::int AS calories_kcal
    FROM consumption_log
    WHERE user_id = ANY($1) AND calories_kcal IS NOT NULL AND consumed_at >= CURRENT_DATE
    GROUP BY user_id
  `, [userIds]).catch(() => ({ rows: [] }));
  const calorieMap = Object.fromEntries(calorieRows.map(r => [r.user_id, r.calories_kcal]));

  // 5. Already sent today (last 2 days to be safe)
  const { rows: sentRows } = await db.query(`
    SELECT user_id, slot, local_date::text
    FROM water_notification_log
    WHERE user_id = ANY($1) AND sent_at >= NOW() - INTERVAL '2 days'
  `, [userIds]).catch(() => ({ rows: [] }));
  const sentSet = new Set(sentRows.map(r => `${r.user_id}:${r.slot}:${r.local_date}`));

  // 6. Build messages
  const messages = [];
  const toLog = [];

  for (const u of eligible) {
    const sentKey = `${u.user_id}:${u.slot}:${u.localDate}`;
    if (sentSet.has(sentKey)) continue;

    let msg;
    let waterMlAtSend = waterMap[u.user_id] || 0;

    if (u.slotType === 'water') {
      if (waterMlAtSend >= u.water_goal) continue; // goal already met
      msg = waterMessage(u.locale || 'en', u.slot, waterMlAtSend, u.water_goal);
    } else {
      const caloriesToday = calorieMap[u.user_id] || 0;
      msg = foodMessage(u.locale || 'en', u.slot, caloriesToday, u.calorie_goal);
    }

    messages.push({
      to: u.token,
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: { route: 'NutritionDashboard', slot: u.slot },
    });
    toLog.push({ userId: u.user_id, slot: u.slot, localDate: u.localDate, waterMl: waterMlAtSend });
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

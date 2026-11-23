// NovaQI V2 — fitness: perfil do onboarding, metas calculadas, dieta e treino gerados
// pela IA e o registro de carga de cada série.
//
// As metas (kcal e macros) saem de conta, não da IA: Mifflin-St Jeor × atividade,
// ajuste pelo objetivo, proteína por kg. A IA recebe os números prontos e só monta
// o cardápio e a ficha em cima deles. Assim o total do dia sempre bate.
import './env.js';
import { fallbackDiet, fallbackWorkout } from './fitnessFallback.js';
import { getPool, getUserById, logApiUsage, saveBodyProfile, saveNutritionGoals, logWeight, logBodyMeasurements, addConsumptionEntry } from './db.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL_PLAN = process.env.CLAUDE_MODEL_PLAN || 'claude-sonnet-5-5';

// ── Metas ───────────────────────────────────────────────────────────────────

const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };

// Gordura corporal aproximada de cada silhueta do onboarding (homem / mulher).
const SILHOUETTE_BF = {
  slim:     { male: 12, female: 20 },
  lean:     { male: 15, female: 23 },
  athletic: { male: 14, female: 22 },
  average:  { male: 21, female: 29 },
  belly:    { male: 27, female: 34 },
  heavy:    { male: 33, female: 40 },
};

function num(v, lo, hi) {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

// Marinha americana (precisa de pescoço e cintura; mulher precisa também do quadril).
function navyBodyFat({ sex, height_cm, neck_cm, waist_cm, hips_cm }) {
  if (!height_cm || !neck_cm || !waist_cm) return null;
  let bf;
  if (sex === 'female') {
    if (!hips_cm || waist_cm + hips_cm - neck_cm <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist_cm + hips_cm - neck_cm) + 0.22100 * Math.log10(height_cm)) - 450;
  } else {
    if (waist_cm - neck_cm <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist_cm - neck_cm) + 0.15456 * Math.log10(height_cm)) - 450;
  }
  return Number.isFinite(bf) && bf > 3 && bf < 60 ? Math.round(bf * 10) / 10 : null;
}

export function computeTargets(p) {
  const sex = p.sex === 'female' ? 'female' : 'male';
  const age = num(p.age, 13, 99) || 30;
  const h = num(p.height_cm, 120, 230) || (sex === 'female' ? 163 : 176);
  const w = num(p.weight_kg, 30, 300) || (sex === 'female' ? 62 : 78);
  const m = p.measurements || {};
  const bfNavy = navyBodyFat({ sex, height_cm: h, neck_cm: num(m.neck_cm, 20, 70), waist_cm: num(m.waist_cm, 40, 200), hips_cm: num(m.hips_cm, 50, 200) });
  const bfSil = p.silhouette && SILHOUETTE_BF[p.silhouette] ? SILHOUETTE_BF[p.silhouette][sex] : null;
  const bodyFat = bfNavy ?? bfSil;

  const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (sex === 'female' ? -161 : 5));
  const factor = ACTIVITY[p.activity] || 1.375;
  // Dia de treino conta no fator: quem treina 5x sobe um degrau.
  const trainBoost = (num(p.days_per_week, 0, 7) || 3) >= 5 ? 0.075 : 0;
  const tdee = Math.round(bmr * (factor + trainBoost));

  const goal = p.goal || 'recomp';
  const adj = { lose: -0.2, recomp: -0.08, gain: 0.1, health: 0 }[goal] ?? 0;
  let kcal = Math.round((tdee * (1 + adj)) / 10) * 10;
  kcal = Math.max(kcal, sex === 'female' ? 1300 : 1500);

  // Proteína por kg de massa magra quando dá pra estimar; senão por kg de peso.
  const lean = bodyFat ? w * (1 - bodyFat / 100) : null;
  const proteinPerKg = { lose: 2.2, recomp: 2.0, gain: 1.8, health: 1.6 }[goal] ?? 1.8;
  let protein = lean ? Math.round(lean * proteinPerKg * 1.1) : Math.round(w * proteinPerKg * (goal === 'lose' ? 0.9 : 1));
  protein = Math.min(protein, Math.round(w * 2.4));
  const fat = Math.round(Math.max(w * 0.8, (kcal * 0.25) / 9));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((w * 35) / 100) * 100;

  return {
    sex, age, height_cm: h, weight_kg: w,
    bmr, tdee, calories_kcal: kcal, protein_g: protein, fat_g: fat, carbs_g: carbs,
    fiber_g: sex === 'female' ? 25 : 30, water_ml: water,
    body_fat_pct: bodyFat, body_fat_source: bfNavy ? 'measurements' : bfSil ? 'silhouette' : null,
    bmi: Math.round((w / ((h / 100) ** 2)) * 10) / 10,
    goal,
  };
}

// ── IA ──────────────────────────────────────────────────────────────────────

async function callClaude(prompt, maxTokens) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL_PLAN, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error ${response.status}`);
  }
  const data = await response.json();
  const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
  logApiUsage(MODEL_PLAN, usage.input_tokens, usage.output_tokens).catch(() => {});
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Invalid AI response');
  return JSON.parse(match[0]);
}

const LANG = { pt: 'Brazilian Portuguese', en: 'English', de: 'German', fr: 'French', it: 'Italian', es: 'Spanish' };

const DIET_LABEL = {
  vegan: 'vegan (no animal products at all)', vegetarian: 'vegetarian (no meat or fish; eggs and dairy ok)',
  pescatarian: 'pescatarian (fish ok, no meat)', gluten_free: 'gluten-free', halal: 'halal', kosher: 'kosher',
  omnivore: 'omnivore (eats everything)',
};

function personBlock(p, t) {
  return [
    `Sex: ${t.sex}. Age: ${t.age}. Height: ${t.height_cm} cm. Weight: ${t.weight_kg} kg. BMI ${t.bmi}.`,
    t.body_fat_pct ? `Estimated body fat: ${t.body_fat_pct}% (from ${t.body_fat_source}).` : '',
    p.measurements && Object.keys(p.measurements).length ? `Measurements (cm): ${JSON.stringify(p.measurements)}.` : '',
    p.silhouette ? `Self-described body type: ${p.silhouette}.` : '',
    `Goal: ${({ lose: 'lose fat', recomp: 'lose fat and gain muscle at the same time (recomposition)', gain: 'gain muscle mass', health: 'health and energy, keep weight' })[t.goal] || t.goal}.`,
    p.focus?.length ? `Body areas they want to prioritise: ${p.focus.join(', ')}.` : '',
    `Daily activity outside training: ${p.activity || 'light'}.`,
  ].filter(Boolean).join('\n');
}

export async function generateDiet(p, t, language) {
  const lang = LANG[language] || LANG.en;
  const prompt = `You are a sports nutritionist building a practical daily meal plan.

PERSON
${personBlock(p, t)}
Diet style: ${DIET_LABEL[p.diet_id] || 'omnivore'}.
Allergies / foods to avoid: ${(p.allergy_ids || []).join(', ') || 'none'}${p.dislikes ? `; dislikes: ${p.dislikes}` : ''}.
Meals per day: ${p.meals_per_day || 4}. Cooking: ${({ none: 'almost never cooks, needs simple assembly', some: 'cooks a few times a week, likes batch cooking', lots: 'enjoys cooking' })[p.cooking] || 'cooks a few times a week'}.
Country / food culture: ${language === 'pt' ? 'Brazil (use foods sold in any Brazilian supermarket: arroz, feijão, frango, ovos, batata-doce, aveia, iogurte, frutas da estação etc.)' : 'use common supermarket foods'}.

DAILY TARGETS (already calculated, the sum of all meals MUST land within ±5% of these):
${t.calories_kcal} kcal · protein ${t.protein_g} g · carbs ${t.carbs_g} g · fat ${t.fat_g} g · fiber ≥ ${t.fiber_g} g.

RULES
- Quantities in grams (cooked weight when relevant) or household units with grams in parentheses.
- Put more carbs around the training session (pre and post workout meals).
- Every meal has protein.
- Each meal gets ONE simple swap option with similar macros.
- Realistic, cheap, repeatable. No exotic ingredients, no supplements unless whey fits naturally.
- Write every text field in ${lang}.

Return ONLY JSON, no markdown:
{
  "summary": "two short sentences explaining the strategy for this person",
  "meals": [
    {
      "key": "m1",
      "name": "Breakfast",
      "time": "07:30",
      "kcal": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0,
      "items": [ { "food": "Ovos mexidos", "qty": "3 unidades (150 g)", "kcal": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 } ],
      "swap": "short alternative, e.g. 'Trocar ovos por 170 g de iogurte grego + 30 g de aveia'"
    }
  ],
  "rest_day_note": "what to change on rest days (usually cut part of the carbs)",
  "tips": ["max 3 short, specific tips for THIS person"]
}`;
  const diet = await callClaude(prompt, 6000);
  if (!Array.isArray(diet.meals) || !diet.meals.length) throw new Error('diet without meals');
  diet.meals = diet.meals.map((m, i) => ({ ...m, key: m.key || `m${i + 1}` }));
  return diet;
}

export async function generateWorkout(p, t, language) {
  const lang = LANG[language] || LANG.en;
  const prompt = `You are a strength coach writing a training program.

PERSON
${personBlock(p, t)}
Training experience: ${({ none: 'never trained / beginner', some: 'trained before, less than 1 year consistent', solid: '1-3 years consistent', advanced: '3+ years, advanced' })[p.experience] || 'beginner'}.
Days per week available: ${p.days_per_week || 3}. Session length: ${p.session_min || 60} minutes.
Where: ${({ gym: 'full commercial gym', home: 'home with dumbbells and bands', bodyweight: 'no equipment, bodyweight only' })[p.place] || 'full gym'}.
Injuries / limitations: ${p.injuries || 'none'}.

RULES
- Choose the split that fits the days (e.g. 3 days full body or ABC, 4 days upper/lower, 5-6 days ABC x2 or PPL).
- Return exactly ${p.days_per_week || 3} training days (one object per distinct session; if the split repeats, return the distinct sessions only and say the order in "schedule").
- 4 to 7 exercises per session, fitting ${p.session_min || 60} minutes with rest.
- Prioritise the focus areas with extra volume.
- Each exercise: sets, rep range, rest in seconds, one short technique cue, primary muscle.
- "key" of each exercise must be a stable snake_case id in English (e.g. "barbell_bench_press"), so progress can be tracked across plans.
- Beginner: machines and simple movements. Never prescribe something that hurts the listed injuries.
- Write every human-readable text in ${lang}.

Return ONLY JSON, no markdown:
{
  "split_name": "e.g. Superior / Inferior",
  "summary": "two short sentences about why this split for this person",
  "schedule": ["A", "B", "rest", "A", "B", "rest", "rest"],
  "days": [
    {
      "key": "A",
      "title": "Superiores",
      "focus": "Peito, costas e ombros",
      "duration_min": 60,
      "warmup": "short warm-up instruction",
      "exercises": [
        { "key": "barbell_bench_press", "name": "Supino reto com barra", "muscle": "Peito", "sets": 4, "reps": "8-10", "rest_s": 90, "cue": "short cue" }
      ],
      "finisher": "optional short cardio/core finisher or empty string"
    }
  ],
  "progression": "how to progress load week to week, in one or two sentences"
}`;
  const workout = await callClaude(prompt, 6000);
  if (!Array.isArray(workout.days) || !workout.days.length) throw new Error('workout without days');
  return workout;
}

// ── Rotas ───────────────────────────────────────────────────────────────────

const generating = new Set();

function ageToBirthDate(age) {
  const y = new Date().getFullYear() - Number(age);
  return `${y}-07-01`;
}

async function saveProfile(db, userId, data) {
  await db.query(
    `insert into fitness_profile (user_id, data, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [userId, JSON.stringify(data)]
  );
}

async function latestPlan(db, userId) {
  const { rows } = await db.query('select id, targets, diet, workout, created_at from fitness_plan where user_id = $1 order by created_at desc limit 1', [userId]);
  return rows[0] || null;
}

async function buildPlan(db, userId, profile, language) {
  const targets = computeTargets(profile);
  // Se a IA falhar (sem crédito, fora do ar), cai no plano por regra: a pessoa não
  // fica presa no fim do onboarding.
  const [d, w] = await Promise.allSettled([
    generateDiet(profile, targets, language),
    generateWorkout(profile, targets, language),
  ]);
  if (d.status === 'rejected') console.warn('[fitness] diet AI failed, using fallback:', d.reason?.message);
  if (w.status === 'rejected') console.warn('[fitness] workout AI failed, using fallback:', w.reason?.message);
  const diet = d.status === 'fulfilled' ? { ...d.value, source: 'ia' } : fallbackDiet(profile, targets);
  const workout = w.status === 'fulfilled' ? { ...w.value, source: 'ia' } : fallbackWorkout(profile);
  const { rows } = await db.query(
    'insert into fitness_plan (user_id, targets, diet, workout) values ($1,$2,$3,$4) returning id, targets, diet, workout, created_at',
    [userId, JSON.stringify(targets), JSON.stringify(diet), JSON.stringify(workout)]
  );
  // As metas do plano viram as metas do Diário, que já existe no app.
  await saveNutritionGoals(userId, {
    calories_kcal: targets.calories_kcal, protein_g: targets.protein_g, fat_g: targets.fat_g, carbs_g: targets.carbs_g,
    fiber_g: targets.fiber_g, sugar_g: null, salt_g: 5, water_ml: targets.water_ml, bmr: targets.bmr, tdee: targets.tdee,
  }).catch(e => console.warn('[fitness] goals', e.message));
  return rows[0];
}

/**
 * Trata as rotas /v2/*. Devolve true quando respondeu.
 */
export async function handleFitnessRoutes(req, res, { origin, sendJson, readJsonBody, getAuthUser }) {
  if (!req.url.startsWith('/v2/')) return false;
  const claims = getAuthUser(req);
  if (!claims) { sendJson(res, 401, { error: 'Unauthorized' }, origin); return true; }
  const userId = claims.userId;
  const db = await getPool();
  if (!db) { sendJson(res, 503, { error: 'database not configured' }, origin); return true; }
  const url = new URL(req.url, 'http://x');
  const path = url.pathname;

  // GET /v2/fitness — perfil + plano atual
  if (req.method === 'GET' && path === '/v2/fitness') {
    const { rows } = await db.query('select data from fitness_profile where user_id = $1', [userId]);
    const plan = await latestPlan(db, userId);
    sendJson(res, 200, { profile: rows[0]?.data || null, plan, generating: generating.has(userId) }, origin);
    return true;
  }

  // PUT /v2/fitness/profile — salva o onboarding e espelha nas tabelas antigas
  if (req.method === 'PUT' && path === '/v2/fitness/profile') {
    const body = await readJsonBody(req);
    const p = body.profile || {};
    await saveProfile(db, userId, p);
    const goalMap = { lose: 'lose', recomp: 'lose', gain: 'gain', health: 'maintain' };
    const actMap = { sedentary: 'sedentary', light: 'light', moderate: 'moderate', active: 'active', athlete: 'very_active' };
    await saveBodyProfile(userId, {
      sex: p.sex || null, birth_date: p.age ? ageToBirthDate(p.age) : null,
      height_cm: p.height_cm || null, weight_kg: p.weight_kg || null,
      activity_level: actMap[p.activity] || 'moderate', goal: goalMap[p.goal] || 'maintain',
    }).catch(e => console.warn('[fitness] body profile', e.message));
    if (body.first && p.weight_kg) await logWeight(userId, p.weight_kg).catch(() => {});
    if (body.first && p.measurements && Object.keys(p.measurements).length) {
      const t = computeTargets(p);
      await logBodyMeasurements(userId, { ...p.measurements, body_fat_pct: t.body_fat_source === 'measurements' ? t.body_fat_pct : null }).catch(() => {});
    }
    sendJson(res, 200, { ok: true, targets: computeTargets(p) }, origin);
    return true;
  }

  // POST /v2/fitness/plan — gera dieta + treino (síncrono, ~40-90 s)
  if (req.method === 'POST' && path === '/v2/fitness/plan') {
    const body = await readJsonBody(req);
    if (generating.has(userId)) { sendJson(res, 409, { error: 'already generating' }, origin); return true; }
    // Dieta e treino gerados pela IA são do plano pago, como no app (free e sem plano vão pro paywall).
    const u = await getUserById(userId);
    if (!['starter', 'premium', 'admin'].includes(u?.user_type)) { sendJson(res, 402, { error: 'paid plan required' }, origin); return true; }
    const { rows } = await db.query('select data from fitness_profile where user_id = $1', [userId]);
    const profile = rows[0]?.data;
    if (!profile) { sendJson(res, 400, { error: 'profile missing' }, origin); return true; }
    generating.add(userId);
    try {
      const plan = await buildPlan(db, userId, profile, body.language || 'pt');
      sendJson(res, 200, { plan }, origin);
    } catch (e) {
      console.error('[fitness] plan', e);
      sendJson(res, 502, { error: 'plan generation failed', detail: e.message }, origin);
    } finally {
      generating.delete(userId);
    }
    return true;
  }

  // POST /v2/diet/log-meal — joga a refeição do plano no Diário
  if (req.method === 'POST' && path === '/v2/diet/log-meal') {
    const { meal, local_date, meal_type } = await readJsonBody(req);
    if (!meal?.items?.length) { sendJson(res, 400, { error: 'meal required' }, origin); return true; }
    const ids = [];
    for (const it of meal.items) {
      const g = String(it.qty || '').match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
      ids.push(await addConsumptionEntry(userId, {
        product_name: it.food, source: 'plan', grams: g ? Number(g[1].replace(',', '.')) : null,
        meal_type: meal_type || null,
        calories_kcal: it.kcal, protein_g: it.protein_g, carbs_g: it.carbs_g, fat_g: it.fat_g,
        notes: it.qty || null, consumed_at: local_date ? `${local_date}T12:00:00` : null,
      }));
    }
    sendJson(res, 200, { ok: true, ids }, origin);
    return true;
  }

  // POST /v2/workout/set — grava (ou apaga, com weight_kg null e reps null) uma série
  if (req.method === 'POST' && path === '/v2/workout/set') {
    const b = await readJsonBody(req);
    if (!b.local_date || !b.exercise_key || b.set_index == null) {
      sendJson(res, 400, { error: 'local_date, exercise_key, set_index required' }, origin); return true;
    }
    if (b.remove) {
      await db.query('delete from workout_set_log where user_id=$1 and local_date=$2 and exercise_key=$3 and set_index=$4',
        [userId, b.local_date, b.exercise_key, b.set_index]);
      sendJson(res, 200, { ok: true }, origin); return true;
    }
    const { rows } = await db.query(
      `insert into workout_set_log (user_id, local_date, day_key, exercise_key, exercise_name, set_index, weight_kg, reps)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (user_id, local_date, exercise_key, set_index)
       do update set weight_kg = excluded.weight_kg, reps = excluded.reps, day_key = excluded.day_key, logged_at = now()
       returning *`,
      [userId, b.local_date, b.day_key || null, b.exercise_key, b.exercise_name || null, b.set_index,
       num(b.weight_kg, 0, 1000), num(b.reps, 0, 500)]
    );
    sendJson(res, 200, rows[0], origin);
    return true;
  }

  // GET /v2/workout/state?date=YYYY-MM-DD — séries do dia + última vez de cada exercício + semana
  if (req.method === 'GET' && path === '/v2/workout/state') {
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const today = await db.query('select * from workout_set_log where user_id=$1 and local_date=$2 order by exercise_key, set_index', [userId, date]);
    // Última sessão anterior de cada exercício (a carga de referência).
    const last = await db.query(
      `with lastday as (
         select exercise_key, max(local_date) d from workout_set_log
         where user_id=$1 and local_date < $2 group by exercise_key)
       select w.exercise_key, w.local_date, w.set_index, w.weight_kg, w.reps
       from workout_set_log w join lastday l on l.exercise_key = w.exercise_key and l.d = w.local_date
       where w.user_id=$1 order by w.exercise_key, w.set_index`, [userId, date]);
    const best = await db.query(
      `select exercise_key, max(weight_kg) best_kg from workout_set_log where user_id=$1 and weight_kg is not null group by exercise_key`, [userId]);
    const week = await db.query(
      `select local_date, day_key, count(*)::int sets, coalesce(sum(weight_kg * reps),0)::float volume
       from workout_set_log where user_id=$1 and local_date > ($2::date - 28) group by local_date, day_key order by local_date`, [userId, date]);
    const lastByEx = {};
    for (const r of last.rows) (lastByEx[r.exercise_key] ||= { date: r.local_date, sets: [] }).sets.push(r);
    sendJson(res, 200, {
      today: today.rows,
      last: lastByEx,
      best: Object.fromEntries(best.rows.map(r => [r.exercise_key, Number(r.best_kg)])),
      sessions: week.rows,
    }, origin);
    return true;
  }

  // GET /v2/workout/history?exercise=key — evolução de um exercício
  if (req.method === 'GET' && path === '/v2/workout/history') {
    const ex = url.searchParams.get('exercise');
    const { rows } = await db.query(
      `select local_date, max(weight_kg)::float top_kg, sum(weight_kg*reps)::float volume, count(*)::int sets
       from workout_set_log where user_id=$1 and exercise_key=$2 group by local_date order by local_date`, [userId, ex]);
    sendJson(res, 200, rows, origin);
    return true;
  }

  sendJson(res, 404, { error: 'not found' }, origin);
  return true;
}

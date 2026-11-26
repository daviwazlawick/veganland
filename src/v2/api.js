// Chamadas da V2 (rotas /v2/* em server/src/fitness.js).
const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const APP_API_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';

function headers(token) {
  return {
    'Content-Type': 'application/json',
    ...(APP_API_KEY ? { 'x-app-api-key': APP_API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function call(token, method, path, body) {
  const r = await fetch(`${API_URL}${path}`, { method, headers: headers(token), body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || `HTTP ${r.status}`);
    err.status = r.status; err.detail = data.detail;
    throw err;
  }
  return data;
}

export const v2GetFitness = token => call(token, 'GET', '/v2/fitness');
export const v2SaveProfile = (token, profile, first = false) => call(token, 'PUT', '/v2/fitness/profile', { profile, first });
export const v2GeneratePlan = (token, language) => call(token, 'POST', '/v2/fitness/plan', { language });
export const v2WorkoutState = (token, date) => call(token, 'GET', `/v2/workout/state?date=${date}`);
export const v2ExerciseHistory = (token, key) => call(token, 'GET', `/v2/workout/history?exercise=${encodeURIComponent(key)}`);

// As escritas abaixo respeitam demo mode: quando chamadas com { demoMode: true }
// no último argumento, devolvem uma resposta fake e não batem no servidor.
export const v2LogMeal = (token, meal, local_date, meal_type, opts = {}) => {
  if (opts.demoMode) return Promise.resolve({ ok: true, ids: [`demo-${Date.now()}`], demo: true });
  return call(token, 'POST', '/v2/diet/log-meal', { meal, local_date, meal_type });
};
export const v2SaveSet = (token, data, opts = {}) => {
  if (opts.demoMode) return Promise.resolve({ ...data, id: `demo-${Date.now()}`, logged_at: new Date().toISOString(), demo: true });
  return call(token, 'POST', '/v2/workout/set', data);
};
export const v2LogSession = (token, local_date, day_key, duration_min, opts = {}) => {
  if (opts.demoMode) return Promise.resolve({ id: `demo-${Date.now()}`, local_date, day_key, duration_min, demo: true });
  return call(token, 'POST', '/v2/workout/log-session', { local_date, day_key, duration_min });
};

export function localDate(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

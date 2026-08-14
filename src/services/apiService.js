const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const APP_API_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';

function baseUrl() {
  return API_URL.replace(/\/$/, '');
}

function appHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(APP_API_KEY ? { 'x-app-api-key': APP_API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function hasApiConfig() {
  return API_URL.trim().length > 0;
}

export async function analyzeProductWithApi(imageBase64, profile, language, token, barcode = null, skipBarcodeCache = false) {
  const response = await fetch(`${baseUrl()}/analyze-product`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg', profile, language, barcode, skipBarcodeCache }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `API error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function analyzeBarcodeWithApi(barcode, profile, language, token) {
  const response = await fetch(`${baseUrl()}/analyze-product`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ barcode, profile, language }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `API error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiGetMe(token) {
  const response = await fetch(`${baseUrl()}/auth/me`, {
    headers: appHeaders(token),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function apiUpdateProfile(profileData, token) {
  const response = await fetch(`${baseUrl()}/user/profile`, {
    method: 'PATCH',
    headers: appHeaders(token),
    body: JSON.stringify(profileData),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to update profile');
  return data;
}

export async function apiLogin(email, password) {
  const response = await fetch(`${baseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Login failed`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiRegister(email, password, disclaimerVersion, referralCode = null) {
  const response = await fetch(`${baseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, disclaimer_version: disclaimerVersion, referral_code: referralCode || undefined }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Registration failed`);
  return data;
}

export async function apiOAuthSignIn(provider, payload) {
  const response = await fetch(`${baseUrl()}/auth/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${provider}_sign_in_failed`);
  return data;
}

export async function apiGetReferral(token) {
  const response = await fetch(`${baseUrl()}/referral/me`, { headers: appHeaders(token) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function apiAdminHandoff(token) {
  const response = await fetch(`${baseUrl()}/admin/handoff`, {
    method: 'POST',
    headers: appHeaders(token),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed');
  return data.url;
}

export async function apiRegisterPush(token, { token: pushToken, platform, locale, timezone }) {
  const response = await fetch(`${baseUrl()}/push/register`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ token: pushToken, platform, locale, timezone }),
  });
  return response.ok;
}

export async function apiSyncPushTimezone(token) {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;
    await fetch(`${baseUrl()}/push/timezone`, {
      method: 'PATCH',
      headers: appHeaders(token),
      body: JSON.stringify({ timezone }),
    });
  } catch {}
}

export async function apiUnregisterPush(pushToken) {
  const response = await fetch(`${baseUrl()}/push/unregister`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(APP_API_KEY ? { 'x-app-api-key': APP_API_KEY } : {}) },
    body: JSON.stringify({ token: pushToken }),
  });
  return response.ok;
}

export async function apiRedeemReferral(token, code) {
  const response = await fetch(`${baseUrl()}/referral/redeem`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ code }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ...data };
}

export async function apiAcceptDisclaimer(token, disclaimerVersion) {
  const response = await fetch(`${baseUrl()}/user/disclaimer`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ disclaimer_version: disclaimerVersion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function apiForgotPassword(email) {
  const brand = process.env.EXPO_PUBLIC_BRAND || 'veganland';
  const response = await fetch(`${baseUrl()}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, brand }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiResendConfirmation(token) {
  const response = await fetch(`${baseUrl()}/auth/resend-confirmation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiResendConfirmationByEmail(email) {
  const response = await fetch(`${baseUrl()}/auth/resend-confirmation-by-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiCheckAppVersion() {
  const response = await fetch(`${baseUrl()}/app/version`).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
}

export async function apiDeleteAccount(token) {
  const response = await fetch(`${baseUrl()}/user/account`, {
    method: 'DELETE',
    headers: appHeaders(token),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to delete account');
  return data;
}

export async function apiSetUserPlan(plan, token) {
  const response = await fetch(`${baseUrl()}/user/plan`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ plan }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to set plan');
  return data;
}

export async function apiGetHistory(token) {
  const response = await fetch(`${baseUrl()}/user/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Failed to load history`);
  return data.history || [];
}

export async function apiReportPushClick(token, broadcastId) {
  const response = await fetch(`${baseUrl()}/push/click`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ broadcast_id: broadcastId }),
  });
  return response.ok;
}

export async function apiReportNotificationTap(token, slot) {
  const response = await fetch(`${baseUrl()}/push/notification-tap`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ slot }),
  });
  return response.ok;
}

export async function apiSubmitFeedback(token, { scanId, rating, comment }) {
  const response = await fetch(`${baseUrl()}/feedback`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ scanId, rating, comment: comment || undefined }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to submit feedback');
  return data;
}

export async function apiSubmitAppSurvey(token, { message, language }) {
  const response = await fetch(`${baseUrl()}/app-survey`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ message, language }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to submit survey');
  return data;
}

// ── Nutrition API ─────────────────────────────────────────────────────────────

export async function apiGetBodyProfile(token) {
  const r = await fetch(`${baseUrl()}/nutrition/profile`, { headers: appHeaders(token) });
  return r.json().catch(() => ({}));
}

export async function apiSaveBodyProfile(token, data) {
  const r = await fetch(`${baseUrl()}/nutrition/profile`, { method: 'PUT', headers: appHeaders(token), body: JSON.stringify(data) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Failed to save body profile');
  return body;
}

export async function apiGetNutritionGoals(token) {
  const r = await fetch(`${baseUrl()}/nutrition/goals`, { headers: appHeaders(token) });
  return r.json().catch(() => ({}));
}

export async function apiSaveNutritionGoals(token, goals) {
  const r = await fetch(`${baseUrl()}/nutrition/goals`, { method: 'PUT', headers: appHeaders(token), body: JSON.stringify(goals) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Failed to save goals');
  return body;
}

export async function apiLogConsumption(token, entry) {
  const r = await fetch(`${baseUrl()}/nutrition/log`, { method: 'POST', headers: appHeaders(token), body: JSON.stringify(entry) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Failed to log entry');
  return body;
}

export async function apiUpdateConsumption(token, id, entry) {
  const r = await fetch(`${baseUrl()}/nutrition/log/${id}`, { method: 'PATCH', headers: appHeaders(token), body: JSON.stringify(entry) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Failed to update entry');
  return body;
}

export async function apiDeleteConsumption(token, id) {
  const r = await fetch(`${baseUrl()}/nutrition/log/${id}`, { method: 'DELETE', headers: appHeaders(token) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Failed to delete entry');
  return body;
}

export async function apiGetDayLog(token, date) {
  const r = await fetch(`${baseUrl()}/nutrition/log?date=${date}`, { headers: appHeaders(token) });
  return r.json().catch(() => []);
}

export async function apiGetNutritionReport(token, from, to) {
  const r = await fetch(`${baseUrl()}/nutrition/report?from=${from}&to=${to}`, { headers: appHeaders(token) });
  return r.json().catch(() => ({ rows: [] }));
}

export async function apiLogWeight(token, weight_kg) {
  const r = await fetch(`${baseUrl()}/nutrition/weight`, { method: 'POST', headers: appHeaders(token), body: JSON.stringify({ weight_kg }) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Failed to log weight');
  return body;
}

export async function apiGetWeightHistory(token) {
  const r = await fetch(`${baseUrl()}/nutrition/weight`, { headers: appHeaders(token) });
  return r.json().catch(() => []);
}

export async function apiLogMeasurements(token, data) {
  const r = await fetch(`${baseUrl()}/nutrition/measurements`, { method: 'POST', headers: appHeaders(token), body: JSON.stringify(data) });
  return r.json().catch(() => ({}));
}

export async function apiGetMeasurements(token) {
  const r = await fetch(`${baseUrl()}/nutrition/measurements`, { headers: appHeaders(token) });
  return r.json().catch(() => []);
}

export async function apiGetRecentPlates(token) {
  const r = await fetch(`${baseUrl()}/nutrition/plates`, { headers: appHeaders(token) });
  if (!r.ok) return [];
  return r.json();
}

export async function apiSearchFood(token, query, language = 'en') {
  const r = await fetch(`${baseUrl()}/nutrition/search?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(language)}`, {
    headers: appHeaders(token),
  });
  if (!r.ok) return [];
  return r.json();
}

export async function apiGetTodayExercise(token, date) {
  try {
    const r = await fetch(`${baseUrl()}/exercise/today?date=${encodeURIComponent(date)}`, {
      headers: appHeaders(token),
    });
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

export async function apiLogExercise(token, entry) {
  const r = await fetch(`${baseUrl()}/exercise/log`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify(entry),
  });
  if (!r.ok) throw new Error('exercise_log_failed');
  return r.json().catch(() => ({}));
}

export async function apiDeleteExercise(token, id) {
  await fetch(`${baseUrl()}/exercise/log/${id}`, {
    method: 'DELETE',
    headers: appHeaders(token),
  }).catch(() => {});
}

export async function apiGetExerciseHistory(token, from, to) {
  const r = await fetch(`${baseUrl()}/exercise/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    headers: appHeaders(token),
  });
  if (!r.ok) return [];
  return r.json();
}

export async function apiAnalyzePlate(token, imageBase64, language, profile) {
  const r = await fetch(`${baseUrl()}/analyze-plate`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ image: imageBase64, language, profile: profile || null }),
  });
  if (r.status === 429) throw new Error('scan_limit_reached');
  if (!r.ok) throw new Error('plate_analysis_failed');
  return r.json();
}

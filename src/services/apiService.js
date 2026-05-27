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

export async function analyzeProductWithApi(imageBase64, profile, language, token) {
  const response = await fetch(`${baseUrl()}/analyze-product`, {
    method: 'POST',
    headers: appHeaders(token),
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg', profile, language }),
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

export async function apiRegister(email, password) {
  const response = await fetch(`${baseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Registration failed`);
  return data;
}

export async function apiForgotPassword(email) {
  const response = await fetch(`${baseUrl()}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
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

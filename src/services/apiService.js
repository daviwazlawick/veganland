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
  if (!response.ok) throw new Error(data.error || `API error ${response.status}`);
  return data;
}

export async function apiLogin(email, password) {
  const response = await fetch(`${baseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Login failed`);
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

export async function apiGetHistory(token) {
  const response = await fetch(`${baseUrl()}/user/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Failed to load history`);
  return data.history || [];
}

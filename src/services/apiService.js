const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const APP_API_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';

export function hasApiConfig() {
  return API_URL.trim().length > 0;
}

export async function analyzeProductWithApi(imageBase64, profile, language) {
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/analyze-product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_API_KEY ? { 'x-app-api-key': APP_API_KEY } : {}),
    },
    body: JSON.stringify({
      imageBase64,
      mediaType: 'image/jpeg',
      profile,
      language,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `API error ${response.status}`);
  }

  return data;
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const APP_API_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || '';

function baseUrl() {
  return API_URL.replace(/\/$/, '');
}

const APP_VERSION = Constants?.expoConfig?.version || null;

// Fire-and-forget funnel event. Never throws. Fails silently on network
// error — telemetry must never block a user action.
export function logFunnelEvent(type, metadata = {}, token = null) {
  if (!API_URL || !type) return;
  const body = JSON.stringify({
    type,
    metadata: {
      platform: Platform.OS,
      app_version: APP_VERSION,
      ...metadata,
    },
  });
  fetch(`${baseUrl()}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_API_KEY ? { 'x-app-api-key': APP_API_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  }).catch(() => {});
}

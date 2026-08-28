// Marketing attribution capture.
//
// We stamp two things onto the account at signup / first fresh login:
//   1. platform_os — always known (Platform.OS)
//   2. utm_source / utm_medium / utm_campaign — from an initial deep link
//      URL if the app was opened via one (e.g. novaqi.app/?utm_source=meta
//      resolved into the app), OR from a stashed value in AsyncStorage.
//
// The values live in AsyncStorage so they persist across cold starts even
// before the user logs in. They are read synchronously into module state
// at app boot via `bootAttribution()`, then passed to every auth call
// through `getAttributionPayload()`.
//
// On the server, `extractAttribution()` normalizes + range-clamps these,
// and either seeds them at INSERT time (createUser / createOAuthUser) or
// backfills nulls on login (backfillAttributionIfMissing).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// expo-linking has a native module (requireNativeModule runs at import time) —
// guard the require so OTAs can ship safely to native builds that don't have
// it linked yet. Every call site below already wraps Linking usage in
// try/catch, so a null Linking here just means attribution silently no-ops.
let Linking = null;
try { Linking = require('expo-linking'); } catch {}

const STORAGE_KEY = '@attribution';

// Cached in-memory copy so getAttributionPayload() is synchronous. Boot
// fills this from AsyncStorage before any auth request goes out.
let cache = null;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

function pickUtms(queryParams) {
  if (!queryParams) return null;
  const out = {};
  let found = false;
  for (const k of UTM_KEYS) {
    const v = queryParams[k];
    if (typeof v === 'string' && v.trim()) {
      out[k] = v.trim().slice(0, 100);
      found = true;
    }
  }
  return found ? out : null;
}

// Parse an incoming URL (initial or runtime) and merge any utm_* params
// into storage. Deferred deep links from Play Install Referrer or App
// Store universal links would arrive here too when they hit the app.
export async function captureUtmFromUrl(url) {
  if (!url) return;
  try {
    const parsed = Linking.parse(url);
    const utms = pickUtms(parsed?.queryParams);
    if (!utms) return;
    const existing = cache || {};
    // First-touch attribution: don't overwrite an already-recorded source.
    if (existing.utm_source || existing.utm_medium || existing.utm_campaign) return;
    cache = { ...existing, ...utms };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

// Load stashed attribution + install-time platform into memory. Call
// once at app boot before any auth flow.
export async function bootAttribution() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  // Check the URL the app was opened with — if it carries utm_* and we
  // haven't recorded any yet, this is our chance to capture it before
  // the user logs in / registers.
  try {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) await captureUtmFromUrl(initialUrl);
  } catch {}
}

// Called synchronously from every auth request. Falls back to just
// platform_os if the storage read hasn't completed yet (unlikely but
// defensive — server ignores undefined fields).
export function getAttributionPayload() {
  const c = cache || {};
  return {
    utm_source:   c.utm_source   || undefined,
    utm_medium:   c.utm_medium   || undefined,
    utm_campaign: c.utm_campaign || undefined,
    platform_os:  Platform.OS,
  };
}

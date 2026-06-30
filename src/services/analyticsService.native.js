import { Platform } from 'react-native';
import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import analytics from '@react-native-firebase/analytics';

const FB_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID || '';
const FB_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN || '';
const configured = !!(FB_APP_ID && FB_CLIENT_TOKEN);

let initialized = false;

export function isAnalyticsConfigured() {
  return configured;
}

// Firebase Analytics is enabled by the presence of google-services.json /
// GoogleService-Info.plist at build time. Collection is gated on consent.
async function fb() {
  try { return analytics(); } catch { return null; }
}

async function setFirebaseCollection(enabled) {
  const a = await fb();
  if (!a) return;
  try { await a.setAnalyticsCollectionEnabled(!!enabled); } catch {}
}

export async function initAnalytics() {
  if (!configured || initialized) return;
  try {
    Settings.setAppID(FB_APP_ID);
    Settings.setClientToken(FB_CLIENT_TOKEN);
    if (Platform.OS === 'ios') {
      const { status } = await getTrackingPermissionsAsync();
      Settings.setAdvertiserTrackingEnabled(status === 'granted');
      await setFirebaseCollection(status === 'granted');
    } else {
      Settings.setAdvertiserTrackingEnabled(true);
      await setFirebaseCollection(true);
    }
    Settings.setAutoLogAppEventsEnabled(true);
    Settings.setAdvertiserIDCollectionEnabled(true);
    await Settings.initializeSDK();
    initialized = true;
  } catch (e) {
    if (__DEV__) console.warn('analytics init failed', e);
  }
}

export async function requestTrackingPermission() {
  if (!configured) return 'unavailable';
  if (Platform.OS !== 'ios') return 'granted';
  try {
    const { status } = await requestTrackingPermissionsAsync();
    Settings.setAdvertiserTrackingEnabled(status === 'granted');
    await setFirebaseCollection(status === 'granted');
    if (!initialized) await initAnalytics();
    return status;
  } catch {
    return 'denied';
  }
}

function safeLog(name, params) {
  if (!configured || !initialized) return;
  try { AppEventsLogger.logEvent(name, params || {}); }
  catch (e) { if (__DEV__) console.warn('FB log failed', name, e); }
}

async function safeFbLog(name, params) {
  const a = await fb();
  if (!a) return;
  try { await a.logEvent(name, params || {}); }
  catch (e) { if (__DEV__) console.warn('Firebase log failed', name, e); }
}

export function logRegistration(method = 'email') {
  safeLog('fb_mobile_complete_registration', { fb_registration_method: method });
  // Firebase standard event for Google Ads UAC optimisation
  safeFbLog('sign_up', { method });
}

export function logStartTrial({ price, currency, planId } = {}) {
  if (configured && initialized) {
    try {
      const params = { fb_content_id: planId || '', fb_currency: currency || 'EUR' };
      AppEventsLogger.logEvent('StartTrial', Number(price) || 0, params);
    } catch (e) { if (__DEV__) console.warn('FB StartTrial failed', e); }
  }
  // Firebase doesn't have a "trial start" standard; reuse begin_checkout so
  // Google Ads can optimise toward this funnel step.
  safeFbLog('begin_checkout', {
    value: Number(price) || 0,
    currency: currency || 'EUR',
    items: planId ? [{ item_id: planId }] : [],
  });
}

export function logSubscribe({ price, currency, planId } = {}) {
  const amount = Number(price) || 0;
  const cur = currency || 'EUR';
  if (configured && initialized) {
    try {
      AppEventsLogger.logPurchase(amount, cur, { fb_content_id: planId || '' });
      AppEventsLogger.logEvent('Subscribe', amount, { fb_content_id: planId || '', fb_currency: cur });
    } catch (e) { if (__DEV__) console.warn('FB Subscribe failed', e); }
  }
  // Firebase 'purchase' is the canonical event Google Ads optimises tROAS on
  safeFbLog('purchase', {
    value: amount,
    currency: cur,
    transaction_id: planId || undefined,
    items: planId ? [{ item_id: planId, price: amount, quantity: 1 }] : [],
  });
}

export function logScan(status) {
  safeLog('Scan', { status: status || 'unknown' });
  safeFbLog('product_scan', { status: status || 'unknown' });
}

export function logInviteShared(params = {}) {
  safeLog('InviteShared', params);
  safeFbLog('share', { content_type: 'referral_code', ...params });
}

export function logReferralQualified(params = {}) {
  safeLog('ReferralQualified', params);
  safeFbLog('referral_qualified', params);
}

export function logEvent(name, params = {}) {
  safeLog(name, params);
  safeFbLog(name, params);
}

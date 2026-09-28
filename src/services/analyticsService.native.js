import { Platform } from 'react-native';
import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { logFunnelEvent } from './funnelService';

const FB_APP_ID = process.env.EXPO_PUBLIC_FB_APP_ID || '';
const FB_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FB_CLIENT_TOKEN || '';
const configured = !!(FB_APP_ID && FB_CLIENT_TOKEN);

let initialized = false;

export function isAnalyticsConfigured() {
  return configured;
}

// Diagnostic only — investigating why Meta Ads shows 0 attributed Android
// installs despite regular ActivateApp/DeactivateApp events arriving daily
// (proof the SDK itself works). Every prior try/catch here swallowed errors
// silently (console.warn is __DEV__-only, so production told us nothing).
// This reports what actually happens on real devices via the existing
// funnel_events pipe — safe to remove once the cause is confirmed.
export async function initAnalytics() {
  if (!configured) {
    logFunnelEvent('meta_sdk_init', { success: false, reason: 'not_configured' });
    return;
  }
  if (initialized) return;
  try {
    Settings.setAppID(FB_APP_ID);
    Settings.setClientToken(FB_CLIENT_TOKEN);
    let attStatus = null;
    if (Platform.OS === 'ios') {
      const { status } = await getTrackingPermissionsAsync();
      attStatus = status;
      Settings.setAdvertiserTrackingEnabled(status === 'granted');
    } else {
      Settings.setAdvertiserTrackingEnabled(true);
    }
    Settings.setAutoLogAppEventsEnabled(true);
    Settings.setAdvertiserIDCollectionEnabled(true);
    await Settings.initializeSDK();
    initialized = true;
    logFunnelEvent('meta_sdk_init', { success: true, att_status: attStatus });
  } catch (e) {
    if (__DEV__) console.warn('FB SDK init failed', e);
    logFunnelEvent('meta_sdk_init', { success: false, reason: 'exception', error: String(e?.message || e).slice(0, 200) });
  }
}

export async function requestTrackingPermission() {
  if (!configured) return 'unavailable';
  if (Platform.OS !== 'ios') {
    // Android: no ATT prompt, but we still need to boot the Meta SDK here
    // so install/registration/scan events flow. Without this, the SDK
    // stays uninitialized and every AppEventsLogger.logEvent is a no-op
    // — including the auto fb_mobile_activate_app (install) event, which
    // breaks Meta Ads attribution on Android entirely.
    if (!initialized) await initAnalytics();
    return 'granted';
  }
  try {
    const { status } = await requestTrackingPermissionsAsync();
    Settings.setAdvertiserTrackingEnabled(status === 'granted');
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

export function logRegistration(method = 'email') {
  safeLog('fb_mobile_complete_registration', { fb_registration_method: method });
}

export function logStartTrial({ price, currency, planId } = {}) {
  if (!configured || !initialized) return;
  try {
    const params = { fb_content_id: planId || '', fb_currency: currency || 'EUR' };
    AppEventsLogger.logEvent('StartTrial', Number(price) || 0, params);
  } catch (e) { if (__DEV__) console.warn('FB StartTrial failed', e); }
}

export function logSubscribe({ price, currency, planId } = {}) {
  if (!configured || !initialized) return;
  try {
    const amount = Number(price) || 0;
    const cur = currency || 'EUR';
    AppEventsLogger.logPurchase(amount, cur, { fb_content_id: planId || '' });
    AppEventsLogger.logEvent('Subscribe', amount, { fb_content_id: planId || '', fb_currency: cur });
  } catch (e) { if (__DEV__) console.warn('FB Subscribe failed', e); }
}

export function logScan(status) {
  safeLog('Scan', { status: status || 'unknown' });
}

export function logInviteShared(params = {}) {
  safeLog('InviteShared', params);
}

export function logReferralQualified(params = {}) {
  safeLog('ReferralQualified', params);
}

export function logEvent(name, params = {}) {
  safeLog(name, params);
}

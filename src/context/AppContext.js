import React, { createContext, useContext, useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiGetHistory, apiGetMe, apiUpdateProfile, apiSyncPushTimezone } from '../services/apiService';
import { requestTrackingPermission, logScan, initAnalytics } from '../services/analyticsService';
import { applyHalalRules, HALAL_STATUS, DEFAULT_HALAL_STRICTNESS } from '../constants/halalRules';
import { applyKosherRules, KOSHER_STATUS } from '../constants/kosherRules';

const SUPPORTED_LANGUAGES = ['pt', 'en', 'de', 'fr', 'it', 'es'];
const FALLBACK_LANGUAGE = 'en';

// Read the OS locale via RN's core NativeModules — no extra native dep,
// safe over OTA. Returns a 2-letter code the app supports, or FALLBACK_LANGUAGE.
function detectDeviceLanguage() {
  try {
    let raw;
    if (Platform.OS === 'ios') {
      const s = NativeModules.SettingsManager && NativeModules.SettingsManager.settings;
      raw = (s && (s.AppleLocale || (Array.isArray(s.AppleLanguages) && s.AppleLanguages[0]))) || null;
    } else if (Platform.OS === 'android') {
      raw = NativeModules.I18nManager && NativeModules.I18nManager.localeIdentifier;
    }
    if (!raw) return FALLBACK_LANGUAGE;
    const code = String(raw).slice(0, 2).toLowerCase();
    return SUPPORTED_LANGUAGES.includes(code) ? code : FALLBACK_LANGUAGE;
  } catch {
    return FALLBACK_LANGUAGE;
  }
}

const AppContext = createContext(null);

const STORAGE_KEYS = {
  profile: '@veganland_profile',
  language: '@veganland_language',
  scan_history: '@veganland_scan_history',
  disclaimer: '@veganland_disclaimer_accepted',
  app_survey_done: '@veganland_app_survey_done',
};

export function AppProvider({ children }) {
  const { token } = useAuth();
  const [language, setLanguageState] = useState(detectDeviceLanguage);
  const [profile, setProfileState] = useState(null);
  const [scanHistory, setScanHistoryState] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [disclaimerAccepted, setDisclaimerAcceptedState] = useState(false);
  const [appSurveyDone, setAppSurveyDoneState] = useState(false);
  const [monthlyScanCount, setMonthlyScanCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (token) {
      setIsProfileLoaded(false);
      loadServerHistory();
      loadServerProfile();
      apiSyncPushTimezone(token).catch(() => {});
    } else {
      setIsProfileLoaded(true);
    }
  }, [token]);

  async function loadServerProfile() {
    try {
      const { user, usage, streak: streakValue } = await apiGetMe(token);
      if (usage?.count != null) setMonthlyScanCount(usage.count + (usage.bonus_remaining != null ? 0 : 0));
      if (streakValue != null) setStreak(streakValue);
      const localRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
      const local = localRaw ? JSON.parse(localRaw) : {};
      // Server is authoritative for name, bio, and avatar_url.
      // Fall back to local for native file:// photos that were never uploaded.
      const serverAvatar = user?.avatar_url || null;
      const localPhoto = local.photoUri || null;
      const photoUri = serverAvatar || (localPhoto?.startsWith('file://') ? localPhoto : null);
      const serverProfile = {
        name: user?.name || local.name || null,
        bio: user?.bio || local.bio || null,
        photoUri,
        dietId: user?.diet_id || local.dietId || null,
        allergyIds: user?.allergy_ids || local.allergyIds || [],
        halalStrictness: user?.halal_strictness ?? local.halalStrictness ?? null,
      };
      // Only persist if there's something worth keeping
      if (serverProfile.name || serverProfile.dietId || serverProfile.photoUri) {
        setProfileState(serverProfile);
        await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(serverProfile));
      }
    } catch {
      // silently keep local profile if server fails
    } finally {
      setIsProfileLoaded(true);
    }
  }

  async function loadAll() {
    try {
      const [lang, prof, history, disclaimer, surveyDone] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.language),
        AsyncStorage.getItem(STORAGE_KEYS.profile),
        AsyncStorage.getItem(STORAGE_KEYS.scan_history),
        AsyncStorage.getItem(STORAGE_KEYS.disclaimer),
        AsyncStorage.getItem(STORAGE_KEYS.app_survey_done),
      ]);
      if (lang) setLanguageState(lang);
      if (prof) setProfileState(JSON.parse(prof));
      if (history) setScanHistoryState(JSON.parse(history));
      if (disclaimer === 'true') setDisclaimerAcceptedState(true);
      if (surveyDone === 'true') setAppSurveyDoneState(true);
      // Boot the Meta SDK at cold start so fb_mobile_activate_app fires
      // for install/open attribution. Android: always. iOS: only when the
      // disclaimer was already accepted (ATT was already decided — iOS won't
      // show the popup again, just returns the cached status). First-time iOS
      // users still go through acceptDisclaimer() → requestTrackingPermission().
      if (Platform.OS === 'android') {
        initAnalytics().catch(() => {});
      } else if (Platform.OS === 'ios' && disclaimer === 'true') {
        requestTrackingPermission().catch(() => {});
      }
    } catch (e) {
      console.error('Failed to load storage', e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function acceptDisclaimer() {
    setDisclaimerAcceptedState(true);
    await AsyncStorage.setItem(STORAGE_KEYS.disclaimer, 'true');
    requestTrackingPermission().catch(() => {});
  }

  async function markAppSurveyDone() {
    setAppSurveyDoneState(true);
    await AsyncStorage.setItem(STORAGE_KEYS.app_survey_done, 'true');
  }

  async function loadServerHistory() {
    try {
      const items = await apiGetHistory(token);
      const normalized = items.map(item => ({
        status: item.status,
        title: item.title || item.product_name || '—',
        date: item.created_at,
        ingredients_source: item.source,
        product_name: item.product_name || null,
        explanation: item.explanation || null,
        concerns: Array.isArray(item.concerns) ? item.concerns : [],
        normalized_ingredients: Array.isArray(item.normalized_ingredients) ? item.normalized_ingredients : [],
        identified_allergens: Array.isArray(item.identified_allergens) ? item.identified_allergens : [],
        traces: Array.isArray(item.traces) ? item.traces : [],
        cannot_read: !!item.cannot_read,
        productInfo: item.product_info || null,
      }));
      setScanHistoryState(normalized);
    } catch {
      // silently keep local history if server fails
    }
  }

  async function setLanguage(lang) {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEYS.language, lang);
  }

  async function saveProfile(newProfile) {
    setProfileState(newProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(newProfile));
    if (token) {
      const payload = {
        diet_id: newProfile.dietId,
        allergy_ids: newProfile.allergyIds,
        name: newProfile.name || null,
        bio: newProfile.bio || null,
        // Only store data: URIs in DB (base64 from ImagePicker).
        // file:// paths are native-only and can't be persisted server-side.
        avatar_url: newProfile.photoUri?.startsWith('data:') ? newProfile.photoUri : null,
      };
      if (newProfile.dietId === 'halal' && newProfile.halalStrictness) {
        payload.halal_strictness = newProfile.halalStrictness;
      }
      await apiUpdateProfile(payload, token);
    }
  }

  async function addScanToHistory(scan) {
    // For client-side diet engines (halal, kosher) the server has no rules —
    // it always returns a generic SAFE/CAUTION. Recompute the effective status
    // here so history cards reflect the user's actual dietary profile.
    // If the product carries an OFF certification label for the user's diet,
    // trust that certification and skip the engine.
    let effectiveStatus = scan.status;
    const ings = scan.normalized_ingredients || [];
    const offLabels = (scan.productInfo?.offMeta?.labels || []).map(l => String(l).toLowerCase());
    if (ings.length) {
      if (profile?.dietId === 'halal' && !offLabels.includes('halal')) {
        const { status } = applyHalalRules(ings, profile.halalStrictness || DEFAULT_HALAL_STRICTNESS);
        const map = {
          [HALAL_STATUS.HALAL]: 'SAFE',
          [HALAL_STATUS.MASHBOOH]: 'CAUTION',
          [HALAL_STATUS.NOT_HALAL]: 'NOT_SAFE',
        };
        effectiveStatus = map[status] || scan.status;
      } else if (profile?.dietId === 'kosher' && !offLabels.includes('kosher') && !offLabels.includes('orthodox union kosher')) {
        const { status } = applyKosherRules(ings);
        const map = {
          [KOSHER_STATUS.KOSHER]: 'SAFE',
          [KOSHER_STATUS.SUPERVISION]: 'CAUTION',
          [KOSHER_STATUS.NOT_KOSHER]: 'NOT_SAFE',
        };
        effectiveStatus = map[status] || scan.status;
      }
    }
    const entry = {
      status: effectiveStatus,
      title: scan.title,
      date: scan.date || new Date().toISOString(),
      ingredients_source: scan.ingredients_source,
      explanation: scan.explanation,
      concerns: scan.concerns,
      cannot_read: !!scan.cannot_read,
      product_name: scan.product_name,
      imageUri: scan.imageUri,
      ingredients_text: scan.productInfo?.ingredients_text || null,
      normalized_ingredients: scan.normalized_ingredients || [],
      identified_allergens: scan.identified_allergens || [],
      traces: Array.isArray(scan.traces) ? scan.traces : [],
      productInfo: scan.productInfo || null,
    };
    const updated = [entry, ...scanHistory].slice(0, 50);
    setScanHistoryState(updated);
    setMonthlyScanCount(c => c + 1);
    logScan(scan.status);
    if (!token) {
      await AsyncStorage.setItem(STORAGE_KEYS.scan_history, JSON.stringify(updated));
    }
  }

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        profile,
        saveProfile,
        scanHistory,
        addScanToHistory,
        monthlyScanCount,
        setMonthlyScanCount,
        streak,
        isLoaded,
        isProfileLoaded,
        disclaimerAccepted,
        acceptDisclaimer,
        appSurveyDone,
        markAppSurveyDone,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

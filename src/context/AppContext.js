import React, { createContext, useContext, useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiGetHistory, apiGetMe, apiUpdateProfile } from '../services/apiService';
import { requestTrackingPermission, logScan } from '../services/analyticsService';

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
};

export function AppProvider({ children }) {
  const { token } = useAuth();
  const [language, setLanguageState] = useState(detectDeviceLanguage);
  const [profile, setProfileState] = useState(null);
  const [scanHistory, setScanHistoryState] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [disclaimerAccepted, setDisclaimerAcceptedState] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (token) {
      setIsProfileLoaded(false);
      loadServerHistory();
      loadServerProfile();
    } else {
      setIsProfileLoaded(true);
    }
  }, [token]);

  async function loadServerProfile() {
    try {
      const { user } = await apiGetMe(token);
      if (user?.diet_id) {
        const localRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);
        const local = localRaw ? JSON.parse(localRaw) : {};
        const serverProfile = {
          name: local.name,
          bio: local.bio,
          photoUri: local.photoUri,
          dietId: user.diet_id,
          allergyIds: user.allergy_ids || [],
        };
        setProfileState(serverProfile);
        await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(serverProfile));
      } else {
        setProfileState(null);
        await AsyncStorage.removeItem(STORAGE_KEYS.profile);
      }
    } catch {
      // silently keep local profile if server fails
    } finally {
      setIsProfileLoaded(true);
    }
  }

  async function loadAll() {
    try {
      const [lang, prof, history, disclaimer] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.language),
        AsyncStorage.getItem(STORAGE_KEYS.profile),
        AsyncStorage.getItem(STORAGE_KEYS.scan_history),
        AsyncStorage.getItem(STORAGE_KEYS.disclaimer),
      ]);
      if (lang) setLanguageState(lang);
      if (prof) setProfileState(JSON.parse(prof));
      if (history) setScanHistoryState(JSON.parse(history));
      if (disclaimer === 'true') setDisclaimerAcceptedState(true);
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
      await apiUpdateProfile({ diet_id: newProfile.dietId, allergy_ids: newProfile.allergyIds }, token);
    }
  }

  async function addScanToHistory(scan) {
    const entry = {
      status: scan.status,
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
        isLoaded,
        isProfileLoaded,
        disclaimerAccepted,
        acceptDisclaimer,
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

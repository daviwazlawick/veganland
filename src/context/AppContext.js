import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiGetHistory, apiGetMe, apiUpdateProfile } from '../services/apiService';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  profile: '@veganland_profile',
  language: '@veganland_language',
  scan_history: '@veganland_scan_history',
};

export function AppProvider({ children }) {
  const { token } = useAuth();
  const [language, setLanguageState] = useState('pt');
  const [profile, setProfileState] = useState(null);
  const [scanHistory, setScanHistoryState] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

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
      const [lang, prof, history] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.language),
        AsyncStorage.getItem(STORAGE_KEYS.profile),
        AsyncStorage.getItem(STORAGE_KEYS.scan_history),
      ]);
      if (lang) setLanguageState(lang);
      if (prof) setProfileState(JSON.parse(prof));
      if (history) setScanHistoryState(JSON.parse(history));
    } catch (e) {
      console.error('Failed to load storage', e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function loadServerHistory() {
    try {
      const items = await apiGetHistory(token);
      const normalized = items.map(item => ({
        status: item.status,
        title: item.title || item.product_name || '—',
        date: item.created_at,
        ingredients_source: item.source,
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
      try {
        await apiUpdateProfile({ diet_id: newProfile.dietId, allergy_ids: newProfile.allergyIds }, token);
      } catch {}
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
      product_name: scan.product_name,
      imageUri: scan.imageUri,
      ingredients_text: scan.productInfo?.ingredients_text || null,
    };
    const updated = [entry, ...scanHistory].slice(0, 50);
    setScanHistoryState(updated);
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

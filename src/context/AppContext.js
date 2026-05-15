import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  profile: '@veganland_profile',
  language: '@veganland_language',
  scan_history: '@veganland_scan_history',
};

export function AppProvider({ children }) {
  const [language, setLanguageState] = useState('pt');
  const [profile, setProfileState] = useState(null);
  const [scanHistory, setScanHistoryState] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

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

  async function setLanguage(lang) {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEYS.language, lang);
  }

  async function saveProfile(newProfile) {
    setProfileState(newProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(newProfile));
  }

  async function addScanToHistory(scan) {
    const updated = [scan, ...scanHistory].slice(0, 20);
    setScanHistoryState(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.scan_history, JSON.stringify(updated));
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

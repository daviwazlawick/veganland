import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Clipboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiGetReferral, apiRedeemReferral } from '../services/apiService';

const ReferralContext = createContext(null);

const STORAGE_PENDING = '@novaqi_pending_referral_code';
const STORAGE_DISMISSED = '@novaqi_dismissed_referral_codes';

// Match the server-side alphabet — A-Z minus I/O, 2-9 minus 0/1, length 6.
const CODE_SHAPE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

function isValidShape(s) {
  return typeof s === 'string' && CODE_SHAPE.test(s.trim().toUpperCase());
}

export function ReferralProvider({ children }) {
  const { token, user } = useAuth();
  const [pendingCode, setPendingCode] = useState(null);
  const [stats, setStats] = useState(null);
  const clipboardChecked = useRef(false);

  // One-shot clipboard scan after the user is authenticated and the disclaimer
  // has been accepted (App.js gates the read). Manually retriggerable.
  const scanClipboard = useCallback(async () => {
    if (clipboardChecked.current) return;
    clipboardChecked.current = true;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_PENDING);
      if (stored && isValidShape(stored)) {
        setPendingCode(stored.toUpperCase());
        return;
      }
      const raw = await Clipboard.getString();
      if (!raw) return;
      const trimmed = raw.trim().toUpperCase();
      if (!isValidShape(trimmed)) return;
      const dismissedJson = await AsyncStorage.getItem(STORAGE_DISMISSED);
      const dismissed = dismissedJson ? JSON.parse(dismissedJson) : [];
      if (Array.isArray(dismissed) && dismissed.includes(trimmed)) return;
      await AsyncStorage.setItem(STORAGE_PENDING, trimmed);
      setPendingCode(trimmed);
    } catch {}
  }, []);

  const dismissPendingCode = useCallback(async () => {
    if (!pendingCode) return;
    try {
      const dismissedJson = await AsyncStorage.getItem(STORAGE_DISMISSED);
      const dismissed = dismissedJson ? JSON.parse(dismissedJson) : [];
      if (!dismissed.includes(pendingCode)) dismissed.push(pendingCode);
      await AsyncStorage.setItem(STORAGE_DISMISSED, JSON.stringify(dismissed.slice(-20)));
    } catch {}
    await AsyncStorage.removeItem(STORAGE_PENDING);
    setPendingCode(null);
  }, [pendingCode]);

  const clearPendingCode = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_PENDING);
    setPendingCode(null);
  }, []);

  const refreshStats = useCallback(async () => {
    if (!token) return null;
    try {
      const data = await apiGetReferral(token);
      setStats(data);
      return data;
    } catch {
      return null;
    }
  }, [token]);

  const redeem = useCallback(async (code) => {
    if (!token) return { ok: false, error: 'not_authenticated' };
    const trimmed = String(code || '').trim().toUpperCase();
    if (!isValidShape(trimmed)) return { ok: false, error: 'invalid_code' };
    const result = await apiRedeemReferral(token, trimmed);
    if (result.ok) {
      await clearPendingCode();
      await refreshStats();
    }
    return result;
  }, [token, clearPendingCode, refreshStats]);

  useEffect(() => {
    if (token) refreshStats();
  }, [token, refreshStats]);

  return (
    <ReferralContext.Provider value={{
      pendingCode,
      stats,
      scanClipboard,
      dismissPendingCode,
      clearPendingCode,
      refreshStats,
      redeem,
      isValidShape,
    }}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const ctx = useContext(ReferralContext);
  if (!ctx) throw new Error('useReferral must be used within ReferralProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiRegister, apiGetMe, apiOAuthSignIn, setUnauthorizedHandler } from '../services/apiService';
import { signInWithApple, signInWithGoogle } from '../services/socialAuthService';
import { loginPurchasesUser, logoutPurchasesUser } from '../services/purchasesService';
import { logRegistration } from '../services/analyticsService';

const AuthContext = createContext(null);

const TOKEN_KEY = '@veganland_auth_token';
const USER_KEY = '@veganland_auth_user';
const LAUNCHED_KEY = '@veganland_launched';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [hasLaunchedBefore, setHasLaunchedBefore] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionExpiredAt, setSessionExpiredAt] = useState(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // A stale JWT (90-day expiry) makes every authenticated call fail with a
  // clean 401. Without this, each screen just showed its own generic
  // "check your connection" error — actively misleading for what's really
  // an expired session (reported by a user who hadn't opened the app in
  // months). One handler, registered once, covers every apiService call.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (loggingOutRef.current || !token) return;
      loggingOutRef.current = true;
      logout().finally(() => {
        setSessionExpiredAt(Date.now());
        loggingOutRef.current = false;
      });
    });
  }, [token]);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser, launched] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(LAUNCHED_KEY),
      ]);
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        // Background self-heal: pull the latest user from server so cached
        // fields like onboarding_scan_used stay in sync even if the local
        // update failed (app killed mid-flight, storage error, etc.).
        apiGetMe(storedToken).then(data => {
          if (data?.user) {
            const merged = { ...(storedUser ? JSON.parse(storedUser) : {}), ...data.user };
            setUser(merged);
            AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
          }
          // Sliding session: the server reissues a fresh 90-day token on
          // every /auth/me call. Persisting it here means an actively-used
          // app never actually reaches the old token's expiry.
          if (data?.token) {
            setToken(data.token);
            AsyncStorage.setItem(TOKEN_KEY, data.token).catch(() => {});
          }
        }).catch(() => {});
      }
      // A stored token also implies the app has been launched before
      // (legacy users upgrading from a build without LAUNCHED_KEY).
      setHasLaunchedBefore(launched === '1' || !!storedToken);
    } catch (e) {
      console.error('Failed to load auth', e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function persistAuth(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    setHasLaunchedBefore(true);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
      AsyncStorage.setItem(LAUNCHED_KEY, '1'),
    ]);
  }

  async function login(email, password) {
    const { token: t, user: u } = await apiLogin(email, password);
    await persistAuth(t, u);
    loginPurchasesUser(u.id).catch(() => {});
    return u;
  }

  async function register(email, password, disclaimerVersion, referralCode = null) {
    const data = await apiRegister(email, password, disclaimerVersion, referralCode);
    logRegistration('email');
    if (data.emailConfirmationSent) {
      const err = new Error('email_confirmation_required');
      err.code = 'EMAIL_CONFIRMATION_REQUIRED';
      err.email = data.email;
      throw err;
    }
    await persistAuth(data.token, data.user);
    return data.user;
  }

  // Social sign-in — the backend does account linking automatically when the
  // returned email matches an existing user, so this is the same call for
  // signup + login. disclaimerVersion is only used when creating a new user;
  // the backend ignores it on linking / returning users.
  async function signInWithProvider(provider, { disclaimerVersion, referralCode } = {}) {
    const native = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    const payload = provider === 'apple'
      ? { identity_token: native.identityToken, email: native.email }
      : { id_token: native.idToken, email: native.email };
    if (disclaimerVersion) payload.disclaimer_version = disclaimerVersion;
    if (referralCode) payload.referral_code = referralCode;
    const data = await apiOAuthSignIn(provider, payload);
    if (data.isNewUser) logRegistration(provider);
    await persistAuth(data.token, data.user);
    loginPurchasesUser(data.user.id).catch(() => {});
    return data.user;
  }

  async function logout() {
    setToken(null);
    setUser(null);
    logoutPurchasesUser().catch(() => {});
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      // Logging out only ever happens from a logged-in state, so the app
      // has definitely launched before. Without this, a legacy account
      // whose LAUNCHED_KEY was never written (created before that tracking
      // existed) would fall back to `!!storedToken` on the next cold start
      // — which is now false — and land on the Welcome/Register screen
      // instead of Login. That's what happened to a user auto-logged-out
      // by the 401 handler: she saw an unresponsive-looking Welcome screen
      // instead of a normal "please log in again".
      AsyncStorage.setItem(LAUNCHED_KEY, '1'),
    ]);
  }

  function updateUserType(newUserType) {
    const updated = { ...user, user_type: newUserType };
    setUser(updated);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(updated)).catch(() => {});
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const data = await apiGetMe(token);
      if (data.user) {
        const updated = { ...user, ...data.user };
        setUser(updated);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
      }
      if (data.token) {
        setToken(data.token);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
      }
    } catch {}
  }

  // Flip the local onboarding_scan_used flag + persist synchronously.
  // The server flips its own copy inside checkAndIncrementScanCounter, so
  // once a scan succeeds we can assume it's true and don't need to wait
  // for /auth/me to round-trip — protecting against the user killing the
  // app before the async refresh completes.
  async function markOnboardingScanUsed() {
    if (!user) return;
    if (user.onboarding_scan_used === true) return;
    const updated = { ...user, onboarding_scan_used: true };
    setUser(updated);
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoaded, hasLaunchedBefore, login, register, signInWithProvider, logout, updateUserType, refreshUser, markOnboardingScanUsed, sessionExpiredAt }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

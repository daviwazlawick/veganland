import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiRegister, apiGetMe, apiOAuthSignIn } from '../services/apiService';
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

  useEffect(() => {
    loadStoredAuth();
  }, []);

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
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoaded, hasLaunchedBefore, login, register, signInWithProvider, logout, updateUserType, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

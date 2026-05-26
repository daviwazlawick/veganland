import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin, apiRegister } from '../services/apiService';
import { loginPurchasesUser, logoutPurchasesUser } from '../services/purchasesService';

const AuthContext = createContext(null);

const TOKEN_KEY = '@veganland_auth_token';
const USER_KEY = '@veganland_auth_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load auth', e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function persistAuth(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
  }

  async function login(email, password) {
    const { token: t, user: u } = await apiLogin(email, password);
    await persistAuth(t, u);
    loginPurchasesUser(u.id).catch(() => {});
    return u;
  }

  async function register(email, password) {
    const data = await apiRegister(email, password);
    if (data.emailConfirmationSent) {
      const err = new Error('email_confirmation_required');
      err.code = 'EMAIL_CONFIRMATION_REQUIRED';
      err.email = data.email;
      throw err;
    }
    await persistAuth(data.token, data.user);
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

  return (
    <AuthContext.Provider value={{ token, user, isLoaded, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

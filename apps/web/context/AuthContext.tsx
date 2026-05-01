'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/services/api';

type User = { id: string; name: string; email: string; role: string; isVerified?: boolean; twoFactorEmailEnabled?: boolean; permissions?: string[] } | null;
type LoginResult = { requiresCode?: boolean; challengeId?: string; requiresEmailVerification?: boolean; email?: string; user?: NonNullable<User> } | void;

type AuthContextValue = {
  user: User;
  token: string | null;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyLoginCode: (challengeId: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string, enableEmailCodeLogin?: boolean) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  resendVerification: (email: string) => Promise<any>;
  updatePreferences: (payload: { twoFactorEmailEnabled: boolean }) => Promise<any>;
  unlockAccount: (email: string, code: string, password: string, confirmPassword: string) => Promise<any>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem('mb_token');
    localStorage.removeItem('mb_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('mb_token');
    const savedUser = localStorage.getItem('mb_user');
    if (savedToken) setToken(savedToken);
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { localStorage.removeItem('mb_user'); }
    }
    if (savedToken) {
      authApi.me()
        .then(({ data }) => {
          localStorage.setItem('mb_user', JSON.stringify(data));
          setUser(data);
        })
        .catch((error: any) => {
          if ([401, 403].includes(Number(error?.status))) clearSession();
        });
    }
  }, [clearSession]);

  const persistSession = (token: string, user: NonNullable<User>) => {
    localStorage.setItem('mb_token', token);
    localStorage.setItem('mb_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const refreshMe = async () => {
    if (!localStorage.getItem('mb_token')) return;
    const { data } = await authApi.me();
    localStorage.setItem('mb_user', JSON.stringify(data));
    setUser(data);
  };

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    if (data?.requiresCode || data?.requiresEmailVerification) return data;
    persistSession(data.token, data.user);
    return { user: data.user };
  };

  const verifyLoginCode = async (challengeId: string, code: string) => {
    const { data } = await authApi.verifyLoginCode(challengeId, code);
    persistSession(data.token, data.user);
  };

  const register = async (name: string, email: string, password: string, enableEmailCodeLogin = false) => {
    const { data } = await authApi.register(name, email, password, enableEmailCodeLogin);
    return data;
  };

  const verifyEmail = async (email: string, code: string) => {
    const { data } = await authApi.verifyEmail(email, code);
    return data;
  };

  const resendVerification = async (email: string) => {
    const { data } = await authApi.resendVerification(email);
    return data;
  };

  const unlockAccount = async (email: string, code: string, password: string, confirmPassword: string) => {
    const { data } = await authApi.unlockAccount(email, code, password, confirmPassword);
    return data;
  };

  const updatePreferences = async (payload: { twoFactorEmailEnabled: boolean }) => {
    const { data } = await authApi.updatePreferences(payload);
    localStorage.setItem('mb_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ user, token, refreshMe, login, verifyLoginCode, register, verifyEmail, resendVerification, updatePreferences, unlockAccount, logout }), [user, token, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

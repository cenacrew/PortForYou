'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { API_URL, setAccessToken } from './api';

/**
 * Auth maison : access token JWT gardé en mémoire (jamais dans le
 * localStorage), session restaurée au chargement via le refresh token
 * (cookie httpOnly rotatif géré par l'API).
 */

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  setSession: (accessToken: string, user: User) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  setSession: () => {},
  clearSession: () => {},
});

async function callAuth(path: string, body?: unknown) {
  const res = await fetch(`${API_URL}/api/v1/auth/${path}`, {
    method: 'POST',
    credentials: 'include', // cookie du refresh token
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
  return data as { accessToken: string; user: User };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, isAdmin: false });

  const setSession = useCallback((accessToken: string, user: User) => {
    setAccessToken(accessToken);
    setState({ user, loading: false, isAdmin: user.role === 'admin' });
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setState({ user: null, loading: false, isAdmin: false });
  }, []);

  // Restauration de session au chargement + rafraîchissement périodique
  // (l'access token vit 15 min ; on le renouvelle toutes les 10).
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const refresh = () =>
      callAuth('refresh')
        .then(({ accessToken, user }) => setSession(accessToken, user))
        .catch(() => clearSession());
    refresh().finally(() => {
      timer = setInterval(refresh, 10 * 60 * 1000);
    });
    return () => clearInterval(timer);
  }, [setSession, clearSession]);

  return (
    <AuthContext.Provider value={{ ...state, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Hooks d'action : à utiliser dans les composants (accèdent au contexte). */
export function useAuthActions() {
  const { setSession, clearSession } = useAuth();

  return {
    login: async (email: string, password: string) => {
      const { accessToken, user } = await callAuth('login', { email, password });
      setSession(accessToken, user);
    },
    signup: async (name: string, email: string, password: string) => {
      const { accessToken, user } = await callAuth('register', { name, email, password });
      setSession(accessToken, user);
    },
    logout: async () => {
      await callAuth('logout').catch(() => {});
      clearSession();
    },
    loginWithGoogle: () => {
      window.location.assign(`${API_URL}/api/v1/auth/google`);
    },
    forgotPassword: (email: string) => callAuth('forgot-password', { email }),
    resetPassword: (token: string, password: string) =>
      callAuth('reset-password', { token, password }),
  };
}

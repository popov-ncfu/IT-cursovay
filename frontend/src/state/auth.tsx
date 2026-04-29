import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { api, setAccessToken } from '../api/http';

const REFRESH_TOKEN_KEY = 'inventoryflow_refresh_token';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthUser = {
  userId: string;
  email: string;
  role: string;
};

type AuthContextValue = {
  accessToken: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refreshIfNeeded: () => Promise<void>;
  me: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredRefreshToken(): string | null {
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  return token ? token : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  const value = useMemo<AuthContextValue>(() => {
    const me = async () => {
      setLoading(true);
      try {
        const res = await api.get<AuthUser>('/auth/me');
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    return {
      accessToken: accessTokenState,
      user,
      loading,

      login: async (email, password) => {
        setLoading(true);
        try {
          const res = await api.post<AuthTokens>('/auth/login', { email, password });
          const { accessToken, refreshToken } = res.data;
          setAccessTokenState(accessToken);
          setAccessToken(accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          setUser(null);
          await me();
        } finally {
          setLoading(false);
        }
      },

      register: async (email, password) => {
        setLoading(true);
        try {
          await api.post('/auth/register', { email, password });
          // After register, go through login to get tokens.
          await (async () => {
            const res = await api.post<AuthTokens>('/auth/login', { email, password });
            const { accessToken, refreshToken } = res.data;
            setAccessTokenState(accessToken);
            setAccessToken(accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            setUser(null);
            await me();
          })();
        } finally {
          setLoading(false);
        }
      },

      refreshIfNeeded: async () => {
        const refreshToken = getStoredRefreshToken();
        if (!refreshToken) return;

        setLoading(true);
        try {
          const res = await api.post<Partial<AuthTokens>>('/auth/refresh', {
            refreshToken,
          });
          const { accessToken, refreshToken: rotated } = res.data;
          if (!accessToken || !rotated) return;

          setAccessTokenState(accessToken);
          setAccessToken(accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, rotated);
          await me();
        } finally {
          setLoading(false);
        }
      },

      me,

      logout: async () => {
        setLoading(true);
        try {
          const refreshToken = getStoredRefreshToken();
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } finally {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          setAccessTokenState(null);
          setAccessToken(null);
          setUser(null);
          setLoading(false);
        }
      },
    };
  }, [accessTokenState, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}


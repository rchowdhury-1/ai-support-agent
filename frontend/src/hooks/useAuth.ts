import { useState, useEffect, createContext, useContext } from 'react';
import { api, setAccessToken, setRefreshToken, getRefreshToken } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthState(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      setLoading(false);
      return;
    }
    api.post('/auth/refresh', { refreshToken })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      })
      .catch(() => {
        setRefreshToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    setRefreshToken(res.data.refreshToken);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    setAccessToken(res.data.accessToken);
    setRefreshToken(res.data.refreshToken);
    setUser(res.data.user);
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    await api.post('/auth/logout', { refreshToken });
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return { user, loading, login, register, logout };
}

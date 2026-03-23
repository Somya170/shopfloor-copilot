'use client';
// lib/auth-context.tsx

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { User } from '@/types';

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) {
      setToken(stored);
      api.auth.me()
        .then(u => setUser(u))
        .catch(() => { localStorage.clear(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('access_token',  res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    setToken(res.access_token);
    setUser(res.user);
    router.push('/dashboard');
  };

  const signup = async (name: string, email: string, password: string, role: string) => {
    const res = await api.auth.signup({ name, email, password, role });
    localStorage.setItem('access_token',  res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    setToken(res.access_token);
    setUser(res.user);
    router.push('/dashboard');
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    localStorage.clear();
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
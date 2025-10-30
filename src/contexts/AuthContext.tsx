// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSupabase } from '../utils/supabase/client';
import { getCurrentUser, exchangeSupabaseToken, getBackendSession, refreshAccessToken } from '../utils/api';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  user_id: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// No longer syncing user via /users/sync after OAuth exchange

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCheckedSession = useRef(false);

  /* --------------------------------------------------------------
     SESSION CHECK (page load / refresh)
     -------------------------------------------------------------- */
  const checkSession = async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        const ex = await exchangeSupabaseToken(session.access_token);
        if (ex.success && ex.data) {
          const { access_token, refresh_token, user: backendUser } = ex.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          const sess = await getBackendSession(access_token);
          const u = (sess.success && sess.data?.user) ? (sess.data.user as any) : (backendUser as any);
          const normalized: User = {
            id: String(u.id ?? u.user_id ?? u.uuid ?? ''),
            email: u.email ?? '',
            firstName: u.first_name ?? u.firstName ?? 'User',
            lastName: u.last_name ?? u.lastName ?? '',
            organization: u.organization ?? undefined,
            role: (u.role as 'user' | 'admin') ?? 'user',
            createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
            lastLogin: u.last_login ?? u.lastLogin ?? new Date().toISOString(),
          };
          setUser(normalized);
          setAccessToken(access_token);
        }
      }
    } catch (e) {
      console.error('checkSession error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    checkSession();

    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const ex = await exchangeSupabaseToken(session.access_token);
        if (ex.success && ex.data) {
          const { access_token, refresh_token, user: backendUser } = ex.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          const sess = await getBackendSession(access_token);
          const u = (sess.success && sess.data?.user) ? (sess.data.user as any) : (backendUser as any);
          const normalized: User = {
            id: String(u.id ?? u.user_id ?? u.uuid ?? ''),
            email: u.email ?? '',
            firstName: u.first_name ?? u.firstName ?? 'User',
            lastName: u.last_name ?? u.lastName ?? '',
            organization: u.organization ?? undefined,
            role: (u.role as 'user' | 'admin') ?? 'user',
            createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
            lastLogin: u.last_login ?? u.lastLogin ?? new Date().toISOString(),
          };
          setUser(normalized);
          setAccessToken(access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('user_id');
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAuth = (newUser: User, newToken: string) => {
    setUser(newUser);
    setAccessToken(newToken);
  };

  const clearAuth = async () => {
    setUser(null);
    setAccessToken(null);
    setUserId(null);
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  const refreshUser = async () => {
    if (!accessToken) return;
    const resp = await getCurrentUser(accessToken);
    if (resp.success && resp.user) {
      const u = resp.user as any;
      const normalized: User = {
        id: String(u.id ?? u.user_id ?? u.uuid ?? ''),
        email: u.email ?? '',
        firstName: u.first_name ?? u.firstName ?? 'User',
        lastName: u.last_name ?? u.lastName ?? '',
        organization: u.organization ?? undefined,
        role: (u.role as 'user' | 'admin') ?? 'user',
        createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
        lastLogin: u.last_login ?? u.lastLogin ?? new Date().toISOString(),
      };
      setUser(normalized);
    } else {
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        user_id: userId,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        setAuth,
        clearAuth,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
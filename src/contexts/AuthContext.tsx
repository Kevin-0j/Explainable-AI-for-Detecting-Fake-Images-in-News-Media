import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSupabase } from '../utils/supabase/client';
import { getCurrentUser } from '../utils/api';

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
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedSession = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    // Only check session once
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 5000);
      });

      const checkPromise = (async () => {
        const supabase = getSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error checking session:', error);
          return;
        }

        if (session?.access_token) {
          // Fetch user profile from backend
          try {
            const response = await getCurrentUser(session.access_token);
            if (response.success && response.user) {
              setUser(response.user);
              setAccessToken(session.access_token);
            }
          } catch (err) {
            console.error('Error fetching user profile:', err);
            // Don't await signOut to avoid hanging
            supabase.auth.signOut().catch(console.error);
          }
        }
      })();

      await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      console.error('Session check error:', error);
      // Continue anyway - user can log in manually
    } finally {
      setIsLoading(false);
    }
  };

  const setAuth = (newUser: User, newAccessToken: string) => {
    setUser(newUser);
    setAccessToken(newAccessToken);
  };

  const clearAuth = async () => {
    // Clear state immediately
    setUser(null);
    setAccessToken(null);

    // Try to sign out from Supabase, but don't wait if it fails
    try {
      const supabase = getSupabase();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SignOut timeout')), 3000);
      });
      
      await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ]);
    } catch (error) {
      console.error('Error during sign out:', error);
      // Continue anyway - local state is already cleared
    }
  };

  const refreshUser = async () => {
    if (!accessToken) return;

    try {
      const response = await getCurrentUser(accessToken);
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If token is invalid, clear auth
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

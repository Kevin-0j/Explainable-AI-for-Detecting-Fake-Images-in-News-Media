import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  is_verified: boolean;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  organization?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'newssight-auth';

interface SessionData {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  rememberMe: boolean;
}

const defaultSession: SessionData = {
  user: null,
  accessToken: null,
  refreshToken: null,
  rememberMe: false,
};

const readPersistedSession = (): SessionData => {
  if (typeof window === 'undefined') {
    return defaultSession;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSession;
    const parsed = JSON.parse(stored);
    return {
      ...defaultSession,
      ...parsed,
    };
  } catch (error) {
    console.error('Failed to parse auth session from storage', error);
    return defaultSession;
  }
};

const persistSession = (session: SessionData) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (session.rememberMe) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

interface AuthState extends SessionData {
  setSession: (session: SessionData) => void;
  updateTokens: (tokens: { accessToken: string; refreshToken?: string | null }) => void;
  updateUser: (user: User | Partial<User>) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

const initialSession =
  typeof window === 'undefined'
    ? defaultSession
    : readPersistedSession();

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...initialSession,
  setSession: (session) => {
    persistSession(session);
    set(session);
  },
  updateTokens: ({ accessToken, refreshToken }) =>
    set((state) => {
      const nextSession: SessionData = {
        user: state.user,
        accessToken,
        refreshToken:
          typeof refreshToken === 'undefined' ? state.refreshToken : refreshToken,
        rememberMe: state.rememberMe,
      };
      persistSession(nextSession);
      return nextSession;
    }),
  updateUser: (userData) =>
    set((state) => {
      const updatedUser = state.user ? { ...state.user, ...userData } : (userData as User);
      const nextSession: SessionData = {
        user: updatedUser,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        rememberMe: state.rememberMe,
      };
      persistSession(nextSession);
      return {
        ...state,
        user: updatedUser,
      };
    }),
  clearSession: () => {
    persistSession(defaultSession);
    set(defaultSession);
  },
  isAuthenticated: () => Boolean(get().accessToken),
}));

import { apiClient } from './axiosClient';
import type { User } from '@/store/auth';

export interface LoginRequest {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface GoogleCallbackPayload {
  code: string;
  state?: string | null;
  rememberMe?: boolean;
}

type GoogleAuthUrlResponse = {
  auth_url?: string;
  url?: string;
};

export const authApi = {
  login: async (payload: LoginRequest) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  register: async (payload: RegisterRequest) => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', payload);
    return response.data;
  },

  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post('/auth/request-password-reset', { email });
    return response.data;
  },

  resetPassword: async (payload: ResetPasswordRequest) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/auth/user');
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await apiClient.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  updateProfile: async (data: { first_name?: string; last_name?: string; organization?: string }) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete('/auth/account');
    return response.data;
  },

  getGoogleAuthUrl: async (redirectTo?: string) => {
    const response = await apiClient.get<GoogleAuthUrlResponse>('/auth/google/url', {
      params: redirectTo ? { redirect_to: redirectTo } : undefined,
    });
    return response.data;
  },

  completeGoogleOAuth: async (payload: GoogleCallbackPayload) => {
    const response = await apiClient.post<AuthResponse>('/auth/google/callback', {
      code: payload.code,
      state: payload.state,
    });
    return response.data;
  },

  exchangeAuthToken: async (accessToken: string) => {
    const response = await apiClient.post<AuthResponse>('/auth/exchange', {
      access_token: accessToken,
    });
    return response.data;
  },
};

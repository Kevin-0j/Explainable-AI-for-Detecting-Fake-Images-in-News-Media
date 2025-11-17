import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth';

const normalizeBaseUrl = (url?: string) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
};

const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return config;
});

const shouldIgnore401 = (url?: string) => {
  if (!url) return false;
  return ['/auth/login', '/auth/register', '/auth/request-password-reset', '/auth/reset-password'].some(
    (path) => url.includes(path)
  );
};

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !shouldIgnore401(error.config?.url)) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token');
      }
      const { clearSession } = useAuthStore.getState();
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }

    const friendlyMessage =
      (error.response?.data as { detail?: string; message?: string })?.detail ||
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'Unable to communicate with the server. Please try again.';

    error.message = friendlyMessage;
    return Promise.reject(error);
  }
);

export default apiClient;

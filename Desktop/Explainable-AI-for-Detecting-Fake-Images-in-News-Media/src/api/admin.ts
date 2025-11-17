import { apiClient } from './axiosClient';
import type { User } from '@/store/auth';

export interface AdminStats {
  total_users?: number;
  active_users?: number;
  total_predictions?: number;
  failed_predictions?: number;
  [key: string]: number | undefined;
}

export interface AdminLog {
  id: string;
  event?: string;
  level?: string;
  message?: string;
  created_at: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export const adminApi = {
  createAdmin: async (payload: { email: string; password: string }) => {
    const { data } = await apiClient.post('/api/admin/create-admin', payload);
    return data;
  },

  getUsers: async () => {
    const { data } = await apiClient.get<User[]>('/api/admin/users');
    return data;
  },

  deleteUser: async (userId: string) => {
    const { data } = await apiClient.delete(`/api/admin/users/${userId}`);
    return data;
  },

  toggleUserStatus: async (userId: string) => {
    const { data } = await apiClient.post(`/api/admin/users/${userId}/toggle-status`);
    return data;
  },

  getStats: async () => {
    const { data } = await apiClient.get<AdminStats>('/api/admin/stats');
    return data;
  },

  getLogs: async () => {
    const { data } = await apiClient.get<AdminLog[]>('/api/admin/logs');
    return data;
  },
};

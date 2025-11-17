import { apiClient } from './axiosClient';

export type VerificationStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface Verification {
  id: string;
  user_id: string;
  image_url: string;
  prediction: 'real' | 'fake' | 'unknown';
  confidence: number;
  status: VerificationStatusType;
  model_version: string;
  metadata?: Record<string, unknown>;
  gradcam_image_url?: string | null;
  lime_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVerificationResponse {
  job_id: string;
  verification_id?: string | null;
  status?: VerificationStatusType;
  prediction?: 'real' | 'fake' | 'unknown';
  confidence?: number | null;
  created_at?: string;
  detail?: string;
}

export interface VerificationStatus {
  job_id: string;
  status: VerificationStatusType;
  verification_id?: string | null;
  prediction?: 'real' | 'fake' | 'unknown';
  confidence?: number | null;
  detail?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export const verificationsApi = {
  createVerification: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<CreateVerificationResponse>(
      '/verifications/upload',
      formData
    );
    return response.data;
  },

  getVerification: async (id: string) => {
    const response = await apiClient.get<Verification>(`/verifications/${id}`);
    return response.data;
  },

  getStatus: async (jobId: string) => {
    const response = await apiClient.get<VerificationStatus>(`/verifications/${jobId}/status`);
    return response.data;
  },

  listVerifications: async (params?: {
    skip?: number;
    limit?: number;
    prediction?: 'real' | 'fake' | 'unknown';
  }) => {
    const response = await apiClient.get<Verification[]>('/verifications', { params });
    return response.data;
  },
};

import { apiClient } from './axiosClient';

export interface GradCamResponse {
  heatmap_url: string;
  overlay_url: string;
  metadata?: Record<string, unknown>;
}

export interface LimeResponse {
  segmentation_url: string;
  explanation_data: Record<string, unknown>;
}

export const explainabilityApi = {
  getGradCam: async (verificationId: string) => {
    const response = await apiClient.get<GradCamResponse>(
      `/verifications/${verificationId}/gradcam`
    );
    return response.data;
  },

  getLime: async (verificationId: string) => {
    const response = await apiClient.get<LimeResponse>(`/verifications/${verificationId}/lime`);
    return response.data;
  },
};

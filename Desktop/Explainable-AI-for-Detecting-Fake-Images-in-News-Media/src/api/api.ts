import { apiClient } from './axiosClient';

export type PredictionLabel = 'real' | 'fake' | 'unknown';

export interface MediaFileRecord {
  id: string;
  user_id?: string;
  original_filename?: string;
  stored_filename?: string;
  storage_path?: string;
  file_type?: string;
  file_size?: number;
  checksum?: string;
  url?: string;
  public_url?: string;
  cdn_url?: string;
}

export interface AnalysisRecord {
  id: string;
  analysis_id?: string;
  user_id?: string;
  media_file_id?: string;
  prediction_label: PredictionLabel;
  confidence_score: number;
  model_version?: string;
  analysis_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface PredictionHistoryItem {
  analysis?: AnalysisRecord | null;
  media_file?: MediaFileRecord | null;
  gradcam_heatmap?: string | null;
  heatmap_overlay?: string | null;
  [key: string]: unknown;
}

export type PredictionResponse = PredictionHistoryItem;

type PredictionHistoryResponse =
  | PredictionHistoryItem[]
  | {
      items?: PredictionHistoryItem[];
      results?: PredictionHistoryItem[];
      data?: PredictionHistoryItem[];
    };

const unwrapHistory = (payload?: PredictionHistoryResponse | null) => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.items ?? payload.results ?? payload.data ?? [];
};

export const predictionApi = {
  predict: async (file: File) => {
    const form = new FormData();
    form.append('file', file);

    const { data } = await apiClient.post<PredictionResponse>('/api/predict', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  },

  getHistory: async () => {
    const { data } = await apiClient.get<PredictionHistoryResponse>('/api/history');
    return unwrapHistory(data);
  },

  getReportBlob: async (analysisId: string) => {
    const response = await apiClient.get(`/api/report/${analysisId}`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

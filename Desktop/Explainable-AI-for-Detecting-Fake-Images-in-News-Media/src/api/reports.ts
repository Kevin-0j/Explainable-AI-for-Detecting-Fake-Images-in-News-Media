import { apiClient } from './axiosClient';

export const reportsApi = {
  getReportBlob: async (analysisId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/report/${analysisId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadReport: async (analysisId: string, filename?: string) => {
    const blob = await reportsApi.getReportBlob(analysisId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `analysis-report-${analysisId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

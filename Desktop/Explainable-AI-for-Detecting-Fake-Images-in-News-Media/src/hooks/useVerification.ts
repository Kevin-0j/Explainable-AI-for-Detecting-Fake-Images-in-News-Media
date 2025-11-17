import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { verificationsApi, type Verification, type VerificationStatusType } from '@/api/verifications';
import { predictionApi, type PredictionHistoryItem } from '@/api/api';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth';
import { buildMediaUrl } from '@/lib/media';

const POLL_INTERVAL = 1500;
const POLL_TIMEOUT = 60_000;

type VerificationHookArgs = {
  jobId?: string | null;
  verificationId?: string | null;
};

export const useVerification = (args?: VerificationHookArgs) => {
  const queryClient = useQueryClient();
  const jobId = args?.jobId?.trim() || undefined;
  const providedVerificationId = args?.verificationId?.trim() || undefined;
  const pollStartRef = useRef<number | null>(null);

  useEffect(() => {
    pollStartRef.current = jobId ? Date.now() : null;
  }, [jobId]);

  const createMutation = useMutation({
    mutationKey: ['predict'],
    mutationFn: async (file: File) => {
      try {
        return await predictionApi.predict(file);
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status && status !== 404) {
          throw error;
        }
        return verificationsApi.createVerification(file);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: () => {
      toast.error('Failed to upload image. Please try again.');
    },
  });

  const statusQuery = useQuery({
    queryKey: ['verification-status', jobId],
    queryFn: () => verificationsApi.getStatus(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      if (!jobId) {
        return false;
      }

      const currentStatus = query.state.data?.status;
      if (currentStatus === 'completed' || currentStatus === 'failed') {
        return false;
      }

      if (pollStartRef.current && Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        return false;
      }

      return POLL_INTERVAL;
    },
  });

  const resolvedVerificationId =
    providedVerificationId || statusQuery.data?.verification_id || undefined;

  const verificationQuery = useQuery({
    queryKey: ['verification', resolvedVerificationId],
    queryFn: () => verificationsApi.getVerification(resolvedVerificationId!),
    enabled: Boolean(resolvedVerificationId) && (providedVerificationId ? true : statusQuery.data?.status === 'completed'),
  });

  return {
    createVerification: createMutation.mutate,
    isCreating: createMutation.isPending,
    verification: verificationQuery.data,
    status: statusQuery.data,
    refetchVerification: verificationQuery.refetch,
    refetchStatus: statusQuery.refetch,
  };
};

export const useVerifications = (filter?: 'real' | 'fake' | 'unknown') => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: () => predictionApi.getHistory(),
    enabled: Boolean(accessToken),
  });

  const verifications = useMemo(() => {
    if (!historyQuery.data) return undefined;
    const normalized = historyQuery.data
      .map(normalizePredictionToVerification)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    return filter ? normalized.filter((item) => item.prediction === filter) : normalized;
  }, [historyQuery.data, filter]);

  return {
    verifications,
    isLoading: historyQuery.isLoading && Boolean(accessToken),
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    history: historyQuery.data,
  };
};

const normalizePredictionToVerification = (item: PredictionHistoryItem): Verification => {
  const fallbackTimestamp = item.analysis?.created_at ?? new Date().toISOString();
  const metadata = (item.analysis?.analysis_metadata as Record<string, unknown>) || {};
  const mediaUrl = buildMediaUrl(
    item.media_file?.cdn_url ||
      item.media_file?.public_url ||
      item.media_file?.url ||
      (metadata.input_image_url as string | undefined) ||
      (metadata.image_url as string | undefined) ||
      item.media_file?.storage_path ||
      ''
  );

  return {
    id: item.analysis?.id || item.analysis?.analysis_id || Math.random().toString(36).slice(2),
    user_id: item.analysis?.user_id || '',
    image_url: mediaUrl,
    prediction: item.analysis?.prediction_label ?? 'unknown',
    confidence:
      typeof item.analysis?.confidence_score === 'number' ? item.analysis.confidence_score : 0,
    status: 'completed',
    model_version: item.analysis?.model_version || 'N/A',
    metadata,
    created_at: fallbackTimestamp,
    updated_at: item.analysis?.updated_at || fallbackTimestamp,
    gradcam_image_url: item.analysis?.gradcam_image_url ?? null,
    lime_image_url: item.analysis?.lime_image_url ?? null,
  };
};

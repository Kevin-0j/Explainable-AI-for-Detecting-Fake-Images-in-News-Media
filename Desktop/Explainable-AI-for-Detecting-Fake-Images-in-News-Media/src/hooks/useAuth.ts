import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type AuthResponse, type GoogleCallbackPayload } from '@/api/auth';
import apiClient from '@/api/axiosClient';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { consumeOAuthPreference, storeOAuthPreference } from '@/lib/oauth';

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
};

const setAccessTokenHeader = (token?: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem('token', token);
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    window.localStorage.removeItem('token');
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export const useAuth = () => {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessTokenHeader(accessToken);
    }
  }, [accessToken]);

  const handleAuthSuccess = (data: AuthResponse, rememberMe = false) => {
    setAccessTokenHeader(data.access_token);
    setSession({
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      rememberMe,
    });
    toast.success('Welcome back!');
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.fetchQuery({
      queryKey: ['user'],
      queryFn: authApi.getCurrentUser,
    }).catch(() => {
      // swallow errors; they'll be surfaced by the existing query
    });
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data, variables) => {
      handleAuthSuccess(data, variables.remember_me);
    },
    onError: (error: unknown) => {
      toast.error(resolveErrorMessage(error, 'Invalid credentials. Please try again.'));
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      toast.success(
        data?.message || 'Account created! Please check your email to verify your account.'
      );
    },
    onError: (error: unknown) => {
      toast.error(resolveErrorMessage(error, 'Registration failed. Please try again.'));
    },
  });

  const startGoogleOAuth = async (options?: { rememberMe?: boolean }) => {
    const rememberMe = options?.rememberMe ?? true;
    if (typeof window === 'undefined') return;
    storeOAuthPreference(rememberMe);
    setIsGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { auth_url, url } = await authApi.getGoogleAuthUrl(redirectTo);
      const authorizationUrl = auth_url ?? url;
      if (!authorizationUrl) {
        throw new Error('Authorization URL was not provided by the server.');
      }
      window.location.href = authorizationUrl;
      return;
    } catch (error: unknown) {
      toast.error(
        resolveErrorMessage(error, 'Failed to start Google sign-in. Please try again.')
      );
      setIsGoogleLoading(false);
    }
  };

  const googleCallbackMutation = useMutation({
    mutationFn: authApi.completeGoogleOAuth,
    onSuccess: (data, variables) => {
      handleAuthSuccess(data, variables?.rememberMe ?? consumeOAuthPreference());
    },
    onError: (error: unknown) => {
      toast.error(resolveErrorMessage(error, 'Google sign-in failed. Please try again.'));
    },
  });

  const exchangeAuthTokenMutation = useMutation({
    mutationFn: ({ accessToken }: { accessToken: string; rememberMe?: boolean }) =>
      authApi.exchangeAuthToken(accessToken),
    onSuccess: (data, variables) => {
      handleAuthSuccess(data, variables?.rememberMe ?? consumeOAuthPreference());
    },
    onError: (error: unknown) => {
      toast.error(resolveErrorMessage(error, 'Unable to complete Google sign-in. Please try again.'));
    },
  });

  const logout = () => {
    setAccessTokenHeader(null);
    clearSession();
    queryClient.removeQueries();
    toast.success('Logged out successfully');
  };

  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['user'],
    queryFn: authApi.getCurrentUser,
    enabled: Boolean(accessToken),
    retry: false,
    onSuccess: (profile) => updateUser(profile),
    onError: () => {
      setAccessTokenHeader(null);
      clearSession();
    },
  });

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    startGoogleOAuth,
    completeGoogleOAuth: (
      payload: GoogleCallbackPayload,
      options?: Parameters<typeof googleCallbackMutation.mutate>[1]
    ) =>
      googleCallbackMutation.mutate(payload, options),
    exchangeAuthToken: (
      payload: { accessToken: string; rememberMe?: boolean },
      options?: Parameters<typeof exchangeAuthTokenMutation.mutate>[1]
    ) => exchangeAuthTokenMutation.mutate(payload, options),
    logout,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    isGoogleLoading:
      isGoogleLoading || googleCallbackMutation.isPending || exchangeAuthTokenMutation.isPending,
    isAuthenticated,
    user,
    currentUser,
    refetchUser,
  };
};

import { projectId, publicAnonKey } from './supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-9dc263ad`;

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add authorization header if access token is provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.error(`API Error on ${endpoint}:`, data);
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`API Request Timeout on ${endpoint}`);
      throw new Error('Request timeout - please try again');
    }
    console.error(`API Request Error on ${endpoint}:`, error);
    throw error;
  }
}

// ==================== AUTH API ====================

export async function signUp(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organization?: string;
}) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function signIn(email: string, password: string) {
  return apiRequest('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signOut(accessToken: string) {
  return apiRequest('/auth/signout', {
    method: 'POST',
  }, accessToken);
}

export async function getCurrentUser(accessToken: string) {
  return apiRequest('/auth/me', {
    method: 'GET',
  }, accessToken);
}

export async function requestPasswordReset(email: string) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ==================== VERIFICATION API ====================

export async function createVerification(
  data: {
    filename: string;
    imageUrl: string;
    imageType?: string;
  },
  accessToken: string
) {
  return apiRequest('/verifications', {
    method: 'POST',
    body: JSON.stringify(data),
  }, accessToken);
}

export async function getVerifications(accessToken: string) {
  return apiRequest('/verifications', {
    method: 'GET',
  }, accessToken);
}

export async function getVerification(id: string, accessToken: string) {
  return apiRequest(`/verifications/${id}`, {
    method: 'GET',
  }, accessToken);
}

// ==================== ADMIN API ====================

export async function getAllUsers(accessToken: string) {
  return apiRequest('/admin/users', {
    method: 'GET',
  }, accessToken);
}

export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin',
  accessToken: string
) {
  return apiRequest(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  }, accessToken);
}

export async function getAllVerifications(accessToken: string) {
  return apiRequest('/admin/verifications', {
    method: 'GET',
  }, accessToken);
}

export async function getDatasets(accessToken: string) {
  return apiRequest('/admin/datasets', {
    method: 'GET',
  }, accessToken);
}

export async function addDataset(
  data: {
    name: string;
    description?: string;
    imageCount: number;
    source?: string;
  },
  accessToken: string
) {
  return apiRequest('/admin/datasets', {
    method: 'POST',
    body: JSON.stringify(data),
  }, accessToken);
}

export async function getAdminStats(accessToken: string) {
  return apiRequest('/admin/stats', {
    method: 'GET',
  }, accessToken);
}

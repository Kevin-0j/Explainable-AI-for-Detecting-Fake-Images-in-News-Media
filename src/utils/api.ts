// src/utils/api.ts
import api from "./fastapi";
import { ENDPOINTS } from "./backend-config";

// Core Types
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
  role: "user" | "admin";
  created_at: string;
  last_login: string;
}

export type VerificationStatus = "queued" | "pending" | "processing" | "completed" | "failed";

export interface Verification {
  job_id: string;
  status: VerificationStatus;
  prediction?: string | null;
  result?: string | null;
  confidence?: number | null;
  file_url?: string | null;
  gradcam_image?: string | null;
  lime_image?: string | null;
  thumbnail?: string | null;
  created_at?: string | null;
  uploaded_at?: string | null;
  updated_at?: string | null;
  source_filename?: string | null;
  id?: number | string;
  user_id?: number;
  image_path?: string;
  image_filename?: string;
  filename?: string;
  [key: string]: any;
}

export interface VerificationListData {
  verifications: Verification[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// Auth Types
export interface SignUpRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
}

export interface SignInResponse {
  success: boolean;
  access_token?: string;
  accessToken?: string; // alias for frontend callers
  user?: User;
  error?: string;
}

export interface GenericSuccessResponse {
  success: boolean;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Auth tokens
export interface TokenExchangeResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface SessionResponse {
  is_authenticated: boolean;
  user?: User;
  config?: Record<string, unknown>;
}

export interface VerificationResponse {
  success: boolean;
  verification?: Verification;
  error?: string;
}

const STATUS_MAP: Record<string, VerificationStatus> = {
  queued: "queued",
  pending: "pending",
  processing: "processing",
  running: "processing",
  inprogress: "processing",
  completed: "completed",
  complete: "completed",
  done: "completed",
  success: "completed",
  failed: "failed",
  error: "failed",
  cancelled: "failed",
};

const pickNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
};

const pickValue = <T>(...values: Array<T | null | undefined>): T | undefined => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value as T;
  }
  return undefined;
};

const unwrapVerificationPayload = (payload: any): any => {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload;

  const unwrap = (value: any): any => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    if (value.verification && typeof value.verification === "object" && !Array.isArray(value.verification)) {
      return unwrap(value.verification);
    }
    if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) {
      return unwrap(value.data);
    }
    return value;
  };

  return unwrap(payload);
};

const hasSignal = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const normaliseStatus = (input: unknown): VerificationStatus => {
  if (typeof input === "string") {
    const key = input.toLowerCase().replace(/\s+/g, "");
    const mapped = STATUS_MAP[key];
    if (mapped) return mapped;
  }
  return "queued";
};

const inferStatusFromPayload = (
  payload: any,
  prediction: unknown,
  result: unknown,
  confidence: number | undefined,
  updatedAt?: string | null
): VerificationStatus => {
  if (payload && typeof payload === "object") {
    const failure = pickValue(
      payload?.failure_reason,
      payload?.failureReason,
      payload?.error,
      payload?.error_message,
      payload?.message === "failed" ? "failed" : undefined
    );
    if (failure && !hasSignal(prediction) && !hasSignal(result)) {
      return "failed";
    }

    const completedAt = pickValue(payload?.completed_at, payload?.completedAt, payload?.processed_at, payload?.processedAt);
    const progress = pickNumber(pickValue(payload?.progress, payload?.percent_complete, payload?.percentComplete, payload?.progressPercent));
    const successFlag = typeof payload?.success === "boolean" ? payload.success : undefined;

    if (
      hasSignal(result) ||
      hasSignal(prediction) ||
      confidence !== undefined ||
      completedAt !== undefined ||
      (updatedAt && updatedAt !== null) ||
      progress !== undefined && progress >= 100 ||
      successFlag === true
    ) {
      return "completed";
    }

    if (progress !== undefined) {
      return "processing";
    }
  }

  return "processing";
};

const normaliseVerificationPayload = (payload: any): Verification => {
  const raw = unwrapVerificationPayload(payload);

  const jobIdCandidate = pickValue(
    raw?.job_id,
    raw?.jobId,
    raw?.verification_id,
    raw?.verificationId,
    raw?.id,
    raw?.uuid,
    raw?.pk
  );

  const job_id = jobIdCandidate !== undefined ? String(jobIdCandidate) : undefined;
  if (!job_id) {
    throw new Error("Verification payload missing job_id");
  }

  const confidence = pickNumber(pickValue(raw?.confidence, raw?.score, raw?.probability, raw?.confidence_score));
  const fileUrl = pickValue(raw?.file_url, raw?.fileUrl, raw?.image_url, raw?.image_path, raw?.path, raw?.url);
  const gradcam = pickValue(raw?.gradcam_image, raw?.gradcam_url, raw?.gradcam, raw?.grad_cam_image);
  const lime = pickValue(raw?.lime_image, raw?.lime_url, raw?.lime, raw?.lime_image_url);
  const createdAt = pickValue(raw?.created_at, raw?.createdAt, raw?.uploaded_at, raw?.timestamp, raw?.submitted_at);
  const updatedAt = pickValue(raw?.updated_at, raw?.updatedAt, raw?.completed_at, raw?.completedAt);
  const uploadedAt = pickValue(raw?.uploaded_at, createdAt, raw?.createdOn);
  const prediction = pickValue(raw?.prediction, raw?.result_label, raw?.label, raw?.result, raw?.classification);
  const result = pickValue(raw?.result, raw?.prediction, raw?.outcome, raw?.verdict);
  const thumbnail = pickValue(raw?.thumbnail, raw?.thumbnail_base64, raw?.thumbnailBase64, raw?.preview_base64, raw?.previewBase64, raw?.file_base64, raw?.image_thumbnail);
  const sourceFilename = pickValue(raw?.source_filename, raw?.original_filename, raw?.filename, raw?.image_filename, raw?.image_path, raw?.file_name);

  const statusCandidate = pickValue(raw?.status, raw?.state, raw?.job_status);
  const status = statusCandidate !== undefined
    ? normaliseStatus(statusCandidate)
    : inferStatusFromPayload(raw, prediction, result, confidence, updatedAt ?? null);

  return {
    ...raw,
    job_id,
    jobId: job_id,
    status,
    prediction: prediction ?? null,
    result: result ?? prediction ?? null,
    confidence: confidence ?? null,
    file_url: fileUrl ?? null,
    gradcam_image: gradcam ?? null,
    lime_image: lime ?? null,
    thumbnail: thumbnail ?? null,
    created_at: createdAt ?? null,
    uploaded_at: uploadedAt ?? null,
    updated_at: updatedAt ?? null,
    source_filename: sourceFilename ?? null,
  };
};

const normaliseVerificationList = (data: any[]): Verification[] => {
  if (!Array.isArray(data)) return [];
  const result: Verification[] = [];
  for (const item of data) {
    try {
      result.push(normaliseVerificationPayload(item));
    } catch (error) {
      console.warn("Skipping malformed verification payload", error, item);
    }
  }
  return result;
};

export interface AdminStats {
  total_users: number;
  total_verifications: number;
  fake_rate: number;
  recent_verifications: Verification[];
  temperature?: number;
  last_calibrated_at?: string;
}

// Auth API Functions
export const signUp = async (
  data: SignUpRequest | { email: string; password: string; firstName?: string; lastName?: string; organization?: string }
): Promise<GenericSuccessResponse> => {
  try {
    const payload: SignUpRequest = {
      email: (data as any).email,
      password: (data as any).password,
      first_name: (data as any).first_name ?? (data as any).firstName,
      last_name: (data as any).last_name ?? (data as any).lastName,
      organization: (data as any).organization,
    };
    await api.post("/api/v1/auth/register", payload);
    return { success: true };
  } catch (err: any) {
    const backendMsg = err.response?.data?.detail || err.response?.data?.message;
    const message = backendMsg || err.message || "Registration failed";
    return { success: false, error: message };
  }
};

export const signIn = async (email: string, password: string): Promise<SignInResponse> => {
  try {
    const response = await api.post("/api/v1/auth/login", { email, password });
    return { 
      success: true, 
      access_token: (response.data as any).access_token,
      accessToken: (response.data as any).access_token,
      user: (response.data as any).user 
    };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Login failed";
    return { success: false, error: message };
  }
};

// Supabase OAuth → Backend token exchange
export const exchangeSupabaseToken = async (supabaseToken: string): Promise<{ success: boolean; data?: TokenExchangeResponse; error?: string }> => {
  try {
    const res = await api.post("/api/v1/auth/exchange", { supabase_token: supabaseToken });
    return { success: true, data: res.data as TokenExchangeResponse };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Token exchange failed";
    return { success: false, error: message };
  }
};

export const getBackendSession = async (token: string | null): Promise<{ success: boolean; data?: SessionResponse; error?: string }> => {
  if (!token) return { success: false, error: "No access token provided" };
  try {
    const res = await api.get("/api/v1/auth/session", { headers: { Authorization: `Bearer ${token}` } });
    return { success: true, data: res.data as SessionResponse };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to fetch session";
    return { success: false, error: message };
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ success: boolean; access_token?: string; error?: string }> => {
  try {
    const res = await api.post("/api/v1/auth/refresh", { refresh_token: refreshToken });
    return { success: true, access_token: (res.data as any).access_token };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to refresh token";
    return { success: false, error: message };
  }
};

export const requestPasswordReset = async (email: string): Promise<GenericSuccessResponse> => {
  try {
    await api.post("/api/v1/auth/password-reset", { email });
    return { success: true };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Password reset failed";
    return { success: false, error: message };
  }
};

// User API Functions
export const getCurrentUser = async (token: string | null): Promise<UserResponse> => {
  if (!token) {
    return { success: false, error: "No access token provided" };
  }
  try {
    const res = await api.get("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, user: res.data as User };
  } catch (err: any) {
    const status = err.response?.status;
    const message = status === 404 ? "User not found" : err.response?.data?.detail || "Failed to fetch user";
    return { success: false, error: message };
  }
};

export const syncUser = async (
  token: string | null,
  payload: { email: string; first_name?: string; last_name?: string; organization?: string }
): Promise<UserResponse> => {
  if (!token) {
    return { success: false, error: "No access token provided" };
  }
  try {
    const res = await api.post("/api/v1/users/sync", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, user: res.data as User };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "User sync failed";
    return { success: false, error: message };
  }
};

// Verification API Functions
export const createVerification = async (
  formData: FormData,
  token: string
): Promise<{ success: true; verification: Verification } | { success: false; error: string }> => {
  try {
    // Let the browser set the correct multipart boundary; only send Authorization
    const res = await api.post(ENDPOINTS.uploadVerification, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = res.data ?? {};
    let verification: Verification;

    try {
      verification = normaliseVerificationPayload(payload);
    } catch (parseError: any) {
      throw new Error(parseError?.message || "Upload response could not be parsed");
    }

    return { success: true, verification };
  } catch (err: any) {
    const data = err.response?.data;
    let message: unknown = (data && (data.detail || data.error || data.message)) || err.message || "Upload failed";
    if (typeof message !== 'string') {
      try { message = JSON.stringify(message); } catch { message = 'Upload failed'; }
    }
    return { success: false, error: message as string };
  }
};

export const getVerification = async (id: string, token: string | null): Promise<VerificationResponse> => {
  if (!token) {
    return { success: false, error: "No access token provided" };
  }
  try {
    const res = await api.get(ENDPOINTS.verificationDetails(id), {
      headers: { Authorization: `Bearer ${token}` },
    });
    let verification: Verification;
    try {
      verification = normaliseVerificationPayload(res.data);
    } catch (parseError: any) {
      throw new Error(parseError?.message || "Malformed verification response");
    }
    return { success: true, verification };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to fetch verification";
    return { success: false, error: message };
  }
};

// Admin API Functions
export const getAllUsers = async (token: string | null): Promise<{ success: boolean; users?: User[]; error?: string }> => {
  if (!token) {
    return { success: false, error: "No access token provided" };
  }
  try {
    const res = await api.get("/api/v1/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true, users: res.data as User[] };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to fetch users";
    return { success: false, error: message };
  }
};

export const getAllVerifications = async (token: string | null): Promise<{ success: boolean; verifications?: Verification[]; error?: string }> => {
  if (!token) {
    return { success: false, error: "No access token provided" };
  }
  try {
    const res = await api.get(ENDPOINTS.adminVerifications, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = res.data ?? {};
    const raw = Array.isArray(payload?.verifications)
      ? payload.verifications
      : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
      ? payload
      : [];
    const verifications = normaliseVerificationList(raw);
    return { success: true, verifications };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to fetch verifications";
    return { success: false, error: message };
  }
};

// User verifications (non-admin)
export const listUserVerifications = async (
  token: string | null,
  page: number = 1,
  limit: number = 10
): Promise<{ success: true; data: VerificationListData } | { success: false; error: string }> => {
  if (!token) return { success: false, error: "No access token provided" };
  try {
    const res = await api.get(`${ENDPOINTS.listVerifications}?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = res.data ?? {};
    const raw = Array.isArray(payload?.verifications)
      ? payload.verifications
      : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
      ? payload
      : [];

    const verifications = normaliseVerificationList(raw);

    const totalRaw = pickNumber(payload?.total ?? payload?.count ?? payload?.total_items ?? payload?.totalCount);
    const limitRaw = pickNumber(payload?.limit ?? payload?.per_page ?? payload?.page_size ?? payload?.perPage) ?? limit;
    const total = totalRaw ?? verifications.length;
    const pageRaw = pickNumber(payload?.page ?? payload?.current_page ?? payload?.page_number ?? payload?.pageIndex);
    const pagesRaw = pickNumber(payload?.pages ?? payload?.total_pages ?? payload?.page_count);
    const pageNumber = pageRaw ?? page;
    const pages = pagesRaw ?? (limitRaw > 0 ? Math.max(1, Math.ceil(total / limitRaw)) : 1);

    return {
      success: true,
      data: {
        verifications,
        total,
        page: pageNumber,
        pages,
        limit: limitRaw,
      },
    };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to fetch verifications";
    return { success: false, error: message };
  }
};

export const updateUserStatus = async (
  userId: number,
  action: 'activate' | 'suspend',
  token: string | null
): Promise<GenericSuccessResponse> => {
  if (!token) return { success: false, error: "No access token provided" };
  try {
    await api.put(`/api/v1/admin/users/${userId}/status?action=${action}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { success: true };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || 'Failed to update user status';
    return { success: false, error: message };
  }
};
// Legacy compat, but route to status:
export const updateUserRole = async (
  userId: number | string,
  role: "user" | "admin",
  token: string | null
): Promise<GenericSuccessResponse> => {
  // In this backend, roles are not set via an endpoint. We'll use activate for user, suspend for others as placeholder.
  const action = role === "user" ? "activate" : "suspend";
  return updateUserStatus(Number(userId), action, token);
};

export const getAdminStats = async (token: string | null): Promise<{ success: boolean; stats?: AdminStats; error?: string }> => {
  if (!token) {
    return { success: false, error: "No access token provided" };
  }
  try {
    const res = await api.get("/api/v1/admin/system/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = res.data ?? {};
    const recent = normaliseVerificationList(
      Array.isArray(payload?.recent_verifications)
        ? payload.recent_verifications
        : Array.isArray(payload?.recentVerifications)
        ? payload.recentVerifications
        : []
    );

    const stats: AdminStats = {
      total_users: pickNumber(payload?.total_users ?? payload?.users) ?? 0,
      total_verifications: pickNumber(payload?.total_verifications ?? payload?.verifications) ?? recent.length,
      fake_rate: pickNumber(payload?.fake_rate ?? payload?.fakeRate ?? payload?.fake_rate_percent) ?? 0,
      recent_verifications: recent,
      temperature: pickNumber(payload?.temperature ?? payload?.calibration_temperature),
      last_calibrated_at: pickValue(payload?.last_calibrated_at, payload?.lastCalibratedAt, payload?.calibrated_at) ?? undefined,
    };

    return { success: true, stats };
  } catch (err: any) {
    const message = err.response?.data?.detail || err.message || "Failed to fetch stats";
    return { success: false, error: message };
  }
};

// Legacy compatibility
export const getVerifications = async (token: string | null, page: number = 1, limit: number = 10) => {
  return listUserVerifications(token, page, limit);
};

// Dataset admin helpers (placeholder until backend endpoints are available)
export const getDatasets = async (token: string | null): Promise<{ success: boolean; datasets?: Array<any>; error?: string }> => {
  if (!token) return { success: false, error: "No access token provided" };
  // Implement real API call when backend is ready
  return { success: true, datasets: [] };
};

export const addDataset = async (_formData: FormData, token: string | null): Promise<GenericSuccessResponse> => {
  if (!token) return { success: false, error: "No access token provided" };
  // Implement real API upload when backend is ready
  return { success: true };
};

export const calibrateVerifications = async (
  token: string | null,
  formData: FormData
): Promise<{ success: boolean; temperature?: number; detail?: string; error?: string }> => {
  if (!token) return { success: false, error: "No access token provided" };

  try {
    const res = await api.post(ENDPOINTS.calibrateVerifications, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = res.data ?? {};
    const temperature = pickNumber(payload.temperature ?? payload.calibration_temperature ?? payload.temp);
    const detail = payload.detail ?? payload.message ?? payload.status;

    return {
      success: true,
      temperature: temperature ?? undefined,
      detail,
    };
  } catch (err: any) {
    const data = err.response?.data;
    let message: unknown = (data && (data.detail || data.error || data.message)) || err.message || "Calibration failed";
    if (typeof message !== "string") {
      try {
        message = JSON.stringify(message);
      } catch {
        message = "Calibration failed";
      }
    }
    return { success: false, error: message as string };
  }
};

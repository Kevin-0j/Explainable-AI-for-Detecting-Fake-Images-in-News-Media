// src/utils/backend-config.ts
const DEFAULT_BACKEND = "http://localhost:8000";

const rawBackend = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_BACKEND;
const trimmedBackend = rawBackend.replace(/\/+$/, "");

// Allow env var to include /api/v1 but normalise to bare origin for axios baseURL usage
const API_SUFFIX = "/api/v1";
export const BACKEND_URL = trimmedBackend.endsWith(API_SUFFIX)
  ? trimmedBackend.slice(0, -API_SUFFIX.length)
  : trimmedBackend;

export const API_BASE_PATH = API_SUFFIX;
export const BACKEND_ORIGIN = BACKEND_URL;
export const API_BASE_URL = `${BACKEND_ORIGIN}${API_BASE_PATH}`;

export const ENDPOINTS = {
  uploadVerification: `${API_BASE_PATH}/verifications/upload`,
  listVerifications: `${API_BASE_PATH}/verifications`,
  verificationDetails: (id: string) => `${API_BASE_PATH}/verifications/${id}`,
  adminVerifications: `${API_BASE_PATH}/admin/verifications`,
  currentUser: `${API_BASE_PATH}/users/me`,
  syncUser: `${API_BASE_PATH}/users/sync`,
  calibrateVerifications: `${API_BASE_PATH}/verifications/calibrate`,
};

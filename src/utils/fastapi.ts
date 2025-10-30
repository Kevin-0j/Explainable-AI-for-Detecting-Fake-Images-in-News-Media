// src/utils/fastapi.ts
import axios from "axios";
import { BACKEND_URL, ENDPOINTS } from "./backend-config";

interface Result {
  label: string;
  pred_class: number;
  confidence: number;
  file_url: string;
  gradcam_url?: string;
  lime_url?: string;
  explanation_error?: string | null;
}

const api = axios.create({
  baseURL: BACKEND_URL,
});

export async function syncUserToFastAPI(accessToken: string, user: any) {
  try {
    await api.post(ENDPOINTS.syncUser, user, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("User synced to FastAPI successfully");
  } catch (error: any) {
    console.error("User sync failed:", error.response?.data || error.message);
    throw new Error("Failed to sync user to backend");
  }
}

export async function uploadImage(file: File, token?: string): Promise<Result> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await api.post(ENDPOINTS.uploadVerification, formData, {
      headers,
    });
    return response.data as Result;
  } catch (error: any) {
    console.error("Upload failed:", error.response?.data || error.message);
    throw error;
  }
}

export default api;

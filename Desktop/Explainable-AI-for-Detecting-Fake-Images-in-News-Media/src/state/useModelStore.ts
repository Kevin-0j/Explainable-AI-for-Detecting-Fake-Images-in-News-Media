import { create } from "zustand";

interface ModelStore {
  models: string[];
  activeModel: string | null;
  fetchModels: () => Promise<void>;
  selectModel: (name: string) => Promise<string>;
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],
  activeModel: null,
  fetchModels: async () => {
    try {
      const response = await fetch("/api/models");
      if (!response.ok) {
        throw new Error("Unable to load model list");
      }
      const payload = (await response.json()) || {};
      const loadedModels: string[] = Array.isArray(payload.models) ? payload.models : [];
      set((state) => ({
        models: loadedModels,
        activeModel: state.activeModel ?? loadedModels[0] ?? null,
      }));
    } catch (error) {
      console.error("Failed to load models", error);
      set({ models: [], activeModel: null });
    }
  },
  selectModel: async (name: string) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch("/api/models/select", {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload?.error || payload?.message || "Unable to switch models";
      throw new Error(message);
    }

    const payload = (await response.json()) || {};
    const nextActive = payload.active || name;
    set({ activeModel: nextActive });
    return nextActive;
  },
}));

// src/contexts/VerificationContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Verification, VerificationListData } from "../utils/api";

interface VerificationMeta {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

interface VerificationStoreState {
  map: Record<string, Verification>;
  order: string[];
  meta: VerificationMeta;
  temperature: number | null;
}

const DEFAULT_META: VerificationMeta = {
  total: 0,
  page: 1,
  pages: 1,
  limit: 10,
};

const DEFAULT_STATE: VerificationStoreState = {
  map: {},
  order: [],
  meta: DEFAULT_META,
  temperature: null,
};

const STORAGE_KEY = "newssight.verifications";

const safeParse = (value: string | null): VerificationStoreState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const map = typeof parsed.map === "object" && parsed.map ? parsed.map : {};
    const order = Array.isArray(parsed.order) ? parsed.order.filter(Boolean) : [];
    const metaCandidate = parsed.meta || {};
    const meta: VerificationMeta = {
      total: Number(metaCandidate.total) || 0,
      page: Number(metaCandidate.page) || 1,
      pages: Number(metaCandidate.pages) || 1,
      limit: Number(metaCandidate.limit) || DEFAULT_META.limit,
    };
    const temperature = typeof parsed.temperature === "number" ? parsed.temperature : null;
    return { map, order, meta, temperature };
  } catch (error) {
    console.warn("Failed to parse verification cache", error);
    return null;
  }
};

type VerificationContextValue = {
  verifications: Verification[];
  meta: VerificationMeta;
  temperature: number | null;
  upsert: (items: Verification[]) => void;
  replaceFromList: (data: VerificationListData) => void;
  getById: (jobId: string) => Verification | undefined;
  clear: () => void;
  setTemperature: (value: number | null) => void;
};

const VerificationContext = createContext<VerificationContextValue | undefined>(undefined);

export function VerificationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VerificationStoreState>(() => {
    if (typeof window === "undefined") return DEFAULT_STATE;
    return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_STATE;
  });

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to persist verification cache", error);
    }
  }, [state]);

  const upsert = useCallback((items: Verification[]) => {
    if (!items || items.length === 0) return;
    setState((prev) => {
      const map = { ...prev.map };
      const order = [...prev.order];

      for (const item of items) {
        if (!item || !item.job_id) continue;
        map[item.job_id] = {
          ...(map[item.job_id] || {}),
          ...item,
        };
        if (!order.includes(item.job_id)) {
          order.unshift(item.job_id);
        }
      }

      return {
        map,
        order,
        meta: {
          ...prev.meta,
          total: Math.max(prev.meta.total, order.length),
        },
        temperature: prev.temperature,
      };
    });
  }, []);

  const replaceFromList = useCallback((data: VerificationListData) => {
    if (!data) return;
    setState((prev) => {
      const map = { ...prev.map };
      const order: string[] = [];

      data.verifications.forEach((item) => {
        if (!item || !item.job_id) return;
        const merged = {
          ...(map[item.job_id] || {}),
          ...item,
        };
        map[item.job_id] = merged;
        order.push(item.job_id);
      });

      return {
        map,
        order,
        meta: {
          total: data.total,
          page: data.page,
          pages: data.pages,
          limit: data.limit,
        },
        temperature: prev.temperature,
      };
    });
  }, []);

  const clear = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const getById = useCallback(
    (jobId: string) => {
      if (!jobId) return undefined;
      return state.map[jobId];
    },
    [state.map]
  );

  const setTemperature = useCallback((value: number | null) => {
    setState((prev) => ({
      ...prev,
      temperature: value,
    }));
  }, []);

  const verifications = useMemo(() => state.order.map((id) => state.map[id]).filter(Boolean) as Verification[], [state.order, state.map]);

  const value = useMemo<VerificationContextValue>(() => ({
    verifications,
    meta: state.meta,
    temperature: state.temperature,
    upsert,
    replaceFromList,
    getById,
    clear,
    setTemperature,
  }), [verifications, state.meta, state.temperature, upsert, replaceFromList, getById, clear, setTemperature]);

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>;
}

export function useVerificationStore() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error("useVerificationStore must be used within a VerificationProvider");
  }
  return context;
}

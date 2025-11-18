import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveResultState {
  imageUrl: string | null;
  analysis: any | null;
  metadata: Record<string, unknown> | null;
  gradcam: string | null;
  lime: string | null;
  setActiveResult: (payload: {
    imageUrl: string;
    analysis: any;
    metadata: Record<string, unknown>;
    gradcam: string | null;
    lime: string | null;
  }) => void;
  clear: () => void;
}

export const useActiveResult = create<ActiveResultState>()(
  persist(
    (set) => ({
      imageUrl: null,
      analysis: null,
      metadata: null,
      gradcam: null,
      lime: null,
      setActiveResult: ({ imageUrl, analysis, metadata, gradcam, lime }) =>
        set({ imageUrl, analysis, metadata, gradcam, lime }),
      clear: () =>
        set({
          imageUrl: null,
          analysis: null,
          metadata: null,
          gradcam: null,
          lime: null,
        }),
    }),
    { name: 'active-result-storage' }
  )
);

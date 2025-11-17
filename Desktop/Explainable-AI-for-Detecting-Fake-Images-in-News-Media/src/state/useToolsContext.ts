import { create } from 'zustand';

interface ToolsContextState {
  imageUrl: string | null;
  analysis: any | null;
  metadata: Record<string, unknown> | null;
  setContext: (payload: {
    imageUrl: string;
    analysis: any;
    metadata: Record<string, unknown>;
  }) => void;
  clear: () => void;
}

export const useToolsContext = create<ToolsContextState>((set) => ({
  imageUrl: null,
  analysis: null,
  metadata: null,

  setContext: ({ imageUrl, analysis, metadata }) =>
    set({ imageUrl, analysis, metadata }),

  clear: () => set({ imageUrl: null, analysis: null, metadata: null }),
}));

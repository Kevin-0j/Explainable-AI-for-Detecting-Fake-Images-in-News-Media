import { useEffect } from "react";
import { JournalistTools } from "@/components/JournalistTools";
import type { StructuredAnalysis } from "@/types/analysis";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imageUrl: string;
  analysis: StructuredAnalysis;
  metadata?: Record<string, unknown>;
}

export function JournalistToolsDrawer({
  open,
  onOpenChange,
  imageUrl,
  analysis,
  metadata,
}: Props) {
  // Close drawer on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onOpenChange]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70]
          shadow-xl border-l transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="p-6 overflow-y-auto h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Journalist Tools</h2>
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
          </div>

          <JournalistTools
            imageUrl={imageUrl}
            analysis={analysis}
            metadata={metadata}
          />
        </div>
      </div>
    </>
  );
}

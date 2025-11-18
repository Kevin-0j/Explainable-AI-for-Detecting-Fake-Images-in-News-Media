import { useEffect, useState } from "react";
import { JournalistTools } from "@/components/JournalistTools";
import { useActiveResult } from "@/state/useActiveResult";
import { useModelStore } from "@/state/useModelStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function JournalistToolsPage() {
  const { imageUrl, analysis, metadata } = useActiveResult();
  const safeAnalysis = analysis || { tldr: "General tools mode" };
  const safeMetadata = metadata || {};
  const models = useModelStore((state) => state.models);
  const activeModel = useModelStore((state) => state.activeModel);
  const fetchModels = useModelStore((state) => state.fetchModels);
  const selectModel = useModelStore((state) => state.selectModel);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (activeModel && activeModel !== selectedModel) {
      setSelectedModel(activeModel);
      return;
    }
    if (!activeModel && models.length > 0 && selectedModel !== models[0]) {
      setSelectedModel(models[0]);
    }
  }, [activeModel, models, selectedModel]);

  const handleSwitch = async () => {
    if (!selectedModel) return;
    setIsSwitching(true);
    try {
      const updatedModel = await selectModel(selectedModel);
      setSelectedModel(updatedModel);
      toast.success(`Model switched to ${updatedModel}`);
    } catch (error) {
      console.error("Model switch error", error);
      const message = error instanceof Error ? error.message : "Model switch failed";
      toast.error(message);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <main className="py-10 bg-muted/10">
      <div className="max-w-4xl mx-auto space-y-10 px-4 md:px-0">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Journalist Verification Toolkit</h1>
          <p className="text-muted-foreground">
            OSINT & authenticity tools to assist your investigation. Loaded contextually when opened from an analysis page.
          </p>
        </div>

        <Card className="mb-8 shadow-sm border rounded-xl bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold tracking-tight">Model Selection</CardTitle>
            <p className="text-sm text-muted-foreground">Choose an AI model for analysis</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Active model: <span className="font-medium text-foreground">{activeModel || "None"}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedModel || activeModel || ""}
                  onValueChange={(value) => setSelectedModel(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[180px]">
                    {models.map((modelName) => (
                      <SelectItem key={modelName} value={modelName}>
                        {modelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedModel || selectedModel === activeModel || isSwitching}
                  onClick={handleSwitch}
                  className="whitespace-nowrap"
                >
                  Switch Model
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {imageUrl ? (
          <Card className="mb-6 bg-[#f9fafb] border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Loaded Media Context</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <img
                src={imageUrl}
                alt="preview"
                className="w-40 h-40 object-cover rounded-md border"
              />
              <div className="text-sm text-muted-foreground">
                <p>Tools are now using the image you just analyzed.</p>
                <p className="mt-2">Metadata & summary included.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-10 rounded-xl border border-dashed border-[#d1d5db] bg-white/60 px-6 py-6 text-center text-sm text-[#6b7280]">
            No image loaded yet — open a result first.
          </div>
        )}

        <Card className="p-8 shadow-lg border rounded-xl bg-white space-y-8">
          <JournalistTools
            imageUrl={imageUrl || "N/A"}
            analysis={safeAnalysis}
            metadata={safeMetadata}
          />
        </Card>
      </div>
    </main>
  );
}

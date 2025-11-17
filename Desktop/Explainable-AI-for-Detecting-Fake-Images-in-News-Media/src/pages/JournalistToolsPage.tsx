import { JournalistTools } from "@/components/JournalistTools";
import { useToolsContext } from "@/state/useToolsContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function JournalistToolsPage() {
  const { imageUrl, analysis, metadata } = useToolsContext();

  return (
    <main className="container py-10 max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        Journalist Verification Toolkit
      </h1>
      <p className="text-muted-foreground mb-10">
        OSINT & authenticity tools to assist your investigation. Loaded contextually
        when opened from an analysis page.
      </p>

      {imageUrl && (
        <Card className="mb-10 bg-[#f9fafb] border shadow-sm">
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
      )}

      <Card className="p-8 shadow-lg border rounded-xl bg-white space-y-8">
        <JournalistTools
          imageUrl={imageUrl || "N/A"}
          analysis={analysis || { tldr: "General tools active" }}
          metadata={metadata || {}}
        />
      </Card>
    </main>
  );
}

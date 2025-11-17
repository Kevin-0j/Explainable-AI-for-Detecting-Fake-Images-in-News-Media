import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Copy, MessageCircle } from 'lucide-react';
import type { AssistantAnalysis } from '@/services/api';
import { toast } from 'sonner';

export const RISK_LEVEL_BADGES: Record<
  AssistantAnalysis['risk_level'],
  { label: string; className: string }
> = {
  low: { label: 'Low risk', className: 'bg-emerald-500 text-white' },
  medium: { label: 'Medium risk', className: 'bg-amber-500 text-[#1F1F1F]' },
  high: { label: 'High risk', className: 'bg-destructive text-destructive-foreground' },
};

export interface ExplanationCardProps {
  analysis: AssistantAnalysis | null;
  loading?: boolean;
  error?: string | null;
}

const renderList = (items: string[], fallback: string) =>
  items.length > 0 ? (
    <ul className="list-disc pl-5 space-y-2 text-sm text-[#1F1F1F]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-[#6b6b6b]">{fallback}</p>
  );

const buildClipboardSummary = (analysis: AssistantAnalysis): string => {
  const formatList = (items: string[], fallback: string) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;

  return [
    `Risk level: ${analysis.risk_level}`,
    `TL;DR: ${analysis.tldr}`,
    'Key suspicious cues:',
    formatList(analysis.key_cues, 'No cues provided.'),
    'Recommended next steps:',
    formatList(analysis.next_steps, 'No steps provided.'),
  ].join('\n');
};

export function ExplanationCard({
  analysis,
  loading = false,
  error,
}: ExplanationCardProps) {
  const handleCopy = async () => {
    if (!analysis) return;
    const summaryText = buildClipboardSummary(analysis);
    if (!navigator.clipboard?.writeText) {
      toast.error('Clipboard access unavailable.');
      return;
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('Summary copied to clipboard');
    } catch {
      toast.error('Unable to copy summary.');
    }
  };
  return (
    <Card className="border-none shadow-sm bg-[#FAFAFA]">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#4BA3A4]" />
              <h2 className="text-xl font-semibold">Newsight explanation</h2>
              {analysis && (
                <Badge className={`px-3 py-1 text-sm ${RISK_LEVEL_BADGES[analysis.risk_level].className}`}>
                  {RISK_LEVEL_BADGES[analysis.risk_level].label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#6b6b6b]">
              Concise, structured guidance from the assistant tailored to this prediction.
            </p>
          </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!analysis || loading}
              className="flex items-center gap-2"
            >
            <Copy className="h-4 w-4" />
            Copy verification summary
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6b6b6b]">Generating briefing...</p>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-[#B42318]">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-[#1F1F1F] mb-2">TL;DR</h3>
              <p className="text-sm text-[#1F1F1F] leading-relaxed">{analysis.tldr}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-[#1F1F1F] mb-2">Key suspicious cues</h3>
              {renderList(analysis.key_cues, 'No suspicious cues were detected.')}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-[#1F1F1F] mb-2">Recommended next steps</h3>
              {renderList(analysis.next_steps, 'No next steps specified.')}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-[#1F1F1F] mb-2">Caveats</h3>
              {renderList(analysis.caveats, 'No caveats provided.')}
            </section>
            {analysis.raw_text ? (
              <details className="rounded-lg border border-dashed border-[#d1d1d1] bg-[#F9F9F9] p-4 text-sm text-[#1F1F1F]">
                <summary className="font-semibold cursor-pointer">Full explanation</summary>
                <p className="mt-3 leading-relaxed whitespace-pre-line">{analysis.raw_text}</p>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#6b6b6b]">Assistant summary unavailable.</p>
        )}
      </CardContent>
    </Card>
  );
}

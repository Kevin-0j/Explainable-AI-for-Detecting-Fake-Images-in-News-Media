import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { StructuredAnalysis } from '@/types/analysis';
import { normalizeBullets, buildClipboardSummary, clampText } from '@/utils/formatters';

interface AnalysisOutputProps {
  analysis: StructuredAnalysis;
}

export function AnalysisOutput({ analysis }: AnalysisOutputProps) {
  const findings = useMemo(() => normalizeBullets(analysis.key_findings), [analysis.key_findings]);
  const steps = useMemo(() => normalizeBullets(analysis.action_steps), [analysis.action_steps]);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      toast.error('Clipboard unavailable.');
      return;
    }
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(buildClipboardSummary(analysis));
      toast.success('Summary copied');
    } catch (error) {
      toast.error('Copy failed.');
    } finally {
      setIsCopying(false);
    }
  };

  const riskLabel = analysis.risk_level ? `${analysis.risk_level}`.toUpperCase() : 'UNKNOWN';

  return (
    <Card className="shadow-sm border-none bg-white">
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6b7280]">Analysis</p>
            <h2 className="text-2xl font-semibold">{clampText(analysis.tldr ?? 'Summary unavailable', 160)}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-[#f59e0b] text-[#1f2937] px-3 py-1 text-sm">
              {riskLabel}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopying}>
              {isCopying ? 'Copying…' : 'Copy summary'}
            </Button>
          </div>
        </div>

        {analysis.risk_explanation && (
          <p className="text-sm text-[#374151]">{analysis.risk_explanation}</p>
        )}

        <section>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Key findings</h3>
          </header>
          {findings.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#111827]">
              {findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">No findings were recorded.</p>
          )}
        </section>

        <section>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Action steps</h3>
          </header>
          {steps.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#111827]">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">No action steps available.</p>
          )}
        </section>

        {analysis.raw_text && (
          <details className="rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] p-4 text-sm text-[#111827]">
            <summary className="font-semibold cursor-pointer">Full explanation</summary>
            <p className="mt-3 whitespace-pre-line leading-relaxed">{analysis.raw_text}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

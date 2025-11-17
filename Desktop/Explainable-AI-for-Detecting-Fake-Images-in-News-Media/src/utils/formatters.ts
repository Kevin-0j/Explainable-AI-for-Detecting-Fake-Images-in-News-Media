import type { StructuredAnalysis } from '@/types/analysis';

export function clampText(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
}

export function normalizeBullets(
  bullets: string[] | undefined,
  options?: { maxItems?: number; maxCharsPerItem?: number }
): string[] {
  if (!bullets || bullets.length === 0) return [];
  const maxItems = options?.maxItems ?? 5;
  const maxCharsPerItem = options?.maxCharsPerItem ?? 220;

  return bullets
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => clampText(item, maxCharsPerItem));
}

export function buildClipboardSummary(analysis: StructuredAnalysis): string {
  const lines: string[] = [];

  if (analysis.tldr) {
    lines.push(`TL;DR: ${analysis.tldr}`);
  }

  if (analysis.risk_level) {
    const riskText = analysis.risk_explanation
      ? `${analysis.risk_level.toUpperCase()} – ${analysis.risk_explanation}`
      : analysis.risk_level.toUpperCase();
    lines.push(`Risk: ${riskText}`);
  }

  const findings = normalizeBullets(analysis.key_findings);
  if (findings.length > 0) {
    lines.push('');
    lines.push('Key findings:');
    findings.forEach((finding) => {
      lines.push(`- ${finding}`);
    });
  }

  const steps = normalizeBullets(analysis.action_steps);
  if (steps.length > 0) {
    lines.push('');
    lines.push('Action steps for the journalist:');
    steps.forEach((step) => {
      lines.push(`- ${step}`);
    });
  }

  if (analysis.model_name || analysis.model_version) {
    lines.push('');
    lines.push(
      `Model: ${analysis.model_name ?? 'unknown'} ${analysis.model_version ?? ''}`.trim()
    );
  }

  return lines.join('\n').trim();
}

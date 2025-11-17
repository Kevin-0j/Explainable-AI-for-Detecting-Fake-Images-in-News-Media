export interface StructuredAnalysis {
  tldr?: string;
  key_findings?: string[];
  risk_level?: 'low' | 'medium' | 'high' | string;
  risk_explanation?: string;
  action_steps?: string[];
  model_name?: string;
  model_version?: string;
  raw_text?: string;
}

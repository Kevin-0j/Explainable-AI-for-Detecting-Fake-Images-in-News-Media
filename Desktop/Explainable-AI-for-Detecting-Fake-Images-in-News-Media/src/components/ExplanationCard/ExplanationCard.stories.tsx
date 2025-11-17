import { ExplanationCard } from './ExplanationCard';

const sampleAnalysis = {
  risk_level: 'high',
  tldr: 'This image contains signs of manipulation.',
  key_cues: [
    'Lighting inconsistencies on main subject',
    'Edge artefacts around face',
    'Unnatural texture compression',
  ],
  next_steps: [
    'Run reverse image search',
    'Compare with wire agency photos',
    'Request original source metadata',
  ],
  caveats: ['Model may be wrong if input is compressed'],
  raw_text: 'Detailed explanation here describing the suspect edits.',
};

const meta = {
  title: 'Components/ExplanationCard',
  component: ExplanationCard,
};

export default meta;

export const Default = {
  args: {
    analysis: sampleAnalysis,
    loading: false,
  },
};

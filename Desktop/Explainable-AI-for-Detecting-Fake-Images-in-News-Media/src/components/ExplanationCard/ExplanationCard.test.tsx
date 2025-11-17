import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExplanationCard } from './ExplanationCard';

const sampleAnalysis = {
  risk_level: 'high',
  tldr: 'This image contains signs of manipulation.',
  key_cues: [
    'Lighting inconsistencies on subject',
    'Edge artefacts around the face',
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

describe('ExplanationCard', () => {
  it('renders structured sections and matches snapshot', () => {
    const { container } = render(<ExplanationCard analysis={sampleAnalysis} />);

    expect(screen.getByText('TL;DR')).toBeInTheDocument();
    expect(screen.getByText('Key suspicious cues')).toBeInTheDocument();
    expect(screen.getByText('Recommended next steps')).toBeInTheDocument();
    expect(screen.getByText('Caveats')).toBeInTheDocument();
    expect(screen.getByText('Full explanation')).toBeInTheDocument();

    expect(container).toMatchSnapshot();
  });

  it('keeps the full explanation collapsed by default', () => {
    render(<ExplanationCard analysis={sampleAnalysis} />);
    const details = screen.getByText('Full explanation').closest('details');
    expect(details).not.toHaveAttribute('open');
  });
});

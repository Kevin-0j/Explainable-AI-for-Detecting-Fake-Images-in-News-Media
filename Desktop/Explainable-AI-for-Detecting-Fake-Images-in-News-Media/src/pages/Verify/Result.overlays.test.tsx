import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Result from './Result';

const mockGetHistory = vi.fn();

vi.mock('@/api/api', () => ({
  predictionApi: {
    getHistory: () => mockGetHistory(),
    predict: vi.fn(),
    getReportBlob: vi.fn(),
  },
}));

vi.mock('@/api/reports', () => ({
  reportsApi: {
    downloadReport: vi.fn(),
  },
}));

const authState = {
  accessToken: 'test-token',
  user: null,
  isAuthenticated: () => true,
  setSession: vi.fn(),
  updateTokens: vi.fn(),
  updateUser: vi.fn(),
  clearSession: vi.fn(),
};

vi.mock('@/store/auth', () => ({
  useAuthStore: (selector?: (state: typeof authState) => unknown) =>
    typeof selector === 'function' ? selector(authState) : authState,
}));

const renderResultPage = async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/verify/1']}>
        <Routes>
          <Route path="/verify/:id" element={<Result />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

afterEach(() => {
  mockGetHistory.mockReset();
});

describe('Result overlays based on history', () => {
  it('renders Grad-CAM and LIME cards when URLs are available', async () => {
    const historyPayload = [
      {
        analysis: {
          id: '1',
          prediction_label: 'fake',
          confidence_score: 0.95,
          gradcam_image_url: '/uploads/gradcam/fake_gradcam.png',
          lime_image_url: '/uploads/lime/fake_lime.png',
          created_at: new Date().toISOString(),
        },
        media_file: {
          storage_path: '/uploads/input.png',
        },
      },
    ];
    mockGetHistory.mockResolvedValueOnce(historyPayload);

    const { container } = await renderResultPage();

    await waitFor(() => {
      expect(screen.getByText('Grad-CAM overlay')).toBeInTheDocument();
      expect(screen.getByText('LIME explanation')).toBeInTheDocument();
    });

    const gradcamImg = screen.getByAltText('Grad-CAM visualization');
    expect(gradcamImg).toHaveAttribute('src', '/uploads/gradcam/fake_gradcam.png');

    const limeImg = screen.getByAltText('LIME explanation overlay');
    expect(limeImg).toHaveAttribute('src', '/uploads/lime/fake_lime.png');

    expect(
      screen.queryByText('Grad-CAM visualization unavailable for this record.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('LIME explanation unavailable for this record.')
    ).not.toBeInTheDocument();

    expect(container).toMatchSnapshot();
  });

  it('shows placeholders when overlays are missing', async () => {
    const historyPayload = [
      {
        analysis: {
          id: '1',
          prediction_label: 'real',
          confidence_score: 0.85,
          gradcam_image_url: null,
          lime_image_url: null,
          created_at: new Date().toISOString(),
        },
        media_file: {
          storage_path: '/uploads/input.png',
        },
      },
    ];
    mockGetHistory.mockResolvedValueOnce(historyPayload);

    await renderResultPage();

    await waitFor(() => {
      expect(
        screen.getByText('Grad-CAM visualization unavailable for this record.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('LIME explanation unavailable for this record.')
      ).toBeInTheDocument();
    });

    expect(screen.queryByAltText('Grad-CAM visualization')).not.toBeInTheDocument();
    expect(screen.queryByAltText('LIME explanation overlay')).not.toBeInTheDocument();
  });
});

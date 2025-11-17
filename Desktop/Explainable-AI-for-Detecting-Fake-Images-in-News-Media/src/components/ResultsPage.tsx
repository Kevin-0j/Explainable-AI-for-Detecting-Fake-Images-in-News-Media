import { useEffect, useMemo, useState } from 'react';
import { Navigation } from './Navigation';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Scan,
  ShieldCheck,
} from 'lucide-react';
import type { DetectionResult, User } from '../App';
import { api } from '../services/api';
import type { AssistantAnalysis } from '../services/api';
import { toast } from 'sonner';
import { ExplanationCard } from './ExplanationCard/ExplanationCard';

interface ResultsPageProps {
  navigate: (page: string) => void;
  user: User | null;
  logout: () => void;
  result: DetectionResult;
}

export function ResultsPage({ navigate, user, logout, result }: ResultsPageProps) {
  const [analysis, setAnalysis] = useState<AssistantAnalysis | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [limeImage, setLimeImage] = useState<string | null>(null);
  const [limeError, setLimeError] = useState<string | null>(null);
  const [isLimeLoading, setIsLimeLoading] = useState(false);

  const handleAuthRedirect = (message: string) => {
    const normalized = message.toLowerCase();
    if (
      normalized.includes('token') ||
      normalized.includes('unauthorized') ||
      normalized.includes('authentication') ||
      normalized.includes('expired') ||
      normalized.includes('invalid')
    ) {
      api.clearToken();
      toast.error('Session expired. Please sign in again.');
      navigate('auth');
      return true;
    }
    return false;
  };

  const predictionDisplay = useMemo(() => {
    if (!result) {
      return {
        badge: null,
        tone: 'text-[#1F1F1F]',
        description: '',
      };
    }

    if (result.result === 'deepfake') {
      return {
        badge: <Badge className="bg-[#B42318] text-white px-4 py-1">FLAGGED</Badge>,
        tone: 'text-[#B42318]',
        description: 'Potential fabrication detected. Consider holding publication.',
      };
    }

    if (result.result === 'authentic') {
      return {
        badge: <Badge className="bg-[#4BA3A4] text-white px-4 py-1">CLEAR</Badge>,
        tone: 'text-[#1F1F1F]',
        description: 'No strong evidence of manipulation. Maintain standard editorial checks.',
      };
    }

    return {
      badge: <Badge variant="outline" className="px-4 py-1">REVIEW</Badge>,
      tone: 'text-[#8b6f00]',
      description: 'Model could not reach a confident decision. Re-run with additional references.',
    };
  }, [result]);

  useEffect(() => {
    if (!result?.id) return;

    setAnalysis(null);
    setAnalysisError(null);
    setLimeImage(null);
    setLimeError(null);

    const controller = new AbortController();

    const fetchExplanation = async () => {
      try {
        setIsExplanationLoading(true);
        const analysisPayload = await api.fetchExplanation({
          prediction: result.result,
          confidence: result.confidence / 100,
          file_name: result.fileName,
        });
        if (!controller.signal.aborted) {
          setAnalysis(analysisPayload);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to reach the Newsight assistant.';
        setAnalysisError(message);
        if (!handleAuthRedirect(message)) {
          toast.error(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsExplanationLoading(false);
        }
      }
    };

    const fetchLime = async () => {
      try {
        setIsLimeLoading(true);
        const limePayload = await api.fetchLimeVisualization(result.id);
        if (!controller.signal.aborted) {
          setLimeImage(limePayload);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Failed to fetch LIME overlay.';
        setLimeError(message);
        if (!handleAuthRedirect(message)) {
          toast.error(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLimeLoading(false);
        }
      }
    };

    fetchExplanation();
    fetchLime();

    return () => controller.abort();
  }, [result, navigate]);

  const confidenceLevel =
    result.confidence >= 90
      ? 'High confidence'
      : result.confidence >= 75
        ? 'Medium confidence'
        : 'Low confidence';

  return (
    <div className="flex h-screen bg-[#E5E5E5]">
      <Navigation navigate={navigate} currentPage="upload" user={user} logout={logout} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
            <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
              <Shield className="h-4 w-4" />
              {new Date(result.date).toLocaleString()}
            </div>
          </div>

          <Card className="border-none shadow-sm bg-[#FAFAFA]">
            <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1 space-y-2">
                <p className="text-sm uppercase tracking-[0.35em] text-[#4BA3A4]">Newsight</p>
                <h1 className="text-3xl font-semibold">{result.fileName}</h1>
                <p className="text-[#555555]">{predictionDisplay.description}</p>
              </div>
              <div className="flex flex-col items-start gap-3">
                {predictionDisplay.badge}
                <div className="text-2xl font-semibold">{result.confidence}% confidence</div>
                <div className="text-sm text-[#666666] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#4BA3A4]" />
                  {confidenceLevel}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-[#FAFAFA]">
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[#7a7a7a] uppercase tracking-widest">Model</p>
                <p className="text-xl font-semibold">ResNet18 · Newsight tuned</p>
                <p className="text-sm text-[#6b6b6b]">
                  Features Grad-CAM + LIME overlays for explainability.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-[#FAFAFA]">
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[#7a7a7a] uppercase tracking-widest">Processing time</p>
                <p className="text-xl font-semibold">{result.processingTime ?? 3} sec</p>
                <Progress value={Math.min(result.confidence, 100)} className="h-2" />
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-[#FAFAFA]">
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-[#7a7a7a] uppercase tracking-widest">Model attention</p>
                <div className="flex items-center gap-2 text-[#1F1F1F]">
                  <Scan className="h-5 w-5 text-[#4BA3A4]" />
                  <span>Grad-CAM and LIME ready</span>
                </div>
                <p className="text-sm text-[#6b6b6b]">
                  Gradients highlight suspicious lighting along the subject’s jawline.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-sm bg-[#FAFAFA]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#4BA3A4]" />
                  <h2 className="text-xl font-semibold">Grad-CAM overlay</h2>
                </div>
                {result.gradcamHeatmap ? (
                  <img
                    src={result.gradcamHeatmap}
                    alt="Grad-CAM visualization"
                    className="rounded-xl border border-[#e1e1e1]"
                  />
                ) : (
                  <div className="h-64 rounded-xl border border-dashed border-[#d1d1d1] flex items-center justify-center text-sm text-[#777777]">
                    Grad-CAM visualization unavailable.
                  </div>
                )}
              </CardContent>
            </Card>

            <ExplanationCard
              analysis={analysis}
              error={analysisError}
              loading={isExplanationLoading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-sm bg-[#FAFAFA]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#4BA3A4]" />
                  <h2 className="text-xl font-semibold">LIME superpixels</h2>
                </div>
                {isLimeLoading ? (
                  <p className="text-sm text-[#6b6b6b]">Generating segmentation...</p>
                ) : limeError ? (
                  <div className="flex items-center gap-2 text-sm text-[#B42318]">
                    <AlertTriangle className="h-4 w-4" />
                    {limeError}
                  </div>
                ) : limeImage ? (
                  <img
                    src={limeImage}
                    alt="LIME visualization"
                    className="rounded-xl border border-[#e1e1e1]"
                  />
                ) : (
                  <div className="h-64 rounded-xl border border-dashed border-[#d1d1d1] flex items-center justify-center text-sm text-[#777777]">
                    LIME visualization unavailable.
                  </div>
                )}
              </CardContent>
            </Card>
            {result.videoAnalysis ? (
              <Card className="border-none shadow-sm bg-[#FAFAFA]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-[#4BA3A4]" />
                    <h2 className="text-xl font-semibold">Video breakdown</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-semibold">{result.videoAnalysis.total_frames}</p>
                      <p className="text-sm text-[#6b6b6b]">Total frames</p>
                    </div>
                    <div>
                      <p className="text-3xl font-semibold text-[#B42318]">
                        {result.videoAnalysis.fake_frames}
                      </p>
                      <p className="text-sm text-[#6b6b6b]">Flagged frames</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#555555]">
                    {Math.round(result.videoAnalysis.fake_ratio * 100)}% of frames show anomalies.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-sm bg-[#FAFAFA]">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#4BA3A4]" />
                    <h2 className="text-xl font-semibold">Editorial checklist</h2>
                  </div>
                  <ul className="space-y-2 text-sm text-[#595959]">
                    <li>• Request raw or original capture metadata.</li>
                    <li>• Cross-reference with trusted broadcasters or archives.</li>
                    <li>• Log this verification inside your CMS notes.</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

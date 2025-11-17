import { useParams, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { reportsApi } from '@/api/reports';
import { CheckCircle2, XCircle, HelpCircle, Download, ArrowLeft, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { predictionApi, type PredictionResponse } from '@/api/api';
import { useMemo } from 'react';
import { buildMediaUrl } from '@/lib/media';
import { useAuthStore } from '@/store/auth';

const Result = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const statePrediction = (location.state as { prediction?: PredictionResponse } | null)?.prediction;
  const accessToken = useAuthStore((state) => state.accessToken);

  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: () => predictionApi.getHistory(),
    enabled: !statePrediction && Boolean(accessToken),
    retry: false,
  });

  const prediction = useMemo(() => {
    if (statePrediction) return statePrediction;
    if (!historyQuery.data || !id) return undefined;
    return historyQuery.data.find((entry) => {
      const analysisId = entry.analysis?.id || entry.analysis?.analysis_id;
      return analysisId === id;
    });
  }, [statePrediction, historyQuery.data, id]);

  const downloadReport = useMutation({
    mutationFn: (verificationId: string) => reportsApi.downloadReport(verificationId),
    onSuccess: () => {
      toast.success('Report downloaded successfully');
    },
    onError: () => {
      toast.error('Failed to download report');
    },
  });

  const handleDownloadPDF = () => {
    if (!id) return;
    downloadReport.mutate(id);
  };

  if (!statePrediction && historyQuery.isError) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container py-8">
          <Card>
            <CardContent className="py-12 flex flex-col gap-4 items-center">
              <p className="text-muted-foreground text-center">
                We couldn&apos;t load this analysis. Please return to the dashboard and try again.
              </p>
              <Link to="/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container py-8">
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  const analysis = prediction.analysis;
  const metadata = (analysis?.analysis_metadata as Record<string, unknown>) || {};
  const imageUrl = buildMediaUrl(
    prediction.media_file?.cdn_url ||
      prediction.media_file?.public_url ||
      prediction.media_file?.url ||
      (metadata.input_image_url as string | undefined) ||
      (metadata.image_url as string | undefined) ||
      prediction.media_file?.storage_path ||
      ''
  );
  const confidence = analysis?.confidence_score ?? 0;
  const gradcamHeatmap = buildMediaUrl(
    prediction.gradcam_heatmap || prediction.heatmap_overlay || ''
  );

  const getPredictionDisplay = () => {
    switch (analysis?.prediction_label) {
      case 'real':
        return {
          icon: <CheckCircle2 className="h-8 w-8" />,
          badge: <Badge className="bg-success text-success-foreground text-lg px-4 py-1">REAL</Badge>,
          color: 'text-success',
          explanation: 'This image appears to be authentic based on our AI analysis.',
        };
      case 'fake':
        return {
          icon: <XCircle className="h-8 w-8" />,
          badge: <Badge className="bg-destructive text-destructive-foreground text-lg px-4 py-1">FAKE</Badge>,
          color: 'text-destructive',
          explanation: 'This image shows signs of manipulation or tampering.',
        };
      default:
        return {
          icon: <HelpCircle className="h-8 w-8" />,
          badge: <Badge className="bg-warning text-warning-foreground text-lg px-4 py-1">UNKNOWN</Badge>,
          color: 'text-warning',
          explanation: 'The analysis was inconclusive. Additional verification may be needed.',
        };
    }
  };

  const display = getPredictionDisplay();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8 max-w-6xl">
        <Link to="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Summary Card */}
        <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={display.color}>{display.icon}</div>
                <div>
                  <CardTitle className="text-3xl mb-2">Verification Results</CardTitle>
                  {display.badge}
                </div>
              </div>
              <Button onClick={handleDownloadPDF} disabled={downloadReport.isPending}>
                <Download className="mr-2 h-4 w-4" />
                {downloadReport.isPending ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Analysis Summary</h3>
                <p className="text-muted-foreground mb-4">{display.explanation}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-semibold">{Math.round(confidence * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model Version:</span>
                    <span className="font-semibold">{analysis?.model_version ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Image Metadata</h3>
                <div className="space-y-2 text-sm">
                  {Object.keys(metadata).length > 0 ? (
                    Object.entries(metadata).map(([entryKey, value]) => (
                      <div key={entryKey} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {entryKey.replaceAll('_', ' ')}:
                        </span>
                        <span>{String(value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filename:</span>
                      <span>{prediction.media_file?.original_filename || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Viewer with Tabs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Visual Analysis</CardTitle>
            <CardDescription>
              Explore different visualization techniques to understand what the AI detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="original" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="original">Original</TabsTrigger>
                <TabsTrigger value="gradcam">Grad-CAM</TabsTrigger>
                <TabsTrigger value="lime">LIME (Coming soon)</TabsTrigger>
              </TabsList>
              <TabsContent value="original" className="mt-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="w-full rounded-lg max-h-[480px] object-contain bg-black/5"
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    Original image unavailable.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="gradcam" className="mt-4">
                {gradcamHeatmap ? (
                  <div className="space-y-4">
                    <img
                      src={gradcamHeatmap}
                      alt="Grad-CAM overlay"
                      className="w-full rounded-lg max-h-[480px] object-contain bg-black/5"
                    />
                    <p className="text-sm text-muted-foreground">
                      Red areas highlight regions the model found unusual or suspicious.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Grad-CAM visualization unavailable.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="lime" className="mt-4">
                <div className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">LIME explanations are coming soon.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Credibility Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Credibility Checklist</CardTitle>
            <CardDescription>
              Key factors analyzed by our AI system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 ${
                    analysis?.prediction_label === 'real' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {analysis?.prediction_label === 'real' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Lighting Consistency</h4>
                  <p className="text-sm text-muted-foreground">
                    Analyzed for consistent light sources and shadows
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 ${
                    analysis?.prediction_label === 'real' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {analysis?.prediction_label === 'real' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Compression Artifacts</h4>
                  <p className="text-sm text-muted-foreground">
                    Checked for unusual compression patterns
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 ${
                    analysis?.prediction_label === 'real' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {analysis?.prediction_label === 'real' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Texture Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Examined texture consistency across the image
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 ${
                    analysis?.prediction_label === 'real' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {analysis?.prediction_label === 'real' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Background Irregularities</h4>
                  <p className="text-sm text-muted-foreground">
                    Detected anomalies in background elements
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Result;

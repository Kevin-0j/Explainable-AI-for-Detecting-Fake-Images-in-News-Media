import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { useVerification } from '@/hooks/useVerification';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Processing = () => {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const jobId = params.id?.trim() || null;
  const { status } = useVerification({ jobId });

  useEffect(() => {
    if (!jobId) {
      navigate('/verify');
    }
  }, [jobId, navigate]);

  useEffect(() => {
    if (!status || !jobId) return;

    if (status.status === 'completed') {
      const resultId = status.verification_id || jobId;
      navigate(`/verify/result/${resultId}`);
    } else if (status.status === 'failed') {
      toast.error(status.detail || 'Verification failed. Please try again.');
      navigate('/dashboard');
    }
  }, [status, jobId, navigate]);

  const getProgressValue = () => {
    switch (status?.status) {
      case 'pending':
        return 25;
      case 'processing':
        return 60;
      default:
        return 0;
    }
  };

  const getStatusMessage = () => {
    switch (status?.status) {
      case 'pending':
        return 'Preparing your image...';
      case 'processing':
        return 'Running authenticity checks...';
      default:
        return 'Starting verification...';
    }
  };

  if (!jobId) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Analyzing Your Image</h2>
              <p className="text-muted-foreground">{getStatusMessage()}</p>
            </div>
            <div className="w-full max-w-md space-y-2">
              <Progress value={getProgressValue()} className="h-2" />
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>✓ Checking image consistency</p>
                {status?.status && status.status !== 'pending' && (
                  <>
                    <p>✓ Running authenticity checks</p>
                    <p className="animate-pulse">⏳ Generating visual explanations...</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Processing;

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeGoogleOAuth, exchangeAuthToken } = useAuth();
  const [message, setMessage] = useState('Finishing secure sign-in with Google...');

  const clearOAuthArtifacts = useCallback(() => {
    if (typeof window === 'undefined') return;
    const newUrl = window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, []);

  useEffect(() => {
    const finalizeOAuth = async () => {
      if (typeof window === 'undefined') return;

      const rawHash = window.location.hash?.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash || '';
      const hashParams = new URLSearchParams(rawHash);
      const fragmentError = hashParams.get('error') || hashParams.get('error_description');
      const queryError = searchParams.get('error') || searchParams.get('error_description');
      const errorMessage = fragmentError || queryError;

      if (errorMessage) {
        toast.error(
          errorMessage === 'access_denied' ? 'Google sign-in was canceled.' : errorMessage
        );
        navigate('/login');
        return;
      }

      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        setMessage('Securing your NewsSight session...');
        exchangeAuthToken(
          { accessToken },
          {
            onSuccess: () => {
              clearOAuthArtifacts();
              navigate('/dashboard');
            },
            onError: () => {
              toast.error('Unable to finalize Google sign-in. Please try again.');
              navigate('/login');
            },
          }
        );
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      if (!code) {
        toast.error('Missing Google authorization details. Please try again.');
        navigate('/login');
        return;
      }

      setMessage('Verifying Google authorization...');
      completeGoogleOAuth(
        { code, state },
        {
          onSuccess: () => {
            clearOAuthArtifacts();
            navigate('/dashboard');
          },
          onError: () => {
            toast.error('Google sign-in failed. Please try again.');
            navigate('/login');
          },
        }
      );
    };

    finalizeOAuth();
  }, [clearOAuthArtifacts, completeGoogleOAuth, exchangeAuthToken, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connecting your account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-center text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;

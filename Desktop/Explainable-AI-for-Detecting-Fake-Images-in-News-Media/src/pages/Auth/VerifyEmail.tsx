import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/auth';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (token) {
      authApi
        .verifyEmail(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'));
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {!token ? (
            <>
              <CardDescription>
                Please check your email for a verification link.
              </CardDescription>
              <p className="text-sm text-muted-foreground">
                Didn't receive an email? Check your spam folder.
              </p>
            </>
          ) : status === 'loading' ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <CardDescription>Verifying your email...</CardDescription>
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <CardDescription>Email verified successfully!</CardDescription>
              <Link to="/login">
                <Button className="w-full">Continue to Login</Button>
              </Link>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <CardDescription>
                Verification failed. The link may be invalid or expired.
              </CardDescription>
              <Link to="/register">
                <Button variant="outline" className="w-full">
                  Register Again
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/api/auth';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

const resolveForgotPasswordError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Failed to send reset link. Please try again.';
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const requestReset = useMutation({
    mutationFn: authApi.requestPasswordReset,
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Password reset link sent to your email');
    },
    onError: (error: unknown) => {
      toast.error(resolveForgotPasswordError(error));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    requestReset.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {submitted
              ? 'Check your email for a password reset link'
              : 'Enter your email to receive a password reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
              <Button type="submit" className="w-full" disabled={requestReset.isPending}>
                {requestReset.isPending ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                If an account exists with {email}, you will receive a password reset link shortly.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
          {!submitted && (
            <div className="mt-4 text-center text-sm">
              <Link to="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

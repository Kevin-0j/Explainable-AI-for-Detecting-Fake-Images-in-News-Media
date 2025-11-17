import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, startGoogleOAuth, isLoading, isGoogleLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredEmail =
    (location.state as { registeredEmail?: string } | null)?.registeredEmail;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (registeredEmail) {
      setEmail(registeredEmail);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [registeredEmail, navigate, location.pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password, remember_me: rememberMe });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Login to verify images with NewsSight</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                Remember this device
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <Separator className="my-6" />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => startGoogleOAuth({ rememberMe })}
            disabled={isGoogleLoading}
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
          </Button>
          <div className="mt-6 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 533.5 544.3"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="#4285f4"
      d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.4H272.1v95.4h146.9c-6.3 34.1-25 62.9-53.4 82.2v68h86.4c50.5-46.5 81.5-115.1 81.5-195.2z"
    />
    <path
      fill="#34a853"
      d="M272.1 544.3c71.9 0 132.3-23.9 176.4-65.2l-86.4-68c-24 16.1-54.7 25.7-90 25.7-69.3 0-128.1-46.8-149.1-109.6H34.5v68.9c43.8 86.8 134 148.2 237.6 148.2z"
    />
    <path
      fill="#fbbc04"
      d="M122.9 327.2c-10.6-31.9-10.6-66.4 0-98.3V160H34.5c-32.4 64.4-32.4 140.1 0 204.5l88.4-37.3z"
    />
    <path
      fill="#ea4335"
      d="M272.1 107.7c37.6-.6 73.5 13.8 100.9 40.2l75.3-75.3C411.3 24 350.9 0 272.1 0 168.5 0 78.3 61.4 34.5 148.2l88.4 68.9C143.9 154.5 202.8 107.7 272.1 107.7z"
    />
  </svg>
);

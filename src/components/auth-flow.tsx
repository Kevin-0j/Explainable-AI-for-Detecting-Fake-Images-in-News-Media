// src/components/auth-flow.tsx
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { Eye, EyeOff, Mail, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getSupabase } from "../utils/supabase/client";
import { signUp, signIn, requestPasswordReset } from "../utils/api";
import { toast } from "sonner@2.0.3";

type AuthStep = "login" | "signup" | "forgot-password" | "email-verification";

interface AuthFlowProps {
  onAuthSuccess: () => void;
  onBack: () => void;
}

export function AuthFlow({ onAuthSuccess, onBack }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    organization: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuth();

  // Password strength logic
  const calculatePasswordStrength = (pw: string): number => {
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 25;
    if (/\d/.test(pw)) score += 25;
    if(/[^a-zA-Z0-9]/.test(pw)) score += 25;
    return score;
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
    setPasswordStrength(calculatePasswordStrength(value));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (step === "login") {
        const result = await signIn(formData.email, formData.password);
        if (result.success && result.accessToken && result.user) {
          const user = {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.first_name ?? "User",
            lastName: result.user.last_name ?? "",
            organization: result.user.organization ?? "",
            role: (result.user.role as "user" | "admin") ?? "user",
            createdAt: result.user.createdAt ?? new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };

          setAuth(user, result.accessToken);
          toast.success("Welcome back to NewsSight!");
          onAuthSuccess();
        } else {
          throw new Error("Invalid response from server");
        }
      }

      else if (step === "signup") {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        if (passwordStrength < 50) {
          setError("Please use a stronger password");
          return;
        }

        const result = await signUp({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          organization: formData.organization,
        });

        if (result.success) {
          toast.success("Account created! Please sign in.");
          setStep("login");
          setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
        }
      }

      else if (step === "forgot-password") {
        const result = await requestPasswordReset(formData.email);
        if (result.success) {
          setVerificationSent(true);
          toast.success("Password reset instructions sent!");
        }
      }

      else if (step === "email-verification") {
        toast.info("Email verified! Please sign in.");
        setStep("login");
      }
    } catch (err: any) {
      const message = err.message || "An error occurred. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message.includes("provider")
        ? "Google OAuth not configured. See: https://supabase.com/docs/guides/auth/social-login/auth-google"
        : err.message;
      toast.error(msg, { duration: 10000 });
      setError("Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength UI
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return "bg-destructive";
    if (passwordStrength < 50) return "bg-orange-500";
    if (passwordStrength < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return "Weak";
    if (passwordStrength < 50) return "Fair";
    if (passwordStrength < 75) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Button>
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold text-foreground">NewsSight</span>
          </div>
        </div>

        {/* LOGIN */}
        {step === "login" && (
          <Card className="bg-card border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-foreground">Welcome back</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Sign in to your NewsSight account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
                <h4 className="font-medium text-foreground mb-2">Demo Credentials</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Journalist:</p>
                    <p className="text-foreground font-mono">demo@newssight.com</p>
                    <p className="text-foreground font-mono">demo123</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Admin:</p>
                    <p className="text-foreground font-mono">admin@newssight.com</p>
                    <p className="text-foreground font-mono">admin123</p>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    required
                    className="bg-input-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      required
                      className="bg-input-background border-border text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={formData.rememberMe}
                      onCheckedChange={c => setFormData(p => ({ ...p, rememberMe: c as boolean }))}
                    />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground">
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setStep("forgot-password")}
                    className="text-primary hover:text-primary/80 p-0"
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-border hover:bg-accent/10"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign in with Google
                  </Button>
                  <div className="mt-2 text-xs text-center text-muted-foreground">
                    Requires <a href="https://supabase.com/docs/guides/auth/social-login/auth-google" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google OAuth setup</a> in Supabase
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button type="button" variant="link" onClick={() => setStep("signup")} className="text-primary hover:text-primary/80 p-0">
                    Sign up
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* SIGNUP */}
        {step === "signup" && (
          <Card className="bg-card border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-foreground">Create your account</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Join NewsSight to start verifying images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                      required
                      className="bg-input-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                      required
                      className="bg-input-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-foreground">Organization</Label>
                  <Input
                    id="organization"
                    placeholder="Your news organization"
                    value={formData.organization}
                    onChange={e => setFormData(p => ({ ...p, organization: e.target.value }))}
                    className="bg-input-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail" className="text-foreground">Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    required
                    className="bg-input-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="signupPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={e => handlePasswordChange(e.target.value)}
                      required
                      className="bg-input-background border-border text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Password strength</span>
                        <span>{getPasswordStrengthText()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                      required
                      className="bg-input-background border-border text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading || formData.password !== formData.confirmPassword}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button type="button" variant="link" onClick={() => setStep("login")} className="text-primary hover:text-primary/80 p-0">
                    Sign in
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* FORGOT PASSWORD */}
        {step === "forgot-password" && (
          <Card className="bg-card border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-foreground">Reset your password</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Enter your email address and we'll send you a reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!verificationSent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-foreground">Email</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      required
                      className="bg-input-background border-border text-foreground"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <div className="text-center">
                    <Button type="button" variant="link" onClick={() => setStep("login")} className="text-primary hover:text-primary/80">
                      Back to sign in
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                    <p className="text-muted-foreground">
                      We've sent a password reset link to {formData.email}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setStep("login")} className="border-border text-foreground">
                    Back to sign in
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* EMAIL VERIFICATION */}
        {step === "email-verification" && (
          <Card className="bg-card border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-foreground">Verify your email</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                We've sent a verification link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-primary" />
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    We've sent a verification email to <span className="text-foreground font-medium">{formData.email}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to verify your account and start using NewsSight.
                  </p>
                </div>

                <Alert className="border-border bg-muted/50">
                  <AlertDescription className="text-muted-foreground">
                    Didn't receive the email? Check your spam folder or try signing up again.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Button onClick={onAuthSuccess} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    I've verified my email
                  </Button>
                  <Button variant="outline" onClick={() => setStep("signup")} className="w-full border-border text-foreground">
                    Try again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
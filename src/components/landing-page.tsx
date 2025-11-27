import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Shield, Eye, FileText, Users, Upload, Zap } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function LandingPage({ onGetStarted, onViewDemo }: { onGetStarted: () => void; onViewDemo: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold text-foreground">NewsSight</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-foreground" onClick={onGetStarted}>Login</Button>
            <Button onClick={onGetStarted} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Verify a news image in seconds — with transparent, human-readable explanations
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Advanced AI-powered fake image detection designed specifically for journalists and fact-checkers. 
                  Get instant results with visual explanations you can understand and trust.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={onGetStarted}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-3"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload image or paste URL
                </Button>
                <Button variant="outline" className="text-lg px-8 py-3 border-border text-foreground" onClick={onViewDemo}>
                  <Eye className="mr-2 h-5 w-5" />
                  View Demo
                </Button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Analysis in ~20 seconds</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Transparent AI explanations</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1741835698663-c1860b7d1f53?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXdzJTIwam91cm5hbGlzbSUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzU3OTQxNzA4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Newsroom technology and journalism"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-card border border-border rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-foreground font-medium">Real-time verification</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Built for newsrooms
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive tools designed specifically for journalists, editors, and fact-checkers who need reliable, explainable AI verification.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Visual Explanations</h3>
                <p className="text-muted-foreground">
                  Get Grad-CAM heatmaps and LIME superpixel masks that show exactly which parts of the image influenced the AI's decision.
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Evidence Reports</h3>
                <p className="text-muted-foreground">
                  Generate professional PDF reports with original images, explanations, confidence scores, and timestamps for your articles.
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Team Collaboration</h3>
                <p className="text-muted-foreground">
                  Complete audit trails, user management, and team dashboards to support newsroom workflows and editorial oversight.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Start verifying images today
          </h2>
          <p className="text-xl text-muted-foreground">
            Join newsrooms worldwide using AI-powered verification to maintain editorial integrity.
          </p>
          <Button 
            onClick={onGetStarted}
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-12 py-4"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">NewsSight</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
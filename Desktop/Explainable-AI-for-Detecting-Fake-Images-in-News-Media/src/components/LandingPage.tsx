console.log("### USING NEW COMPONENT LANDINGPAGE ###");
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Shield,
  Upload,
  Lock,
  MessageSquare,
  Camera,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  navigate: (page: string) => void;
  isAuthenticated: boolean;
  errorMessage?: string | null;
}

export function LandingPage({ navigate, isAuthenticated, errorMessage }: LandingPageProps) {
  const workflow = [
    {
      icon: Upload,
      title: '1. Submit Media',
      description: 'Upload a file or paste a URL. Newsight supports high-res imagery and news clips.',
    },
    {
      icon: Sparkles,
      title: '2. Explainable AI',
      description: 'Grad-CAM, LIME, and transformer signals highlight suspicious edits and artifacts.',
    },
    {
      icon: MessageSquare,
      title: '3. Editorial Briefing',
      description: 'Receive a journalist-ready summary with traceable context and suggested next steps.',
    },
  ];

  const handlePrimaryCta = () => {
    if (isAuthenticated) {
      navigate('upload');
      return;
    }
    navigate('auth');
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] text-[#1F1F1F] flex flex-col">
      <header className="border-b border-[#d6d6d6] bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F1F1F] text-[#FAFAFA]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#4BA3A4]">Newsight</p>
              <h1 className="text-2xl font-semibold tracking-tight">Explainable AI Lab</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {errorMessage ? (
              <span className="text-sm text-red-600 mr-3">{errorMessage}</span>
            ) : null}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="text-[#1F1F1F]"
                onClick={() => navigate('dashboard')}
              >
                Open Workspace
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => navigate('auth')}>
                Sign In
              </Button>
            )}
            <Button
              className="bg-[#1F1F1F] text-[#FAFAFA] hover:bg-[#1F1F1F]/90"
              onClick={handlePrimaryCta}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-sm uppercase tracking-[0.5em] text-[#4BA3A4]">
                Trusted by investigative desks
              </p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Verify Images with Confidence — Powered by Explainable AI
              </h1>
              <p className="text-lg text-[#3f3f3f]">
                Newsight helps journalists analyze visuals using Grad-CAM, LIME, and contextual AI
                insights. Every prediction includes a transparent narrative so you can defend your
                sourcing decisions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate(isAuthenticated ? 'dashboard' : 'auth')}
                  className="bg-[#4BA3A4] text-white hover:bg-[#469597]"
                >
                  Try Demo
                </Button>
                <Button
                  variant="outline"
                  className="border-[#1F1F1F] text-[#1F1F1F]"
                  onClick={handlePrimaryCta}
                >
                  Upload Image
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6">
              <Card className="bg-[#FAFAFA] border-none shadow-xl">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-[#4BA3A4]" />
                    <p className="text-sm uppercase tracking-widest text-[#4BA3A4]">
                      Animated Fake Demo
                    </p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative rounded-2xl bg-gradient-to-br from-[#1F1F1F] to-[#2f2f2f] p-6 text-white overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_#4BA3A4_10%,_transparent_11%)] bg-[size:20px_20px]" />
                    <div className="relative space-y-4">
                      <p className="text-sm text-white/70">Live overlay preview</p>
                      <div className="space-y-3">
                        {[1, 2, 3].map((bar) => (
                          <motion.div
                            key={bar}
                            className="h-3 rounded-full bg-white/10"
                            animate={{ width: ['40%', '100%', '60%'] }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              delay: bar * 0.2,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-start gap-4 pt-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <Sparkles className="h-6 w-6 text-[#4BA3A4]" />
                        </div>
                        <div>
                          <p className="font-semibold">Potential fabrication flagged</p>
                          <p className="text-sm text-white/70">
                            Heat signatures and temporal cues indicate tampering in the subject’s
                            left profile. Suggested action: request the original RAW capture.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-bold">92%</p>
                      <p className="text-sm text-[#6b6b6b]">Confidence in classification</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-[#4BA3A4]">8s</p>
                      <p className="text-sm text-[#6b6b6b]">Avg. analysis time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#FAFAFA]">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
            <h2 className="text-3xl font-semibold">How Newsight Works</h2>
            <p className="text-lg text-[#4a4a4a] max-w-3xl mx-auto">
              Every scan blends forensic models with narrative guidance so you can brief editors
              fast.
            </p>
          </div>
          <div className="max-w-6xl mx-auto px-4 mt-12 grid gap-6 md:grid-cols-3">
            {workflow.map((item) => (
              <Card key={item.title} className="border border-[#e1e1e1] shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#4BA3A4]/15 text-[#1F1F1F] flex items-center justify-center">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-sm text-[#595959] leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#1F1F1F] text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.4em] text-[#4BA3A4]">Newsight</p>
            <p className="text-sm text-white/70">
              Explainable verification for journalists, fact-checkers, and investigative teams.
            </p>
          </div>
          <div>
            <p className="text-sm text-white/60">Contact</p>
            <p className="text-sm">press@newsight.ai</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('admin-auth')}
              className="border-white/30 text-white"
            >
              Admin Console
            </Button>
            <p className="text-xs text-white/50">Encrypted transit · Audit logging enabled</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-sm text-white/60">
          © 2025 Newsight. Built for resilient storytelling.
        </div>
      </footer>
    </div>
  );
}



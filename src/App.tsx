import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LandingPage } from "./components/landing-page";
import { AuthFlow } from "./components/auth-flow";
import { Dashboard } from "./components/dashboard";
import { UploadFlow } from "./components/upload-flow";
import { AdminPanel } from "./components/admin-panel";
import { DemoFlow } from "./components/demo-flow";
import { Toaster } from "./components/ui/sonner";
import { VerificationProvider } from "./contexts/VerificationContext";

type AppScreen = "landing" | "auth" | "dashboard" | "upload" | "admin" | "demo";

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("landing");
  const { isAuthenticated, clearAuth, isLoading, user } = useAuth();
  const [forceShowApp, setForceShowApp] = useState(false);

  const handleAuthSuccess = () => {
    setCurrentScreen("dashboard");
  };

  const handleLogout = async () => {
    await clearAuth();
    setCurrentScreen("landing");
  };

  // Auto-redirect to dashboard if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && currentScreen === "landing") {
      setCurrentScreen("dashboard");
    }
  }, [isAuthenticated, currentScreen]);

  // Force show app after 8 seconds if still loading
  React.useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('Auth check taking too long, forcing app to show');
        setForceShowApp(true);
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Show loading state while checking session (with timeout)
  if (isLoading && !forceShowApp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading NewsSight...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "landing":
        return (
          <LandingPage 
            onGetStarted={() => setCurrentScreen("auth")}
            onViewDemo={() => setCurrentScreen("demo")}
          />
        );
      
      case "auth":
        return (
          <AuthFlow 
            onAuthSuccess={handleAuthSuccess}
            onBack={() => setCurrentScreen("landing")}
          />
        );
      
      case "dashboard":
        return (
          <Dashboard 
            onUpload={() => setCurrentScreen("upload")}
            onLogout={handleLogout}
          />
        );
      
      case "upload":
        return (
          <UploadFlow 
            onBack={() => setCurrentScreen("dashboard")}
          />
        );
      
      case "admin":
        return (
          <AdminPanel 
            onBack={() => setCurrentScreen("dashboard")}
          />
        );
      
      case "demo":
        return (
          <DemoFlow 
            onBack={() => setCurrentScreen("landing")}
          />
        );
      
      default:
        return (
          <LandingPage 
            onGetStarted={() => setCurrentScreen("auth")}
            onViewDemo={() => setCurrentScreen("demo")}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {renderScreen()}
      <Toaster position="top-right" />
      
      {/* Quick admin access for demo (remove in production) */}
      {isAuthenticated && currentScreen === "dashboard" && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setCurrentScreen("admin")}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg shadow-lg hover:bg-accent/90 transition-colors text-sm"
          >
            Admin Panel
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <AppContent />
      </VerificationProvider>
    </AuthProvider>
  );
}

// src/pages/Dashboard.tsx
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { UploadFlow } from "../components/upload-flow";
import { AdminDashboard } from "../components/admin-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Shield } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-foreground">Loading Dashboard...</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Please wait</CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="bg-card border-border w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-foreground">Not authenticated</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Please sign in to continue.</CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <AdminDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <UploadFlow />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Upload, 
  History, 
  Settings, 
  LogOut, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Download,
  MoreHorizontal,
  Link as LinkIcon,
  User
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { getVerifications } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface DashboardProps {
  onUpload: () => void;
  onLogout: () => void;
}

export function Dashboard({ onUpload, onLogout }: DashboardProps) {
  const { user, accessToken } = useAuth();
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    avgConfidence: 0,
    fakeDetected: 0,
  });

  // Fetch verifications on mount
  useEffect(() => {
    if (accessToken) {
      fetchVerifications();
    }
  }, [accessToken]);

  const fetchVerifications = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await getVerifications(accessToken);
      
      if (response.success && response.verifications) {
        const verifications = response.verifications;
        setRecentUploads(verifications);
        
        // Calculate stats
        const completed = verifications.filter((v: any) => v.status === 'completed');
        const totalConfidence = completed.reduce((sum: number, v: any) => sum + (v.confidence || 0), 0);
        const avgConf = completed.length > 0 ? Math.round(totalConfidence / completed.length) : 0;
        const fakes = completed.filter((v: any) => v.result === 'fake').length;
        
        setStats({
          total: verifications.length,
          avgConfidence: avgConf,
          fakeDetected: fakes,
        });
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Failed to load verifications');
    } finally {
      setIsLoadingVerifications(false);
    }
  }, [accessToken]);

  // Set up polling for processing verifications
  useEffect(() => {
    if (!recentUploads.some(v => v.status === 'processing')) {
      return;
    }

    const interval = setInterval(() => {
      fetchVerifications();
    }, 5000);

    return () => clearInterval(interval);
  }, [recentUploads, fetchVerifications]);

  const getResultBadge = (verification: any) => {
    if (verification.status === "processing") {
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Processing</Badge>;
    }
    if (verification.result === "real") {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">Real ({verification.confidence}%)</Badge>;
    }
    return <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">Fake ({verification.confidence}%)</Badge>;
  };

  const getConfidenceText = (verification: any) => {
    if (!verification.confidence) return "Processing...";
    
    const confidence = verification.confidence;
    if (confidence >= 90) return "High confidence";
    if (confidence >= 70) return "Medium confidence";
    return "Low confidence - recommend manual verification";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

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
            <Button onClick={onUpload} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Upload className="mr-2 h-4 w-4" />
              New Upload
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem className="text-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-foreground">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="text-muted-foreground">Verify images and maintain editorial integrity with AI-powered detection.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total verifications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgConfidence}%</p>
                  <p className="text-sm text-muted-foreground">Avg. confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">18s</p>
                  <p className="text-sm text-muted-foreground">Avg. processing time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.fakeDetected}</p>
                  <p className="text-sm text-muted-foreground">Fake detected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="recent" className="data-[state=active]:bg-background">Recent Activity</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background">History</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-6">
            {/* Quick Upload Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Quick Upload</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Upload an image or provide a URL for instant verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={onUpload} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload image or paste URL
                  </Button>
                  <Button variant="outline" className="border-border text-foreground">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Paste image URL
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Uploads</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your latest image verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVerifications ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground">Loading verifications...</p>
                  </div>
                ) : recentUploads.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No verifications yet. Upload your first image to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentUploads.slice(0, 5).map((upload) => (
                      <div key={upload.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{upload.filename}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatTimestamp(upload.createdAt)} • {getConfidenceText(upload)}
                            </p>
                          </div>
                        </div>
                        
                          <div className="flex items-center space-x-3">
                            {getResultBadge(upload)}
                          
                            {upload.status === "completed" && (
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem className="text-foreground">View details</DropdownMenuItem>
                                <DropdownMenuItem className="text-foreground">Download report</DropdownMenuItem>
                                <DropdownMenuItem className="text-foreground">Re-analyze</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                
                <div className="mt-6 text-center">
                  <Button variant="outline" className="border-border text-foreground">
                    <History className="mr-2 h-4 w-4" />
                    View all history
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Upload History</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Complete audit trail of all your image verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Full history view</h3>
                  <p className="text-muted-foreground mb-4">
                    Sortable and filterable table with all verification results
                  </p>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    View full history
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
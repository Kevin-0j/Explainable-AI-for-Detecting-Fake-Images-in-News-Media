import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Shield, 
  ArrowLeft, 
  Upload, 
  Database, 
  Settings, 
  Users, 
  Key,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  BarChart3
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useAuth } from "../contexts/AuthContext";
import { getAllUsers, getAdminStats, getAllVerifications, getDatasets, addDataset, updateUserRole } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const { accessToken, user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = useCallback(async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);

      const [statsRes, usersRes, verificationsRes, datasetsRes] = await Promise.all([
        getAdminStats(accessToken),
        getAllUsers(accessToken),
        getAllVerifications(accessToken),
        getDatasets(accessToken),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (usersRes.success) setUsers(usersRes.users);
      if (verificationsRes.success) setVerifications(verificationsRes.verifications);
      if (datasetsRes.success) setDatasets(datasetsRes.datasets);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied: Admin privileges required');
      onBack();
    }
  }, [user, onBack]);

  // Fetch admin data
  useEffect(() => {
    if (!accessToken || !user || user.role !== 'admin') return;

    fetchAdminData();
  }, [accessToken, user, fetchAdminData]);

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin') => {
    if (!accessToken) return;

    try {
      const response = await updateUserRole(userId, newRole, accessToken);
      if (response.success) {
        toast.success(`User role updated to ${newRole}`);
        fetchAdminData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  // Mock data for models (not yet in backend)
  const [models] = useState([
    {
      id: "model_v2.1.3",
      name: "FakeDetector v2.1.3",
      version: "2.1.3",
      status: "active",
      accuracy: 94.2,
      auc: 0.97,
      uploadDate: "2024-01-10",
      size: "245 MB",
      description: "Latest production model with improved edge detection"
    },
    {
      id: "model_v2.1.2", 
      name: "FakeDetector v2.1.2",
      version: "2.1.2",
      status: "backup",
      accuracy: 92.8,
      auc: 0.95,
      uploadDate: "2023-12-15",
      size: "238 MB",
      description: "Previous stable version"
    },
    {
      id: "model_v2.2.0-beta",
      name: "FakeDetector v2.2.0-beta",
      version: "2.2.0-beta",
      status: "testing",
      accuracy: 95.1,
      auc: 0.98,
      uploadDate: "2024-01-12",
      size: "267 MB",
      description: "Beta model with enhanced transformer layers"
    }
  ]);

  const [apiKeys] = useState([
    {
      id: "key_prod_001",
      name: "Production API Key",
      prefix: "ns_live_",
      lastUsed: "2024-01-15 14:22:33",
      requests: 1240,
      status: "active"
    },
    {
      id: "key_test_001",
      name: "Testing API Key",
      prefix: "ns_test_",
      lastUsed: "2024-01-14 09:15:22", 
      requests: 89,
      status: "active"
    }
  ]);

  const [auditLog] = useState([
    {
      id: "audit_001",
      action: "Model uploaded",
      user: "admin@newssight.com",
      target: "FakeDetector v2.2.0-beta",
      timestamp: "2024-01-12 16:30:45",
      status: "success"
    },
    {
      id: "audit_002",
      action: "Dataset validated",
      user: "admin@newssight.com", 
      target: "January 2024 Training Set",
      timestamp: "2024-01-08 11:22:15",
      status: "success"
    },
    {
      id: "audit_003",
      action: "API key created",
      user: "admin@newssight.com",
      target: "Production API Key",
      timestamp: "2024-01-05 14:18:30",
      status: "success"
    }
  ]);

  const handleModelUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 5) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsUploading(false);
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case "backup":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Backup</Badge>;
      case "testing":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Testing</Badge>;
      case "validated":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Validated</Badge>;
      case "archived":
        return <Badge variant="secondary" className="bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">NewsSight Admin</span>
            </div>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
            Administrator
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Admin Overview */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">System Administration</h1>
          <p className="text-muted-foreground">
            Manage models, datasets, users, and monitor system performance
          </p>
        </div>

        {/* Quick Stats */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading admin data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                      <p className="text-sm text-muted-foreground">Total users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats?.completedVerifications || 0}</p>
                      <p className="text-sm text-muted-foreground">Completed verifications</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats?.fakeDetected || 0}</p>
                      <p className="text-sm text-muted-foreground">Fake images detected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats?.accuracy || 0}%</p>
                      <p className="text-sm text-muted-foreground">System accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Admin Tabs */}
        <Tabs defaultValue="models" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="models" className="data-[state=active]:bg-background">
              <Settings className="mr-2 h-4 w-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="datasets" className="data-[state=active]:bg-background">
              <Database className="mr-2 h-4 w-4" />
              Datasets
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-background">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-background">
              <Clock className="mr-2 h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Model Management</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Upload, manage, and deploy ML models for image verification
                    </CardDescription>
                  </div>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Model
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Model Upload */}
                <div className="mb-8 p-6 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-4">Upload New Model</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="modelFile" className="text-foreground">Model File (.pt, .h5, .onnx)</Label>
                      <Input
                        id="modelFile"
                        type="file"
                        accept=".pt,.h5,.onnx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="bg-input-background border-border text-foreground"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="modelName" className="text-foreground">Model Name</Label>
                        <Input
                          id="modelName"
                          placeholder="FakeDetector v2.2.0"
                          className="bg-input-background border-border text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modelVersion" className="text-foreground">Version</Label>
                        <Input
                          id="modelVersion"
                          placeholder="2.2.0"
                          className="bg-input-background border-border text-foreground"
                        />
                      </div>
                    </div>

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Upload Progress</span>
                          <span className="text-foreground">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    <Button
                      onClick={handleModelUpload}
                      disabled={!selectedFile || isUploading}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isUploading ? "Uploading..." : "Upload Model"}
                    </Button>
                  </div>
                </div>

                {/* Models Table */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Deployed Models</h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Model</TableHead>
                        <TableHead className="text-foreground">Version</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Accuracy</TableHead>
                        <TableHead className="text-foreground">Size</TableHead>
                        <TableHead className="text-foreground">Upload Date</TableHead>
                        <TableHead className="text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.id} className="border-border">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{model.name}</p>
                              <p className="text-sm text-muted-foreground">{model.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground">{model.version}</TableCell>
                          <TableCell>{getStatusBadge(model.status)}</TableCell>
                          <TableCell className="text-foreground">{model.accuracy}%</TableCell>
                          <TableCell className="text-foreground">{model.size}</TableCell>
                          <TableCell className="text-foreground">{model.uploadDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {model.status !== "active" && (
                                <Button variant="outline" size="sm" className="border-border text-foreground">
                                  Activate
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Datasets Tab */}
          <TabsContent value="datasets" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Dataset Management</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Upload and manage training datasets for model improvement
                    </CardDescription>
                  </div>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Dataset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Training Datasets</h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Dataset</TableHead>
                        <TableHead className="text-foreground">Images</TableHead>
                        <TableHead className="text-foreground">Real/Fake Split</TableHead>
                        <TableHead className="text-foreground">Size</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Upload Date</TableHead>
                        <TableHead className="text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {datasets.map((dataset) => (
                        <TableRow key={dataset.id} className="border-border">
                          <TableCell className="text-foreground font-medium">{dataset.name}</TableCell>
                          <TableCell className="text-foreground">{dataset.imageCount.toLocaleString()}</TableCell>
                          <TableCell className="text-foreground">
                            {dataset.realCount.toLocaleString()} / {dataset.fakeCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-foreground">{dataset.size}</TableCell>
                          <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                          <TableCell className="text-foreground">{dataset.uploadDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">API Key Management</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Create and manage API keys for programmatic access
                    </CardDescription>
                  </div>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Key className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-border bg-muted/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-muted-foreground">
                      API keys provide programmatic access to NewsSight. Keep them secure and never share them publicly.
                    </AlertDescription>
                  </Alert>

                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Key Name</TableHead>
                        <TableHead className="text-foreground">Prefix</TableHead>
                        <TableHead className="text-foreground">Last Used</TableHead>
                        <TableHead className="text-foreground">Requests</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id} className="border-border">
                          <TableCell className="text-foreground font-medium">{key.name}</TableCell>
                          <TableCell className="text-foreground font-mono">{key.prefix}***</TableCell>
                          <TableCell className="text-foreground">{key.lastUsed}</TableCell>
                          <TableCell className="text-foreground">{key.requests.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(key.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" className="border-border text-foreground">
                                Regenerate
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                Revoke
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Audit Log</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Complete audit trail of administrative actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Action</TableHead>
                        <TableHead className="text-foreground">User</TableHead>
                        <TableHead className="text-foreground">Target</TableHead>
                        <TableHead className="text-foreground">Timestamp</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry) => (
                        <TableRow key={entry.id} className="border-border">
                          <TableCell className="text-foreground font-medium">{entry.action}</TableCell>
                          <TableCell className="text-foreground">{entry.user}</TableCell>
                          <TableCell className="text-foreground">{entry.target}</TableCell>
                          <TableCell className="text-foreground">{entry.timestamp}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-500 text-sm">Success</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
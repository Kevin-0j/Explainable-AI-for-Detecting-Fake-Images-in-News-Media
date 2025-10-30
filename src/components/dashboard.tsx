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
  MoreHorizontal,
  Link as LinkIcon,
  User,
  RefreshCw,
  Download
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { getVerification, getVerifications, Verification } from "../utils/api";
import { BACKEND_ORIGIN } from "../utils/backend-config";
import { useVerificationStore } from "../contexts/VerificationContext";
import { toast } from "sonner@2.0.3";
import { VerificationResult } from "./verification-result";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface DashboardProps {
  onUpload: () => void;
  onLogout: () => void;
}

const PENDING_STATUSES = new Set(["processing", "pending", "queued"]);

const toPercent = (value?: number | null): number | null => {
  if (value === null || value === undefined) return null;
  const percent = value > 1 ? value : value * 100;
  if (!Number.isFinite(percent)) return null;
  return Math.round(percent * 10) / 10;
};

const resolveAsset = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith("data:")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${BACKEND_ORIGIN}${value}`;
  if (value.startsWith("uploads/")) return `${BACKEND_ORIGIN}/${value}`;
  return `${BACKEND_ORIGIN}/uploads/images/${value}`;
};

const ensureDataUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith("data:")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${BACKEND_ORIGIN}${value}`;
  if (value.startsWith("uploads/")) return `${BACKEND_ORIGIN}/${value}`;
  if (/^[a-z]+\/[a-z0-9.+-]+;base64,/i.test(value)) {
    return `data:${value}`;
  }
  if (value.startsWith("base64,")) {
    return `data:image/png;${value}`;
  }
  if (/^[A-Za-z0-9+/=]+$/.test(value)) {
    return `data:image/png;base64,${value}`;
  }
  return value;
};

const buildThumbnailSrc = (verification: Verification): string | undefined => {
  const thumb = verification.thumbnail || (verification as any)?.thumbnail_base64 || (verification as any)?.preview_base64;
  if (thumb) return ensureDataUrl(thumb);
  return resolveAsset(verification.file_url ?? (verification as any)?.image_url ?? verification.image_path ?? null);
};

const getDisplayFilename = (verification: Verification): string => {
  return (
    verification.source_filename ||
    verification.filename ||
    verification.image_filename ||
    (verification.image_path ? verification.image_path.split("/").filter(Boolean).pop() : undefined) ||
    `verification-${verification.job_id ?? verification.id ?? "unknown"}`
  );
};

const getCreatedTimestamp = (verification: Verification): string | undefined => {
  return (
    verification.created_at ??
    verification.uploaded_at ??
    (verification as any)?.createdAt ??
    (verification as any)?.submitted_at ??
    undefined
  );
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getPredictionLabel = (verification: Verification): string | undefined => {
  const label = verification.prediction ?? verification.result;
  return label ? label.toString() : undefined;
};

export function Dashboard({ onUpload, onLogout }: DashboardProps) {
  const { user, accessToken } = useAuth();
  const { verifications, meta, temperature, replaceFromList, getById, upsert } = useVerificationStore();
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(verifications.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailVerification, setDetailVerification] = useState<Verification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const fetchVerifications = useCallback(async ({
    showLoading = false,
    page: pageParam,
    limit: limitParam,
  }: { showLoading?: boolean; page?: number; limit?: number } = {}) => {
    if (!accessToken) return;

    if (showLoading) {
      setIsLoadingVerifications(true);
    }
    setIsRefreshing(true);

    try {
      const nextPage = pageParam ?? page;
      const nextLimit = limitParam ?? limit;
      const response = await getVerifications(accessToken, nextPage, nextLimit);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load verifications');
      }

      replaceFromList(response.data);
      setPage(response.data.page);
    } catch (error: any) {
      console.error('Error fetching verifications:', error);
      toast.error(error?.message || 'Failed to load verifications');
    } finally {
      if (showLoading) {
        setIsLoadingVerifications(false);
      }
      setIsRefreshing(false);
    }
  }, [accessToken, replaceFromList, page, limit]);

  const stats = React.useMemo(() => {
    const completed = verifications.filter((verification) => (verification.status ?? "").toLowerCase() === "completed");
    const fakeDetected = completed.filter((verification) => (getPredictionLabel(verification) ?? "").toLowerCase() === "fake").length;
    const confidenceValues = completed
      .map((verification) => toPercent(verification.confidence ?? (verification as any)?.score ?? null))
      .filter((value): value is number => value !== null);

    const avgConfidence = confidenceValues.length
      ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
      : 0;

    return {
      total: meta.total ?? verifications.length,
      avgConfidence,
      fakeDetected,
    };
  }, [verifications, meta.total]);

  const initialFetchTokenRef = React.useRef<string | null>(null);

  const totalPages = React.useMemo(() => {
    if (meta.pages) return meta.pages;
    if (!meta.total) return 1;
    return Math.max(1, Math.ceil(meta.total / limit));
  }, [meta.pages, meta.total, limit]);

  useEffect(() => {
    if (!accessToken) return;
    if (initialFetchTokenRef.current === accessToken) return;
    initialFetchTokenRef.current = accessToken;
    fetchVerifications({ showLoading: verifications.length === 0, page, limit });
  }, [accessToken, fetchVerifications, verifications.length, page, limit]);

  const displayVerifications = React.useMemo(() => verifications.slice(0, 5), [verifications]);

  const handleViewDetails = useCallback(async (jobId: string) => {
    if (!accessToken) return;

    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailError(null);

    const cached = getById(jobId);
    if (cached) {
      setDetailVerification(cached);
    }

    try {
      const response = await getVerification(jobId, accessToken);
      if (!response.success || !response.verification) {
        throw new Error(response.error || 'Failed to load verification details');
      }
      setDetailVerification(response.verification);
      upsert([response.verification]);
    } catch (error: any) {
      console.error('Error loading verification details:', error);
      const message = error?.message || 'Failed to load verification details';
      setDetailError(message);
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }, [accessToken, getById, upsert]);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setDetailVerification(null);
    setDetailError(null);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setPage(nextPage);
    fetchVerifications({ page: nextPage, limit, showLoading: true });
  }, [fetchVerifications, limit]);

  // Fetch verifications on mount
  useEffect(() => {
    if (!accessToken) return;
    const hasPending = verifications.some((verification) => PENDING_STATUSES.has((verification.status ?? "").toLowerCase()));
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchVerifications({ page, limit });
    }, 5000);

    return () => clearInterval(interval);
  }, [accessToken, verifications, fetchVerifications, page, limit]);

  const getResultBadge = (verification: Verification) => {
    const statusKey = (verification.status ?? "").toLowerCase();
    if (PENDING_STATUSES.has(statusKey)) {
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Processing</Badge>;
    }

    const predictionLabel = getPredictionLabel(verification)?.toLowerCase();
    const confidence = toPercent(verification.confidence ?? (verification as any)?.score ?? null);
    const confidenceLabel = confidence !== null ? `${Math.round(confidence)}%` : "--";

    if (predictionLabel === "real") {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">Real ({confidenceLabel})</Badge>;
    }
    if (predictionLabel === "fake") {
      return <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">Fake ({confidenceLabel})</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted text-foreground border-border">Status: {verification.status}</Badge>;
  };

  const getConfidenceText = (verification: Verification) => {
    const confidence = toPercent(verification.confidence ?? (verification as any)?.score ?? null);
    if (confidence === null) return "Waiting for score";
    if (confidence >= 90) return "High confidence";
    if (confidence >= 70) return "Medium confidence";
    return "Low confidence - manual review recommended";
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
                  {temperature !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Calibrated with temperature <span className="text-foreground font-medium">{temperature.toFixed(2)}</span>
                    </p>
                  )}
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
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-foreground">Recent Uploads</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your latest image verifications
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isRefreshing && (
                    <Badge variant="outline" className="border-border text-xs uppercase tracking-wide">
                      Refreshing
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground"
                    onClick={() => fetchVerifications({ showLoading: true, page, limit })}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingVerifications ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground">Loading verifications...</p>
                  </div>
                ) : displayVerifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No verifications yet. Upload your first image to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                  {displayVerifications.map((upload, index) => {
                    const jobId = upload.job_id ?? String(upload.id ?? index);
                    const thumbnailSrc = buildThumbnailSrc(upload);
                    const filename = getDisplayFilename(upload);
                    const createdAtLabel = formatTimestamp(getCreatedTimestamp(upload));
                    const predictionLabel = getPredictionLabel(upload);
                    const detailActionAvailable = Boolean(accessToken);

                    return (
                      <div key={jobId} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                            {thumbnailSrc ? (
                              <img
                                src={thumbnailSrc}
                                alt={filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Upload className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground flex items-center space-x-2">
                              <span>{filename}</span>
                              {predictionLabel && (
                                <Badge variant="outline" className="uppercase border-border text-xs">
                                  {predictionLabel}
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {createdAtLabel} • {getConfidenceText(upload)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {getResultBadge(upload)}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            disabled={!detailActionAvailable}
                            onClick={() => handleViewDetails(jobId)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem onClick={() => handleViewDetails(jobId)} className="text-foreground">
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const asset = resolveAsset(upload.file_url ?? (upload as any)?.image_url);
                                  if (!asset) return;
                                  const link = document.createElement("a");
                                  link.href = asset;
                                  link.download = filename || `verification-${jobId}`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="text-foreground"
                              >
                                Download original
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-foreground">Re-analyze</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
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
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-foreground">Verification History</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Page {page} of {totalPages} • {meta.total} total jobs
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isRefreshing && (
                    <Badge variant="outline" className="border-border text-xs uppercase tracking-wide">
                      Syncing
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground"
                    onClick={() => fetchVerifications({ page, limit, showLoading: true })}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingVerifications && verifications.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground">Loading verification history...</p>
                  </div>
                ) : verifications.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No verifications recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="py-3 font-medium">Thumbnail</th>
                            <th className="py-3 font-medium">Details</th>
                            <th className="py-3 font-medium">Status</th>
                            <th className="py-3 font-medium">Confidence</th>
                            <th className="py-3 font-medium">Submitted</th>
                            <th className="py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verifications.map((item, index) => {
                            const jobId = item.job_id ?? String(item.id ?? index);
                            const thumb = buildThumbnailSrc(item);
                            const filename = getDisplayFilename(item);
                            const prediction = getPredictionLabel(item);
                            const confidence = toPercent(item.confidence ?? (item as any)?.score ?? null);
                            const submittedAt = formatTimestamp(getCreatedTimestamp(item));
                            return (
                              <tr key={`history-${jobId}`} className="border-b border-border/60">
                                <td className="py-3">
                                  <div className="w-14 h-14 rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center">
                                    {thumb ? (
                                      <img src={thumb} alt={filename} className="w-full h-full object-cover" />
                                    ) : (
                                      <Upload className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </td>
                                <td className="py-3">
                                  <div className="flex flex-col">
                                    <span className="text-foreground font-medium">{filename}</span>
                                    <span className="text-xs text-muted-foreground">#{jobId}</span>
                                  </div>
                                </td>
                                <td className="py-3">
                                  {getResultBadge(item)}
                                </td>
                                <td className="py-3 text-foreground">
                                  {confidence !== null ? `${Math.round(confidence)}%` : '—'}
                                </td>
                                <td className="py-3 text-muted-foreground">{submittedAt}</td>
                                <td className="py-3">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => handleViewDetails(jobId)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        const asset = resolveAsset(item.file_url ?? (item as any)?.image_url);
                                        if (!asset) return;
                                        const link = document.createElement("a");
                                        link.href = asset;
                                        link.download = filename || `verification-${jobId}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing <span className="text-foreground font-medium">{verifications.length}</span> of <span className="text-foreground font-medium">{meta.total}</span> verifications
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-foreground"
                          onClick={() => goToPage(Math.max(1, page - 1))}
                          disabled={page <= 1 || isRefreshing}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-foreground"
                          onClick={() => goToPage(Math.min(totalPages, page + 1))}
                          disabled={page >= totalPages || isRefreshing}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseDetail();
        }
      }}>
        <DialogContent className="max-w-5xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Verification details</DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailError ? (
            <div className="p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
              {detailError}
            </div>
          ) : detailVerification ? (
            <VerificationResult
              verification={detailVerification}
              imageFile={null}
              onReset={() => {
                handleCloseDetail();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a verification to view details.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

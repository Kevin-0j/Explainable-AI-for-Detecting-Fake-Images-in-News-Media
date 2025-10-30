// src/components/upload-flow.tsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { createVerification, getVerification, Verification } from "../utils/api";
import { useVerificationStore } from "../contexts/VerificationContext";
import { toast } from "sonner";
import { VerificationResult } from "./verification-result";

interface UploadFlowProps {
  onBack?: () => void;
}

export function UploadFlow({ onBack }: UploadFlowProps) {
  const { user, accessToken } = useAuth();
  const { upsert, getById } = useVerificationStore();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const cached = getById(jobId);
    if (!cached) return;
    setVerification((prev) => {
      if (!prev) return cached;
      if (prev.updated_at !== cached.updated_at || prev.status !== cached.status) {
        return { ...prev, ...cached };
      }
      if (prev.confidence !== cached.confidence || prev.prediction !== cached.prediction) {
        return { ...prev, ...cached };
      }
      return prev;
    });
  }, [jobId, getById]);

  // Polling function
  const pollVerification = useCallback(async (id: string) => {
    if (!accessToken) return;
    
    try {
      const result = await getVerification(id, accessToken);
      if (result.success && result.verification) {
        const latest = result.verification;
        setVerification(latest);
        upsert([latest]);

        if (latest.status === "completed" || latest.status === "failed") {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          if (latest.status === "completed") {
            toast.success("Verification completed!");
          } else {
            toast.error("Verification failed");
          }
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [accessToken]);

  // Start polling
  const startPolling = useCallback((id: string) => {
    if (!id) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsPolling(true);
    setJobId(id);

    // Poll immediately
    pollVerification(id);

    // Then poll every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollVerification(id);
    }, 3000);
  }, [pollVerification]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    setSelectedFile(file);
    setVerification(null);
    setJobId(null);
    setImageUrl("");
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile || !accessToken || !user) {
      toast.error("Missing required data");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      // Create filename: user_{id}_{timestamp}.{ext}
      const timestamp = Date.now();
      const extension = selectedFile.name.split('.').pop() || 'jpg';
      const filename = `user_${user.id}_${timestamp}.${extension}`;

      // Create FormData
      const formData = new FormData();
      formData.append("file", selectedFile, filename);

      // Simulate progress
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
            }
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      const response = await createVerification(formData, accessToken);

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setUploadProgress(100);

      if (!response.success || !response.verification) {
        throw new Error(response.error || "Upload failed");
      }

      const uploaded = response.verification;
      setVerification(uploaded);
      setJobId(uploaded.job_id);
      upsert([uploaded]);

      const statusLabel = uploaded.status === "completed" ? "completed" : "queued";
      const prediction = uploaded.prediction || uploaded.result;
      toast.success(
        prediction
          ? `Verification ${statusLabel}: ${prediction}`
          : `Verification ${statusLabel}`
      );

      if (uploaded.status && ["completed", "failed"].includes(uploaded.status)) {
        setIsPolling(false);
      } else {
        startPolling(uploaded.job_id);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setUploadProgress((prev) => (prev < 100 ? prev : 100));
      setIsUploading(false);
    }
  }, [selectedFile, accessToken, user, startPolling, upsert]);

  // Reset state
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setVerification(null);
    setJobId(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsPolling(false);
    setImageUrl("");
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Paste Image URL → fetch and convert to File
  const handleUseImageUrl = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const resp = await fetch(imageUrl, { mode: "cors" });
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
      const blob = await resp.blob();
      if (!blob.type.startsWith("image/")) throw new Error("URL is not an image");
      const fileNameFromUrl = imageUrl.split("/").pop() || `remote_${Date.now()}.jpg`;
      const file = new File([blob], fileNameFromUrl, { type: blob.type });
      handleFileSelect(file);
      toast.success("Image loaded from URL");
    } catch (e: any) {
      toast.error(e.message || "Failed to load image from URL");
    }
  }, [imageUrl, handleFileSelect]);

  // If verification is completed, show result
  if (verification && verification.status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Dashboard
            </Button>
          )}
          <VerificationResult 
            verification={verification} 
            imageFile={selectedFile}
            onReset={handleReset}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </Button>
        )}

        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Upload Image for Verification</CardTitle>
            <CardDescription className="text-muted-foreground">
              Upload an image to verify its authenticity using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Paste Image URL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Paste image URL (https://...)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="bg-input-background border-border text-foreground md:col-span-2"
                disabled={isUploading || isPolling}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleUseImageUrl}
                disabled={!imageUrl || isUploading || isPolling}
                className="border-border text-foreground"
              >
                Use Image URL
              </Button>
            </div>
            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading || isPolling}
              />
              
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading || isPolling}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG, JPEG up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Polling Status */}
            {isPolling && (
              <Alert className="border-border bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Verifying image... This may take a few moments.
                </AlertDescription>
              </Alert>
            )}

            {/* Verification Status */}
            {verification && verification.status === "pending" && (
              <Alert className="border-yellow-500 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700">
                  Verification in progress...
                </AlertDescription>
              </Alert>
            )}

            {verification && verification.status === "failed" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Verification failed. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || isPolling}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : isPolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Upload & Verify"
                )}
              </Button>
              
              {selectedFile && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isUploading || isPolling}
                  className="border-border text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

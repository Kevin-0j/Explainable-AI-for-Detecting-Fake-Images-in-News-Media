// src/components/verification-result.tsx
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Image as ImageIcon, 
  Download,
  RotateCcw,
  Shield,
  Calendar,
  FileText
} from "lucide-react";
import { Verification } from "../utils/api";
import { useVerificationStore } from "../contexts/VerificationContext";
import { BACKEND_ORIGIN } from "../utils/backend-config";

interface VerificationResultProps {
  verification: Verification;
  imageFile: File | null;
  onReset: () => void;
}

export function VerificationResult({ verification, imageFile, onReset }: VerificationResultProps) {
  const { temperature } = useVerificationStore();
  const predictionRaw = (verification.prediction ?? verification.result ?? "").toString();
  const prediction = predictionRaw.toLowerCase();
  const status = verification.status ?? "queued";
  const jobId = verification.job_id ?? String(verification.id ?? "");

  const isReal = prediction === "real";
  const isFake = prediction === "fake";

  const badgeLabel = (predictionRaw || status).toString().toUpperCase();
  const resultTitle = isReal
    ? "Authentic Image"
    : isFake
    ? "Potentially Manipulated"
    : status.charAt(0).toUpperCase() + status.slice(1);

  const getResultColor = () => {
    if (isReal) return "bg-green-500";
    if (isFake) return "bg-red-500";
    return "bg-primary";
  };

  const getResultIcon = () => {
    if (isReal) return <CheckCircle className="h-6 w-6 text-green-500" />;
    if (isFake) return <XCircle className="h-6 w-6 text-red-500" />;
    return <Clock className="h-6 w-6 text-muted-foreground" />;
  };

  const computeConfidence = (value?: number | null) => {
    if (value === null || value === undefined) return null;
    const percent = value > 1 ? value : value * 100;
    return Math.min(100, Math.max(0, Number(percent.toFixed(1))));
  };

  const confidencePercent = computeConfidence(verification.confidence ?? (verification as any)?.score ?? null);
  const confidenceLabel = confidencePercent === null ? "—" : `${confidencePercent.toFixed(1)}%`;

  const getConfidenceColor = () => {
    if (confidencePercent === null) return "text-muted-foreground";
    if (confidencePercent >= 90) return "text-green-600";
    if (confidencePercent >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const createdAt = parseDate(
    (verification.uploaded_at as string | null | undefined) ??
    (verification.created_at as string | null | undefined) ??
    (verification as any)?.created_at ??
    (verification as any)?.submitted_at
  );

  const completedAt = parseDate(
    (verification.updated_at as string | null | undefined) ??
    (verification as any)?.completed_at ??
    (verification as any)?.processed_at
  );

  const resolveAsset = (value?: string | null) => {
    if (!value) return undefined;
    if (value.startsWith("data:")) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/")) return `${BACKEND_ORIGIN}${value}`;
    if (value.startsWith("uploads/")) return `${BACKEND_ORIGIN}/${value}`;
    return `${BACKEND_ORIGIN}/uploads/images/${value}`;
  };

  const originalImageSrc = resolveAsset(verification.file_url ?? (verification as any)?.image_url) ??
    (imageFile ? URL.createObjectURL(imageFile) : undefined);

  const gradcamSrc = resolveAsset(verification.gradcam_image ?? (verification as any)?.gradcam_url);
  const limeSrc = resolveAsset(verification.lime_image ?? (verification as any)?.lime_url);

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const processingSeconds = createdAt && completedAt ? Math.max(0, Math.round((completedAt.getTime() - createdAt.getTime()) / 1000)) : null;

  const sourceFilename =
    verification.source_filename ||
    verification.filename ||
    verification.image_filename ||
    verification.image_path ||
    imageFile?.name ||
    "—";

  const downloadUrl = resolveAsset(verification.file_url ?? (verification as any)?.image_url);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Verification Complete</h1>
        </div>
        <p className="text-muted-foreground">
          AI analysis of your uploaded image
        </p>
      </div>

      {/* Main Result Card */}
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            {getResultIcon()}
            <Badge 
              className={`text-white font-semibold px-4 py-2 text-lg ${getResultColor()}`}
            >
              {badgeLabel}
            </Badge>
          </div>
          <CardTitle className="text-2xl text-foreground">
            {resultTitle}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Confidence: <span className={`font-semibold ${getConfidenceColor()}`}>
              {confidenceLabel}
            </span>
          </CardDescription>
          {temperature !== null && (
            <p className="mt-2 text-sm text-muted-foreground">
              Calibration temperature <span className="text-foreground font-medium">{temperature.toFixed(2)}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visualizations */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" />
                Original Upload
              </h3>
              <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
                {originalImageSrc ? (
                  <img
                    src={originalImageSrc}
                    alt="Original upload"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Original preview unavailable
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-background/80 text-foreground">
                    {sourceFilename}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" />
                Grad-CAM
              </h3>
              <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
                {gradcamSrc ? (
                  <img
                    src={gradcamSrc}
                    alt="Grad-CAM visualization"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Grad-CAM not generated
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <ImageIcon className="h-4 w-4 mr-2" />
                LIME
              </h3>
              <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30">
                {limeSrc ? (
                  <img
                    src={limeSrc}
                    alt="LIME visualization"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    LIME not generated
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                File Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filename:</span>
                  <span className="text-foreground font-mono text-xs">
                    {sourceFilename}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="border-border">
                    {verification.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prediction:</span>
                  <span className="text-foreground font-semibold">
                    {predictionRaw ? predictionRaw : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification ID:</span>
                  <span className="text-foreground font-mono text-xs">
                    #{jobId}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span className="text-foreground">
                    {formatDate(createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="text-foreground">
                    {formatDate(completedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing time:</span>
                  <span className="text-foreground">
                    {processingSeconds !== null ? `${processingSeconds}s` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation Placeholder */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Analysis Details</h3>
            <Alert className="border-border bg-muted/50">
              <AlertDescription className="text-muted-foreground">
                These overlays highlight the regions that influenced the prediction. Grad-CAM shows
                the model's spatial attention, while LIME explains feature importance. Re-run the
                job from the dashboard if you need fresh explanations after calibration.
              </AlertDescription>
            </Alert>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={onReset}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Verify Another Image
            </Button>
            
            {(downloadUrl || imageFile) && (
              <Button
                variant="outline"
                onClick={() => {
                  const fallbackUrl = !downloadUrl && imageFile ? URL.createObjectURL(imageFile) : undefined;
                  const href = downloadUrl || fallbackUrl;
                  if (!href) return;
                  const link = document.createElement("a");
                  link.href = href;
                  link.download = sourceFilename || `verification-${jobId}`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  if (fallbackUrl) {
                    URL.revokeObjectURL(fallbackUrl);
                  }
                }}
                className="border-border text-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">About This Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This verification was performed using advanced AI models trained to detect 
            image manipulation and deepfakes. The confidence score indicates how certain 
            the model is about its classification.
          </p>
          <p>
            <strong>High confidence (90%+):</strong> Very reliable result<br/>
            <strong>Medium confidence (70-89%):</strong> Generally reliable<br/>
            <strong>Low confidence (&lt;70%):</strong> Consider additional verification
          </p>
          <p>
            Remember: AI verification is a tool to assist journalists, not a definitive 
            replacement for human judgment and additional fact-checking methods.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

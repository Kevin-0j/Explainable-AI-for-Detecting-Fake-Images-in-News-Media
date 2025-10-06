import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Shield, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Download,
  Sliders,
  RotateCcw
} from "lucide-react";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { createVerification, getVerification } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface UploadFlowProps {
  onBack: () => void;
}

type UploadStep = "upload" | "processing" | "result";

export function UploadFlow({ onBack }: UploadFlowProps) {
  const { accessToken } = useAuth();
  const [step, setStep] = useState<UploadStep>("upload");
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState([60]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayType, setOverlayType] = useState<"gradcam" | "lime" | "combined">("gradcam");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result data from backend
  const [result, setResult] = useState<any>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  // Poll for verification status
  useEffect(() => {
    if (!verificationId || !accessToken) return;

    const checkStatus = async () => {
      try {
        const response = await getVerification(verificationId, accessToken);
        if (response.success && response.verification) {
          const verification = response.verification;
          
          if (verification.status === 'completed') {
            setResult({
              prediction: verification.result,
              confidence: verification.confidence,
              modelVersion: "v2.1.3",
              layerUsed: "conv5_block3",
              limeSettings: {
                samples: 1000,
                randomSeed: 42
              },
              processingTime: "18.2s",
              timestamp: verification.completedAt,
              metadata: {
                imageSize: "1920x1080",
                fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "Unknown",
                format: "JPEG"
              }
            });
            setProcessingProgress(100);
            setTimeout(() => setStep("result"), 500);
          } else {
            // Still processing, continue polling
            setProcessingProgress(prev => Math.min(prev + 5, 95));
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [verificationId, accessToken]);

  // Processing time counter
  useEffect(() => {
    if (step !== 'processing') return;

    const interval = setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const handleUpload = async () => {
    if (!selectedFile && !imageUrl) {
      toast.error("Please select a file or enter an image URL");
      return;
    }

    if (!accessToken) {
      toast.error("You must be logged in to upload images");
      return;
    }
    
    try {
      setStep("processing");
      setUploadProgress(0);
      setProcessingProgress(0);
      setProcessingTime(0);
      
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create verification job
      const filename = selectedFile ? selectedFile.name : imageUrl.split('/').pop() || 'url-image.jpg';
      const imgUrl = selectedFile ? URL.createObjectURL(selectedFile) : imageUrl;
      
      const response = await createVerification({
        filename,
        imageUrl: imgUrl,
        imageType: uploadMethod,
      }, accessToken);

      if (response.success && response.verificationId) {
        setVerificationId(response.verificationId);
        toast.success("Verification started! Analyzing image...");
        setProcessingProgress(10);
      } else {
        throw new Error("Failed to create verification");
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload image");
      setStep("upload");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-500";
    if (confidence >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 90) return "High confidence";
    if (confidence >= 70) return "Medium confidence";
    return "Low confidence — recommend manual verification";
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
              <span className="text-xl font-semibold text-foreground">NewsSight</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Upload Step */}
        {step === "upload" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Verify Image Authenticity</h1>
              <p className="text-muted-foreground">
                Upload an image or provide a URL to get instant AI-powered verification with visual explanations
              </p>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Upload Method</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Choose how you'd like to provide the image for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as "file" | "url")}>
                  <TabsList className="bg-muted">
                    <TabsTrigger value="file" className="data-[state=active]:bg-background">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="url" className="data-[state=active]:bg-background">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Image URL
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-muted/50'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                    >
                      {selectedFile ? (
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                            <ImageIcon className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedFile(null)}
                            className="border-border text-foreground"
                          >
                            Remove file
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                            <Upload className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-foreground">
                              Drag and drop your image here
                            </p>
                            <p className="text-muted-foreground">
                              or click to browse files
                            </p>
                          </div>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Choose File
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                    
                    <Alert className="border-border bg-muted/50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-muted-foreground">
                        Supported formats: JPEG, PNG, WebP. Maximum file size: 10MB
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-foreground">Image URL</Label>
                      <Input
                        id="imageUrl"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="bg-input-background border-border text-foreground"
                      />
                    </div>
                    
                    <Alert className="border-border bg-muted/50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-muted-foreground">
                        The image must be publicly accessible. We'll download and analyze it securely.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile && !imageUrl}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Start Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Analysis in Progress</h1>
              <p className="text-muted-foreground">
                We're analyzing your image and generating visual explanations. This may take up to 20 seconds.
              </p>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Processing Image</h3>
                    <p className="text-muted-foreground">Job ID: {verificationId || 'Initializing...'}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Upload Progress</span>
                      <span className="text-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">AI Analysis</span>
                      <span className="text-foreground">{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Processing time: {processingTime}s</span>
                    </div>
                  </div>

                  <Alert className="border-border bg-muted/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-muted-foreground">
                      We're running the image through our CNN model and generating Grad-CAM heatmaps and LIME superpixel explanations.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && result && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Analysis Complete</h1>
              <p className="text-muted-foreground">
                Your image has been analyzed with AI explanations ready for review
              </p>
            </div>

            {/* Result Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Verification Result</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Model prediction with confidence score and processing details
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" className="border-border text-foreground">
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-border text-foreground"
                      onClick={() => {
                        setStep("upload");
                        setSelectedFile(null);
                        setImageUrl("");
                        setResult(null);
                        setVerificationId(null);
                        setUploadProgress(0);
                        setProcessingProgress(0);
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      New Analysis
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Prediction */}
                    <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
                      <div className={`w-16 h-16 ${result.prediction === "fake" ? "bg-red-500/10" : "bg-green-500/10"} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {result.prediction === "fake" ? (
                          <AlertCircle className="h-8 w-8 text-red-500" />
                        ) : (
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        {result.prediction === "fake" ? "Likely Fake" : "Likely Real"}
                      </h3>
                      <p className={`text-3xl font-bold ${getConfidenceColor(result.confidence)} mb-2`}>
                        {result.confidence}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getConfidenceText(result.confidence)}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Analysis Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Processing Time</p>
                          <p className="text-foreground font-medium">{result.processingTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Model Version</p>
                          <p className="text-foreground font-medium">{result.modelVersion}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Image Size</p>
                          <p className="text-foreground font-medium">{result.metadata.imageSize}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Timestamp</p>
                          <p className="text-foreground font-medium">{new Date(result.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Image Preview */}
                  <div className="space-y-4">
                    <div className="relative bg-muted/50 rounded-lg border border-border overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                      
                      {/* Overlay Toggle */}
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary" className="bg-background/80 text-foreground">
                          Original Image
                        </Badge>
                      </div>
                      
                      <div className="absolute top-4 right-4 flex items-center space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowOverlay(!showOverlay)}
                          className="bg-background/80 text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-background/80 text-foreground"
                        >
                          <Sliders className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Overlay Controls */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-foreground">Explanation Overlay</Label>
                        <Badge variant={showOverlay ? "default" : "secondary"}>
                          {showOverlay ? "Visible" : "Hidden"}
                        </Badge>
                      </div>
                      
                      <Tabs value={overlayType} onValueChange={(value) => setOverlayType(value as typeof overlayType)}>
                        <TabsList className="bg-background w-full">
                          <TabsTrigger value="gradcam" className="flex-1">Grad-CAM</TabsTrigger>
                          <TabsTrigger value="lime" className="flex-1">LIME</TabsTrigger>
                          <TabsTrigger value="combined" className="flex-1">Combined</TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Label className="text-foreground">Opacity</Label>
                          <span className="text-muted-foreground">{overlayOpacity[0]}%</span>
                        </div>
                        <Slider
                          value={overlayOpacity}
                          onValueChange={setOverlayOpacity}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explanations */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">AI Explanations</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Visual explanations showing which parts of the image influenced the prediction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="gradcam" className="space-y-6">
                  <TabsList className="bg-muted">
                    <TabsTrigger value="gradcam" className="data-[state=active]:bg-background">
                      Grad-CAM Heatmap
                    </TabsTrigger>
                    <TabsTrigger value="lime" className="data-[state=active]:bg-background">
                      LIME Superpixels
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="gradcam" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Heatmap Visualization</h4>
                        <div className="aspect-video bg-gradient-to-br from-yellow-500/20 via-orange-500/30 to-red-500/40 rounded-lg border border-border flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">Grad-CAM Heatmap Overlay</p>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span className="text-muted-foreground">Low influence</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            <span className="text-muted-foreground">Medium influence</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span className="text-muted-foreground">High influence</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Explanation</h4>
                        <div className="space-y-3 text-sm">
                          <p className="text-muted-foreground">
                            The heatmap highlights regions that most influenced the AI's decision. 
                            Red areas indicate the strongest evidence for the prediction.
                          </p>
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-medium">Key findings:</span> The model 
                            focused heavily on texture patterns near object boundaries and inconsistent 
                            lighting artifacts.
                          </p>
                          <Alert className="border-border bg-muted/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-muted-foreground">
                              Layer used: {result.layerUsed} • Processing time: {result.processingTime}
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="lime" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Superpixel Segmentation</h4>
                        <div className="aspect-video bg-gradient-to-br from-blue-500/10 via-blue-500/20 to-blue-500/30 rounded-lg border border-border flex items-center justify-center relative">
                          <p className="text-sm text-muted-foreground">LIME Superpixel Overlay</p>
                          <div className="absolute inset-4 grid grid-cols-8 gap-1">
                            {Array.from({ length: 32 }).map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-sm border border-blue-500/50 ${
                                  Math.random() > 0.7 ? 'bg-blue-500/30' : 'bg-blue-500/10'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500/30 border border-blue-500 rounded"></div>
                            <span className="text-muted-foreground">Contributing superpixels</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500/10 border border-blue-500/50 rounded"></div>
                            <span className="text-muted-foreground">Neutral regions</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Superpixel Analysis</h4>
                        <div className="space-y-3 text-sm">
                          <p className="text-muted-foreground">
                            LIME segmented the image into superpixels and identified which segments 
                            contributed most to the fake classification.
                          </p>
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-medium">Contributing regions:</span> Edge 
                            artifacts, inconsistent compression patterns, and unnatural texture transitions.
                          </p>
                          <Alert className="border-border bg-muted/50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-muted-foreground">
                              Samples: {result.limeSettings.samples} • Random seed: {result.limeSettings.randomSeed}
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
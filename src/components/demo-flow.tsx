import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Shield, 
  ArrowLeft, 
  Play, 
  Pause,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  Sliders,
  Clock,
  Image as ImageIcon,
  Zap
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface DemoFlowProps {
  onBack: () => void;
}

type DemoStep = "intro" | "upload" | "processing" | "analysis" | "result";

export function DemoFlow({ onBack }: DemoFlowProps) {
  const [currentStep, setCurrentStep] = useState<DemoStep>("intro");
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState([60]);
  const [overlayType, setOverlayType] = useState<"gradcam" | "lime" | "combined">("gradcam");
  const [processingTime, setProcessingTime] = useState(0);

  // Demo image data
  const demoImage = {
    url: "https://images.unsplash.com/photo-1709285671867-245153973b14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWtlJTIwbmV3cyUyMGRldGVjdGlvbnxlbnwxfHx8fDE3NTc4NzQxMzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    filename: "suspicious_news_photo.jpg",
    size: "3.2 MB",
    dimensions: "1920x1080"
  };

  const demoResult = {
    prediction: "fake",
    confidence: 84,
    modelVersion: "v2.1.3",
    processingTime: "16.8s",
    keyFindings: [
      "Inconsistent lighting patterns detected",
      "Edge artifacts suggesting digital manipulation",
      "Texture anomalies near subject boundaries",
      "Compression artifacts inconsistent with single capture"
    ],
    metadata: {
      exifInconsistencies: 3,
      compressionAnalysis: "Multiple compression cycles detected",
      colorSpaceWarnings: 2
    }
  };

  const startDemo = () => {
    setIsPlaying(true);
    setCurrentStep("upload");
  };

  const pauseDemo = () => {
    setIsPlaying(false);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentStep("intro");
    setUploadProgress(0);
    setProcessingProgress(0);
    setAnalysisProgress(0);
    setProcessingTime(0);
  };

  useEffect(() => {
    if (!isPlaying) return;

    let interval: NodeJS.Timeout;

    if (currentStep === "upload") {
      interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setCurrentStep("processing"), 500);
            return 100;
          }
          return prev + 8;
        });
      }, 200);
    } else if (currentStep === "processing") {
      interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setCurrentStep("analysis"), 500);
            return 100;
          }
          return prev + 3;
        });
        setProcessingTime(prev => prev + 0.5);
      }, 300);
    } else if (currentStep === "analysis") {
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setCurrentStep("result"), 500);
            return 100;
          }
          return prev + 4;
        });
        setProcessingTime(prev => prev + 0.3);
      }, 200);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  const getStepIndex = (step: DemoStep) => {
    const steps = ["intro", "upload", "processing", "analysis", "result"];
    return steps.indexOf(step);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold text-foreground">NewsSight Demo</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              Interactive Demo
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">AI Image Verification Demo</h1>
            <div className="flex items-center space-x-2">
              {currentStep !== "intro" && currentStep !== "result" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? pauseDemo : () => setIsPlaying(true)}
                  className="border-border text-foreground"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={resetDemo}
                className="border-border text-foreground"
              >
                Reset Demo
              </Button>
            </div>
          </div>
          
          {/* Step Progress */}
          <div className="flex items-center space-x-4">
            {["Upload", "Processing", "Analysis", "Results"].map((step, index) => (
              <div key={step} className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepIndex(currentStep) > index 
                    ? "bg-primary text-primary-foreground" 
                    : getStepIndex(currentStep) === index + 1
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </div>
                <span className={`text-sm ${
                  getStepIndex(currentStep) >= index + 1 ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step}
                </span>
                {index < 3 && (
                  <div className={`w-12 h-0.5 ${
                    getStepIndex(currentStep) > index + 1 ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Demo Steps */}
        {currentStep === "intro" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-foreground">Experience AI-Powered Image Verification</CardTitle>
              <CardDescription className="text-lg text-muted-foreground max-w-3xl mx-auto">
                See how NewsSight analyzes a suspicious image using advanced AI, providing transparent explanations 
                that help journalists make informed decisions about image authenticity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Demo Image Preview */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <ImageWithFallback 
                    src={demoImage.url}
                    alt="Demo image for verification"
                    className="rounded-lg shadow-lg"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      Suspicious Image
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 text-center space-y-2">
                  <p className="font-medium text-foreground">{demoImage.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {demoImage.dimensions} • {demoImage.size} • JPEG
                  </p>
                </div>
              </div>

              {/* What You'll See */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 bg-muted/50 border-border">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Real-time Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      Watch as our CNN model analyzes the image and generates predictions in real-time
                    </p>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/50 border-border">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto">
                      <Eye className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground">Visual Explanations</h3>
                    <p className="text-sm text-muted-foreground">
                      See Grad-CAM heatmaps and LIME superpixels that show exactly why the AI made its decision
                    </p>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/50 border-border">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="font-semibold text-foreground">Professional Results</h3>
                    <p className="text-sm text-muted-foreground">
                      Get detailed confidence scores, metadata analysis, and exportable evidence reports
                    </p>
                  </div>
                </Card>
              </div>

              <div className="text-center">
                <Button onClick={startDemo} className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-8 py-3">
                  <Play className="mr-2 h-5 w-5" />
                  Start Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "upload" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Uploading Image</CardTitle>
              <CardDescription className="text-muted-foreground">
                Securely uploading and preparing image for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Processing Upload</h3>
                <p className="text-muted-foreground">{demoImage.filename}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Upload Progress</span>
                  <span className="text-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
              </div>

              <Alert className="border-border bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-muted-foreground">
                  Image uploaded securely. Preprocessing for neural network analysis...
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {currentStep === "processing" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">AI Model Processing</CardTitle>
              <CardDescription className="text-muted-foreground">
                Running image through CNN model and generating initial predictions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                      <Shield className="h-8 w-8 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Deep Learning Analysis</h3>
                    <p className="text-muted-foreground">Model: FakeDetector {demoResult.modelVersion}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neural Network Processing</span>
                      <span className="text-foreground">{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} className="h-3" />
                  </div>

                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Processing: {processingTime.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Processing Steps</h4>
                  <div className="space-y-3">
                    {[
                      { step: "Image preprocessing", status: "complete" },
                      { step: "Feature extraction", status: processingProgress > 20 ? "complete" : "processing" },
                      { step: "CNN forward pass", status: processingProgress > 50 ? "complete" : processingProgress > 20 ? "processing" : "pending" },
                      { step: "Attention mapping", status: processingProgress > 80 ? "complete" : processingProgress > 50 ? "processing" : "pending" },
                      { step: "Confidence calculation", status: processingProgress > 95 ? "complete" : processingProgress > 80 ? "processing" : "pending" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          item.status === "complete" ? "bg-green-500" :
                          item.status === "processing" ? "bg-accent animate-pulse" :
                          "bg-muted"
                        }`} />
                        <span className={`text-sm ${
                          item.status === "complete" ? "text-foreground" :
                          item.status === "processing" ? "text-accent" :
                          "text-muted-foreground"
                        }`}>
                          {item.step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "analysis" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Generating Explanations</CardTitle>
              <CardDescription className="text-muted-foreground">
                Creating Grad-CAM heatmaps and LIME superpixel visualizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Explainability Analysis</h3>
                    <p className="text-muted-foreground">Generating human-readable explanations</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Explanation Generation</span>
                      <span className="text-foreground">{Math.round(analysisProgress)}%</span>
                    </div>
                    <Progress value={analysisProgress} className="h-3" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Analysis Components</h4>
                  <div className="space-y-3">
                    {[
                      { name: "Grad-CAM heatmap", desc: "Attention visualization", status: analysisProgress > 25 ? "complete" : "processing" },
                      { name: "LIME superpixels", desc: "Local explanations", status: analysisProgress > 50 ? "complete" : analysisProgress > 25 ? "processing" : "pending" },
                      { name: "Feature importance", desc: "Contribution analysis", status: analysisProgress > 75 ? "complete" : analysisProgress > 50 ? "processing" : "pending" },
                      { name: "Confidence metrics", desc: "Statistical validation", status: analysisProgress > 90 ? "complete" : analysisProgress > 75 ? "processing" : "pending" }
                    ].map((item, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === "complete" ? "bg-green-500" :
                            item.status === "processing" ? "bg-accent animate-pulse" :
                            "bg-muted"
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "result" && (
          <div className="space-y-8">
            {/* Result Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Verification Complete</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      AI analysis finished with detailed explanations
                    </CardDescription>
                  </div>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Main Result */}
                    <div className="text-center p-6 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">Likely Fake</h3>
                      <p className="text-3xl font-bold text-red-500 mb-2">{demoResult.confidence}%</p>
                      <p className="text-sm text-muted-foreground">
                        Medium confidence — recommend manual verification
                      </p>
                    </div>

                    {/* Key Findings */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-foreground">Key Findings</h4>
                      <div className="space-y-2">
                        {demoResult.keyFindings.map((finding, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-foreground">{finding}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Image with Overlay */}
                    <div className="relative">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <ImageWithFallback 
                          src={demoImage.url}
                          alt="Demo image with AI analysis overlay"
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Simulated Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 via-orange-500/20 to-yellow-500/10 mix-blend-multiply" 
                             style={{ opacity: overlayOpacity[0] / 100 }} />
                      </div>
                      
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-background/80 text-foreground">
                          {overlayType === "gradcam" ? "Grad-CAM" : overlayType === "lime" ? "LIME" : "Combined"}
                        </Badge>
                      </div>
                    </div>

                    {/* Overlay Controls */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                      <Tabs value={overlayType} onValueChange={(value) => setOverlayType(value as typeof overlayType)}>
                        <TabsList className="bg-background w-full">
                          <TabsTrigger value="gradcam" className="flex-1">Grad-CAM</TabsTrigger>
                          <TabsTrigger value="lime" className="flex-1">LIME</TabsTrigger>
                          <TabsTrigger value="combined" className="flex-1">Combined</TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">Overlay Opacity</span>
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

                    {/* Metadata */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Analysis Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Processing Time</p>
                          <p className="text-foreground font-medium">{demoResult.processingTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Model Version</p>
                          <p className="text-foreground font-medium">{demoResult.modelVersion}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">EXIF Issues</p>
                          <p className="text-foreground font-medium">{demoResult.metadata.exifInconsistencies} found</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Color Warnings</p>
                          <p className="text-foreground font-medium">{demoResult.metadata.colorSpaceWarnings} detected</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explanation Details */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Detailed Explanations</CardTitle>
                <CardDescription className="text-muted-foreground">
                  How the AI reached its conclusion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="gradcam" className="space-y-6">
                  <TabsList className="bg-muted">
                    <TabsTrigger value="gradcam" className="data-[state=active]:bg-background">
                      Grad-CAM Analysis
                    </TabsTrigger>
                    <TabsTrigger value="lime" className="data-[state=active]:bg-background">
                      LIME Superpixels
                    </TabsTrigger>
                    <TabsTrigger value="technical" className="data-[state=active]:bg-background">
                      Technical Details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="gradcam" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Attention Heatmap</h4>
                        <div className="aspect-video bg-gradient-to-br from-yellow-500/20 via-orange-500/30 to-red-500/40 rounded-lg border border-border flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">Grad-CAM Visualization</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Interpretation</h4>
                        <div className="space-y-3 text-sm">
                          <p className="text-muted-foreground">
                            The model's attention focused heavily on edge regions and texture boundaries, 
                            indicating potential manipulation artifacts.
                          </p>
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-medium">Red regions</span> show the strongest 
                            evidence for fake classification, particularly around the subject's edges.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="lime" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Superpixel Analysis</h4>
                        <div className="aspect-video bg-gradient-to-br from-blue-500/10 via-blue-500/20 to-blue-500/30 rounded-lg border border-border flex items-center justify-center relative">
                          <p className="text-sm text-muted-foreground">LIME Segmentation</p>
                          <div className="absolute inset-4 grid grid-cols-8 gap-1">
                            {Array.from({ length: 32 }).map((_, i) => (
                              <div
                                key={i}
                                className={`rounded-sm border border-blue-500/50 ${
                                  Math.random() > 0.6 ? 'bg-blue-500/30' : 'bg-blue-500/10'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Local Explanations</h4>
                        <div className="space-y-3 text-sm">
                          <p className="text-muted-foreground">
                            LIME identified 12 superpixels that strongly contributed to the fake prediction, 
                            focusing on areas with compression inconsistencies.
                          </p>
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-medium">Blue highlighted regions</span> show 
                            local features that most influenced the model's decision.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="technical" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Model Configuration</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Architecture:</span>
                            <span className="text-foreground">ResNet-50 + Attention</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Layer for Grad-CAM:</span>
                            <span className="text-foreground">conv5_block3</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">LIME Samples:</span>
                            <span className="text-foreground">1,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Random Seed:</span>
                            <span className="text-foreground">42</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-foreground">Performance Metrics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Validation Accuracy:</span>
                            <span className="text-foreground">94.2%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">AUC Score:</span>
                            <span className="text-foreground">0.97</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">False Positive Rate:</span>
                            <span className="text-foreground">3.1%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Processing Time:</span>
                            <span className="text-foreground">{demoResult.processingTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Ready to get started?</h3>
                  <p className="text-muted-foreground">
                    Sign up for NewsSight to start verifying images with AI-powered explanations
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button onClick={() => window.location.reload()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      Try Another Demo
                    </Button>
                    <Button onClick={onBack} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Sign Up Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
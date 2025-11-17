import { useRef, useState } from 'react';
import { Navigation } from './Navigation';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Upload, FileText, Image, Video, CheckCircle, AlertCircle, Zap, Brain, X, Clock, Target, Cpu, Shield, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { DetectionResult, DetectionModel, User } from '../App';
import { api, USE_MOCK_API } from '../services/api';
import { MockApiService } from '../services/mockApi';
import { toast } from 'sonner';

interface UploadPageProps {
  navigate: (page: string) => void;
  user: User | null;
  logout: () => void;
  addDetectionResult: (result: DetectionResult) => void;
}

// Available detection models
const DETECTION_MODELS: DetectionModel[] = [
  {
    id: 'fast-cnn',
    name: 'FastDetect',
    version: 'v2.1',
    description: 'Speed',
    accuracy: 85,
    speed: 'fast',
    speciality: 'Quick screening and basic detection',
    processingTime: '5-15 seconds',
    recommendedFor: ['Quick checks', 'Batch processing', 'Real-time screening'],
  },
  {
    id: 'standard-ensemble',
    name: 'Standard',
    version: 'v3.0',
    description: 'Balanced',
    accuracy: 92,
    speed: 'medium',
    speciality: 'General-purpose detection with good balance',
    processingTime: '30-60 seconds',
    recommendedFor: ['General use', 'Social media content', 'News verification'],
  },
  {
    id: 'high-accuracy-transformer',
    name: 'DeepAnalysis',
    version: 'v4.2',
    description: 'Accuracy',
    accuracy: 96,
    speed: 'slow',
    speciality: 'Maximum precision for critical applications',
    processingTime: '2-5 minutes',
    recommendedFor: ['Legal evidence', 'Forensic analysis', 'High-stakes verification'],
    isPremium: true,
  },
  {
    id: 'video-specialist',
    name: 'VideoGuard',
    version: 'v2.8',
    description: 'Video',
    accuracy: 94,
    speed: 'slow',
    speciality: 'Video-specific features and temporal analysis',
    processingTime: '1-3 minutes',
    recommendedFor: ['Video content', 'Streaming media', 'Temporal inconsistencies'],
  },
];

export function UploadPage({ navigate, user, logout, addDetectionResult }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<DetectionModel | null>(DETECTION_MODELS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [isUrlSubmitting, setIsUrlSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm', 'video/flv', 'video/wmv'
  ];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

const mockApiInstance = USE_MOCK_API ? new MockApiService() : null;
  const validateFile = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Please upload a valid image (JPEG, PNG, WebP, GIF, BMP) or video (MP4, MOV, AVI, MKV, WebM, FLV, WMV) file.';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 50MB.';
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleModelSelect = (model: DetectionModel) => {
    setSelectedModel(model);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAuthError = (message: string) => {
    const normalized = message.toLowerCase();
    if (
      normalized.includes('token') ||
      normalized.includes('unauthorized') ||
      normalized.includes('authentication') ||
      normalized.includes('expired') ||
      normalized.includes('invalid')
    ) {
      api.clearToken();
      toast.error('Your session expired. Please sign in again.');
      navigate('auth');
      return true;
    }
    return false;
  };

  const startDetection = async () => {
    if (!file) {
      setError('Please select a file to analyze.');
      return;
    }
    
    setError(null);
    setUploading(true);
    setAnalyzing(true);
    setProgress(0);

    try {
      let detection: DetectionResult | null = null;

      if (USE_MOCK_API && mockApiInstance) {
        const response = await mockApiInstance.detectDeepfake(file, setProgress);
        detection = {
          ...response.result,
          confidence: response.result.confidence,
        };
      } else {
        const response = await api.detectDeepfake(file, setProgress);
        detection = response;
      }

      if (detection) {
        const normalizedDetection: DetectionResult = {
          ...detection,
          modelUsed: detection.modelUsed ?? selectedModel?.name,
        };
        await addDetectionResult(normalizedDetection);
        removeFile();
        setTimeout(() => navigate('results'), 100);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze the file. Please try again.';
      setError(message);
      if (!handleAuthError(message)) {
        toast.error(message);
      }
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const analyzeImageUrl = async () => {
    if (!imageUrl.trim()) {
      setError('Enter an image URL to analyze.');
      return;
    }

    if (USE_MOCK_API && mockApiInstance) {
      const message = 'URL-based analysis is only supported against the real API.';
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);
    setIsUrlSubmitting(true);

    try {
      const response = await api.detectFromUrl(imageUrl.trim());
      const normalizedDetection: DetectionResult = {
        ...response,
        modelUsed: response.modelUsed ?? selectedModel?.name,
      };
      await addDetectionResult(normalizedDetection);
      setImageUrl('');
      setTimeout(() => navigate('results'), 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to analyze this URL.';
      setError(message);
      if (!handleAuthError(message)) {
        toast.error(message);
      }
    } finally {
      setIsUrlSubmitting(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return Upload;
    
    if (file.type.startsWith('image/')) {
      return Image;
    } else if (file.type.startsWith('video/')) {
      return Video;
    }
    return Upload;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FileIcon = getFileIcon();

  return (
    <div className="flex h-screen bg-[#E5E5E5]">
      <Navigation navigate={navigate} currentPage="upload" user={user} logout={logout} />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold mb-2 text-[#1F1F1F]">
                Upload Media for Analysis
              </h1>
              <p className="text-muted-foreground text-lg">
                Upload your image or video file to detect potential deepfake manipulation using advanced AI
              </p>
            </motion.div>

            <Card className="border border-dashed border-[#bcbcbc] bg-white/80">
              <CardContent className="p-6 space-y-4">
                <p className="text-sm uppercase tracking-[0.4em] text-[#4BA3A4]">Analyze via URL</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://newsroom.example/photo.jpg"
                    className="flex-1 rounded-md border border-[#d1d1d1] bg-white px-4 py-2 text-sm"
                  />
                  <Button
                    onClick={analyzeImageUrl}
                    disabled={isUrlSubmitting}
                    className="bg-[#4BA3A4] text-white hover:bg-[#469597]"
                  >
                    {isUrlSubmitting ? 'Analyzing…' : 'Analyze URL'}
                  </Button>
                </div>
                <p className="text-xs text-[#6b6b6b]">
                  Newsight downloads the file securely and applies the same explainable pipeline.
                </p>
              </CardContent>
            </Card>

            {/* Upload Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border border-[#dedede] shadow-sm bg-[#FAFAFA] relative overflow-hidden">
                <div className="absolute inset-0 bg-[#f6f6f6]"></div>
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="w-8 h-8 bg-[#1F1F1F] text-white rounded-lg flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    AI-Powered Detection Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <AnimatePresence mode="wait">
                    {!file ? (
                      <motion.div
                        key="upload-zone"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div
                          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 relative overflow-hidden ${
                            dragOver 
                              ? 'border-[#4BA3A4] bg-[#E5F2F2] shadow-lg scale-105' 
                              : 'border-[#cfcfcf] hover:border-[#4BA3A4] hover:bg-[#F2F8F8]'
                          }`}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {dragOver && (
                            <motion.div
                              className="absolute inset-0 bg-[#4BA3A4]/10 rounded-xl"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                          
                          <motion.div 
                            className="w-20 h-20 bg-[#1F1F1F] rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
                            animate={{ 
                              scale: dragOver ? [1, 1.1, 1] : 1,
                              rotate: dragOver ? [0, 5, -5, 0] : 0
                            }}
                            transition={{ duration: 0.5 }}
                          >
                            <Upload className="h-10 w-10 text-white" />
                            <motion.div
                              className="absolute inset-0 bg-white/20 rounded-2xl"
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </motion.div>
                          
                          <h3 className="text-xl font-bold mb-2 text-gray-800">
                            {dragOver ? 'Drop your file here!' : 'Drag and drop your media file'}
                          </h3>
                          <p className="text-gray-600 mb-8 text-lg">
                            or click to browse from your device
                          </p>
                          
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button 
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-[#1F1F1F] text-white hover:bg-[#1F1F1F]/90 text-lg px-8 py-3 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                              size="lg"
                            >
                              <Zap className="mr-2 h-5 w-5" />
                              Choose File
                            </Button>
                          </motion.div>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                          
                          <p className="text-sm text-gray-500 mt-6 leading-relaxed">
                            Supported formats: <span className="font-medium">JPEG, PNG, WebP, MP4, MOV, AVI</span><br />
                            Maximum file size: <span className="font-medium">50MB</span>
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="file-preview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                      >
                        {/* File Preview */}
                        <motion.div 
                          className="flex items-center gap-4 p-6 bg-[#F1F1F1] rounded-xl border border-[#dadada]"
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <motion.div 
                            className="w-16 h-16 bg-[#1F1F1F] rounded-xl flex items-center justify-center"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                          >
                            <FileIcon className="h-8 w-8 text-white" />
                          </motion.div>
                          <div className="flex-1">
                            <p className="font-semibold text-lg text-gray-800">{file.name}</p>
                            <p className="text-[#4BA3A4] font-medium">{formatFileSize(file.size)}</p>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={removeFile}
                              disabled={uploading || analyzing}
                              className="hover:bg-red-100 hover:text-red-600"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          </motion.div>
                        </motion.div>

                        {/* Upload Progress */}
                        <AnimatePresence>
                          {(uploading || analyzing) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <motion.span 
                                  className="font-medium text-lg"
                                  animate={{ color: uploading ? "#1F1F1F" : "#4BA3A4" }}
                                >
                                  {uploading ? 'Uploading...' : 'AI Analysis in Progress...'}
                                </motion.span>
                                <span className="text-muted-foreground font-medium">
                                  {uploading ? `${progress}%` : 'Processing'}
                                </span>
                              </div>
                              <Progress value={uploading ? progress : undefined} className="h-3" />
                              {analyzing && (
                                <motion.div 
                                  className="flex items-center gap-3 text-[#1F1F1F] bg-[#E5F2F2] p-4 rounded-lg"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                >
                                  <motion.div 
                                    className="w-5 h-5 border-2 border-[#4BA3A4] border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  />
                                  <span className="font-medium">
                                    Our advanced AI is scanning for deepfake patterns and anomalies...
                                  </span>
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Model Selection */}
                        {!uploading && !analyzing && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-4"
                          >
                            <Separator className="my-6" />
                            
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-[#4BA3A4]" />
                                <h3 className="text-lg font-semibold text-gray-800">
                                  Choose Detection Model
                                </h3>
                              </div>
                              
                              <Select value={selectedModel?.id} onValueChange={(value) => {
                                const model = DETECTION_MODELS.find(m => m.id === value);
                                if (model) setSelectedModel(model);
                              }}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a model">
                                    {selectedModel && (
                                      <div className="flex items-center gap-2">
                                        <span>{selectedModel.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {selectedModel.description}
                                        </Badge>
                                        {selectedModel.isPremium && (
                                          <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-xs">
                                            <Crown className="w-3 h-3 mr-1" />
                                            Pro
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {DETECTION_MODELS.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{model.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {model.description}
                                        </Badge>
                                        {model.isPremium && (
                                          <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-xs">
                                            <Crown className="w-3 h-3 mr-1" />
                                            Pro
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Action Button */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="pt-4"
                            >
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button 
                                  onClick={startDetection}
                                  disabled={!file || uploading}
                                  className="w-full bg-[#1F1F1F] text-white hover:bg-[#1F1F1F]/90 text-lg py-4 h-auto shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  size="lg"
                                >
                                  <Brain className="h-5 w-5 mr-2" />
                                  Start {selectedModel?.name || 'AI'} Detection
                                </Button>
                              </motion.div>
                            </motion.div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700 font-medium">
                            {error}
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="mt-8 border border-[#dedede] bg-[#FAFAFA] shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className="w-8 h-8 bg-[#1F1F1F] text-white rounded-full flex items-center justify-center mt-1"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <CheckCircle className="h-4 w-4 text-white" />
                    </motion.div>
                    <div>
                      <p className="font-semibold text-[#1F1F1F] mb-2 text-lg">Your privacy is our priority</p>
                      <p className="text-[#4f4f4f] leading-relaxed">
                        All files are processed with military-grade encryption and automatically deleted after analysis. 
                        We never store your media, share it with third parties, or use it for training purposes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

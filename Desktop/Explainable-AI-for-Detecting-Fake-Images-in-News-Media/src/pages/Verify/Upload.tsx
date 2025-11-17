import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useVerification } from '@/hooks/useVerification';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { PredictionResponse } from '@/api/api';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { createVerification, isCreating } = useVerification();
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, JPEG, PNG, or WEBP)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = () => {
    if (!selectedFile) return;

    createVerification(selectedFile, {
      onSuccess: (payload) => {
        const predictionPayload = payload as PredictionResponse;
        const analysisId =
          predictionPayload?.analysis?.id ??
          predictionPayload?.analysis?.analysis_id ??
          (payload as { analysis_id?: string | number })?.analysis_id;

        if (predictionPayload?.analysis && analysisId) {
          navigate(`/verify/result/${String(analysisId)}`, {
            state: { prediction: predictionPayload },
          });
          return;
        }

        const jobId =
          (payload as { job_id?: string | number })?.job_id ??
          (payload as { id?: string | number })?.id;
        const verificationId =
          (payload as { verification_id?: string | number })?.verification_id ??
          (payload as { id?: string | number })?.id;

        const nextId = jobId ?? verificationId ?? analysisId;
        if (!nextId) {
          toast.error('Could not determine verification job. Please try again.');
          return;
        }

        navigate(`/verify/processing/${String(nextId)}`);
      },
    });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Verify an Image</h1>
          <p className="text-muted-foreground">
            Upload an image to begin verification. We'll guide you through the process.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>
              Supported formats: JPG, JPEG, PNG, WEBP (Max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-96 mx-auto rounded-lg"
                  />
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                    >
                      Remove
                    </Button>
                    <Button onClick={handleSubmit} disabled={isCreating}>
                      {isCreating ? 'Uploading...' : 'Start Verification'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">
                      Drag and drop your image here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">or</p>
                    <label htmlFor="file-upload">
                      <Button asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadPage;

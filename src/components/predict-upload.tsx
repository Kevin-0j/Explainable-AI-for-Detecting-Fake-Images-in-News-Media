// src/components/PredictUpload.tsx
import React, { useState } from "react";
import { uploadImage } from "@/utils/fastapi";
import { BACKEND_URL } from "@/utils/backend-config";
import { useAuth } from "@/contexts/AuthContext";

interface Result {
  label: string;
  pred_class: number;
  confidence: number;
  file_url: string;
  gradcam_url?: string;
  lime_url?: string;
  explanation_error?: string | null;
}

export default function PredictUpload() {
  const { accessToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    setError(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return setError("Please choose an image");
    if (!accessToken) return setError("You need to sign in before uploading.");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await uploadImage(file, accessToken);

      const makeAbsolute = (p?: string | null) => {
        if (!p) return undefined;
        if (/^https?:\/\//i.test(p)) return p;
        if (p.startsWith("/")) return `${BACKEND_URL}${p}`;
        if (p.startsWith("uploads/")) return `${BACKEND_URL}/${p}`;
        return `${BACKEND_URL}/uploads/images/${p}`;
      };

      setResult({
        ...res,
        file_url: makeAbsolute(res.file_url) as string,
        gradcam_url: makeAbsolute(res.gradcam_url ?? "") as string,
        lime_url: makeAbsolute(res.lime_url ?? "") as string,
      });
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-2">Instant Prediction</h3>

      <input type="file" accept="image/*" onChange={handleFileChange} />
      <div className="mt-3">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          {loading ? "Analyzing..." : "Upload & Predict"}
        </button>
      </div>

      {error && <div className="mt-3 text-red-600">{error}</div>}

      {result && (
        <div className="mt-4">
          <div>
            <strong>Label:</strong> {result.label}
          </div>
          <div>
            <strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%
          </div>

          <div className="flex gap-4 mt-4">
            <div>
              <div className="text-sm">Original</div>
              <img src={result.file_url} alt="original" style={{ maxWidth: 240 }} />
            </div>
            <div>
              <div className="text-sm">Grad-CAM</div>
              {result.gradcam_url ? (
                <img src={result.gradcam_url} alt="grad" style={{ maxWidth: 240 }} />
              ) : (
                <div className="text-sm text-muted">No gradcam</div>
              )}
            </div>
            <div>
              <div className="text-sm">LIME</div>
              {result.lime_url ? (
                <img src={result.lime_url} alt="lime" style={{ maxWidth: 240 }} />
              ) : (
                <div className="text-sm text-muted">No lime</div>
              )}
            </div>
          </div>

          {result.explanation_error && (
            <div className="mt-2 text-yellow-700">
              Explanation error: {result.explanation_error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

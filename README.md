# NewsSight — Hybrid CNN-Based Fake Image & Video Detection System

**Explainable AI for Detecting Forged Images and Videos in Online News, Social Media, and Broadcast Media**

NewsSight is an end-to-end deep learning system designed to detect forged images and videos using **two specialized ResNet18 models** and **explainable AI techniques** (Grad-CAM + optional LIME). It features a production-ready **FastAPI backend** with JWT authentication, model switching, video frame analysis, history tracking, and automated reporting.

Perfect for journalists, fact-checkers, newsrooms, and digital forensics teams.

---

## Project Overview

Manipulated media spreads rapidly across:
- Online news websites
- WhatsApp, Facebook, Instagram, TikTok, and X (Twitter)
- Re-shared television clips

**NewsSight** tackles this with:
- Two complementary CNN models for different forgery types
- Full image & video verification pipeline
- Transparent, interpretable predictions via Grad-CAM
- Secure, scalable FastAPI backend
- CPU-only inference — runs anywhere

---

## Models

| Model                        | Training Data                                      | Purpose                                  | Performance              |
|-----------------------------|-----------------------------------------------------|------------------------------------------|--------------------------|
| **StyleGAN-ResNet18**       | Clean StyleGAN vs Real images                       | Detect high-quality AI-generated images  | **95.50% Accuracy**      |
| **Combined-ResNet18**       | COCO + Fakeddit + StyleGAN + FaceForensics++        | Real-world misinformation & deepfakes    | **F1 ≈ 0.725** (high recall) |

### Model Switching
Switch models on-the-fly via API:
```bash
GET  /models           → List available models
POST /models/select    → Choose active model
```

## Key Features

- **Dual-Model Hybrid Architecture**  
  Switch instantly between two expert models:
  - **StyleGAN-ResNet18** → 95.5% accuracy on clean AI-generated forgeries
  - **Combined-ResNet18** → High recall on noisy, real-world misinformation (screenshots, memes, deepfakes)

- **Full Image & Video Analysis Pipeline**  
  - Supports JPG, PNG, MP4, MOV, and more
  - Smart video sampling: up to **30 frames at 1 FPS**
  - Per-frame prediction + overall **fake ratio**
  - Grad-CAM heatmap on the most suspicious frame

- **Trustworthy & Explainable Outputs**  
  - Visual Grad-CAM heatmaps (shows exactly what the model "sees")
  - Optional LIME for fine-grained patch-level explanations
  - Helps journalists justify decisions with evidence

- **Production-Grade FastAPI Backend**  
  - JWT-based authentication & user management
  - Full analysis history & search
  - Admin analytics dashboard
  - Model switching via API
  - Automatic report generation

- **Runs Anywhere — No GPU Required**  
  - Fully optimized for CPU inference
  - Tested on MacBook, laptops, and low-cost servers
  - Ideal for field journalists and small newsrooms

---

## Tech Stack

- **Backend**: FastAPI + Uvicorn + SQLAlchemy
- **ML**: PyTorch, ResNet18, pytorch-grad-cam
- **Processing**: OpenCV, ffmpeg, Pillow
- **Auth**: JWT (PyJWT)
- **Deployment**: CPU-only, lightweight, portable

---

## Project Structure

```
NewsSight/
├── backend/              # FastAPI app, routes, services
├── datasets/             # Training data & manifests
├── models/               # Trained .pth files (not in Git)
├── notebooks/            # Training & experimentation
├── frontend/             # Optional React frontend
├── defense.md            # Full technical report
└── README.md             # This file
```


---

## Quick Start

```bash
git clone https://github.com/Kevin-0j/NewsSight.git
cd NewsSight

# Create virtual env
python3 -m venv venv && source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate                        # Windows

pip install --upgrade pip
pip install -r requirements.txt

# Optional: lighter CPU-only PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Train models → Place .pth files in /models/ → Run:

Bashuvicorn backend.main:app --reload
API: http://127.0.0.1:8000 | Docs: http://127.0.0.1:8000/docs

# Login & get token
curl -X POST http://127.0.0.1:8000/login -d '{"username":"user","password":"pass"}'

# Analyze image
curl -X POST http://127.0.0.1:8000/predict -H "Authorization: Bearer <token>" -F "file=@suspect.jpg"

# Analyze video
curl -X POST http://127.0.0.1:8000/predict -H "Authorization: Bearer <token>" -F "file=@clip.mp4"

# Get explanation
curl http://127.0.0.1:8000/explain?analysis_id=5

# Switch model
curl -X POST http://127.0.0.1:8000/models/select -H "Content-Type: application/json" -d '{"model_name":"combined_resnet18"}'

```

## Troubleshooting

| Issue                        | Solution                                                                                   |
|------------------------------|--------------------------------------------------------------------------------------------|
| Model not loading            | Ensure `.pth` files are placed in the `models/` directory                                 |
| CUDA-related errors          | Ignore — the system is **CPU-only** by design. No GPU needed                               |
| Video files not processed    | Install ffmpeg: <br>`sudo apt install ffmpeg` (Ubuntu) <br>`brew install ffmpeg` (macOS)   |
| Port 8000 already in use     | Start server on a different port: <br>`uvicorn backend.main:app --reload --port 5001`      |
| Authentication errors        | Make sure you send a valid JWT in the header: <br>`Authorization: Bearer <your-token>`     |

---

## Future Work

- Replace ResNet18 with modern backbones (Vision Transformers, ConvNeXt)
- Export models to ONNX/TensorRT for even faster CPU inference
- Integrate reverse image search (Google/Tineye) and metadata analysis
- Add temporal deepfake detection (X3D, TimeSformer)
- Implement active learning loop with real journalist feedback

---

## Summary

**NewsSight** is a **complete, production-ready, journalist-focused** fake media detection platform that delivers:

- **Hybrid dual-model strategy** — high accuracy on clean AI forgeries + robust performance on messy real-world content (screenshots, memes, deepfakes)
- **Full image & video analysis** with smart frame sampling and fake-ratio scoring
- **Transparent explainability** via Grad-CAM heatmaps (and optional LIME)
- **Secure FastAPI backend** with JWT authentication, model switching, history tracking, and admin analytics
- **Zero GPU dependency** — runs efficiently on any laptop or server

Designed from day one for **newsrooms, fact-checkers, and field journalists** who need trustworthy, explainable, and immediately deployable tools in the fight against misinformation.

**© 2025 Kevin Omondi Ojwang**  
*Explainable AI • Media Forensics • Responsible Journalism*

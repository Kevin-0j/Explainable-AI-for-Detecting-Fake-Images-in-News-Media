# NewsSight — Hybrid CNN-Based Fake Image & Video Detection System  
**Explainable AI for Detecting Forged Images and Videos in Online News, Social Media, and Broadcast Media**

NewsSight is an end-to-end deep learning system for detecting forged images and videos using two hybrid CNN models and explainable AI methods (Grad-CAM and LIME). It includes a full FastAPI backend, JWT authentication, model switching, video frame analysis, and a production-ready analysis pipeline.

---

# Project Overview

Fake and manipulated media spreads rapidly across:

- Online news platforms  
- WhatsApp groups and Facebook posts  
- TikTok, Instagram, and X (Twitter)  
- Television broadcast clips re-shared online  

NewsSight addresses this challenge by providing:

### ✔️ Two specialized ResNet18-based models  
### ✔️ Full image and video verification pipeline  
### ✔️ Explainability through Grad-CAM and optional LIME  
### ✔️ A production-ready FastAPI backend with JWT auth  
### ✔️ Automated reports, history tracking, and analytics  

---

# Models

## **1. StyleGAN-ResNet18 (Synthetic Forgeries)**
- Trained on: **StyleGAN vs Real dataset**  
- Purpose: Detect high-quality AI-generated synthetic images  
- Best Val Accuracy: **95.50%**

## **2. Combined-ResNet18 (Real-World Misinformation)**
- Trained on: COCO + Fakeddit + StyleGAN + FaceForensics++  
- Purpose: Detect real-world manipulated images & deepfake frames  
- Best F1: **0.7249**

### Model Switching  
The backend exposes:
-GET /models
-POST /models/select

Allowing journalists to choose which model to analyze with.

---

#  Key Features

### Image Forgery Detection  
High confidence, explainable predictions for real vs fake images.

### Video Forgery Detection  
- Extract up to **30 frames** at **1 FPS**  
- Run inference per frame  
- Compute fake ratio  
- Return video-level prediction  
- Generate Grad-CAM for representative frame  

### Explainability  
- Grad-CAM overlays  
- LIME (optional, disabled by default)  

### Full API Backend  
- JWT authentication  
- User management  
- History logging  
- Admin dashboards  
- Storage usage endpoints  

---

# Requirements

- **Python 3.10+**
- FastAPI, Uvicorn
- PyTorch + Torchvision
- OpenCV + ffmpeg
- pytorch-grad-cam
- PIL / Pillow

### Hardware  
- **Training:** Google Colab CPU (free tier)  
- **Development:** MacBook M3, 256GB SSD  
- **Inference:** CPU-only supported  

---

# Local Setup

## 1. Clone the repository

```bash
git clone https://github.com/Kevin-0j/NewsSight.git
cd NewsSight
```

# NewsSight Setup & Usage Guide

## 2. Create a Virtual Environment

### macOS/Linux
```bash
python3 -m venv venv
source venv/bin/activate
```
### Windows
```bash
python -m venv venv
venv\Scripts\activate
```
### Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### (Optional) Install lighter CPU-only PyTorch
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Training the Models

## Note: Model checkpoints are NOT committed to GitHub.
You must train them locally or upload your own .pth files.

## Train StyleGAN Model (Model A)

-Open Jupyter:
-jupyter notebook
-Run the notebook:
```bash
notebooks/train_stylegan_resnet18.ipynb
```
-Outputs saved to:
```bash
models/stylegan_resnet18.pth
```
-Train Combined Model (Model B)

-Run:
```bash
notebooks/train_combined_resnet18.ipynb
```
Outputs saved to:
```bash
models/combined_resnet18.pth
```

### Running the Backend API
-Start FastAPI Server

-From backend/:
```bash
uvicorn backend.main:app --reload
```

-API available at:
```bash
http://127.0.0.1:5000
```

-Test Health Endpoint
```bash
curl http://127.0.0.1:5000/health
```
-Predict Real/Fake (Image)
-Multipart Upload
```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Authorization: Bearer <token>" \
  -F "file=@example.jpg"
```
-Image via URL
```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Authorization: Bearer <token>" \
  -F "image_url=https://example.com/image.jpg"
```

-Predict Real/Fake (Video)
```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Authorization: Bearer <token>" \
  -F "file=@video.mp4"
```
-Get Grad-CAM Explanation
```bash
curl http://127.0.0.1:5000/explain?analysis_id=12
```
-Switch Models
-List All Models
```bash
curl http://127.0.0.1:5000/models
```
-Select Model
```bash
curl -X POST http://127.0.0.1:5000/models/select \
  -H "Content-Type: application/json" \
  -d '{"model_name":"stylegan_resnet18"}'
```

### Project Structure

```
NewsSight/
├── backend/
│   ├── main.py                # FastAPI entry point
│   ├── routes.py              # All endpoints
│   ├── services/              # Processing logic
│   ├── models/                # ORM & DB models
│   ├── explainability/        # GradCAM + LIME utils
│   ├── utils/                 # Video/image utils
│   └── database.py            # SQLAlchemy session
│
├── datasets/
│   ├── images/
│   ├── manifests/
│   └── deepfake_real/
│
├── models/                    # Saved .pth weights
│
├── notebooks/                 # Training notebooks
│
├── frontend/                  # React frontend (if included)
│
├── defense.md                 # Technical defense report
└── README.md                  # This file

```

### Release Packaging

-You may upload the following to GitHub Releases:

```bash
stylegan_resnet18.pth
combined_resnet18.pth
```

-Dataset manifests
-Full backend & notebooks
-Demo screenshots
-Sample media

-Recommended release ZIP:
```bash
newssight-v1.0.zip
```

###Troubleshooting

##Model not loading?

-Make sure models exist in:
```bash
models/stylegan_resnet18.pth
models/combined_resnet18.pth
```
##CUDA errors?

-Ignore — system is CPU-only by design.

## Video not processed?

-Install ffmpeg:
```bash
sudo apt install ffmpeg
```
## Server port in use?
```bash
uvicorn backend.main:app --reload --port 5001
```
### Authentication Flow

-POST /register

-POST /login → returns JWT

-Protected routes require:

-Authorization: Bearer <token>

### Future Work

-Vision Transformers (ViT / ConvNeXt)

-ONNX Runtime for faster inference

-Metadata + reverse image search integration

-Temporal deepfake detection (X3D, TimeSformer)

-Active learning & retraining loop

### Summary

NewsSight is a complete, production-oriented fake media detection system supporting:

Hybrid CNN model architecture

Image & video forgery detection

Grad-CAM & LIME explainability

FastAPI backend with JWT auth

Model switching

Real-world misinformation robustness

This README provides everything needed to run, train, deploy, and extend the system.

© 2025 — Kevin Omondi Ojwang
Explainable AI · Media Forensics · Computer Vision

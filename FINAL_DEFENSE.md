# NewsSight: An Explainable CNN-Based System for Detecting Forged Images and Videos in Online News and Social Media

**Technical Defense Report**  
**Student:** Kevin Omondi Ojwang  
**Project:** Final Year Project – BSc Informatics & Computer Science  
**System Name:** NewsSight  
**Models:** StyleGAN-ResNet18 & Combined-ResNet18  
**Date:** November 2025  

---

## 1. Executive Summary

NewsSight is an end-to-end **image and video forgery detection system** designed for **newsrooms, social media fact-checkers, media verification desks, and digital journalists**.  

The system integrates two specialized CNN models trained on different data domains:

- **Model A: StyleGAN-ResNet18 (High Accuracy)**  
  Trained on clean StyleGAN vs Real images.  
  Achieves **95.5% accuracy** and strong F1 scores.  
  Best for **AI-generated synthetic images**.

- **Model B: Combined-ResNet18 (Real-World Robustness)**  
  Trained on COCO + Fakeddit + StyleGAN + FaceForensics++.  
  Achieves **F1 ≈ 0.72** with high recall for Fake.  
  Best for **social media, screenshots, political misinformation**, and noisy real-world images.

The NewsSight backend supports:
- Image and video forgery detection
- Up to **30 frames per video** at **1 FPS**
- Explainability via **Grad-CAM** and optional **LIME**
- JWT authentication, history tracking, and admin analytics

The system is optimized to run on **CPU-only environments**, making it practical for deployment in lightweight newsroom settings or field verification environments.

---

## 2. Approach

### 2.1 Problem Definition and Scope

Modern misinformation relies heavily on manipulated images and videos shared across:
- Online news articles
- Social media platforms (Facebook, X/Twitter, TikTok, WhatsApp)
- Reposted or televised broadcast clips

This project tackles **binary classification**:
- **Fake** – AI-generated, manipulated, or forged
- **Real** – authentic content

Implemented with:
- CNN architectures
- Explainability modules (Grad-CAM, LIME)
- Video frame aggregation
- A full production-like REST API

### 2.2 Why Two Models?

Because the problem space falls into **two different domains**:

| Domain                  | Description                                    | Difficulty | Best Model |
|-------------------------|------------------------------------------------|------------|------------|
| Synthetic AI-generated  | Clean, high-res, GAN-created faces & scenes    | Low        | Model A    |
| Real-world misinformation | Screenshots, memes, political images, deepfakes | High       | Model B    |

A single model cannot handle both domains effectively due to:
- Domain shift
- Label noise
- Huge differences in texture/quality

**Hybrid strategy = stronger overall system reliability.**

---

## 3. Data Strategy

### 3.1 StyleGAN Dataset (Model A)

- Directory: `/datasets/images/stylegan`
- Total: **12,890 images**
- Train: **10,312**
- Val: **2,578**

Label distribution:
- Fake: **54.31%**
- Real: **45.69%**

**Strengths:**
- Clean, balanced
- Consistent resolution
- Perfect for training high-accuracy detectors

### 3.2 Combined Dataset (Model B)

Includes:
- **COCO** (Real images)
- **Fakeddit** (Memes, misinformation)
- **StyleGAN**
- **FaceForensics++** (Deepfake frames)

Folder counts:
- COCO → 5,000
- Fakeddit → 65,730
- StyleGAN → 12,890

**Challenges:**
- Noisy labels
- Varying resolutions
- Compression artefacts
- Watermarks, text overlays

This dataset is more realistic but harder, making Model B more robust in social-media environments.

---

## 4. Preprocessing & Input Pipelines

### 4.1 Image Pipeline

All images standardized to **224x224** with ImageNet normalization.

#### Augmentations (Model A)
- Resize
- HorizontalFlip
- Rotation
- ColorJitter

#### Augmentations (Model B)
- RandomResizedCrop
- Color jitter
- CenterCrop for validation

### 4.2 Video Pipeline

**Constraints:**
- **1 frame per second**
- **Max 30 frames per video**
- Prevent memory explosion
- Maintain temporal diversity

**Pipeline:**
1. Detect file extension
2. Extract frames
3. Resize → normalize (same as image pipeline)
4. Predict per-frame
5. Aggregate to form `fake_ratio`
6. Pick best frame for Grad-CAM

---

## 5. Model Architecture and Training

### 5.1 Backbone: ResNet18

**Reasons:**
- Lightweight
- Fast on CPU
- Strong performance
- Grad-CAM friendly

### 5.2 Model A – StyleGAN-ResNet18

- Optimizer: Adam (`lr=1e-5`)
- Epochs: 8
- Accuracy: **0.9550**

**Training pattern:**
- Gradual improvement
- No overfitting
- High generalization due to clean dataset

### 5.3 Model B – Combined-ResNet18

- Optimizer: Adam (`lr=1e-4`)
- WeightedRandomSampler
- Early stopping
- Best F1: **0.7249**

**Model behavior:**
- High Fake recall
- Lower Fake precision
- Ideal for early-warning screening

---

## 6. Evaluation

### 6.1 Model Comparison Table

| Aspect            | Model A   | Model B      |
|-------------------|-----------|--------------|
| Accuracy          | **0.955** | 0.62–0.72    |
| Fake F1           | **0.93**  | 0.55         |
| Real F1           | **0.94**  | 0.68         |
| Noise Tolerance   | Low       | **High**     |
| Best Use Case     | AI-generated detection | Social media misinformation |

### 6.2 Interpretation

- Model A is extremely precise and reliable on synthetic vs real.
- Model B mimics real-world newsroom needs.

---

## 7. Explainability (XAI)

### 7.1 Grad-CAM

- Generates heatmaps
- Highlights regions influencing prediction
- Works for frames and images

**Example insights:**
- GAN faces → focus on texture inconsistencies
- Fake images → sharp edges, blurred backgrounds

### 7.2 LIME (Optional)

- Patch-level interpretability
- More computationally heavy

### Why Explainability Matters

Journalists **must not blindly trust the model**.  
Heatmaps justify editorial decisions.

---

## 8. Backend API Design

### 8.1 Main Endpoints

- `/models`
- `/models/select`
- `/predict`
- `/explain`
- `/explain/lime/<analysis_id>`
- `/report/<analysis_id>`
- `/history`
- `/admin/*`

### 8.2 `/predict` Input

- JWT required
- Multipart file upload
- Optional `image_url`
- Supports video uploads

### 8.3 Output

```json
{
  "prediction": "fake",
  "confidence": 0.92,
  "gradcam_heatmap": "...",
  "video_analysis": { ... }
}

## 9. Challenges

### 9.1 Dataset Challenges
- **Domain mismatch**
- **Label noise**
- **Missing or corrupted images**

### 9.2 Model Challenges
- **Overfitting on clean data**
- **Balancing recall vs precision**

### 9.3 Hardware Constraints
- **CPU-only**
- **No GPU acceleration**
- **Long training times**

### 9.4 Video Challenges
- **Mixed scenes**
- **Compression**
- **Lighting changes**

---

## 10. Ethical Considerations
- **Dataset demographic bias**
- **Risk of false positives harming journalists**
- **Misuse of classification results**
- **Importance of human-in-the-loop**

---

## 11. Future Improvements

### Short-Term
- Threshold tuning  
- UI improvements  
- Per-frame confidence visualization  

### Medium-Term
- ViT / ConvNeXt training  
- Deeper video models  

### Long-Term
- Metadata-based verification  
- Fairness audits  
- Active learning loop  

---

## 12. Conclusion

NewsSight successfully demonstrates:

- Hybrid CNN-based forgery detection  
- High-accuracy model for AI-generated images  
- Robust model for real-world misinformation  
- Full video analysis pipeline  
- Explainability via Grad-CAM and LIME  
- Production-ready backend with authentication  

It is a complete, practical, and explainable system suitable for real-world media verification.

---

## 13. Appendix

### 13.1 Dataset Locations
- datasets/images/stylegan  
- datasets/images/coco  
- datasets/images/fakeddit  
- datasets/manifests/combined_train.csv  

### 13.2 Checkpoints
- models/checkpoints/stylegan_resnet18_best.pth  
- models/checkpoints/combined_resnet18_best.pth  

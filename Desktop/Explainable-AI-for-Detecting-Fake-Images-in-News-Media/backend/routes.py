
import base64
import hashlib
import os
import tempfile
from datetime import datetime
from io import BytesIO
from uuid import uuid4
from typing import Optional, Tuple

import cv2
import imageio
import imageio_ffmpeg
import numpy as np
import torch
import torch.nn.functional as F
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from sqlalchemy import func, case
from openai import OpenAI

from .extensions import bcrypt, db
from .models import (
    AnalysisResult,
    DetectionModel,
    MediaFile,
    SystemLog,
    User,
)
from .lime_utils import generate_lime_visualization
from .utils.media_fetch import RemoteMediaError, fetch_image_from_url

api_bp = Blueprint('api', __name__)

# ---- ML Model Configuration ----
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "flv", "wmv"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "model", "combined_resnet18_best.pth"
)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DEFAULT_MODEL_NAME = "ResNet18-Combined"
DEFAULT_MODEL_VERSION = "1.0.0"
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Video processing settings
FRAMES_PER_SECOND = 1  # Extract 1 frame per second
MAX_FRAMES = 30  # Maximum frames to process per video

# Load model at startup
model = None
try:
    model = models.resnet18(weights=None)
    model.fc = torch.nn.Linear(512, 2)  # Binary classification: REAL (0) or FAKE (1)

    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
        state_dict = checkpoint["state_dict"]
    else:
        state_dict = checkpoint

    # strip common prefixes if present
    cleaned_state_dict = {}
    for key, value in state_dict.items():
        new_key = key
        if new_key.startswith("module."):
            new_key = new_key[len("module.") :]
        cleaned_state_dict[new_key] = value

    model.load_state_dict(cleaned_state_dict, strict=False)
    model.to(DEVICE)
    model.eval()
    print(f"[OK] Model loaded successfully: {MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] Failed to load model: {e}")

# Face detection initialization using OpenCV DNN
face_detector = None
try:
    # Try to load OpenCV DNN face detector
    # Download the model files if they don't exist
    import urllib.request
    import os.path
    
    # Model files for OpenCV DNN face detector
    prototxt_path = os.path.join(os.path.dirname(__file__), 'deploy.prototxt')
    model_path = os.path.join(os.path.dirname(__file__), 'res10_300x300_ssd_iter_140000.caffemodel')
    
    # If model files don't exist, we'll use a simpler method
    if os.path.exists(prototxt_path) and os.path.exists(model_path):
        face_detector = cv2.dnn.readNetFromCaffe(prototxt_path, model_path)
        print("[OK] Face detector (OpenCV DNN) loaded successfully")
    else:
        # Use OpenCV Haar Cascade as fallback
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        if os.path.exists(cascade_path):
            face_detector = cv2.CascadeClassifier(cascade_path)
            print("[OK] Face detector (OpenCV Haar Cascade) loaded successfully")
        else:
            print("[WARNING] OpenCV face detection models not found. Using center crop fallback.")
            face_detector = None
except Exception as e:
    print(f"[WARNING] Face detector initialization failed: {e}. Using fallback method.")
    face_detector = None

# Image preprocessing pipeline
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def is_video_file(filename: str) -> bool:
    """Check if file is a video."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def detect_and_crop_face(image: Image.Image) -> Tuple[Optional[Image.Image], dict]:
    """
    Detect face in image and return cropped face region.
    Returns: (cropped_face_image, detection_info)
    detection_info contains: {'detected': bool, 'confidence': float, 'bbox': tuple}
    """
    detection_info = {'detected': False, 'confidence': 0.0, 'bbox': None}
    
    if face_detector is None:
        # Fallback: return center crop if no face detector available
        width, height = image.size
        size = min(width, height)
        left = (width - size) // 2
        top = (height - size) // 2
        detection_info['bbox'] = (left, top, left + size, top + size)
        return image.crop((left, top, left + size, top + size)), detection_info
    
    try:
        # Convert PIL to numpy array (RGB)
        img_array = np.array(image)
        print(f"[FACE] Image shape: {img_array.shape}, dtype: {img_array.dtype}")
        
        if face_detector is None:
            raise Exception("Face detector not initialized")
        
        # Convert RGB to BGR for OpenCV
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        height, width = img_bgr.shape[:2]
        
        # Check if using DNN or Haar Cascade
        if hasattr(face_detector, 'setInput'):  # DNN detector
            print(f"[FACE] Running OpenCV DNN face detection...")
            # Create blob from image
            blob = cv2.dnn.blobFromImage(img_bgr, 1.0, (300, 300), [104, 117, 123])
            face_detector.setInput(blob)
            detections = face_detector.forward()
            
            faces = []
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > 0.5:  # Confidence threshold
                    x1 = int(detections[0, 0, i, 3] * width)
                    y1 = int(detections[0, 0, i, 4] * height)
                    x2 = int(detections[0, 0, i, 5] * width)
                    y2 = int(detections[0, 0, i, 6] * height)
                    w = x2 - x1
                    h = y2 - y1
                    faces.append({'box': (x1, y1, w, h), 'confidence': confidence})
            
            print(f"[FACE] DNN returned {len(faces)} face(s)")
        else:  # Haar Cascade
            print(f"[FACE] Running OpenCV Haar Cascade face detection...")
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            faces_detected = face_detector.detectMultiScale(gray, 1.1, 4)
            
            faces = []
            for (x, y, w, h) in faces_detected:
                # Haar cascade doesn't provide confidence, use area as proxy
                area = w * h
                confidence = min(1.0, area / (width * height * 0.1))  # Normalize by image area
                faces.append({'box': (x, y, w, h), 'confidence': confidence})
            
            print(f"[FACE] Haar Cascade returned {len(faces)} face(s)")
        
        if not faces or len(faces) == 0:
            print("[WARNING] No face detected in image")
            # Fallback to center crop
            size = min(width, height)
            left = (width - size) // 2
            top = (height - size) // 2
            detection_info['bbox'] = (left, top, left + size, top + size)
            return image.crop((left, top, left + size, top + size)), detection_info
        
        # Get the largest/most confident face
        largest_face = max(faces, key=lambda x: x['confidence'] * x['box'][2] * x['box'][3])
        
        # Extract bounding box [x, y, width, height]
        x, y, w, h = largest_face['box']
        confidence = largest_face['confidence']
        
        # Add padding (20% on each side)
        padding = int(min(w, h) * 0.2)
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(img_array.shape[1] - x, w + 2 * padding)
        h = min(img_array.shape[0] - y, h + 2 * padding)
        
        # Crop face region
        face_crop = image.crop((x, y, x + w, y + h))
        
        detection_info = {
            'detected': True,
            'confidence': confidence,
            'bbox': (x, y, x + w, y + h)
        }
        
        print(f"[FACE] Detected face: {w}x{h} at ({x}, {y}), confidence: {confidence:.3f}")
        return face_crop, detection_info
            
    except Exception as e:
        print(f"[ERROR] Face detection failed: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to center crop
        width, height = image.size
        size = min(width, height)
        left = (width - size) // 2
        top = (height - size) // 2
        detection_info['bbox'] = (left, top, left + size, top + size)
        return image.crop((left, top, left + size, top + size)), detection_info

def extract_video_frames(video_bytes: bytes) -> list:
    """
    Extract frames from video bytes.
    Returns list of PIL Images.
    """
    try:
        # Save video bytes to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
            tmp_file.write(video_bytes)
            tmp_path = tmp_file.name
        
        try:
            ffmpeg_exe = os.environ.get('IMAGEIO_FFMPEG_EXE')
            if not ffmpeg_exe:
                try:
                    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
                    os.environ['IMAGEIO_FFMPEG_EXE'] = ffmpeg_exe
                except Exception as ffmpeg_err:
                    raise Exception(f"FFmpeg executable not available: {ffmpeg_err}")
            
            # Use imageio to read video
            reader = imageio.get_reader(tmp_path, 'ffmpeg')
            fps = reader.get_meta_data().get('fps', 30)
            frame_interval = max(1, int(fps / FRAMES_PER_SECOND))
            
            frames = []
            frame_count = 0
            extracted_count = 0
            
            for frame in reader:
                if frame_count % frame_interval == 0:
                    # Convert numpy array to PIL Image
                    pil_image = Image.fromarray(frame)
                    frames.append(pil_image)
                    extracted_count += 1
                    
                    if extracted_count >= MAX_FRAMES:
                        break
                frame_count += 1
            
            reader.close()
            return frames
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    except Exception as e:
        raise Exception(f"Video frame extraction failed: {str(e)}")

def generate_gradcam(model, image_tensor, target_layer_name='layer4'):
    """
    Generate GRAD-CAM heatmap for the input image.
    Returns: (heatmap as numpy array, original image as numpy array)
    """
    if model is None:
        raise Exception("Model not loaded")
    
    # Set model to train mode temporarily to enable gradients
    # Gradients are only computed in train mode
    model.train()
    
    # Get the target layer (last conv layer in ResNet18)
    target_layer = None
    for name, module in model.named_modules():
        if name == target_layer_name:
            target_layer = module
            break
    
    if target_layer is None:
        raise Exception(f"Target layer '{target_layer_name}' not found")
    
    # Store activations and gradients
    activations = None
    gradients = None
    
    def forward_hook(module, input, output):
        nonlocal activations
        # Store activations (detach to avoid memory issues)
        activations = output.detach()
    
    def backward_hook(module, grad_input, grad_output):
        nonlocal gradients
        # grad_output is a tuple, get the first element if it exists
        if grad_output is not None and len(grad_output) > 0:
            grad = grad_output[0]
            if grad is not None:
                gradients = grad.detach()
    
    # Register hooks
    handle_forward = target_layer.register_forward_hook(forward_hook)
    handle_backward = target_layer.register_full_backward_hook(backward_hook)
    
    try:
        # Ensure tensor requires gradients
        if not image_tensor.requires_grad:
            image_tensor.requires_grad_(True)
        
        # Forward pass
        output = model(image_tensor)
        
        # Get the predicted class
        pred_class = output.argmax(dim=1)
        
        # Backward pass - compute gradients
        model.zero_grad()
        # Compute gradients for the predicted class
        # Use retain_graph=False since we only need one backward pass
        output[0, pred_class].backward()
        
        if activations is None:
            raise Exception("Failed to capture activations")
        if gradients is None:
            raise Exception("Failed to capture gradients")
        
        print(f"[GRAD-CAM] Activations shape: {activations.shape if activations is not None else 'None'}")
        print(f"[GRAD-CAM] Gradients shape: {gradients.shape if gradients is not None else 'None'}")
        
        # Calculate weights (global average pooling of gradients)
        # gradients shape: [batch, channels, H, W]
        # Handle case where gradients might be None or wrong shape
        if gradients is not None and len(gradients.shape) == 4:
            weights = torch.mean(gradients, dim=(2, 3), keepdim=True)  # [batch, channels, 1, 1]
        else:
            raise Exception(f"Invalid gradients shape: {gradients.shape if gradients is not None else 'None'}")
        
        # Generate heatmap: weighted sum of activations
        if activations is not None and len(activations.shape) == 4:
            heatmap = torch.sum(weights * activations, dim=1, keepdim=True)  # [batch, 1, H, W]
            heatmap = F.relu(heatmap)
            heatmap = heatmap.squeeze().cpu().detach().numpy()
            print(f"[GRAD-CAM] Heatmap generated, shape: {heatmap.shape}, min: {heatmap.min():.3f}, max: {heatmap.max():.3f}")
        else:
            raise Exception(f"Invalid activations shape: {activations.shape if activations is not None else 'None'}")
        
        # Set model back to eval mode
        model.eval()
        
        # Normalize heatmap
        if heatmap.max() > heatmap.min():
            heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min())
        else:
            heatmap = np.zeros_like(heatmap)
        
        # Resize heatmap to match image size
        heatmap = cv2.resize(heatmap, (224, 224))
        heatmap = np.uint8(255 * heatmap)
        
        # Apply colormap
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Convert image tensor back to numpy for overlay
        img_np = image_tensor.squeeze().cpu().detach().numpy()
        img_np = np.transpose(img_np, (1, 2, 0))
        
        # Denormalize
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        img_np = img_np * std + mean
        img_np = np.clip(img_np, 0, 1)
        img_np = np.uint8(255 * img_np)
        
        # Resize original image to match heatmap
        img_np = cv2.resize(img_np, (224, 224))
        
        # Convert BGR to RGB for PIL
        img_np = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        
        # Blend heatmap with original image
        alpha = 0.4
        blended = cv2.addWeighted(img_np, 1 - alpha, heatmap, alpha, 0)
        
        return blended, img_np
    finally:
        # Remove hooks
        handle_forward.remove()
        handle_backward.remove()
        # Ensure model is back in eval mode
        model.eval()

def heatmap_to_base64(heatmap_image: np.ndarray) -> str:
    """Convert heatmap numpy array to base64 encoded string."""
    pil_image = Image.fromarray(heatmap_image)
    buffer = BytesIO()
    pil_image.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{img_str}"

def run_inference(image_bytes: bytes, generate_gradcam_heatmap: bool = False) -> tuple:
    """
    Run PyTorch model inference on image bytes.
    Detects and crops face before inference (model expects face crops).
    Args:
        image_bytes: Image file bytes
        generate_gradcam_heatmap: Whether to generate GRAD-CAM visualization
    Returns: 
        (prediction_result: str, confidence_score: float, heatmap_base64: str | None, face_detected: bool, face_info: dict)
    """
    if model is None:
        raise Exception("Model not loaded")
    
    try:
        # Load image
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Detect and crop face (model was trained on face crops)
        face_crop, face_info = detect_and_crop_face(image)
        
        if face_crop is None:
            raise Exception("Failed to extract face region")
        
        face_detected = face_info.get('detected', False)
        
        # Preprocess face crop
        image_tensor = transform(face_crop).unsqueeze(0).to(DEVICE)
        
        # Run inference
        with torch.no_grad():
            output = model(image_tensor)
            probabilities = torch.nn.functional.softmax(output, dim=1)
            confidence, prediction = torch.max(probabilities, 1)
        
        # Map prediction: 0 = REAL, 1 = FAKE
        result = "FAKE" if prediction.item() == 1 else "REAL"
        confidence_score = confidence.item()
        
        # Generate GRAD-CAM if requested
        heatmap_base64 = None
        if generate_gradcam_heatmap:
            try:
                # Create a new tensor with gradients enabled for GRAD-CAM
                # We need to re-run the preprocessing to get a tensor with requires_grad=True
                face_crop_for_gradcam = face_crop.copy()
                image_tensor_for_gradcam = transform(face_crop_for_gradcam).unsqueeze(0).to(DEVICE)
                image_tensor_for_gradcam.requires_grad_(True)
                
                print(f"[GRAD-CAM] Starting GRAD-CAM generation for face crop (size: {face_crop.size})")
                print(f"[GRAD-CAM] Image tensor shape: {image_tensor_for_gradcam.shape}, requires_grad: {image_tensor_for_gradcam.requires_grad}")
                print(f"[GRAD-CAM] Model training mode: {model.training}")
                
                heatmap_image, _ = generate_gradcam(model, image_tensor_for_gradcam)
                heatmap_base64 = heatmap_to_base64(heatmap_image)
                print(f"[OK] GRAD-CAM heatmap generated successfully, base64 length: {len(heatmap_base64)}")
                print(f"[OK] GRAD-CAM base64 starts with: {heatmap_base64[:50]}...")
            except Exception as e:
                import traceback
                print(f"[ERROR] GRAD-CAM generation failed: {e}")
                print(f"[ERROR] Traceback: {traceback.format_exc()}")
                heatmap_base64 = None

        return result, confidence_score, heatmap_base64, face_detected, face_info
    except Exception as e:
        raise Exception(f"Inference failed: {str(e)}")

def process_video(video_bytes: bytes, generate_gradcam: bool = False) -> dict:
    """
    Process video by extracting frames and running inference on each.
    Returns aggregated results with frame-by-frame details.
    """
    try:
        frames = extract_video_frames(video_bytes)
        
        if not frames:
            raise Exception("No frames extracted from video")
        
        frame_results = []
        fake_count = 0
        real_count = 0
        total_confidence = 0.0
        fake_confidence_sum = 0.0
        real_confidence_sum = 0.0
        frames_with_faces = 0
        
        for idx, frame in enumerate(frames):
            # Convert PIL Image to bytes
            frame_buffer = BytesIO()
            frame.save(frame_buffer, format='PNG')
            frame_bytes = frame_buffer.getvalue()
            
            # Run inference on frame (with face detection)
            result, confidence, heatmap, face_detected, face_info = run_inference(frame_bytes, generate_gradcam)
            
            frame_result = {
                "frame_number": idx + 1,
                "prediction": result,
                "confidence": round(float(confidence), 4),
                "heatmap": heatmap,
                "face_detected": face_detected,
                "face_confidence": round(float(face_info.get('confidence', 0.0)), 3) if face_detected else None
            }
            frame_results.append(frame_result)
            
            # Only count frames with detected faces for aggregation
            if face_detected:
                frames_with_faces += 1
                if result == "FAKE":
                    fake_count += 1
                    fake_confidence_sum += confidence
                else:
                    real_count += 1
                    real_confidence_sum += confidence
                total_confidence += confidence
        
        # Adjust counts if no faces detected in any frame
        if frames_with_faces == 0:
            print("[WARNING] No faces detected in any video frame, using all frames for aggregation")
            frames_with_faces = len(frames)
            for fr in frame_results:
                if fr["prediction"] == "FAKE":
                    fake_count += 1
                    fake_confidence_sum += fr["confidence"]
                else:
                    real_count += 1
                    real_confidence_sum += fr["confidence"]
                total_confidence += fr["confidence"]
        
        # Aggregate video result using confidence-weighted voting
        # This is more accurate than simple majority voting
        valid_frames = frames_with_faces if frames_with_faces > 0 else len(frames)
        fake_ratio = fake_count / valid_frames if valid_frames > 0 else 0.0
        avg_confidence = total_confidence / valid_frames if valid_frames > 0 else 0.0
        
        # Calculate weighted scores
        fake_weighted_score = (fake_confidence_sum / fake_count) if fake_count > 0 else 0.0
        real_weighted_score = (real_confidence_sum / real_count) if real_count > 0 else 0.0
        
        # Video classification using confidence-weighted voting
        # More conservative approach: require strong evidence for FAKE classification
        # Video is considered FAKE only if:
        # 1. >70% of frames are fake (strong majority), OR
        # 2. >60% of frames are fake AND fake confidence is significantly higher (>0.1 difference)
        if fake_ratio > 0.7:
            video_result = "FAKE"
        elif fake_ratio > 0.6 and (fake_weighted_score - real_weighted_score) > 0.1:
            video_result = "FAKE"
        elif fake_ratio > 0.5 and fake_weighted_score > 0.8 and (fake_weighted_score - real_weighted_score) > 0.15:
            # Only if fake confidence is very high and significantly higher than real
            video_result = "FAKE"
        else:
            # Default to REAL if evidence is not strong enough
            video_result = "REAL"
        
        print(f"[VIDEO] Processed {len(frames)} frames: {fake_count} fake, {real_count} real, ratio={fake_ratio:.2f}")
        print(f"[VIDEO] Fake avg confidence: {fake_weighted_score:.3f}, Real avg confidence: {real_weighted_score:.3f}")
        print(f"[VIDEO] Final result: {video_result}")
        
        return {
            "video_prediction": video_result,
            "video_confidence": round(float(avg_confidence), 4),
            "total_frames_analyzed": len(frames),
            "frames_with_faces": frames_with_faces,
            "fake_frames": fake_count,
            "real_frames": real_count,
            "fake_ratio": round(float(fake_ratio), 4),
            "frame_results": frame_results
        }
    except Exception as e:
        raise Exception(f"Video processing failed: {str(e)}")


def log_action(user_id: Optional[int], action_type: str, status_code: int, details=None):
    """Persist a system log entry for auditing."""
    log = SystemLog(
        user_id=user_id,
        action_type=action_type,
        status_code=status_code,
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        details=details,
    )
    db.session.add(log)


def get_or_create_detection_model():
    """Ensure a detection model metadata entry exists."""
    model_record = (
        DetectionModel.query.filter_by(
            name=DEFAULT_MODEL_NAME, version=DEFAULT_MODEL_VERSION
        )
        .order_by(DetectionModel.id.asc())
        .first()
    )
    if not model_record:
        model_record = DetectionModel(
            name=DEFAULT_MODEL_NAME,
            version=DEFAULT_MODEL_VERSION,
            description="ResNet18 binary classifier for real vs fake detection.",
            accuracy=None,
            weights_path=MODEL_PATH,
            is_active=True,
        )
        db.session.add(model_record)
        db.session.flush()
    return model_record

# ============================================================================
# Authentication Endpoints
# ============================================================================

@api_bp.route("/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate required fields
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return (
            jsonify(
                {"error": "Missing required fields: username, email, password"}
            ),
            400,
        )

    # Validate password length
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    # Validate email format
    if "@" not in email or "." not in email.split("@")[1]:
        return jsonify({"error": "Invalid email format"}), 400

    # Check username uniqueness
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    # Check email uniqueness
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    try:
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()
        log_action(
            user_id=user.id,
            action_type="user.register",
            status_code=201,
            details={"username": user.username, "email": user.email},
        )
        db.session.commit()

        # Generate token for immediate login
        access_token = create_access_token(identity=str(user.id))
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = request.remote_addr
        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": "User registered successfully",
            "access_token": access_token,
            "user": user.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        log_action(
            user_id=None,
            action_type="user.register",
            status_code=500,
            details={"error": str(e), "username": username, "email": email},
        )
        db.session.commit()
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@api_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user and return JWT token. Accepts username or email."""
    print("=== LOGIN DEBUG ===")
    print("Raw data:", request.data)
    print("JSON parsed (silent):", request.get_json(silent=True))
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password", "")
    print("Identifier extracted:", identifier)
    print("Password present:", password is not None)

    if not identifier or not password:
        return jsonify({"error": "Missing username or password"}), 400

    # Try username first (case-sensitive), then email (case-insensitive)
    user = User.query.filter_by(username=identifier).first()
    if not user:
        # Try email with case-insensitive matching
        user = User.query.filter(func.lower(User.email) == identifier.lower()).first()

    if not user:
        log_action(
            user_id=None,
            action_type="auth.login",
            status_code=401,
            details={"reason": "user_not_found", "identifier": identifier},
        )
        db.session.commit()
        return jsonify({"error": "Invalid username or password"}), 401

    # Check if user account is active
    if user.status and user.status not in ['active', None]:
        log_action(
            user_id=user.id,
            action_type="auth.login",
            status_code=403,
            details={"reason": "account_suspended", "status": user.status, "username": user.username},
        )
        db.session.commit()
        return jsonify({"error": f"Account is {user.status}. Please contact an administrator."}), 403

    # Check password
    password_valid = user.check_password(password)
    if not password_valid:
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        db.session.add(user)
        log_action(
            user_id=user.id,
            action_type="auth.login",
            status_code=401,
            details={
                "reason": "invalid_password",
                "username": user.username,
                "failed_attempts": user.failed_login_attempts,
            },
        )
        db.session.commit()
        return jsonify({"error": "Invalid username or password"}), 401

    # Successful login
    user.failed_login_attempts = 0
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = request.remote_addr
    db.session.add(user)

    access_token = create_access_token(identity=str(user.id))
    log_action(
        user_id=user.id,
        action_type="auth.login",
        status_code=200,
        details={"username": user.username},
    )
    db.session.commit()

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200

# ============================================================================
# Protected User Endpoints
# ============================================================================

@api_bp.route("/user", methods=["GET"])
@jwt_required()
def get_user():
    """Get current authenticated user's information."""
    user_id_str = get_jwt_identity()
    user_id = int(user_id_str) if user_id_str else None
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.to_dict()), 200

# ============================================================================
# Core ML Prediction Endpoint
# ============================================================================

@api_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    """
    Upload image and run deepfake detection.
    - Requires JWT authentication
    - Accepts image file upload (max 16MB)
    - Runs PyTorch model inference
    - Saves results to database
    - Returns prediction results
    """
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if user_id_str else None
        print(f"DEBUG: /predict - user_id from token: {user_id} (from string: {user_id_str})")
    except Exception as e:
        # Log JWT error for debugging
        print(f"JWT Error in /predict: {e}")
        print(f"DEBUG: Request headers: {dict(request.headers)}")
        return jsonify({'error': f'Invalid or missing authentication token: {str(e)}'}), 401
    
    if not user_id:
        print("DEBUG: user_id is None after get_jwt_identity()")
        return jsonify({'error': 'User ID not found in token'}), 401
    
    user = User.query.get(user_id)
    
    if not user:
        print(f"DEBUG: User with ID {user_id} not found in database")
        return jsonify({'error': 'User not found'}), 404
    
    file_storage = request.files.get("file")
    image_url = (request.form.get("image_url") or "").strip()

    if (not file_storage or file_storage.filename == "") and not image_url:
        print("DEBUG: No file uploaded and no image_url provided")
        return jsonify({"error": "Please upload a file or provide an image URL."}), 400

    filename = None
    file_bytes = None
    content_type = None

    if file_storage and file_storage.filename:
        filename = secure_filename(file_storage.filename)
        file_bytes = file_storage.read()
        content_type = file_storage.content_type or ""
        print(f"DEBUG: File received - filename: {filename}, content_type: {content_type}")

    if not file_bytes and image_url:
        try:
            file_bytes, remote_filename = fetch_image_from_url(image_url)
            filename = secure_filename(remote_filename)
            content_type = "image/jpeg"
            print(f"DEBUG: Remote image fetched - filename: {filename}")
        except RemoteMediaError as exc:
            print(f"[URL ERROR] {exc}")
            return jsonify({"error": str(exc)}), 400

    if not filename or not allowed_file(filename):
        allowed = ", ".join(ALLOWED_EXTENSIONS)
        return jsonify({"error": f"Invalid file type. Allowed: {allowed}"}), 400

    is_video = is_video_file(filename)
    if image_url and is_video:
        return jsonify({"error": "URL analysis currently supports images only."}), 400

    if not file_bytes:
        return jsonify({"error": "Unable to read the uploaded media."}), 400

    # Check if GRAD-CAM / LIME should be generated (default: True)
    generate_gradcam = request.form.get('generate_gradcam', 'true').lower() == 'true'
    generate_lime = request.form.get('generate_lime', 'true').lower() == 'true'

    try:
        import time
        start_time = time.time()
        
        file_size = len(file_bytes)

        # Process based on file type
        if is_video:
            # Process video
            video_results = process_video(file_bytes, generate_gradcam)
            
            # Use aggregated video results
            prediction_result = video_results["video_prediction"]
            confidence_score = video_results["video_confidence"]
            
            # Store frame results in metadata
            frame_metadata = {
                "total_frames": video_results["total_frames_analyzed"],
                "frames_with_faces": video_results.get("frames_with_faces", video_results["total_frames_analyzed"]),
                "fake_frames": video_results["fake_frames"],
                "real_frames": video_results["real_frames"],
                "fake_ratio": video_results["fake_ratio"],
                "frame_results": [
                    {
                        "frame_number": fr["frame_number"],
                        "prediction": fr["prediction"],
                        "confidence": fr["confidence"]
                    }
                    for fr in video_results["frame_results"]
                ]
            }
            
            # Get representative heatmap (prefer fake frames, then any frame with heatmap)
            representative_heatmap = None
            # First try to get heatmap from a fake frame (most informative)
            for fr in video_results["frame_results"]:
                if fr.get("prediction") == "FAKE" and fr.get("heatmap"):
                    representative_heatmap = fr["heatmap"]
                    print(f"[VIDEO] Using GRAD-CAM from frame {fr['frame_number']} (FAKE)")
                    break
            
            # If no fake frame heatmap, use first available heatmap
            if not representative_heatmap:
                for fr in video_results["frame_results"]:
                    if fr.get("heatmap"):
                        representative_heatmap = fr["heatmap"]
                        print(f"[VIDEO] Using GRAD-CAM from frame {fr['frame_number']}")
                        break
            
            if not representative_heatmap:
                print(f"[WARNING] No GRAD-CAM heatmap generated for any video frame")
            original_image = None
            face_crop_for_lime = None
            input_image_base64 = None
        else:
            original_image = Image.open(BytesIO(file_bytes)).convert('RGB')
            face_crop_for_lime, _ = detect_and_crop_face(original_image)
            input_image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            # Process image
            prediction_result, confidence_score, heatmap_base64, face_detected, face_info = run_inference(
                file_bytes, generate_gradcam
            )
            representative_heatmap = heatmap_base64
            frame_metadata = {
                "face_detected": face_detected,
                "face_confidence": round(float(face_info.get('confidence', 0.0)), 3) if face_detected else None
            }
            lime_visualization = None
            if generate_lime and face_crop_for_lime is not None:
                try:
                    lime_visualization = generate_lime_visualization(
                        model,
                        face_crop_for_lime,
                        transform,
                        DEVICE,
                    )
                except Exception as lime_error:
                    print(f"[LIME] Generation failed: {lime_error}")
                    lime_visualization = None

        processing_time_ms = int((time.time() - start_time) * 1000)

        stored_filename = f"{uuid4().hex}_{filename}"
        storage_path = os.path.join("uploads", stored_filename)
        checksum = hashlib.sha256(file_bytes).hexdigest()

        detection_model = get_or_create_detection_model()

        media_file = MediaFile(
            user_id=user_id,
            original_filename=filename,
            stored_filename=stored_filename,
            storage_path=storage_path,
            file_type=filename.rsplit(".", 1)[1].lower(),
            file_size=file_size,
            checksum=checksum,
            uploaded_at=datetime.utcnow(),
            last_analyzed_at=datetime.utcnow(),
        )
        db.session.add(media_file)
        db.session.flush()

        analysis_metadata = {
            "device": str(DEVICE),
            "original_filename": filename,
            "file_type": "video" if is_video else "image",
            "processing_time_ms": processing_time_ms,
            "source": "url" if image_url else "upload",
        }

        if image_url:
            analysis_metadata["source_url"] = image_url

        if frame_metadata:
            analysis_metadata.update(frame_metadata)
        
        # Add face detection info for images
        if not is_video and frame_metadata:
            analysis_metadata["face_detected"] = frame_metadata.get("face_detected", False)
            analysis_metadata["face_confidence"] = frame_metadata.get("face_confidence")
        if input_image_base64:
            analysis_metadata["input_image_base64"] = input_image_base64
        if not is_video:
            analysis_metadata["generate_lime"] = generate_lime
        if not is_video and lime_visualization:
            analysis_metadata["lime_visualization"] = lime_visualization

        analysis = AnalysisResult(
            user_id=user_id,
            media_file_id=media_file.id,
            model_id=detection_model.id if detection_model else None,
            prediction_label=prediction_result,
            confidence_score=confidence_score,
            processing_time_ms=processing_time_ms,
            analysis_metadata=analysis_metadata,
            created_at=datetime.utcnow(),
        )
        db.session.add(analysis)

        log_action(
            user_id=user_id,
            action_type="analysis.predict",
            status_code=200,
            details={
                "media_file_id": media_file.id,
                "analysis_id": analysis.id,
                "prediction_label": prediction_result,
                "file_type": "video" if is_video else "image",
            },
        )

        db.session.commit()

        # Include model information in response
        analysis_dict = analysis.to_dict()
        model_meta = detection_model.to_dict() if detection_model else None
        analysis_dict["model"] = model_meta
        
        # Add GRAD-CAM heatmap to response
        response_data = {
            "message": "Prediction completed successfully",
            "media_file": media_file.to_dict(),
            "analysis": analysis_dict,
        }
        
        if representative_heatmap:
            response_data["gradcam_heatmap"] = representative_heatmap
            print(f"[RESPONSE] GRAD-CAM heatmap included in response, length: {len(representative_heatmap)}")
            print(f"[RESPONSE] GRAD-CAM preview: {representative_heatmap[:50]}...")
        else:
            print("[RESPONSE] WARNING: No GRAD-CAM heatmap to include in response")
            print(f"[RESPONSE] representative_heatmap value: {representative_heatmap}")

        lime_visualization = analysis_metadata.get("lime_visualization")
        if lime_visualization:
            response_data["lime_visualization"] = lime_visualization

        if is_video and video_results:
            response_data["video_analysis"] = {
                "total_frames": video_results["total_frames_analyzed"],
                "fake_frames": video_results["fake_frames"],
                "real_frames": video_results["real_frames"],
                "fake_ratio": video_results["fake_ratio"],
                "frame_results": video_results["frame_results"][:10]  # Return first 10 frames
            }

        return jsonify(response_data), 200

    except Exception as e:
        db.session.rollback()
        log_action(
            user_id=user_id,
            action_type="analysis.predict",
            status_code=500,
            details={"error": str(e)},
        )
        db.session.commit()
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

# ============================================================================
# History Endpoint - Paginated User Predictions
# ============================================================================

@api_bp.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    """Get paginated history of predictions for current user."""
    user_id_str = get_jwt_identity()
    user_id = int(user_id_str) if user_id_str else None
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get pagination parameters from query string
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    # Ensure valid pagination values
    page = max(1, page)
    per_page = min(100, max(1, per_page))

    query = (
        AnalysisResult.query.filter_by(user_id=user_id)
        .order_by(AnalysisResult.created_at.desc())
    )
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    results = []
    for result in pagination.items:
        media = result.media_file
        model_meta = result.model.to_dict() if result.model else None
        data = result.to_dict()
        data["media_file"] = media.to_dict() if media else None
        data["model"] = model_meta
        results.append(data)

    log_action(
        user_id=user_id,
        action_type="analysis.history",
        status_code=200,
        details={"page": page, "per_page": per_page},
    )
    db.session.commit()

    return jsonify({
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page,
        "per_page": per_page,
        "results": results,
    }), 200

# ============================================================================
# Admin Management Endpoints
# ============================================================================

@api_bp.route("/admin/create-admin", methods=["POST"])
def create_admin():
    """
    Create or update an admin user.
    This endpoint can be called without authentication for initial setup.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    
    if not username or not email or not password:
        return jsonify({"error": "Missing required fields: username, email, password"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    
    try:
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User.query.filter_by(username=username).first()
        
        if user:
            # Update existing user to admin
            user.username = username
            user.email = email
            user.set_password(password)
            user.is_admin = True
            db.session.add(user)
            message = "User updated to admin successfully"
        else:
            # Create new admin user
            user = User(username=username, email=email, is_admin=True)
            user.set_password(password)
            db.session.add(user)
            message = "Admin user created successfully"
        
        db.session.commit()
        log_action(
            user_id=user.id if user else None,
            action_type="admin.create",
            status_code=200,
            details={"username": username, "email": email},
        )
        
        return jsonify({
            "message": message,
            "user": user.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create/update admin: {str(e)}"}), 500

@api_bp.route("/debug/user-info", methods=["POST"])
def debug_user_info():
    """
    Debug endpoint to check user information (for troubleshooting).
    Returns user info without password hash for security.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    identifier = (data.get("username") or data.get("email") or "").strip()
    
    if not identifier:
        return jsonify({"error": "Missing username or email"}), 400
    
    try:
        # Find user
        user = User.query.filter_by(username=identifier).first()
        if not user:
            user = User.query.filter(func.lower(User.email) == identifier.lower()).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "found": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": user.is_admin,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "failed_login_attempts": user.failed_login_attempts or 0,
                "has_password_hash": bool(user.password_hash),
            },
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

@api_bp.route("/admin/reset-password", methods=["POST"])
def reset_user_password():
    """
    Reset a user's password by email or username.
    For development/testing only - should require admin auth in production.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    identifier = (data.get("username") or data.get("email") or "").strip()
    new_password = data.get("password", "")
    
    if not identifier or not new_password:
        return jsonify({"error": "Missing username/email or password"}), 400
    
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    
    try:
        # Find user by username or email
        user = User.query.filter_by(username=identifier).first()
        if not user:
            user = User.query.filter(func.lower(User.email) == identifier.lower()).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Reset password
        user.set_password(new_password)
        user.failed_login_attempts = 0
        db.session.add(user)
        db.session.commit()
        
        log_action(
            user_id=user.id,
            action_type="admin.reset_password",
            status_code=200,
            details={"username": user.username},
        )
        
        return jsonify({
            "message": "Password reset successfully",
            "user": user.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to reset password: {str(e)}"}), 500

# ============================================================================
# Health Check Endpoint
# ============================================================================

@api_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify API and model status."""
    try:
        db.session.execute(db.text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    media_count = AnalysisResult.query.count()
    log_count = SystemLog.query.count()

    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(DEVICE),
        "database": db_status,
        "analysis_results": media_count,
        "system_logs": log_count,
    }), 200

# ============================================================================
# Admin Endpoints - User Management & Analytics
# ============================================================================

def require_admin():
    """Helper to check if current user is admin."""
    user_id_str = get_jwt_identity()
    user_id = int(user_id_str) if user_id_str else None
    if not user_id:
        return None, jsonify({'error': 'Authentication required'}), 401
    
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return None, jsonify({'error': 'Admin access required'}), 403
    
    return user, None, None

@api_bp.route("/admin/users", methods=["GET"])
@jwt_required()
def get_all_users():
    """Get all users (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        users_data = [user.to_dict() for user in users]
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.list_users",
            status_code=200,
            details={"count": len(users_data)},
        )
        db.session.commit()
        
        return jsonify({"users": users_data}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch users: {str(e)}"}), 500

@api_bp.route("/admin/stats", methods=["GET"])
@jwt_required()
def get_admin_stats():
    """Get system statistics (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        total_users = User.query.count()
        admin_count = User.query.filter_by(is_admin=True).count()
        regular_users = total_users - admin_count
        
        total_media = MediaFile.query.count()
        total_analyses = AnalysisResult.query.count()
        fake_count = AnalysisResult.query.filter_by(prediction_label='FAKE').count()
        real_count = AnalysisResult.query.filter_by(prediction_label='REAL').count()
        
        # Active users (logged in within last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = User.query.filter(User.last_login_at >= thirty_days_ago).count()
        
        # Average confidence
        avg_confidence_result = db.session.query(func.avg(AnalysisResult.confidence_score)).scalar()
        avg_confidence = round(float(avg_confidence_result * 100), 2) if avg_confidence_result else 0
        
        # Detection rate
        detection_rate = round((fake_count / total_analyses * 100), 2) if total_analyses > 0 else 0
        
        stats = {
            "total_users": total_users,
            "regular_users": regular_users,
            "admin_users": admin_count,
            "active_users": active_users,
            "total_media_files": total_media,
            "total_analyses": total_analyses,
            "deepfakes_detected": fake_count,
            "authentic_detected": real_count,
            "detection_rate": detection_rate,
            "avg_confidence": avg_confidence,
        }
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.view_stats",
            status_code=200,
        )
        db.session.commit()
        
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch stats: {str(e)}"}), 500

@api_bp.route("/admin/analytics", methods=["GET"])
@jwt_required()
def get_analytics():
    """Get analytics data (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        # Daily scans for last 30 days
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Check if using SQLite (date function works differently)
        from flask import current_app
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '').lower()
        is_sqlite = 'sqlite' in db_uri
        
        if is_sqlite:
            # SQLite: use strftime to extract date
            daily_scans = db.session.query(
                func.strftime('%Y-%m-%d', AnalysisResult.created_at).label('date'),
                func.count(AnalysisResult.id).label('total'),
                func.sum(
                    case((AnalysisResult.prediction_label == 'FAKE', 1), else_=0)
                ).label('deepfakes')
            ).filter(
                AnalysisResult.created_at >= thirty_days_ago
            ).group_by(
                func.strftime('%Y-%m-%d', AnalysisResult.created_at)
            ).order_by(
                func.strftime('%Y-%m-%d', AnalysisResult.created_at)
            ).all()
            
            daily_data = [{
                'date': row.date,  # Already a string from strftime
                'scans': row.total,
                'deepfakes': row.deepfakes or 0
            } for row in daily_scans]
        else:
            # PostgreSQL/MySQL: use date() function
            daily_scans = db.session.query(
                func.date(AnalysisResult.created_at).label('date'),
                func.count(AnalysisResult.id).label('total'),
                func.sum(
                    case((AnalysisResult.prediction_label == 'FAKE', 1), else_=0)
                ).label('deepfakes')
            ).filter(
                AnalysisResult.created_at >= thirty_days_ago
            ).group_by(
                func.date(AnalysisResult.created_at)
            ).order_by(
                func.date(AnalysisResult.created_at)
            ).all()
            
            daily_data = [{
                'date': row.date.strftime('%Y-%m-%d') if hasattr(row.date, 'strftime') else str(row.date),
                'scans': row.total,
                'deepfakes': row.deepfakes or 0
            } for row in daily_scans]
        
        # Confidence distribution
        confidence_ranges = [
            (90, 100, '90-100%'),
            (80, 89, '80-89%'),
            (70, 79, '70-79%'),
            (60, 69, '60-69%'),
            (0, 59, '<60%'),
        ]
        
        confidence_dist = []
        for min_conf, max_conf, label in confidence_ranges:
            # Confidence scores are stored as decimals (0.0 to 1.0)
            min_decimal = min_conf / 100.0
            max_decimal = max_conf / 100.0 if max_conf < 100 else 1.0
            
            if max_conf < 100:
                count = db.session.query(AnalysisResult).filter(
                    AnalysisResult.confidence_score >= min_decimal,
                    AnalysisResult.confidence_score <= max_decimal
                ).count()
            else:
                # For <60%, we want scores less than 0.60
                count = db.session.query(AnalysisResult).filter(
                    AnalysisResult.confidence_score < 0.60
                ).count()
            
            confidence_dist.append({'range': label, 'count': count})
        
        analytics = {
            "daily_scans": daily_data,
            "confidence_distribution": confidence_dist,
        }
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.view_analytics",
            status_code=200,
        )
        db.session.commit()
        
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch analytics: {str(e)}"}), 500

@api_bp.route("/admin/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    """Delete a user (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        if target_user.is_admin:
            return jsonify({"error": "Cannot delete admin users"}), 400
        
        username = target_user.username
        db.session.delete(target_user)
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.delete_user",
            status_code=200,
            details={"deleted_user_id": user_id, "deleted_username": username},
        )
        db.session.commit()
        
        return jsonify({"message": f"User {username} deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

@api_bp.route("/admin/users/<int:user_id>/toggle-status", methods=["POST"])
@jwt_required()
def toggle_user_status(user_id):
    """Toggle user active/suspended status (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json() or {}
        action = data.get('action', 'toggle')
        
        # Use the proper status field
        if action == 'suspend':
            target_user.status = 'suspended'
            status = 'suspended'
        elif action == 'activate':
            target_user.status = 'active'
            status = 'active'
        else:
            # Toggle between active and suspended
            if target_user.status == 'active':
                target_user.status = 'suspended'
                status = 'suspended'
            else:
                target_user.status = 'active'
                status = 'active'
        
        db.session.add(target_user)
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.toggle_user_status",
            status_code=200,
            details={"target_user_id": user_id, "status": status},
        )
        db.session.commit()
        
        return jsonify({
            "message": f"User {target_user.username} {status} successfully",
            "status": status
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update user status: {str(e)}"}), 500

# ============================================================================
# Admin Endpoints - File Management
# ============================================================================

@api_bp.route("/admin/files", methods=["GET"])
@jwt_required()
def get_all_files():
    """Get all uploaded media files (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        # Get pagination parameters
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        page = max(1, page)
        per_page = min(100, max(1, per_page))
        
        # Get filter parameters
        user_id_filter = request.args.get("user_id", type=int)
        file_type_filter = request.args.get("file_type", type=str)
        
        # Build query
        query = MediaFile.query
        if user_id_filter:
            query = query.filter_by(user_id=user_id_filter)
        if file_type_filter:
            query = query.filter_by(file_type=file_type_filter.lower())
        
        # Order by upload date (newest first)
        query = query.order_by(MediaFile.uploaded_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Build response with user info
        files_data = []
        for media_file in pagination.items:
            file_dict = media_file.to_dict()
            owner = media_file.owner
            file_dict["owner"] = {
                "id": owner.id,
                "username": owner.username,
                "email": owner.email,
            } if owner else None
            files_data.append(file_dict)
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.list_files",
            status_code=200,
            details={"page": page, "per_page": per_page, "count": len(files_data)},
        )
        db.session.commit()
        
        return jsonify({
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
            "files": files_data,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch files: {str(e)}"}), 500

@api_bp.route("/admin/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_media_file(file_id):
    """Delete a media file (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        media_file = MediaFile.query.get(file_id)
        if not media_file:
            return jsonify({"error": "File not found"}), 404
        
        # Get file info before deletion
        file_path = media_file.storage_path
        filename = media_file.original_filename
        owner_username = media_file.owner.username if media_file.owner else "Unknown"
        
        # Delete the file from filesystem if it exists
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete file {file_path}: {e}")
        
        # Delete from database (cascade will handle related analysis_results)
        db.session.delete(media_file)
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.delete_file",
            status_code=200,
            details={
                "file_id": file_id,
                "filename": filename,
                "owner": owner_username,
            },
        )
        db.session.commit()
        
        return jsonify({
            "message": f"File {filename} deleted successfully",
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete file: {str(e)}"}), 500

@api_bp.route("/admin/storage-stats", methods=["GET"])
@jwt_required()
def get_storage_stats():
    """Get storage statistics (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        # Total files and size
        total_files = MediaFile.query.count()
        total_size_result = db.session.query(func.sum(MediaFile.file_size)).scalar()
        total_size = int(total_size_result) if total_size_result else 0
        
        # Files by type
        files_by_type = db.session.query(
            MediaFile.file_type,
            func.count(MediaFile.id).label('count'),
            func.sum(MediaFile.file_size).label('size')
        ).group_by(MediaFile.file_type).all()
        
        type_breakdown = [{
            "type": row.file_type,
            "count": row.count,
            "size": int(row.size) if row.size else 0
        } for row in files_by_type]
        
        # Files by user
        files_by_user = db.session.query(
            User.username,
            func.count(MediaFile.id).label('count'),
            func.sum(MediaFile.file_size).label('size')
        ).join(MediaFile, User.id == MediaFile.user_id).group_by(User.id, User.username).all()
        
        user_breakdown = [{
            "username": row.username,
            "count": row.count,
            "size": int(row.size) if row.size else 0
        } for row in files_by_user]
        
        stats = {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "type_breakdown": type_breakdown,
            "user_breakdown": user_breakdown[:10],  # Top 10 users
        }
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.view_storage_stats",
            status_code=200,
        )
        db.session.commit()
        
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch storage stats: {str(e)}"}), 500

# ============================================================================
# Admin Endpoints - System Logs Viewer
# ============================================================================

@api_bp.route("/admin/logs", methods=["GET"])
@jwt_required()
def get_system_logs():
    """Get system logs with filtering (admin only)."""
    admin_user, error_response, status_code = require_admin()
    if error_response:
        return error_response, status_code
    
    try:
        # Get pagination parameters
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        page = max(1, page)
        per_page = min(200, max(1, per_page))
        
        # Get filter parameters
        action_type_filter = request.args.get("action_type", type=str)
        user_id_filter = request.args.get("user_id", type=int)
        status_code_filter = request.args.get("status_code", type=int)
        search_query = request.args.get("search", type=str)
        
        # Build query
        query = SystemLog.query
        
        if action_type_filter:
            query = query.filter(SystemLog.action_type.like(f"%{action_type_filter}%"))
        if user_id_filter:
            query = query.filter_by(user_id=user_id_filter)
        if status_code_filter:
            query = query.filter_by(status_code=status_code_filter)
        if search_query:
            # Search in action_type, ip_address, or user_agent
            search_pattern = f"%{search_query}%"
            query = query.filter(
                db.or_(
                    SystemLog.action_type.like(search_pattern),
                    SystemLog.ip_address.like(search_pattern),
                    SystemLog.user_agent.like(search_pattern),
                )
            )
        
        # Order by creation date (newest first)
        query = query.order_by(SystemLog.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Build response with user info
        logs_data = []
        for log in pagination.items:
            log_dict = log.to_dict()
            if log.user:
                log_dict["user"] = {
                    "id": log.user.id,
                    "username": log.user.username,
                    "email": log.user.email,
                }
            logs_data.append(log_dict)
        
        # Get unique action types for filter dropdown
        action_types = db.session.query(
            func.distinct(SystemLog.action_type)
        ).order_by(SystemLog.action_type).all()
        unique_action_types = [row[0] for row in action_types if row[0]]
        
        log_action(
            user_id=admin_user.id,
            action_type="admin.view_logs",
            status_code=200,
            details={"page": page, "per_page": per_page},
        )
        db.session.commit()
        
        return jsonify({
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": page,
            "per_page": per_page,
            "logs": logs_data,
            "available_action_types": unique_action_types,
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch logs: {str(e)}"}), 500

# ============================================================================
# Explainability & Assistant Endpoints
# ============================================================================

def _get_authenticated_user():
    """Return (user, response) tuple to reuse across endpoints."""
    user_id_str = get_jwt_identity()
    user_id = int(user_id_str) if user_id_str else None
    if not user_id:
        return None, (jsonify({"error": "Authentication required"}), 401)
    user = User.query.get(user_id)
    if not user:
        return None, (jsonify({"error": "User not found"}), 404)
    return user, None


@api_bp.route("/explain", methods=["POST"])
@jwt_required()
def explain_prediction():
    """Call OpenAI to generate a journalist-friendly explanation."""
    user, error_response = _get_authenticated_user()
    if error_response:
        return error_response

    payload = request.get_json() or {}
    prediction_label = (payload.get("prediction") or payload.get("prediction_label") or "").upper()
    confidence = payload.get("confidence")
    file_name = payload.get("file_name") or payload.get("filename") or "uploaded media"
    caption = payload.get("caption") or ""

    if not prediction_label:
        return jsonify({"error": "Prediction label is required"}), 400

    summary = (
        f"The model labelled the content as {prediction_label} "
        f"with confidence {confidence}."
        if confidence is not None
        else f"The model labelled the content as {prediction_label}."
    )
    context = f"File: {file_name}."
    if caption:
        context += f" Caption or notes: {caption}"

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        message = (
            "Set OPENAI_API_KEY to enable AI-assisted explanations. "
            "Provide the prediction summary manually."
        )
        return jsonify({"explanation": message, "assistant": "unavailable"}), 200

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=DEFAULT_OPENAI_MODEL,
            temperature=0.35,
            max_tokens=450,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an investigative assistant who helps journalists interpret AI "
                        "deepfake detection results. Explain findings clearly, cite possible "
                        "next steps, and keep the tone professional."
                    ),
                },
                {
                    "role": "user",
                    "content": f"{summary}\n{context}\nProvide a concise explanation and recommended actions.",
                },
            ],
        )
        explanation = response.choices[0].message.content.strip()
    except Exception as exc:
        print(f"[OPENAI] Explanation failed: {exc}")
        explanation = (
            "The Newsight assistant is currently unavailable. Please summarize the model decision manually."
        )

    log_action(
        user_id=user.id,
        action_type="analysis.explain_chatgpt",
        status_code=200,
        details={"prediction": prediction_label},
    )
    db.session.commit()

    return jsonify({"explanation": explanation, "assistant": "newsight"}), 200


@api_bp.route("/explain/lime/<int:analysis_id>", methods=["GET"])
@jwt_required()
def explain_lime(analysis_id):
    """Return or generate a LIME overlay for an existing analysis."""
    user, error_response = _get_authenticated_user()
    if error_response:
        return error_response

    analysis = AnalysisResult.query.get(analysis_id)
    if not analysis:
        return jsonify({"error": "Analysis not found"}), 404

    if analysis.user_id != user.id and not user.is_admin:
        return jsonify({"error": "Unauthorized access"}), 403

    metadata = analysis.analysis_metadata or {}
    stored_image = metadata.get("input_image_base64")
    if not stored_image:
        return jsonify({"error": "No source image stored for this analysis"}), 400

    lime_visualization = metadata.get("lime_visualization")

    if not lime_visualization:
        try:
            source_bytes = base64.b64decode(stored_image)
            source_image = Image.open(BytesIO(source_bytes)).convert("RGB")
            face_crop, _ = detect_and_crop_face(source_image)
            if face_crop is None:
                return jsonify({"error": "Unable to isolate a face for LIME analysis"}), 400

            lime_visualization = generate_lime_visualization(
                model,
                face_crop,
                transform,
                DEVICE,
            )
            metadata["lime_visualization"] = lime_visualization
            analysis.analysis_metadata = metadata
            db.session.add(analysis)
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            return jsonify({"error": f"LIME generation failed: {exc}"}), 500

    log_action(
        user_id=user.id,
        action_type="analysis.explain_lime",
        status_code=200,
        details={"analysis_id": analysis_id},
    )
    db.session.commit()

    return jsonify({"lime_visualization": lime_visualization}), 200

# ============================================================================
# Report Generation Endpoint
# ============================================================================

@api_bp.route("/report/<int:analysis_id>", methods=["GET"])
@jwt_required()
def generate_report(analysis_id):
    """Generate PDF report for a specific analysis result."""
    user_id_str = get_jwt_identity()
    user_id = int(user_id_str) if user_id_str else None
    
    if not user_id:
        return jsonify({'error': 'User ID not found in token'}), 401
    
    try:
        # Get analysis result
        analysis = AnalysisResult.query.get(analysis_id)
        if not analysis:
            return jsonify({"error": "Analysis not found"}), 404
        
        # Check if user owns this analysis or is admin
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if analysis.user_id != user_id and not user.is_admin:
            return jsonify({"error": "Unauthorized access"}), 403
        
        # Get related data
        media_file = analysis.media_file
        model_info = analysis.model.to_dict() if analysis.model else None
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12,
            spaceBefore=20
        )
        
        # Title
        story.append(Paragraph("Deepfake Detection Report", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Report metadata
        story.append(Paragraph(f"<b>Analysis ID:</b> {analysis.id}", styles['Normal']))
        story.append(Paragraph(f"<b>Date:</b> {analysis.created_at.strftime('%B %d, %Y at %I:%M %p')}", styles['Normal']))
        story.append(Paragraph(f"<b>File:</b> {media_file.original_filename if media_file else 'Unknown'}", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Result section
        is_fake = analysis.prediction_label == 'FAKE'
        result_color = colors.HexColor('#dc2626') if is_fake else colors.HexColor('#16a34a')
        result_text = "DEEPFAKE DETECTED" if is_fake else "AUTHENTIC CONTENT"
        
        result_style = ParagraphStyle(
            'ResultStyle',
            parent=styles['Heading2'],
            fontSize=20,
            textColor=result_color,
            alignment=TA_CENTER,
            spaceAfter=20
        )
        story.append(Paragraph(result_text, result_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Confidence score
        confidence_percent = round(analysis.confidence_score * 100, 1) if analysis.confidence_score <= 1 else round(analysis.confidence_score, 1)
        story.append(Paragraph(f"<b>Confidence Score:</b> {confidence_percent}%", styles['Normal']))
        story.append(Paragraph(f"<b>Processing Time:</b> {analysis.processing_time_ms}ms" if analysis.processing_time_ms else "<b>Processing Time:</b> N/A", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Model information
        if model_info:
            story.append(Paragraph("Model Information", heading_style))
            story.append(Paragraph(f"<b>Model:</b> {model_info.get('name', 'Unknown')}", styles['Normal']))
            story.append(Paragraph(f"<b>Version:</b> {model_info.get('version', 'Unknown')}", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # File information
        if media_file:
            story.append(Paragraph("File Information", heading_style))
            story.append(Paragraph(f"<b>File Type:</b> {media_file.file_type.upper()}", styles['Normal']))
            story.append(Paragraph(f"<b>File Size:</b> {round(media_file.file_size / (1024*1024), 2)} MB" if media_file.file_size else "<b>File Size:</b> Unknown", styles['Normal']))
            story.append(Paragraph(f"<b>Uploaded:</b> {media_file.uploaded_at.strftime('%B %d, %Y at %I:%M %p')}", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Video analysis details
        if analysis.analysis_metadata and analysis.analysis_metadata.get('file_type') == 'video':
            video_meta = analysis.analysis_metadata
            story.append(Paragraph("Video Analysis Details", heading_style))
            story.append(Paragraph(f"<b>Total Frames Analyzed:</b> {video_meta.get('total_frames', 'N/A')}", styles['Normal']))
            story.append(Paragraph(f"<b>Frames with Faces:</b> {video_meta.get('frames_with_faces', video_meta.get('total_frames', 'N/A'))}", styles['Normal']))
            story.append(Paragraph(f"<b>Fake Frames:</b> {video_meta.get('fake_frames', 0)}", styles['Normal']))
            story.append(Paragraph(f"<b>Real Frames:</b> {video_meta.get('real_frames', 0)}", styles['Normal']))
            story.append(Paragraph(f"<b>Fake Ratio:</b> {round(video_meta.get('fake_ratio', 0) * 100, 1)}%", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Face detection info
        if analysis.analysis_metadata:
            face_info = analysis.analysis_metadata.get('face_detected')
            if face_info is not None:
                story.append(Paragraph("Face Detection", heading_style))
                story.append(Paragraph(f"<b>Face Detected:</b> {'Yes' if face_info else 'No'}", styles['Normal']))
                if face_info and analysis.analysis_metadata.get('face_confidence'):
                    story.append(Paragraph(f"<b>Detection Confidence:</b> {round(analysis.analysis_metadata.get('face_confidence', 0) * 100, 1)}%", styles['Normal']))
                story.append(Spacer(1, 0.2*inch))
        
        # Technical details
        story.append(Paragraph("Technical Details", heading_style))
        story.append(Paragraph(f"<b>Device:</b> {analysis.analysis_metadata.get('device', 'Unknown') if analysis.analysis_metadata else 'Unknown'}", styles['Normal']))
        story.append(Paragraph(f"<b>Analysis ID:</b> {analysis.id}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("<i>Generated by Newsight Explainable Verification Suite</i>", 
                             ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, 
                                          textColor=colors.grey, alignment=TA_CENTER)))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        log_action(
            user_id=user_id,
            action_type="analysis.download_report",
            status_code=200,
            details={"analysis_id": analysis_id},
        )
        db.session.commit()
        
        filename = f"deepdetect-report-{analysis.id}-{media_file.original_filename if media_file else 'unknown'}.pdf"
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"[ERROR] PDF generation failed: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Failed to generate report: {str(e)}"}), 500

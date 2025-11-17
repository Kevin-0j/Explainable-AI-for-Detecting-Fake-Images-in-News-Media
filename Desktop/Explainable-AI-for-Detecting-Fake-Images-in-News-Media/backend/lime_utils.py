"""LIME explainability helpers."""

from __future__ import annotations

import base64
from io import BytesIO
from typing import Callable

import numpy as np
import torch
from lime import lime_image
from PIL import Image
from skimage.segmentation import mark_boundaries


def _image_to_base64(pil_image: Image.Image) -> str:
    """Encode a PIL image as a base64 data URI."""
    buffer = BytesIO()
    pil_image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def generate_lime_visualization(
    model: torch.nn.Module,
    face_image: Image.Image,
    transform: Callable[[Image.Image], torch.Tensor],
    device: torch.device,
    num_samples: int = 600,
) -> str:
    """
    Generate a LIME explanation for a face crop and return it as base64.
    """
    model.eval()
    explainer = lime_image.LimeImageExplainer()
    face_np = np.array(face_image.resize((224, 224)).convert("RGB"))

    def predict_fn(images: list[np.ndarray]) -> np.ndarray:
        tensors = []
        for img in images:
            pil_img = Image.fromarray(img.astype(np.uint8)).convert("RGB")
            tensor = transform(pil_img).unsqueeze(0)
            tensors.append(tensor)

        batch = torch.cat(tensors, dim=0).to(device)
        with torch.no_grad():
            logits = model(batch)
            probabilities = torch.softmax(logits, dim=1).cpu().numpy()
        return probabilities

    explanation = explainer.explain_instance(
        face_np,
        predict_fn,
        top_labels=1,
        hide_color=0,
        num_samples=num_samples,
    )

    top_label = explanation.top_labels[0]
    temp, mask = explanation.get_image_and_mask(
        top_label,
        positive_only=False,
        num_features=6,
        hide_rest=False,
    )
    lime_overlay = mark_boundaries(temp / 255.0, mask)
    lime_uint8 = np.uint8(np.clip(lime_overlay * 255, 0, 255))
    result_image = Image.fromarray(lime_uint8)
    return _image_to_base64(result_image)


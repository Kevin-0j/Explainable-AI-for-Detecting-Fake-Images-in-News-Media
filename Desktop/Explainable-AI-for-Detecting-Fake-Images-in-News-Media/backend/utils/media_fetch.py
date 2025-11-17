"""Helpers for downloading remote media safely."""

from __future__ import annotations

import mimetypes
import os
import secrets
from typing import Tuple
from urllib.parse import urlparse

import requests

MAX_REMOTE_SIZE = 16 * 1024 * 1024  # 16MB safeguard
ALLOWED_SCHEMES = {"http", "https"}


class RemoteMediaError(Exception):
    """Raised when remote media cannot be downloaded or validated."""


def guess_extension_from_mime(mime_type: str | None) -> str:
    """Return a sensible extension for a MIME type."""
    if not mime_type:
        return ".jpg"

    guess = mimetypes.guess_extension(mime_type.split(";")[0].strip())
    if guess:
        return guess
    if mime_type == "image/png":
        return ".png"
    if mime_type == "image/webp":
        return ".webp"
    return ".jpg"


def fetch_image_from_url(url: str) -> Tuple[bytes, str]:
    """
    Download an image from a remote URL.

    Returns (image_bytes, filename).
    """
    parsed = urlparse(url.strip())
    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise RemoteMediaError("Only http and https URLs are allowed.")

    try:
        response = requests.get(url, timeout=10)
    except requests.RequestException as exc:
        raise RemoteMediaError(f"Unable to reach URL: {exc}") from exc

    content_length = response.headers.get("Content-Length")
    if content_length and int(content_length) > MAX_REMOTE_SIZE:
        raise RemoteMediaError("Remote file exceeds 16MB limit.")

    content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
    if not content_type.startswith("image/"):
        raise RemoteMediaError("URL must point to an image resource.")

    payload = response.content
    if len(payload) > MAX_REMOTE_SIZE:
        raise RemoteMediaError("Remote file exceeds 16MB limit.")

    filename = os.path.basename(parsed.path)
    if not filename:
        filename = f"remote_{secrets.token_hex(4)}"
    if "." not in filename:
        filename = f"{filename}{guess_extension_from_mime(content_type)}"

    return payload, filename


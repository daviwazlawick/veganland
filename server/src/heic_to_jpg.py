#!/usr/bin/env python3
"""Read image bytes from stdin, write JPEG bytes to stdout.

Handles HEIC/HEIF via pillow-heif, plus anything Pillow natively opens
(JPEG, PNG, WebP, ...). Idempotent for existing JPEGs (re-encoded at
quality 88 so attachments stay small enough for SMTP).
"""
import sys
from io import BytesIO
from PIL import Image
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except Exception:
    pass  # If HEIF support is missing, non-HEIC formats still work.

buf = sys.stdin.buffer.read()
img = Image.open(BytesIO(buf))
if img.mode not in ('RGB', 'L'):
    img = img.convert('RGB')
out = BytesIO()
img.save(out, format='JPEG', quality=88, optimize=True)
sys.stdout.buffer.write(out.getvalue())

#!/usr/bin/env python3
"""
Body composition measurement pipeline — NovaQI
Input : front.jpg, side.jpg, height_cm, weight_kg, sex, age
Output: JSON with circumferences, indices, overlay images (base64)

Accuracy note: circumferences ±2–4 cm vs tape measure (ellipse model).
Body fat estimation via Siri/volume method: ±4–7% vs DEXA.
"""
import sys, json, math, base64, tempfile, os
import numpy as np
from PIL import Image, ImageOps
import cv2
import mediapipe as mp
import rembg

# Register HEIC/HEIF support so iPhone photos taken in HEIF format load
# natively without needing a client-side transcode. Silently skipped if
# pillow-heif is not installed.
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

# ── MediaPipe pose ──────────────────────────────────────────────────────────
mp_pose = mp.solutions.pose

# Landmark indices we use
LM = {
    'nose':            0,
    'left_shoulder':   11, 'right_shoulder':  12,
    'left_elbow':      13, 'right_elbow':     14,
    'left_wrist':      15, 'right_wrist':     16,
    'left_hip':        23, 'right_hip':       24,
    'left_knee':       25, 'right_knee':      26,
    'left_ankle':      27, 'right_ankle':     28,
    'left_heel':       29, 'right_heel':      30,
    'left_foot':       31, 'right_foot':      32,
}

# Classification thresholds (literature)
THRESHOLDS = {
    'waist_to_height': {'low_risk': 0.5},
    'waist_to_hip_f':  {'adequate': 0.85},
    'waist_to_hip_m':  {'adequate': 0.90},
    'conicity_index':  {'adequate': 1.18},
}


def _sniff_format(path):
    """Return a short label for what the first bytes of `path` look like."""
    try:
        with open(path, 'rb') as f:
            head = f.read(16)
    except Exception:
        return 'unreadable'
    if head[:3] == b'\xff\xd8\xff': return 'JPEG'
    if head[:8] == b'\x89PNG\r\n\x1a\n': return 'PNG'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP': return 'WEBP'
    if head[:4] == b'GIF8': return 'GIF'
    if head[:2] == b'BM': return 'BMP'
    if head[4:8] == b'ftyp':
        brand = head[8:12]
        return f'HEIF/{brand.decode("ascii", errors="replace")}'
    return f'unknown ({head.hex()})'


def load_image(path):
    fmt = _sniff_format(path)
    try:
        img = Image.open(path)
        img.load()  # force decode so we catch truncated files here, not later
    except Exception as e:
        # Last-resort fallback via OpenCV — handles some edge cases PIL rejects
        # (e.g. certain JPEG variants). If that also fails, re-raise with the
        # sniffed format so the server logs are actionable.
        arr = cv2.imread(path, cv2.IMREAD_COLOR)
        if arr is None:
            print(f'[load-image] PIL failed on {fmt} file: {e}', file=sys.stderr)
            raise ValueError(f'{e} (detected format: {fmt})')
        print(f'[load-image] PIL failed on {fmt}, OpenCV fallback ok', file=sys.stderr)
        img = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
    # Honour EXIF orientation so portrait phone photos are not sideways
    img = ImageOps.exif_transpose(img)
    img = img.convert('RGB')
    # Cap at 2000px tall to keep MediaPipe fast
    w, h = img.size
    if h > 2000:
        scale = 2000 / h
        img = img.resize((int(w * scale), 2000), Image.LANCZOS)
    return img


_rembg_session = None

def segment_body(img_pil):
    """Returns RGBA image with background removed."""
    global _rembg_session
    if _rembg_session is None:
        _rembg_session = rembg.new_session("u2net_human_seg")
    return rembg.remove(img_pil, session=_rembg_session)


def get_mask(rgba_pil):
    """Boolean mask: True = foreground (body)."""
    arr = np.array(rgba_pil)
    return arr[:, :, 3] > 64


def get_landmarks(img_pil):
    """Run MediaPipe Pose, return dict of landmark coords in pixel space."""
    img_np = np.array(img_pil)
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    h, w = img_bgr.shape[:2]
    with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
        results = pose.process(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    if not results.pose_landmarks:
        return None, w, h
    lms = {}
    for name, idx in LM.items():
        lm = results.pose_landmarks.landmark[idx]
        lms[name] = {
            'x': lm.x * w,
            'y': lm.y * h,
            'visibility': lm.visibility,
        }
    return lms, w, h


def mask_height_span(mask):
    """Return (top_y, bottom_y) of the body mask."""
    rows = np.any(mask, axis=1)
    ys = np.where(rows)[0]
    if len(ys) == 0:
        return None, None
    return int(ys[0]), int(ys[-1])


def width_at_y(mask, y, margin=4):
    """Width in pixels of the mask at row y (averaged over ±margin rows)."""
    h = mask.shape[0]
    widths = []
    for dy in range(-margin, margin + 1):
        row = y + dy
        if 0 <= row < h:
            cols = np.where(mask[row])[0]
            if len(cols) >= 2:
                widths.append(int(cols[-1]) - int(cols[0]))
    return int(np.median(widths)) if widths else 0


def width_at_y_bounded(mask, y, x_min=0, x_max=None, margin=2):
    """Width of mask at row y restricted to x_min..x_max column range."""
    h, w_img = mask.shape
    xl = max(0, int(x_min))
    # Clamp to [0, w_img] — avoids Python negative-index wraparound
    xr = max(0, min(w_img, int(x_max))) if x_max is not None else w_img
    if xr <= xl:
        return 0
    widths = []
    for dy in range(-margin, margin + 1):
        row = y + dy
        if 0 <= row < h:
            cols = np.where(mask[row, xl:xr])[0]
            if len(cols) >= 2:
                widths.append(int(cols[-1]) - int(cols[0]))
    return int(np.median(widths)) if widths else 0


def ellipse_circumference(a, b):
    """Ramanujan approximation for ellipse perimeter. a, b = semi-axes."""
    h = ((a - b) ** 2) / ((a + b) ** 2)
    return math.pi * (a + b) * (1 + 3 * h / (10 + math.sqrt(4 - 3 * h)))


def measure_limb_perp(mask, p1, p2, scale, n_samples=18,
                       center_x_min=None, center_x_max=None,
                       ray_x_min=None,    ray_x_max=None,
                       t_min=0.20, t_max=0.80):
    """
    Find the maximum-girth perpendicular cross-section of a limb.

    Scans n_samples planes perpendicular to the limb axis (p1→p2) between
    t_min and t_max of the segment.  For each plane:
      - The scan center must satisfy center_x_min ≤ cx ≤ center_x_max (if set).
        This keeps the center on the limb, not inside the torso or other limb.
      - Each raycast step is rejected if its xi falls outside ray_x_min..ray_x_max.
        This prevents the ray from crossing into adjacent body parts.

    Returns (width_cm, x0, y0, x1, y1, center_y) or (None,)*6 on failure.
    """
    if p1 is None or p2 is None:
        return (None,) * 6
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = math.sqrt(dx * dx + dy * dy)
    if length < 10:
        return (None,) * 6

    px = -dy / length   # perpendicular unit vector
    py =  dx / length
    h_m, w_m = mask.shape

    best_width = 0
    best_line  = None
    best_cy    = int((p1[1] + p2[1]) / 2)

    t_span = t_max - t_min
    for i in range(n_samples):
        t  = t_min + t_span * i / max(n_samples - 1, 1)
        cx = p1[0] + t * dx
        cy = p1[1] + t * dy
        cxi, cyi = int(round(cx)), int(round(cy))

        # Reject plane if center is outside the allowed x window
        if center_x_min is not None and cx < center_x_min: continue
        if center_x_max is not None and cx > center_x_max: continue
        if not (0 <= cxi < w_m and 0 <= cyi < h_m):        continue
        if not mask[cyi, cxi]:                              continue

        def _ray(sign):
            d_end = 0
            for d in range(1, 200):
                xi = int(round(cx + sign * d * px))
                yi = int(round(cy + sign * d * py))
                if not (0 <= xi < w_m and 0 <= yi < h_m): break
                if ray_x_min is not None and xi < ray_x_min: break
                if ray_x_max is not None and xi > ray_x_max: break
                if not mask[yi, xi]: break
                d_end = d
            return d_end

        d_pos = _ray(+1)
        d_neg = _ray(-1)

        width_px = d_pos + d_neg
        if width_px > best_width:
            best_width = width_px
            best_cy    = cyi
            best_line  = (
                int(round(cx - d_neg * px)), int(round(cy - d_neg * py)),
                int(round(cx + d_pos * px)), int(round(cy + d_pos * py)),
            )

    if best_line is None or best_width == 0:
        return (None,) * 6

    return round(best_width * scale, 1), *best_line, best_cy


def classify(value, key, sex='female'):
    if key == 'waist_to_height':
        return 'low_risk' if value < 0.5 else 'elevated_risk'
    if key == 'waist_to_hip':
        thresh = 0.85 if sex == 'female' else 0.90
        return 'adequate' if value < thresh else 'elevated_risk'
    if key == 'conicity_index':
        return 'adequate' if value < 1.18 else 'elevated_risk'
    return None


def make_overlay(img_pil, mask, lms, measure_ys, scale, side='front',
                 overlay_lines=None, measure_x_bounds=None):
    """
    Draw segmentation outline + measurement lines.
    overlay_lines : {label: (x0,y0,x1,y1)} — angled perpendicular lines (limbs)
    measure_x_bounds: {label: (x0,x1)}     — horizontal lines (torso)
    """
    arr = np.array(img_pil.convert('RGB'))
    mask_u8 = mask.astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(arr, contours, -1, (80, 200, 120), 2)

    for label, y_px in measure_ys.items():
        y = int(y_px)
        if overlay_lines and label in overlay_lines:
            x0, y0, x1, y1 = overlay_lines[label]
            cv2.line(arr, (x0, y0), (x1, y1), (255, 200, 0), 2)
            mid_x = (x0 + x1) // 2
            mid_y = (y0 + y1) // 2
            cv2.putText(arr, label, (mid_x - 20, mid_y - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        elif measure_x_bounds and label in measure_x_bounds:
            x0, x1 = measure_x_bounds[label]
            cv2.line(arr, (x0, y), (x1, y), (255, 200, 0), 2)
            mid_x = (x0 + x1) // 2
            cv2.putText(arr, label, (mid_x - 20, y - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        else:
            cols = np.where(mask[y] if 0 <= y < mask.shape[0] else [])[0]
            if len(cols) < 2:
                continue
            x0, x1 = int(cols[0]), int(cols[-1])
            cv2.line(arr, (x0, y), (x1, y), (255, 200, 0), 2)
            mid = (x0 + x1) // 2
            cv2.putText(arr, label, (mid - 20, y - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    if lms:
        for name, pt in lms.items():
            cv2.circle(arr, (int(pt['x']), int(pt['y'])), 4, (100, 180, 255), -1)
    img_out = Image.fromarray(arr)
    buf = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img_out.save(buf.name, quality=75)
    buf.close()
    with open(buf.name, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    os.unlink(buf.name)
    return b64


# ISO/IEC 7810 ID-1 credit card — worldwide standard
CARD_W_MM = 85.60
CARD_H_MM = 53.98
CARD_ASPECT = CARD_W_MM / CARD_H_MM  # ≈ 1.586


def detect_credit_card(img_np, mask=None, y_range=None, x_range=None):
    """
    Detect a credit card (ISO 7810 ID-1, 85.60×53.98 mm) using minAreaRect.
    minAreaRect handles imperfect edges, slight rotation, and non-4-point contours.

    y_range : (lo_frac, hi_frac) of image height where card centre is expected.
    x_range : (lo_frac, hi_frac) of image width where card centre is expected.

    Returns (scale_cm_per_px, bbox_xywh) or (None, None).
    """
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    img_h, img_w = img_np.shape[:2]

    y_lo = int(img_h * y_range[0]) if y_range else 0
    y_hi = int(img_h * y_range[1]) if y_range else img_h
    x_lo = int(img_w * x_range[0]) if x_range else 0
    x_hi = int(img_w * x_range[1]) if x_range else img_w

    best_score = 0
    best_result = (None, None)
    debug_candidates = []

    for lo, hi in [(25, 80), (40, 120), (60, 160), (90, 220)]:
        edges = cv2.Canny(blurred, lo, hi)
        edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            if len(cnt) < 4:
                continue

            # Use minimum area rectangle — robust to rotation and blurry edges
            rect = cv2.minAreaRect(cnt)
            (rx, ry), (rw, rh), angle = rect
            if rw < rh:
                rw, rh = rh, rw   # ensure rw is always the longer dimension

            if rw == 0 or rh == 0:
                continue

            # Aspect ratio: landscape 1.30–1.90 (portrait handled by swap above)
            aspect = rw / rh
            if not (1.30 < aspect < 1.90):
                continue

            # Size: card long side 4–25 % of image width
            if rw < img_w * 0.04 or rw > img_w * 0.25:
                continue

            # Solidity: contour area vs min-area rect — rejects fragmented shapes
            contour_area = cv2.contourArea(cnt)
            rect_area = rw * rh
            if rect_area < 1:
                continue
            solidity = contour_area / rect_area
            if solidity < 0.70:
                continue

            cx_c, cy_c = int(rx), int(ry)

            # Positional filter: card must be in expected region of image
            if not (y_lo <= cy_c <= y_hi and x_lo <= cx_c <= x_hi):
                continue

            # Centre must be on the body mask
            if mask is not None:
                if not (0 <= cy_c < mask.shape[0] and 0 <= cx_c < mask.shape[1]):
                    continue
                if not mask[cy_c, cx_c]:
                    continue

            # Score by how close aspect is to 1.586 × how large it is
            aspect_score = 1.0 - abs(aspect - CARD_ASPECT) / CARD_ASPECT
            score = contour_area * aspect_score

            # ── Perspective/tilt correction ──────────────────────────────
            # A tilted card projects as a trapezoid (parallel edges have
            # different lengths). minAreaRect ignores this and fits a
            # single rectangle to the whole shape, biasing the scale.
            # If we can approximate the contour to 4 corners, we can:
            #   1) average parallel edges → cancels linear perspective bias
            #   2) use the diagonal as a cross-check (more tilt-tolerant)
            long_avg, short_avg, tilt_ratio, corners_ok = rw, rh, 0.0, False
            epsilon = 0.02 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) == 4:
                pts = approx.reshape(4, 2).astype(np.float32)
                s = pts.sum(axis=1)
                d = (pts[:, 0] - pts[:, 1])
                tl = pts[np.argmin(s)]
                br = pts[np.argmax(s)]
                tr = pts[np.argmax(d)]
                bl = pts[np.argmin(d)]
                top    = float(np.linalg.norm(tr - tl))
                bottom = float(np.linalg.norm(br - bl))
                left   = float(np.linalg.norm(bl - tl))
                right  = float(np.linalg.norm(br - tr))
                horiz_avg = (top + bottom) / 2.0
                vert_avg  = (left + right)  / 2.0
                if horiz_avg > vert_avg:
                    long_avg, short_avg = horiz_avg, vert_avg
                    tilt_ratio = abs(top - bottom) / max(top, bottom, 1e-6)
                else:
                    long_avg, short_avg = vert_avg, horiz_avg
                    tilt_ratio = abs(left - right) / max(left, right, 1e-6)
                corners_ok = True

            debug_candidates.append(
                f'aspect={aspect:.3f} rw={rw:.0f}px ({rw/img_w*100:.1f}%) '
                f'sol={solidity:.2f} 4c={corners_ok} tilt={tilt_ratio:.2f} '
                f'score={score:.0f}'
            )

            if score > best_score:
                best_score = score
                if corners_ok and tilt_ratio > 0.05:
                    # Card is tilted — use average of parallel edges to cancel
                    # linear perspective, then geometric-mean the two dimensions.
                    s_l = (CARD_W_MM / long_avg)  / 10
                    s_s = (CARD_H_MM / short_avg) / 10
                    scale_final = math.sqrt(s_l * s_s)
                else:
                    # Flat/nearly flat card — minAreaRect is fine
                    s_w = (CARD_W_MM / rw) / 10
                    s_h = (CARD_H_MM / rh) / 10
                    scale_final = (s_w + s_h) / 2
                x, y, bw, bh = cv2.boundingRect(cnt)
                best_result = (scale_final, (x, y, bw, bh))

    print(f'[card-detect] {len(debug_candidates)} candidates: '
          f'{debug_candidates[:5]}', file=sys.stderr)
    if best_result[0]:
        print(f'[card-detect] accepted scale={best_result[0]:.5f} cm/px', file=sys.stderr)
    else:
        print('[card-detect] no card found', file=sys.stderr)

    return best_result


def analyze(front_path, side_path, height_cm, weight_kg, sex, age,
            front_pitch_deg=None, side_pitch_deg=None):
    warnings = []

    # ── Camera-tilt check ────────────────────────────────────────────────
    # Pitch is the phone's angle from vertical at the moment of capture (0 =
    # phone held perfectly upright, screen facing subject). A tilted phone
    # foreshortens the body vertically and breaks the "pixels-per-cm at card
    # plane applies at every y" assumption. We warn beyond ±12°; below that
    # the linear-scale approximation stays within ~2 % of true.
    _TILT_WARN_DEG = 12.0
    def _pitch_num(p):
        try: return float(p) if p is not None and p != '' else None
        except (TypeError, ValueError): return None
    front_pitch_deg = _pitch_num(front_pitch_deg)
    side_pitch_deg  = _pitch_num(side_pitch_deg)
    if front_pitch_deg is not None and abs(front_pitch_deg) > _TILT_WARN_DEG:
        warnings.append('camera_tilted_front')
    if side_pitch_deg is not None and abs(side_pitch_deg) > _TILT_WARN_DEG:
        warnings.append('camera_tilted_side')

    # ── Load images ──────────────────────────────────────────────────────
    try:
        front_pil = load_image(front_path)
        side_pil  = load_image(side_path)
    except Exception as e:
        raise ValueError(f'Não conseguimos abrir as fotos ({e}). Verifique se são imagens válidas em JPEG ou PNG.')

    # [CHECK] low_resolution — flag but continue
    if front_pil.size[1] < 1200 or side_pil.size[1] < 1200:
        warnings.append('low_resolution')

    # ── Segment ──────────────────────────────────────────────────────────
    try:
        front_rgba = segment_body(front_pil)
        side_rgba  = segment_body(side_pil)
    except Exception as e:
        raise ValueError(f'Falha ao remover o fundo das fotos ({e}). Tente com fundo mais simples e iluminação uniforme.')
    front_mask = get_mask(front_rgba)
    side_mask  = get_mask(side_rgba)

    # [CHECK] low_segmentation_confidence — high partial-alpha ratio = noisy mask
    def _seg_quality(rgba_img):
        alpha = np.array(rgba_img)[:, :, 3]
        definite = int((alpha > 200).sum())
        partial  = int(((alpha > 30) & (alpha <= 200)).sum())
        return partial / max(definite, 1)
    if _seg_quality(front_rgba) > 0.75 or _seg_quality(side_rgba) > 0.75:
        warnings.append('low_segmentation_confidence')

    # ── Landmarks ────────────────────────────────────────────────────────
    front_lms, fw, fh = get_landmarks(front_pil)
    side_lms,  sw, sh = get_landmarks(side_pil)

    if not front_lms:
        warnings.append('front_pose_not_detected')
    if not side_lms:
        warnings.append('side_pose_not_detected')

    # Hard stop: if neither photo has any body landmarks, we can't measure anything.
    if not front_lms and not side_lms:
        raise ValueError(
            'Corpo não detectado em nenhuma das fotos. '
            'Certifique-se de que o corpo inteiro está enquadrado, '
            'com boa iluminação e fundo simples.'
        )

    # ── Scale calibration ────────────────────────────────────────────────────
    # Primary: credit card detection (ISO 7810, 85.60×53.98 mm — worldwide standard).
    # This gives scale at the exact body plane, independent of camera distance.
    # Fallback: mask height divided by user-provided height_cm.
    front_np = np.array(front_pil)
    side_np  = np.array(side_pil)

    # Front: card on centre of chest → upper-centre body
    # Side:  card on right lateral waist → mid-height, no x constraint (varies with orientation)
    card_scale_front, card_bbox_front = detect_credit_card(
        front_np, front_mask, y_range=(0.10, 0.62), x_range=(0.18, 0.82))
    card_scale_side,  card_bbox_side  = detect_credit_card(
        side_np, side_mask, y_range=(0.25, 0.78))

    top_y, bottom_y = mask_height_span(front_mask)

    height_cm_estimated = None
    height_cm_known = height_cm and height_cm > 0  # False when user didn't provide height

    def _validate_card_scale(card_scale, body_span_px):
        """Reject card scale if the implied height is implausible or conflicts with stated height."""
        if card_scale is None or body_span_px is None or body_span_px < 50:
            return False
        estimated = body_span_px * card_scale
        if estimated < 100 or estimated > 250:   # outside human range
            return False
        if height_cm_known:
            return abs(estimated - height_cm) / max(height_cm, 1) <= 0.30
        return True  # no stated height to compare against — accept if in human range

    body_span_front = (bottom_y - top_y) if (top_y is not None and bottom_y is not None) else None

    if card_scale_front is not None and _validate_card_scale(card_scale_front, body_span_front):
        scale = card_scale_front
        height_cm_estimated = round(body_span_front * scale, 1)
        # Use estimated height for all downstream calculations when none was provided
        if not height_cm_known:
            height_cm = height_cm_estimated
    elif card_scale_front is not None:
        # Card detected but sanity check failed — likely false positive
        warnings.append('card_scale_rejected')
        card_scale_front = None
        if not height_cm_known:
            raise ValueError(
                'Cartão de crédito não detectado correctamente e altura não fornecida. '
                'Cole o cartão plano no centro do peito e tente novamente, '
                'ou preencha a altura manualmente.'
            )
        scale = height_cm / body_span_front if body_span_front and body_span_front > 50 else 1.0
        if scale == 1.0:
            warnings.append('scale_calibration_failed')
    elif body_span_front and body_span_front > 50:
        if not height_cm_known:
            raise ValueError(
                'Cartão de crédito não detectado e altura não fornecida. '
                'Cole o cartão plano no centro do peito e tente novamente, '
                'ou preencha a altura manualmente.'
            )
        scale = height_cm / body_span_front
    else:
        warnings.append('scale_calibration_failed')
        scale = 1.0

    top_y_s, bottom_y_s = mask_height_span(side_mask)
    body_span_side = (bottom_y_s - top_y_s) if (top_y_s and bottom_y_s) else None

    if card_scale_side is not None and _validate_card_scale(card_scale_side, body_span_side):
        scale_side = card_scale_side
    elif card_scale_side is not None:
        warnings.append('card_scale_side_rejected')
        card_scale_side = None
        scale_side = (height_cm / body_span_side
                      if body_span_side and body_span_side > 50 and height_cm
                      else scale)
    elif top_y_s and bottom_y_s and (bottom_y_s - top_y_s) > 50:
        scale_side = height_cm / (bottom_y_s - top_y_s)
    else:
        scale_side = scale
        warnings.append('side_scale_fallback')

    # Card centre y positions for anchoring measurements (only if scale passed validation)
    card_front_cy = None
    if card_scale_front is not None and card_bbox_front:
        _x, _y, _bw, _bh = card_bbox_front
        card_front_cy = _y + _bh / 2

    card_side_cy = None
    if card_scale_side is not None and card_bbox_side:
        _x, _y, _bw, _bh = card_bbox_side
        card_side_cy = _y + _bh / 2

    print(f'[card-anchor] front_cy={card_front_cy} side_cy={card_side_cy}', file=sys.stderr)

    def front_y_from_side(side_y_px):
        """Map a side-photo y pixel to the equivalent front-photo y (inverse of side_y)."""
        if side_y_px is None or top_y_s is None or bottom_y_s is None: return None
        rel = (side_y_px - top_y_s) / max(bottom_y_s - top_y_s, 1)
        if top_y is None or bottom_y is None: return None
        return top_y + rel * (bottom_y - top_y)

    # cropped_head/cropped_feet removed — rembg masks routinely touch frame edges
    # even in well-framed photos; scale_calibration_failed covers truly unusable crops.

    # ── Reference Y positions from landmarks (or fallback geometry) ───────
    def lm_y(lms, *names):
        for n in names:
            if lms and n in lms and lms[n]['visibility'] > 0.5:
                return lms[n]['y']
        return None

    def mid_y(lms, a, b):
        ya = lm_y(lms, a)
        yb = lm_y(lms, b)
        if ya and yb:
            return (ya + yb) / 2
        return ya or yb

    shoulder_y = mid_y(front_lms, 'left_shoulder', 'right_shoulder') if front_lms else None
    hip_y      = mid_y(front_lms, 'left_hip', 'right_hip')           if front_lms else None
    knee_y     = mid_y(front_lms, 'left_knee', 'right_knee')         if front_lms else None
    ankle_y    = mid_y(front_lms, 'left_ankle', 'right_ankle')       if front_lms else None
    elbow_y    = mid_y(front_lms, 'left_elbow', 'right_elbow')       if front_lms else None
    wrist_y    = mid_y(front_lms, 'left_wrist', 'right_wrist')       if front_lms else None

    # Fallback: interpolate from known body proportions if landmarks missing
    if top_y is not None and bottom_y is not None:
        span = bottom_y - top_y
        if shoulder_y is None: shoulder_y = top_y + span * 0.18
        if hip_y      is None: hip_y      = top_y + span * 0.52
        if knee_y     is None: knee_y     = top_y + span * 0.72
        if ankle_y    is None: ankle_y    = top_y + span * 0.92
        if elbow_y    is None: elbow_y    = top_y + span * 0.42
        if wrist_y    is None: wrist_y    = top_y + span * 0.57

    # Peito: ~15% do ombro ao quadril (nível das axilas)
    chest_y = shoulder_y + (hip_y - shoulder_y) * 0.15 if (shoulder_y and hip_y) else None
    # Cintura: ~60% from shoulder to hip (narrowest torso zone)
    waist_y = shoulder_y + (hip_y - shoulder_y) * 0.60 if (shoulder_y and hip_y) else None
    # Pescoço: ~70% from top to shoulder (above clavicles, clear of hair)
    neck_y = top_y + (shoulder_y - top_y) * 0.70 if (top_y is not None and shoulder_y) else None
    # Antebraço: between elbow and wrist
    forearm_y = (elbow_y + wrist_y) / 2 if (elbow_y and wrist_y) else None
    # Braço: between shoulder and elbow
    arm_y = (shoulder_y + elbow_y) / 2 if (shoulder_y and elbow_y) else None
    # Coxa: between hip and knee
    thigh_y = hip_y + (knee_y - hip_y) * 0.45 if (hip_y and knee_y) else None
    # Panturrilha: between knee and ankle
    calf_y = knee_y + (ankle_y - knee_y) * 0.40 if (knee_y and ankle_y) else None

    measure_ys_front = {k: v for k, v in {
        'neck': neck_y, 'chest': chest_y,
        'waist': waist_y, 'hip': hip_y, 'bicep': arm_y,
        'forearm': forearm_y, 'thigh': thigh_y, 'calf': calf_y,
    }.items() if v is not None}

    # ── Landmark helpers ──────────────────────────────────────────────────
    def _lm_x(lms, name):
        if lms and name in lms and lms[name].get('visibility', 0) > 0.4:
            return lms[name]['x']
        return None

    def _lm_xy(lms, name):
        if lms and name in lms and lms[name].get('visibility', 0) > 0.4:
            return (lms[name]['x'], lms[name]['y'])
        return None

    lsx = _lm_x(front_lms, 'left_shoulder')
    rsx = _lm_x(front_lms, 'right_shoulder')
    lhx = _lm_x(front_lms, 'left_hip')
    rhx = _lm_x(front_lms, 'right_hip')

    # ── Shaped protocol pose quality checks ──────────────────────────────
    # [CHECK] front_arms_too_close — both wrists inside hip-width column
    if front_lms:
        lwx_c = _lm_x(front_lms, 'left_wrist')
        rwx_c = _lm_x(front_lms, 'right_wrist')
        lhx_c = _lm_x(front_lms, 'left_hip')
        rhx_c = _lm_x(front_lms, 'right_hip')
        if all(v is not None for v in [lwx_c, rwx_c, lhx_c, rhx_c]):
            hx_min, hx_max = min(lhx_c, rhx_c), max(lhx_c, rhx_c)
            if hx_min < lwx_c < hx_max and hx_min < rwx_c < hx_max:
                warnings.append('front_arms_too_close')

    # [CHECK] front_legs_together — ankle separation < 25 % of hip width
    if front_lms:
        lax_c = _lm_x(front_lms, 'left_ankle')
        rax_c = _lm_x(front_lms, 'right_ankle')
        lhx_c = _lm_x(front_lms, 'left_hip')
        rhx_c = _lm_x(front_lms, 'right_hip')
        if all(v is not None for v in [lax_c, rax_c, lhx_c, rhx_c]):
            ankle_sep = abs(lax_c - rax_c)
            hip_w_px  = abs(lhx_c - rhx_c)
            if hip_w_px > 0 and ankle_sep < 0.25 * hip_w_px:
                warnings.append('front_legs_together')

    # side_not_true_profile removed — MediaPipe infers both hips even when one is hidden,
    # so visibility-based profile detection always fires false positives.
    # side_right_arm_not_raised removed — arm toward camera has low wrist visibility
    # by definition (Shaped protocol), so the check always fired incorrectly.

    shoulder_xs = [x for x in [lsx, rsx] if x is not None]
    shoulder_xl = min(shoulder_xs) if len(shoulder_xs) >= 2 else None
    shoulder_xr = max(shoulder_xs) if len(shoulder_xs) >= 2 else None
    has_shoulder_bounds = shoulder_xl is not None

    hip_xs = [x for x in [lhx, rhx] if x is not None]
    hip_xl = min(hip_xs) if len(hip_xs) >= 2 else shoulder_xl
    hip_xr = max(hip_xs) if len(hip_xs) >= 2 else shoulder_xr

    # ── Torso: horizontal measurements ───────────────────────────────────────
    def _meas_horiz(y, xl, xr):
        """Bounded horizontal measurement (waist: bounded by shoulder landmarks)."""
        if y is None or xl is None or xr is None: return None, None, None
        xl_c = max(0, int(xl)); xr_c = max(0, min(front_mask.shape[1], int(xr)))
        if xr_c <= xl_c: return None, None, None
        x0s, x1s = [], []
        for dy in range(-4, 5):
            row = int(y) + dy
            if 0 <= row < front_mask.shape[0]:
                cols = np.where(front_mask[row, xl_c:xr_c])[0]
                if len(cols) >= 2:
                    x0s.append(xl_c + int(cols[0])); x1s.append(xl_c + int(cols[-1]))
        if not x0s: return None, None, None
        x0 = int(np.median(x0s)); x1 = int(np.median(x1s))
        w_px = x1 - x0
        return (round(w_px * scale, 1) if w_px > 0 else None), x0, x1

    def _meas_horiz_body(y, min_width_frac=0.08):
        """Full-width measurement using the contiguous body segment nearest the image
        centre. Avoids the landmark-bounds problem for the hip, where the anatomical
        landmarks sit at the joint (inside the pelvis) and miss the full glute width.

        min_width_frac : reject runs narrower than this fraction of image width
                         (default 8% — filters out rembg artifacts / hair strands / dark
                         patches between arm and torso that the old code was picking).
        """
        if y is None: return None, None, None
        cx_body = fw / 2
        min_w = int(fw * min_width_frac)
        x0s, x1s = [], []
        for dy in range(-4, 5):
            row_i = int(y) + dy
            if not (0 <= row_i < front_mask.shape[0]): continue
            m = front_mask[row_i]
            # Collect all contiguous runs
            runs, in_run, start = [], False, 0
            for xi in range(fw):
                if m[xi] and not in_run:
                    in_run, start = True, xi
                elif not m[xi] and in_run:
                    runs.append((start, xi - 1)); in_run = False
            if in_run: runs.append((start, fw - 1))
            # Reject narrow artifacts (arms-in-A-pose separated from torso are OK because
            # they're on the sides — we always pick the RUN whose CENTRE is nearest the
            # image centre, so tiny background artifacts near centre would still win.
            # Width filter guarantees we pick a real body segment.)
            runs = [r for r in runs if (r[1] - r[0]) >= min_w]
            if not runs: continue
            # Among wide-enough runs, pick the one whose centre is closest to image centre
            best = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - cx_body))
            x0s.append(best[0]); x1s.append(best[1])
        if not x0s: return None, None, None
        x0 = int(np.median(x0s)); x1 = int(np.median(x1s))
        w_px = x1 - x0
        return (round(w_px * scale, 1) if w_px > 0 else None), x0, x1

    measure_x_bounds_front = {}  # label → (x0, x1) for horizontal overlay lines
    overlay_lines_front    = {}  # label → (x0,y0,x1,y1) for angled overlay lines

    # Chest: measured at NIPPLE line (18-30% shoulder-to-hip = 4th intercostal space).
    # Range starts at 18% to skip the shoulder/clavicle zone (which is wider than chest
    # and where the extended-forward arm attaches — using it would inflate width AND
    # contaminate the side-photo depth measurement with the arm silhouette).
    # Bounded by shoulder landmark x-positions so any arm beyond that is excluded.
    chest_w, chx0, chx1 = None, None, None
    if shoulder_y is not None and hip_y is not None:
        _span = hip_y - shoulder_y
        _ch_top = int(shoulder_y + _span * 0.18)
        _ch_bot = int(shoulder_y + _span * 0.30)
        _ch_best_w, _ch_best_y = None, None
        _ch_xl = shoulder_xl if has_shoulder_bounds else None
        _ch_xr = shoulder_xr if has_shoulder_bounds else None
        for _sy in range(_ch_top, _ch_bot, 2):
            if _ch_xl is not None:
                _w, _x0, _x1 = _meas_horiz(_sy, _ch_xl, _ch_xr)
            else:
                _w, _x0, _x1 = _meas_horiz_body(_sy)
            if _w is not None and (_ch_best_w is None or _w > _ch_best_w):
                _ch_best_w, _ch_best_y, chx0, chx1 = _w, _sy, _x0, _x1
        if _ch_best_w is not None:
            chest_w = _ch_best_w
            chest_y = _ch_best_y
            measure_ys_front['chest'] = _ch_best_y
    if chx0 is not None: measure_x_bounds_front['chest'] = (chx0, chx1)

    # Waist: measured at UMBILICUS level (55-70% shoulder-to-hip, pick max width).
    # This matches the consumer tape protocol (fita ao nível do umbigo). For
    # people with abdominal fat, umbilicus width > anatomical narrow width, and
    # umbilicus depth captures the belly bulge → ellipse gives real tape value
    # directly, without needing a SHAPE_K compensation factor (removed for waist).
    # A separate min-width scan below computes the anatomical narrow waist for
    # internal use in the Navy body-fat formula (original 1984 protocol).
    waist_w, wx0, wx1 = None, None, None
    _wz_rows_scanned = 0
    _wz_rows_valid = 0
    narrow_waist_cm = None
    if shoulder_y is not None and hip_y is not None:
        _span = hip_y - shoulder_y
        # Umbilicus zone: max width in 55-70% shoulder-to-hip
        _wz_top = int(shoulder_y + _span * 0.55)
        _wz_bot = int(shoulder_y + _span * 0.70)
        _wz_best_w, _wz_best_y = None, None
        for _sy in range(_wz_top, _wz_bot, 2):
            _wz_rows_scanned += 1
            _w, _x0, _x1 = _meas_horiz_body(_sy)
            if _w is not None:
                _wz_rows_valid += 1
                if _wz_best_w is None or _w > _wz_best_w:   # MAX for umbilicus
                    _wz_best_w, _wz_best_y, wx0, wx1 = _w, _sy, _x0, _x1
        if _wz_best_w is not None:
            waist_w = _wz_best_w
            waist_y = _wz_best_y
            measure_ys_front['waist'] = _wz_best_y

        # Anatomical narrow waist (min-width, 45-65% zone) — internal only
        _nw_top = int(shoulder_y + _span * 0.45)
        _nw_bot = int(shoulder_y + _span * 0.65)
        _nw_best_w = None
        for _sy in range(_nw_top, _nw_bot, 2):
            _nw, _, _ = _meas_horiz_body(_sy)
            if _nw is not None and (_nw_best_w is None or _nw < _nw_best_w):
                _nw_best_w = _nw
        narrow_waist_cm = _nw_best_w
        print(f'[waist-scan] umb_range=[{_wz_top},{_wz_bot}] scanned={_wz_rows_scanned} '
              f'valid={_wz_rows_valid} umb_w={_wz_best_w} umb_y={_wz_best_y} '
              f'narrow_w={narrow_waist_cm} wx0={wx0} wx1={wx1}', file=sys.stderr)
    if wx0 is not None: measure_x_bounds_front['waist'] = (wx0, wx1)

    # Hip: max-width zone scan from hip landmark to 30% towards knee (captures glute peak)
    hip_w, hx0, hx1 = None, None, None
    hip_scan_y = hip_y
    if hip_y is not None:
        _hp_top = int(hip_y)
        _hp_bot = int(hip_y + (knee_y - hip_y) * 0.30) if knee_y else int(hip_y + 60)
        _hp_best_w, _hp_best_y = None, None
        for _sy in range(_hp_top, _hp_bot, 2):
            _w, _x0, _x1 = _meas_horiz_body(_sy)
            if _w is not None and (_hp_best_w is None or _w > _hp_best_w):
                _hp_best_w, _hp_best_y, hx0, hx1 = _w, _sy, _x0, _x1
        if _hp_best_w is not None:
            hip_w = _hp_best_w
            hip_scan_y = _hp_best_y
            measure_ys_front['hip'] = _hp_best_y
    if hx0 is not None: measure_x_bounds_front['hip'] = (hx0, hx1)

    # Neck: find the minimum horizontal width between chin and shoulder level.
    # Empirical (davi 2026-08-24 with tape=34): chin_y factor 0.28 finds the
    # true narrow neck (measured 33.9). Factor 0.47 pushed scan into the
    # trapezius/base (measured 43.7, way over). Keep 0.28.
    # min_width_frac lowered to 3% because the neck is naturally narrow
    # (~11cm / ~90px in a 1500px image ≈ 6%). Default 8% filters it out
    # and forces _meas_horiz_body to pick a wider run (jaw/head).
    neck_w = None
    nose_y_lm = lm_y(front_lms, 'nose')
    if top_y is not None and shoulder_y is not None:
        if nose_y_lm is not None and nose_y_lm < shoulder_y:
            chin_y_est = nose_y_lm + (shoulder_y - nose_y_lm) * 0.28
        else:
            chin_y_est = top_y + (shoulder_y - top_y) * 0.65
        _nk_top = int(chin_y_est + 5)      # scan from just below chin
        _nk_bot = int(shoulder_y) - 15     # to just above shoulder
        _nk_min_px = None
        _nk_best_y = None
        _nkx0_f, _nkx1_f = None, None
        _nk_rows_valid = 0
        for _sy in range(_nk_top, _nk_bot, 2):
            _, _x0, _x1 = _meas_horiz_body(_sy, min_width_frac=0.03)
            if _x0 is not None and _x1 is not None:
                _nk_rows_valid += 1
                _w = _x1 - _x0
                if _nk_min_px is None or _w < _nk_min_px:
                    _nk_min_px = _w
                    _nk_best_y = _sy
                    _nkx0_f, _nkx1_f = _x0, _x1
        if _nk_min_px and _nk_best_y:
            neck_w = round(_nk_min_px * scale, 1)
            measure_x_bounds_front['neck'] = (_nkx0_f, _nkx1_f)
            measure_ys_front['neck'] = _nk_best_y
        print(f'[neck-scan] chin_y={int(chin_y_est)} range=[{_nk_top},{_nk_bot}] '
              f'nose_y={nose_y_lm} valid={_nk_rows_valid} '
              f'best_w_px={_nk_min_px} best_y={_nk_best_y} neck_cm={neck_w}', file=sys.stderr)

    # ── Limbs: perpendicular scan along limb axis ─────────────────────────
    # Pick the arm/leg side whose distal landmark (elbow / knee) is furthest
    # from the image centre — that limb is most likely in A-pose / separated.
    cx_img = fw / 2

    def _far_side(left_prox, left_dist, right_prox, right_dist):
        """Return (side_name, p1_xy, p2_xy) for the limb whose distal end is furthest laterally."""
        lp = _lm_xy(front_lms, left_prox);  ld = _lm_xy(front_lms, left_dist)
        rp = _lm_xy(front_lms, right_prox); rd = _lm_xy(front_lms, right_dist)
        if ld and rd:
            if abs(ld[0] - cx_img) >= abs(rd[0] - cx_img):
                return 'left', lp, ld
            return 'right', rp, rd
        if lp and ld: return 'left',  lp, ld
        if rp and rd: return 'right', rp, rd
        return None, None, None

    # ── Arm x-bounds: derived from landmark x-range (shoulder→elbow / elbow→wrist) ──
    # Using the mask at elbow level is unreliable when the arm touches the torso —
    # the mask is one contiguous blob that spans arm + torso, causing the bounds to
    # include the chest and the scan to measure the torso width instead of the arm.
    # Instead, we use the proximal and distal landmark x coordinates directly:
    #   center_x_min/max: narrow band around the landmark x-range (keeps scan on arm)
    #   ray_x_min/max:    wider band (rays may extend to capture full arm girth)
    _ARM_CTR_MARGIN  = 20   # px around landmark x-range for scan center constraint
    _BICEP_RAY_MARGIN = 80  # px — covers ~14 cm arm diameter at typical scale
    _FA_RAY_MARGIN    = 60  # forearm is narrower

    def _arm_lm_bounds(prox_xy, dist_xy, ctr_margin, ray_margin):
        if not prox_xy or not dist_xy: return None, None, None, None
        px_x, dx_x = int(prox_xy[0]), int(dist_xy[0])
        _, w_m = front_mask.shape
        x_lo, x_hi = min(px_x, dx_x), max(px_x, dx_x)
        return (max(0, x_lo - ctr_margin), min(w_m, x_hi + ctr_margin),
                max(0, x_lo - ray_margin), min(w_m, x_hi + ray_margin))

    arm_side, sh_xy, el_xy = _far_side('left_shoulder','left_elbow','right_shoulder','right_elbow')

    def _bicep_separated(sh, el, side_nm, mask=None, width_correction_px=0):
        """
        Find bicep by scanning only rows where the arm has SEPARATED from the torso
        (two distinct contiguous runs). This is the only way to measure the arm
        without including the chest — stop exactly at the arm's green contour edge.
        Falls back gracefully: if arm never separates in the scan range, returns None.

        `mask` overrides `front_mask` — used to try eroded copies when the arm
        touches the torso. `width_correction_px` is added back to the measured
        width to compensate for that erosion.
        """
        if not sh or not el: return (None,)*6
        if mask is None: mask = front_mask
        sy_i = int(sh[1]); ey_i = int(el[1])
        if ey_i <= sy_i: return (None,)*6
        span = ey_i - sy_i
        cx_mid = fw / 2.0
        best_w, best_res = 0, (None,)*6
        # x-range where the arm landmark projects (shoulder + elbow x-spread + margin)
        arm_x_lo = int(min(sh[0], el[0])) - 30
        arm_x_hi = int(max(sh[0], el[0])) + 30
        # Start at 40% so we are clearly past the chest/axilla junction.
        for yi in range(int(sy_i + span * 0.40), int(sy_i + span * 0.75), 2):
            if not (0 <= yi < mask.shape[0]): continue
            row = mask[yi]
            runs, in_run = [], False
            for xi in range(fw):
                if row[xi] and not in_run:
                    in_run, start = True, xi
                elif not row[xi] and in_run:
                    runs.append((start, xi - 1)); in_run = False
            if in_run: runs.append((start, fw - 1))
            if len(runs) < 2: continue          # arm still merged with torso
            body = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - cx_mid))
            cands = [r for r in runs if r is not body]
            if not cands: continue
            if side_nm == 'left':
                arm = min(cands, key=lambda r: (r[0] + r[1]) / 2)
                if (arm[0] + arm[1]) / 2 >= cx_mid: continue
            else:
                arm = max(cands, key=lambda r: (r[0] + r[1]) / 2)
                if (arm[0] + arm[1]) / 2 <= cx_mid: continue
            # Verify run is within expected arm x-range (landmark-anchored)
            arm_cx = (arm[0] + arm[1]) / 2
            if not (arm_x_lo <= arm_cx <= arm_x_hi): continue
            w_px = arm[1] - arm[0] + width_correction_px
            if w_px < 5: continue
            if w_px > best_w:
                best_w = w_px
                # Expand overlay bounds by the correction so the yellow line
                # in the debug overlay lands on the anatomical edges, not the
                # eroded ones.
                pad = width_correction_px // 2
                best_res = (round(w_px * scale, 1),
                            max(0, arm[0] - pad), yi,
                            min(fw - 1, arm[1] + pad), yi, yi)
        return best_res

    # Attempt 1: progressive erosion of the mask until arm separates from torso.
    # Erode kernel 3x3 shrinks 1 px per iteration on each side, so `iters`
    # iterations remove `2*iters` px from the row width. Add that back.
    # Ranges from 0 (original) through 20 iters (~40px shrink each side) —
    # enough for tight-arms photos like Eugenia's.
    bicep_w, bx0, by0, bx1, by1, b_cy = (None,)*6
    for _erode_iters in [0, 2, 4, 6, 8, 12, 16, 20]:
        if _erode_iters == 0:
            _mask = None
            _corr = 0
        else:
            _kernel = np.ones((3, 3), np.uint8)
            _mask = cv2.erode(front_mask.astype(np.uint8), _kernel,
                              iterations=_erode_iters).astype(bool)
            _corr = 2 * _erode_iters
        _res = _bicep_separated(sh_xy, el_xy, arm_side,
                                mask=_mask, width_correction_px=_corr)
        if _res[0] is not None:
            bicep_w, bx0, by0, bx1, by1, b_cy = _res
            if _erode_iters > 0:
                print(f'[bicep-erosion] found separation after {_erode_iters} iters '
                      f'(+{_corr}px correction), bicep_w={bicep_w}cm', file=sys.stderr)
            break

    # Attempt 2: landmark-outer-edge scan with anatomical cap.
    # This assumes the arm's outer skin is the nearest mask edge going away
    # from the torso centerline. Works only if the arm sticks OUT of the
    # torso silhouette — for tight-against-body poses (Eugenia, Davi), the
    # mask is one big blob and the "outer edge" is actually the far side of
    # the person, not the arm. We cap half_w ≤ 60 px (~7 cm diameter at
    # typical scale, well below any plausible arm) to reject those runaway
    # scans quickly. Passing scans give a real anatomical width.
    _MAX_OUTER_HALF_W_PX = 60
    if bicep_w is None and sh_xy and el_xy:
        sy_i, ey_i = int(sh_xy[1]), int(el_xy[1])
        span = ey_i - sy_i
        if span > 0:
            best_w, best_res = 0, (None,)*6
            for yi in range(int(sy_i + span * 0.40), int(sy_i + span * 0.75), 2):
                if not (0 <= yi < front_mask.shape[0]): continue
                t = (yi - sy_i) / max(span, 1)
                lm_x = int(sh_xy[0] + t * (el_xy[0] - sh_xy[0]))
                if lm_x < 0 or lm_x >= fw: continue
                row = front_mask[yi]
                if not row[lm_x]: continue
                if arm_side == 'left':
                    x = lm_x
                    while x > 0 and row[x]: x -= 1
                    outer_x = x + 1
                    half_w = lm_x - outer_x
                else:
                    x = lm_x
                    while x < fw - 1 and row[x]: x += 1
                    outer_x = x - 1
                    half_w = outer_x - lm_x
                # Reject: too small (spurious), or larger than plausible
                # (mask leaks into torso — arm not really sticking out).
                if half_w < 5 or half_w > _MAX_OUTER_HALF_W_PX: continue
                w_px = 2 * half_w
                if w_px > best_w:
                    best_w = w_px
                    if arm_side == 'left':
                        best_res = (round(w_px * scale, 1),
                                    outer_x, yi, lm_x + half_w, yi, yi)
                    else:
                        best_res = (round(w_px * scale, 1),
                                    lm_x - half_w, yi, outer_x, yi, yi)
            if best_res[0] is not None:
                bicep_w, bx0, by0, bx1, by1, b_cy = best_res
                print(f'[bicep-outer-edge] {bicep_w}cm (landmark → outer skin × 2)',
                      file=sys.stderr)

    if bicep_w is None and sh_xy and el_xy:
        # Last-resort: landmark-bounds scan. Both erosion and outer-edge failed
        # — pathological photo. This is the leaky one that picks up torso;
        # results are guarded by the sanity check below.
        arm_cx_min, arm_cx_max, arm_rx_min, arm_rx_max = _arm_lm_bounds(
            sh_xy, el_xy, _ARM_CTR_MARGIN, _BICEP_RAY_MARGIN)
        bicep_w, bx0, by0, bx1, by1, b_cy = measure_limb_perp(
            front_mask, sh_xy, el_xy, scale,
            center_x_min=arm_cx_min, center_x_max=arm_cx_max,
            ray_x_min=arm_rx_min,    ray_x_max=arm_rx_max,
            t_min=0.45, t_max=0.68)

    if bx0 is not None:
        overlay_lines_front['bicep'] = (bx0, by0, bx1, by1)
        measure_ys_front['bicep']    = b_cy

    # ── Forearm: elbow → wrist ────────────────────────────────────────────
    el2_xy = _lm_xy(front_lms, f'{arm_side}_elbow') if arm_side else None
    wr_xy  = _lm_xy(front_lms, f'{arm_side}_wrist') if arm_side else None
    fa_cx_min, fa_cx_max, fa_rx_min, fa_rx_max = _arm_lm_bounds(
        el2_xy, wr_xy, _ARM_CTR_MARGIN, _FA_RAY_MARGIN)

    forearm_w, fx0, fy0, fx1, fy1, f_cy = measure_limb_perp(
        front_mask, el2_xy, wr_xy, scale,
        center_x_min=fa_cx_min, center_x_max=fa_cx_max,
        ray_x_min=fa_rx_min,    ray_x_max=fa_rx_max) \
        if (el2_xy and wr_xy and fa_cx_min is not None) else (None,)*6
    if fx0 is not None:
        overlay_lines_front['forearm'] = (fx0, fy0, fx1, fy1)
        measure_ys_front['forearm']    = f_cy

    # ── Bicep sanity check + anthropometric fallback ─────────────────────
    # The fallback landmark-bounds scan can leak into the torso when the arm
    # touches the trunk (Fabricio's photos routinely returned bicep ~53 cm ≈
    # width of mid-chest). Reject implausible readings using three guards:
    #  • bicep diameter > 40 % of shoulder-to-shoulder width (elite BB is ~30 %)
    #  • bicep diameter > 2× forearm diameter (real ratio is ~1.15×)
    #  • absolute cap of 18 cm diameter (~56 cm circumference)
    # When a rejection fires, don't drop the measurement — estimate the bicep
    # from the forearm using an anthropometric ratio (bicep_circ ≈ 1.20 ×
    # forearm_circ for adults; sex-adjusted). Better a ±5 % estimate than a
    # blank field.
    _bicep_estimated_from_forearm = False
    if bicep_w is not None:
        _shoulder_w_cm = ((shoulder_xr - shoulder_xl) * scale
                          if (shoulder_xl is not None and shoulder_xr is not None)
                          else None)
        _reject_reason = None
        if _shoulder_w_cm and bicep_w > 0.40 * _shoulder_w_cm:
            _reject_reason = f'>40% shoulder ({bicep_w:.1f}cm vs {0.40*_shoulder_w_cm:.1f}cm)'
        elif forearm_w is not None and bicep_w > 2.0 * forearm_w:
            _reject_reason = f'>2x forearm ({bicep_w:.1f}cm vs {2*forearm_w:.1f}cm)'
        elif bicep_w > 18.0:
            _reject_reason = f'>18cm absolute ({bicep_w:.1f}cm)'
        if _reject_reason:
            print(f'[bicep-reject] {_reject_reason}', file=sys.stderr)
            overlay_lines_front.pop('bicep', None)
            measure_ys_front.pop('bicep', None)
            if forearm_w is not None:
                # Anthropometric ratio, BMI-bracketed. Calibrated against the
                # davi 2026-08-27 pair (male, BMI 19.8, tape: bicep 26 cm /
                # forearm 22 cm → ratio 1.18). Higher BMI carries more muscle
                # / fat volume proportional to arm, so ratio grows slightly.
                if _bmi_for_k < 22:      # lean
                    _ratio = 1.18 if sex == 'male' else 1.12
                elif _bmi_for_k < 27:    # normal
                    _ratio = 1.22 if sex == 'male' else 1.15
                else:                    # heavier
                    _ratio = 1.26 if sex == 'male' else 1.18
                bicep_w = round(forearm_w * _ratio, 1)
                _bicep_estimated_from_forearm = True
                warnings.append('bicep_estimated_from_forearm')
                print(f'[bicep-estimate] forearm {forearm_w:.1f}cm × {_ratio} = {bicep_w:.1f}cm', file=sys.stderr)
            else:
                bicep_w = None
                warnings.append('bicep_measurement_rejected')

    # ── Thigh / Calf: interpolated medial separator ───────────────────────
    # The inner boundary between thighs moves from hip_mid (at hip level) to
    # knee_mid (at knee level). Interpolate at each measurement y-level.
    lkx_b = _lm_x(front_lms, 'left_knee');  rkx_b = _lm_x(front_lms, 'right_knee')
    lhx_b = _lm_x(front_lms, 'left_hip');   rhx_b = _lm_x(front_lms, 'right_hip')
    lax_b = _lm_x(front_lms, 'left_ankle'); rax_b = _lm_x(front_lms, 'right_ankle')
    knee_mid   = (lkx_b + rkx_b) / 2 if (lkx_b and rkx_b) else None
    hip_mid    = (lhx_b + rhx_b) / 2 if (lhx_b and rhx_b) else knee_mid
    ankle_mid  = (lax_b + rax_b) / 2 if (lax_b and rax_b) else knee_mid

    def _leg_sep(y_meas, y_top, y_bot, mid_top, mid_bot):
        """Interpolated medial x at measurement y."""
        if None in (y_meas, y_top, y_bot, mid_top, mid_bot): return knee_mid
        span = y_bot - y_top
        if span < 1: return (mid_top + mid_bot) / 2
        t = max(0.0, min(1.0, (y_meas - y_top) / span))
        return mid_top + t * (mid_bot - mid_top)

    leg_side, hip_xy, kn_xy = _far_side('left_hip','left_knee','right_hip','right_knee')
    kn2_xy = _lm_xy(front_lms, f'{leg_side}_knee')  if leg_side else None
    an_xy  = _lm_xy(front_lms, f'{leg_side}_ankle') if leg_side else None

    buf_leg = 10
    thigh_sep = _leg_sep(thigh_y, hip_y, knee_y, hip_mid, knee_mid)
    calf_sep  = _leg_sep(calf_y,  knee_y, ankle_y, knee_mid, ankle_mid)

    def _leg_bounds(kn_xy_arg, sep):
        if kn_xy_arg is None or sep is None:
            return None, None, None, None
        if kn_xy_arg[0] < cx_img:  # leg on left side of image
            return None, sep + buf_leg, None, sep + buf_leg
        else:                        # leg on right side
            return sep - buf_leg, None, sep - buf_leg, None

    t_cx_min, t_cx_max, t_rx_min, t_rx_max = _leg_bounds(kn_xy, thigh_sep)
    c_cx_min, c_cx_max, c_rx_min, c_rx_max = _leg_bounds(kn_xy, calf_sep)

    thigh_w, tx0, ty0, tx1, ty1, t_cy = measure_limb_perp(
        front_mask, hip_xy, kn_xy, scale,
        center_x_min=t_cx_min, center_x_max=t_cx_max,
        ray_x_min=t_rx_min,    ray_x_max=t_rx_max,
        t_min=0.50, t_max=0.75) \
        if (hip_xy and kn_xy) else (None,)*6
    if tx0 is not None:
        overlay_lines_front['thigh'] = (tx0, ty0, tx1, ty1)
        measure_ys_front['thigh']    = t_cy

    calf_w, cx0, cy0, cx1, cy1, c_cy = measure_limb_perp(
        front_mask, kn2_xy, an_xy, scale,
        center_x_min=c_cx_min, center_x_max=c_cx_max,
        ray_x_min=c_rx_min,    ray_x_max=c_rx_max) \
        if (kn2_xy and an_xy) else (None,)*6
    if cx0 is not None:
        overlay_lines_front['calf'] = (cx0, cy0, cx1, cy1)
        measure_ys_front['calf']    = c_cy

    # ── Depth measurements (side) ─────────────────────────────────────────
    # Map front Y positions to side photo (same body proportions)
    def side_y(front_y_px):
        if front_y_px is None or top_y is None or bottom_y is None: return None
        rel = (front_y_px - top_y) / max(bottom_y - top_y, 1)
        if top_y_s is None: return None
        return top_y_s + rel * (bottom_y_s - top_y_s)

    # Body-centre x in side photo: use hip midpoint as primary anchor (most stable
    # in a side-view because both hips project near the torso centre), falling back
    # to shoulder and knee midpoints if hip landmarks are missing.
    def _side_body_cx():
        # Hip midpoint — prefer this; both hips average to body centre depth
        lhx = _lm_x(side_lms, 'left_hip')
        rhx = _lm_x(side_lms, 'right_hip')
        if lhx is not None and rhx is not None:
            return ((lhx + rhx) / 2) / sw
        # Fallback: average over all available torso landmarks
        xs = []
        for nm in ('left_hip', 'right_hip', 'left_shoulder', 'right_shoulder',
                   'left_knee', 'right_knee'):
            x = _lm_x(side_lms, nm)
            if x is not None:
                xs.append(x)
        if not xs: return None
        return (sum(xs) / len(xs)) / sw  # normalise to [0,1]

    _sbcx = _side_body_cx()  # fraction [0,1] of side image width

    # ── Extended-arm exclusion (side photo) ────────────────────────────────
    # Shaped protocol: one arm is stretched forward (not toward the camera),
    # roughly at torso height. Because "depth" in a side photo is literally
    # the horizontal mask span, an arm reaching forward fuses with the torso
    # silhouette (no gap → the contiguous-segment heuristic can't exclude it)
    # and inflates chest/waist/hip depth. The extended arm is unoccluded and
    # visible; the resting/hidden arm has low visibility — pick by that.
    def _side_extended_elbow_x():
        cands = []
        for side_nm in ('left', 'right'):
            elbow = side_lms.get(f'{side_nm}_elbow') if side_lms else None
            wrist = side_lms.get(f'{side_nm}_wrist') if side_lms else None
            vis = max(elbow['visibility'] if elbow else 0, wrist['visibility'] if wrist else 0)
            if vis > 0.5:
                x = wrist['x'] if wrist and wrist['visibility'] > 0.5 else elbow['x']
                cands.append((vis, x))
        if not cands:
            return None
        # Highest-visibility arm = the one held out in clear view (extended forward)
        return max(cands, key=lambda c: c[0])[1]

    _arm_x = _side_extended_elbow_x()

    def _d(front_y_px, side_y_override=None, arm_level=False):
        """
        Measure body depth (cm) from the side photo at the given front-photo y position.

        side_y_override : use this side-photo y directly (e.g. from card anchor).
        arm_level : True at chest/shoulder where the extended arm fuses with the torso.
                    Uses 2×min(half_l, half_r) to exclude arm.  False at hip and below
                    where no arm contamination exists — uses full contiguous segment width.
        """
        sy = side_y_override if side_y_override is not None else side_y(front_y_px)
        if sy is None: return None
        si = int(sy)
        h_s, w_s = side_mask.shape
        if not (0 <= si < h_s): return None

        # Average over ±3 rows for stability
        pxs = []
        for drow in range(-3, 4):
            ri = si + drow
            if not (0 <= ri < h_s): continue
            row = side_mask[ri]
            mask_xs = np.where(row)[0]
            if len(mask_xs) == 0: continue

            if arm_level and _sbcx is not None:
                # Arm at 90° forward merges with torso — use landmark-anchored centre
                # to identify the clean (back) half, then double it for full depth.
                cx = int(_sbcx * w_s)
                cx = max(0, min(w_s - 1, cx))
                if row[cx]:
                    xl = cx
                    while xl > 0 and row[xl - 1]: xl -= 1
                    xr = cx
                    while xr < w_s - 1 and row[xr + 1]: xr += 1
                    half_l = cx - xl
                    half_r = xr - cx
                    pxs.append(2 * min(half_l, half_r) + 1)
                else:
                    pxs.append(int(mask_xs[-1]) - int(mask_xs[0]) + 1)
            else:
                # Below arm level — arm not present, use full contiguous body segment.
                # Seed from body centre (_sbcx) if available, else mask midpoint.
                cx_frac = _sbcx if _sbcx is not None else 0.5
                cx = int(cx_frac * w_s)
                cx = max(0, min(w_s - 1, cx))
                if not row[cx]:
                    # Seed not on body — fall back to mask midpoint
                    cx = (int(mask_xs[0]) + int(mask_xs[-1])) // 2
                if row[cx]:
                    xl = cx
                    while xl > 0 and row[xl - 1]: xl -= 1
                    xr = cx
                    while xr < w_s - 1 and row[xr + 1]: xr += 1
                    pxs.append(xr - xl + 1)
                else:
                    pxs.append(int(mask_xs[-1]) - int(mask_xs[0]) + 1)

        if not pxs: return None
        px = int(np.median(pxs))
        return round(px * scale_side, 1) if px > 0 else None

    # Arm at 90° forward is at SHOULDER level (Y ≈ 0% shoulder-to-hip).
    # Chest is now at nipple level (18-30% shoulder-to-hip), well below the arm →
    # side mask at chest_y is clean (no arm to exclude).
    chest_d = _d(chest_y, arm_level=False)
    waist_d = _d(waist_y, arm_level=False)
    hip_d   = _d(hip_scan_y, arm_level=False)
    thigh_d = _d(measure_ys_front.get('thigh') or thigh_y, arm_level=False)
    calf_d  = _d(calf_y,  arm_level=False)
    # Neck: arm is at SHOULDER level, not neck level — side mask at neck_y is clean.
    # Use side depth to build an ellipse instead of circular approximation.
    neck_d  = _d(neck_y, arm_level=False) if neck_y else None
    # arm/forearm: arm points toward camera in side view — can't isolate from torso

    # ── Circumferences ────────────────────────────────────────────────────
    def ellipse_circ(w_cm, d_cm):
        if w_cm is None or d_cm is None: return None
        return round(ellipse_circumference(w_cm / 2, d_cm / 2), 1)

    def circular_circ(diameter_cm):
        # Arms/forearms: side-photo depth can't isolate a single arm → circular approximation
        if diameter_cm is None: return None
        return round(math.pi * diameter_cm, 1)

    # Torso and legs: front width + side depth → ellipse
    chest_circ   = ellipse_circ(chest_w,   chest_d)
    waist_circ   = ellipse_circ(waist_w,   waist_d)
    hip_circ     = ellipse_circ(hip_w,     hip_d)
    thigh_circ   = ellipse_circ(thigh_w,   thigh_d)
    calf_circ    = ellipse_circ(calf_w,    calf_d)
    # Neck: always use circular approximation (π × diameter).
    # Empirical test (davi 2026-08-24): neck width 10.8cm → circular = 33.9cm
    # (matches tape 34.0 exactly). Ellipse with side depth gave 38.6 (over by ~5cm)
    # because side mask at neck_y catches trapezius/shoulder tissue as extra "depth".
    neck_circ    = circular_circ(neck_w)
    # Arms: circular approximation (arm points toward camera in side → no clean depth)
    bicep_circ   = circular_circ(bicep_w)
    forearm_circ = circular_circ(forearm_w)

    # Raw circumferences (pre-shape-correction) — stored for calibration/debug
    raw_circ = {
        'chest_cm':   chest_circ,
        'waist_cm':   waist_circ,
        'hip_cm':     hip_circ,
        'thigh_cm':   thigh_circ,
        'calf_cm':    calf_circ,
        'neck_cm':    neck_circ,
        'bicep_cm':   bicep_circ,
        'forearm_cm': forearm_circ,
    }

    # ── Anatomical shape correction ──────────────────────────────────────
    # The ellipse formula assumes an elliptical cross-section, but real body
    # segments deviate. These factors are body-composition-aware: for lean
    # bodies (BMI<22) the ellipse is close to correct (glutes are flatter,
    # belly does not bulge). For heavier bodies, hip needs stronger downward
    # correction (glute protrusion breaks the ellipse assumption).
    #
    # Neck: the min-width scan tends to overestimate because it may include
    # jaw/trapezius edge — a strong downward correction is needed regardless
    # of body composition.
    #
    # Calibration source: davi 170cm/58.7kg lean male test 2026-08-24 +
    # anthropometric literature (Wang 2004, Kuehnapfel 2016). Refine with
    # real tape-measure calibration data when available.
    # Calibration reference (2026-08-24, davi 172cm/58.7kg BMI 19.8, tape measure):
    #   peito 91 · pescoço 34 · cintura 84 · quadril 92 · coxa 50 · panturrilha 33
    #   bíceps 26 · antebraço 22
    # Waist ratio 1.15 accounts for the umbilicus vs anatomical-narrow difference
    # (consumer tape measurement is at umbilicus, wider than the true narrow waist).
    # Chest/hip/thigh: landmark bounds sit inside the joint, mask width is slightly
    # short → need upward correction.
    # Bicep/forearm/neck: mask picks up skin edges and side depth contamination →
    # need downward correction (neck also switches to circular approx below).
    _h_m = (height_cm / 100.0) if height_cm else 0
    _bmi_for_k = weight_kg / (_h_m ** 2) if (_h_m > 0 and weight_kg) else 22.0
    # Waist SHAPE_K removed (=1.00) — now measured directly at umbilicus level
    # (55-70% shoulder-to-hip, max width), matching consumer tape protocol.
    if _bmi_for_k < 22:      # lean (calibrated against davi 2026-08-24)
        _SHAPE_K = {'chest': 1.09, 'waist': 1.00, 'hip': 1.05,
                    'thigh': 1.08, 'calf': 1.00, 'neck': 1.00,
                    'bicep': 0.91, 'forearm': 0.91}
    elif _bmi_for_k < 27:    # normal (interpolated, not yet calibrated)
        _SHAPE_K = {'chest': 1.06, 'waist': 1.00, 'hip': 1.00,
                    'thigh': 1.05, 'calf': 1.00, 'neck': 1.00,
                    'bicep': 0.94, 'forearm': 0.94}
    else:                    # overweight/obese (glute+belly break ellipse more)
        _SHAPE_K = {'chest': 1.02, 'waist': 1.00, 'hip': 0.95,
                    'thigh': 1.00, 'calf': 1.00, 'neck': 1.00,
                    'bicep': 0.96, 'forearm': 0.96}
    def _shape(v, k):
        return round(v * _SHAPE_K[k], 1) if v is not None else None

    chest_circ   = _shape(chest_circ,   'chest')
    waist_circ   = _shape(waist_circ,   'waist')
    hip_circ     = _shape(hip_circ,     'hip')
    thigh_circ   = _shape(thigh_circ,   'thigh')
    calf_circ    = _shape(calf_circ,    'calf')
    neck_circ    = _shape(neck_circ,    'neck')
    bicep_circ   = _shape(bicep_circ,   'bicep')
    forearm_circ = _shape(forearm_circ, 'forearm')

    # ── Indices ───────────────────────────────────────────────────────────
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m ** 2), 1)
    wth = round(waist_circ / height_cm, 2) if waist_circ else None
    whr = round(waist_circ / hip_circ, 2)  if (waist_circ and hip_circ) else None

    # Índice de conicidade = cintura_m / (0.109 × √(peso/altura_m))
    ci = round((waist_circ / 100) / (0.109 * math.sqrt(weight_kg / height_m)), 2) \
         if waist_circ else None

    # ── Body fat ──────────────────────────────────────────────────────────
    # Primary: US Navy circumference method (Hodgdon & Beckett 1984), ±3–4% vs DEXA.
    # IMPORTANT: Navy 1984 was calibrated with the ANATOMICAL narrow waist
    # (between rib and iliac crest), NOT the umbilicus. Modern consumer tape
    # protocols measure at umbilicus, which for people with abdominal fat is
    # 5-15cm wider than the anatomical narrow — this over-estimates body fat
    # by 5-10 percentage points via the Navy formula (davi 2026-08-24: umbilicus
    # 84cm → 26.2% body fat; anatomical 72.9cm → 17.0% — matches Deurenberg
    # BMI+age of 17.2%, consistent with BMI 19.8 lean profile).
    # We use raw_circ['waist_cm'] (pre-SHAPE_K = anatomical narrow) here to
    # keep the Navy formula in its original protocol. Display waist stays at
    # umbilicus level (matches consumer tape + WHO cardio-risk indices).
    body_fat_method = None
    # Coherence principle: use the same values we DISPLAY (yellow line on
    # overlay = measurement value = input to every derived formula). No
    # internal "phantom" measurements that the user can't see. Navy formula
    # gets the umbilicus-level waist that the yellow line points to.
    _waist_for_bf = waist_circ
    _hip_for_bf   = hip_circ
    _neck_for_bf  = neck_circ
    if _waist_for_bf and _neck_for_bf and height_cm:
        try:
            if sex == 'male':
                diff = _waist_for_bf - _neck_for_bf
                if diff > 0:
                    body_fat_pct = round(
                        86.01 * math.log10(diff) - 70.041 * math.log10(height_cm) + 36.76, 1)
                    body_fat_method = 'navy_circumference'
            else:
                if _hip_for_bf:
                    diff = _waist_for_bf + _hip_for_bf - _neck_for_bf
                    if diff > 0:
                        body_fat_pct = round(
                            163.205 * math.log10(diff) - 97.684 * math.log10(height_cm) - 78.387, 1)
                        body_fat_method = 'navy_circumference'
        except Exception:
            body_fat_pct = None

    if body_fat_method is None and age and age > 0:
        sex_factor = 1 if sex == 'male' else 0
        body_fat_pct = round(1.20 * bmi + 0.23 * age - 10.8 * sex_factor - 5.4, 1)
        body_fat_method = 'deurenberg_bmi'
    elif body_fat_method is None:
        body_fat_pct = None

    if body_fat_pct is not None:
        body_fat_pct = max(3.0, min(60.0, body_fat_pct))

    # Fat mass / lean mass split
    fat_mass_kg  = round(weight_kg * body_fat_pct / 100, 1) if body_fat_pct else None
    lean_mass_kg = round(weight_kg - fat_mass_kg, 1)        if fat_mass_kg  else None

    # BMI classification
    if   bmi < 18.5: bmi_class = 'underweight'
    elif bmi < 25.0: bmi_class = 'normal'
    elif bmi < 30.0: bmi_class = 'overweight'
    else:            bmi_class = 'obese'

    # ── Derived composition metrics ───────────────────────────────────────
    # Água corporal — constante hídrica de mamíferos: 72.3% da massa magra
    body_water_l   = round(lean_mass_kg * 0.723, 1) if lean_mass_kg else None
    body_water_pct = round(body_water_l / weight_kg * 100, 1) if body_water_l else None

    # Gasto energético de repouso — equação de Cunningham (1980)
    ree_kcal = round(500 + 22 * lean_mass_kg, 1) if lean_mass_kg else None

    # Índice de massa magra e gorda (lean/fat mass index)
    imm = round(lean_mass_kg / (height_m ** 2), 1) if lean_mass_kg else None
    img = round(fat_mass_kg  / (height_m ** 2), 1) if fat_mass_kg  else None

    # IMM/IMG classifications (references: Schutz 2002, Kyle 2003)
    def classify_imm(v, sx):
        if v is None: return None
        # Adequate: M ≥14.6, F ≥11.8 (using common clinical cut-offs)
        thresh = 14.6 if sx == 'male' else 11.8
        return 'adequate' if v >= thresh else 'low'
    def classify_img(v, sx):
        if v is None: return None
        # Excess: M ≥6.0, F ≥9.0
        thresh = 6.0 if sx == 'male' else 9.0
        return 'adequate' if v < thresh else 'elevated_risk'

    # ── NovaQI Score (0–100) ──────────────────────────────────────────────
    # 6 indicators × 100/6 pts each; partial credit for borderline values
    def _pts(condition_ok, condition_border=False):
        if condition_ok:    return 100 / 6
        if condition_border: return 50  / 6
        return 0

    score_pts = 0
    n_available = 0

    if body_fat_pct is not None:
        n_available += 1
        if sex == 'male':
            score_pts += _pts(body_fat_pct < 25, 25 <= body_fat_pct < 30)
        else:
            score_pts += _pts(body_fat_pct < 32, 32 <= body_fat_pct < 38)

    if imm is not None:
        n_available += 1
        thresh_imm = 14.6 if sex == 'male' else 11.8
        score_pts += _pts(imm >= thresh_imm, thresh_imm - 2 <= imm < thresh_imm)

    if img is not None:
        n_available += 1
        thresh_img = 6.0 if sex == 'male' else 9.0
        score_pts += _pts(img < thresh_img, thresh_img <= img < thresh_img + 2.5)

    if wth is not None:
        n_available += 1
        score_pts += _pts(wth < 0.5, 0.5 <= wth < 0.6)

    if whr is not None:
        n_available += 1
        t = 0.90 if sex == 'male' else 0.85
        score_pts += _pts(whr < t, t <= whr < t + 0.1)

    if ci is not None:
        n_available += 1
        score_pts += _pts(ci < 1.18, 1.18 <= ci < 1.30)

    novaqi_score = round(score_pts / max(n_available, 1) * 6) if n_available else None

    # ── Confidence scores ─────────────────────────────────────────────────
    # Waist and hip benefit from more surrounding mask context → higher confidence
    confidence = {
        'chest_cm':   0.75 if (front_lms and chest_circ)   else 0.45,
        'neck_cm':    0.65 if (front_lms and neck_circ)    else 0.40,
        'waist_cm':   0.80 if (front_lms and waist_circ)   else 0.50,
        'hip_cm':     0.85 if (front_lms and hip_circ)     else 0.50,
        'bicep_cm':   (0.50 if _bicep_estimated_from_forearm else 0.70) if (front_lms and bicep_circ) else 0.40,
        'forearm_cm': 0.65 if (front_lms and forearm_circ) else 0.40,
        'thigh_cm':   0.72 if (front_lms and thigh_circ)   else 0.45,
        'calf_cm':    0.68 if (front_lms and calf_circ)    else 0.40,
    }

    # ── Overlays ──────────────────────────────────────────────────────────
    _thigh_y_actual = measure_ys_front.get('thigh') or thigh_y
    # Bicep + forearm + neck omitted from side overlay:
    # - bicep/forearm: arm extended forward at 90° means the arm is a horizontal
    #   appendage in the side photo; a horizontal line at bicep_y across the
    #   torso mask is anatomically meaningless (lands on the chest, not the arm)
    # - neck: uses circular approximation (front width only); side overlay would
    #   draw a line through the chin because the chin protrudes forward at
    #   neck_y level in a side view, making the line visually misleading
    measure_ys_side = {
        'chest':  side_y(chest_y),
        'waist':  side_y(waist_y),
        'hip':    side_y(hip_y),
        'thigh':  side_y(_thigh_y_actual),
        'calf':   side_y(calf_y),
    }
    measure_ys_side = {k: v for k, v in measure_ys_side.items() if v}

    front_overlay = make_overlay(front_pil, front_mask, front_lms, measure_ys_front, scale, 'front',
                                  overlay_lines=overlay_lines_front, measure_x_bounds=measure_x_bounds_front)
    side_overlay  = make_overlay(side_pil,  side_mask,  side_lms,  measure_ys_side,  scale_side, 'side')

    return {
        'measurements': {
            'chest_cm':   chest_circ,
            'neck_cm':    neck_circ,
            'bicep_cm':   bicep_circ,
            'forearm_cm': forearm_circ,
            'waist_cm':   waist_circ,
            'hip_cm':     hip_circ,
            'thigh_cm':   thigh_circ,
            'calf_cm':    calf_circ,
        },
        'indices': {
            'bmi':               bmi,
            'lean_mass_index':   imm,
            'fat_mass_index':    img,
            'waist_to_height':   wth,
            'waist_to_hip':      whr,
            'conicity_index':    ci,
        },
        'classification': {
            'bmi':              bmi_class,
            'lean_mass_index':  classify_imm(imm, sex),
            'fat_mass_index':   classify_img(img, sex),
            'waist_to_height':  classify(wth, 'waist_to_height', sex) if wth else None,
            'waist_to_hip':     classify(whr, 'waist_to_hip', sex)    if whr else None,
            'conicity_index':   classify(ci,  'conicity_index', sex)   if ci  else None,
        },
        'body_composition': {
            'body_fat_pct':    body_fat_pct,
            'fat_mass_kg':     fat_mass_kg,
            'lean_mass_kg':    lean_mass_kg,
            'body_water_l':    body_water_l,
            'body_water_pct':  body_water_pct,
            'ree_kcal':        ree_kcal,
            'method':          body_fat_method,
        } if body_fat_pct else None,
        'score':             novaqi_score,
        'meta': {
            'input_height_cm':  height_cm,
            'input_weight_kg':  weight_kg,
            'sex':              sex,
            'age':              age,
            'scale_px_per_cm':  round(scale, 3),
            'front_image_dims': [fw, fh],
            'side_image_dims':  [sw, sh],
            'confidence':       confidence,
            'warnings':         warnings,
            'raw_cm':           raw_circ,
            'seg_model':        'u2net_human_seg',
            'bf_method':        body_fat_method,
            'card_calibrated':    card_scale_front is not None or card_scale_side is not None,
            'card_scale_front':   round(card_scale_front, 5) if card_scale_front else None,
            'card_scale_side':    round(card_scale_side,  5) if card_scale_side  else None,
            'card_front_cy_px':   round(card_front_cy, 1)   if card_front_cy   else None,
            'card_side_cy_px':    round(card_side_cy, 1)    if card_side_cy    else None,
            'neck_depth_cm':      neck_d,
            'height_cm_estimated': height_cm_estimated,
            'front_pitch_deg':    round(front_pitch_deg, 1) if front_pitch_deg is not None else None,
            'side_pitch_deg':     round(side_pitch_deg, 1)  if side_pitch_deg  is not None else None,
        },
        'overlays': {
            'front': front_overlay,
            'side':  side_overlay,
        },
    }


if __name__ == '__main__':
    if len(sys.argv) < 7:
        print(json.dumps({'error': 'usage: body_analysis.py front.jpg side.jpg height_cm weight_kg sex age [front_pitch] [side_pitch]'}))
        sys.exit(1)
    args = sys.argv[1:]
    front, side, height_cm, weight_kg, sex, age = args[:6]
    front_pitch = args[6] if len(args) > 6 else None
    side_pitch  = args[7] if len(args) > 7 else None
    try:
        result = analyze(front, side, float(height_cm), float(weight_kg), sex, int(age),
                         front_pitch_deg=front_pitch, side_pitch_deg=side_pitch)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

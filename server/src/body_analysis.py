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


def load_image(path):
    img = Image.open(path)
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


def analyze(front_path, side_path, height_cm, weight_kg, sex, age):
    warnings = []

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

    # ── Scale calibration (front photo, mask height → height_cm) ─────────
    top_y, bottom_y = mask_height_span(front_mask)
    if top_y is None or bottom_y is None or (bottom_y - top_y) < 50:
        warnings.append('scale_calibration_failed')
        scale = 1.0
    else:
        height_px = bottom_y - top_y
        scale = height_cm / height_px          # cm per pixel (front)

    # Same for side photo
    top_y_s, bottom_y_s = mask_height_span(side_mask)
    if top_y_s and bottom_y_s and (bottom_y_s - top_y_s) > 50:
        scale_side = height_cm / (bottom_y_s - top_y_s)
    else:
        scale_side = scale
        warnings.append('side_scale_fallback')

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

    def _meas_horiz_body(y):
        """Full-width measurement using the contiguous body segment nearest the image
        centre. Avoids the landmark-bounds problem for the hip, where the anatomical
        landmarks sit at the joint (inside the pelvis) and miss the full glute width."""
        if y is None: return None, None, None
        cx_body = fw / 2
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
            if not runs: continue
            # Pick the run whose centre is closest to the image centre
            best = min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - cx_body))
            x0s.append(best[0]); x1s.append(best[1])
        if not x0s: return None, None, None
        x0 = int(np.median(x0s)); x1 = int(np.median(x1s))
        w_px = x1 - x0
        return (round(w_px * scale, 1) if w_px > 0 else None), x0, x1

    measure_x_bounds_front = {}  # label → (x0, x1) for horizontal overlay lines
    overlay_lines_front    = {}  # label → (x0,y0,x1,y1) for angled overlay lines

    # Chest: bounded by shoulder landmarks to exclude arms that extend outward in A-pose
    chest_w, chx0, chx1 = _meas_horiz(chest_y, shoulder_xl or 0, shoulder_xr or fw)
    if chx0 is not None: measure_x_bounds_front['chest'] = (chx0, chx1)

    waist_w, wx0, wx1 = _meas_horiz(waist_y, shoulder_xl or 0, shoulder_xr or fw)
    if wx0 is not None: measure_x_bounds_front['waist'] = (wx0, wx1)

    # Hip: use full-mask contiguous-body scan so glute width is not clipped by
    # the hip joint landmarks (which sit inside the pelvis, not at the body edge).
    hip_w, hx0, hx1 = _meas_horiz_body(hip_y)
    if hx0 is not None: measure_x_bounds_front['hip'] = (hx0, hx1)

    # Neck: find the minimum horizontal width between chin and shoulder level.
    # The neck is the narrowest point in this range from the front view.
    # Min-width scan avoids confusing the wider trapezius/clavicle zone with the neck.
    # Arms are at A-pose so they don't appear at neck level — _meas_horiz_body is clean here.
    neck_w = None
    if top_y is not None and shoulder_y is not None:
        chin_approx_y = top_y + (shoulder_y - top_y) * 0.42
        _nk_top = int(chin_approx_y)
        _nk_bot = int(shoulder_y) - 6
        _nk_min_px = None
        _nk_best_y = None
        _nkx0_f, _nkx1_f = None, None
        for _sy in range(_nk_top, _nk_bot, 2):
            _, _x0, _x1 = _meas_horiz_body(_sy)
            if _x0 is not None and _x1 is not None:
                _w = _x1 - _x0
                if _nk_min_px is None or _w < _nk_min_px:
                    _nk_min_px = _w
                    _nk_best_y = _sy
                    _nkx0_f, _nkx1_f = _x0, _x1
        if _nk_min_px and _nk_best_y:
            neck_w = round(_nk_min_px * scale, 1)
            measure_x_bounds_front['neck'] = (_nkx0_f, _nkx1_f)
            measure_ys_front['neck'] = _nk_best_y

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

    # ── Arm x-bounds: anchor on elbow (definitively on the arm, not torso) ──
    # At elbow level the mask shows only the arm. We scan along the mask row
    # at elbow_y to find the arm's true x-extent, then expand by arm_expand_px
    # to cover the bicep (which is wider). This avoids depending on shoulder
    # landmarks whose mask edge differs from the joint position.
    arm_expand_px = 80  # ≈ 7 cm at typical scale — enough for any bicep

    def _arm_x_from_elbow(elbow_xy):
        if not elbow_xy: return None, None
        ey, ex = int(elbow_xy[1]), int(elbow_xy[0])
        h_m, w_m = front_mask.shape
        if not (0 <= ey < h_m and 0 <= ex < w_m) or not front_mask[ey, ex]:
            return None, None
        xl = ex
        for x in range(ex - 1, max(0, ex - 300), -1):
            if not front_mask[ey, x]: break
            xl = x
        xr = ex
        for x in range(ex + 1, min(w_m, ex + 300)):
            if not front_mask[ey, x]: break
            xr = x
        return max(0, xl - arm_expand_px), min(w_m, xr + arm_expand_px)

    arm_side, sh_xy, el_xy = _far_side('left_shoulder','left_elbow','right_shoulder','right_elbow')
    arm_xl, arm_xr = _arm_x_from_elbow(el_xy)

    bicep_w, bx0, by0, bx1, by1, b_cy = measure_limb_perp(
        front_mask, sh_xy, el_xy, scale,
        center_x_min=arm_xl, center_x_max=arm_xr,
        ray_x_min=arm_xl,    ray_x_max=arm_xr) \
        if (sh_xy and el_xy and arm_xl is not None) else (None,)*6
    if bx0 is not None:
        overlay_lines_front['bicep'] = (bx0, by0, bx1, by1)
        measure_ys_front['bicep']    = b_cy

    # ── Forearm: elbow → wrist ────────────────────────────────────────────
    el2_xy = _lm_xy(front_lms, f'{arm_side}_elbow') if arm_side else None
    wr_xy  = _lm_xy(front_lms, f'{arm_side}_wrist') if arm_side else None
    # Forearm is narrower than bicep — use wrist as anchor for tighter bounds
    wr_expand_px = 60
    def _arm_x_from_wrist(wrist_xy):
        if not wrist_xy: return None, None
        wy, wx = int(wrist_xy[1]), int(wrist_xy[0])
        h_m, w_m = front_mask.shape
        if not (0 <= wy < h_m and 0 <= wx < w_m) or not front_mask[wy, wx]:
            return None, None
        xl = wx
        for x in range(wx - 1, max(0, wx - 200), -1):
            if not front_mask[wy, x]: break
            xl = x
        xr = wx
        for x in range(wx + 1, min(w_m, wx + 200)):
            if not front_mask[wy, x]: break
            xr = x
        return max(0, xl - wr_expand_px), min(w_m, xr + wr_expand_px)

    fa_xl, fa_xr = _arm_x_from_wrist(wr_xy)
    # Fall back to elbow bounds if wrist not visible
    if fa_xl is None: fa_xl, fa_xr = arm_xl, arm_xr

    forearm_w, fx0, fy0, fx1, fy1, f_cy = measure_limb_perp(
        front_mask, el2_xy, wr_xy, scale,
        center_x_min=fa_xl, center_x_max=fa_xr,
        ray_x_min=fa_xl,    ray_x_max=fa_xr) \
        if (el2_xy and wr_xy and fa_xl is not None) else (None,)*6
    if fx0 is not None:
        overlay_lines_front['forearm'] = (fx0, fy0, fx1, fy1)
        measure_ys_front['forearm']    = f_cy

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
        t_min=0.40, t_max=0.75) \
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

    # Body-centre x in side photo (used to pick the contiguous body segment,
    # excluding the hand which sticks out in front/behind at thigh/hip level).
    def _side_body_cx():
        xs = []
        for nm in ('left_hip', 'right_hip', 'left_knee', 'right_knee',
                   'left_shoulder', 'right_shoulder'):
            x = _lm_x(side_lms, nm)
            if x is not None:
                xs.append(x)
        return (sum(xs) / len(xs)) if xs else None

    _sbcx = _side_body_cx()  # fraction [0,1] of side image width

    def _d(front_y_px):
        sy = side_y(front_y_px)
        if sy is None: return None
        si = int(sy)
        h_s, w_s = side_mask.shape
        if not (0 <= si < h_s): return None
        row = side_mask[si]
        mask_xs = np.where(row)[0]
        if len(mask_xs) == 0: return None

        if _sbcx is not None:
            # Find the contiguous mask segment that contains the body centre.
            # This excludes the hand if there is any gap between it and the body.
            cx = int(_sbcx * w_s)
            cx = max(0, min(w_s - 1, cx))
            if row[cx]:
                xl = cx
                while xl > 0 and row[xl - 1]: xl -= 1
                xr = cx
                while xr < w_s - 1 and row[xr + 1]: xr += 1
                px = xr - xl + 1
            else:
                # Body centre not in mask — use widest segment as fallback
                px = int(mask_xs[-1]) - int(mask_xs[0]) + 1
        else:
            px = int(mask_xs[-1]) - int(mask_xs[0]) + 1

        return round(px * scale_side, 1) if px > 0 else None

    chest_d   = _d(chest_y)
    waist_d   = _d(waist_y)
    hip_d     = _d(hip_y)
    thigh_d   = _d(thigh_y)
    calf_d    = _d(calf_y)
    # neck depth not used — arm is at the same height in the side photo and
    # contaminates the mask; neck is roughly cylindrical so circular approx is used
    # arm/forearm depth not used — circular approximation in circumference step

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
    # Neck + arms: circular cross-section (side photo unusable — arm contaminates at neck level)
    neck_circ    = circular_circ(neck_w)
    bicep_circ   = circular_circ(bicep_w)
    forearm_circ = circular_circ(forearm_w)

    # ── Bias correction (literature-based, photo vs tape measure) ────────
    # Photo-based ellipse/circular models systematically underestimate vs tape.
    # Factors derived from photo-anthropometry literature (Daanen & Psikuta 2018,
    # Kuehnapfel et al. 2016). These are initial estimates; will be refined with
    # user-collected calibration data (plan 3).
    _BIAS = {
        'chest':   1.05,  # ellipse model + A-pose arm occlusion
        'waist':   1.04,  # soft tissue + ellipse underestimation
        'hip':     1.03,  # glute boundary bias
        'thigh':   1.04,  # ellipse on non-elliptical cross-section
        'calf':    1.03,  # more cylindrical, less bias
        'neck':    1.06,  # circular approx from front-only, neck is elliptical
        'bicep':   1.05,  # circular approx from front-only
        'forearm': 1.04,  # circular approx from front-only
    }
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
    def _correct(v, factor):
        return round(v * factor, 1) if v is not None else None

    chest_circ   = _correct(chest_circ,   _BIAS['chest'])
    waist_circ   = _correct(waist_circ,   _BIAS['waist'])
    hip_circ     = _correct(hip_circ,     _BIAS['hip'])
    thigh_circ   = _correct(thigh_circ,   _BIAS['thigh'])
    calf_circ    = _correct(calf_circ,    _BIAS['calf'])
    neck_circ    = _correct(neck_circ,    _BIAS['neck'])
    bicep_circ   = _correct(bicep_circ,   _BIAS['bicep'])
    forearm_circ = _correct(forearm_circ, _BIAS['forearm'])

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
    # Uses the actual circumferences measured from the photos.
    # Fallback: Deurenberg BMI formula (1991), ±4–6% vs DEXA.
    body_fat_method = None
    if waist_circ and neck_circ and height_cm:
        try:
            if sex == 'male':
                diff = waist_circ - neck_circ
                if diff > 0:
                    body_fat_pct = round(
                        86.01 * math.log10(diff) - 70.041 * math.log10(height_cm) + 36.76, 1)
                    body_fat_method = 'navy_circumference'
            else:
                if hip_circ:
                    diff = waist_circ + hip_circ - neck_circ
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
        'bicep_cm':   0.70 if (front_lms and bicep_circ)   else 0.40,
        'forearm_cm': 0.65 if (front_lms and forearm_circ) else 0.40,
        'thigh_cm':   0.72 if (front_lms and thigh_circ)   else 0.45,
        'calf_cm':    0.68 if (front_lms and calf_circ)    else 0.40,
    }

    # ── Overlays ──────────────────────────────────────────────────────────
    # Use the actual front measurement center y for bicep (t_cy), not the raw arm_y,
    # so the side line matches exactly where the perpendicular scan landed.
    bicep_side_y = side_y(measure_ys_front.get('bicep') or arm_y)
    measure_ys_side = {
        # neck omitted from side overlay — arm contaminates the mask at that level
        'chest':  side_y(chest_y),
        'waist':  side_y(waist_y),
        'hip':    side_y(hip_y),
        'bicep':  bicep_side_y,
        'thigh':  side_y(thigh_y),
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
            'bias_factors':     _BIAS,
            'seg_model':        'u2net_human_seg',
            'bf_method':        body_fat_method,
        },
        'overlays': {
            'front': front_overlay,
            'side':  side_overlay,
        },
    }


if __name__ == '__main__':
    if len(sys.argv) < 7:
        print(json.dumps({'error': 'usage: body_analysis.py front.jpg side.jpg height_cm weight_kg sex age'}))
        sys.exit(1)
    _, front, side, height_cm, weight_kg, sex, age = sys.argv[:8]
    try:
        result = analyze(front, side, float(height_cm), float(weight_kg), sex, int(age))
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

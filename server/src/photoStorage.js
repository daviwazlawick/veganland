import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Root for user-contributed scan photos. Nginx serves this via /uploads/scans
// with admin-only access; the DB stores paths relative to UPLOAD_ROOT so
// moving the mount point later doesn't require a rewrite.
const UPLOAD_ROOT = process.env.SCAN_UPLOAD_ROOT || '/opt/veganland/uploads/scans';

const KINDS = new Set(['label', 'ingredients', 'barcode']);

// Cheap sniff — base64 payloads sent by the client are always jpeg from the
// camera, but a data-URL prefix may or may not be there.
function stripDataUrl(b64) {
  const comma = b64.indexOf(',');
  if (comma > 0 && b64.slice(0, comma).includes(';base64')) return b64.slice(comma + 1);
  return b64;
}

// Path is bucketed by YYYY-MM so a monthly retention job can rm -rf whole
// directories without needing a DB scan.
function monthBucket(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Persist a scan photo and return the RELATIVE path (relative to UPLOAD_ROOT).
// Callers store this in products.{label,ingredients,barcode}_photo_path.
export async function saveScanPhoto(kind, base64) {
  if (!base64 || !KINDS.has(kind)) return null;

  const clean = stripDataUrl(base64);
  const buf = Buffer.from(clean, 'base64');
  if (buf.length < 500) return null; // reject obvious garbage

  const bucket = monthBucket();
  const dir = path.join(UPLOAD_ROOT, bucket);
  await fs.mkdir(dir, { recursive: true });

  // Content-hash the payload so re-uploads of the same photo dedupe on disk.
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24);
  const filename = `${hash}-${kind}.jpg`;
  const abs = path.join(dir, filename);

  try {
    await fs.access(abs);
  } catch {
    await fs.writeFile(abs, buf);
  }

  return `${bucket}/${filename}`;
}

// Resolve a relative path back to an absolute one for serving or deletion.
export function resolvePhotoPath(relPath) {
  if (!relPath) return null;
  const abs = path.resolve(UPLOAD_ROOT, relPath);
  if (!abs.startsWith(UPLOAD_ROOT)) return null; // block traversal
  return abs;
}

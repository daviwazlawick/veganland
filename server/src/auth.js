import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import './env.js';

const JWT_SECRET = process.env.JWT_SECRET || 'veganland-dev-secret-change-in-prod';
const JWT_EXPIRES = '90d';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Short-lived one-shot token for admin console access. The app opens the
// browser with this token; the server immediately exchanges it for an
// HttpOnly session cookie, so the URL isn't bookmarkable/shareable.
export function generateAdminToken(userId, email) {
  return jwt.sign({ userId, email, kind: 'admin' }, JWT_SECRET, { expiresIn: '5m' });
}

// Session cookie set after successful admin-token exchange. Longer-lived so
// the admin doesn't have to re-open from the app every time within a session,
// but still bound to a single browser and revocable by rotating JWT_SECRET.
export function generateAdminSession(userId, email) {
  return jwt.sign({ userId, email, kind: 'admin_session' }, JWT_SECRET, { expiresIn: '4h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

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

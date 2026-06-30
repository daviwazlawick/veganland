import crypto from 'node:crypto';

// 34-char alphabet (excludes 0, 1, O, I — visually ambiguous)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

export function generateReferralCode() {
  const bytes = crypto.randomBytes(CODE_LEN);
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isValidCodeShape(code) {
  if (typeof code !== 'string') return false;
  const upper = code.trim().toUpperCase();
  return upper.length === CODE_LEN && [...upper].every(c => ALPHABET.includes(c));
}

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

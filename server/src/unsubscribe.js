import crypto from 'node:crypto';

function secret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

export function signUnsubscribe(userId, campaign) {
  return crypto.createHmac('sha256', secret()).update(`${userId}:${campaign}`).digest('hex').slice(0, 24);
}

export function verifyUnsubscribe(userId, campaign, sig) {
  if (!userId || !campaign || !sig) return false;
  const expected = signUnsubscribe(userId, campaign);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

export function unsubscribeUrl(domain, userId, campaign) {
  const sig = signUnsubscribe(userId, campaign);
  return `https://${domain}/email/unsubscribe?u=${userId}&c=${encodeURIComponent(campaign)}&sig=${sig}`;
}

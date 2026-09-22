import crypto from 'node:crypto';

function secret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

function sign(userId, campaign, stage, kind) {
  return crypto.createHmac('sha256', secret()).update(`${userId}:${campaign}:${stage}:${kind}`).digest('hex').slice(0, 24);
}

export function verifyEmailTracking(userId, campaign, stage, kind, sig) {
  if (!userId || !campaign || !stage || !kind || !sig) return false;
  const expected = sign(userId, campaign, stage, kind);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

export function trackingUrls(domain, userId, campaign, stage) {
  const base = `https://${domain}/email`;
  const q = (kind) => `u=${userId}&c=${encodeURIComponent(campaign)}&s=${stage}&sig=${sign(userId, campaign, stage, kind)}`;
  return {
    openUrl: `${base}/open?${q('open')}`,
    clickUrl: `${base}/click?${q('click')}`,
  };
}

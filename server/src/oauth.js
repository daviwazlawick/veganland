import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Google — we accept tokens issued for any of our configured client IDs
// (iOS, Android, Web). The client library needs to be told which audiences
// are valid; comma-separated env var keeps it flexible without code changes.
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_OAUTH_CLIENT_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const googleClient = new OAuth2Client();

export async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new Error('missing_id_token');
  if (GOOGLE_CLIENT_IDS.length === 0) throw new Error('server_misconfigured_google');
  const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_IDS });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('invalid_token');
  if (!payload.email_verified) throw new Error('email_not_verified');
  return { sub: payload.sub, email: payload.email };
}

// Apple — validates identityToken against Apple's JWKs, checks aud (our bundle)
// and iss. Email may be missing on subsequent sign-ins; only the very first
// sign-in carries the email claim. We accept relay emails (privaterelay.appleid.com).
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const APPLE_AUDIENCES = (process.env.APPLE_OAUTH_AUDIENCES || 'app.novaqi')
  .split(',').map(s => s.trim()).filter(Boolean);

export async function verifyAppleIdentityToken(identityToken) {
  if (!identityToken) throw new Error('missing_identity_token');
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: APPLE_AUDIENCES,
  });
  if (!payload.sub) throw new Error('invalid_token');
  return { sub: payload.sub, email: payload.email || null };
}

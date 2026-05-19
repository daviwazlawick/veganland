import http from 'node:http';
import { analyzeProduct } from './analyze.js';
import { pool, createUser, findUserByEmail, getUserById, updateUserProfile, getUserHistory, getScanById, checkAndIncrementScanCounter, getScanUsage } from './db.js';
import { hashPassword, verifyPassword, generateToken, verifyToken, extractToken } from './auth.js';

const PORT = Number(process.env.PORT || 3000);
const APP_API_KEY = process.env.APP_API_KEY || '';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-api-key, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!APP_API_KEY) return true;
  return req.headers['x-app-api-key'] === APP_API_KEY;
}

function getAuthUser(req) {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      if (pool) await pool.query('select 1');
      sendJson(res, 200, { ok: true, db: !!pool });
      return;
    }

    // POST /auth/register
    if (req.method === 'POST' && req.url === '/auth/register') {
      const { email, password } = await readJsonBody(req);
      if (!email || !password) {
        sendJson(res, 400, { error: 'email and password are required' });
        return;
      }
      if (password.length < 6) {
        sendJson(res, 400, { error: 'password must be at least 6 characters' });
        return;
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        sendJson(res, 409, { error: 'Email already registered' });
        return;
      }
      const passwordHash = await hashPassword(password);
      const user = await createUser(email, passwordHash);
      const token = generateToken(user.id, user.email);
      sendJson(res, 201, { token, user: { id: user.id, email: user.email } });
      return;
    }

    // POST /auth/login
    if (req.method === 'POST' && req.url === '/auth/login') {
      const { email, password } = await readJsonBody(req);
      if (!email || !password) {
        sendJson(res, 400, { error: 'email and password are required' });
        return;
      }
      const user = await findUserByEmail(email);
      if (!user) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }
      const token = generateToken(user.id, user.email);
      sendJson(res, 200, { token, user: { id: user.id, email: user.email } });
      return;
    }

    // GET /auth/me
    if (req.method === 'GET' && req.url === '/auth/me') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const [user, usage] = await Promise.all([
        getUserById(claims.userId),
        getScanUsage(claims.userId),
      ]);
      if (!user) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }
      sendJson(res, 200, { user, usage });
      return;
    }

    // PATCH /user/profile
    if (req.method === 'PATCH' && req.url === '/user/profile') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const body = await readJsonBody(req);
      const updated = await updateUserProfile(claims.userId, body);
      if (!updated) {
        sendJson(res, 400, { error: 'No valid fields to update' });
        return;
      }
      sendJson(res, 200, { user: updated });
      return;
    }

    // GET /user/history
    if (req.method === 'GET' && req.url === '/user/history') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const history = await getUserHistory(claims.userId);
      sendJson(res, 200, { history });
      return;
    }

    // GET /scan/:id
    if (req.method === 'GET' && req.url.startsWith('/scan/')) {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const scanId = req.url.slice('/scan/'.length);
      if (!scanId) {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      const scan = await getScanById(scanId, claims.userId);
      if (!scan) {
        sendJson(res, 404, { error: 'Scan not found' });
        return;
      }
      sendJson(res, 200, { scan });
      return;
    }

    // POST /analyze-product
    if (req.method === 'POST' && req.url === '/analyze-product') {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }

      const body = await readJsonBody(req);
      if (!body.imageBase64 && !body.barcode) {
        sendJson(res, 400, { error: 'imageBase64 or barcode is required' });
        return;
      }

      const claims = getAuthUser(req);
      const userId = claims?.userId || null;

      // Rate limiting: 50 scans/month per authenticated user
      if (userId) {
        const usage = await checkAndIncrementScanCounter(userId);
        if (!usage.allowed) {
          sendJson(res, 429, {
            error: 'Monthly scan limit reached',
            usage,
          });
          return;
        }
      }

      // Use stored profile if none sent in request
      let profile = body.profile;
      if (!profile && userId) {
        const user = await getUserById(userId);
        if (user?.diet_id || user?.allergy_ids?.length) {
          profile = { dietId: user.diet_id || 'none', allergyIds: user.allergy_ids || [] };
        }
      }
      if (!profile) {
        sendJson(res, 400, { error: 'profile is required' });
        return;
      }

      const result = await analyzeProduct({
        imageBase64: body.imageBase64 || null,
        mediaType: body.mediaType || 'image/jpeg',
        profile,
        language: body.language || 'pt',
        userId,
        barcode: body.barcode || null,
      });

      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`VeganLand API listening on port ${PORT}`);
});

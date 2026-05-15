import http from 'node:http';
import { analyzeProduct } from './analyze.js';
import { pool } from './db.js';

const PORT = Number(process.env.PORT || 3000);
const APP_API_KEY = process.env.APP_API_KEY || '';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
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
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!APP_API_KEY) return true;
  return req.headers['x-app-api-key'] === APP_API_KEY;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      await pool.query('select 1');
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && req.url === '/analyze-product') {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }

      const body = await readJsonBody(req);
      if (!body.imageBase64 || !body.profile) {
        sendJson(res, 400, { error: 'imageBase64 and profile are required' });
        return;
      }

      const result = await analyzeProduct({
        imageBase64: body.imageBase64,
        mediaType: body.mediaType || 'image/jpeg',
        profile: body.profile,
        language: body.language || 'pt',
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

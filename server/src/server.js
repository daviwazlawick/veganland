import http from 'node:http';
import crypto from 'node:crypto';
import { analyzeProduct } from './analyze.js';
import { pool, createUser, findUserByEmail, getUserById, updateUserProfile, getUserHistory, getScanById, checkAndIncrementScanCounter, getScanUsage, storeEmailConfirmationToken, confirmEmailByToken, createPasswordResetToken, findValidPasswordResetToken, markPasswordResetTokenUsed, updateUserPassword } from './db.js';
import { hashPassword, verifyPassword, generateToken, verifyToken, extractToken } from './auth.js';
import { emailsEnabled, sendConfirmationEmail, sendPasswordResetEmail } from './email.js';

const PORT = Number(process.env.PORT || 3000);
const APP_API_KEY = process.env.APP_API_KEY || '';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-api-key, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

function htmlPage(title, body, color = '#7CB518') {
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — VeganLand</title>
  <style>body{font-family:sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .box{background:#fff;border-radius:16px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  h2{color:${color};margin-bottom:8px;}p{color:#555;line-height:1.6;}</style></head>
  <body><div class="box"><h2>🌱 ${title}</h2>${body}</div></body></html>`;
}

function htmlResetForm(token) {
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redefinir senha — VeganLand</title>
  <style>body{font-family:sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .box{background:#fff;border-radius:16px;padding:40px;max-width:420px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  h2{color:#7CB518;text-align:center;margin-bottom:4px;}p{color:#777;text-align:center;font-size:14px;margin-bottom:20px;}
  label{display:block;font-size:13px;font-weight:700;color:#555;margin-bottom:6px;}
  input{width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e8e8e8;border-radius:10px;font-size:15px;margin-bottom:14px;outline:none;}
  input:focus{border-color:#7CB518;}
  button{width:100%;background:#7CB518;color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;}
  button:disabled{opacity:.6;}
  #msg{text-align:center;font-size:14px;margin-top:12px;min-height:20px;}</style></head>
  <body><div class="box">
    <h2>🌱 VeganLand</h2>
    <p>Digite sua nova senha abaixo.</p>
    <label for="pw">Nova senha</label>
    <input id="pw" type="password" placeholder="Mínimo 6 caracteres" minlength="6" autocomplete="new-password">
    <label for="pw2">Confirmar senha</label>
    <input id="pw2" type="password" placeholder="Repita a senha" autocomplete="new-password">
    <button id="btn" onclick="doReset()">Salvar nova senha</button>
    <p id="msg"></p>
  </div>
  <script>
  async function doReset(){
    const pw=document.getElementById('pw').value;
    const pw2=document.getElementById('pw2').value;
    const msg=document.getElementById('msg');
    const btn=document.getElementById('btn');
    if(!pw||pw.length<6){msg.style.color='#ff4b4b';msg.textContent='Senha precisa ter pelo menos 6 caracteres.';return;}
    if(pw!==pw2){msg.style.color='#ff4b4b';msg.textContent='As senhas não coincidem.';return;}
    btn.disabled=true;msg.style.color='#777';msg.textContent='Salvando...';
    try{
      const r=await fetch('/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${token}',password:pw})});
      const d=await r.json();
      if(r.ok){msg.style.color='#7CB518';msg.textContent='Senha redefinida! Você já pode fazer login no app.';}
      else{msg.style.color='#ff4b4b';msg.textContent=d.error||'Erro ao redefinir senha.';btn.disabled=false;}
    }catch{msg.style.color='#ff4b4b';msg.textContent='Erro de conexão.';btn.disabled=false;}
  }
  </script></body></html>`;
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
      if (emailsEnabled()) {
        const confirmToken = crypto.randomBytes(32).toString('hex');
        await storeEmailConfirmationToken(user.id, confirmToken);
        sendConfirmationEmail(user.email, confirmToken).catch(console.error);
      }
      sendJson(res, 201, { token, user: { id: user.id, email: user.email }, emailConfirmationSent: emailsEnabled() });
      return;
    }

    // POST /auth/resend-confirmation
    if (req.method === 'POST' && req.url === '/auth/resend-confirmation') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      if (emailsEnabled()) {
        const confirmToken = crypto.randomBytes(32).toString('hex');
        await storeEmailConfirmationToken(claims.userId, confirmToken);
        sendConfirmationEmail(claims.email, confirmToken).catch(console.error);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    // GET /auth/confirm-email?token=xxx
    if (req.method === 'GET' && req.url.startsWith('/auth/confirm-email')) {
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const user = token ? await confirmEmailByToken(token) : null;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(user
        ? htmlPage('Email confirmado! 🌱', '<p>Seu email foi confirmado com sucesso. Pode fechar esta página.</p>', '#7CB518')
        : htmlPage('Link inválido', '<p>Este link é inválido ou expirou. Solicite um novo email de confirmação no app.</p>', '#FF4B4B')
      );
      return;
    }

    // POST /auth/forgot-password
    if (req.method === 'POST' && req.url === '/auth/forgot-password') {
      const { email } = await readJsonBody(req);
      // Always return 200 to not reveal if email exists
      if (email && emailsEnabled()) {
        const user = await findUserByEmail(email);
        if (user) {
          const resetToken = crypto.randomBytes(32).toString('hex');
          await createPasswordResetToken(user.id, resetToken);
          sendPasswordResetEmail(user.email, resetToken).catch(console.error);
        }
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    // GET /auth/reset-password?token=xxx — HTML form
    if (req.method === 'GET' && req.url.startsWith('/auth/reset-password')) {
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const record = token ? await findValidPasswordResetToken(token) : null;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(record
        ? htmlResetForm(token)
        : htmlPage('Link inválido', '<p>Este link é inválido ou já foi utilizado. Solicite um novo no app.</p>', '#FF4B4B')
      );
      return;
    }

    // POST /auth/reset-password — process reset (JSON from HTML form or app)
    if (req.method === 'POST' && req.url === '/auth/reset-password') {
      const { token, password } = await readJsonBody(req);
      if (!token || !password) {
        sendJson(res, 400, { error: 'token and password are required' });
        return;
      }
      if (password.length < 6) {
        sendJson(res, 400, { error: 'password must be at least 6 characters' });
        return;
      }
      const record = await findValidPasswordResetToken(token);
      if (!record) {
        sendJson(res, 400, { error: 'Invalid or expired reset token' });
        return;
      }
      const passwordHash = await hashPassword(password);
      await updateUserPassword(record.user_id, passwordHash);
      await markPasswordResetTokenUsed(record.id);
      sendJson(res, 200, { ok: true });
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

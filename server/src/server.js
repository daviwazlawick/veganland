import http from 'node:http';
import crypto from 'node:crypto';
import { analyzeProduct } from './analyze.js';
import { pool, createUser, findUserByEmail, getUserById, updateUserProfile, getUserHistory, getScanById, checkAndIncrementScanCounter, getScanUsage, getAdminStats, getAdminUserDetail, storeEmailConfirmationToken, confirmEmailByToken, createPasswordResetToken, findValidPasswordResetToken, markPasswordResetTokenUsed, updateUserPassword } from './db.js';
import { hashPassword, verifyPassword, generateToken, verifyToken, extractToken } from './auth.js';
import { emailsEnabled, sendConfirmationEmail, sendPasswordResetEmail } from './email.js';
import { htmlTerms, htmlPrivacy, htmlImprint } from './legal.js';

const PORT = Number(process.env.PORT || 3000);
const APP_API_KEY = process.env.APP_API_KEY || '';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'VeganLand2026!';

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

function htmlAdminPage(stats) {
  const dietLabel = { vegan: '🌱 Vegan', vegetarian: '🥕 Vegetariano', pescatarian: '🐟 Pescatariano', gluten_free: '🌾 Sem Glúten', halal: '☪️ Halal', omnivore: '🍽️ Onívoro' };
  const rows = stats.users.map(u => {
    const diet = dietLabel[u.diet_id] || (u.diet_id || '—');
    const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—';
    const lastScan = u.last_scan ? new Date(u.last_scan).toLocaleDateString('pt-BR') : '—';
    const monthBar = Math.min(100, Math.round((u.scans_this_month / 50) * 100));
    return `<tr style="cursor:pointer" onclick="location.href='/admin/user/${u.id}'">
      <td><a href="/admin/user/${u.id}" style="color:#1C2B22;font-weight:700;text-decoration:none">${u.email}</a></td>
      <td>${diet}</td>
      <td style="text-align:center;font-weight:700">${u.total_scans}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden">
            <div style="width:${monthBar}%;height:100%;background:#7CB518;border-radius:3px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:#555;white-space:nowrap">${u.scans_this_month}/50</span>
        </div>
      </td>
      <td style="color:#888;font-size:13px">${lastScan}</td>
      <td style="color:#888;font-size:13px">${joined}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — VeganLand</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6f0;min-height:100vh;color:#222}
    header{background:#1C2B22;padding:18px 32px;display:flex;align-items:center;gap:12px}
    header h1{color:#fff;font-size:20px;font-weight:800}
    header span{background:#7CB518;color:#fff;font-size:11px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:1px}
    main{max-width:1100px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:28px}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
    .card{background:#fff;border-radius:16px;padding:22px 24px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
    .card .num{font-size:38px;font-weight:900;color:#1C2B22;line-height:1}
    .card .lbl{font-size:13px;color:#888;font-weight:600;margin-top:6px}
    .card.green .num{color:#7CB518}
    .card.amber .num{color:#D4A843}
    .section{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
    .section h2{font-size:16px;font-weight:800;color:#1C2B22;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;font-size:11px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.5px;padding:0 10px 12px}
    td{padding:11px 10px;border-top:1px solid #f0f0f0;vertical-align:middle}
    tr:hover td{background:#fafff5}
    .badge{display:inline-block;background:#EEF5E8;color:#2E4736;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px}
    footer{text-align:center;color:#aaa;font-size:12px;padding:20px}
  </style></head>
  <body>
  <header>
    <h1>🌱 VeganLand</h1>
    <span>ADMIN</span>
  </header>
  <main>
    <div class="cards">
      <div class="card green"><div class="num">${stats.total_users}</div><div class="lbl">Usuários registrados</div></div>
      <div class="card"><div class="num">${stats.total_scans}</div><div class="lbl">Scans totais</div></div>
      <div class="card amber"><div class="num">${stats.scans_this_month}</div><div class="lbl">Scans este mês</div></div>
      <div class="card"><div class="num">${stats.scans_last_24h}</div><div class="lbl">Scans últimas 24h</div></div>
    </div>
    <div class="section">
      <h2>Usuários</h2>
      <table>
        <thead><tr>
          <th>Email</th><th>Dieta</th><th>Total scans</th><th>Este mês</th><th>Último scan</th><th>Cadastro</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Nenhum usuário ainda</td></tr>'}</tbody>
      </table>
    </div>
  </main>
  <footer>Atualizado em ${new Date().toLocaleString('pt-BR')} &mdash; VeganLand Admin</footer>
  </body></html>`;
}

function htmlAdminUserPage(data) {
  const { user, scans, scans_this_month } = data;
  const dietLabel = { vegan: '🌱 Vegan', vegetarian: '🥕 Vegetariano', pescatarian: '🐟 Pescatariano', gluten_free: '🌾 Sem Glúten', halal: '☪️ Halal', omnivore: '🍽️ Onívoro' };
  const statusCfg = {
    SAFE:     { label: 'Seguro',   color: '#2E6B2E', bg: '#EDF7E7' },
    CAUTION:  { label: 'Atenção',  color: '#9A6121', bg: '#FFF1E2' },
    NOT_SAFE: { label: 'Evitar',   color: '#8A3D3D', bg: '#FBEAEA' },
  };
  const joined = user.created_at ? new Date(user.created_at).toLocaleString('pt-BR') : '—';
  const diet = dietLabel[user.diet_id] || (user.diet_id || '—');
  const allergies = Array.isArray(user.allergy_ids) && user.allergy_ids.length
    ? user.allergy_ids.join(', ')
    : '—';
  const monthBar = Math.min(100, Math.round((scans_this_month / 50) * 100));

  const scanRows = scans.map(s => {
    const cfg = statusCfg[s.status] || { label: s.status || '—', color: '#888', bg: '#f5f5f5' };
    const date = s.created_at ? new Date(s.created_at).toLocaleString('pt-BR') : '—';
    const product = s.product_name || s.title || '—';
    const brand = s.brand ? `<span style="color:#aaa;font-size:12px"> · ${s.brand}</span>` : '';
    const result = s.result ? JSON.parse(typeof s.result === 'string' ? s.result : JSON.stringify(s.result)) : null;
    const explanation = result?.explanation || '—';
    const concerns = Array.isArray(result?.concerns) && result.concerns.length
      ? result.concerns.map(c => `<span style="background:#FBEAEA;color:#8A3D3D;padding:2px 7px;border-radius:5px;font-size:12px;font-weight:700">${c}</span>`).join(' ')
      : '';
    return `<tr>
      <td style="white-space:nowrap;color:#888;font-size:12px">${date}</td>
      <td><strong>${product}</strong>${brand}</td>
      <td><span style="background:${cfg.bg};color:${cfg.color};padding:3px 10px;border-radius:6px;font-size:12px;font-weight:800">${cfg.label}</span></td>
      <td style="color:#aaa;font-size:12px">${s.source || '—'}</td>
      <td style="font-size:13px;color:#555;max-width:300px">${explanation.length > 120 ? explanation.slice(0, 120) + '…' : explanation}</td>
      <td>${concerns}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${user.email} — VeganLand Admin</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6f0;min-height:100vh;color:#222}
    header{background:#1C2B22;padding:18px 32px;display:flex;align-items:center;gap:16px}
    header a{color:rgba(255,255,255,.6);text-decoration:none;font-size:14px;font-weight:600}
    header a:hover{color:#fff}
    header h1{color:#fff;font-size:18px;font-weight:800}
    header span{background:#7CB518;color:#fff;font-size:11px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:1px}
    main{max-width:1100px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
    .card{background:#fff;border-radius:14px;padding:20px 22px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
    .card .num{font-size:32px;font-weight:900;color:#1C2B22;line-height:1}
    .card .lbl{font-size:12px;color:#888;font-weight:600;margin-top:5px}
    .card.green .num{color:#7CB518}
    .profile{background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,.06);display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .profile h2{font-size:15px;font-weight:800;color:#1C2B22;grid-column:1/-1;margin-bottom:4px}
    .field label{font-size:11px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:3px}
    .field span{font-size:14px;font-weight:600;color:#222}
    .bar-wrap{height:8px;background:#eee;border-radius:4px;overflow:hidden;margin-top:6px}
    .bar-fill{height:100%;background:#7CB518;border-radius:4px}
    .section{background:#fff;border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
    .section h2{font-size:15px;font-weight:800;color:#1C2B22;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;font-size:11px;font-weight:800;color:#bbb;text-transform:uppercase;letter-spacing:.5px;padding:0 10px 10px}
    td{padding:10px;border-top:1px solid #f0f0f0;vertical-align:top}
    tr:hover td{background:#fafff5}
    footer{text-align:center;color:#aaa;font-size:12px;padding:20px}
  </style></head>
  <body>
  <header>
    <a href="/admin">← Voltar</a>
    <h1>${user.email}</h1>
    <span>ADMIN</span>
  </header>
  <main>
    <div class="cards">
      <div class="card green"><div class="num">${scans.length}</div><div class="lbl">Scans totais</div></div>
      <div class="card"><div class="num">${scans_this_month}<span style="font-size:16px;color:#aaa">/50</span></div><div class="lbl">Scans este mês</div>
        <div class="bar-wrap"><div class="bar-fill" style="width:${monthBar}%"></div></div>
      </div>
      <div class="card"><div class="num">${scans.filter(s => s.status === 'SAFE').length}</div><div class="lbl">✅ Seguros</div></div>
      <div class="card"><div class="num">${scans.filter(s => s.status === 'NOT_SAFE').length}</div><div class="lbl">🚫 Evitar</div></div>
    </div>
    <div class="profile">
      <h2>Perfil</h2>
      <div class="field"><label>Email</label><span>${user.email}</span></div>
      <div class="field"><label>Cadastro</label><span>${joined}</span></div>
      <div class="field"><label>Dieta</label><span>${diet}</span></div>
      <div class="field"><label>Alergias / Sensibilidades</label><span>${allergies}</span></div>
    </div>
    <div class="section">
      <h2>Histórico de scans</h2>
      <table>
        <thead><tr><th>Data</th><th>Produto</th><th>Resultado</th><th>Fonte</th><th>Explicação</th><th>Atenções</th></tr></thead>
        <tbody>${scanRows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Nenhum scan ainda</td></tr>'}</tbody>
      </table>
    </div>
  </main>
  <footer>VeganLand Admin</footer>
  </body></html>`;
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

    // GET /admin
    if (req.method === 'GET' && (req.url === '/admin' || req.url === '/admin/')) {
      const authHeader = req.headers['authorization'] || '';
      const b64 = authHeader.startsWith('Basic ') ? authHeader.slice(6) : '';
      const [user, ...rest] = Buffer.from(b64, 'base64').toString().split(':');
      const pass = rest.join(':');
      if (user !== ADMIN_USER || pass !== ADMIN_PASSWORD) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="VeganLand Admin"', 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
        return;
      }
      const stats = await getAdminStats();
      if (!stats) {
        res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Admin', '<p>Base de dados não configurada.</p>', '#FF4B4B'));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlAdminPage(stats));
      return;
    }

    // GET /admin/user/:id
    if (req.method === 'GET' && req.url.startsWith('/admin/user/')) {
      const authHeader = req.headers['authorization'] || '';
      const b64 = authHeader.startsWith('Basic ') ? authHeader.slice(6) : '';
      const [user, ...rest] = Buffer.from(b64, 'base64').toString().split(':');
      const pass = rest.join(':');
      if (user !== ADMIN_USER || pass !== ADMIN_PASSWORD) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="VeganLand Admin"', 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
        return;
      }
      const userId = req.url.slice('/admin/user/'.length);
      const data = await getAdminUserDetail(userId);
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Usuário não encontrado', '<p>Este usuário não existe.</p>', '#FF4B4B'));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlAdminUserPage(data));
      return;
    }

    // GET /legal/terms | /legal/privacy | /legal/imprint
    if (req.method === 'GET' && req.url.startsWith('/legal/')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.url === '/legal/terms') res.end(htmlTerms());
      else if (req.url === '/legal/privacy') res.end(htmlPrivacy());
      else if (req.url === '/legal/imprint') res.end(htmlImprint());
      else { sendJson(res, 404, { error: 'Not found' }); }
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

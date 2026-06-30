import http from 'node:http';
import crypto from 'node:crypto';
import { analyzeProduct } from './analyze.js';
import { pool, SCAN_LIMITS, createUser, findUserByEmail, getUserById, updateUserProfile, getUserHistory, getScanById, checkAndIncrementScanCounter, getScanUsage, setUserType, deleteUserAccount, getAdminStats, getAdminUserDetail, storeEmailConfirmationToken, confirmEmailByToken, createPasswordResetToken, findValidPasswordResetToken, markPasswordResetTokenUsed, updateUserPassword, setUserDisclaimerAccepted, getReferralStats, redeemReferralCode, qualifyReferralIfPending } from './db.js';
import { isValidCodeShape, normalizeCode } from './referralCode.js';
import { hashPassword, verifyPassword, generateToken, verifyToken, extractToken } from './auth.js';
import { emailsEnabled, sendConfirmationEmail, sendPasswordResetEmail, sendSupportEmail } from './email.js';
import { htmlTerms, htmlPrivacy, htmlImprint } from './legal.js';
import { htmlSupportPage, getSupportRecipient, getSupportBrandName } from './support.js';
import { htmlAboutPage } from './about.js';
import { detectLang } from './web_i18n.js';

const PORT = Number(process.env.PORT || 3000);
const APP_API_KEY = process.env.APP_API_KEY || '';
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || '';

const ALLOWED_ORIGINS = new Set(['https://veganland.app', 'https://novaqi.app']);

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://veganland.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type, x-app-api-key, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  };
}

function sendJson(res, status, body, origin = '') {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
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

function htmlResetForm(token, host) {
  const isNovaQI = (host || '').includes('novaqi');
  const brandColor = isNovaQI ? '#1B2D5B' : '#7CB518';
  const brandLabel = isNovaQI ? 'NovaQI' : '🌱 VeganLand';
  const brandTitle = isNovaQI ? 'Redefinir senha — NovaQI' : 'Redefinir senha — VeganLand';
  const successColor = isNovaQI ? '#1B2D5B' : '#7CB518';

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${brandTitle}</title>
  <style>body{font-family:sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .box{background:#fff;border-radius:16px;padding:40px;max-width:420px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  h2{color:${brandColor};text-align:center;margin-bottom:4px;}p{color:#777;text-align:center;font-size:14px;margin-bottom:20px;}
  label{display:block;font-size:13px;font-weight:700;color:#555;margin-bottom:6px;}
  input{width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e8e8e8;border-radius:10px;font-size:15px;margin-bottom:14px;outline:none;}
  input:focus{border-color:${brandColor};}
  button{width:100%;background:${brandColor};color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;}
  button:disabled{opacity:.6;}
  #msg{text-align:center;font-size:14px;margin-top:12px;min-height:20px;}</style></head>
  <body><div class="box">
    <h2>${brandLabel}</h2>
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
      if(r.ok){msg.style.color='${successColor}';msg.textContent='Senha redefinida! Você já pode fazer login no app.';}
      else{msg.style.color='#ff4b4b';msg.textContent=d.error||'Erro ao redefinir senha.';btn.disabled=false;}
    }catch{msg.style.color='#ff4b4b';msg.textContent='Erro de conexão.';btn.disabled=false;}
  }
  </script></body></html>`;
}

function planBadge(userType) {
  const cfg = {
    free:    { label: 'Free',     bg: '#F5F5F5', color: '#666666' },
    starter: { label: 'Starter',  bg: '#E8F4FF', color: '#1A5F8F' },
    premium: { label: 'Premium',  bg: '#FFF1E2', color: '#9A6121' },
    admin:   { label: 'Admin',    bg: '#E8F0FF', color: '#1A3A8F' },
  }[userType] || { label: userType || 'free', bg: '#f0f0f0', color: '#888' };
  return `<span style="background:${cfg.bg};color:${cfg.color};font-size:11px;font-weight:800;padding:2px 8px;border-radius:6px;white-space:nowrap">${cfg.label}</span>`;
}

function htmlAdminPage(stats, token) {
  const dietLabel = { vegan: '🌱 Vegan', vegetarian: '🥕 Vegetariano', pescatarian: '🐟 Pescatariano', gluten_free: '🌾 Sem Glúten', halal: '☪️ Halal', omnivore: '🍽️ Onívoro' };

  // Build 28-day signup sparkline — fill gaps with 0
  const trendMap = {};
  for (const r of stats.signup_trend) trendMap[r.day] = r.signups;
  const trendDays = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendDays.push({ day: key, label: key.slice(5), count: trendMap[key] || 0 });
  }
  const maxSignups = Math.max(...trendDays.map(d => d.count), 1);
  const sparkBars = trendDays.map(d => {
    const pct = Math.round((d.count / maxSignups) * 100);
    const isToday = d === trendDays[trendDays.length - 1];
    const color = isToday ? '#7CB518' : (d.count > 0 ? '#A8D456' : '#e8eee4');
    return `<div title="${d.label}: ${d.count} cadastros" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:100%;background:#f0f4ec;border-radius:3px 3px 0 0;height:60px;display:flex;align-items:flex-end">
        <div style="width:100%;height:${Math.max(pct, d.count > 0 ? 4 : 0)}%;background:${color};border-radius:3px 3px 0 0;transition:height .2s"></div>
      </div>
      <span style="font-size:9px;color:#bbb;white-space:nowrap;transform:rotate(-45deg);transform-origin:top center;display:inline-block;margin-top:6px">${d.label}</span>
    </div>`;
  }).join('');

  // Plan breakdown pills
  const pb = stats.plan_breakdown;
  const planPills = [
    { label: 'Free', count: pb.free, color: '#888', bg: '#f5f5f5' },
    { label: 'Starter', count: pb.starter, color: '#1A6B3E', bg: '#E5F5EC' },
    { label: 'Premium', count: pb.premium, color: '#7C3AED', bg: '#F3EEFF' },
  ].map(p => `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:${p.bg};border-radius:10px">
    <span style="font-size:22px;font-weight:900;color:${p.color}">${p.count}</span>
    <span style="font-size:12px;font-weight:700;color:${p.color}">${p.label}</span>
  </div>`).join('');

  const unconfirmed = stats.total_users - stats.confirmed_users;
  const conversionRate = stats.total_users > 0 ? Math.round(((pb.starter + pb.premium) / stats.total_users) * 100) : 0;

  const rows = stats.users.map(u => {
    const diet = dietLabel[u.diet_id] || (u.diet_id || '—');
    const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—';
    const joinedFull = u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : '';
    const lastScan = u.last_scan ? new Date(u.last_scan).toLocaleDateString('pt-BR') : '—';
    const userType = u.user_type || 'free';
    const limit = SCAN_LIMITS[userType] ?? SCAN_LIMITS.free;
    const monthBar = limit === null ? 0 : Math.min(100, Math.round((u.scans_this_month / limit) * 100));
    const monthLabel = limit === null ? `${u.scans_this_month}/∞` : `${u.scans_this_month}/${limit}`;
    const isNew = u.created_at && (Date.now() - new Date(u.created_at).getTime()) < 7 * 24 * 3600 * 1000;
    const confirmedDot = u.email_confirmed
      ? `<span title="Email confirmado" style="color:#7CB518;font-size:10px">✔</span>`
      : `<span title="Email não confirmado" style="color:#D4A843;font-size:10px">!</span>`;
    return `<tr style="cursor:pointer" onclick="location.href='/admin/user/${u.id}?token=${token}'">
      <td>
        ${isNew ? `<span style="display:inline-block;background:#7CB518;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:4px;margin-right:4px;vertical-align:middle">NEW</span>` : ''}
        <a href="/admin/user/${u.id}?token=${token}" style="color:#1C2B22;font-weight:700;text-decoration:none">${u.email}</a>
        ${confirmedDot}
      </td>
      <td>${diet}</td>
      <td>${planBadge(userType)}</td>
      <td style="text-align:center;font-weight:700">${u.total_scans}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden">
            <div style="width:${monthBar}%;height:100%;background:#7CB518;border-radius:3px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:#555;white-space:nowrap">${monthLabel}</span>
        </div>
      </td>
      <td style="color:#888;font-size:13px">${lastScan}</td>
      <td style="color:#888;font-size:13px" title="${joinedFull}">${joined}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin — NovaQI</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6f0;min-height:100vh;color:#222}
    header{background:#1C2B22;padding:18px 32px;display:flex;align-items:center;gap:12px}
    header h1{color:#fff;font-size:20px;font-weight:800}
    header span{background:#7CB518;color:#fff;font-size:11px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:1px}
    header .refresh{margin-left:auto;color:rgba(255,255,255,.5);font-size:12px;text-decoration:none}
    header .refresh:hover{color:#fff}
    main{max-width:1200px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
    .row{display:grid;gap:16px}
    .row.cols-5{grid-template-columns:repeat(5,1fr)}
    .row.cols-4{grid-template-columns:repeat(4,1fr)}
    .row.cols-3{grid-template-columns:repeat(3,1fr)}
    .row.cols-2{grid-template-columns:2fr 1fr}
    @media(max-width:900px){.row.cols-5,.row.cols-4,.row.cols-3,.row.cols-2{grid-template-columns:1fr 1fr}}
    @media(max-width:520px){.row.cols-5,.row.cols-4,.row.cols-3,.row.cols-2{grid-template-columns:1fr}}
    .card{background:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
    .card .num{font-size:36px;font-weight:900;color:#1C2B22;line-height:1}
    .card .lbl{font-size:12px;color:#888;font-weight:600;margin-top:5px}
    .card .sub{font-size:11px;color:#bbb;margin-top:4px}
    .card.green .num{color:#7CB518}
    .card.amber .num{color:#D4A843}
    .card.purple .num{color:#7C3AED}
    .card.blue .num{color:#2563EB}
    .section{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
    .section h2{font-size:15px;font-weight:800;color:#1C2B22;margin-bottom:16px;display:flex;align-items:center;gap:8px}
    .section h2 .sub{font-size:12px;font-weight:500;color:#bbb;margin-left:auto}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;font-size:10px;font-weight:800;color:#bbb;text-transform:uppercase;letter-spacing:.5px;padding:0 10px 10px}
    td{padding:10px 10px;border-top:1px solid #f0f0f0;vertical-align:middle}
    tr:hover td{background:#fafff5}
    .badge{display:inline-block;background:#EEF5E8;color:#2E4736;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px}
    footer{text-align:center;color:#bbb;font-size:12px;padding:24px}
  </style></head>
  <body>
  <header>
    <h1>NovaQI</h1>
    <span>ADMIN</span>
    <a class="refresh" href="/admin?token=${token}">↻ Atualizar</a>
  </header>
  <main>

    <!-- Growth KPIs -->
    <div class="row cols-5">
      <div class="card green">
        <div class="num">${stats.total_users}</div>
        <div class="lbl">Total de utilizadores</div>
        <div class="sub">${stats.confirmed_users} confirmados · ${unconfirmed} pendentes</div>
      </div>
      <div class="card blue">
        <div class="num">+${stats.new_users_today}</div>
        <div class="lbl">Novos hoje</div>
      </div>
      <div class="card blue">
        <div class="num">+${stats.new_users_week}</div>
        <div class="lbl">Novos esta semana</div>
      </div>
      <div class="card blue">
        <div class="num">+${stats.new_users_month}</div>
        <div class="lbl">Novos este mês</div>
      </div>
      <div class="card amber">
        <div class="num">${stats.active_users_7d}</div>
        <div class="lbl">Ativos últimos 7 dias</div>
        <div class="sub">${stats.total_users > 0 ? Math.round((stats.active_users_7d / stats.total_users) * 100) : 0}% dos utilizadores</div>
      </div>
    </div>

    <!-- Signup trend chart + plan breakdown -->
    <div class="row cols-2">
      <div class="section">
        <h2>Cadastros — últimos 28 dias <span class="sub">máx ${maxSignups}/dia</span></h2>
        <div style="display:flex;align-items:flex-end;gap:2px;height:80px;padding-bottom:20px">
          ${sparkBars}
        </div>
      </div>
      <div class="section">
        <h2>Planos</h2>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${planPills}
          <div style="margin-top:6px;padding-top:10px;border-top:1px solid #f0f0f0;font-size:12px;color:#888">
            Taxa de conversão: <strong style="color:#7C3AED">${conversionRate}%</strong>
            <span style="margin-left:8px;color:#bbb">(paid / total)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Scan + cost row -->
    <div class="row cols-4">
      <div class="card"><div class="num">${stats.total_scans}</div><div class="lbl">Scans totais</div></div>
      <div class="card amber"><div class="num">${stats.scans_this_month}</div><div class="lbl">Scans este mês</div></div>
      <div class="card"><div class="num">${stats.scans_last_24h}</div><div class="lbl">Scans últimas 24h</div></div>
      <div class="card purple">
        <div class="num">$${Number(stats.api_cost_this_month).toFixed(4)}</div>
        <div class="lbl">Custo Anthropic este mês</div>
        <a href="https://console.anthropic.com/settings/usage" target="_blank" style="font-size:11px;color:#7C3AED;font-weight:700;text-decoration:none;margin-top:6px;display:inline-block">Ver Console →</a>
      </div>
    </div>

    <!-- Users table -->
    <div class="section">
      <h2>
        Utilizadores
        <span class="sub">mostrando ${stats.users.length} mais recentes</span>
      </h2>
      <table>
        <thead><tr>
          <th>Email</th><th>Dieta</th><th>Plano</th><th>Total scans</th><th>Este mês</th><th>Último scan</th><th>Cadastro</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:24px">Nenhum utilizador ainda</td></tr>'}</tbody>
      </table>
    </div>

  </main>
  <footer>Atualizado em ${new Date().toLocaleString('pt-BR')}</footer>
  </body></html>`;
}

function htmlAdminUserPage(data, token) {
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
  const userType = user.user_type || 'starter';
  const limit = SCAN_LIMITS[userType] ?? SCAN_LIMITS.starter;
  const monthBar = limit === null ? 0 : Math.min(100, Math.round((scans_this_month / limit) * 100));
  const monthLabel = limit === null ? `${scans_this_month}/∞` : `${scans_this_month}/${limit}`;

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
    <a href="/admin?token=${token}">← Voltar</a>
    <h1>${user.email}</h1>
    <span>ADMIN</span>
  </header>
  <main>
    <div class="cards">
      <div class="card green"><div class="num">${scans.length}</div><div class="lbl">Scans totais</div></div>
      <div class="card"><div class="num">${monthLabel}</div><div class="lbl">Scans este mês</div>
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
      <div class="field"><label>Sensibilidades</label><span>${allergies}</span></div>
      <div class="field" style="grid-column:1/-1">
        <label>Plano</label>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap">
          ${planBadge(userType)}
          <form method="POST" action="/admin/user/${user.id}/set-type?token=${token}" style="display:flex;gap:8px;flex-wrap:wrap">
            ${['free','starter','premium','admin'].map(t => `<button type="submit" name="type" value="${t}" style="padding:5px 14px;border-radius:8px;border:2px solid ${t === userType ? '#1C2B22' : '#ddd'};background:${t === userType ? '#1C2B22' : '#fff'};color:${t === userType ? '#fff' : '#555'};font-size:12px;font-weight:700;cursor:pointer">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')}
          </form>
        </div>
      </div>
      <div class="field" style="grid-column:1/-1;margin-top:8px">
        <label>Ações</label>
        <form method="POST" action="/admin/user/${user.id}/delete?token=${token}" onsubmit="return confirm('Tem certeza? Esta ação é irreversível e apaga todos os dados do utilizador.')">
          <button type="submit" style="padding:8px 20px;border-radius:8px;border:2px solid #FF4B4B;background:#fff;color:#FF4B4B;font-size:13px;font-weight:700;cursor:pointer">🗑 Apagar utilizador</button>
        </form>
      </div>
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

const STORE_LINKS = {
  'novaqi.app': {
    name: 'NovaQI',
    color: '#0B1E3F',
    accent: '#FFCB3B',
    emoji: '🌱',
    iosUrl: 'https://apps.apple.com/us/app/novaqi-scan/id6775790620',
    androidUrl: 'https://play.google.com/store/apps/details?id=app.novaqi',
  },
  'veganland.app': {
    name: 'VeganLand',
    color: '#1C2B22',
    accent: '#7CB518',
    emoji: '🌱',
    // VeganLand is not published on either store yet — only NovaQI is live.
    iosUrl: null,
    androidUrl: null,
  },
};

function detectPlatform(ua) {
  const s = String(ua || '').toLowerCase();
  // Order matters: iPad in modern Safari can claim macOS; we treat any iOS family as ios.
  if (/iphone|ipad|ipod/.test(s)) return 'ios';
  // iPadOS 13+ Safari masquerades as macOS but exposes touch — accept it as ios.
  if (/macintosh/.test(s) && /mobile/.test(s)) return 'ios';
  if (/android/.test(s)) return 'android';
  return 'other';
}

function htmlStorePicker(brand, requestedPlatform) {
  const iosBtn = brand.iosUrl
    ? `<a href="${brand.iosUrl}" class="btn btn-ios">📱 App Store · iPhone & iPad</a>`
    : `<div class="btn btn-disabled">📱 iOS — coming soon</div>`;
  const androidBtn = brand.androidUrl
    ? `<a href="${brand.androidUrl}" class="btn btn-android">🤖 Google Play · Android</a>`
    : `<div class="btn btn-disabled">🤖 Android — coming soon</div>`;
  const note = requestedPlatform === 'android' && !brand.androidUrl
    ? '<p class="small" style="color:#E63E11">Android version coming soon. Tap above for iOS or sign up at the website.</p>'
    : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="${brand.color}">
<title>Get ${brand.name}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(180deg,${brand.color} 0%,#1a3a6e 100%);color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:24px;padding:36px 28px;max-width:420px;width:100%;color:${brand.color};text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2)}
  .emoji{font-size:56px;margin:8px 0}
  h1{font-size:26px;margin:0 0 8px;line-height:1.25}
  p{color:#475569;margin:8px 0 0;line-height:1.5}
  .btn{display:block;padding:16px;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;margin:12px 0;text-decoration:none;text-align:center}
  .btn-ios{background:${brand.color};color:#fff}
  .btn-android{background:${brand.accent};color:${brand.color}}
  .btn-disabled{background:#F4F6FA;color:#94a3b8;cursor:not-allowed}
  .small{font-size:13px;color:#6b7280;margin-top:18px;line-height:1.5}
</style></head><body>
<div class="card">
  <div class="emoji">${brand.emoji}</div>
  <h1>Get ${brand.name}</h1>
  <p>Scan ingredients, know if they match your diet — in seconds.</p>
  <div style="margin-top:22px">
    ${iosBtn}
    ${androidBtn}
  </div>
  ${note}
</div>
</body></html>`;
}

function htmlReferralLanding(code, valid, host) {
  const safe = String(code).replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!valid) {
    return htmlPage('Link inválido',
      '<p>Este link de convite não é válido. Pede um novo ao teu amigo.</p>',
      '#FF4B4B'
    );
  }
  const brand = STORE_LINKS[host] || STORE_LINKS['novaqi.app'];
  const iosLink = brand.iosUrl
    ? `<a href="${brand.iosUrl}" class="btn btn-primary" onclick="copyCode()">📱 Instalar no iPhone</a>`
    : '';
  const androidLink = brand.androidUrl
    ? `<a href="${brand.androidUrl}" class="btn btn-secondary" onclick="copyCode()">🤖 Instalar no Android</a>`
    : '';
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0B1E3F">
<title>NovaQI — Convite</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(180deg,#0B1E3F 0%,#1a3a6e 100%);color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:24px;padding:32px 24px;max-width:420px;width:100%;color:#0B1E3F;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2)}
  .badge{display:inline-block;background:#FFCB3B;color:#0B1E3F;padding:6px 14px;border-radius:20px;font-weight:700;font-size:13px;margin-bottom:16px}
  h1{font-size:24px;margin:0 0 8px;line-height:1.3}
  .gift{font-size:48px;margin:8px 0}
  .code-box{background:#F4F6FA;border:2px dashed #0B1E3F;border-radius:12px;padding:16px;margin:20px 0;font-size:28px;font-weight:800;letter-spacing:4px;font-family:'Courier New',monospace}
  .btn{display:block;width:100%;padding:16px;border-radius:14px;border:none;font-size:16px;font-weight:700;cursor:pointer;margin:10px 0;text-decoration:none;text-align:center}
  .btn-primary{background:#FFCB3B;color:#0B1E3F}
  .btn-secondary{background:#0B1E3F;color:#fff}
  .small{font-size:13px;color:#6b7280;margin-top:20px;line-height:1.5}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0B1E3F;color:#fff;padding:12px 20px;border-radius:24px;font-size:14px;opacity:0;transition:opacity .3s;pointer-events:none}
  .toast.show{opacity:1}
</style></head><body>
<div class="card">
  <span class="badge">🎁 CONVITE ${brand.name.toUpperCase()}</span>
  <div class="gift">${brand.emoji}</div>
  <h1>Ganhas <b>+10 scans grátis</b></h1>
  <p style="color:#475569;margin:8px 0 0">Foste convidado para a ${brand.name} — a app que decifra ingredientes para o teu perfil em segundos.</p>
  <div class="code-box" id="code">${safe}</div>
  ${iosLink}
  ${androidLink}
  <p class="small">Já tens a app? Abre-a — o código será aplicado automaticamente. Ou introduz <b>${safe}</b> em <i>Convidar amigos → Tenho um código</i>. Convidando 3 amigos ganhas <b>+30 scans bónus</b>.</p>
</div>
<div class="toast" id="toast">Código copiado para a área de transferência ✓</div>
<script>
  function copyCode(){
    var c=document.getElementById('code').innerText.trim();
    if(navigator.clipboard){navigator.clipboard.writeText(c).catch(function(){});}
    else{var t=document.createElement('textarea');t.value=c;document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(_){};document.body.removeChild(t);}
    var el=document.getElementById('toast');el.classList.add('show');setTimeout(function(){el.classList.remove('show');},2200);
    try{fetch('/referral/track-click?code='+encodeURIComponent(c),{method:'POST'}).catch(function(){});}catch(_){}
  }
  // Copy immediately so the code is on clipboard before the user even taps a button
  copyCode();
</script>
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

async function isAdminRequest(req) {
  const token = new URL(req.url, 'http://x').searchParams.get('token');
  if (!token) return false;
  const claims = verifyToken(token);
  if (!claims) return false;
  const user = await getUserById(claims.userId);
  return user?.user_type === 'admin';
}

const server = http.createServer(async (req, res) => {
  try {
    const origin = req.headers['origin'] || '';
    const host = req.headers['host'] || '';

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(origin));
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      if (pool) await pool.query('select 1');
      sendJson(res, 200, { ok: true, db: !!pool }, origin);
      return;
    }

    // GET /app/version — versão mínima obrigatória por plataforma
    if (req.method === 'GET' && req.url === '/app/version') {
      sendJson(res, 200, {
        ios:     { min: '1.0.0', store_url: 'https://apps.apple.com/app/novaqi/id0000000000' },
        android: { min: '1.0.0', store_url: 'https://play.google.com/store/apps/details?id=app.novaqi' },
        web:     { min: '1.0.0' },
      }, origin);
      return;
    }

    // POST /auth/register
    if (req.method === 'POST' && req.url === '/auth/register') {
      const { email, password, disclaimer_version, referral_code } = await readJsonBody(req);
      if (!email || !password) {
        sendJson(res, 400, { error: 'email and password are required' }, origin);
        return;
      }
      if (password.length < 6) {
        sendJson(res, 400, { error: 'password must be at least 6 characters' }, origin);
        return;
      }
      if (!disclaimer_version) {
        sendJson(res, 400, { error: 'disclaimer_acceptance is required' }, origin);
        return;
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        sendJson(res, 409, { error: 'Email already registered' }, origin);
        return;
      }
      const passwordHash = await hashPassword(password);
      const validCode = referral_code && isValidCodeShape(referral_code) ? normalizeCode(referral_code) : null;
      const user = await createUser(email, passwordHash, disclaimer_version, validCode);
      if (emailsEnabled()) {
        const confirmToken = crypto.randomBytes(32).toString('hex');
        await storeEmailConfirmationToken(user.id, confirmToken);
        sendConfirmationEmail(user.email, confirmToken, req.headers['host']).catch(console.error);
        sendJson(res, 201, { emailConfirmationSent: true, email: user.email }, origin);
      } else {
        const token = generateToken(user.id, user.email);
        sendJson(res, 201, { token, user: { id: user.id, email: user.email }, emailConfirmationSent: false }, origin);
      }
      return;
    }

    // POST /auth/resend-confirmation
    if (req.method === 'POST' && req.url === '/auth/resend-confirmation') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' }, origin);
        return;
      }
      if (emailsEnabled()) {
        const confirmToken = crypto.randomBytes(32).toString('hex');
        await storeEmailConfirmationToken(claims.userId, confirmToken);
        sendConfirmationEmail(claims.email, confirmToken).catch(console.error);
      }
      sendJson(res, 200, { ok: true }, origin);
      return;
    }

    // POST /auth/resend-confirmation-by-email — for unconfirmed users at login (no JWT)
    if (req.method === 'POST' && req.url === '/auth/resend-confirmation-by-email') {
      const { email } = await readJsonBody(req);
      if (email && emailsEnabled()) {
        const user = await findUserByEmail(email);
        if (user && !user.email_confirmed) {
          const confirmToken = crypto.randomBytes(32).toString('hex');
          await storeEmailConfirmationToken(user.id, confirmToken);
          sendConfirmationEmail(user.email, confirmToken, req.headers['host']).catch(console.error);
        }
      }
      sendJson(res, 200, { ok: true }, origin);
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
          sendPasswordResetEmail(user.email, resetToken, req.headers['host']).catch(console.error);
        }
      }
      sendJson(res, 200, { ok: true }, origin);
      return;
    }

    // GET /auth/reset-password?token=xxx — HTML form
    if (req.method === 'GET' && req.url.startsWith('/auth/reset-password')) {
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const record = token ? await findValidPasswordResetToken(token) : null;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(record
        ? htmlResetForm(token, req.headers['host'])
        : htmlPage('Link inválido', '<p>Este link é inválido ou já foi utilizado. Solicite um novo no app.</p>', '#FF4B4B')
      );
      return;
    }

    // POST /auth/reset-password — process reset (JSON from HTML form or app)
    if (req.method === 'POST' && req.url === '/auth/reset-password') {
      const { token, password } = await readJsonBody(req);
      if (!token || !password) {
        sendJson(res, 400, { error: 'token and password are required' }, origin);
        return;
      }
      if (password.length < 6) {
        sendJson(res, 400, { error: 'password must be at least 6 characters' }, origin);
        return;
      }
      const record = await findValidPasswordResetToken(token);
      if (!record) {
        sendJson(res, 400, { error: 'Invalid or expired reset token' }, origin);
        return;
      }
      const passwordHash = await hashPassword(password);
      await updateUserPassword(record.user_id, passwordHash);
      await markPasswordResetTokenUsed(record.id);
      sendJson(res, 200, { ok: true }, origin);
      return;
    }

    // POST /auth/login
    if (req.method === 'POST' && req.url === '/auth/login') {
      const { email, password } = await readJsonBody(req);
      if (!email || !password) {
        sendJson(res, 400, { error: 'email and password are required' }, origin);
        return;
      }
      const user = await findUserByEmail(email);
      if (!user) {
        sendJson(res, 401, { error: 'Invalid email or password' }, origin);
        return;
      }
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        sendJson(res, 401, { error: 'Invalid email or password' }, origin);
        return;
      }
      if (emailsEnabled() && !user.email_confirmed) {
        sendJson(res, 403, { error: 'email_not_confirmed' }, origin);
        return;
      }
      const token = generateToken(user.id, user.email);
      sendJson(res, 200, { token, user: { id: user.id, email: user.email } }, origin);
      return;
    }

    // GET /auth/me
    if (req.method === 'GET' && req.url === '/auth/me') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' }, origin);
        return;
      }
      const [user, usage] = await Promise.all([
        getUserById(claims.userId),
        getScanUsage(claims.userId),
      ]);
      if (!user) {
        sendJson(res, 404, { error: 'User not found' }, origin);
        return;
      }
      sendJson(res, 200, { user, usage }, origin);
      return;
    }

    // PATCH /user/disclaimer
    if (req.method === 'PATCH' && req.url === '/user/disclaimer') {
      const claims = getAuthUser(req);
      if (!claims) { sendJson(res, 401, { error: 'Unauthorized' }, origin); return; }
      const { disclaimer_version } = await readJsonBody(req);
      if (!disclaimer_version) { sendJson(res, 400, { error: 'disclaimer_version required' }, origin); return; }
      await setUserDisclaimerAccepted(claims.userId, disclaimer_version);
      sendJson(res, 200, { ok: true }, origin);
      return;
    }

    // PATCH /user/profile
    if (req.method === 'PATCH' && req.url === '/user/profile') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' }, origin);
        return;
      }
      const body = await readJsonBody(req);
      const updated = await updateUserProfile(claims.userId, body);
      if (!updated) {
        sendJson(res, 400, { error: 'No valid fields to update' }, origin);
        return;
      }
      sendJson(res, 200, { user: updated }, origin);
      return;
    }

    // DELETE /user/account
    if (req.method === 'DELETE' && req.url === '/user/account') {
      const claims = getAuthUser(req);
      if (!claims) { sendJson(res, 401, { error: 'Unauthorized' }, origin); return; }
      await deleteUserAccount(claims.userId);
      sendJson(res, 200, { ok: true }, origin);
      return;
    }

    // POST /user/plan
    if (req.method === 'POST' && req.url === '/user/plan') {
      const claims = getAuthUser(req);
      if (!claims) { sendJson(res, 401, { error: 'Unauthorized' }, origin); return; }
      const body = await readJsonBody(req);
      const validPlans = ['free', 'starter', 'premium'];
      if (!validPlans.includes(body?.plan)) {
        sendJson(res, 400, { error: 'Invalid plan' }, origin); return;
      }
      const currentUser = await getUserById(claims.userId);
      if (currentUser?.user_type === 'admin') {
        sendJson(res, 403, { error: 'Cannot change admin plan' }, origin); return;
      }
      await setUserType(claims.userId, body.plan);
      sendJson(res, 200, { plan: body.plan }, origin);
      return;
    }

    // GET /user/history
    if (req.method === 'GET' && req.url === '/user/history') {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' }, origin);
        return;
      }
      const history = await getUserHistory(claims.userId);
      sendJson(res, 200, { history }, origin);
      return;
    }

    // GET /referral/me — current user's code + progress
    if (req.method === 'GET' && req.url === '/referral/me') {
      const claims = getAuthUser(req);
      if (!claims) { sendJson(res, 401, { error: 'Unauthorized' }, origin); return; }
      const stats = await getReferralStats(claims.userId);
      if (!stats) { sendJson(res, 404, { error: 'Not found' }, origin); return; }
      sendJson(res, 200, stats, origin);
      return;
    }

    // POST /referral/redeem — apply a code after registration (one-time)
    if (req.method === 'POST' && req.url === '/referral/redeem') {
      const claims = getAuthUser(req);
      if (!claims) { sendJson(res, 401, { error: 'Unauthorized' }, origin); return; }
      const { code } = await readJsonBody(req);
      const result = await redeemReferralCode(claims.userId, code);
      sendJson(res, result.ok ? 200 : 400, result, origin);
      return;
    }

    // GET /get — auto-detect device and redirect to the right store
    // Use ?picker=1 to force the chooser page (handy for testing or sharing).
    if ((req.method === 'GET' || req.method === 'HEAD') && (req.url === '/get' || req.url.startsWith('/get?'))) {
      const brand = STORE_LINKS[host] || STORE_LINKS['novaqi.app'];
      const platform = detectPlatform(req.headers['user-agent']);
      const url = new URL(req.url, 'http://x');
      const forcePicker = url.searchParams.get('picker') === '1';

      if (!forcePicker && platform === 'ios' && brand.iosUrl) {
        res.writeHead(302, { Location: brand.iosUrl });
        res.end();
        return;
      }
      if (!forcePicker && platform === 'android' && brand.androidUrl) {
        res.writeHead(302, { Location: brand.androidUrl });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlStorePicker(brand, platform));
      return;
    }

    // GET /r/:code — public landing page for referral links
    if (req.method === 'GET' && req.url.startsWith('/r/')) {
      const code = normalizeCode(req.url.slice('/r/'.length).split('?')[0].split('/')[0]);
      const valid = isValidCodeShape(code);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlReferralLanding(code, valid, host));
      return;
    }

    // GET /scan/:id
    if (req.method === 'GET' && req.url.startsWith('/scan/')) {
      const claims = getAuthUser(req);
      if (!claims) {
        sendJson(res, 401, { error: 'Unauthorized' }, origin);
        return;
      }
      const scanId = req.url.slice('/scan/'.length);
      if (!scanId) {
        sendJson(res, 404, { error: 'Not found' }, origin);
        return;
      }
      const scan = await getScanById(scanId, claims.userId);
      if (!scan) {
        sendJson(res, 404, { error: 'Scan not found' }, origin);
        return;
      }
      sendJson(res, 200, { scan }, origin);
      return;
    }

    // POST /analyze-product
    if (req.method === 'POST' && req.url === '/analyze-product') {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: 'Unauthorized' }, origin);
        return;
      }

      const body = await readJsonBody(req);
      if (!body.imageBase64 && !body.barcode) {
        sendJson(res, 400, { error: 'imageBase64 or barcode is required' }, origin);
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
        sendJson(res, 400, { error: 'profile is required' }, origin);
        return;
      }

      const result = await analyzeProduct({
        imageBase64: body.imageBase64 || null,
        mediaType: body.mediaType || 'image/jpeg',
        profile,
        language: body.language || 'pt',
        userId,
        barcode: body.barcode || null,
        skipBarcodeCache: !!body.skipBarcodeCache,
      });

      sendJson(res, 200, result, origin);
      return;
    }

    // GET /admin
    if (req.method === 'GET' && (req.url === '/admin' || req.url === '/admin/' || req.url.startsWith('/admin?'))) {
      if (!await isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Acesso negado', '<p>Você não tem permissão para acessar esta página.</p>', '#FF4B4B'));
        return;
      }
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const stats = await getAdminStats();
      if (!stats) {
        res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Admin', '<p>Base de dados não configurada.</p>', '#FF4B4B'));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlAdminPage(stats, token));
      return;
    }

    // GET /admin/user/:id
    if (req.method === 'GET' && req.url.startsWith('/admin/user/')) {
      if (!await isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Acesso negado', '<p>Você não tem permissão para acessar esta página.</p>', '#FF4B4B'));
        return;
      }
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const userId = new URL(req.url, 'http://x').pathname.slice('/admin/user/'.length);
      const data = await getAdminUserDetail(userId);
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Usuário não encontrado', '<p>Este usuário não existe.</p>', '#FF4B4B'));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlAdminUserPage(data, token));
      return;
    }

    // POST /admin/user/:id/delete
    if (req.method === 'POST' && req.url.match(/^\/admin\/user\/\d+\/delete/)) {
      if (!await isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Acesso negado', '<p>Você não tem permissão para acessar esta página.</p>', '#FF4B4B'));
        return;
      }
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const userId = new URL(req.url, 'http://x').pathname.split('/')[3];
      const adminClaims = verifyToken(token);
      if (String(userId) === String(adminClaims?.userId)) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Erro', '<p>Não pode apagar a própria conta de admin.</p>', '#FF4B4B'));
        return;
      }
      await deleteUserAccount(userId);
      res.writeHead(302, { Location: `/admin?token=${token}` });
      res.end();
      return;
    }

    // POST /admin/user/:id/set-type
    if (req.method === 'POST' && req.url.match(/^\/admin\/user\/\d+\/set-type/)) {
      if (!await isAdminRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlPage('Acesso negado', '<p>Você não tem permissão para acessar esta página.</p>', '#FF4B4B'));
        return;
      }
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const userId = new URL(req.url, 'http://x').pathname.split('/')[3];
      const raw = await new Promise(resolve => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => resolve(body));
      });
      const params = new URLSearchParams(raw);
      const newType = params.get('type');
      if (!['free', 'starter', 'premium', 'admin'].includes(newType)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid type');
        return;
      }
      await setUserType(userId, newType);
      res.writeHead(302, { Location: `/admin/user/${userId}?token=${token}` });
      res.end();
      return;
    }

    // POST /webhook/revenuecat — subscription lifecycle events
    if (req.method === 'POST' && req.url === '/webhook/revenuecat') {
      const auth = req.headers['authorization'] || '';
      if (REVENUECAT_WEBHOOK_SECRET && auth !== REVENUECAT_WEBHOOK_SECRET) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const body = await readJsonBody(req);
      const event = body?.event;
      if (event) {
        const userId = event.app_user_id || event.original_app_user_id;
        const eventType = event.type;
        const entitlementId = event.entitlement_id
          || (Array.isArray(event.entitlement_ids) ? event.entitlement_ids[0] : null);

        let newUserType = null;
        if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'SUBSCRIBER_ALIAS'].includes(eventType)) {
          if (entitlementId === 'pro') newUserType = 'premium';
          else if (entitlementId === 'starter') newUserType = 'starter';
        } else if (['EXPIRATION', 'BILLING_ISSUE'].includes(eventType)) {
          // CANCELLATION = cancelled auto-renewal but access remains until expires_date
          // Only EXPIRATION means access truly ended
          newUserType = 'free';
        }

        if (newUserType && userId) {
          setUserType(userId, newUserType).catch(console.error);
        }
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    // GET /about
    if (req.method === 'GET' && req.url.startsWith('/about')) {
      const urlObj = new URL(req.url, 'http://x');
      const lang = detectLang(req, urlObj);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlAboutPage(host, lang));
      return;
    }

    // GET /support
    if (req.method === 'GET' && req.url.startsWith('/support') && !req.url.startsWith('/support/')) {
      const urlObj = new URL(req.url, 'http://x');
      const lang = detectLang(req, urlObj);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlSupportPage(host, lang));
      return;
    }

    // POST /support/submit
    if (req.method === 'POST' && req.url === '/support/submit') {
      const body = await readJsonBody(req);
      const { hp, name, email, topic, message, gdpr, marketing } = body || {};
      if (hp) { sendJson(res, 200, { ok: true }, origin); return; } // honeypot
      if (!name?.trim() || !email?.trim() || !topic || !message?.trim() || !gdpr) {
        sendJson(res, 400, { error: 'Missing required fields' }, origin); return;
      }
      await sendSupportEmail({ name: name.trim(), email: email.trim(), topic, message: message.trim(), marketing: !!marketing }, host);
      sendJson(res, 200, { ok: true }, origin);
      return;
    }

    // GET /legal/terms | /legal/privacy | /legal/imprint
    if (req.method === 'GET' && req.url.startsWith('/legal/')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.url === '/legal/terms') res.end(htmlTerms(host));
      else if (req.url === '/legal/privacy') res.end(htmlPrivacy(host));
      else if (req.url === '/legal/imprint') res.end(htmlImprint(host));
      else { sendJson(res, 404, { error: 'Not found' }); }
      return;
    }

    sendJson(res, 404, { error: 'Not found' }, origin);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || 'Internal server error' }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`VeganLand API listening on port ${PORT}`);
});

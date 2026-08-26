import nodemailer from 'nodemailer';
import { spawn } from 'child_process';
import './env.js';

// Detect image format from magic bytes. Returns one of:
// 'jpeg' | 'png' | 'webp' | 'heic' | 'heif' | 'unknown'.
// Needed because iOS launchCameraAsync returns raw HEIC even when base64
// is requested — that lands as .heic in the email and Gmail/Apple Mail
// won't preview it. We detect and transcode via Python before attaching.
function sniffImageFormat(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return 'unknown';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  // ISOBMFF: bytes 4-7 = 'ftyp', 8-11 = brand (heic, heix, hevc, hevx, mif1, msf1)
  if (buf.slice(4, 8).toString() === 'ftyp') {
    const brand = buf.slice(8, 12).toString();
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx') return 'heic';
    if (brand === 'mif1' || brand === 'msf1' || brand === 'heim' || brand === 'heis') return 'heif';
  }
  return 'unknown';
}

// Spawn Python to transcode HEIC/HEIF → JPEG. Cheap: ~200ms per call.
// Returns { buf, mime, ext }. On failure, returns original buffer as-is.
function transcodeToJpeg(buf) {
  return new Promise((resolve) => {
    const py = spawn('/opt/body-analysis-env/bin/python3',
      ['/opt/veganland/server/src/heic_to_jpg.py']);
    const chunks = [];
    let err = '';
    const timer = setTimeout(() => { py.kill(); resolve({ buf, mime: 'image/heic', ext: 'heic', failed: true }); }, 8000);
    py.stdout.on('data', d => chunks.push(d));
    py.stderr.on('data', d => { err += d; });
    py.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && chunks.length > 0) {
        resolve({ buf: Buffer.concat(chunks), mime: 'image/jpeg', ext: 'jpg' });
      } else {
        console.warn('[email-transcode] failed code=%s err=%s', code, err.slice(-200));
        resolve({ buf, mime: 'image/heic', ext: 'heic', failed: true });
      }
    });
    py.stdin.end(buf);
  });
}

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

function getBrand(host) {
  if (host && host.includes('novaqi')) return 'novaqi';
  return 'veganland';
}

function getConfig(brand) {
  if (brand === 'novaqi') {
    return {
      from: process.env.NOVAQI_SMTP_FROM || 'NovaQI <contact@novaqi.app>',
      appUrl: 'https://novaqi.app',
      name: 'NovaQI',
      color: '#0E1B14',
      emoji: '🔍',
      user: process.env.NOVAQI_SMTP_USER,
      pass: process.env.NOVAQI_SMTP_PASS,
    };
  }
  return {
    from: process.env.SMTP_FROM || 'VeganLand <contact@veganland.app>',
    appUrl: APP_URL,
    name: 'VeganLand',
    color: '#7CB518',
    emoji: '🌱',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
}

export function emailsEnabled() {
  return !!process.env.SMTP_HOST;
}

function createTransport(brand) {
  const cfg = getConfig(brand);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

function htmlWrapper(content, brand) {
  const cfg = getConfig(brand);
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <h2 style="color:${cfg.color};margin-bottom:8px;">${cfg.emoji} ${cfg.name}</h2>
      ${content}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#bbb;font-size:11px;margin:0;">Se você não realizou esta ação, ignore este email.</p>
    </div>
  `;
}

export async function sendConfirmationEmail(email, token, host) {
  if (!emailsEnabled()) return;
  const brand = getBrand(host);
  const cfg = getConfig(brand);
  const url = `${cfg.appUrl}/auth/confirm-email?token=${token}`;
  await createTransport(brand).sendMail({
    from: cfg.from,
    to: email,
    subject: `Confirme seu email — ${cfg.name}`,
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;">Olá! Confirme seu endereço de email para ativar sua conta.</p>
      <a href="${url}" style="display:inline-block;background:${cfg.color};color:#fff;text-decoration:none;
         padding:14px 28px;border-radius:10px;font-weight:bold;margin:16px 0;font-size:15px;">
        Confirmar Email
      </a>
      <p style="color:#999;font-size:12px;margin-top:8px;">Link: <a href="${url}" style="color:${cfg.color};">${url}</a></p>
      <p style="color:#bbb;font-size:12px;">Este link expira em 24 horas.</p>
    `, brand),
  });
}

export async function sendSupportEmail({ name, email, topic, message, marketing }, host) {
  if (!emailsEnabled()) return;
  const brand = getBrand(host);
  const cfg = getConfig(brand);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  await createTransport(brand).sendMail({
    from: cfg.from,
    to: cfg.from,
    replyTo: `${name} <${email}>`,
    subject: `SUPPORT FROM ${cfg.name.toUpperCase()} — ${topic}`,
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;margin-bottom:16px;">New support request received:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:120px">Name</td><td style="padding:8px 0;color:#222;font-weight:600">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;color:#222"><a href="mailto:${email}" style="color:${cfg.color}">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888">Topic</td><td style="padding:8px 0;color:#222">${topic}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Marketing</td><td style="padding:8px 0;color:#222">${marketing ? 'Yes' : 'No'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Submitted</td><td style="padding:8px 0;color:#888;font-size:12px">${now}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="color:#333;font-size:14px;white-space:pre-wrap">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
    `, brand),
  });
}

export async function sendOnboardingFeedbackEmail({ userEmail, userId, dietId, allergyIds, scanTitle, scanLanguage, scanPayload, comment }, host) {
  if (!emailsEnabled()) return;
  const brand = getBrand(host);
  const cfg = getConfig(brand);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const allergiesStr = Array.isArray(allergyIds) && allergyIds.length ? allergyIds.join(', ') : '—';
  const commentHtml = comment
    ? `<p style="color:#333;font-size:14px;white-space:pre-wrap;background:#fff8ea;padding:12px;border-radius:8px;border-left:3px solid ${cfg.color}">${comment.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`
    : `<p style="color:#999;font-size:13px;font-style:italic">(sem comentário do utilizador)</p>`;
  const payloadJson = scanPayload
    ? `<pre style="background:#f4f4f4;padding:12px;border-radius:8px;font-size:11px;color:#333;overflow:auto;max-height:280px;white-space:pre-wrap">${JSON.stringify(scanPayload, null, 2).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`
    : '';
  await createTransport(brand).sendMail({
    from: cfg.from,
    to: cfg.from,
    replyTo: userEmail ? `<${userEmail}>` : undefined,
    subject: `👎 Onboarding feedback — ${cfg.name}`,
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;margin-bottom:16px;">Novo utilizador não gostou do primeiro scan.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:120px">User ID</td><td style="padding:8px 0;color:#222;font-weight:600">${userId}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;color:#222"><a href="mailto:${userEmail || ''}" style="color:${cfg.color}">${userEmail || '—'}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888">Diet</td><td style="padding:8px 0;color:#222">${dietId || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Allergies</td><td style="padding:8px 0;color:#222">${allergiesStr}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Product</td><td style="padding:8px 0;color:#222">${(scanTitle || '—').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Language</td><td style="padding:8px 0;color:#222">${scanLanguage || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Submitted</td><td style="padding:8px 0;color:#888;font-size:12px">${now}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="color:#888;font-size:12px;margin-bottom:4px">Comentário:</p>
      ${commentHtml}
      <p style="color:#888;font-size:12px;margin:16px 0 4px">Scan payload:</p>
      ${payloadJson}
    `, brand),
  });
}

export async function sendPasswordResetEmail(email, token, host) {
  if (!emailsEnabled()) return;
  const brand = getBrand(host);
  const cfg = getConfig(brand);
  const url = `${cfg.appUrl}/auth/reset-password?token=${token}`;
  await createTransport(brand).sendMail({
    from: cfg.from,
    to: email,
    subject: `Redefinir senha — ${cfg.name}`,
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
      <a href="${url}" style="display:inline-block;background:${cfg.color};color:#fff;text-decoration:none;
         padding:14px 28px;border-radius:10px;font-weight:bold;margin:16px 0;font-size:15px;">
        Redefinir Senha
      </a>
      <p style="color:#999;font-size:12px;margin-top:8px;">Link: <a href="${url}" style="color:${cfg.color};">${url}</a></p>
      <p style="color:#bbb;font-size:12px;">Este link expira em 1 hora.</p>
    `, brand),
  });
}

export async function sendProductReviewEmail({ userEmail, userId, productName, barcode, categories, description, language, photos }, host) {
  if (!emailsEnabled()) return;
  const brand = getBrand(host);
  const cfg = getConfig(brand);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const catList = Array.isArray(categories) && categories.length
    ? categories.join(', ')
    : '—';
  const descHtml = description
    ? `<p style="color:#333;font-size:14px;white-space:pre-wrap;background:#fff8ea;padding:12px;border-radius:8px;border-left:3px solid ${cfg.color}">${description.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`
    : `<p style="color:#999;font-size:13px;font-style:italic">(sem descrição)</p>`;

  // photos: array of { name, mime, base64 } — up to 5. Converted to nodemailer
  // attachments so the reviewer can open barcode/ingredients/label directly.
  // Sniff magic bytes: iPhone launchCameraAsync frequently sends HEIC even
  // when the client tags it as image/jpeg. Transcode HEIC/HEIF → JPEG via
  // Python + pillow-heif (already installed at /opt/body-analysis-env) so
  // Gmail/Apple Mail can preview inline.
  const rawList = (Array.isArray(photos) ? photos : [])
    .filter(p => p && p.base64)
    .slice(0, 5);
  const attachments = [];
  for (let i = 0; i < rawList.length; i++) {
    const p = rawList[i];
    let buf = Buffer.from(p.base64.replace(/^data:[^,]+,/, ''), 'base64');
    const origLen = buf.length;
    const fmt = sniffImageFormat(buf);
    const firstBytesHex = buf.slice(0, 16).toString('hex');
    console.log(`[product-review] photo ${i} name=${p.name} client_mime=${p.mime} sniffed=${fmt} bytes=${origLen} magic=${firstBytesHex}`);
    let mime = 'image/jpeg';
    let ext = 'jpg';
    if (fmt === 'heic' || fmt === 'heif') {
      const r = await transcodeToJpeg(buf);
      buf = r.buf; mime = r.mime; ext = r.ext;
      console.log(`[product-review] photo ${i} transcode heic→jpeg: ${origLen} → ${buf.length} bytes${r.failed ? ' (FAILED, kept original)' : ''}`);
    } else if (fmt === 'png')  { mime = 'image/png';  ext = 'png';  }
    else if (fmt === 'webp')   { mime = 'image/webp'; ext = 'webp'; }
    else if (fmt === 'jpeg')   { /* already jpeg */ }
    else {
      // Unknown format: attempt transcode anyway — Pillow supports many formats
      // Pillow can decode. Fall back to sending raw with client-supplied mime.
      const r = await transcodeToJpeg(buf);
      if (!r.failed) {
        buf = r.buf; mime = r.mime; ext = r.ext;
        console.log(`[product-review] photo ${i} unknown format transcoded → jpeg (${buf.length}b)`);
      } else {
        mime = p.mime || 'application/octet-stream';
        ext = (p.mime || '').split('/')[1] || 'bin';
        console.warn(`[product-review] photo ${i} kept as ${mime} (transcode failed)`);
      }
    }
    const baseName = (typeof p.name === 'string' && p.name) ? p.name : `photo_${i + 1}`;
    const filename = `${baseName}.${ext}`;
    attachments.push({
      filename,
      content: buf,
      contentType: mime,
      // Force base64 output — some Hostinger relays flip to quoted-printable
      // and corrupt binary.
      contentTransferEncoding: 'base64',
      // Explicit Content-Disposition: attachment. Without it, Gmail iOS
      // treats image attachments as inline and hides them from the message
      // view when they aren't referenced by cid in the HTML body.
      contentDisposition: 'attachment',
    });
  }
  console.log(`[product-review] sending email with ${attachments.length} attachments, total ${attachments.reduce((s,a)=>s+a.content.length,0)} bytes`);

  const escBarcode = (barcode || '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escName    = (productName || '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  await createTransport(brand).sendMail({
    from: cfg.from,
    to: cfg.from,
    replyTo: userEmail ? `<${userEmail}>` : undefined,
    subject: 'Product review request',
    attachments,
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;margin-bottom:16px;">Um utilizador reportou informação incorrecta num produto.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:120px">User ID</td><td style="padding:8px 0;color:#222;font-weight:600">${userId}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;color:#222"><a href="mailto:${userEmail || ''}" style="color:${cfg.color}">${userEmail || '—'}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888">Produto</td><td style="padding:8px 0;color:#222;font-weight:600">${escName}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Barcode</td><td style="padding:8px 0;color:#222;font-family:monospace">${escBarcode}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Tipo</td><td style="padding:8px 0;color:#222">${catList}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Língua</td><td style="padding:8px 0;color:#222">${language || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Fotos</td><td style="padding:8px 0;color:#222">${attachments.length} anexo(s)</td></tr>
        <tr><td style="padding:8px 0;color:#888">Recebido</td><td style="padding:8px 0;color:#888;font-size:12px">${now}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="color:#888;font-size:12px;margin-bottom:4px">Descrição do utilizador:</p>
      ${descHtml}
      <p style="color:#888;font-size:11px;margin-top:24px">Anexos: barcode/ingredientes/label + até 2 fotos opcionais. Clica em cada um no email para abrir.</p>
    `, brand),
  });
}

export async function sendAppSurveyEmail({ userEmail, userId, dietId, language, message }, host) {
  if (!emailsEnabled()) return;
  const brand = getBrand(host);
  const cfg = getConfig(brand);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const msgHtml = `<p style="color:#333;font-size:14px;white-space:pre-wrap;background:#f0f9ee;padding:14px;border-radius:8px;border-left:3px solid ${cfg.color}">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`;
  await createTransport(brand).sendMail({
    from: cfg.from,
    to: cfg.from,
    replyTo: userEmail ? `<${userEmail}>` : undefined,
    subject: `💬 App survey — ${cfg.name}`,
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;margin-bottom:16px;">Um utilizador partilhou o que gostaria de ver na app.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#888;width:120px">User ID</td><td style="padding:8px 0;color:#222;font-weight:600">${userId}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0;color:#222"><a href="mailto:${userEmail || ''}" style="color:${cfg.color}">${userEmail || '—'}</a></td></tr>
        <tr><td style="padding:8px 0;color:#888">Dieta</td><td style="padding:8px 0;color:#222">${dietId || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Língua</td><td style="padding:8px 0;color:#222">${language || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#888">Data</td><td style="padding:8px 0;color:#888;font-size:12px">${now}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="color:#888;font-size:12px;margin-bottom:4px">Mensagem:</p>
      ${msgHtml}
    `, brand),
  });
}

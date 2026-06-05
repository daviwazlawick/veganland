import nodemailer from 'nodemailer';
import './env.js';

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
      color: '#1E1B4B',
      emoji: '🎯',
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

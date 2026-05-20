import nodemailer from 'nodemailer';
import './env.js';

const FROM = process.env.SMTP_FROM || 'VeganLand <contact@veganland.app>';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export function emailsEnabled() {
  return !!process.env.SMTP_HOST;
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function htmlWrapper(content) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
      <h2 style="color:#7CB518;margin-bottom:8px;">🌱 VeganLand</h2>
      ${content}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#bbb;font-size:11px;margin:0;">Se você não realizou esta ação, ignore este email.</p>
    </div>
  `;
}

export async function sendConfirmationEmail(email, token) {
  if (!emailsEnabled()) return;
  const url = `${APP_URL}/auth/confirm-email?token=${token}`;
  await createTransport().sendMail({
    from: FROM,
    to: email,
    subject: 'Confirme seu email — VeganLand',
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;">Olá! Confirme seu endereço de email para ativar sua conta.</p>
      <a href="${url}" style="display:inline-block;background:#7CB518;color:#fff;text-decoration:none;
         padding:14px 28px;border-radius:10px;font-weight:bold;margin:16px 0;font-size:15px;">
        Confirmar Email
      </a>
      <p style="color:#999;font-size:12px;margin-top:8px;">Link: <a href="${url}" style="color:#7CB518;">${url}</a></p>
      <p style="color:#bbb;font-size:12px;">Este link expira em 24 horas.</p>
    `),
  });
}

export async function sendPasswordResetEmail(email, token) {
  if (!emailsEnabled()) return;
  const url = `${APP_URL}/auth/reset-password?token=${token}`;
  await createTransport().sendMail({
    from: FROM,
    to: email,
    subject: 'Redefinir senha — VeganLand',
    html: htmlWrapper(`
      <p style="color:#333;font-size:15px;">Recebemos uma solicitação para redefinir a senha da sua conta.</p>
      <a href="${url}" style="display:inline-block;background:#7CB518;color:#fff;text-decoration:none;
         padding:14px 28px;border-radius:10px;font-weight:bold;margin:16px 0;font-size:15px;">
        Redefinir Senha
      </a>
      <p style="color:#999;font-size:12px;margin-top:8px;">Link: <a href="${url}" style="color:#7CB518;">${url}</a></p>
      <p style="color:#bbb;font-size:12px;">Este link expira em 1 hora.</p>
    `),
  });
}

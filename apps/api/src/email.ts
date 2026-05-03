import crypto from 'crypto';
import { config, mailConfigured } from './config.js';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function generateNumericCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
}

export async function hashCode(code: string) {
  return crypto.createHash('sha256').update(`${code}:${config.codePepper}`).digest('hex');
}

export async function sendMail(payload: MailPayload) {
  if (!mailConfigured()) {
    console.warn(`[MAIL NO CONFIGURADO] No se envió correo a ${payload.to}. Configura SMTP_HOST, SMTP_USER y SMTP_PASS en apps/api/.env. El código no se muestra por seguridad.`);
    return { sent: false };
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass }
  });

  await transporter.sendMail({
    from: config.mailFrom,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });
  return { sent: true };
}

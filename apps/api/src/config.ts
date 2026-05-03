import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Load the API-local env no matter whether the process starts from repo root,
// apps/api, dist, or a hosting platform root. Existing platform env vars win.
dotenv.config({ path: join(here, '..', '.env') });
dotenv.config();

const frontendUrls = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  frontendUrl: frontendUrls[0] || 'http://localhost:3000',
  frontendUrls,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  codePepper: process.env.CODE_PEPPER || 'dev-code-pepper-change-me',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'Magma Blaze <no-reply@magmablaze.com>',
  requireAdminEmail2FA: process.env.REQUIRE_ADMIN_EMAIL_2FA === 'true',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 900),
};

export function mailConfigured() {
  return Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
}

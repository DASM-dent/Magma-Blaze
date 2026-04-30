import { Router, type NextFunction, type Request, type Response } from 'express';
import { prisma } from '../prisma.js';

const ADMIN_TRAP_THRESHOLD = Number(process.env.ADMIN_TRAP_THRESHOLD || 2);
const ADMIN_TRAP_BAN_DAYS = Number(process.env.ADMIN_TRAP_BAN_DAYS || 7);
const ADMIN_TRAP_SECRET = process.env.ADMIN_TRAP_SECRET || '';

const router = Router();

function getClientIp(req: Request) {
  const cfIp = req.header('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const realIp = req.header('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function banUntilDate() {
  return new Date(Date.now() + ADMIN_TRAP_BAN_DAYS * 24 * 60 * 60 * 1000);
}

async function getActiveBan(ip: string) {
  const row = await prisma.securityIpBan.findUnique({ where: { ip } });
  if (!row?.banned) return null;

  if (row.bannedUntil && row.bannedUntil <= new Date()) {
    await prisma.securityIpBan.update({
      where: { ip },
      data: { banned: false, reason: null },
    });
    return null;
  }

  return row;
}

export async function blockBannedIp(req: Request, res: Response, next: NextFunction) {
  if (
    req.path === '/health' ||
    req.path.startsWith('/security') ||
    req.path.startsWith('/auth') ||
    req.path.startsWith('/admin/security-bans') ||
    req.path.startsWith('/admin/logs')
  ) return next();

  try {
    const activeBan = await getActiveBan(getClientIp(req));
    if (activeBan) {
      return res.status(403).json({
        message: 'Acceso no disponible.',
        banned: true,
      });
    }
  } catch (error) {
    console.error('[SECURITY_BAN_CHECK_ERROR]', error);
  }

  return next();
}

router.get('/status', async (req, res) => {
  try {
    const activeBan = await getActiveBan(getClientIp(req));
    res.json({
      banned: Boolean(activeBan),
      bannedUntil: activeBan?.bannedUntil || null,
    });
  } catch (error) {
    console.error('[SECURITY_STATUS_ERROR]', error);
    res.json({ banned: false });
  }
});

router.post('/admin-trap', async (req, res) => {
  if (ADMIN_TRAP_SECRET && req.header('x-admin-trap-secret') !== ADMIN_TRAP_SECRET) {
    return res.status(404).json({ ok: false });
  }

  const ip = getClientIp(req);
  const userAgent = req.header('user-agent') || null;
  const path = typeof req.body?.path === 'string' ? req.body.path.slice(0, 180) : '/admin';

  try {
    const current = await prisma.securityIpBan.findUnique({ where: { ip } });
    const hits = (current?.hits || 0) + 1;
    const shouldBan = hits >= ADMIN_TRAP_THRESHOLD;
    const bannedUntil = shouldBan ? banUntilDate() : null;

    const record = current
      ? await prisma.securityIpBan.update({
          where: { ip },
          data: {
            hits,
            userAgent,
            lastPath: path,
            banned: shouldBan || current.banned,
            reason: shouldBan ? 'ADMIN_TRAP' : current.reason,
            bannedAt: shouldBan && !current.bannedAt ? new Date() : current.bannedAt,
            bannedUntil: shouldBan ? bannedUntil : current.bannedUntil,
          },
        })
      : await prisma.securityIpBan.create({
          data: {
            ip,
            hits,
            userAgent,
            lastPath: path,
            banned: shouldBan,
            reason: shouldBan ? 'ADMIN_TRAP' : null,
            bannedAt: shouldBan ? new Date() : null,
            bannedUntil,
          },
        });

    await prisma.auditLog.create({
      data: {
        action: shouldBan ? 'ADMIN_TRAP_BANNED' : 'ADMIN_TRAP_HIT',
        ip,
      },
    });

    res.json({
      ok: true,
      banned: record.banned,
      hits: record.hits,
      threshold: ADMIN_TRAP_THRESHOLD,
    });
  } catch (error) {
    console.error('[ADMIN_TRAP_ERROR]', error);
    res.json({ ok: false });
  }
});

export default router;

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Has enviado varias reseñas recientemente. Inténtalo más tarde.' },
});

const submissionSchema = z.object({
  kind: z.enum(['SITE', 'PRODUCT']),
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
  productSlug: z.string().trim().max(160).optional().or(z.literal('')),
  website: z.string().max(200).optional(),
}).superRefine((data, ctx) => {
  if (data.kind === 'PRODUCT' && !data.productSlug) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productSlug'], message: 'Selecciona un producto.' });
  }
});

const statusSchema = z.object({ status: z.enum(['PENDING', 'PUBLISHED', 'REJECTED']) });

router.get('/', async (req, res) => {
  const productSlug = String(req.query.productSlug || '').trim();
  const requestedLimit = Number(req.query.limit || 6);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 20) : 6;
  const where: any = { status: 'PUBLISHED' };
  if (productSlug) where.product = { is: { slug: productSlug } };

  const [items, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where,
      take: limit,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, kind: true, name: true, rating: true, comment: true,
        productName: true, createdAt: true, publishedAt: true,
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  res.json({ items, total, average: Number((aggregate._avg.rating || 0).toFixed(1)) });
});

router.post('/', submissionLimiter, async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Revisa los datos de la reseña.', errors: parsed.error.flatten() });
  const input = parsed.data;
  if (input.website?.trim()) return res.status(201).json({ ok: true, message: 'Reseña recibida para revisión.' });

  let product: { id: string; name: string } | null = null;
  if (input.kind === 'PRODUCT') {
    product = await prisma.product.findUnique({
      where: { slug: input.productSlug! },
      select: { id: true, name: true },
    });
    if (!product) return res.status(400).json({ message: 'No encontramos ese producto.' });
  }

  const review = await prisma.review.create({
    data: {
      kind: input.kind,
      name: input.name,
      email: input.email || null,
      rating: input.rating,
      comment: input.comment,
      productId: product?.id || null,
      productName: product?.name || null,
    },
    select: { id: true, name: true, rating: true },
  });

  try {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', blocked: false }, select: { id: true } });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'SYSTEM',
          priority: 'NORMAL',
          title: 'Nueva reseña por revisar',
          body: review.name + ' dejó una reseña de ' + review.rating + ' estrellas.',
          actionUrl: '/dixnissowner?tab=reviews',
        })),
      });
    }
  } catch (error) {
    console.error('[REVIEW_NOTIFICATION_ERROR]', error);
  }

  res.status(201).json({ ok: true, message: '¡Gracias! Tu reseña quedó pendiente de aprobación.' });
});

router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  const requestedStatus = String(req.query.status || 'PENDING').toUpperCase();
  const validStatuses = ['PENDING', 'PUBLISHED', 'REJECTED', 'ALL'];
  const status = validStatuses.includes(requestedStatus) ? requestedStatus : 'PENDING';
  const where: any = status === 'ALL' ? {} : { status };
  const [items, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where,
      take: 150,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, kind: true, name: true, email: true, rating: true,
        comment: true, status: true, productName: true, createdAt: true,
        publishedAt: true, product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where: { status: 'PENDING' } }),
  ]);
  res.json({ items, pendingCount });
});

router.patch('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Estado de reseña inválido.' });
  const existing = await prisma.review.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) return res.status(404).json({ message: 'No encontramos esa reseña.' });
  const status = parsed.data.status;
  const updated = await prisma.review.update({
    where: { id: existing.id },
    data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : null },
    select: { id: true, status: true, publishedAt: true },
  });
  await prisma.auditLog.create({
    data: { userId: req.user!.id, action: 'REVIEW_' + status + ':' + updated.id, ip: req.ip },
  }).catch(() => null);
  res.json(updated);
});

export default router;
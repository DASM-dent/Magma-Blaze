import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();

const USD_EXCHANGE_RATE = 48;
const roundMoney = (v: number) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const rdToUsd = (priceRd: number) => roundMoney(priceRd / USD_EXCHANGE_RATE);

function productImages(p: any) {
  const images = Array.isArray(p.images) ? p.images : [];
  const normalized = images
    .filter((image: any) => image?.url)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image: any, index: number) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? p.name,
      sortOrder: image.sortOrder ?? index,
    }));
  if (!normalized.length && p.imageUrl) {
    normalized.push({ id: 'legacy', url: p.imageUrl, alt: p.name, sortOrder: 0 });
  }
  return normalized;
}

function normalizeProductImages(input: any, fallbackUrl?: string, alt?: string) {
  const source = Array.isArray(input) ? input : [];
  const unique = new Map<string, { url: string; alt?: string | null; sortOrder: number }>();
  source.forEach((image: any, index: number) => {
    const url = String(image?.url || '').trim();
    if (!url) return;
    unique.set(url, { url, alt: image?.alt || alt || null, sortOrder: index });
  });
  if (!unique.size && fallbackUrl) unique.set(fallbackUrl, { url: fallbackUrl, alt: alt || null, sortOrder: 0 });
  return [...unique.values()].map((image, index) => ({ ...image, sortOrder: index }));
}

function toUiProduct(p: any) {
  const images = productImages(p);
  const mainImage = images[0]?.url || p.imageUrl;
  return {
    ...p,
    price: p.price / 100,
    priceUsd: p.priceUsd ? roundMoney(p.priceUsd / 100) : rdToUsd(p.price / 100),
    comparePrice: p.status === 'BESTSELLER' ? Math.round((p.price / 100) * 1.18) : null,
    imageUrl: mainImage,
    mainImage,
    images,
    isNew: p.status === 'NEW',
    isBestSeller: p.status === 'BESTSELLER',
    isLimitedDrop: p.status === 'LIMITED_DROP',
    isOutOfStock: p.stock <= 0 || p.status === 'SOLD_OUT',
    status: p.status === 'UPCOMING' ? 'COMING_SOON' : p.status,
  };
}

router.get('/autocomplete', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const products = await prisma.product.findMany({
    where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json(products.map(toUiProduct));
});

router.get('/', async (req, res) => {
  const search = String(req.query.q || req.query.search || '').trim();
  const categorySlug = String(req.query.categoria || req.query.categorySlug || '').trim();
  const status = String(req.query.status || '').trim();
  const inStock = req.query.stock === '1' || req.query.inStock === 'true';
  const min = req.query.min ? Math.round(Number(req.query.min) * 100) : undefined;
  const max = req.query.max ? Math.round(Number(req.query.max) * 100) : undefined;
  const limit = Math.min(Number(req.query.limit || 12), 50);
  const page = Math.max(Number(req.query.pagina || req.query.page || 1), 1);
  const sortBy = String(req.query.orden || req.query.sortBy || 'newest');

  const where: any = { AND: [] };
  if (search) where.AND.push({ OR: [{ name: { contains: search } }, { description: { contains: search } }] });
  if (categorySlug) where.AND.push({ category: { slug: categorySlug } });
  if (status) where.AND.push({ status });
  if (inStock) where.AND.push({ stock: { gt: 0 } });
  if (min !== undefined || max !== undefined) where.AND.push({ price: { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) } });
  if (req.query.isFeatured === 'true') where.AND.push({ OR: [{ status: 'NEW' }, { status: 'BESTSELLER' }, { status: 'LIMITED_DROP' }] });
  if (where.AND.length === 0) delete where.AND;

  const orderBy: any = sortBy === 'price_asc' ? { price: 'asc' } : sortBy === 'price_desc' ? { price: 'desc' } : sortBy === 'popular' ? { views: 'desc' } : sortBy === 'best_selling' ? { status: 'asc' } : { createdAt: 'desc' };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: { category: true, images: { orderBy: { sortOrder: 'asc' } } }, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ items: products.map(toUiProduct), pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
});

router.get('/:slug', async (req, res) => {
  const product = await prisma.product.findFirst({ where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] }, include: { category: true, images: { orderBy: { sortOrder: 'asc' } } } }).catch(() => null);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  await prisma.product.update({ where: { id: product.id }, data: { views: { increment: 1 } } });
  res.json(toUiProduct(product));
});

const productSchema = z.object({
  name: z.string().min(2), slug: z.string().min(2), description: z.string().min(5), price: z.number().positive(), priceUsd: z.number().min(0).default(0), cost: z.number().min(0).default(0), imageUrl: z.string().min(5), images: z.array(z.object({ url: z.string().min(5), alt: z.string().optional().nullable(), sortOrder: z.number().int().min(0).optional() })).optional(), stock: z.number().int().min(0), status: z.enum(['ACTIVE','NEW','BESTSELLER','SOLD_OUT','UPCOMING','LIMITED_DROP']), categoryId: z.string()
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Producto inválido', errors: parsed.error.flatten() });
  const priceUsd = parsed.data.priceUsd > 0 ? parsed.data.priceUsd : rdToUsd(parsed.data.price);
  const images = normalizeProductImages(parsed.data.images, parsed.data.imageUrl, parsed.data.name);
  const { images: _images, ...payload } = parsed.data;
  const data = { ...payload, imageUrl: images[0]?.url || parsed.data.imageUrl, price: Math.round(parsed.data.price * 100), priceUsd: Math.round(priceUsd * 100), cost: Math.round(parsed.data.cost * 100), images: { create: images.map(image => ({ url: image.url, alt: image.alt, sortOrder: image.sortOrder })) } };
  const product = await prisma.product.create({ data, include: { category: true, images: { orderBy: { sortOrder: 'asc' } } } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: `PRODUCT_CREATED:${product.id}`, ip: req.ip }});
  res.status(201).json(toUiProduct(product));
});

export default router;

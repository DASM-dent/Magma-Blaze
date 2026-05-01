import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();

const USD_EXCHANGE_RATE = 48;
const roundMoney = (v: number) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const rdToUsd = (priceRd: number) => roundMoney(priceRd / USD_EXCHANGE_RATE);
const DISCOUNT_TYPES = ['NONE', 'PERCENT', 'FIXED_AMOUNT', 'FIXED_PRICE'] as const;

function activeDiscount(p: any, now = new Date()) {
  const type = DISCOUNT_TYPES.includes(p.discountType) ? p.discountType : 'NONE';
  const value = Number(p.discountValue || 0);
  const startsAt = p.discountStartsAt ? new Date(p.discountStartsAt) : null;
  const endsAt = p.discountEndsAt ? new Date(p.discountEndsAt) : null;
  const inWindow = (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
  if (!p.discountActive || type === 'NONE' || value <= 0 || !inWindow) return null;

  const baseCents = Number(p.price || 0);
  let finalCents = baseCents;
  if (type === 'PERCENT') finalCents = Math.round(baseCents * (1 - Math.min(value, 100) / 100));
  if (type === 'FIXED_AMOUNT') finalCents = baseCents - value;
  if (type === 'FIXED_PRICE') finalCents = value;
  finalCents = Math.max(0, Math.min(baseCents, finalCents));
  if (finalCents >= baseCents) return null;

  const savedCents = baseCents - finalCents;
  const percent = baseCents ? Math.round((savedCents / baseCents) * 100) : 0;
  return { type, value, finalCents, savedCents, percent };
}

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

function variantDisplayName(variant: any) {
  const explicit = String(variant?.name || '').trim();
  const parts = [variant?.color, variant?.size, variant?.model, variant?.lens].map(value => String(value || '').trim()).filter(Boolean);
  return explicit || parts.join(' / ') || 'Variante';
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

function toUiVariant(variant: any) {
  return {
    id: variant.id,
    name: variantDisplayName(variant),
    sku: variant.sku,
    color: variant.color || null,
    size: variant.size || null,
    model: variant.model || null,
    lens: variant.lens || null,
    price: variant.price ? variant.price / 100 : null,
    priceUsd: variant.priceUsd ? roundMoney(variant.priceUsd / 100) : null,
    stock: variant.stock,
    imageUrl: variant.imageUrl,
    active: variant.active,
    sortOrder: variant.sortOrder ?? 0,
  };
}

function toUiProduct(p: any) {
  const images = productImages(p);
  const mainImage = images[0]?.url || p.imageUrl;
  const basePrice = p.price / 100;
  const basePriceUsd = p.priceUsd ? roundMoney(p.priceUsd / 100) : rdToUsd(basePrice);
  const discount = activeDiscount(p);
  const finalPrice = discount ? discount.finalCents / 100 : basePrice;
  const finalPriceUsd = discount ? rdToUsd(finalPrice) : basePriceUsd;
  return {
    ...p,
    basePrice,
    basePriceUsd,
    price: finalPrice,
    priceUsd: finalPriceUsd,
    comparePrice: discount ? basePrice : null,
    comparePriceUsd: discount ? basePriceUsd : null,
    discount: discount ? {
      active: true,
      type: discount.type,
      label: p.discountLabel || 'Oferta',
      percent: discount.percent,
      amount: discount.savedCents / 100,
      startsAt: p.discountStartsAt,
      endsAt: p.discountEndsAt,
    } : null,
    imageUrl: mainImage,
    mainImage,
    images,
    variants: Array.isArray(p.variants) ? p.variants.filter((variant:any)=>variant.active).sort((a:any,b:any)=>(a.sortOrder??0)-(b.sortOrder??0)).map(toUiVariant) : [],
    totalVariantStock: Array.isArray(p.variants) ? p.variants.filter((variant:any)=>variant.active).reduce((sum:number,variant:any)=>sum+Number(variant.stock||0),0) : 0,
    availableStock: Array.isArray(p.variants)&&p.variants.some((variant:any)=>variant.active) ? p.variants.filter((variant:any)=>variant.active).reduce((sum:number,variant:any)=>sum+Number(variant.stock||0),0) : p.stock,
    variantCount: Array.isArray(p.variants) ? p.variants.filter((variant:any)=>variant.active).length : 0,
    isNew: p.status === 'NEW',
    isBestSeller: p.status === 'BESTSELLER',
    isLimitedDrop: p.status === 'LIMITED_DROP',
    isOutOfStock: (Array.isArray(p.variants)&&p.variants.some((variant:any)=>variant.active) ? p.variants.filter((variant:any)=>variant.active).reduce((sum:number,variant:any)=>sum+Number(variant.stock||0),0) : p.stock) <= 0 || p.status === 'SOLD_OUT',
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
    include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } } },
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
  if (inStock) where.AND.push({ OR: [{ stock: { gt: 0 } }, { variants: { some: { active: true, stock: { gt: 0 } } } }] });
  if (min !== undefined || max !== undefined) where.AND.push({ price: { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) } });
  if (req.query.isFeatured === 'true') where.AND.push({ OR: [{ status: 'NEW' }, { status: 'BESTSELLER' }, { status: 'LIMITED_DROP' }] });
  if (where.AND.length === 0) delete where.AND;

  const orderBy: any = sortBy === 'price_asc' ? { price: 'asc' } : sortBy === 'price_desc' ? { price: 'desc' } : sortBy === 'popular' ? { views: 'desc' } : sortBy === 'best_selling' ? { status: 'asc' } : { createdAt: 'desc' };
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } } }, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ items: products.map(toUiProduct), pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
});

function compactKeys(value: unknown, max = 12) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, max);
}

const productInclude = { category: true, images: { orderBy: { sortOrder: 'asc' as const } }, variants: { orderBy: { sortOrder: 'asc' as const } } };

router.get('/batch', async (req, res) => {
  const keys = compactKeys(req.query.slugs || req.query.ids, 12);
  if (!keys.length) return res.json([]);
  const products = await prisma.product.findMany({
    where: { OR: [{ slug: { in: keys } }, { id: { in: keys } }] },
    include: productInclude,
    take: 12,
  });
  const ordered = keys
    .map(key => products.find(product => product.slug === key || product.id === key))
    .filter(Boolean)
    .map(toUiProduct);
  res.json(ordered);
});

router.get('/:slug/related', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 8), 1), 12);
  const current = await prisma.product.findFirst({
    where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] },
    select: { id: true, categoryId: true },
  }).catch(() => null);
  if (!current) return res.json([]);

  const availableWhere = {
    id: { not: current.id },
    status: { notIn: ['SOLD_OUT', 'UPCOMING'] },
    OR: [{ stock: { gt: 0 } }, { variants: { some: { active: true, stock: { gt: 0 } } } }],
  } as any;

  const sameCategory = await prisma.product.findMany({
    where: { ...availableWhere, categoryId: current.categoryId },
    include: productInclude,
    orderBy: [{ status: 'asc' }, { views: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  const excluded = [current.id, ...sameCategory.map(product => product.id)];
  const fallback = sameCategory.length >= limit ? [] : await prisma.product.findMany({
    where: { ...availableWhere, id: { notIn: excluded } },
    include: productInclude,
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    take: limit - sameCategory.length,
  });

  res.json([...sameCategory, ...fallback].map(toUiProduct));
});
router.get('/:slug', async (req, res) => {
  const product = await prisma.product.findFirst({ where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] }, include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } } } }).catch(() => null);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  await prisma.product.update({ where: { id: product.id }, data: { views: { increment: 1 } } });
  res.json(toUiProduct(product));
});

const productSchema = z.object({
  name: z.string().min(2), slug: z.string().min(2), description: z.string().min(5), price: z.number().positive(), priceUsd: z.number().min(0).default(0), cost: z.number().min(0).default(0), discountActive: z.boolean().default(false), discountType: z.enum(DISCOUNT_TYPES).default('NONE'), discountValue: z.number().min(0).default(0), discountLabel: z.string().optional().nullable(), discountStartsAt: z.string().optional().nullable(), discountEndsAt: z.string().optional().nullable(), imageUrl: z.string().min(5), images: z.array(z.object({ url: z.string().min(5), alt: z.string().optional().nullable(), sortOrder: z.number().int().min(0).optional() })).optional(), variants: z.array(z.object({ name: z.string().optional().nullable(), sku: z.string().optional().nullable(), color: z.string().optional().nullable(), size: z.string().optional().nullable(), model: z.string().optional().nullable(), lens: z.string().optional().nullable(), price: z.number().min(0).optional().nullable(), priceUsd: z.number().min(0).optional().nullable(), stock: z.number().int().min(0).default(0), imageUrl: z.string().optional().nullable(), active: z.boolean().default(true), sortOrder: z.number().int().min(0).optional() })).optional(), stock: z.number().int().min(0), status: z.enum(['ACTIVE','NEW','BESTSELLER','SOLD_OUT','UPCOMING','LIMITED_DROP']), categoryId: z.string()
});

function discountInputToDb(data: any) {
  const type = DISCOUNT_TYPES.includes(data.discountType) ? data.discountType : 'NONE';
  const active = Boolean(data.discountActive) && type !== 'NONE';
  const rawValue = Number(data.discountValue || 0);
  return {
    discountActive: active,
    discountType: active ? type : 'NONE',
    discountValue: type === 'PERCENT' ? Math.round(Math.min(rawValue, 100)) : Math.round(rawValue * 100),
    discountLabel: data.discountLabel?.trim() || null,
    discountStartsAt: data.discountStartsAt ? new Date(data.discountStartsAt) : null,
    discountEndsAt: data.discountEndsAt ? new Date(data.discountEndsAt) : null,
  };
}

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Producto inválido', errors: parsed.error.flatten() });
  const priceUsd = parsed.data.priceUsd > 0 ? parsed.data.priceUsd : rdToUsd(parsed.data.price);
  const images = normalizeProductImages(parsed.data.images, parsed.data.imageUrl, parsed.data.name);
  const { images: _images, variants: _variants, discountActive: _discountActive, discountType: _discountType, discountValue: _discountValue, discountLabel: _discountLabel, discountStartsAt: _discountStartsAt, discountEndsAt: _discountEndsAt, ...payload } = parsed.data;
  const data = { ...payload, ...discountInputToDb(parsed.data), imageUrl: images[0]?.url || parsed.data.imageUrl, price: Math.round(parsed.data.price * 100), priceUsd: Math.round(priceUsd * 100), cost: Math.round(parsed.data.cost * 100), images: { create: images.map(image => ({ url: image.url, alt: image.alt, sortOrder: image.sortOrder })) } };
  const product = await prisma.product.create({ data, include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { orderBy: { sortOrder: 'asc' } } } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: `PRODUCT_CREATED:${product.id}`, ip: req.ip }});
  res.status(201).json(toUiProduct(product));
});

export default router;

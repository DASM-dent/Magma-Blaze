import type { CartItem, CartSnapshotItem } from '@/context/CartContext';

export type SharedCartItem = {
  productId: string;
  name: string;
  slug: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  variantName?: string;
};

export type SharedCartPayload = {
  v: 1;
  items: SharedCartItem[];
  subtotal: number;
  symbol: string;
  language: 'es' | 'en';
  createdAt: string;
};

const MAX_SHARED_ITEMS = 30;
const MAX_IMAGE_LENGTH = 500;

function sanitizeText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim().slice(0, 220);
}

function sanitizeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function sanitizeImage(value: unknown) {
  const image = sanitizeText(value);
  if (!image || image.startsWith('data:') || image.length > MAX_IMAGE_LENGTH) return undefined;
  return image;
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildSharedCartPayload(items: CartItem[], symbol: string, language: 'es' | 'en'): SharedCartPayload {
  const sharedItems = items.slice(0, MAX_SHARED_ITEMS).map((item) => {
    const unitPrice = sanitizeNumber(item.unitPrice || item.product.price);
    const quantity = Math.max(1, Math.min(99, Number(item.quantity || 1)));

    return {
      productId: sanitizeText(item.productId || item.product.id),
      name: sanitizeText(item.product.name, 'Producto Magma Blaze'),
      slug: sanitizeText(item.product.slug || item.productId),
      image: sanitizeImage(item.product.image),
      quantity,
      unitPrice,
      variantName: item.variant?.name ? sanitizeText(item.variant.name) : undefined,
    };
  }).filter((item) => item.productId && item.name);

  const subtotal = sharedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    v: 1,
    items: sharedItems,
    subtotal,
    symbol,
    language,
    createdAt: new Date().toISOString(),
  };
}

export function createSharedCartToken(payload: SharedCartPayload) {
  return toBase64Url(JSON.stringify(payload));
}

export function parseSharedCartToken(token?: string | null): SharedCartPayload | null {
  if (!token) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(token)) as Partial<SharedCartPayload>;
    if (parsed.v !== 1 || !Array.isArray(parsed.items)) return null;

    const items = parsed.items.slice(0, MAX_SHARED_ITEMS).map((item) => {
      const productId = sanitizeText((item as SharedCartItem).productId);
      const name = sanitizeText((item as SharedCartItem).name);
      if (!productId || !name) return null;

      const variantName = sanitizeText((item as SharedCartItem).variantName);
      const normalized: SharedCartItem = {
        productId,
        name,
        slug: sanitizeText((item as SharedCartItem).slug || productId),
        image: sanitizeImage((item as SharedCartItem).image),
        quantity: Math.max(1, Math.min(99, Number((item as SharedCartItem).quantity || 1))),
        unitPrice: sanitizeNumber((item as SharedCartItem).unitPrice),
      };
      if (variantName) normalized.variantName = variantName;
      return normalized;
    }).filter(Boolean) as SharedCartItem[];

    if (!items.length) return null;

    return {
      v: 1,
      items,
      subtotal: sanitizeNumber(parsed.subtotal, items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)),
      symbol: sanitizeText(parsed.symbol, 'RD$') || 'RD$',
      language: parsed.language === 'en' ? 'en' : 'es',
      createdAt: sanitizeText(parsed.createdAt, new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function createSharedCartUrl(items: CartItem[], origin: string, symbol: string, language: 'es' | 'en') {
  if (!items.length || !origin) return '';
  const payload = buildSharedCartPayload(items, symbol, language);
  const url = new URL('/carrito-compartido', origin);
  url.searchParams.set('cart', createSharedCartToken(payload));
  return url.toString();
}

export function sharedCartPayloadToItems(payload: SharedCartPayload): CartSnapshotItem[] {
  return payload.items.map((item) => ({
    productId: item.productId,
    product: {
      id: item.productId,
      name: item.name,
      slug: item.slug,
      price: item.unitPrice,
      image: item.image,
    },
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    variant: item.variantName ? { name: item.variantName } : undefined,
  }));
}

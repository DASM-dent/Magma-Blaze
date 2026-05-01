const STORAGE_KEY = 'mb_recently_viewed_products_v1';
const MAX_RECENT = 12;

type RecentProduct = {
  id?: string;
  slug: string;
  name?: string;
  imageUrl?: string | null;
  viewedAt: number;
};

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function safeImage(value?: string | null) {
  return value?.startsWith('data:') ? null : value || null;
}

function readRaw(): RecentProduct[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item?.slug)
      .map(item => ({ ...item, viewedAt: Number(item.viewedAt || Date.now()) }));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeRaw(items: RecentProduct[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function rememberRecentlyViewedProduct(product: { id?: string; slug?: string; name?: string; imageUrl?: string | null; mainImage?: string | null }) {
  const slug = String(product?.slug || '').trim();
  if (!slug) return;
  const next: RecentProduct = {
    id: product.id,
    slug,
    name: product.name,
    imageUrl: safeImage(product.imageUrl || product.mainImage),
    viewedAt: Date.now(),
  };
  const current = readRaw().filter(item => item.slug !== slug && item.id !== product.id);
  writeRaw([next, ...current]);
}

export function readRecentlyViewedSlugs(excludeSlug?: string, limit = 8) {
  const exclude = String(excludeSlug || '').trim();
  return readRaw()
    .filter(item => item.slug && item.slug !== exclude)
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .map(item => item.slug)
    .filter((slug, index, all) => all.indexOf(slug) === index)
    .slice(0, limit);
}

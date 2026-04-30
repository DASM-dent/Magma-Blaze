'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { productApi } from '@/services/api';
import { useStoreLocale } from '@/context/LocaleContext';
import AddToCartButton from './AddToCartButton';

type GalleryImage = { url: string; alt: string; sortOrder: number };
function variantLabel(variant: any) {
  const explicit = String(variant?.name || '').trim();
  const parts = [variant?.color, variant?.size, variant?.model, variant?.lens].map(value => String(value || '').trim()).filter(Boolean);
  return explicit || parts.join(' / ') || 'Variante';
}

export default function ProductoPageClient() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['product-detail', params.slug],
    queryFn: () => productApi.detail(params.slug).then(r => r.data),
    enabled: Boolean(params.slug),
  });
  const { currency, symbol, formatPrice, language, t } = useStoreLocale();
  const product: any = data;
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const galleryImages = useMemo<GalleryImage[]>(() => {
    if (!product) return [];
    const images = Array.isArray(product.images) ? product.images : [];
    const normalized = images
      .filter((image: any) => image?.url)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((image: any, index: number) => ({
        url: image.url,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder ?? index,
      }));
    if (!normalized.length && (product.mainImage || product.imageUrl)) {
      normalized.push({ url: product.mainImage || product.imageUrl, alt: product.name, sortOrder: 0 });
    }
    return normalized;
  }, [product]);
    const variants = useMemo(() => Array.isArray(product?.variants) ? product.variants.filter((variant: any) => variant.active) : [], [product]);
  const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId) || null;
  const selectedImage = selectedVariant?.imageUrl
    ? { url: selectedVariant.imageUrl, alt: `${product?.name || ''} ${variantLabel(selectedVariant)}`, sortOrder: -1 }
    : galleryImages[Math.min(activeImage, Math.max(galleryImages.length - 1, 0))];
  const displayProduct = selectedVariant
    ? { ...product, price: selectedVariant.price || product?.price, priceUsd: selectedVariant.priceUsd || product?.priceUsd }
    : product;
  const moveImage = (step: number) => {
    setActiveImage(current => galleryImages.length ? (current + step + galleryImages.length) % galleryImages.length : 0);
  };

    useEffect(() => {
    setActiveImage(0);
    const activeVariants = Array.isArray(product?.variants) ? product.variants.filter((variant: any) => variant.active) : [];
    setSelectedVariantId(activeVariants[0]?.id || '');
  }, [product?.id]);

  if (isLoading) return <div className="min-h-screen pt-32 px-6 text-white/50">{t('product.loading')}...</div>;
  if (error || !product) return <div className="min-h-screen pt-32 px-6 text-white"><p>{t('product.notFound')}</p><Link href="/catalogo" className="btn-ember mt-6 inline-flex">{t('product.backToCatalog')}</Link></div>;

  const compare = currency === 'USD' && displayProduct?.comparePriceUsd ? displayProduct.comparePriceUsd : displayProduct?.comparePrice;
  const variantUnavailable = variants.length > 0 && (!selectedVariant || Number(selectedVariant.stock || 0) <= 0);
  const unavailable = product.isOutOfStock || product.status === 'COMING_SOON' || variantUnavailable;

  return (
    <div className="min-h-screen pt-24 px-4 md:px-6 pb-20">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">
        <div className="grid gap-4 md:grid-cols-[82px_1fr]">
          {galleryImages.length > 1 ? (
            <div className="order-2 flex gap-3 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-visible md:pb-0">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden border bg-white/5 transition md:h-[82px] md:w-[82px] ${activeImage === index ? 'border-orange-400' : 'border-white/10 hover:border-white/40'}`}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">{index + 1}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="order-1 relative aspect-square overflow-hidden bg-white/5 border border-white/10 md:order-2">
            {selectedImage ? <img src={selectedImage.url} alt={selectedImage.alt} className="w-full h-full object-cover transition-opacity duration-300" /> : null}
            {galleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => moveImage(-1)}
                  className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-orange-500 hover:text-black"
                  aria-label="Imagen anterior"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(1)}
                  className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-orange-500 hover:text-black"
                  aria-label="Imagen siguiente"
                >
                  &gt;
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="space-y-6">
          <Link href="/catalogo" className="text-white/35 hover:text-ember-DEFAULT text-sm uppercase tracking-[0.2em]">← {t('product.backToCatalog')}</Link>
          <div>
            <h1 className="font-heading text-4xl md:text-6xl font-700 text-white leading-tight">{product.name}</h1>
          </div>
          <p className="max-w-xl whitespace-pre-line break-words text-white/50 leading-relaxed">{product.description}</p>
          {variants.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{language === 'en' ? 'Choose variant' : 'Elige la variante'}</p>
                {selectedVariant ? <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-100">{selectedVariant.stock} {language === 'en' ? 'available' : 'disponibles'}</span> : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {variants.map((variant: any) => {
                  const selected = selectedVariantId === variant.id;
                  const out = Number(variant.stock || 0) <= 0;
                  return <button key={variant.id} type="button" onClick={() => setSelectedVariantId(variant.id)} disabled={out} className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-orange-400 bg-orange-500/15 text-white' : 'border-white/10 bg-black/20 text-white/65 hover:border-white/30'} ${out ? 'cursor-not-allowed opacity-45' : ''}`}>
                    <b className="block text-sm">{variantLabel(variant)}</b>
                    <span className="mt-1 block text-xs text-white/45">{[variant.color, variant.size, variant.model, variant.lens].filter(Boolean).join(' · ') || (language === 'en' ? 'No attributes' : 'Sin atributos')}</span>
                  </button>;
                })}
              </div>
            </div>
          ) : null}
          <div className="flex items-end gap-3">
            <span className="text-4xl font-700 text-white">{formatPrice(displayProduct)}</span>
            {compare ? <span className="text-white/30 line-through pb-1">{symbol} {Number(compare).toLocaleString(currency === 'USD' ? 'en-US' : 'es-DO', { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: currency === 'USD' ? 2 : 0 })}</span> : null}
          </div>
          {product.discount?.active ? <p className="rounded-2xl border border-orange-400/25 bg-orange-500/10 p-3 text-sm text-orange-50">{product.discount.label || 'Oferta activa'} · {product.discount.percent}% menos</p> : null}
          {currency === 'USD' && !product.priceUsd ? <p className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">{t('product.noUsd')}</p> : null}
          <div className="flex flex-wrap gap-2">
            {product.isNew ? <span className="badge badge-new text-xs">{t('badge.new')}</span> : null}
            {product.isBestSeller ? <span className="badge badge-hot text-xs">{t('badge.bestSeller')}</span> : null}
            {product.isLimitedDrop ? <span className="badge badge-drop text-xs">{t('badge.limitedDrop')}</span> : null}
          </div>
          <AddToCartButton product={{ name: selectedVariant ? `${product.name} - ${variantLabel(selectedVariant)}` : product.name, slug: product.slug }} disabled={unavailable} />
          <div className="border-t border-white/10 pt-6 text-sm text-white/35 space-y-2">
            <p>✓ {t('product.shippingLine')}</p>
            <p>✓ {t('product.confirmLine')}</p>
            <p>✓ {t('product.inventoryLine')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

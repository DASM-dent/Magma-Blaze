'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useStoreLocale } from '@/context/LocaleContext';
import { productAvailabilityWhatsappUrl } from '@/lib/whatsapp';

export function ProductCard({ product }: { product:any }) {
  const { t, formatPrice, language } = useStoreLocale();
  const disabled = product.stock <= 0 || product.status === 'SOLD_OUT' || product.status === 'UPCOMING';
  return <article className="glass overflow-hidden rounded-3xl">
    <div className="relative h-64"><Image src={product.imageUrl} alt={product.name} fill className="object-cover"/><span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-bold">{product.status}</span></div>
    <div className="space-y-3 p-5">
      <Link href={`/product/${product.slug}`} className="text-xl font-black hover:text-blaze">{product.name}</Link>
      <p className="line-clamp-2 text-sm text-white/60">{product.description}</p>
      <div className="flex items-center justify-between"><strong>{formatPrice(product)}</strong><span className="text-xs text-white/50">Stock: {product.stock}</span></div>
      <a
        href={disabled ? undefined : productAvailabilityWhatsappUrl(product, language)}
        target="_blank"
        rel="noreferrer"
        aria-disabled={disabled}
        className={`btn-primary w-full ${disabled ? 'pointer-events-none cursor-not-allowed opacity-40' : ''}`}
      >
        {disabled ? t('product.unavailable') : t('product.verifyAvailability')}
      </a>
    </div>
  </article>
}

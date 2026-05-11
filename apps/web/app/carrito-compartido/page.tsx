'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useStoreLocale } from '@/context/LocaleContext';
import { parseSharedCartToken, sharedCartPayloadToItems, type SharedCartPayload } from '@/lib/cartShare';
import { cartOrderWhatsappUrl } from '@/lib/whatsapp';
import { productApi } from '@/services/api';

function productImage(product: any) {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
  const firstImageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
  return product?.mainImage || product?.imageUrl || product?.image || firstImageUrl || undefined;
}

export default function SharedCartPage() {
  const cart = useCart();
  const { t } = useStoreLocale();
  const [payload, setPayload] = useState<SharedCartPayload | null>(null);
  const [productLookup, setProductLookup] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('cart');
    setPayload(parseSharedCartToken(token));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!payload?.items.length) {
      setProductLookup({});
      return;
    }

    let cancelled = false;
    const slugs = Array.from(new Set(payload.items.map((item) => item.slug || item.productId).filter(Boolean)));
    if (!slugs.length) return;

    productApi.batch(slugs)
      .then(({ data }) => {
        if (cancelled) return;
        const products = Array.isArray(data) ? data : Array.isArray((data as any)?.products) ? (data as any).products : [];
        const nextLookup: Record<string, any> = {};
        products.forEach((product: any) => {
          if (product?.slug) nextLookup[product.slug] = product;
          if (product?.id) nextLookup[product.id] = product;
        });
        setProductLookup(nextLookup);
      })
      .catch(() => {
        if (!cancelled) setProductLookup({});
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  const displayItems = useMemo(() => {
    if (!payload) return [];
    return payload.items.map((item) => {
      const product = productLookup[item.slug] || productLookup[item.productId];
      const image = item.image || productImage(product);
      return image ? { ...item, image } : item;
    });
  }, [payload, productLookup]);

  const hydratedPayload = useMemo(
    () => payload ? { ...payload, items: displayItems } : null,
    [displayItems, payload],
  );
  const itemsForCart = useMemo(() => hydratedPayload ? sharedCartPayloadToItems(hydratedPayload) : [], [hydratedPayload]);
  const subtotal = useMemo(
    () => displayItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [displayItems],
  );
  const currentUrl = typeof window === 'undefined' ? '' : window.location.href;
  const orderUrl = payload
    ? cartOrderWhatsappUrl(itemsForCart, payload.symbol, subtotal, currentUrl)
    : '';

  const addSharedCart = () => {
    if (!itemsForCart.length) return;
    cart.addSnapshotItems(itemsForCart);
  };

  if (!loaded) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 pt-20 text-white/50">
        {t('common.loading')}...
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 pt-20 text-center">
        <ShoppingBag className="mb-5 h-14 w-14 text-white/15" />
        <h1 className="mb-2 text-3xl font-700 text-white">{t('cart.sharedInvalid')}</h1>
        <Link href="/catalogo" className="btn-ember mt-5">
          {t('cart.explore')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-24 md:px-6">
      <div className="mb-8 border-b border-white/10 pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-ember-DEFAULT">{t('cart.share')}</p>
        <h1 className="mb-3 text-4xl font-700 text-white md:text-5xl">{t('cart.sharedTitle')}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/50">{t('cart.sharedIntro')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-3">
          {displayItems.map((item) => (
            <article key={`${item.productId}-${item.variantName || 'base'}`} className="grid gap-4 border border-white/10 bg-white/[.03] p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
              <Link href={`/producto?slug=${encodeURIComponent(item.slug)}`} className="relative block aspect-square overflow-hidden bg-white/[.04]">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-white/15">
                    <ShoppingBag className="h-8 w-8" />
                  </span>
                )}
              </Link>

              <div className="min-w-0">
                <Link href={`/producto?slug=${encodeURIComponent(item.slug)}`} className="line-clamp-2 font-heading text-lg font-700 text-white transition hover:text-ember-DEFAULT">
                  {item.name}
                </Link>
                {item.variantName && <p className="mt-1 text-sm text-white/40">{item.variantName}</p>}
                <div className="mt-3 grid gap-2 text-sm text-white/55 sm:grid-cols-3">
                  <span>{t('cart.unitPrice')}: <strong className="text-white">{payload.symbol} {item.unitPrice.toLocaleString('es-DO')}</strong></span>
                  <span>{t('cart.quantity')}: <strong className="text-white">{item.quantity}</strong></span>
                  <span>{t('cart.lineTotal')}: <strong className="text-ember-DEFAULT">{payload.symbol} {(item.unitPrice * item.quantity).toLocaleString('es-DO')}</strong></span>
                </div>
              </div>

              <p className="self-center text-right font-700 text-white">
                {payload.symbol} {(item.unitPrice * item.quantity).toLocaleString('es-DO')}
              </p>
            </article>
          ))}
        </section>

        <aside className="h-fit border border-white/10 bg-white/[.035] p-5">
          <h2 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-white/55">{t('checkout.summary')}</h2>
          <div className="mb-5 space-y-3 border-b border-white/10 pb-5">
            <div className="flex items-center justify-between text-sm text-white/55">
              <span>{t('common.items')}</span>
              <span>{displayItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex items-center justify-between text-xl font-700 text-white">
              <span>{t('cart.total')}</span>
              <span>{payload.symbol} {subtotal.toLocaleString('es-DO')}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button type="button" onClick={addSharedCart} className="btn-ember w-full text-xs">
              <ShoppingBag className="h-4 w-4" />
              {t('cart.addShared')}
            </button>
            <button type="button" onClick={cart.openCart} className="btn-ghost min-h-11 w-full text-xs">
              {t('cart.openCart')}
            </button>
            <a href={orderUrl} target="_blank" rel="noreferrer" className="btn-whatsapp w-full text-sm">
              <MessageCircle className="h-5 w-5" />
              {t('cart.finishOrder')}
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

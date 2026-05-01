'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useStoreLocale } from '@/context/LocaleContext';
import { parseSharedCartToken, sharedCartPayloadToItems, type SharedCartPayload } from '@/lib/cartShare';
import { cartOrderWhatsappUrl } from '@/lib/whatsapp';

export default function SharedCartPage() {
  const cart = useCart();
  const { language, t } = useStoreLocale();
  const [payload, setPayload] = useState<SharedCartPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('cart');
    setPayload(parseSharedCartToken(token));
    setLoaded(true);
  }, []);

  const itemsForCart = useMemo(() => payload ? sharedCartPayloadToItems(payload) : [], [payload]);
  const subtotal = useMemo(
    () => payload?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) ?? 0,
    [payload],
  );
  const currentUrl = typeof window === 'undefined' ? '' : window.location.href;
  const orderUrl = payload
    ? cartOrderWhatsappUrl(itemsForCart, payload.symbol, subtotal, payload.language || language, currentUrl)
    : '';

  const addSharedCart = () => {
    if (!itemsForCart.length) return;
    cart.addSnapshotItems(itemsForCart);
    toast.success(t('cart.sharedAdded'));
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
          {payload.items.map((item) => (
            <article key={`${item.productId}-${item.variantName || 'base'}`} className="grid gap-4 border border-white/10 bg-white/[.03] p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
              <Link href={`/producto?slug=${encodeURIComponent(item.slug)}`} className="relative block aspect-square overflow-hidden bg-white/[.04]">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
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
                  <span>{t('cart.unitPrice')}: <strong className="text-white">{payload.symbol} {item.unitPrice.toLocaleString(payload.language === 'en' ? 'en-US' : 'es-DO')}</strong></span>
                  <span>{t('cart.quantity')}: <strong className="text-white">{item.quantity}</strong></span>
                  <span>{t('cart.lineTotal')}: <strong className="text-ember-DEFAULT">{payload.symbol} {(item.unitPrice * item.quantity).toLocaleString(payload.language === 'en' ? 'en-US' : 'es-DO')}</strong></span>
                </div>
              </div>

              <p className="self-center text-right font-700 text-white">
                {payload.symbol} {(item.unitPrice * item.quantity).toLocaleString(payload.language === 'en' ? 'en-US' : 'es-DO')}
              </p>
            </article>
          ))}
        </section>

        <aside className="h-fit border border-white/10 bg-white/[.035] p-5">
          <h2 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-white/55">{t('checkout.summary')}</h2>
          <div className="mb-5 space-y-3 border-b border-white/10 pb-5">
            <div className="flex items-center justify-between text-sm text-white/55">
              <span>{t('common.items')}</span>
              <span>{payload.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex items-center justify-between text-xl font-700 text-white">
              <span>{t('cart.total')}</span>
              <span>{payload.symbol} {subtotal.toLocaleString(payload.language === 'en' ? 'en-US' : 'es-DO')}</span>
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

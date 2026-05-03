'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, MessageCircle, Minus, Plus, Share2, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useStoreLocale } from '@/context/LocaleContext';
import { createSharedCartUrl } from '@/lib/cartShare';

export default function CartPage() {
  const cart = useCart();
  const { symbol, t } = useStoreLocale();
  const [copied, setCopied] = useState(false);

  const sharedCartUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return createSharedCartUrl(cart.items, window.location.origin, symbol);
  }, [cart.items, symbol]);


  const shareCart = async () => {
    if (!sharedCartUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: t('cart.sharedTitle'), url: sharedCartUrl });
      } else {
        await navigator.clipboard.writeText(sharedCartUrl);
      }
      setCopied(true);
      toast.success(t('cart.shareCopied'));
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(t('cart.shareError'));
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-24 md:px-6">
      <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-ember-DEFAULT">{t('nav.cart')}</p>
          <h1 className="text-4xl font-700 text-white md:text-5xl">{t('cart.title')}</h1>
        </div>
        {cart.items.length > 0 && (
          <p className="text-sm text-white/45">
            {cart.itemCount} {cart.itemCount === 1 ? t('common.item') : t('common.items')}
          </p>
        )}
      </div>

      {cart.items.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center border border-dashed border-white/10 bg-white/[.025] p-8 text-center">
          <ShoppingBag className="mb-5 h-14 w-14 text-white/15" />
          <h2 className="mb-2 text-xl font-700 text-white">{t('cart.empty')}</h2>
          <p className="mb-6 max-w-md text-sm text-white/45">{t('cart.availabilityNote')}</p>
          <Link href="/catalogo" className="btn-ember">
            {t('cart.explore')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-3">
            {cart.items.map((item) => (
              <article key={item.id} className="grid gap-4 border border-white/10 bg-white/[.03] p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
                <Link href={`/producto?slug=${encodeURIComponent(item.product.slug)}`} className="relative block aspect-square overflow-hidden bg-white/[.04]">
                  {item.product.image ? (
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-white/15">
                      <ShoppingBag className="h-8 w-8" />
                    </span>
                  )}
                </Link>

                <div className="min-w-0">
                  <Link href={`/producto?slug=${encodeURIComponent(item.product.slug)}`} className="line-clamp-2 font-heading text-lg font-700 text-white transition hover:text-ember-DEFAULT">
                    {item.product.name}
                  </Link>
                  {item.variant?.name && <p className="mt-1 text-sm text-white/40">{item.variant.name}</p>}
                  <div className="mt-3 grid gap-2 text-sm text-white/55 sm:grid-cols-3">
                    <span>{t('cart.unitPrice')}: <strong className="text-white">{symbol} {item.unitPrice.toLocaleString('es-DO')}</strong></span>
                    <span>{t('cart.quantity')}: <strong className="text-white">{item.quantity}</strong></span>
                    <span>{t('cart.lineTotal')}: <strong className="text-ember-DEFAULT">{symbol} {(item.unitPrice * item.quantity).toLocaleString('es-DO')}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.updateItem(item.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center border border-white/15 text-white/60 transition hover:border-ember-DEFAULT hover:text-ember-DEFAULT"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-700 text-white">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateItem(item.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center border border-white/15 text-white/60 transition hover:border-ember-DEFAULT hover:text-ember-DEFAULT"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => cart.removeItem(item.id)}
                    className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('common.delete')}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit border border-white/10 bg-white/[.035] p-5">
            <h2 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-white/55">{t('checkout.summary')}</h2>
            <div className="mb-5 space-y-3 border-b border-white/10 pb-5">
              <div className="flex items-center justify-between text-sm text-white/55">
                <span>{t('common.items')}</span>
                <span>{cart.itemCount}</span>
              </div>
              <div className="flex items-center justify-between text-xl font-700 text-white">
                <span>{t('cart.total')}</span>
                <span>{symbol} {cart.subtotal.toLocaleString('es-DO')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={shareCart} className="btn-ghost min-h-11 w-full text-xs">
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {t('cart.share')}
              </button>
              <Link href="/checkout" className="btn-whatsapp w-full text-sm">
                <MessageCircle className="h-5 w-5" />
                {t('cart.finishOrder')}
              </Link>
              <button
                type="button"
                onClick={cart.clearCart}
                className="btn-ghost min-h-11 w-full text-xs text-red-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-100"
              >
                <Trash2 className="h-4 w-4" />
                {t('cart.clear')}
              </button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/35">{t('cart.whatsappOrderNote')}</p>
          </aside>
        </div>
      )}
    </div>
  );
}

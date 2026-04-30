'use client';

import { useCart } from '@/context/CartContext';
import { useStoreLocale } from '@/context/LocaleContext';
import { cartAvailabilityWhatsappUrl } from '@/lib/whatsapp';

export default function CartPage() {
  const cart = useCart();
  const { language, symbol, t } = useStoreLocale();

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-20 pt-24 md:px-6">
      <h1 className="mb-8 text-5xl font-700 text-white">{t('cart.title')}</h1>
      {cart.items.length === 0 ? (
        <p className="text-white/40">{t('cart.empty')}.</p>
      ) : (
        <div className="space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border border-white/10 bg-white/[.035] p-4">
              <div>
                <p className="font-700 text-white">{item.product.name}</p>
                <p className="text-sm text-white/40">{t('cart.quantity')}: {item.quantity}</p>
              </div>
              <p className="font-700 text-ember-DEFAULT">{symbol} {(item.unitPrice * item.quantity).toLocaleString('es-DO')}</p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-6">
            <p className="text-2xl font-700">{t('cart.subtotal')}: {symbol} {cart.subtotal.toLocaleString('es-DO')}</p>
            <a
              href={cartAvailabilityWhatsappUrl(cart.items, symbol, cart.subtotal, language)}
              target="_blank"
              rel="noreferrer"
              className="btn-ember"
            >
              {t('cart.verifyAvailability')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

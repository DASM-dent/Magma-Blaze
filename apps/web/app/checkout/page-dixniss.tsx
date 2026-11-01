'use client';

import { useMemo, useState } from 'react';
import { CreditCard, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useStoreLocale } from '@/context/LocaleContext';
import { createSharedCartUrl } from '@/lib/cartShare';
import { cartOrderWhatsappUrl } from '@/lib/whatsapp';
import { DOMINICAN_PROVINCES, US_STATES, municipalitiesFor } from '@/lib/locations';

const usCities: Record<string,string[]> = { Florida:['Miami','Orlando','Tampa'], 'New York':['New York City','Buffalo','Albany'], Texas:['Houston','Dallas','Austin'], California:['Los Angeles','San Diego','San Francisco'], 'New Jersey':['Newark','Jersey City','Paterson'] };

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-white/60">{label}</span>{children}</label>;
}

export default function CheckoutPage() {
  const cart = useCart();
  const { country, symbol, t, setCountry } = useStoreLocale();
  const [form, setForm] = useState({ country, province: country === 'RD' ? 'La Vega' : 'Florida', city: country === 'RD' ? 'La Vega' : 'Miami', addressLine: '', promoCode: '', paymentMethodId: '' });
  const [submitting, setSubmitting] = useState(false);

  const provinceOptions = form.country === 'RD' ? DOMINICAN_PROVINCES : US_STATES;
  const cityOptions = form.country === 'RD'
    ? municipalitiesFor(form.province)
    : (usCities[form.province] || (form.province ? [form.province] : []));
  const subtotal = useMemo(() => cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart.items]);
  const sharedCartUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return createSharedCartUrl(cart.items, window.location.origin, symbol);
  }, [cart.items, symbol]);
  const checkoutLines = () => [
    `${t('checkout.country')}: ${form.country}`,
    `${form.country === 'RD' ? 'Provincia' : 'Estado'}: ${form.province}`,
    `${form.country === 'RD' ? 'Municipio' : 'Ciudad'}: ${form.city}`,
    form.addressLine.trim() ? `${t('checkout.address')}: ${form.addressLine.trim()}` : '',
    form.promoCode.trim() ? `${t('checkout.promo')}: ${form.promoCode.trim()}` : '',
    'Estado: pendiente de confirmacion de la tienda',
  ];
  const submitOrder = async () => {
    if (!cart.items.length || submitting) return;
    if (!form.province || !form.city) {
      toast.error(`Selecciona ${form.country === 'RD' ? 'la provincia y el municipio' : 'el estado y la ciudad'}.`);
      return;
    }
    if (form.addressLine.trim().length < 5) {
      toast.error('Agrega una direccion de entrega.');
      return;
    }
    setSubmitting(true);
    try {
      const orderUrl = cartOrderWhatsappUrl(cart.items, symbol, subtotal, sharedCartUrl, checkoutLines());
      toast.success('Abriendo WhatsApp...', { description: 'Tu carrito quedo incluido en el mensaje.' });
      cart.clearCart();
      window.open(orderUrl, '_blank', 'noopener,noreferrer');
    } catch (error:any) {
      toast.error(error.message || 'No se pudo abrir WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 md:px-6 pb-20">
      <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-6 md:p-8">
          <p className="text-ember-DEFAULT text-xs uppercase tracking-[0.25em] font-bold mb-2">{t('checkout.badge')}</p>
          <h1 className="text-3xl font-700 text-white mb-8 md:text-4xl">{t('checkout.availabilityTitle')}</h1>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('checkout.country')}>
              <select className="input-dark" value={form.country} onChange={(e) => { const next = e.target.value as 'RD'|'US'; setCountry(next); setForm({ ...form, country: next, province: next === 'RD' ? 'La Vega' : 'Florida', city: next === 'RD' ? 'La Vega' : 'Miami' }); }}>
                <option value="RD">{t('common.countryRD')}</option>
                <option value="US">{t('common.countryUS')}</option>
              </select>
            </Field>
            <Field label={form.country === 'RD' ? 'Provincia' : 'Estado'}>
              <select className="input-dark" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, city: '' })}>
                <option value="">Selecciona {form.country === 'RD' ? 'una provincia' : 'un estado'}</option>
                {provinceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label={form.country === 'RD' ? 'Municipio' : 'Ciudad'}>
              {form.country === 'RD' ? <select className="input-dark" value={form.city} disabled={!form.province} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                <option value="">{form.province ? 'Selecciona un municipio' : 'Primero selecciona una provincia'}</option>
                {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select> : <input className="input-dark" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ej. Miami" />}
            </Field>
            <Field label={t('checkout.promo')}>
              <input className="input-dark uppercase" value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value.toUpperCase() })} placeholder="MAGMA10" />
            </Field>
            <div className="md:col-span-2">
              <Field label={t('checkout.address')}>
                <textarea className="input-dark min-h-32" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
              </Field>
            </div>
            {form.country === 'US' && (
              <p className="md:col-span-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-100">{t('checkout.usNotice')}</p>
            )}
            <button
              type="button"
              className={`btn-whatsapp justify-center md:col-span-2 ${cart.items.length === 0 ? 'pointer-events-none opacity-40' : ''}`}
              onClick={submitOrder}
              disabled={cart.items.length === 0 || submitting}
            >
              <MessageCircle size={18} /> {submitting ? 'Abriendo WhatsApp...' : t('checkout.verifyAvailability')}
            </button>
            <p className="md:col-span-2 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/65">{t('checkout.whatsappNotice')}</p>
          </div>
        </section>
        <aside className="h-fit rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.2em] text-white/60"><CreditCard size={17} /> {t('checkout.summary')}</h2>
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-white/5 pb-3 text-sm">
                <span className="text-white/70">{item.product.name}{item.variant?.name ? ` · ${item.variant.name}` : ''} x {item.quantity}</span>
                <span className="text-white">{symbol} {(item.unitPrice * item.quantity).toLocaleString('es-DO')}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-lg font-700"><span>{t('checkout.subtotal')}</span><span>{symbol} {subtotal.toLocaleString('es-DO')}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

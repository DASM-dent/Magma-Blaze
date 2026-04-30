'use client';

import { useStoreLocale } from '@/context/LocaleContext';
import { productAvailabilityWhatsappUrl } from '@/lib/whatsapp';

export default function AddToCartButton({ product, disabled }: { product: { name: string; slug?: string | null }; disabled?: boolean }) {
  const { language, t } = useStoreLocale();

  if (disabled) {
    return (
      <button disabled className="btn-ember w-full px-10 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto">
        {t('product.unavailable')}
      </button>
    );
  }

  return (
    <a
      href={productAvailabilityWhatsappUrl(product, language)}
      target="_blank"
      rel="noreferrer"
      className="btn-ember w-full px-10 md:w-auto"
    >
      {t('product.verifyAvailability')}
    </a>
  );
}

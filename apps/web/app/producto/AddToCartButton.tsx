'use client';

import { useStoreLocale } from '@/context/LocaleContext';
import { useCart } from '@/context/CartContext';
import { productAvailabilityWhatsappUrl } from '@/lib/whatsapp';

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-4 w-4 fill-current">
      <path d="M16.03 3.2A12.73 12.73 0 0 0 5.06 22.39L3.2 28.8l6.58-1.73A12.72 12.72 0 1 0 16.03 3.2Zm0 2.42a10.31 10.31 0 0 1 8.73 15.8 10.31 10.31 0 0 1-13.92 3.13l-.46-.27-3.9 1.02 1.04-3.8-.3-.49A10.31 10.31 0 0 1 16.03 5.62Zm-4.4 4.78c-.24 0-.62.09-.95.45-.32.36-1.25 1.22-1.25 2.98s1.28 3.46 1.46 3.7c.18.24 2.48 3.96 6.11 5.39 3.02 1.19 3.64.95 4.3.89.65-.06 2.1-.86 2.4-1.69.3-.83.3-1.54.21-1.69-.09-.15-.33-.24-.69-.42-.36-.18-2.1-1.04-2.43-1.16-.33-.12-.57-.18-.81.18-.24.36-.93 1.16-1.14 1.4-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.78-1.07-.95-1.79-2.13-2-2.49-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61h-.65Z" />
    </svg>
  );
}

export default function AddToCartButton({ product, disabled }: { product: { name: string; slug?: string | null; variantId?: string | null }; disabled?: boolean }) {
  const { t } = useStoreLocale();
  const { addItem } = useCart();
  const productKey = product.slug || product.name;

  if (disabled) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button disabled className="btn-ember w-full px-10 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto">
          {t('product.unavailable')}
        </button>
        <a
          href={productAvailabilityWhatsappUrl(product)}
          target="_blank"
          rel="noreferrer"
          className="btn-whatsapp w-full justify-center px-10 md:w-auto"
        >
          <WhatsAppIcon />
          {t('product.verifyAvailability')}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => addItem(productKey, product.variantId || undefined)}
        className="btn-ember w-full justify-center px-10 md:w-auto"
      >
        {t('product.addToCart')}
      </button>
      <a
        href={productAvailabilityWhatsappUrl(product)}
        target="_blank"
        rel="noreferrer"
        className="btn-whatsapp w-full justify-center px-10 md:w-auto"
      >
        <WhatsAppIcon />
        {t('product.verifyAvailability')}
      </a>
    </div>
  );
}
